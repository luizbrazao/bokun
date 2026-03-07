import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const upsertAndRegisterWebhook = action({
  args: {
    tenantId: v.id("tenants"),
    botToken: v.optional(v.string()),
    botUsername: v.string(),
    webhookSecret: v.optional(v.string()),
    operatorGroupChatId: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; webhookUrl: string }> => {
    await ctx.runMutation(api.telegramChannels.upsert, args);

    const channel = (await ctx.runQuery(api.telegramChannels.getByTenantId, {
      tenantId: args.tenantId,
    })) as
      | {
          botToken: string;
          botUsername: string;
          webhookSecret: string;
        }
      | null;
    if (!channel) {
      throw new Error("Canal Telegram não encontrado após salvar.");
    }

    const env =
      ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ??
      {};
    const webhookBaseUrl = (
      env.WEBHOOK_BASE_URL?.trim() ||
      env.PUBLIC_API_BASE_URL?.trim() ||
      "https://api.bokun.iaoperators.com"
    ).replace(/\/$/, "");
    const webhookUrl: string = `${webhookBaseUrl}/telegram/webhook/${encodeURIComponent(channel.botUsername)}`;

    const setWebhookResponse = await fetch(`https://api.telegram.org/bot${channel.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: channel.webhookSecret,
        allowed_updates: ["message"],
      }),
    });
    const webhookResult = (await setWebhookResponse.json().catch(() => null)) as
      | { ok?: boolean; description?: string }
      | null;

    if (!setWebhookResponse.ok || !webhookResult?.ok) {
      const description = webhookResult?.description ?? `HTTP ${setWebhookResponse.status}`;
      throw new Error(`Falha ao registrar webhook no Telegram: ${description}`);
    }

    return {
      ok: true,
      webhookUrl,
    };
  },
});
