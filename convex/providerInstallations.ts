import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

function assertProviderName(provider: string): void {
  if (provider.trim().length === 0) {
    throw new Error("provider must be a non-empty string.");
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

export const upsertInstallation = mutation({
  args: {
    tenantId: v.id("tenants"),
    provider: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
    baseUrl: v.string(),
    authHeaders: v.record(v.string(), v.string()),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertProviderName(args.provider);
    assertValidBaseUrl(args.baseUrl);
    assertStringRecord(args.authHeaders);
    assertStringArray(args.scopes);

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found.");
    }

    const now = Date.now();
    const provider = args.provider.trim().toLowerCase();
    const status = args.status ?? "active";
    const existing = await ctx.db
      .query("provider_installations")
      .withIndex("by_tenantId_provider", (q) =>
        q.eq("tenantId", args.tenantId).eq("provider", provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        baseUrl: args.baseUrl,
        authHeaders: args.authHeaders,
        scopes: args.scopes,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("provider_installations", {
      tenantId: args.tenantId,
      provider,
      status,
      baseUrl: args.baseUrl,
      authHeaders: args.authHeaders,
      scopes: args.scopes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getProviderContext = query({
  args: {
    tenantId: v.id("tenants"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const provider = args.provider.trim().toLowerCase();
    const installation = await ctx.db
      .query("provider_installations")
      .withIndex("by_tenantId_provider", (q) =>
        q.eq("tenantId", args.tenantId).eq("provider", provider)
      )
      .first();

    if (!installation || installation.status !== "active") {
      return null;
    }

    return {
      provider: installation.provider,
      baseUrl: installation.baseUrl,
      headers: installation.authHeaders ?? {},
    };
  },
});

export const getPrimaryProvider = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const installations = await ctx.db
      .query("provider_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const active = installations.filter((item) => item.status === "active");
    if (active.length > 0) {
      active.sort((a, b) => b.updatedAt - a.updatedAt);
      return active[0].provider;
    }

    // Backward compatibility: infer bokun if only legacy installation exists.
    const legacyBokun = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (legacyBokun) {
      return "bokun";
    }

    return null;
  },
});

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("provider_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});
