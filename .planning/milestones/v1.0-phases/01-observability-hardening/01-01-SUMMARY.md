---
phase: 01-observability-hardening
plan: 01
subsystem: infra
tags: [pino, logging, structured-logging, observability]

# Dependency graph
requires: []
provides:
  - "Pino singleton rootLogger with isoTime timestamps and LOG_LEVEL env support"
  - "createRequestLogger factory for per-request child loggers with tenantId/channel/requestId/providerMessageId bindings"
  - "Zero console.log/error/warn calls in src/ — all replaced with structured pino equivalents"
affects: [02-error-tracking, 03-metrics, all-future-src-files]

# Tech tracking
tech-stack:
  added: ["pino ^10.3.1"]
  patterns:
    - "rootLogger.child(bindings) for per-request structured log context"
    - "createRequestLogger({ tenantId, channel, requestId, providerMessageId, event }) for WhatsApp per-message tracing"

key-files:
  created:
    - "src/lib/logger.ts"
  modified:
    - "src/server.ts"
    - "src/llm/agent.ts"
    - "src/llm/tools.ts"
    - "src/whatsapp/handlers/handoff.ts"
    - "src/whatsapp/handlers/afterAskParticipants.ts"

key-decisions:
  - "providerMessageId: msg.messageId (WhatsApp message ID from Meta webhook) included in per-message createRequestLogger bindings per locked plan decision"
  - "Convex console.log calls intentionally untouched — Convex runtime surfaces them in dashboard natively"
  - "webhookDebug/tgDebug helper functions retained (gated on WHATSAPP_WEBHOOK_DEBUG=1) but now delegate to rootLogger.debug instead of console.log"

patterns-established:
  - "All new src/ files must import from src/lib/logger.ts (rootLogger or createRequestLogger) — never use console.*"
  - "Per-message child logger pattern: createRequestLogger({ tenantId, channel, requestId, messageId, providerMessageId, event }) created after channel resolution"
  - "Error logging pattern: rootLogger.error({ handler, tenantId, waUserId, err: message }, 'event_name') with structured fields"

requirements-completed: [OBS-01, OBS-05]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 1 Plan 01: Pino Structured Logging Foundation Summary

**Pino v10 singleton with createRequestLogger factory installed; all 13 console calls in src/ replaced with structured JSON logs including tenantId, channel, and providerMessageId context**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T16:14:12Z
- **Completed:** 2026-03-01T16:17:06Z
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- Created `src/lib/logger.ts` with pino singleton (`rootLogger`) and `createRequestLogger` factory; bindings type includes `providerMessageId?: string`
- Replaced all 13 console.log/error/warn calls in `src/` with structured pino calls (server.ts x6, agent.ts x4, tools.ts x3, handoff.ts x1, afterAskParticipants.ts x1) — grep confirms zero remain
- server.ts per-message loop now creates a `createRequestLogger` child with `tenantId`, `channel: "wa"`, `requestId: randomUUID()`, `messageId`, `providerMessageId: msg.messageId`, and `event: "message_received"`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pino singleton in src/lib/logger.ts** - `751a988` (feat)
2. **Task 2: Replace all console calls in src/ with pino** - `3bff2e0` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/logger.ts` - Pino singleton (rootLogger) + createRequestLogger factory with providerMessageId? in bindings
- `src/server.ts` - Replaced webhookDebug/tgDebug console.log with rootLogger.debug; added per-message createRequestLogger with providerMessageId
- `src/llm/agent.ts` - Replaced 4 console calls with rootLogger.debug/error including tenantId/waUserId context
- `src/llm/tools.ts` - Replaced 3 console calls with rootLogger.info/error including handler/toolName context
- `src/whatsapp/handlers/handoff.ts` - Replaced console.error with rootLogger.error
- `src/whatsapp/handlers/afterAskParticipants.ts` - Replaced console.error with rootLogger.error
- `package.json` / `package-lock.json` - pino ^10.3.1 added to dependencies

## Decisions Made
- Used pino v10 (ESM-native, no additional transport needed for stdout JSON)
- `providerMessageId: msg.messageId` passed in per-message child logger — the WhatsApp message ID (wamid.xxx) doubles as both the dedup key and provider message ID at this stage; if an internal ID is distinguished later, update server.ts accordingly
- `randomUUID()` imported from `node:crypto` (already imported) rather than adding a separate import for `crypto.randomUUID()`
- Convex files intentionally not touched — Convex runtime exposes console.log in its own dashboard

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
Optional: set `LOG_LEVEL` environment variable to control log verbosity (default: `info`). Set `WHATSAPP_WEBHOOK_DEBUG=1` to enable debug-level webhook trace logs.

## Next Phase Readiness
- Pino foundation in place — all future `src/` code should use `rootLogger` or `createRequestLogger`
- Ready for Plan 02 (error tracking / Sentry integration) which can now attach structured context from pino fields
- The `providerMessageId` field in log bindings enables end-to-end message tracing once a log aggregation platform is connected

---
*Phase: 01-observability-hardening*
*Completed: 2026-03-01*

## Self-Check: PASSED

- src/lib/logger.ts: FOUND
- src/server.ts: FOUND
- src/llm/agent.ts: FOUND
- src/llm/tools.ts: FOUND
- src/whatsapp/handlers/handoff.ts: FOUND
- src/whatsapp/handlers/afterAskParticipants.ts: FOUND
- Commit 751a988: FOUND
- Commit 3bff2e0: FOUND
- console calls in src/: 0 (verified by grep)
- pino ^10.3.1 in package.json: FOUND
