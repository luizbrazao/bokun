import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { rootLogger, createRequestLogger } from "./lib/logger.ts";
import { initSentry, captureError } from "./lib/sentry.ts";
import { inboundMessageLimiter } from "./middleware/rateLimiter.ts";
import { getConvexClient } from "./convex/client.ts";
import { handleWhatsAppWebhookMessage } from "./whatsapp/webhook.ts";
import { parseMetaWebhook, isStatusUpdate } from "./whatsapp/parseMetaWebhook.ts";
import { sendWhatsAppMessage } from "./whatsapp/metaClient.ts";
import { handleOAuthAuthorize, handleOAuthCallback } from "./oauth/handler.ts";
import {
  validateBokunWebhookHmac,
  extractBokunWebhookHeaders,
  handleBokunWebhookEvent,
} from "./bokun/webhookHandler.ts";
import { parseTelegramUpdate } from "./telegram/parseTelegramUpdate.ts";
import { sendTelegramMessage } from "./telegram/botClient.ts";
import { handleTelegramWebhookMessage } from "./telegram/webhook.ts";

// Initialize Sentry once at startup (no-op if SENTRY_DSN not set)
initSentry();

// Webhook timestamp replay protection — 5 minutes tolerance (industry standard)
// IMPORTANT: Always return HTTP 200 on stale timestamps — returning 4xx causes retry storms from Meta/Bokun
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;

function isReplayAttack(timestampSeconds: number | undefined): boolean {
  if (timestampSeconds === undefined || !Number.isFinite(timestampSeconds)) return false;
  const delta = Math.abs(Date.now() - timestampSeconds * 1000);
  return delta > REPLAY_TOLERANCE_MS;
}

type JsonRecord = Record<string, unknown>;
const WEBHOOK_DEBUG = process.env.WHATSAPP_WEBHOOK_DEBUG === "1";

function webhookDebug(message: string, details?: Record<string, unknown>): void {
  if (!WEBHOOK_DEBUG) {
    return;
  }
  rootLogger.debug({ channel: "wa", event: message, ...details }, message);
}

function tgDebug(message: string, details?: Record<string, unknown>): void {
  if (!WEBHOOK_DEBUG) {
    return;
  }
  rootLogger.debug({ channel: "tg", event: message, ...details }, message);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object";
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as JsonRecord).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function createFallbackDedupKey(body: unknown, tenantId: string, waUserId: string, prefix = "wa"): string {
  const hash = createHash("sha256");
  hash.update(tenantId);
  hash.update(":");
  hash.update(waUserId);
  hash.update(":");
  hash.update(stableStringify(body));
  return `${prefix}:hash:${hash.digest("hex")}`;
}

function extractMessageId(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const directId =
    asNonEmptyString(body.messageId) ??
    asNonEmptyString(body.message_id) ??
    asNonEmptyString((body.message as JsonRecord | undefined)?.id);

  if (directId) {
    return directId;
  }

  const messages = body.messages;
  if (Array.isArray(messages) && isRecord(messages[0])) {
    const messageId = asNonEmptyString(messages[0].id);
    if (messageId) {
      return messageId;
    }
  }

  const entry = body.entry;
  if (!Array.isArray(entry)) {
    return undefined;
  }

  for (const entryItem of entry) {
    if (!isRecord(entryItem) || !Array.isArray(entryItem.changes)) {
      continue;
    }

    for (const changeItem of entryItem.changes) {
      if (!isRecord(changeItem) || !isRecord(changeItem.value)) {
        continue;
      }

      const value = changeItem.value;
      if (Array.isArray(value.messages) && isRecord(value.messages[0])) {
        const messageId = asNonEmptyString(value.messages[0].id);
        if (messageId) {
          return messageId;
        }
      }

      if (Array.isArray(value.statuses) && isRecord(value.statuses[0])) {
        const statusId = asNonEmptyString(value.statuses[0].id);
        if (statusId) {
          return statusId;
        }
      }
    }
  }

  return undefined;
}

function getHeaderValue(req: IncomingMessage, headerName: string): string | undefined {
  const raw = req.headers[headerName.toLowerCase()];
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return raw[0];
  }
  return undefined;
}

