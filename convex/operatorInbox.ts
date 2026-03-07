import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { requireTenantMembership } from "./userTenants";

const META_GRAPH_API_VERSION = "v21.0";

/**
 * Sends an operator reply to the user via WhatsApp or Telegram,
 * then saves the message to chat history.
 */
export const sendOperatorMessage = action({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate membership
    await ctx.runQuery(api.operatorInbox.checkMembership, {
      tenantId: args.tenantId,
    });

    // Get conversation to check handoff state and channel
    const conversation = await ctx.runQuery(
      api.conversations.getConversationByWaUserId,
      { tenantId: args.tenantId, waUserId: args.waUserId },
    );

    if (!conversation || conversation.handoffState !== "active") {
      throw new Error("Conversa não está em atendimento humano ativo.");
    }

    const conversationChannel = conversation.handoffChannel ?? "wa";
    const effectiveChannel =
      args.waUserId.startsWith("tg:") ? "tg" : conversationChannel;

    if (effectiveChannel === "tg") {
      // Send via Telegram Bot API
      const tgChannel = await ctx.runQuery(
        api.telegramChannels.getByTenantId,
        { tenantId: args.tenantId },
      );
      if (!tgChannel?.botToken) {
        throw new Error("Canal Telegram não configurado.");
      }

      const userChatId = Number(args.waUserId.replace("tg:", ""));
      if (Number.isNaN(userChatId)) {
        throw new Error("ID de chat Telegram inválido.");
      }

      const tgRes = await fetch(
        `https://api.telegram.org/bot${tgChannel.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: userChatId, text: args.text }),
        },
      );

      if (!tgRes.ok) {
        const err = await tgRes.text().catch(() => "");
        throw new Error(`Erro ao enviar Telegram: ${tgRes.status} ${err}`);
      }
    } else {
      // Send via WhatsApp Meta Cloud API
      const waChannel = await ctx.runQuery(
        api.whatsappChannels.getByTenantId,
        { tenantId: args.tenantId },
      );
      if (!waChannel?.phoneNumberId || !waChannel?.accessToken) {
        throw new Error("Canal WhatsApp não configurado.");
      }

      const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(waChannel.phoneNumberId)}/messages`;
      const waRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waChannel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: args.waUserId,
          type: "text",
          text: { body: args.text },
        }),
      });

      if (!waRes.ok) {
        const err = await waRes.text().catch(() => "");
        throw new Error(`Erro ao enviar WhatsApp: ${waRes.status} ${err}`);
      }
    }

    // Save message to chat history
    await ctx.runMutation(api.chatMessages.addMessage, {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      role: "assistant",
      content: args.text,
    });

    return { ok: true };
  },
});

/**
 * Resolves (ends) a handoff, sends closing message to user,
 * and clears handoff state.
 */
export const resolveHandoff = action({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.operatorInbox.checkMembership, {
      tenantId: args.tenantId,
    });

    const conversation = await ctx.runQuery(
      api.conversations.getConversationByWaUserId,
      { tenantId: args.tenantId, waUserId: args.waUserId },
    );

    if (!conversation || conversation.handoffState !== "active") {
      throw new Error("Conversa não está em atendimento humano ativo.");
    }

    const closeMessage =
      "Atendimento encerrado. Posso ajudar com mais alguma coisa?";
    const conversationChannel = conversation.handoffChannel ?? "wa";
    const effectiveChannel =
      args.waUserId.startsWith("tg:") ? "tg" : conversationChannel;

    if (effectiveChannel === "tg") {
      const tgChannel = await ctx.runQuery(
        api.telegramChannels.getByTenantId,
        { tenantId: args.tenantId },
      );
      if (tgChannel?.botToken) {
        const userChatId = Number(args.waUserId.replace("tg:", ""));
        if (!Number.isNaN(userChatId)) {
          await fetch(
            `https://api.telegram.org/bot${tgChannel.botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: userChatId,
                text: closeMessage,
              }),
            },
          );
        }
      }
    } else {
      const waChannel = await ctx.runQuery(
        api.whatsappChannels.getByTenantId,
        { tenantId: args.tenantId },
      );
      if (waChannel?.phoneNumberId && waChannel?.accessToken) {
        const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(waChannel.phoneNumberId)}/messages`;
        await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waChannel.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: args.waUserId,
            type: "text",
            text: { body: closeMessage },
          }),
        });
      }
    }

    // Clear handoff state
    await ctx.runMutation(api.conversations.clearHandoff, {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    });

    // Save closing message to history
    await ctx.runMutation(api.chatMessages.addMessage, {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      role: "assistant",
      content: closeMessage,
    });

    return { ok: true };
  },
});

/** Helper query for auth check inside actions. */
export const checkMembership = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return true;
  },
});
