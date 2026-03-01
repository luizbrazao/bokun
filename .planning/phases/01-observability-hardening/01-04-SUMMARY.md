---
phase: 01-observability-hardening
plan: 04
subsystem: infra
tags: [audit-log, health-check, convex, observability, booking-lifecycle, oauth]

# Dependency graph
requires:
  - phase: 01-observability-hardening/01-02
    provides: audit_log Convex table and insertAuditEvent internalMutation used in booking handlers and OAuth callback

provides:
  - Enriched GET /health endpoint with Convex connectivity check, version, and uptime fields
  - booking_confirmed audit event written in afterConfirm.ts after successful Bokun booking creation
  - booking_cancelled audit event written in afterConfirm.ts (user cancels at confirm step) and cancelBooking.ts (Bokun cancel succeeds)
  - booking_failed audit event written in cancelBooking.ts when Bokun cancel API call fails
  - tenant_onboarded audit event written in oauth/handler.ts after successful OAuth callback
  - INFRA-04 error handling: listTimes.ts and listPickupPlaces.ts now log + captureError on Bokun API failures
  - INFRA-01 and INFRA-02 compliance verified and documented (no code changes needed)

affects:
  - 04-dashboard (audit_log populated with booking_confirmed, booking_cancelled, booking_failed, tenant_onboarded — ready for dashboard queries)
  - 02-deploy (GET /health now requires Convex connectivity for full green status)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Audit event write sites: wrapped in try/catch — audit log failure never crashes booking handlers or OAuth flow"
    - "Health endpoint degradation: returns HTTP 200 with status=degraded when Convex unreachable (server up, dependency down)"
    - "Convex ping with 3s timeout via Promise.race — prevents health check from blocking on Convex latency"
    - "INFRA-04 pattern: Bokun API calls wrapped with rootLogger.error + captureError, then re-throw (listTimes) or user-facing fallback (listPickupPlaces)"

key-files:
  created: []
  modified:
    - src/server.ts
    - src/whatsapp/handlers/afterConfirm.ts
    - src/whatsapp/handlers/cancelBooking.ts
    - src/oauth/handler.ts
    - src/whatsapp/handlers/listTimes.ts
    - src/whatsapp/handlers/listPickupPlaces.ts

key-decisions:
  - "Health endpoint returns HTTP 200 always (even degraded) — monitoring infrastructure treats non-200 as down, so a 503 would trigger false alarms"
  - "booking_started deferred: draft creation happens inside Convex mutation (upsertBookingDraftBase), not in the Node.js handler — would require Convex mutation change, out of scope for this phase"
  - "bot_toggled event type reserved in schema (01-02) but has no write site in this phase — bot toggle feature deferred to Phase 4"
  - "listTimes.ts re-throws on Bokun API error (not user-facing fallback) — caller in orchestrateBooking.ts handles gracefully by returning handled: false to LLM agent"
  - "listPickupPlaces.ts returns user-facing fallback on Bokun API error — pickup failures are dead-ends for the user (no LLM fallback at that step)"

patterns-established:
  - "Audit write pattern: try { await convex.mutation('auditLog:insertAuditEvent' ...) } catch { rootLogger.warn('audit_log_write_failed') }"
  - "Health check pattern: Promise.race with 3s timeout, convex status ok|error, HTTP status ok|degraded"

requirements-completed: [OBS-03, INFRA-01, INFRA-02, INFRA-04]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 1 Plan 4: Health Endpoint Enrichment, Audit Events, and INFRA Compliance Summary

**Convex-backed /health endpoint with uptime and version, booking lifecycle audit events (confirmed/cancelled/failed/tenant_onboarded), and INFRA-01/02/04 compliance verified with Bokun API error handling added to listTimes and listPickupPlaces**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-01T16:25:05Z
- **Completed:** 2026-03-01T16:29:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced static `/health` endpoint with Convex ping check (3-second timeout via `Promise.race`), returning `{ status, version, uptime, convex }` — HTTP 200 always, `status: "degraded"` when Convex unreachable
- Wired audit events into booking lifecycle: `booking_confirmed` and `booking_cancelled` in `afterConfirm.ts`, `booking_cancelled` and `booking_failed` in `cancelBooking.ts` (also now properly logs the Bokun error instead of silently swallowing it)
- Added `tenant_onboarded` audit event in `oauth/handler.ts` after successful OAuth callback — all audit writes are fire-and-forget (swallowed on failure)
- Verified INFRA-01 (dedup) and INFRA-02 (tenantId isolation) — no code changes needed; documented findings
- Added INFRA-04 Bokun API error handling to `listTimes.ts` (log + captureError + re-throw) and `listPickupPlaces.ts` (log + captureError + user-facing fallback message)

