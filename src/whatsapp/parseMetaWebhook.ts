type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export type ParsedWhatsAppMessage = {
  phoneNumberId: string;
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
};

export type ParseMetaWebhookResult = {
  messages: ParsedWhatsAppMessage[];
};

/**
 * Parses the Meta Cloud API webhook payload and extracts text messages.
 *
 * Meta webhook payload structure:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "WABA_ID",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
 *         "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
 *         "messages": [{ "from": "5511...", "id": "wamid...", "timestamp": "...", "type": "text", "text": { "body": "..." } }]
 *       },
 *       "field": "messages"
 *     }]
 *   }]
 * }
 */
export function parseMetaWebhook(body: unknown): ParseMetaWebhookResult {
  const result: ParsedWhatsAppMessage[] = [];

  if (!isRecord(body)) {
    return { messages: [] };
  }

  const entries = body.entry;
  if (!Array.isArray(entries)) {
    return { messages: [] };
  }

  for (const entry of entries) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value)) {
        continue;
      }

      const value = change.value;
      const metadata = isRecord(value.metadata) ? value.metadata : undefined;
      const phoneNumberId = metadata ? asString(metadata.phone_number_id) : undefined;

      if (!phoneNumberId) {
        continue;
      }

      const messages = value.messages;
      if (!Array.isArray(messages)) {
        continue;
      }

      for (const msg of messages) {
        if (!isRecord(msg)) {
          continue;
        }

        if (msg.type !== "text") {
          continue;
        }

        const from = asString(msg.from);
        const messageId = asString(msg.id);
        const textObj = isRecord(msg.text) ? msg.text : undefined;
        const text = textObj ? asString(textObj.body) : undefined;
        const timestamp = asString(msg.timestamp) ?? "";

        if (from && messageId && text) {
          result.push({ phoneNumberId, from, messageId, text, timestamp });
        }
      }
    }
  }

  return { messages: result };
}

/**
 * Checks if a webhook payload is a status update (delivery receipts, read receipts)
 * rather than an incoming message. These should be acknowledged but not processed.
 */
export function isStatusUpdate(body: unknown): boolean {
  if (!isRecord(body)) {
    return false;
  }

  const entries = body.entry;
  if (!Array.isArray(entries)) {
    return false;
  }

  for (const entry of entries) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value)) {
        continue;
      }

      const value = change.value;
      if (Array.isArray(value.statuses) && value.statuses.length > 0) {
        return true;
      }
    }
  }

  return false;
}
