import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Atomic claim for Stripe event idempotency.
// Returns { ok: true } if this is the first time we see this eventId.
// Returns { ok: false } if eventId was already claimed (duplicate delivery).
// NOTE: No tenantId — Stripe events arrive before tenant resolution.
export const claimStripeEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    if (!args.eventId.trim()) throw new Error("eventId must be non-empty");
    const existing = await ctx.db
      .query("stripe_event_dedup")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) return { ok: false as const };
    await ctx.db.insert("stripe_event_dedup", {
      eventId: args.eventId,
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});
