import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Records a failed webhook event for dead-letter storage.
// SECURITY: Never pass the raw payload — only a SHA256 hash.
export const recordFailedWebhook = internalMutation({
  args: {
    source: v.union(v.literal("whatsapp"), v.literal("bokun"), v.literal("stripe")),
    payloadHash: v.string(),
    errorReason: v.string(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("failed_webhooks", {
      source: args.source,
      payloadHash: args.payloadHash,
      errorReason: args.errorReason,
      eventType: args.eventType,
      retryCount: 0,
      status: "failed",
      createdAt: now,
      updatedAt: now,
    });
  },
});
