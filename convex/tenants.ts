import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";
import { requireServiceToken } from "./serviceAuth";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createTenant = mutation({
  args: {
    name: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      status: args.status ?? "active",
      createdAt: Date.now(),
    });

    return tenantId;
  },
});

/**
 * Idempotent tenant creation for OAuth installs.
 * If a tenant with the given externalVendorId already exists, returns it.
 * Otherwise creates a new one.
 */
export const findOrCreateByVendorId = mutation({
  args: {
    externalVendorId: v.string(),
    name: v.string(),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);

    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_externalVendorId", (q) => q.eq("externalVendorId", args.externalVendorId))
      .first();

    if (existing) {
      return { tenantId: existing._id, created: false };
    }

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      externalVendorId: args.externalVendorId,
      status: "active",
      createdAt: Date.now(),
    });

    return { tenantId, created: true };
  },
});

export const getTenantById = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db.get(args.tenantId);
  },
});

export const listTenants = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const tenants = await Promise.all(memberships.map((m) => ctx.db.get(m.tenantId)));
    return tenants.filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== null);
  },
});

export const getTenantByIdForService = query({
  args: {
    tenantId: v.id("tenants"),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
    return ctx.db.get(args.tenantId);
  },
});

export const listTenantsForService = query({
  args: {
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
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

export const generateInviteCodeForService = mutation({
  args: {
    tenantId: v.id("tenants"),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
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
  args: {
    tenantId: v.id("tenants"),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;
    return {
      openaiApiKey: tenant.openaiApiKey ?? null,
      openaiModel: tenant.openaiModel ?? null,
    };
  },
});

/* ─── Profile Settings ─── */

export const getTenantProfile = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) return null;
    return {
      name: tenant.name,
      businessName: tenant.businessName ?? null,
      logoUrl: tenant.logoUrl ?? null,
      contactEmail: tenant.contactEmail ?? null,
      timezone: tenant.timezone ?? "Europe/Madrid",
      language: tenant.language ?? "pt",
      // Subscription fields for Assinatura tab:
      stripeStatus: tenant.stripeStatus ?? null,
      stripeCurrentPeriodEnd: tenant.stripeCurrentPeriodEnd ?? null,
      stripeSubscriptionId: tenant.stripeSubscriptionId ?? null,
    };
  },
});

export const updateTenantProfile = mutation({
  args: {
    tenantId: v.id("tenants"),
    businessName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const { tenantId, ...fields } = args;
    // Only patch fields that are provided (not undefined)
    const patch: Record<string, unknown> = {};
    if (fields.businessName !== undefined) patch.businessName = fields.businessName.trim();
    if (fields.logoUrl !== undefined) patch.logoUrl = fields.logoUrl.trim();
    if (fields.contactEmail !== undefined) patch.contactEmail = fields.contactEmail.trim();
    if (fields.timezone !== undefined) patch.timezone = fields.timezone;
    if (fields.language !== undefined) patch.language = fields.language;
    await ctx.db.patch(tenantId, patch);
  },
});

export const updateTenantStatus = mutation({
  args: {
    tenantId: v.id("tenants"),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (ctx, args) => {
    const membership = await requireTenantMembership(ctx, args.tenantId);
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Apenas donos ou admins podem alterar o status do bot.");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found.");
    }
    await ctx.db.patch(args.tenantId, { status: args.status });
  },
});
