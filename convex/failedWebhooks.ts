import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";

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

// Lists the 50 most recent failed webhook records (global ops table, no tenantId isolation).
// Requires tenant membership to gate access to authenticated operators only.
export const listFailedWebhooks = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return await ctx.db
      .query("failed_webhooks")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50);
  },
});

// Marks a failed webhook as retried and increments the retry counter.
export const markWebhookRetried = mutation({
  args: {
    webhookId: v.id("failed_webhooks"),
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const existing = await ctx.db.get(args.webhookId);
    if (!existing) throw new Error("Webhook record not found.");
    await ctx.db.patch(args.webhookId, {
      status: "retried",
      retryCount: existing.retryCount + 1,
      updatedAt: Date.now(),
    });
  },
});
