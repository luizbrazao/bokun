import Stripe from "stripe";
import { createHash } from "node:crypto";
import { rootLogger } from "../lib/logger.ts";
import { getConvexClient, getConvexServiceToken } from "../convex/client.ts";

// Lazy singleton — avoids throwing at module load time when STRIPE_SECRET_KEY is not set.
// The key is validated at request time in handleStripeWebhookPost before calling these functions.
let _stripe: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY ?? "";
    _stripe = new Stripe(apiKey);
  }
  return _stripe;
}

/**
 * Verifies the Stripe webhook signature and parses the event.
 *
 * CRITICAL: rawBody must be the raw Buffer from readRawBody() — do NOT call
 * .toString() or JSON.parse() before passing here. The Stripe SDK validates
 * HMAC-SHA256 against the exact bytes of the body.
 *
 * Throws Stripe.errors.StripeSignatureVerificationError on invalid signature.
 */
export function verifyAndParseStripeWebhook(
  rawBody: Buffer,
  signatureHeader: string,
  webhookSecret: string
): Stripe.Event {
  // constructEvent is synchronous; handles: dual signature scheme, timestamp tolerance (300s), timing-safe comparison
  return getStripeClient().webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
}

/**
 * Processes a verified Stripe event: deduplication + subscription state persistence.
 * Returns { handled: true } if the event was processed, { handled: false, reason } if skipped.
 */
export async function handleStripeEvent(
  event: Stripe.Event
): Promise<{ handled: boolean; reason?: string }> {
  const convex = getConvexClient();

  // ── Step 1: Idempotency — claim the event atomically ──────────────────────
  const claimResult = (await convex.mutation(
    "stripeDedup:claimStripeEvent" as any,
    { eventId: event.id } as any
  )) as { ok?: boolean } | boolean;

  const claimed = typeof claimResult === "boolean" ? claimResult : claimResult.ok === true;

  if (!claimed) {
    rootLogger.info(
      { handler: "stripe_webhook", eventId: event.id, eventType: event.type },
      "stripe_event_duplicate_skipped"
    );
    return { handled: false, reason: "duplicate" };
  }

  // ── Step 2: Dispatch on event type ────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      if (!customerId || !subscriptionId) {
        rootLogger.warn(
          { handler: "stripe_webhook", eventId: event.id, customerId, subscriptionId },
          "stripe_checkout_missing_ids"
        );
        return { handled: false, reason: "missing_customer_or_subscription" };
      }

      // Retrieve full subscription to get accurate status at checkout completion time.
      // Pitfall #6: checkout.session.completed may arrive before subscription is "active".
      const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
      await persistSubscription(convex, customerId, subscription);
      return { handled: true };
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
      await persistSubscription(convex, customerId, subscription);
      return { handled: true };
    }

    default: {
      rootLogger.debug(
        { handler: "stripe_webhook", eventId: event.id, eventType: event.type },
        "stripe_event_unhandled_type"
      );
      return { handled: false, reason: "unhandled_event_type" };
    }
  }
}

/**
 * Finds the tenant by stripeCustomerId and upserts their subscription state.
 * If no tenant matches, logs a warning and stores nothing (tenant will be linked when they complete checkout via Phase 4 UI).
 *
 * IMPORTANT: Uses convex.query("tenants:listTenantsForService" as any, { serviceToken } as any).
 * The function name "listTenantsForService" was verified by reading convex/tenants.ts before
 * writing this file. If no such query exists, add it to convex/tenants.ts first.
 */
async function persistSubscription(
  convex: ReturnType<typeof getConvexClient>,
  customerId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const serviceToken = getConvexServiceToken();
  // Find tenant by stripeCustomerId. No index yet — linear scan acceptable for Phase 3 volume.
  // VERIFIED: "listTenantsForService" is the exact exported query name in convex/tenants.ts.
  const tenants = (await convex.query(
    "tenants:listTenantsForService" as any,
    { serviceToken } as any
  )) as Array<{ _id: string; stripeCustomerId?: string }>;

  const tenant = tenants.find((t) => t.stripeCustomerId === customerId);

  if (!tenant) {
    rootLogger.warn(
      { handler: "stripe_webhook", customerId, subscriptionId: subscription.id },
      "stripe_tenant_not_found_for_customer"
    );
    // Phase 3: no tenant yet — checkout flow (Phase 4) will write customerId first.
    // Store in failed_webhooks so operators can review and retry after tenant is linked.
    const hash = createHash("sha256").update(customerId + ":" + subscription.id).digest("hex");
    await convex.mutation(
      "failedWebhooks:recordFailedWebhook" as any,
      {
        source: "stripe",
        payloadHash: hash,
        errorReason: `tenant_not_found for customerId=${customerId}`,
        eventType: subscription.status,
      } as any
    );
    return;
  }

  await convex.mutation(
    "subscriptions:upsertTenantSubscription" as any,
    {
      tenantId: tenant._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeStatus: subscription.status, // "active" | "past_due" | "canceled" (one L) | "trialing" | ...
      stripeCurrentPeriodEnd: subscription.current_period_end, // seconds (Stripe format)
    } as any
  );

  rootLogger.info(
    {
      handler: "stripe_webhook",
      tenantId: tenant._id,
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
    },
    "stripe_subscription_persisted"
  );
}
