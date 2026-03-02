import { routeWhatsAppMessage } from "./router.ts";
import { rootLogger } from "../lib/logger.ts";

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
    } else {
      rootLogger.info(
        {
          handler: "whatsapp_router",
          tenantId: args.tenantId,
          waUserId: args.waUserId,
        },
        "routed_handled_without_text"
      );
    }

    return { handled: true };
  }

  await args.continueWithLegacyFlow();
  return { handled: false };
}
