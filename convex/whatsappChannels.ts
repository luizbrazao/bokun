import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByPhoneNumberId = query({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("whatsapp_channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .first();
  },
});

export const getByTenantId = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    tenantId: v.id("tenants"),
    phoneNumberId: v.string(),
    wabaId: v.string(),
    accessToken: v.string(),
    verifyToken: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phoneNumberId: args.phoneNumberId,
        wabaId: args.wabaId,
        accessToken: args.accessToken,
        verifyToken: args.verifyToken,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("whatsapp_channels", {
      tenantId: args.tenantId,
      phoneNumberId: args.phoneNumberId,
      wabaId: args.wabaId,
      accessToken: args.accessToken,
      verifyToken: args.verifyToken,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});
