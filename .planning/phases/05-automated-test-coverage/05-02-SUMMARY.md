---
phase: 05-automated-test-coverage
plan: 02
subsystem: testing
tags: [vitest, stripe, convex, subscription-gating, tenant-isolation, unit-tests]

# Dependency graph
requires:
  - phase: 05-01
    provides: Vitest infrastructure and base test patterns
  - phase: 03-billing-ops-hardening
    provides: Stripe webhook handler and subscription persistence
  - phase: 04-dashboard-landing-profile
    provides: Stripe Checkout + stripeStatus/stripeCurrentPeriodEnd on tenant schema

provides:
  - "Subscription gating in router.ts (BILL-05) — blocks canceled/unpaid/paused/incomplete tenants"
  - "isSubscriptionGated helper with 7-day grace period for past_due"
  - "13 unit tests for all subscription status values and grace period boundaries"
  - "4 tenant isolation tests for bookingDrafts and conversations Convex queries"
  - "7 unit tests for handleStripeEvent covering all 3 lifecycle events + idempotency"
  - "Full test suite: 50 tests across 7 files, all green"

affects:
  - future-billing-changes
  - tenant-provisioning
  - stripe-webhook-reliability

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mocks that must be available inside vi.mock() factory closures"
    - "Structural isolation testing — mock ctx.db to capture index filter arguments"
    - "Function constructor mock for `new ClassName()` in vi.mock (not arrow functions)"

key-files:
  created:
    - src/whatsapp/router.test.ts
    - convex/bookingDrafts.test.ts
    - convex/conversations.test.ts
    - src/stripe/webhookHandler.test.ts
  modified:
    - src/whatsapp/router.ts
    - vitest.config.ts

key-decisions:
  - "vi.hoisted() required when mock spy refs must be accessible inside vi.mock() factory — regular variable declarations are not available at hoist time"
  - "Structural isolation tests for Convex queries: mock ctx.db to capture index filter args rather than running Convex runtime"
  - "vitest.config.ts include glob extended to convex/**/*.test.ts to support Convex-side unit tests"
  - "isSubscriptionGated exported as named export so unit tests can import and test in isolation without mocking full router dependencies"

patterns-established:
  - "Subscription gating: check stripeStatus after bot-disabled check, before booking/LLM routing"
  - "Grace period: past_due tenants get 7 days after stripeCurrentPeriodEnd before being blocked"
  - "Pre-Stripe tenants (no stripeStatus): pass through unblocked — backward compatibility"

requirements-completed: [BILL-05, TEST-03, TEST-04]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 05 Plan 02: Subscription Gating + Test Coverage Summary

**Subscription gating (BILL-05) in router.ts with 7-day past_due grace, plus 24 new tests covering gating logic, tenant isolation, and Stripe lifecycle events — 50 total tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-04T09:41:00Z
- **Completed:** 2026-03-04T09:45:34Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Added `isSubscriptionGated()` exported helper to `router.ts` — gates the bot for canceled/unpaid/incomplete/incomplete_expired/paused tenants, with 7-day grace period for past_due
- Wrote 13 deterministic unit tests for all subscription status values and grace period edge cases using `nowMs` parameter
- Wrote 4 structural tenant isolation tests verifying `by_tenantId_waUserId` compound index enforces cross-tenant data boundaries
- Wrote 7 unit tests for `handleStripeEvent` covering checkout completion, subscription updated/deleted, idempotency, unknown event type, and tenant-not-found path
- Extended vitest config to include `convex/**/*.test.ts` alongside `src/**/*.test.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscription gating to router.ts + write router unit tests** - `3d42b20` (feat)
2. **Task 2: Tenant isolation tests** - `a548580` (test)
3. **Task 3: Stripe webhook handler unit tests** - `355ce2a` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/whatsapp/router.ts` — Added `isSubscriptionGated()` exported function and subscription gating check after bot-disabled check
- `src/whatsapp/router.test.ts` — 13 unit tests: undefined/null/active/trialing/canceled/unpaid/incomplete/incomplete_expired/paused, plus 3 past_due grace period boundary tests
- `convex/bookingDrafts.test.ts` — 2 tests: index filter capture + cross-tenant null return
- `convex/conversations.test.ts` — 2 tests: same isolation contract for conversations table
- `src/stripe/webhookHandler.test.ts` — 7 tests: checkout + updated + deleted + idempotency + unknown + tenant-not-found; uses vi.hoisted() for mock refs in vi.mock factory
- `vitest.config.ts` — Extended include glob to `convex/**/*.test.ts`

## Decisions Made

- `vi.hoisted()` is required for creating spy refs that must be available inside `vi.mock()` factories — the factory runs at hoist time before regular variable declarations are evaluated
- Stripe mock must use a regular `function` constructor (not arrow function) so `new Stripe()` call in the module's singleton initialization works correctly
- Structural test approach for Convex isolation: mock `ctx.db.withIndex` to capture filter arguments, as Convex queries cannot run in pure Node.js

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended vitest.config.ts include glob for convex/ directory**
- **Found during:** Task 2 (Tenant isolation tests)
- **Issue:** vitest.config.ts only included `src/**/*.test.ts`; tests in `convex/` directory were not picked up
- **Fix:** Extended to `["src/**/*.test.ts", "convex/**/*.test.ts"]`
- **Files modified:** vitest.config.ts
- **Verification:** convex/bookingDrafts.test.ts and convex/conversations.test.ts discovered and executed
- **Committed in:** a548580 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for test files in convex/ to be discovered. No scope creep.

## Issues Encountered

- vi.mock("stripe") initially used an arrow function returning a plain object — `new Stripe()` calls require a constructor function. Fixed by using a regular `function MockStripe()` declaration inside the factory.
- mockSubscriptionsRetrieve declared outside vi.mock() was inaccessible inside the factory (hoisting order). Fixed by using `vi.hoisted()` to create the mock ref before the factory runs.

## Next Phase Readiness

- Phase 05 is now complete: Vitest infrastructure (05-01) + subscription gating + full test suite (05-02)
- 50 tests covering: option map builder, cancellation flow, orchestration state machine, subscription gating, tenant isolation, Stripe lifecycle events
- Requirements BILL-05, TEST-01, TEST-02, TEST-03, TEST-04 all satisfied

---
*Phase: 05-automated-test-coverage*
*Completed: 2026-03-04*

## Self-Check: PASSED

Files verified:
- FOUND: src/whatsapp/router.ts
- FOUND: src/whatsapp/router.test.ts
- FOUND: convex/bookingDrafts.test.ts
- FOUND: convex/conversations.test.ts
- FOUND: src/stripe/webhookHandler.test.ts

Commits verified:
- 3d42b20 feat(05-02): add subscription gating to router.ts + 13 unit tests
- a548580 test(05-02): add tenant isolation tests for bookingDrafts and conversations
- 355ce2a test(05-02): add 7 unit tests for handleStripeEvent (Stripe webhook handler)

Test results: 50 tests, 7 files, all passing
