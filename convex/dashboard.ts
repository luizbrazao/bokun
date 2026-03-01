import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";

export const listBookingDrafts = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .take(100);
  },
});

export const listConversations = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .take(100);

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await ctx.db
          .query("chat_messages")
          .withIndex("by_tenantId_waUserId", (q) =>
            q.eq("tenantId", args.tenantId).eq("waUserId", conv.waUserId),
          )
          .order("desc")
          .first();
        return {
          ...conv,
          lastMessage: lastMsg
            ? {
                content:
                  lastMsg.content.length > 80
                    ? lastMsg.content.slice(0, 80) + "..."
                    : lastMsg.content,
                role: lastMsg.role,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );
    return enriched;
  },
});

export const getWhatsAppChannel = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getBokunInstallation = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const installation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!installation) return null;
    return {
      _id: installation._id,
      baseUrl: installation.baseUrl,
      scopes: installation.scopes,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt,
    };
  },
});

export const getTenantInfo = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db.get(args.tenantId);
  },
});

export const getTelegramChannel = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

/* ─── Operator Inbox ─── */

export const listActiveHandoffs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .collect();

    const active = conversations.filter((c) => c.handoffState === "active");

    const enriched = await Promise.all(
      active.map(async (conv) => {
        const lastMsg = await ctx.db
          .query("chat_messages")
          .withIndex("by_tenantId_waUserId", (q) =>
            q.eq("tenantId", args.tenantId).eq("waUserId", conv.waUserId),
          )
          .order("desc")
          .first();
        return {
          _id: conv._id,
          waUserId: conv.waUserId,
          handoffChannel: conv.handoffChannel ?? "wa",
          updatedAt: conv.updatedAt,
          lastMessage: lastMsg
            ? {
                content:
                  lastMsg.content.length > 80
                    ? lastMsg.content.slice(0, 80) + "..."
                    : lastMsg.content,
                role: lastMsg.role,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );
    return enriched;
  },
});

export const countActiveHandoffs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();
    return conversations.filter((c) => c.handoffState === "active").length;
  },
});

export const getChatHistory = query({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("chat_messages")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId),
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});
