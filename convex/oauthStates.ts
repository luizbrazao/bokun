import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    state: v.string(),
    bokunEnvironment: v.optional(v.string()),
    bokunDomain: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("oauth_states", {
      state: args.state,
      bokunEnvironment: args.bokunEnvironment,
      bokunDomain: args.bokunDomain,
      createdAt: args.createdAt,
    });
  },
});

export const getByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
  },
});

/**
 * Atomically consume an OAuth state: find it, validate TTL, and delete it.
 * Uses a mutation for strong consistency (no read-after-write lag).
 */
export const consumeState = mutation({
  args: {
    state: v.string(),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!record) {
      return { ok: false as const, error: "not_found" as const };
    }

    // Always delete the state (single-use)
    await ctx.db.delete(record._id);

    if (Date.now() - record.createdAt > args.ttlMs) {
      return { ok: false as const, error: "expired" as const };
    }

    return {
      ok: true as const,
      bokunEnvironment: record.bokunEnvironment,
      bokunDomain: record.bokunDomain,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("oauth_states") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