## Task Commits

Each task was committed atomically:

1. **Task 1: Enrich /health endpoint and wire audit events into booking handlers** - `6449116` (feat)
2. **Task 2: Wire tenant_onboarded audit event and INFRA-04 error handling** - `e28c4d7` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/server.ts` - Replaced handleHealthRoute with Convex ping check; added SERVER_START_TIME and APP_VERSION constants
- `src/whatsapp/handlers/afterConfirm.ts` - Added booking_confirmed audit event on success, booking_cancelled on user cancel; imported rootLogger
- `src/whatsapp/handlers/cancelBooking.ts` - Added booking_cancelled and booking_failed audit events; added rootLogger.error for Bokun cancel failures; imported rootLogger
- `src/oauth/handler.ts` - Added tenant_onboarded audit event after successful tenant creation
- `src/whatsapp/handlers/listTimes.ts` - Wrapped Bokun API calls in try/catch with rootLogger.error + captureError + re-throw
- `src/whatsapp/handlers/listPickupPlaces.ts` - Wrapped Bokun API calls in try/catch with rootLogger.error + captureError + user-facing fallback

## Decisions Made

- **HTTP 200 always on health**: Even when Convex is unreachable, health endpoint returns 200 with `status: "degraded"`. This prevents monitoring from seeing 503 and triggering false alarms — the server is up, only a dependency is down.
- **booking_started deferred**: The new booking draft is created inside the `upsertBookingDraftBase` Convex mutation (called from `listTimes.ts`). Writing `booking_started` from Node.js would require an additional round-trip after the draft is created. Out of scope for this phase — see Known Gaps.
- **listTimes.ts re-throws on Bokun error**: The Bokun API call failure in `listTimes.ts` is re-thrown (not caught with user-facing message). The caller in `orchestrateBooking.ts` wraps `handleListTimes` in try/catch and returns `handled: false`, which falls through to the LLM agent. This is the correct behavior — the LLM can respond intelligently (e.g., "I couldn't check availability, please try again").
- **listPickupPlaces.ts returns user-facing fallback**: Unlike listTimes, pickup lookup happens in the middle of the booking state machine where there's no LLM fallback. A user-facing error message is necessary here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added INFRA-04 error handling to listPickupPlaces.ts**
- **Found during:** Task 2 (INFRA-04 scan)
- **Issue:** `listPickupPlaces.ts` calls two Bokun API endpoints (`bokunGetActivityByIdForTenant` and `bokunGetPickupPlacesForTenant`) without any try/catch. This handler is called from `afterSelectTime.ts`, which has no try/catch either. An unhandled error would propagate to `orchestrateBooking.ts` branches that also lack wrapping, causing an unhandled rejection.
- **Fix:** Added try/catch with `rootLogger.error`, `captureError`, and a user-facing Portuguese fallback message: "Erro ao consultar locais de pickup. Tente novamente em alguns instantes."
- **Files modified:** `src/whatsapp/handlers/listPickupPlaces.ts`
- **Committed in:** `e28c4d7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — Rule 2)
**Impact on plan:** Auto-fix necessary for correctness. listPickupPlaces.ts was a real INFRA-04 gap not covered by the plan's listed files. No scope creep.

## INFRA Compliance Findings

### INFRA-01: Webhook Deduplication (Idempotency) — VERIFIED
- **Mechanism:** `processWebhookWithDedup` calls `claimDedupPersisted` before any handler runs
- **Key scheme:** `wa:{messageId}` primary (from Meta payload), fallback `wa:hash:{SHA256(tenantId + waUserId + stableStringify(body))}`
- **Atomicity:** `dedup:claim` is a Convex mutation — Convex mutations run serially within a document; the claim pattern uses `db.query` then `db.insert` inside a single mutation, which is effectively atomic under Convex's optimistic concurrency
- **Result:** Duplicate webhooks are silently dropped with `duplicate: true` before any booking handlers run. No code changes needed.

