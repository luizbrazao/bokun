---
phase: 01-observability-hardening
plan: 02
subsystem: database
tags: [convex, audit-log, cleanup, crons, schema, retention]

# Dependency graph
requires:
  - phase: none
    provides: n/a
provides:
  - audit_log Convex table with tenantId, event, waUserId, confirmationCode, bookingDraftId, meta, createdAt fields
  - insertAuditEvent internalMutation callable from any Convex function
  - cleanupConversationData internalMutation (90-day retention for conversations, booking_drafts, chat_messages)
  - cleanupAuditLog internalMutation (365-day retention for audit_log)
  - Daily cron at 03:30 UTC for conversation data cleanup
  - Monthly cron on day 1 at 04:00 UTC for audit log cleanup
  - by_createdAt indexes on conversations and booking_drafts tables
affects:
  - 04-dashboard (Phase 4 queries audit_log for analytics)
  - any Convex function emitting audit events (uses insertAuditEvent)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "internalMutation pattern for audit event insertion (insertAuditEvent)"
    - "Batch delete pattern with DELETE_BATCH_SIZE=500 for cleanup mutations"
    - "Separation of retention periods: 90 days for transient conversation data, 365 days for audit events"

key-files:
  created:
    - convex/auditLog.ts
  modified:
    - convex/schema.ts
    - convex/cleanup.ts
    - convex/crons.ts

key-decisions:
  - "audit_log.meta field is v.optional(v.string()) — JSON-stringified, no PII, no message content"
  - "90-day retention for conversations/booking_drafts/chat_messages prevents unbounded data growth in production"
  - "365-day retention for audit_log satisfies dashboard analytics needs over a year horizon"
  - "Monthly cron for audit log cleanup (vs daily for conversation data) — lower frequency sufficient given 365-day retention"

patterns-established:
  - "Cleanup mutations accept olderThanMs override arg for testability without changing constants"
  - "All cleanup mutations return { deleted, cutoff } for observability"

requirements-completed: [OBS-04, INFRA-07]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 1 Plan 02: Audit Log Infrastructure & 90-Day Data Retention Cleanup Summary

**Convex audit_log table with insertAuditEvent internalMutation plus 90-day conversation data cleanup and 365-day audit log retention crons**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T16:14:03Z
- **Completed:** 2026-03-01T16:15:41Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Added `audit_log` table to Convex schema with 3 indexes (by_tenantId, by_tenantId_event, by_createdAt) for efficient dashboard queries
- Added missing `by_createdAt` indexes to `conversations` and `booking_drafts` tables to enable efficient 90-day purge queries
- Created `convex/auditLog.ts` with `insertAuditEvent` internalMutation ready to be called from booking flows in Phase 1 Plan 03
- Extended `convex/cleanup.ts` with `cleanupConversationData` (90-day, batches of 500 across conversations/booking_drafts/chat_messages) and `cleanupAuditLog` (365-day)
- Extended `convex/crons.ts` with daily cleanup at 03:30 UTC and monthly audit log cleanup on day 1 at 04:00 UTC

## Task Commits

Each task was committed atomically:

1. **Task 1: Update convex/schema.ts with audit_log table and missing by_createdAt indexes** - `730d629` (feat)
2. **Task 2: Create convex/auditLog.ts and extend convex/cleanup.ts + crons.ts** - `a9db7e9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `convex/schema.ts` - Added by_createdAt indexes to conversations and booking_drafts; added audit_log table with 3 indexes
- `convex/auditLog.ts` - New file: insertAuditEvent internalMutation for durable audit event persistence
- `convex/cleanup.ts` - Extended with cleanupConversationData (90-day) and cleanupAuditLog (365-day) internalMutations
- `convex/crons.ts` - Extended with daily conversation cleanup cron (03:30 UTC) and monthly audit log cleanup cron

## Decisions Made

- `audit_log.meta` stored as JSON string (`v.string()`) not a structured object — keeps schema flexible for varied event types without schema migrations as new event metadata is added
- Cleanup mutations take an optional `olderThanMs` argument so tests can override the retention period without touching constants
- 90-day retention for conversation data (conversations, booking_drafts, chat_messages) is appropriate for operational data that has no compliance requirement
- 365-day retention for audit_log enables a full year of dashboard analytics for the Phase 4 dashboard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Changes are pure Convex schema + function additions. New indexes will be created automatically on next `convex deploy` or `npm run dev`.

## Next Phase Readiness

- `insertAuditEvent` is ready to be called from `convex/bookings.ts` (booking_confirmed/booking_failed events) and `convex/tenants.ts` (tenant_onboarded events) in subsequent plans
- Cleanup crons will prevent unbounded data growth once deployed to production
- Phase 4 dashboard can query `audit_log` via the `by_tenantId` and `by_tenantId_event` indexes

## Self-Check: PASSED

- FOUND: convex/schema.ts
- FOUND: convex/auditLog.ts
- FOUND: convex/cleanup.ts
- FOUND: convex/crons.ts
- FOUND commit: 730d629
- FOUND commit: a9db7e9

---
*Phase: 01-observability-hardening*
*Completed: 2026-03-01*
