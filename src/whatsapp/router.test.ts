import { describe, it, expect } from "vitest";
import { isSubscriptionGated } from "./router.ts";

const ONE_DAY_S = 86400;

describe("isSubscriptionGated", () => {
  it("returns false when stripeStatus is undefined (pre-Stripe tenant)", () => {
    expect(isSubscriptionGated(undefined, undefined)).toBe(false);
  });

  it("returns false when stripeStatus is null (pre-Stripe tenant)", () => {
    expect(isSubscriptionGated(null, null)).toBe(false);
  });

  it("returns false when stripeStatus is 'active'", () => {
    expect(isSubscriptionGated("active", undefined)).toBe(false);
  });

  it("returns false when stripeStatus is 'trialing'", () => {
    expect(isSubscriptionGated("trialing", undefined)).toBe(false);
  });

  it("returns true when stripeStatus is 'canceled'", () => {
    expect(isSubscriptionGated("canceled", undefined)).toBe(true);
  });

  it("returns true when stripeStatus is 'unpaid'", () => {
    expect(isSubscriptionGated("unpaid", undefined)).toBe(true);
  });

  it("returns true when stripeStatus is 'incomplete'", () => {
    expect(isSubscriptionGated("incomplete", undefined)).toBe(true);
  });

  it("returns true when stripeStatus is 'incomplete_expired'", () => {
    expect(isSubscriptionGated("incomplete_expired", undefined)).toBe(true);
  });

  it("returns true when stripeStatus is 'paused'", () => {
    expect(isSubscriptionGated("paused", undefined)).toBe(true);
  });

  it("returns false for 'past_due' when period ended 1 day ago (within 7-day grace)", () => {
    const nowMs = Date.now();
    const periodEnd1DayAgo = Math.floor(nowMs / 1000) - ONE_DAY_S;
    expect(isSubscriptionGated("past_due", periodEnd1DayAgo, nowMs)).toBe(false);
  });

  it("returns false for 'past_due' when period ended 6 days ago (still within grace)", () => {
    const nowMs = Date.now();
    const periodEnd6DaysAgo = Math.floor(nowMs / 1000) - 6 * ONE_DAY_S;
    expect(isSubscriptionGated("past_due", periodEnd6DaysAgo, nowMs)).toBe(false);
  });

  it("returns true for 'past_due' when period ended 8 days ago (beyond grace)", () => {
    const nowMs = Date.now();
    const periodEnd8DaysAgo = Math.floor(nowMs / 1000) - 8 * ONE_DAY_S;
    expect(isSubscriptionGated("past_due", periodEnd8DaysAgo, nowMs)).toBe(true);
  });

  it("returns true for 'past_due' when stripeCurrentPeriodEnd is not set", () => {
    expect(isSubscriptionGated("past_due", null)).toBe(true);
  });
});
