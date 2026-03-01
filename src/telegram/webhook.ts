import { routeWhatsAppMessage } from "../whatsapp/router.ts";

export type HandleTelegramWebhookMessageArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  sendReply: (text: string) => Promise<void>;
  continueWithLegacyFlow: () => Promise<void> | void;
};

export type HandleTelegramWebhookMessageResult = {
  handled: boolean;
};

export async function handleTelegramWebhookMessage(
  args: HandleTelegramWebhookMessageArgs
): Promise<HandleTelegramWebhookMessageResult> {
  const routed = await routeWhatsAppMessage({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
    text: args.text,
    channel: "tg",
  });

  if (routed.handled) {
    if (routed.text.trim().length > 0) {
      await args.sendReply(routed.text);
    }

    return { handled: true };
  }

  await args.continueWithLegacyFlow();
  return { handled: false };
}
