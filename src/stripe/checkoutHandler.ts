import Stripe from "stripe";
import { getConvexClient, getConvexServiceToken } from "../convex/client.ts";

// Lazy singleton — avoids throwing at module load time when STRIPE_SECRET_KEY is not set.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, { apiVersion: "2024-09-30.acacia" });
  }
  return _stripe;
}

export type CreateCheckoutSessionArgs = {
  tenantId: string;
  plan: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(args: CreateCheckoutSessionArgs): Promise<{ url: string }> {
  const stripe = getStripe();
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
  if (!monthlyPriceId || !annualPriceId) {
    throw new Error("STRIPE_MONTHLY_PRICE_ID and STRIPE_ANNUAL_PRICE_ID must be set");
  }

  const priceId = args.plan === "monthly" ? monthlyPriceId : annualPriceId;

  // Look up tenant to get or create Stripe customer
  const tenant = (await convex.query(
    "tenants:getTenantByIdForService" as any,
    { tenantId: args.tenantId, serviceToken } as any
  )) as {
    stripeCustomerId?: string;
    name: string;
  } | null;
  if (!tenant) throw new Error("Tenant not found");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    // Trial is app-managed (tenant.createdAt / status gating), so Stripe checkout
    // should charge immediately when the customer decides to subscribe.
    subscription_data: {
      metadata: { tenantId: args.tenantId },
    },
    customer: tenant.stripeCustomerId ?? undefined,
    metadata: { tenantId: args.tenantId },
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe Checkout session URL is null");
  return { url: session.url };
}
