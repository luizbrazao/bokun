import { routeWhatsAppMessage } from "./router.ts";

export type HandleWhatsAppWebhookMessageArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  sendReply: (text: string) => Promise<void>;
  continueWithLegacyFlow: () => Promise<void> | void;
};

export type HandleWhatsAppWebhookMessageResult = {
  handled: boolean;
};

export async function handleWhatsAppWebhookMessage(
  args: HandleWhatsAppWebhookMessageArgs
): Promise<HandleWhatsAppWebhookMessageResult> {
  const routed = await routeWhatsAppMessage({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
    text: args.text,
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
