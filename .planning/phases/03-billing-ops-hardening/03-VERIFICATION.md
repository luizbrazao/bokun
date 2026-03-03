---
phase: 03-billing-ops-hardening
verified: 2026-03-03T08:16:11Z
status: human_needed
score: 6/7 must-haves verified
human_verification:
  - test: "Confirm Sentry event visible in production Sentry dashboard"
    expected: "Issue titled 'Sentry E2E validation test — Phase 3' appears in the Bokun production Sentry project with environment 'production'"
    why_human: "The 03-03 SUMMARY.md records human approval with commit 4a18e50, but the event existence in the external Sentry dashboard cannot be verified programmatically. The endpoint and Sentry wiring are verified; only the external confirmation is unverifiable by code inspection."
---

# Phase 3: Billing + Ops Hardening Verification Report

**Phase Goal:** Ship Stripe billing foundations (webhook verified, basic subscription state) AND production-grade ops hardening (Sentry validated end-to-end, dead-letter/retry for failed webhooks, rate limiting on all inbound endpoints). Must be deploy-safe and verified in production. No billing UI — backend and observability foundations only.

**Verified:** 2026-03-03T08:16:11Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /stripe/webhook route exists and verifies Stripe-Signature; invalid signatures rejected with 403 | VERIFIED | `src/server.ts:1660` routes to `handleStripeWebhookPost`; line 1469 calls `verifyAndParseStripeWebhook`; catch at line 1476 returns 403 |
| 2 | Stripe webhook events persist subscription state (customerId, subscriptionId, status, current_period_end) in Convex | VERIFIED | `convex/subscriptions.ts` exports `upsertTenantSubscription` patching all four fields; called from `src/stripe/webhookHandler.ts:146` for all three event types |
| 3 | Stripe webhook processing is idempotent — duplicate delivery of same event.id produces no duplicate state changes | VERIFIED | `convex/stripeDedup.ts` exports `claimStripeEvent` with atomic by-index check; called at `src/stripe/webhookHandler.ts:45` before any state mutation |
| 4 | Sentry proven end-to-end in production — test error visible in Sentry dashboard | NEEDS HUMAN | `src/server.ts:1331-1352` has `handleAdminSentryTestRoute` with `Sentry.captureException` + `Sentry.flush(2000)`; SUMMARY.md records human approval on 2026-03-03 but external Sentry dashboard cannot be verified by code |
| 5 | Failed webhook events are stored in Convex with error reason and payload hash for all three sources | VERIFIED | `convex/failedWebhooks.ts:recordFailedWebhook` — SHA256 hash only (no raw PII); write sites in all three handlers: WhatsApp (server.ts:974-989), Bokun (server.ts:1418-1428), Stripe (server.ts:1489-1499) |
| 6 | Rate limiting enforced on all inbound webhook endpoints with structured log entries on limit hits | VERIFIED | WhatsApp: `inboundMessageLimiter` at server.ts:827 (pre-existing Phase 1); Bokun: `serverWebhookLimiter.check("bokun")` at server.ts:1370; Stripe: `serverWebhookLimiter.check("stripe")` at server.ts:1445; all log `rate_limit_exceeded` |
| 7 | render.yaml and .env.example updated with Stripe vars and runbook notes | VERIFIED | render.yaml:65-67 has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as sync:false secrets; .env.example:155-178 has full Stripe runbook with production URL, test-vs-production secret distinction, activation steps |

