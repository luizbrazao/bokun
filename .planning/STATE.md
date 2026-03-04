---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-04T09:45:34Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 15
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure — install once via Bokun, configure channel, it works.
**Current focus:** Milestone v1.1 — Phase 4: Dashboard, Landing Page & Profile

## Current Position

Phase: 5 — Automated Test Coverage
Plan: 02 (COMPLETE — all plans complete)
Status: Phase 5 complete, all v1.1 milestone phases done
Last activity: 2026-03-04 — Phase 05-02 complete: subscription gating + 24 new tests, 50 total

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~2.5 min
- Total execution time: ~11 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-observability-hardening | 4 | ~11 min | ~2.8 min |
| 02-production-deployment | 2 | ~7 min | ~3.5 min |
| 03-billing-ops-hardening | 2 complete | ~6 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 02-01 (~2min), 02-02 (~5min), 03-01 (~2min), 03-02 (~4min)
- Trend: Stable

*Updated after each plan completion*
| Phase 01-observability-hardening P03 | 3 | 2 tasks | 4 files |
| Phase 01-observability-hardening P04 | 4 | 2 tasks | 6 files |
| Phase 02-production-deployment P01 | 1 | 2 tasks | 3 files |
| Phase 02-production-deployment P02 | 2 | 2 tasks | 0 files |
| Phase 03-billing-ops-hardening P01 | 2 | 2 tasks | 6 files |
| Phase 03-billing-ops-hardening P02 | 4 | 3 tasks | 5 files |
| Phase 03-billing-ops-hardening P03 | ~10min | 2 tasks | 2 files |
| Phase 04-dashboard-landing-profile P01 | 5 | 2 tasks | 7 files |
| Phase 04-dashboard-landing-profile P02 | 2min | 2 tasks | 3 files |
| Phase 04-dashboard-landing-profile P04 | 8 | 3 tasks | 10 files |
| Phase 05-automated-test-coverage P01 | ~4min | 3 tasks | 5 files |
| Phase 05-automated-test-coverage P02 | ~5min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 5-phase dependency chain (observability -> deploy -> billing -> dashboard -> gating+testing) based on research recommendation
- Roadmap: BILL-05 (subscription gating) placed in Phase 5 with testing, not Phase 3 with billing -- gating should only enforce after billing is confirmed working end-to-end
- 01-01: providerMessageId: msg.messageId (WhatsApp message ID from Meta webhook) included in per-message createRequestLogger bindings
- 01-01: Convex console.log calls intentionally untouched -- Convex runtime surfaces them in dashboard natively
- 01-01: webhookDebug/tgDebug helpers retained (gated on WHATSAPP_WEBHOOK_DEBUG=1) but delegate to rootLogger.debug
- 01-02: audit_log.meta stored as JSON string (not structured object) -- keeps schema flexible for varied event types without migrations
- 01-02: 90-day retention for conversation data, 365-day for audit_log -- supports full year of dashboard analytics
- 01-02: Monthly cron for audit log cleanup (lower frequency sufficient given 365-day retention)
- [Phase 01-observability-hardening]: 01-03: Bokun does not send a timestamp header; replay protection for Bokun webhooks relies solely on HMAC signature check -- accepted gap
- [Phase 01-observability-hardening]: 01-03: Sentry tracesSampleRate omitted -- errors-only, no performance tracing (cost control)
- [Phase 01-observability-hardening]: 01-03: REPLAY_TOLERANCE_MS = 5 minutes; returns HTTP 200 not 403 to prevent Meta/Bokun retry storms
- [Phase 01-observability-hardening]: 01-04: Health endpoint returns HTTP 200 always (even degraded) -- monitoring should treat non-200 as hard down, not dependency degradation
- [Phase 01-observability-hardening]: 01-04: booking_started deferred -- draft creation happens inside Convex mutation, not Node.js handler; out of scope without mutation refactor
- [Phase 01-observability-hardening]: 01-04: bot_toggled event type reserved in schema but no write site until Phase 4 (bot toggle UI)
- [Phase 02-production-deployment]: 02-01: sync:false only valid at service-level envVars; inside envVarGroups blocks Render silently drops them -- use per-service envVars for all secrets
- [Phase 02-production-deployment]: 02-01: preDeployCommand requires plan: starter (paid); Free tier silently skips it -- backend must use Starter
- [Phase 02-production-deployment]: 02-01: startCommand uses npm start (not raw node command) to preserve Sentry preload flag from package.json
- [Phase 02-production-deployment]: 02-01: Frankfurt region for both services -- primary users in Spain/EU, Frankfurt is closest Render EU region
- [Phase 02-production-deployment]: 02-01: Stripe placeholder vars included now in render.yaml and .env.example to avoid future IaC edits in Phase 3
- [Phase 02-production-deployment]: 02-01: WHATSAPP_APP_SECRET is canonical name; META_APP_SECRET documented as accepted alias
- [Phase 02-production-deployment]: 02-02: Checks 2+5 manual (require WHATSAPP_VERIFY_TOKEN and Convex Dashboard access); Checks 1/3/4 automated -- all passed confirming DEPLOY-04
- [Phase 03-billing-ops-hardening]: 03-01: stripe_event_dedup has no tenantId -- Stripe events arrive before tenant resolution, so we claim by global Stripe event ID
- [Phase 03-billing-ops-hardening]: 03-01: failed_webhooks stores payloadHash (SHA256) only, never raw body -- hard PII protection requirement for all three sources
- [Phase 03-billing-ops-hardening]: 03-01: cleanupFailedWebhooks uses 30-day retention vs 7-day for dedup records -- failed webhooks have operational debugging value beyond dedup period
- [Phase 03-billing-ops-hardening]: 03-01: stripeCurrentPeriodEnd stored as Unix timestamp in SECONDS (Stripe format) -- no conversion at storage layer
- [Phase 03-billing-ops-hardening]: 03-02: Lazy Stripe client singleton avoids throwing at module load time when STRIPE_SECRET_KEY absent -- key validated at request time
- [Phase 03-billing-ops-hardening]: 03-02: Stripe/Bokun webhook 429 on rate limit excess -- server-to-server callers handle 429 with backoff; unlike Meta/WhatsApp which must receive 200
- [Phase 03-billing-ops-hardening]: 03-02: Dead-letter writes are best-effort (.catch(() => {})) -- dead-letter failure must never mask original processing error
- [Phase 03-billing-ops-hardening]: 03-02: Two-tier rate limiting: inboundMessageLimiter (per-user, 10/min) vs serverWebhookLimiter (per-source, 300/min)
- [Phase 03-billing-ops-hardening]: 03-03: Sentry test endpoint kept permanently (not ephemeral) — admin-authenticated, serves as runbook tool for future health checks
- [Phase 04-dashboard-landing-profile]: Roadmap finalized 2026-03-03 — 4 plans defined; 04-01-PLAN.md is next
- [Phase 04-dashboard-landing-profile]: 04-01: Bot toggle calls existing updateTenantStatus mutation; FailedWebhooksPage created as stub for 04-02; failed_webhooks global ops table gated by requireTenantMembership but no tenantId column; router.ts bot-disable check uses tenants:getTenantById with same as-any pattern as handoff check
- [Phase 04-dashboard-landing-profile]: 04-02: Client-side pagination (50/page) for conversations avoids server query changes; date range filter uses updatedAt client-side; payloadHash shown as first 12 chars only per PII protection policy
- [Phase 04-dashboard-landing-profile]: 04-04: 7-day free trial in Stripe Checkout (trial_period_days: 7) per CONTEXT.md locked decision
- [Phase 04-dashboard-landing-profile]: 04-04: booking_drafts.lastOptionMap.tz changed from v.literal to v.string to support runtime tenant timezone
- [Phase 04-dashboard-landing-profile]: 04-04: FRONTEND_URL env var added for Checkout redirect; getTenantById (no auth) used in server-side handlers
- [Phase 05-automated-test-coverage]: 05-02: vi.hoisted() required when mock spy refs must be accessible inside vi.mock() factory — regular variable declarations are not available at hoist time
- [Phase 05-automated-test-coverage]: 05-02: Stripe mock must use regular function constructor (not arrow) so `new Stripe()` works in module singleton initialization
- [Phase 05-automated-test-coverage]: 05-02: isSubscriptionGated exported as named export for isolated unit testing without mocking full router dependencies
- [Phase 05-automated-test-coverage]: 05-02: vitest.config.ts include glob extended to convex/**/*.test.ts to support Convex-side unit tests

### Roadmap Evolution

- Phase 3 redefined: "Stripe Billing & Subscription Enforcement" → "Billing + Ops Hardening" (tighter scope: Stripe webhook foundations + ops hardening; full billing UI/enforcement moved to Phase 4)
- Phase 4 plans finalized 2026-03-03: 4 plans (04-01 frontend scaffolding+overview+bot toggle, 04-02 conversation log+booking list+failed webhooks UI, 04-03 landing page, 04-04 profile+settings+billing UI with Stripe Checkout)
- Phase 5 plans finalized 2026-03-03: 2 plans (05-01 booking state machine tests + cancellation flow, 05-02 tenant isolation tests + Stripe webhook unit tests + subscription gating)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 05-02-PLAN.md — subscription gating + full test suite. All v1.1 milestone phases complete.
Resume file: None
