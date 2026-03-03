---
phase: 03-billing-ops-hardening
plan: 01
subsystem: database
tags: [stripe, convex, webhooks, billing, dedup, cleanup, cron]

# Dependency graph
requires:
  - phase: 01-observability-hardening
    provides: audit_log table, cleanup patterns (internalMutation, DELETE_BATCH_SIZE, DEFAULT_RETENTION_MS), cron patterns
  - phase: 02-production-deployment
    provides: production Convex deployment (basic-squirrel-228) for schema migrations

provides:
  - Stripe subscription fields on tenants table (stripeCustomerId, stripeSubscriptionId, stripeStatus, stripeCurrentPeriodEnd)
  - stripe_event_dedup table with atomic claim semantics (no tenantId — events arrive before tenant resolution)
  - failed_webhooks dead-letter table for whatsapp/bokun/stripe failures (SHA256 hash only, no raw PII)
  - claimStripeEvent internalMutation (convex/stripeDedup.ts)
  - upsertTenantSubscription internalMutation (convex/subscriptions.ts)
  - recordFailedWebhook internalMutation (convex/failedWebhooks.ts)
  - cleanupFailedWebhooks (30-day retention) and cleanupStripeEventDedup (7-day retention) internalMutations
  - Daily crons: failed_webhooks cleanup (03:45 UTC), stripe_event_dedup cleanup (04:00 UTC)

affects:
  - 03-02 (server-side Stripe webhook handler — uses all mutations from this plan)
  - 04-dashboard (may query failed_webhooks and subscription status for admin UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - stripe_event_dedup uses no tenantId (Stripe events arrive before tenant resolution — contrast with webhook_dedup which requires tenantId)
    - failed_webhooks stores only SHA256 payloadHash — never raw payload (PII protection hard requirement)
    - 30-day retention for operational dead-letter records vs 7-day for dedup records (different value beyond TTL)
    - cleanupStripeEventDedup reuses DEFAULT_RETENTION_MS (7 days) from top of cleanup.ts — consistent with webhook_dedup

key-files:
  created:
    - convex/stripeDedup.ts
    - convex/subscriptions.ts
    - convex/failedWebhooks.ts
  modified:
    - convex/schema.ts
    - convex/cleanup.ts
    - convex/crons.ts

key-decisions:
  - "stripe_event_dedup has no tenantId — Stripe events arrive before tenant resolution, so we can only claim by Stripe event ID globally"
  - "failed_webhooks stores payloadHash (SHA256) only, never raw body — hard PII protection requirement applies to all three sources (whatsapp, bokun, stripe)"
  - "cleanupFailedWebhooks uses 30-day retention (vs 7-day for dedup) — failed webhooks have operational value for debugging and SLA review beyond dedup period"
  - "stripeCurrentPeriodEnd stored as Unix timestamp in SECONDS (Stripe format) — do not convert to milliseconds at storage layer, convert at display layer"

patterns-established:
  - "Stripe event idempotency: claimStripeEvent before any state mutation (mirrors webhook_dedup claim pattern)"
  - "Dead-letter storage: recordFailedWebhook with source enum + payloadHash + errorReason (no raw payload ever)"
  - "Cleanup pattern: each new table gets its own internalMutation + daily cron entry in crons.ts"

requirements-completed: [BILL-03, BILL-04, OBS-06a]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 03 Plan 01: Convex Data Layer for Stripe Billing and Ops Hardening Summary

**Stripe subscription state, atomic event dedup, and failed webhook dead-letter storage deployed to Convex with cleanup crons for both new tables**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T07:17:37Z
- **Completed:** 2026-03-03T07:19:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended tenants table with four Stripe subscription fields (stripeCustomerId, stripeSubscriptionId, stripeStatus, stripeCurrentPeriodEnd)
- Created stripe_event_dedup table with atomic claimStripeEvent internalMutation — prevents duplicate Stripe event processing
- Created failed_webhooks dead-letter table with recordFailedWebhook internalMutation — stores only SHA256 hashes (no PII)
- Added upsertTenantSubscription internalMutation for persisting subscription state from Stripe events
- Appended cleanupFailedWebhooks (30-day) and cleanupStripeEventDedup (7-day) to cleanup.ts
- Registered two daily cron jobs in crons.ts (03:45 UTC and 04:00 UTC) for TTL-based cleanup
- Deployed all changes to production Convex (basic-squirrel-228) with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend convex/schema.ts with Stripe and ops tables** - `2dbc4ec` (feat)
2. **Task 2: Create Convex mutations for Stripe dedup, subscription upsert, failed webhook recording, and cleanup** - `99fd06d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `convex/schema.ts` - Added stripeCustomerId/SubscriptionId/Status/CurrentPeriodEnd to tenants; added stripe_event_dedup table; added failed_webhooks table
- `convex/stripeDedup.ts` - New file: claimStripeEvent internalMutation (atomic, no tenantId)
- `convex/subscriptions.ts` - New file: upsertTenantSubscription internalMutation
- `convex/failedWebhooks.ts` - New file: recordFailedWebhook internalMutation (SHA256 hash only)
- `convex/cleanup.ts` - Appended cleanupFailedWebhooks and cleanupStripeEventDedup internalMutations
- `convex/crons.ts` - Added two daily cleanup crons for new tables

## Decisions Made
- `stripe_event_dedup` has no tenantId — Stripe events arrive before tenant resolution, so we can only claim by global Stripe event ID
- `failed_webhooks` stores payloadHash (SHA256) only, never raw body — hard PII protection requirement across all three sources
- `cleanupFailedWebhooks` uses 30-day retention (vs 7-day for dedup) — failed webhooks have operational value for debugging and SLA review
- `stripeCurrentPeriodEnd` stored in Unix timestamp SECONDS (Stripe format) — no conversion at storage layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `convex:deploy` npm script is interactive-only (prompts for prod confirmation). Used `npx convex deploy --yes` to bypass the prompt in non-interactive terminal. No functional impact.

## User Setup Required
None - no external service configuration required. Schema changes are additive (all new fields optional) and deployed to production Convex.

## Next Phase Readiness
- Convex data layer is fully deployed and ready for Plan 02 (Node.js Stripe webhook handler)
- claimStripeEvent, upsertTenantSubscription, and recordFailedWebhook can be called from server-side handlers via internal API
- No blockers

---
*Phase: 03-billing-ops-hardening*
*Completed: 2026-03-03*
