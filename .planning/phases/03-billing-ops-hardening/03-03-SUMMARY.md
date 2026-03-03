---
phase: 03-billing-ops-hardening
plan: "03"
subsystem: infra
tags: [sentry, stripe, observability, admin-endpoint, env-config]

# Dependency graph
requires:
  - phase: 03-02
    provides: Stripe webhook handler, serverWebhookLimiter, dead-letter write sites
provides:
  - POST /admin/sentry-test endpoint (admin-authenticated, Sentry E2E validation tool)
  - .env.example Stripe runbook with production webhook URL and test-vs-production secret distinction
  - Sentry proven end-to-end in production (event visible in Sentry dashboard)
affects: [04-dashboard, Phase 4 operators setting up production environment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin diagnostic endpoint pattern: admin-authenticated route that fires a Sentry.captureException + Sentry.flush(2000) for E2E health check"
    - "Sentry flush pattern: always await Sentry.flush(N) before responding from test/diagnostic endpoints to guarantee event delivery"

key-files:
  created: []
  modified:
    - src/server.ts
    - .env.example

key-decisions:
  - "Sentry test endpoint kept permanently (not ephemeral) — admin-authenticated and serves as runbook tool for future production health checks"

patterns-established:
  - "Sentry E2E validation pattern: POST /admin/sentry-test -> captureException -> flush(2000) -> structured log -> JSON response with instructions"
  - ".env.example runbook pattern: activated sections with step-by-step comments including Dashboard navigation path, endpoint URL, and critical distinctions (test vs production secrets)"

requirements-completed: [OBS-06a]

# Metrics
duration: ~10min (including human checkpoint)
completed: "2026-03-03"
---

# Phase 3 Plan 03: Sentry E2E Validation & Stripe Runbook Summary

**Admin-authenticated /admin/sentry-test endpoint added to server.ts for Sentry E2E validation, .env.example updated with full Stripe webhook runbook, and Sentry proven end-to-end in the production Sentry dashboard**

## Performance

- **Duration:** ~10 min (including human checkpoint for dashboard verification)
- **Started:** 2026-03-03T07:31:00Z
- **Completed:** 2026-03-03T08:45:00Z
- **Tasks:** 2 (1 automated + 1 human checkpoint)
- **Files modified:** 2

## Accomplishments
- Added POST /admin/sentry-test endpoint to server.ts — admin-key authenticated, fires Sentry.captureException + Sentry.flush(2000), returns JSON with verification instructions
- Updated .env.example Stripe section from placeholder to fully documented runbook: STRIPE_SECRET_KEY with "Restricted key" guidance, STRIPE_WEBHOOK_SECRET with test-vs-production distinction, production webhook URL (https://bokun-bot-api.onrender.com/stripe/webhook), and step-by-step Stripe Dashboard instructions
- Human verified Sentry E2E: test error "Sentry E2E validation test — Phase 3" appeared in production Sentry dashboard — APPROVED
- Phase 3 all success criteria confirmed: Stripe billing foundations (Plans 01+02), ops hardening (dead-letter, rate limiting), and Sentry validated end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Add /admin/sentry-test endpoint and update .env.example runbook** - `4a18e50` (feat)
2. **Task 2: Verify Sentry event visible in production Sentry dashboard** - Human checkpoint, no automated commit (approved)

**Plan metadata checkpoint commit:** `017c308` (chore: update STATE.md decision and ROADMAP at checkpoint)

## Files Created/Modified
- `src/server.ts` - Added handleAdminSentryTestRoute handler and /admin/sentry-test route wiring; added `import * as Sentry from "@sentry/node"` at top-level
- `.env.example` - Replaced Phase 3 Stripe placeholder section with fully documented runbook including STRIPE_SECRET_KEY guidance, STRIPE_WEBHOOK_SECRET test-vs-production distinction, production endpoint URL, and activation steps

## Decisions Made
- Sentry test endpoint kept permanently (not ephemeral) — admin-authenticated and serves as a runbook tool for future health checks. Operators can re-fire it any time to validate Sentry is wired after a redeploy or DSN change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The .env.example now contains full runbook documentation for activating Stripe webhooks in production:
1. Stripe Dashboard > Developers > Webhooks > + Add endpoint
2. Endpoint URL: https://bokun-bot-api.onrender.com/stripe/webhook
3. Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
4. Copy the Signing secret (whsec_...) — this is the PRODUCTION secret (different from CLI test mode secret)
5. Set STRIPE_WEBHOOK_SECRET in Render Dashboard > Environment

Note: render.yaml already contains STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as sync:false secrets (pre-verified at lines 65-67, added in Phase 2). No render.yaml changes needed.

## Phase 3 Complete - Next Phase Readiness

Phase 3 (Billing + Ops Hardening) is now complete. All success criteria met:
1. POST /stripe/webhook verifies Stripe-Signature — 403 on invalid signature (Plan 02)
2. Subscription state persists on all three lifecycle events (Plan 01+02)
3. Stripe event dedup via stripe_event_dedup table (Plan 01)
4. Sentry proven E2E — test event visible in production dashboard (this plan)
5. Failed webhook dead-letter in place for WhatsApp, Bokun, Stripe (Plan 02)
6. Rate limiting on Bokun and Stripe endpoints (Plan 02)
7. render.yaml has Stripe vars; .env.example has full runbook (Plans 01+02+this)

Phase 4 (Dashboard, Landing Page & Profile) is ready to begin. No blockers.

---
*Phase: 03-billing-ops-hardening*
*Completed: 2026-03-03*
