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

export const getBokunContext = query({
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
