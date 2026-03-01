import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";

export const createTenant = mutation({
  args: {
    name: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
  },
  handler: async (ctx, args) => {
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      status: args.status ?? "active",
      createdAt: Date.now(),
    });

    return tenantId;
  },
});

export const getTenantById = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.tenantId);
  },
});

export const listTenants = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("tenants").collect();
  },
});

export const generateInviteCode = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found.");
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await ctx.db.patch(args.tenantId, { inviteCode: code });
    return code;
  },
});

/* ─── OpenAI Settings ─── */

export const updateOpenAISettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    openaiApiKey: v.string(),
    openaiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found.");
    await ctx.db.patch(args.tenantId, {
      openaiApiKey: args.openaiApiKey.trim(),
      ...(args.openaiModel ? { openaiModel: args.openaiModel.trim() } : {}),
    });
  },
});

export const getOpenAISettings = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;
    const key = tenant.openaiApiKey;
    return {
      hasKey: !!key,
      maskedKey: key ? `${key.slice(0, 7)}...${key.slice(-4)}` : null,
      openaiModel: tenant.openaiModel ?? null,
    };
  },
});

/** Server-side query (no auth check — called from webhook handler). */
export const getOpenAIKeyForTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;
    return {
      openaiApiKey: tenant.openaiApiKey ?? null,
      openaiModel: tenant.openaiModel ?? null,
    };
  },
});

export const updateTenantStatus = mutation({
  args: {
    tenantId: v.id("tenants"),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found.");
    }
    await ctx.db.patch(args.tenantId, { status: args.status });
  },
});