function isValidHexSignature(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function isValidHmacSignature(rawBody: Buffer, signatureHeader: string, appSecret: string): boolean {
  const trimmed = signatureHeader.trim();
  const prefix = "sha256=";
  if (!trimmed.toLowerCase().startsWith(prefix)) {
    return false;
  }

  const providedHex = trimmed.slice(prefix.length).trim().toLowerCase();
  if (!isValidHexSignature(providedHex)) {
    return false;
  }

  const expectedHex = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const providedBuffer = Buffer.from(providedHex, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function parseJsonBody(rawBody: Buffer): unknown {
  const raw = rawBody.toString("utf8").trim();
  if (raw.length === 0) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", Buffer.byteLength(body, "utf8"));
  res.end(body);
}

type RunBookingFlowResult = {
  handled: boolean;
};

export type ProcessWebhookWithDedupArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  body: unknown;
  channelPrefix?: string;
};

export type ProcessWebhookWithDedupDeps = {
  claimDedup: (args: { tenantId: string; key: string }) => Promise<boolean>;
  runBookingFlow: (args: {
    tenantId: string;
    waUserId: string;
    text: string;
    sendReply: (text: string) => Promise<void>;
    continueWithLegacyFlow: () => Promise<void> | void;
  }) => Promise<RunBookingFlowResult>;
};

export type ProcessWebhookWithDedupResult = {
  duplicate: boolean;
  handled: boolean;
  legacyFlowExecuted: boolean;
  replyText: string;
};

export async function processWebhookWithDedup(
  args: ProcessWebhookWithDedupArgs,
  deps: ProcessWebhookWithDedupDeps
): Promise<ProcessWebhookWithDedupResult> {
  const prefix = args.channelPrefix ?? "wa";
  const messageId = extractMessageId(args.body);
  const key = messageId ? `${prefix}:${messageId}` : createFallbackDedupKey(args.body, args.tenantId, args.waUserId, prefix);
  const claim = await deps.claimDedup({
    tenantId: args.tenantId,
    key,
  });

  if (!claim) {
    return {
      duplicate: true,
      handled: false,
      legacyFlowExecuted: false,
      replyText: "",
    };
  }

  let replyText = "";
  let legacyFlowExecuted = false;

  const routed = await deps.runBookingFlow({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
    text: args.text,
    sendReply: async (reply) => {
      replyText = reply;
    },
    continueWithLegacyFlow: async () => {
      legacyFlowExecuted = true;
    },
  });

  return {
    duplicate: false,
    handled: routed.handled,
    legacyFlowExecuted,
    replyText,
  };
}

async function claimDedupPersisted(args: { tenantId: string; key: string }): Promise<boolean> {
  const convex = getConvexClient();
  const result = (await convex.mutation(
    "dedup:claim" as any,
    {
      tenantId: args.tenantId,
      key: args.key,
    } as any
  )) as { ok?: unknown } | boolean;

  if (typeof result === "boolean") {
    return result;
  }

  return result.ok === true;
}

type WhatsAppChannelRecord = {
  tenantId: string;
  phoneNumberId: string;
  accessToken: string;
  status: string;
} | null;

async function resolveChannelByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppChannelRecord> {
  const convex = getConvexClient();
  return (await convex.query(
    "whatsappChannels:getByPhoneNumberId" as any,
    { phoneNumberId } as any
  )) as WhatsAppChannelRecord;
}

type TelegramChannelRecord = {
  tenantId: string;
  botToken: string;
  botUsername: string;
  webhookSecret: string;
  operatorGroupChatId?: number;
  status: string;
} | null;

type OperatorGroupChannelRecord = {
  tenantId: string;
  botToken: string;
  operatorGroupChatId: number;
} | null;

async function resolveTelegramChannelByBotUsername(botUsername: string): Promise<TelegramChannelRecord> {
  const convex = getConvexClient();
  return (await convex.query(
    "telegramChannels:getByBotUsername" as any,
    { botUsername } as any
  )) as TelegramChannelRecord;
}

async function handleOperatorGroupMessage(
  channel: { tenantId: string; botToken: string; operatorGroupChatId?: number },
  parsed: { text: string; replyToMessageId?: number; chatId: number; messageId: number }
): Promise<void> {
  const convex = getConvexClient();

  // Only process replies to bot messages (operator replies to forwarded user messages)
  if (!parsed.replyToMessageId) {
    tgDebug("operator group message without reply_to, ignoring");
    return;
  }

  // Check for /resolver command
  const isResolve = parsed.text.trim().toLowerCase() === "/resolver";

  // Find conversation by handoffOperatorMessageId
  const conversation = (await convex.query(
    "conversations:getByHandoffOperatorMessageId" as any,
    {
      tenantId: channel.tenantId,
      handoffOperatorMessageId: parsed.replyToMessageId,
    } as any
  )) as { waUserId: string; handoffChannel?: string; handoffState?: string } | null;

  if (!conversation || conversation.handoffState !== "active") {
    tgDebug("no active handoff for reply_to_message_id", { replyToMessageId: parsed.replyToMessageId });
    return;
  }

  if (isResolve) {
    // End handoff
    await convex.mutation(
      "conversations:clearHandoff" as any,
      { tenantId: channel.tenantId, waUserId: conversation.waUserId } as any
    );

    const closeMessage = "Atendimento encerrado. Posso ajudar com mais alguma coisa?";

    if (conversation.handoffChannel === "tg") {
      // Reply to Telegram user
      const userChatId = Number(conversation.waUserId.replace("tg:", ""));
      if (!Number.isNaN(userChatId)) {
        await sendTelegramMessage({ botToken: channel.botToken, chatId: userChatId, text: closeMessage });
      }
    } else {
      // Reply to WhatsApp user
      const waChannel = (await convex.query(
        "whatsappChannels:getByTenantId" as any,
        { tenantId: channel.tenantId } as any
      )) as { phoneNumberId: string; accessToken: string } | null;

      if (waChannel) {
        await sendWhatsAppMessage({
          phoneNumberId: waChannel.phoneNumberId,
          recipientPhone: conversation.waUserId,
          text: closeMessage,
          accessToken: waChannel.accessToken,
        });
      }
    }

    // Notify operator group
    await sendTelegramMessage({
      botToken: channel.botToken,
      chatId: channel.operatorGroupChatId!,
      text: `Atendimento encerrado para ${conversation.waUserId}.`,
    });

    tgDebug("handoff resolved", { waUserId: conversation.waUserId });
    return;
  }

  // Relay operator's message to user
  if (conversation.handoffChannel === "tg") {
    const userChatId = Number(conversation.waUserId.replace("tg:", ""));
    if (!Number.isNaN(userChatId)) {
      await sendTelegramMessage({ botToken: channel.botToken, chatId: userChatId, text: parsed.text });
    }
  } else {
    const waChannel = (await convex.query(
      "whatsappChannels:getByTenantId" as any,
      { tenantId: channel.tenantId } as any
    )) as { phoneNumberId: string; accessToken: string } | null;

    if (waChannel) {
      await sendWhatsAppMessage({
        phoneNumberId: waChannel.phoneNumberId,
        recipientPhone: conversation.waUserId,
        text: parsed.text,
        accessToken: waChannel.accessToken,
      });
    }
  }

  tgDebug("operator reply relayed", { waUserId: conversation.waUserId, textPreview: parsed.text.slice(0, 80) });
}

async function handleTelegramWebhookPost(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  // Extract botUsername from path: /telegram/webhook/{botUsername}
  const botUsername = pathname.replace("/telegram/webhook/", "").replace(/\//g, "");
  if (!botUsername || botUsername.length === 0) {
    sendJson(res, 200, { ok: true });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch {
    sendJson(res, 200, { ok: true });
    return;
  }

  let body: unknown;
  try {
    body = parseJsonBody(rawBody);
  } catch {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Resolve tenant via botUsername
  const channel = await resolveTelegramChannelByBotUsername(botUsername);
  if (!channel || channel.status !== "active") {
    tgDebug("channel not found or inactive", { botUsername });
    sendJson(res, 200, { ok: true });
    return;
  }

  // Validate secret_token header
  const secretHeader = getHeaderValue(req, "x-telegram-bot-api-secret-token");
  if (secretHeader !== channel.webhookSecret) {
    tgDebug("invalid secret token", { botUsername });
    sendJson(res, 200, { ok: true });
    return;
  }

  // Parse the Telegram Update
  const parsed = parseTelegramUpdate(body);
  if (!parsed) {
    tgDebug("non-text update, ignoring", { botUsername });
    sendJson(res, 200, { ok: true });
    return;
  }

  // Check if this message is from an operator group (handoff reply)
  if (channel.operatorGroupChatId && parsed.chatId === channel.operatorGroupChatId) {
    await handleOperatorGroupMessage(channel, parsed);
    sendJson(res, 200, { ok: true });
    return;
  }

  const tgUserId = `tg:${parsed.chatId}`;
  tgDebug("incoming message", {
    updateId: parsed.updateId,
    chatId: parsed.chatId,
    textPreview: parsed.text.slice(0, 120),
  });

  // Rate limit check (per end-user, inbound Telegram — UX backpressure, not security)
  const tgRateKey = tgUserId; // already "tg:chatId" — no additional prefix needed
  const tgRateCheck = await inboundMessageLimiter.check(tgRateKey);
  if (!tgRateCheck.allowed) {
    rootLogger.warn({ tenantId: channel.tenantId, waUserId: tgUserId, handler: "telegram_webhook" }, "rate_limit_exceeded");
    await sendTelegramMessage({ botToken: channel.botToken, chatId: parsed.chatId, text: "Por favor, aguarde um momento antes de enviar mais mensagens." });
    sendJson(res, 200, { ok: true });
    return;
  }

  // Process with dedup (reuse same flow as WhatsApp)
  const processed = await processWebhookWithDedup(
    {
      tenantId: channel.tenantId,
      waUserId: tgUserId,
      text: parsed.text,
      body: { messageId: String(parsed.updateId) },
      channelPrefix: "tg",
    },
    {
      claimDedup: claimDedupPersisted,
      runBookingFlow: async (args) => handleTelegramWebhookMessage(args),
    }
  );

  // Send reply via Telegram Bot API
  if (processed.replyText.trim().length > 0) {
    const sendResult = await sendTelegramMessage({
      botToken: channel.botToken,
      chatId: parsed.chatId,
      text: processed.replyText,
    });
    tgDebug("send reply result", {
      ok: sendResult.ok,
      messageId: sendResult.messageId,
      error: sendResult.error,
      replyPreview: processed.replyText.slice(0, 120),
    });
  }

  tgDebug("message processed", {
    updateId: parsed.updateId,
    handled: processed.handled,
    duplicate: processed.duplicate,
  });

  sendJson(res, 200, { ok: true });
}

async function handleWebhookPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
  if (!appSecret || appSecret.trim().length === 0) {
    sendJson(res, 500, {
      ok: false,
      error: "Missing WHATSAPP_APP_SECRET (or META_APP_SECRET).",
    });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to read request body.",
    });
    return;
  }

  const signatureHeader = getHeaderValue(req, "x-hub-signature-256");
  if (!signatureHeader || !isValidHmacSignature(rawBody, signatureHeader, appSecret)) {
    sendJson(res, 403, {
      ok: false,
      error: "Invalid webhook signature.",
    });
    return;
  }

  let body: unknown;
  try {
    body = parseJsonBody(rawBody);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid request body.",
    });
    return;
  }

  // Meta requires 200 response quickly, even for status updates
  if (isStatusUpdate(body)) {
    webhookDebug("status update only", {
      extractedId: extractMessageId(body),
    });
    sendJson(res, 200, { ok: true, handled: false, statusUpdate: true });
    return;
  }

  // Try to parse as Meta Cloud API webhook payload
  const metaParsed = parseMetaWebhook(body);
  webhookDebug("parsed webhook payload", {
    messages: metaParsed.messages.length,
  });

  if (metaParsed.messages.length > 0) {
    // Meta Cloud API format: resolve tenant from phoneNumberId
    const results: Array<{ messageId: string; handled: boolean; duplicate: boolean }> = [];

    for (const msg of metaParsed.messages) {
      webhookDebug("incoming message", {
        messageId: msg.messageId,
        phoneNumberId: msg.phoneNumberId,
        waUserId: msg.from,
        textPreview: msg.text.slice(0, 120),
      });
      const channel = await resolveChannelByPhoneNumberId(msg.phoneNumberId);
      if (!channel || channel.status !== "active") {
        webhookDebug("channel not found or inactive", {
          phoneNumberId: msg.phoneNumberId,
          hasChannel: Boolean(channel),
          channelStatus: channel?.status,
        });
        results.push({ messageId: msg.messageId, handled: false, duplicate: false });
        continue;
      }

      const reqLog = createRequestLogger({
        tenantId: channel.tenantId,
        channel: "wa",
        requestId: randomUUID(),
        messageId: msg.messageId,
        providerMessageId: msg.messageId,
        event: "message_received",
      });
      reqLog.info({ waUserId: msg.from }, "message_received");

      // Rate limit check (per end-user, inbound WhatsApp only — UX backpressure, not security)
      const rateLimitKey = `wa:${msg.from}`;
      const rateCheck = await inboundMessageLimiter.check(rateLimitKey);
      if (!rateCheck.allowed) {
        rootLogger.warn({ tenantId: channel.tenantId, waUserId: msg.from, handler: "whatsapp_webhook" }, "rate_limit_exceeded");
        // Send polite reply to the user and return 200 to Meta (so Meta doesn't retry)
        await sendWhatsAppMessage({
          phoneNumberId: msg.phoneNumberId,
          recipientPhone: msg.from,
          text: "Por favor, aguarde um momento antes de enviar mais mensagens.",
          accessToken: channel.accessToken,
        });
        results.push({ messageId: msg.messageId, handled: false, duplicate: false });
        continue;
      }

      // Webhook replay protection — silently skip messages older than 5 minutes
      // Return 200 (not 403) so Meta does not retry the stale message
      const msgTimestamp = parseInt(msg.timestamp, 10);
      if (isReplayAttack(msgTimestamp)) {
        const delta = Math.abs(Date.now() - msgTimestamp * 1000);
        rootLogger.warn({ tenantId: channel.tenantId, waUserId: msg.from, messageId: msg.messageId, deltaMs: delta }, "webhook_replay_skipped");
        results.push({ messageId: msg.messageId, handled: false, duplicate: false });
        continue; // skip processing, continue to next message in loop
      }

      const processed = await processWebhookWithDedup(
        {
          tenantId: channel.tenantId,
          waUserId: msg.from,
          text: msg.text,
          body,
        },
        {
          claimDedup: claimDedupPersisted,
          runBookingFlow: async (args) => handleWhatsAppWebhookMessage(args),
        }
      );

      // Send reply back via Meta Cloud API
      if (processed.replyText.trim().length > 0) {
        const sendResult = await sendWhatsAppMessage({
          phoneNumberId: msg.phoneNumberId,
          recipientPhone: msg.from,
          text: processed.replyText,
          accessToken: channel.accessToken,
        });
        reqLog.debug({
          event: "send_reply",
          ok: sendResult.ok,
          providerMessageId: sendResult.messageId,
          error: sendResult.error,
          replyPreview: processed.replyText.slice(0, 120),
        }, "send reply result");
      }

      reqLog.debug({
        event: "message_processed",
        handled: processed.handled,
        duplicate: processed.duplicate,
      }, "message processed");
      results.push({
        messageId: msg.messageId,
        handled: processed.handled,
        duplicate: processed.duplicate,
      });
    }

    sendJson(res, 200, { ok: true, messages: results });
    return;
  }

  // Fallback: legacy format with explicit tenantId/waUserId/text fields
  if (isRecord(body)) {
    const tenantId = asNonEmptyString((body as JsonRecord).tenantId);
    const waUserId = asNonEmptyString((body as JsonRecord).waUserId);
    const text = asNonEmptyString((body as JsonRecord).text);

    if (tenantId && waUserId && text) {
      const processed = await processWebhookWithDedup(
        { tenantId, waUserId, text, body },
        {
          claimDedup: claimDedupPersisted,
          runBookingFlow: async (args) => handleWhatsAppWebhookMessage(args),
        }
      );

      if (processed.duplicate) {
        sendJson(res, 200, { ok: true, handled: false, duplicate: true });
        return;
      }

      if (processed.legacyFlowExecuted) {
        sendJson(res, 202, {
          ok: true,
          handled: false,
          message: "No booking draft route handled. Continue with legacy flow.",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        handled: processed.handled,
        text: processed.replyText,
      });
      return;
    }
  }

  webhookDebug("payload not recognized as message", {
    extractedId: extractMessageId(body),
  });
  sendJson(res, 400, {
    ok: false,
    error: "Could not extract messages from webhook payload.",
  });
}

async function handleWebhookVerify(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/whatsapp/webhook", "http://localhost");
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    typeof challenge === "string" &&
    challenge.length > 0 &&
    expectedVerifyToken &&
    verifyToken === expectedVerifyToken
  ) {
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(challenge);
    return;
  }

  res.statusCode = 403;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("Forbidden");
}