### INFRA-02: tenantId Isolation — VERIFIED
- **Webhook routes:** `tenantId` is resolved from `phoneNumberId` via `resolveChannelByPhoneNumberId` (Convex query on `whatsapp_channels`). The caller never reads `tenantId` from the request body or URL params.
- **Handler flow:** `tenantId` is passed as a string from the resolved channel record into all handlers and Convex mutations.
- **Dashboard routes:** Phase 4 will enforce auth-session-derived `tenantId`. No dashboard routes exist yet.
- **Result:** No path exists where a caller can inject an arbitrary `tenantId` in the webhook flow. No code changes needed.

### INFRA-04: Bokun API Unavailability — VERIFIED + PARTIAL FIX
- `afterAskParticipants.ts`: has try/catch for questions fetch — logs error and falls through to confirm step. PASS.
- `afterConfirm.ts`: wraps `createBookingFromDraft` in try/catch — returns user-facing message. PASS.
- `cancelBooking.ts`: had try/catch but was silently swallowing the error. FIXED — now logs `bokun_cancel_failed`.
- `listTimes.ts`: no try/catch — FIXED. Now logs + captureError + re-throws for orchestrateBooking to handle.
- `listPickupPlaces.ts`: no try/catch — FIXED. Now logs + captureError + returns user-facing fallback.
- `selectTime.ts`: only calls Convex (no Bokun API). PASS.
- `selectPickupPlace.ts`: only calls Convex (no Bokun API). PASS.
- `afterSelectTime.ts`: delegates to selectTime (Convex) and listPickupPlaces (now guarded). PASS.

## Known Gaps

### booking_started: deferred to Phase 4 or future refactor
The `booking_started` event would fire when a user starts a new booking flow. In the current architecture, the booking draft is created inside the `bookingDrafts:upsertBookingDraftBase` Convex mutation (called from `listTimes.ts`). Writing a `booking_started` audit event from Node.js would require the mutation to return the draft ID, then make a second Convex mutation call — adding latency to the time-sensitive listing flow. This is deferred until the booking draft lifecycle is refactored.

### bot_toggled: schema reserved, write site deferred to Phase 4
The `bot_toggled` event type is reserved in the `audit_log` schema (defined in Plan 01-02 as one of the allowed event string values). There is no code anywhere in the codebase that writes a `bot_toggled` event. This is correct — the bot enable/disable toggle feature does not exist until Phase 4 (bot toggle UI in dashboard). No action needed in this phase.

## User Setup Required

None — no new external services or environment variables introduced in this plan.

## Next Phase Readiness

- Observability phase (01) complete: structured logging, audit log infrastructure, Sentry + rate limiting + replay protection, health endpoint, and booking lifecycle events are all wired
- Audit log now has 5 write sites: `booking_confirmed`, `booking_cancelled` (2 sites), `booking_failed`, `tenant_onboarded`
- `/health` endpoint ready for uptime monitoring (Render/Railway health check, load balancer probes)
- Phase 2 (Deploy) can proceed — all observability requirements are met

## Self-Check: PASSED

- FOUND: src/server.ts (modified — SERVER_START_TIME, APP_VERSION, enriched handleHealthRoute)
- FOUND: src/whatsapp/handlers/afterConfirm.ts (insertAuditEvent calls: 2)
- FOUND: src/whatsapp/handlers/cancelBooking.ts (insertAuditEvent calls: 2)
- FOUND: src/oauth/handler.ts (insertAuditEvent call: 1)
- FOUND: src/whatsapp/handlers/listTimes.ts (try/catch wrapping Bokun API calls)
- FOUND: src/whatsapp/handlers/listPickupPlaces.ts (try/catch wrapping Bokun API calls)
- FOUND commit: 6449116 (feat(01-04): enrich /health endpoint with Convex ping and wire audit events)
- FOUND commit: e28c4d7 (feat(01-04): wire tenant_onboarded audit event and INFRA-04 error handling)

---
*Phase: 01-observability-hardening*
*Completed: 2026-03-01*
