---
phase: 04-dashboard-landing-profile
plan: "01"
subsystem: ui
tags: [react, convex, dashboard, bot-toggle, sidebar]

# Dependency graph
requires:
  - phase: 03-billing-ops-hardening
    provides: failed_webhooks table + failedWebhooks.ts recordFailedWebhook mutation
provides:
  - getDashboardStats with messagesToday, bookingsThisWeek, botStatus fields
  - listFailedWebhooks + markWebhookRetried Convex functions
  - OverviewPage with 4-card DASH-01 top row + DASH-02 bot toggle switch
  - Sidebar Webhooks nav item + /webhooks route stub (FailedWebhooksPage)
  - router.ts bot-disabled check returning early when tenant.status === "disabled"
affects:
  - 04-02 (builds FailedWebhooksPage over the stub route and uses listFailedWebhooks/markWebhookRetried)
  - 04-04 (bot toggle UX already in place; profile settings page touches same tenant.status field)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bot toggle as useMutation + disabled loading state via useState"
    - "dashboardStats time-windowed counts via JS post-filter on index scan"
    - "Ops table (failed_webhooks) gated by requireTenantMembership despite having no tenantId column"

key-files:
  created:
    - frontend/src/pages/FailedWebhooksPage.tsx
  modified:
    - convex/dashboardStats.ts
    - convex/failedWebhooks.ts
    - frontend/src/pages/OverviewPage.tsx
    - frontend/src/components/layout/Sidebar.tsx
    - frontend/src/App.tsx
    - src/whatsapp/router.ts

key-decisions:
  - "Bot toggle calls existing updateTenantStatus mutation; no new mutation needed"
  - "FailedWebhooksPage created as stub (Em breve...) to be replaced in 04-02"
  - "Webhooks nav item uses AlertTriangle icon, positioned between Conversas and Atendimento"
  - "router.ts bot-disable check uses tenants:getTenantById with `as any` cast — same pattern as existing handoff check"

patterns-established:
  - "Bot toggle pattern: useMutation + useState(isToggling) + disabled attr during inflight call"
  - "Dashboard primary/secondary metric split: operational metrics top row, aggregated insights below"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 4 Plan 01: Dashboard Overview + Bot Toggle Summary

**Dashboard DASH-01 top row (messages today, bookings this week, bot status badge, WhatsApp connection) + DASH-02 bot on/off toggle backed by updateTenantStatus mutation, with router.ts early-return when bot is disabled**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-03T14:30:00Z
- **Completed:** 2026-03-03T14:37:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended getDashboardStats to return messagesToday, bookingsThisWeek, and botStatus alongside existing fields
- Added listFailedWebhooks (query) and markWebhookRetried (mutation) to failedWebhooks.ts, both gated by requireTenantMembership
- Redesigned OverviewPage with a 4-card primary metrics row (DASH-01) and an on/off toggle switch for the bot (DASH-02)
- Added Webhooks nav item to Sidebar and wired a stub FailedWebhooksPage to /webhooks in App.tsx for 04-02 to fill
- Added bot-enabled check at top of routeWhatsAppMessage — returns a disabled message immediately when tenant.status is "disabled"

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend dashboardStats query + add listFailedWebhooks/markWebhookRetried** - `5abf22d` (feat)
2. **Task 2: Revise OverviewPage + Sidebar + App.tsx + router.ts** - `ce37e02` (feat)

## Files Created/Modified
- `convex/dashboardStats.ts` - Added messagesToday, bookingsThisWeek, botStatus to getDashboardStats return
- `convex/failedWebhooks.ts` - Added listFailedWebhooks query + markWebhookRetried mutation
- `frontend/src/pages/OverviewPage.tsx` - Redesigned with 4-card primary row + bot toggle
- `frontend/src/components/layout/Sidebar.tsx` - Added Webhooks nav item (AlertTriangle icon)
- `frontend/src/App.tsx` - Added /webhooks route pointing to FailedWebhooksPage
- `frontend/src/pages/FailedWebhooksPage.tsx` - Minimal stub for 04-02
- `src/whatsapp/router.ts` - Bot-disabled early-return check using tenants:getTenantById

## Decisions Made
- Bot toggle calls the existing `updateTenantStatus` mutation — no new mutation required
- FailedWebhooksPage is a minimal stub ("Em breve...") to be fully implemented in 04-02
- failed_webhooks table has no tenantId column (global ops table), so listFailedWebhooks returns all records; access is still gated by requireTenantMembership
- router.ts cast uses `as any` for the Convex query string — same pattern already used by the handoff check in the same file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 04-02 can immediately build FailedWebhooksPage using listFailedWebhooks and markWebhookRetried which are already wired
- Bot toggle is functional end-to-end; router.ts respects the disabled state immediately
- Sidebar Webhooks link navigates to /webhooks without 404

---
*Phase: 04-dashboard-landing-profile*
*Completed: 2026-03-03*

## Self-Check: PASSED

All files found and both task commits (5abf22d, ce37e02) verified in git history.
