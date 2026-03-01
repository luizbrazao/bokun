export type ParsedTelegramMessage = {
  updateId: number;
  messageId: number;
  chatId: number;
  fromUserId: number;
  text: string;
  date: number;
  replyToMessageId?: number;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parse a Telegram Bot API Update payload.
 *
 * Only handles text messages (message.text).
 * Returns null for photos, stickers, edited_message, callback_query, etc.
 *
 * Telegram Update structure:
 * {
 *   update_id: 123456,
 *   message: {
 *     message_id: 789,
 *     from: { id: 111222333, first_name: "John" },
 *     chat: { id: 111222333, type: "private" },
 *     date: 1700000000,
 *     text: "Hello"
 *   }
 * }
 */
export function parseTelegramUpdate(body: unknown): ParsedTelegramMessage | null {
  if (!isRecord(body)) {
    return null;
  }

  const updateId = body.update_id;
  if (typeof updateId !== "number") {
    return null;
  }

  const message = body.message;
  if (!isRecord(message)) {
    return null;
  }

  const text = message.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return null;
  }

  const messageId = message.message_id;
  if (typeof messageId !== "number") {
    return null;
  }

  const chat = message.chat;
  if (!isRecord(chat) || typeof chat.id !== "number") {
    return null;
  }

  const from = message.from;
  const fromUserId = isRecord(from) && typeof from.id === "number" ? from.id : chat.id as number;

  const date = typeof message.date === "number" ? message.date : Math.floor(Date.now() / 1000);

  // Extract reply_to_message.message_id if present (used for operator handoff)
  const replyTo = message.reply_to_message;
  const replyToMessageId =
    isRecord(replyTo) && typeof replyTo.message_id === "number"
      ? replyTo.message_id
      : undefined;

  return {
    updateId,
    messageId,
    chatId: chat.id as number,
    fromUserId,
    text: text.trim(),
    date,
    replyToMessageId,
  };
}

/**
 * Check if the update is something we should silently ignore
 * (edited messages, channel posts, callback queries without text, etc.)
 */
export function isSilentUpdate(body: unknown): boolean {
  if (!isRecord(body)) {
    return true;
  }

  // Has a text message — not silent
  if (isRecord(body.message) && typeof (body.message as JsonRecord).text === "string") {
    return false;
  }

  // Everything else (edited_message, callback_query, channel_post, etc.) is silent
  return true;
}
