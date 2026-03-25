import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";
import { requireServiceToken } from "./serviceAuth";

function assertValidBaseUrl(baseUrl: string): void {
  try {
    new URL(baseUrl);
  } catch {
    throw new Error("Invalid baseUrl. Expected a valid absolute URL.");
  }
}

function assertStringRecord(value: Record<string, string>): void {
  for (const [key, item] of Object.entries(value)) {
    if (typeof key !== "string" || typeof item !== "string") {
      throw new Error("Invalid authHeaders. Expected string-to-string map.");
    }
  }
}

function assertStringArray(value: string[] | undefined): void {
  if (!value) {
    return;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Invalid scopes. Expected array of strings.");
  }
}

export const upsertBokunInstallation = mutation({
  args: {
    tenantId: v.id("tenants"),
    baseUrl: v.string(),
    authHeaders: v.record(v.string(), v.string()),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const membership = await requireTenantMembership(ctx, args.tenantId);
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Apenas donos ou admins podem alterar credenciais Bokun.");
    }

    assertValidBaseUrl(args.baseUrl);
    assertStringRecord(args.authHeaders);
    assertStringArray(args.scopes);

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        baseUrl: args.baseUrl,
        authHeaders: args.authHeaders,
        scopes: args.scopes,
        updatedAt: now,
      });

      return existing._id;
    }

    const installationId = await ctx.db.insert("bokun_installations", {
      tenantId: args.tenantId,
      baseUrl: args.baseUrl,
      authHeaders: args.authHeaders,
      scopes: args.scopes,
      createdAt: now,
      updatedAt: now,
    });

    return installationId;
  },
});

/**
 * Internal-only query for Convex actions (bookings.ts, dashboard.ts).
 * NOT callable from external clients.
 */
export const getBokunContext = internalQuery({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!installation) {
      return null;
    }

    return {
      baseUrl: installation.baseUrl,
      headers: installation.authHeaders ?? {},
    };
  },
});

/**
 * Service-token-protected query for the Node.js backend (src/bokun/context.ts).
 * Returns credentials — never expose to frontend clients.
 */
export const getBokunContextForService = query({
  args: {
    tenantId: v.id("tenants"),
    serviceToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServiceToken(ctx, args.serviceToken);

    const installation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!installation) {
      return null;
    }

    return {
      baseUrl: installation.baseUrl,
      headers: installation.authHeaders ?? {},
    };
  },
});

/**
 * User-facing query: returns installation info WITHOUT secrets.
 * Safe to call from frontend (e.g., SettingsPage).
 */
export const getBokunInstallationInfo = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);

    const installation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!installation) {
      return null;
    }

    return {
      baseUrl: installation.baseUrl,
      scopes: installation.scopes ?? [],
      hasCredentials: Object.keys(installation.authHeaders ?? {}).length > 0,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt,
    };
  },
});
