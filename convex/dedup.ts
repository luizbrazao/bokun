import { mutation } from "./_generated/server";
import { v } from "convex/values";

function assertNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

export const claim = mutation({
  args: {
    tenantId: v.id("tenants"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.key, "key");

    const existing = await ctx.db
      .query("webhook_dedup")
      .withIndex("by_tenantId_key", (q) => q.eq("tenantId", args.tenantId).eq("key", args.key))
      .first();

    if (existing) {
      return { ok: false as const };
    }

    await ctx.db.insert("webhook_dedup", {
      tenantId: args.tenantId,
      key: args.key,
      createdAt: Date.now(),
    });

    // Cleanup of old dedup records can be done later via scheduled cleanup mutation/job.
    return { ok: true as const };
  },
});
