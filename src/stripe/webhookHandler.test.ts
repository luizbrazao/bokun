import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type Stripe from "stripe";

// Hoisted mocks — these are available inside vi.mock factories (which are hoisted)
const { mockSubscriptionsRetrieve, mockConstructEvent } = vi.hoisted(() => ({
  mockSubscriptionsRetrieve: vi.fn(),
  mockConstructEvent: vi.fn(),
}));

// Set env vars before any module loads to avoid Stripe key errors at init
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
});

// Mock the Convex client
vi.mock("../convex/client.ts", () => ({
  getConvexClient: vi.fn(),
}));

// Mock the logger to avoid stdout noise in tests
vi.mock("../../lib/logger.ts", () => ({
  rootLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the Stripe module — must use a regular function so `new Stripe()` works
vi.mock("stripe", () => {
  function MockStripe() {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
    };
  }
  return { default: MockStripe };
});

import { handleStripeEvent } from "./webhookHandler.ts";
import { getConvexClient } from "../convex/client.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockConvex({
  claimResult = true as boolean | { ok: boolean },
  tenants = [] as Array<{ _id: string; stripeCustomerId?: string }>,
} = {}) {
  return {
    mutation: vi.fn().mockResolvedValue(claimResult),
    query: vi.fn().mockImplementation((name: string) => {
      if (name.includes("listTenants")) return Promise.resolve(tenants);
      return Promise.resolve(null);
    }),
    action: vi.fn().mockResolvedValue(undefined),
  };
}

function makeCheckoutEvent(customerId: string, subscriptionId: string): Stripe.Event {
  return {
    id: "evt_checkout_001",
    type: "checkout.session.completed",
    data: {
      object: {
        customer: customerId,
        subscription: subscriptionId,
      } as any,
    },
  } as any;
}

function makeSubscriptionEvent(
  type: "customer.subscription.updated" | "customer.subscription.deleted",
  customerId: string,
  subscriptionId: string,
  status: string
): Stripe.Event {
  return {
    id: `evt_sub_${type.replace(/\./g, "_")}_001`,
    type,
    data: {
      object: {
        id: subscriptionId,
        customer: customerId,
        status,
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      } as any,
    },
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleStripeEvent — checkout.session.completed", () => {
  it("retrieves subscription and persists it when tenant is found", async () => {
    const tenant = { _id: "tenant_123", stripeCustomerId: "cus_A" };
    const mockConvex = makeMockConvex({ claimResult: true, tenants: [tenant] });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_001",
      status: "trialing",
      current_period_end: 9999999999,
      customer: "cus_A",
    });

    const event = makeCheckoutEvent("cus_A", "sub_001");
    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: true });
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_001");
    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.stringContaining("upsertTenantSubscription"),
      expect.objectContaining({
        tenantId: tenant._id,
        stripeCustomerId: "cus_A",
        stripeSubscriptionId: "sub_001",
        stripeStatus: "trialing",
      })
    );
  });

  it("returns handled: false with reason 'missing_customer_or_subscription' when customerId is absent", async () => {
    const mockConvex = makeMockConvex({ claimResult: true });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event: Stripe.Event = {
      id: "evt_checkout_no_ids",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: null,
          subscription: null,
        } as any,
      },
    } as any;

    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: false, reason: "missing_customer_or_subscription" });
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });
});

describe("handleStripeEvent — customer.subscription.updated", () => {
  it("calls upsertTenantSubscription with correct tenantId and status", async () => {
    const tenant = { _id: "tenant_456", stripeCustomerId: "cus_B" };
    const mockConvex = makeMockConvex({ claimResult: true, tenants: [tenant] });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event = makeSubscriptionEvent("customer.subscription.updated", "cus_B", "sub_002", "active");
    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: true });
    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.stringContaining("upsertTenantSubscription"),
      expect.objectContaining({
        tenantId: tenant._id,
        stripeStatus: "active",
        stripeSubscriptionId: "sub_002",
      })
    );
  });
});

describe("handleStripeEvent — customer.subscription.deleted", () => {
  it("persists 'canceled' status when subscription is deleted", async () => {
    const tenant = { _id: "tenant_789", stripeCustomerId: "cus_C" };
    const mockConvex = makeMockConvex({ claimResult: true, tenants: [tenant] });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event = makeSubscriptionEvent("customer.subscription.deleted", "cus_C", "sub_003", "canceled");
    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: true });
    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.stringContaining("upsertTenantSubscription"),
      expect.objectContaining({
        tenantId: tenant._id,
        stripeStatus: "canceled",
      })
    );
  });
});

describe("handleStripeEvent — idempotency", () => {
  it("returns handled: false with reason 'duplicate' when event was already claimed", async () => {
    const mockConvex = makeMockConvex({ claimResult: false }); // already claimed
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event = makeSubscriptionEvent("customer.subscription.updated", "cus_D", "sub_004", "active");
    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: false, reason: "duplicate" });
    // upsertTenantSubscription must NOT be called on duplicate
    expect(mockConvex.mutation).toHaveBeenCalledTimes(1); // only claimStripeEvent
    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.stringContaining("claimStripeEvent"),
      expect.anything()
    );
    expect(mockConvex.mutation).not.toHaveBeenCalledWith(
      expect.stringContaining("upsertTenantSubscription"),
      expect.anything()
    );
  });
});

describe("handleStripeEvent — unknown event type", () => {
  it("returns handled: false with reason 'unhandled_event_type'", async () => {
    const mockConvex = makeMockConvex({ claimResult: true });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event: Stripe.Event = {
      id: "evt_unknown_001",
      type: "payment_intent.created" as any,
      data: { object: {} as any },
    } as any;

    const result = await handleStripeEvent(event);

    expect(result).toEqual({ handled: false, reason: "unhandled_event_type" });
  });
});

describe("handleStripeEvent — tenant not found", () => {
  it("calls recordFailedWebhook when no tenant matches customerId", async () => {
    // listTenants returns empty — no tenant has this customerId
    const mockConvex = makeMockConvex({ claimResult: true, tenants: [] });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const event = makeSubscriptionEvent("customer.subscription.updated", "cus_orphan", "sub_005", "active");
    const result = await handleStripeEvent(event);

    // Event was claimed, persisted to failed_webhooks, returns true
    expect(result).toEqual({ handled: true });
    // recordFailedWebhook should be called
    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.stringContaining("recordFailedWebhook"),
      expect.objectContaining({ source: "stripe" })
    );
  });
});
