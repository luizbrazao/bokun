import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Upserts Stripe subscription state onto the tenant record.
// Called for: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
export const upsertTenantSubscription = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeStatus: v.string(), // "active" | "trialing" | "past_due" | "canceled" (one L — Stripe convention)
    stripeCurrentPeriodEnd: v.number(), // Unix timestamp in SECONDS (Stripe format)
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error(`Tenant not found: ${args.tenantId}`);
    await ctx.db.patch(args.tenantId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeStatus: args.stripeStatus,
      stripeCurrentPeriodEnd: args.stripeCurrentPeriodEnd,
    });
  },
});