**Score:** 6/7 truths verified (1 needs human confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | stripe fields on tenants + stripe_event_dedup + failed_webhooks | VERIFIED | Lines 14-17: stripeCustomerId, stripeSubscriptionId, stripeStatus, stripeCurrentPeriodEnd on tenants; lines 199-204: stripe_event_dedup; lines 206-223: failed_webhooks with all required fields |
| `convex/stripeDedup.ts` | claimStripeEvent internalMutation | VERIFIED | 23 lines; exports `claimStripeEvent`; atomic check-then-insert on `stripe_event_dedup` by_eventId index |
| `convex/subscriptions.ts` | upsertTenantSubscription internalMutation | VERIFIED | 24 lines; exports `upsertTenantSubscription`; gets tenant, patches all four Stripe fields |
| `convex/failedWebhooks.ts` | recordFailedWebhook internalMutation | VERIFIED | 26 lines; exports `recordFailedWebhook`; inserts with source enum + payloadHash + errorReason + status:"failed" |
| `convex/cleanup.ts` | cleanupFailedWebhooks + cleanupStripeEventDedup | VERIFIED | Lines 84-108; cleanupFailedWebhooks uses 30-day retention; cleanupStripeEventDedup uses DEFAULT_RETENTION_MS (7-day) |
| `convex/crons.ts` | daily cleanup crons for failed_webhooks and stripe_event_dedup | VERIFIED | Lines 22-34; "cleanup failed webhooks" at 03:45 UTC; "cleanup stripe event dedup" at 04:00 UTC |
| `src/middleware/rateLimiter.ts` | serverWebhookLimiter export | VERIFIED | Lines 43-52; `serverWebhookLimiter` uses RateLimiterMemory at 300 req/min; configurable via SERVER_WEBHOOK_RATE_MAX / SERVER_WEBHOOK_RATE_WINDOW_MS |
| `src/stripe/webhookHandler.ts` | verifyAndParseStripeWebhook + handleStripeEvent | VERIFIED | 167 lines; exports both functions; `verifyAndParseStripeWebhook` uses Stripe SDK lazy singleton; `handleStripeEvent` dispatches all three event types |
| `src/server.ts` | POST /stripe/webhook + rate limiting + dead-letter sites | VERIFIED | Line 1660: /stripe/webhook route; line 1370: Bokun rate limit; line 1445: Stripe rate limit; dead-letter write in all three handlers' catch blocks |
| `.env.example` | STRIPE_WEBHOOK_SECRET with runbook | VERIFIED | Lines 155-178; full Stripe section with step-by-step Dashboard instructions, production URL, test-vs-production secret distinction |
| `src/server.ts` /admin/sentry-test | POST /admin/sentry-test endpoint | VERIFIED | Lines 1331-1352: `handleAdminSentryTestRoute` with admin key check, captureException, flush(2000); line 1632 routes it |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `convex/stripeDedup.ts` | `convex/schema.ts` | stripe_event_dedup query + insert | VERIFIED | Line 14: `query("stripe_event_dedup")`, line 17: `insert("stripe_event_dedup")` |
| `convex/subscriptions.ts` | `convex/schema.ts` | ctx.db.patch on tenants with stripe fields | VERIFIED | Line 17: `ctx.db.patch(args.tenantId, { stripeCustomerId, stripeSubscriptionId, stripeStatus, stripeCurrentPeriodEnd })` |
| `convex/failedWebhooks.ts` | `convex/schema.ts` | ctx.db.insert into failed_webhooks | VERIFIED | Line 15: `ctx.db.insert("failed_webhooks", { ... })` |
| `src/server.ts` | `src/stripe/webhookHandler.ts` | import { verifyAndParseStripeWebhook, handleStripeEvent } | VERIFIED | server.ts:8: `import { verifyAndParseStripeWebhook, handleStripeEvent } from "./stripe/webhookHandler.ts"` |
| `src/stripe/webhookHandler.ts` | convex (stripeDedup:claimStripeEvent) | convex.mutation calls | VERIFIED | webhookHandler.ts:45-48: `convex.mutation("stripeDedup:claimStripeEvent" as any, ...)` |
| `src/stripe/webhookHandler.ts` | convex/tenants.ts (listTenants) | convex.query("tenants:listTenants") | VERIFIED | webhookHandler.ts:119-122: `convex.query("tenants:listTenants" as any, {} as any)`; confirmed `listTenants` exported at convex/tenants.ts:28 |
| `src/server.ts` | convex (failedWebhooks:recordFailedWebhook) | dead-letter write on exception | VERIFIED | Three write sites: server.ts:978 (WhatsApp), server.ts:1420 (Bokun), server.ts:1491 (Stripe) |
| `src/server.ts` (handleBokunWebhookPost) | `src/middleware/rateLimiter.ts` | serverWebhookLimiter | VERIFIED | server.ts:7: import; server.ts:1370: `serverWebhookLimiter.check("bokun")` |
| `src/server.ts` /admin/sentry-test | Sentry.captureException + Sentry.flush | import * as Sentry from @sentry/node | VERIFIED | server.ts:6: `import * as Sentry from "@sentry/node"`; server.ts:1339: `Sentry.captureException`; server.ts:1342: `Sentry.flush(2000)` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BILL-03 | 03-01, 03-02 | Stripe webhook events checkout.session.completed, customer.subscription.updated, customer.subscription.deleted activate/deactivate tenant subscription status | SATISFIED | `handleStripeEvent` switch at webhookHandler.ts:61 handles all three event types; `upsertTenantSubscription` patches stripeStatus per Stripe response |
| BILL-04 | 03-01, 03-02 | Stripe webhook processing is idempotent — duplicate delivery produces no duplicate state changes | SATISFIED | `claimStripeEvent` at stripeDedup.ts:8 atomically checks by_eventId before any state mutation; duplicate returns `{ ok: false }` and exits early |
| OBS-06a | 03-01, 03-02, 03-03 | failed_webhooks Convex table + write sites in all three webhook handlers + cleanup cron (storage layer only) | SATISFIED | Table in schema.ts:206-223; `recordFailedWebhook` in failedWebhooks.ts; write sites in server.ts at lines 978, 1420, 1491; cleanup crons in crons.ts at lines 22-34 |

No orphaned requirements found. REQUIREMENTS.md traceability table (lines 128-129) maps OBS-06a to Phase 3 (Complete) and OBS-06b to Phase 4 (Pending — correct, UI layer is out of scope for this phase). BILL-03 (line 143) and BILL-04 (line 144) marked Complete, consistent with verified implementation.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

Scan of Phase 3 files (`convex/stripeDedup.ts`, `convex/subscriptions.ts`, `convex/failedWebhooks.ts`, `convex/cleanup.ts` additions, `src/stripe/webhookHandler.ts`, `src/middleware/rateLimiter.ts` additions, Phase 3 sections of `src/server.ts`) found no TODO/FIXME/placeholder comments, no empty handlers, and no stub return values in the Phase 3 additions. All `return null` and `return []` instances found are in pre-Phase-3 business logic files unrelated to this phase.

---

### Human Verification Required

#### 1. Sentry E2E Dashboard Confirmation

**Test:** `curl -X POST https://bokun-bot-api.onrender.com/admin/sentry-test -H "x-admin-api-key: $ADMIN_API_KEY"`

**Expected:** Response `{"ok":true,"message":"Test error sent to Sentry..."}` AND the issue "Sentry E2E validation test — Phase 3" is visible in the Sentry Dashboard under Issues for the production project.

**Why human:** The Sentry SDK wiring in `src/server.ts` is verified (import at line 6, captureException at line 1339, flush at line 1342). The `/admin/sentry-test` route is verified (line 1632). However, whether the event actually reached the Sentry cloud service requires inspecting the external Sentry dashboard — this cannot be confirmed by static code analysis. The 03-03-SUMMARY.md records "Human verified Sentry E2E: test error 'Sentry E2E validation test — Phase 3' appeared in production Sentry dashboard — APPROVED" with completion at 2026-03-03T08:45:00Z, suggesting the human checkpoint was passed. If the operator who ran the phase can confirm this, the phase is complete.

---

### Gaps Summary

No blocking gaps found. All seven phase success criteria have passing automated evidence. The single human_needed item (Sentry E2E dashboard confirmation) has supporting documentation in 03-03-SUMMARY.md recording human approval, but cannot be re-confirmed by code inspection alone.

**Phase note on BILL-01, BILL-02, BILL-05:** These billing requirements appear in REQUIREMENTS.md under Phase 3 in the traceability table as "Pending" — they are correctly deferred. The Phase 3 goal explicitly stated "No billing UI — backend and observability foundations only." These requirements are out of scope for this phase and are not gaps.

---

_Verified: 2026-03-03T08:16:11Z_
_Verifier: Claude (gsd-verifier)_