async function handleBokunWebhookPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const appSecret = process.env.BOKUN_APP_CLIENT_SECRET;
  if (!appSecret || appSecret.trim().length === 0) {
    sendJson(res, 500, { ok: false, error: "Missing BOKUN_APP_CLIENT_SECRET for webhook verification." });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Failed to read request body." });
    return;
  }

  const webhookHeaders = extractBokunWebhookHeaders(req.headers as Record<string, string | string[] | undefined>);

  if (!webhookHeaders.hmac || !validateBokunWebhookHmac(rawBody, webhookHeaders.hmac, appSecret)) {
    sendJson(res, 403, { ok: false, error: "Invalid Bokun webhook signature." });
    return;
  }

  let body: unknown;
  try {
    body = parseJsonBody(rawBody);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  // INFRA-06: Bokun webhook timestamp replay protection
  // Bokun does not guarantee a timestamp header. Check common header names; if absent, skip the check.
  // Known gap: if Bokun sends no timestamp header, replay protection relies solely on HMAC verification.
  const bokunTimestampHeader =
    req.headers["x-bokun-timestamp"] ??
    req.headers["x-timestamp"] ??
    undefined;

  if (bokunTimestampHeader) {
    const bokunTs = parseInt(String(bokunTimestampHeader), 10);
    if (isReplayAttack(bokunTs)) {
      const delta = Math.abs(Date.now() - bokunTs * 1000);
      rootLogger.warn({ handler: "bokun_webhook", deltaMs: delta }, "bokun_webhook_replay_skipped");
      sendJson(res, 200, { ok: true }); // return 200 so Bokun does not retry
      return;
    }
  } else {
    rootLogger.debug({ handler: "bokun_webhook" }, "bokun_no_timestamp_header_skip_check");
  }

  // Bokun has 5-second timeout - respond quickly
  const result = await handleBokunWebhookEvent(webhookHeaders, body);
  sendJson(res, 200, { ok: result.ok, topic: result.topic });
}

