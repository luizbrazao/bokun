export type SendWhatsAppMessageArgs = {
  phoneNumberId: string;
  recipientPhone: string;
  text: string;
  accessToken: string;
};

export type SendWhatsAppMessageResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

const META_GRAPH_API_VERSION = "v21.0";

/**
 * Sends a text message via Meta Cloud API (WhatsApp Business).
 *
 * POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 * Authorization: Bearer {accessToken}
 * Content-Type: application/json
 *
 * Body: { messaging_product: "whatsapp", to: "5511...", type: "text", text: { body: "..." } }
 */
export async function sendWhatsAppMessage(
  args: SendWhatsAppMessageArgs
): Promise<SendWhatsAppMessageResult> {
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(args.phoneNumberId)}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: args.recipientPhone,
    type: "text",
    text: { body: args.text },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error sending WhatsApp message.",
    };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      ok: false,
      error: `Meta API error (${response.status}): ${errorText}`,
    };
  }

  let responseData: Record<string, unknown> = {};
  try {
    responseData = (await response.json()) as Record<string, unknown>;
  } catch {
    // Response was ok but couldn't parse body - still consider success
  }

  const messages = responseData.messages;
  let messageId: string | undefined;
  if (Array.isArray(messages) && messages.length > 0) {
    const first = messages[0] as Record<string, unknown> | undefined;
    if (first && typeof first.id === "string") {
      messageId = first.id;
    }
  }

  return { ok: true, messageId };
}
