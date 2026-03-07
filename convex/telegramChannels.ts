import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenantMembership } from "./userTenants";
import { requireServiceToken } from "./serviceAuth";

export const getByBotUsername = query({
  args: { botUsername: v.string(), serviceToken: v.string() },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
    return ctx.db
      .query("telegram_channels")
      .withIndex("by_botUsername", (q) => q.eq("botUsername", args.botUsername))
      .first();
  },
});

export const getByTenantId = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getByTenantIdForService = query({
  args: { tenantId: v.id("tenants"), serviceToken: v.string() },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
    return ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getByOperatorGroupChatId = query({
  args: { tenantId: v.id("tenants"), chatId: v.number() },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    // No dedicated index — scan tenant channels (few records per tenant)
    const all = await ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    return all.find((ch) => ch.operatorGroupChatId === args.chatId) ?? null;
  },
});

export const upsert = mutation({
  args: {
    tenantId: v.id("tenants"),
    botToken: v.optional(v.string()),
    botUsername: v.string(),
    webhookSecret: v.optional(v.string()),
    operatorGroupChatId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);

    const existing = await ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const now = Date.now();

    const incomingBotToken = args.botToken?.trim() ?? "";
    const incomingWebhookSecret = args.webhookSecret?.trim() ?? "";
    const normalizedBotUsername = args.botUsername.trim().replace(/^@/, "");
    if (!normalizedBotUsername) {
      throw new Error("Bot Username é obrigatório.");
    }

    const botToken = incomingBotToken || existing?.botToken || "";
    const webhookSecret = incomingWebhookSecret || existing?.webhookSecret || "";

    if (!botToken) {
      throw new Error("Bot Token é obrigatório.");
    }
    if (!webhookSecret) {
      throw new Error("Webhook Secret é obrigatório.");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        botToken,
        botUsername: normalizedBotUsername,
        webhookSecret,
        operatorGroupChatId: args.operatorGroupChatId,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("telegram_channels", {
      tenantId: args.tenantId,
      botToken,
      botUsername: normalizedBotUsername,
      webhookSecret,
      operatorGroupChatId: args.operatorGroupChatId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});