async function handleHealthRoute(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const baseUrl = process.env.BOKUN_BASE_URL ?? "";
  const environment = baseUrl.includes("bokuntest") ? "test" : "production";
  sendJson(res, 200, { ok: true, environment });
}

async function handleOAuthAuthorizeRoute(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(_req.url ?? "/", "http://localhost");
  const bokunDomain = url.searchParams.get("domain");
  const env = url.searchParams.get("env") as "test" | "production" | null;

  if (!bokunDomain) {
    sendJson(res, 400, { ok: false, error: "Missing 'domain' query parameter (e.g., ?domain=yourcompany)." });
    return;
  }

  try {
    const result = await handleOAuthAuthorize({
      bokunDomain,
      env: env === "test" || env === "production" ? env : undefined,
    });
    res.statusCode = 302;
    res.setHeader("location", result.redirectUrl);
    res.end();
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "OAuth authorize failed.",
    });
  }
}

async function handleOAuthCallbackRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const accessCode = url.searchParams.get("access_code") ?? url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const bokunDomain = url.searchParams.get("domain") ?? process.env.BOKUN_DEFAULT_DOMAIN ?? "";

  if (!accessCode || !state) {
    sendJson(res, 400, { ok: false, error: "Missing access_code or state parameter." });
    return;
  }

  try {
    const result = await handleOAuthCallback({ accessCode, state, bokunDomain });
    sendJson(res, 200, {
      ok: true,
      tenantId: result.tenantId,
      vendorId: result.vendorId,
      message: "Instalação concluída com sucesso! Configure o WhatsApp channel em seguida.",
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "OAuth callback failed.",
    });
  }
}

