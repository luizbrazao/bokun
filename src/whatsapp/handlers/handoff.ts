import { getConvexClient } from "../../convex/client.ts";
import { getConvexServiceToken } from "../../convex/client.ts";
import { sendTelegramMessage } from "../../telegram/botClient.ts";
import { rootLogger } from "../../lib/logger.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleHandoffArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  channel: "wa" | "tg";
  language?: SupportedLanguage;
};

export type HandleHandoffResult = {
  text: string;
  handled: boolean;
};

const HANDOFF_KEYWORDS = [
  "falar com humano",
  "falar com atendente",
  "falar com operador",
  "operador",
  "atendente",
  "humano",
  "talk to agent",
  "talk to human",
  "human",
  "support",
  "agent",
];

export function isHandoffIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return HANDOFF_KEYWORDS.some(
    (kw) => normalized === kw || normalized.startsWith(`${kw} `)
  );
}

type TelegramChannelRecord = {
  botToken: string;
  botUsername: string;
  operatorGroupChatId?: number;
  tenantId: string;
} | null;

type ConversationRecord = {
  handoffState?: string;
  lastActivityId?: string;
} | null;

/**
 * Start a handoff: forward the user's message to the operator Telegram group.
 */
export async function handleStartHandoff(
  args: HandleHandoffArgs
): Promise<HandleHandoffResult> {
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  // Get telegram channel config for this tenant
  const tgChannel = (await convex.query(
    "telegramChannels:getByTenantIdForService" as any,
    { tenantId: args.tenantId, serviceToken } as any
  )) as TelegramChannelRecord;

  if (!tgChannel?.operatorGroupChatId || !tgChannel.botToken) {
    return {
      text: byLanguage(args.language, {
        pt: "Desculpe, o atendimento humano não está disponível no momento. Posso tentar ajudar de outra forma?",
        en: "Sorry, human support is not available right now. I can try to help in another way.",
        es: "Lo siento, la atención humana no está disponible en este momento. Puedo intentar ayudarte de otra forma.",
      }),
      handled: true,
    };
  }

  // Get conversation context
  const conversation = (await convex.query(
    "conversations:getConversationByWaUserId" as any,
    { tenantId: args.tenantId, waUserId: args.waUserId } as any
  )) as ConversationRecord;

  // Guard against channel drift from upstream callers.
  const effectiveChannel: "wa" | "tg" = args.waUserId.startsWith("tg:") ? "tg" : args.channel;

  // Build context message for operator group
  const channelLabel = effectiveChannel === "wa" ? "WhatsApp" : "Telegram";
  const contextParts = [
    `📩 *Novo atendimento*`,
    `Canal: ${channelLabel}`,
    `Usuário: ${args.waUserId}`,
  ];
  if (conversation?.lastActivityId) {
    contextParts.push(`Última atividade: ${conversation.lastActivityId}`);
  }
  contextParts.push("", `Mensagem: ${args.text}`);

  const operatorMessage = contextParts.join("\n");

  // Send to operator group
  const sendResult = await sendTelegramMessage({
    botToken: tgChannel.botToken,
    chatId: tgChannel.operatorGroupChatId,
    text: operatorMessage,
  });

  if (!sendResult.ok) {
    rootLogger.error({ handler: "handoff", tenantId: args.tenantId, waUserId: args.waUserId, err: sendResult.error }, "Failed to send to operator group");
    return {
      text: byLanguage(args.language, {
        pt: "Desculpe, houve um erro ao transferir para o atendente. Tente novamente.",
        en: "Sorry, there was an error transferring you to an agent. Please try again.",
        es: "Lo siento, hubo un error al transferirte a un agente. Inténtalo de nuevo.",
      }),
      handled: true,
    };
  }

  // Set handoff state
  await convex.mutation(
    "conversations:setHandoffState" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      handoffState: "active",
      handoffOperatorMessageId: sendResult.messageId,
      handoffChannel: effectiveChannel,
    } as any
  );

  // Persist user message in chat history so the operator inbox stays complete.
  await convex.mutation(
    "chatMessages:addMessage" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      role: "user",
      content: args.text,
    } as any
  );

  return {
    text: byLanguage(args.language, {
      pt: "Transferindo para um atendente. Aguarde, em breve alguém vai responder.",
      en: "Transferring you to an agent. Please wait, someone will reply shortly.",
      es: "Te estoy transfiriendo a un agente. Espera, alguien responderá en breve.",
    }),
    handled: true,
  };
}

/**
 * Forward a user's message to the operator group while handoff is active.
 */
export async function handleHandoffUserMessage(
  args: HandleHandoffArgs
): Promise<HandleHandoffResult> {
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  const tgChannel = (await convex.query(
    "telegramChannels:getByTenantIdForService" as any,
    { tenantId: args.tenantId, serviceToken } as any
  )) as TelegramChannelRecord;

  // Persist every inbound message during handoff so operators can see the full thread.
  await convex.mutation(
    "chatMessages:addMessage" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      role: "user",
      content: args.text,
    } as any
  );

  if (!tgChannel?.operatorGroupChatId || !tgChannel.botToken) {
    return { text: "", handled: true };
  }

  const effectiveChannel: "wa" | "tg" = args.waUserId.startsWith("tg:") ? "tg" : args.channel;
  const channelLabel = effectiveChannel === "wa" ? "WhatsApp" : "Telegram";
  const forwardText = `[${channelLabel} | ${args.waUserId}]\n${args.text}`;

  await sendTelegramMessage({
    botToken: tgChannel.botToken,
    chatId: tgChannel.operatorGroupChatId,
    text: forwardText,
  });

  // No auto-reply to user — operator will respond
  return { text: "", handled: true };
}
