import { getConvexClient } from "../../convex/client.ts";
import { sendTelegramMessage } from "../../telegram/botClient.ts";
import { rootLogger } from "../../lib/logger.ts";

export type HandleHandoffArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  channel: "wa" | "tg";
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

  // Get telegram channel config for this tenant
  const tgChannel = (await convex.query(
    "telegramChannels:getByTenantId" as any,
    { tenantId: args.tenantId } as any
  )) as TelegramChannelRecord;

  if (!tgChannel?.operatorGroupChatId || !tgChannel.botToken) {
    return {
      text: "Desculpe, o atendimento humano não está disponível no momento. Posso tentar ajudar de outra forma?",
      handled: true,
    };
  }

  // Get conversation context
  const conversation = (await convex.query(
    "conversations:getConversationByWaUserId" as any,
    { tenantId: args.tenantId, waUserId: args.waUserId } as any
  )) as ConversationRecord;

  // Build context message for operator group
  const channelLabel = args.channel === "wa" ? "WhatsApp" : "Telegram";
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
      text: "Desculpe, houve um erro ao transferir para o atendente. Tente novamente.",
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
      handoffChannel: args.channel,
    } as any
  );

  return {
    text: "Transferindo para um atendente. Aguarde, em breve alguém vai responder.",
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

  const tgChannel = (await convex.query(
    "telegramChannels:getByTenantId" as any,
    { tenantId: args.tenantId } as any
  )) as TelegramChannelRecord;

  if (!tgChannel?.operatorGroupChatId || !tgChannel.botToken) {
    return { text: "", handled: true };
  }

  const channelLabel = args.channel === "wa" ? "WhatsApp" : "Telegram";
  const forwardText = `[${channelLabel} | ${args.waUserId}]\n${args.text}`;

  await sendTelegramMessage({
    botToken: tgChannel.botToken,
    chatId: tgChannel.operatorGroupChatId,
    text: forwardText,
  });

  // No auto-reply to user — operator will respond
  return { text: "", handled: true };
}
