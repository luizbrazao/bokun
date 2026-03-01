export type SendTelegramMessageArgs = {
  botToken: string;
  chatId: number;
  text: string;
};

export type SendTelegramMessageResult = {
  ok: boolean;
  messageId?: number;
  error?: string;
};

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/**
 * Sends a text message via Telegram Bot API.
 *
 * POST https://api.telegram.org/bot{token}/sendMessage
 * Body: { chat_id, text }
 *
 * If the text exceeds 4096 characters, it is split into multiple messages.
 */
export async function sendTelegramMessage(
  args: SendTelegramMessageArgs
): Promise<SendTelegramMessageResult> {
  const url = `https://api.telegram.org/bot${args.botToken}/sendMessage`;
  const chunks = splitMessage(args.text, TELEGRAM_MAX_MESSAGE_LENGTH);

  let lastMessageId: number | undefined;

  for (const chunk of chunks) {
    const payload = {
      chat_id: args.chatId,
      text: chunk,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Network error sending Telegram message.",
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Telegram API error (${response.status}): ${errorText}`,
      };
    }

    let responseData: Record<string, unknown> = {};
    try {
      responseData = (await response.json()) as Record<string, unknown>;
    } catch {
      // Response was ok but couldn't parse body — still consider success
    }

    const result = responseData.result;
    if (result && typeof result === "object" && "message_id" in result) {
      lastMessageId = (result as Record<string, unknown>).message_id as number;
    }
  }

  return { ok: true, messageId: lastMessageId };
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at last newline before limit
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0) {
      // No newline found — split at last space
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitAt <= 0) {
      // No space found — hard cut
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