export function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = url.pathname;

      if (pathname === "/whatsapp/webhook" && method === "POST") {
        await handleWebhookPost(req, res);
        return;
      }

      if (pathname === "/whatsapp/webhook" && method === "GET") {
        await handleWebhookVerify(req, res);
        return;
      }

      // Telegram webhook: /telegram/webhook/{botUsername}
      if (pathname.startsWith("/telegram/webhook/") && method === "POST") {
        await handleTelegramWebhookPost(req, res, pathname);
        return;
      }

      // Bokun webhook
      if (pathname === "/bokun/webhook" && method === "POST") {
        await handleBokunWebhookPost(req, res);
        return;
      }

      // Health check
      if (pathname === "/health" && method === "GET") {
        await handleHealthRoute(req, res);
        return;
      }

      // OAuth routes
      if (pathname === "/oauth/authorize" && method === "GET") {
        await handleOAuthAuthorizeRoute(req, res);
        return;
      }

      if (pathname === "/oauth/callback" && method === "GET") {
        await handleOAuthCallbackRoute(req, res);
        return;
      }

      sendJson(res, 404, {
        ok: false,
        error: "Not found.",
      });
    } catch (error) {
      rootLogger.error({ error }, "unhandled_request_error");
      captureError(error, { tenantId: "unknown", handler: "http_server" });
      sendJson(res, 500, { ok: false, error: "Internal server error." });
    }
  });
}

export async function startServer(port: number): Promise<void> {
  const server = createAppServer();
  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  startServer(Number.isFinite(port) ? port : 3000).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
