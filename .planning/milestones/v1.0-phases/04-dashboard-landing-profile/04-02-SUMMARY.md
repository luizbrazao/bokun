---
phase: "04-dashboard-landing-profile"
plan: "02"
subsystem: "frontend-dashboard"
tags: [dashboard, failed-webhooks, conversations, bookings, filtering, pagination]
dependency_graph:
  requires: ["04-01"]
  provides: ["FailedWebhooksPage", "ConversationsPage-date-filter", "BookingsPage-DASH04-verified"]
  affects: ["frontend/src/pages/"]
tech_stack:
  added: []
  patterns: ["client-side-filtering", "client-side-pagination", "convex-useMutation", "convex-useQuery"]
key_files:
  created: []
  modified:
    - frontend/src/pages/FailedWebhooksPage.tsx
    - frontend/src/pages/ConversationsPage.tsx
    - frontend/src/pages/BookingsPage.tsx
decisions:
  - "Client-side pagination (50/page) for conversations — avoids server query changes; data volume manageable"
  - "Retry button disabled for both retried AND resolved statuses — resolved means manual fix, retried means already attempted"
  - "dateFrom/dateTo state reset to '' (empty string) via Limpar button — page also resets to 0 on filter change"
  - "payloadHash displayed as first 12 chars + '...' — security: never expose full hash or raw payload per 03-01 decision"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 3
---

# Phase 04 Plan 02: Dashboard Data Pages (Failed Webhooks, Conversations Filter, Bookings Verify) Summary

**One-liner:** Full FailedWebhooksPage with color-coded source badges, retry buttons, and per-row status; ConversationsPage enhanced with date range filter (dateFrom/dateTo) and 50-per-page client-side pagination.

## What Was Built

### Task 1: FailedWebhooksPage (replacing 04-01 stub)

Replaced the 7-line stub with a 150-line full implementation:

- Table columns: Tipo (source badge), Data/Hora (pt-BR datetime), Motivo do erro (truncated to 60 chars), Hash (first 12 chars + "..."), Tentativas (retryCount), Status badge, Ações (Retry button)
- Source badge color coding: WhatsApp = green, Bokun = blue, Stripe = purple
- Status badge: "failed" = red/destructive, "retried" = yellow, "resolved" = green
- Per-row Retry button calls `markWebhookRetried` mutation; disabled when status is "retried" or "resolved"
- Skeleton loading state (5 rows) while data loads
- Empty state: "Nenhum webhook com falha registrado."
- Admin note at top: "Esta página é visível apenas para administradores. Os registros mostram as últimas 50 falhas."
- Satisfies OBS-06b

### Task 2: ConversationsPage date range filter + pagination (DASH-03)

Enhanced existing page with:

- `dateFrom` and `dateTo` state variables with `<Input type="date">` controls
- Labels "De:" and "Até:" above each date input
- "Limpar" button (visible only when at least one date is set) resets both date filters
- Filter pipeline: waUserId text search → date range → paginate
- Date filter logic: `updatedAt < new Date(dateFrom).getTime()` and `updatedAt > new Date(dateTo + "T23:59:59").getTime()`
- Client-side pagination: `PAGE_SIZE = 50`, prev/next buttons shown when `totalPages > 1`
- `page` state resets to 0 on any filter change
- `flex-wrap gap-3 items-end` layout for responsive control row
- Existing waUserId search preserved — satisfies DASH-03 "text search" requirement
- DASH-03 fully satisfied: text search + date range + pagination

### Task 2 (continued): BookingsPage DASH-04 verification

Added JSDoc comment confirming all DASH-04 required columns are present:
- `bokunConfirmationCode` (Código) ✓
- `status` (Status) ✓
- `waUserId` (Cliente) ✓
- `date` (Data) ✓

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- DASH-03: Conversations page has text search by waUserId + date range filter (dateFrom/dateTo) + pagination at 50 per page. Message-body search explicitly out of scope. PASSED.
- DASH-04: Bookings page shows confirmation code, status, customer phone, activity date. PASSED (already present; verified and documented).
- OBS-06b: Failed webhooks page shows failed_webhooks records with per-row manual retry capability. PASSED.

## Self-Check: PASSED

Files verified to exist:
- frontend/src/pages/FailedWebhooksPage.tsx — FOUND (150 lines, min 80)
- frontend/src/pages/ConversationsPage.tsx — FOUND (contains dateFrom state)
- frontend/src/pages/BookingsPage.tsx — FOUND (contains DASH-04 comment)

Commits verified:
- 7f2ded9: feat(04-02): build full FailedWebhooksPage replacing 04-01 stub
- 3adc39a: feat(04-02): add date range filter + pagination to ConversationsPage; verify BookingsPage DASH-04 columns
