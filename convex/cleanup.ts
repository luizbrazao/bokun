import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60_000;
const DELETE_BATCH_SIZE = 500;

export const cleanupWebhookDedup = internalMutation({
  args: {
    olderThanMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const retentionMs = args.olderThanMs ?? DEFAULT_RETENTION_MS;
    const cutoff = now - retentionMs;

    const stale = await ctx.db
      .query("webhook_dedup")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    return {
      deleted: stale.length,
      cutoff,
    };
  },
});

const RETENTION_90_DAYS_MS = 90 * 24 * 60 * 60_000;
const RETENTION_365_DAYS_MS = 365 * 24 * 60 * 60_000;

export const cleanupConversationData = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? RETENTION_90_DAYS_MS);
    let totalDeleted = 0;

    // conversations
    const staleConversations = await ctx.db
      .query("conversations")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of staleConversations) await ctx.db.delete(row._id);
    totalDeleted += staleConversations.length;

    // booking_drafts
    const staleDrafts = await ctx.db
      .query("booking_drafts")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of staleDrafts) await ctx.db.delete(row._id);
    totalDeleted += staleDrafts.length;

    // chat_messages
    const staleMessages = await ctx.db
      .query("chat_messages")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of staleMessages) await ctx.db.delete(row._id);
    totalDeleted += staleMessages.length;

    return { deleted: totalDeleted, cutoff };
  },
});

export const cleanupAuditLog = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? RETENTION_365_DAYS_MS);
    const stale = await ctx.db
      .query("audit_log")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of stale) await ctx.db.delete(row._id);
    return { deleted: stale.length, cutoff };
  },
});

const RETENTION_30_DAYS_MS = 30 * 24 * 60 * 60_000;

export const cleanupFailedWebhooks = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? RETENTION_30_DAYS_MS);
    const stale = await ctx.db
      .query("failed_webhooks")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of stale) await ctx.db.delete(row._id);
    return { deleted: stale.length, cutoff };
  },
});

export const cleanupStripeEventDedup = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? DEFAULT_RETENTION_MS);
    const stale = await ctx.db
      .query("stripe_event_dedup")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of stale) await ctx.db.delete(row._id);
    return { deleted: stale.length, cutoff };
  },
});
