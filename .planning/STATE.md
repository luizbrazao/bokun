---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-03T07:19:36Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 9
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure -- install once via Bokun, configure channel, it works.
**Current focus:** Phase 3: Billing + Ops Hardening

## Current Position

Phase: 3 of 5 (Billing + Ops Hardening) -- IN PROGRESS
Plan: 1 of 3 in current phase (03-01 complete)
Status: Phase 3 Plan 1 complete (Convex data layer: Stripe schema + dedup + failed webhooks + cleanup crons deployed)
Last activity: 2026-03-03 -- Completed 03-01 (schema extended, 3 mutation files created, cleanup+crons updated, deployed to prod)

Progress: [██████░░░░] 57%

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
| 03-billing-ops-hardening | 1 (in progress) | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-04 (~4min), 02-01 (~2min), 02-02 (~5min), 03-01 (~2min)
- Trend: Stable

*Updated after each plan completion*
| Phase 01-observability-hardening P03 | 3 | 2 tasks | 4 files |
| Phase 01-observability-hardening P04 | 4 | 2 tasks | 6 files |
| Phase 02-production-deployment P01 | 1 | 2 tasks | 3 files |
| Phase 02-production-deployment P02 | 2 | 2 tasks | 0 files |
| Phase 03-billing-ops-hardening P01 | 2 | 2 tasks | 6 files |

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

### Roadmap Evolution

- Phase 3 redefined: "Stripe Billing & Subscription Enforcement" → "Billing + Ops Hardening" (tighter scope: Stripe webhook foundations + ops hardening; full billing UI/enforcement moved to Phase 4)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 03-01-PLAN.md (Convex data layer: Stripe schema + claimStripeEvent + upsertTenantSubscription + recordFailedWebhook + cleanup crons deployed)
Resume file: None
