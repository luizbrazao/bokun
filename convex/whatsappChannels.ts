import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenantMembership } from "./userTenants";
import { requireServiceToken } from "./serviceAuth";

export const getByPhoneNumberId = query({
  args: { phoneNumberId: v.string(), serviceToken: v.string() },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);

    const channels = await ctx.db
      .query("whatsapp_channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();

    if (channels.length === 0) {
      return null;
    }

    const active = channels.filter((channel) => channel.status === "active");
    const candidates = active.length > 0 ? active : channels;

    return candidates.reduce((best, current) =>
      current.updatedAt > best.updatedAt ? current : best
    );
  },
});

export const getByTenantId = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
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
    await requireTenantMembership(ctx, args.tenantId);

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
