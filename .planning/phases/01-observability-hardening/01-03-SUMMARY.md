---
phase: 01-observability-hardening
plan: 03
subsystem: infra
tags: [sentry, rate-limiting, replay-protection, error-tracking, webhooks]

# Dependency graph
requires:
  - phase: 01-observability-hardening/01-01
    provides: rootLogger and createRequestLogger used in rate limit and replay warn logs

provides:
  - Sentry error tracking with tenant/handler context (no PII) in src/lib/sentry.ts
  - Per-user inbound message rate limiter (10/60s) in src/middleware/rateLimiter.ts
  - WhatsApp webhook timestamp replay protection (5-minute tolerance, HTTP 200 silent skip)
  - Bokun webhook timestamp replay protection (checks x-bokun-timestamp or x-timestamp; gracefully skips if absent)
  - Top-level HTTP error capture via captureError in createAppServer try/catch

affects:
  - 01-deploy (start script now requires --import @sentry/node/preload)
  - All webhook handlers (rate limiting and replay protection gates now run before processWebhookWithDedup)

# Tech tracking
tech-stack:
  added:
    - "@sentry/node ^10.40.0 — error tracking, withScope pattern"
    - "rate-limiter-flexible ^9.1.1 — RateLimiterMemory-backed inbound limiter"
  patterns:
    - "Conditional Sentry init: initSentry() no-ops when SENTRY_DSN absent (dev-friendly)"
    - "Swappable RateLimiter interface: check(key) -> { allowed } — backing can be swapped without changing callers"
    - "Silent HTTP 200 on stale timestamps: never return 4xx to Meta or Bokun (retry storm prevention)"
    - "Graceful header absence: Bokun timestamp check skipped (not failed) when header absent"
    - "--import @sentry/node/preload before --experimental-strip-types in start script (ESM auto-instrumentation)"

key-files:
  created:
    - src/lib/sentry.ts
    - src/middleware/rateLimiter.ts
  modified:
    - src/server.ts
    - package.json

key-decisions:
  - "Bokun does not send a timestamp header (x-bokun-timestamp or x-timestamp absent); replay protection for Bokun webhooks relies solely on HMAC signature check — accepted gap, documented"
  - "Rate limiting is UX/backpressure guardrail only (not security control) — HMAC remains the security layer for both WhatsApp and Bokun"
  - "Sentry tracesSampleRate deliberately omitted — errors only, no performance tracing (cost control)"
  - "REPLAY_TOLERANCE_MS = 5 minutes — industry standard; returns HTTP 200 not 403 to prevent Meta/Bokun retry storms"
  - "Rate limit key prefix: wa:{phone} for WhatsApp, tg:{chatId} for Telegram — prevents cross-channel key collisions"

patterns-established:
  - "Error capture pattern: captureError(error, { tenantId, handler, messageId?, waUserId? }) — no PII in tags"
  - "Rate limit placement: check before processWebhookWithDedup, after tenant resolution and auth validation"
  - "Replay check placement: after rate limit check, before dedup claim"

requirements-completed: [OBS-02, INFRA-03, INFRA-06]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 1 Plan 3: Sentry Error Tracking, Rate Limiting, and Webhook Replay Protection Summary

**Sentry error capture with tenant context, per-user rate limiting (10/60s) via RateLimiterMemory, and 5-minute timestamp replay protection silently skipping stale webhooks from Meta and Bokun**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-01T16:19:59Z
- **Completed:** 2026-03-01T16:22:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/lib/sentry.ts` with conditional `initSentry()` (no-op without SENTRY_DSN) and `captureError()` helper that attaches tenantId, handler, messageId, waUserId tags without PII
- Created `src/middleware/rateLimiter.ts` with `RateLimiterMemory`-backed `inboundMessageLimiter` behind a swappable `RateLimiter` interface (10 messages/60s, configurable via env vars)
- Wired all three safeguards into `src/server.ts`: Sentry init at startup, rate limit check for both WhatsApp and Telegram messages, timestamp replay skip for WhatsApp (HTTP 200 + warn log), Bokun timestamp check (present: replay skip; absent: debug log + skip check gracefully), and top-level try/catch calling `captureError`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Sentry module and rate limiter module** - `4ad637c` (feat)
2. **Task 2: Wire Sentry, rate limiter, and timestamp checks into server.ts** - `8efc830` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/sentry.ts` - Sentry init (conditional on SENTRY_DSN) and captureError helper with scope tags
- `src/middleware/rateLimiter.ts` - RateLimiterMemory-backed inboundMessageLimiter with swappable RateLimiter interface
- `src/server.ts` - Added Sentry init, rate limit checks for WA+TG, timestamp replay protection for WA+Bokun, try/catch with captureError
- `package.json` - Added @sentry/node, rate-limiter-flexible dependencies; added start script with --import @sentry/node/preload

## Decisions Made

- **Sentry tracesSampleRate omitted**: errors-only tracking, no performance tracing — cost control decision
- **HTTP 200 on stale timestamps**: never return 4xx to Meta or Bokun; 4xx causes endless retry storms. Stale messages are silently skipped with warn-level log
- **Bokun timestamp gap accepted**: Bokun does not send a timestamp header (`x-bokun-timestamp` or `x-timestamp` are absent in actual requests). Replay protection for Bokun webhooks relies solely on HMAC signature verification. Documented as known gap
- **Rate limit as UX guardrail only**: 10 messages/60 seconds is intentionally conservative. HMAC remains the security layer; rate limiting is backpressure only
- **Key prefix strategy**: `wa:{phone}` for WhatsApp, `tg:{chatId}` for Telegram prevents cross-channel key collisions in the shared in-memory limiter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Gap: Bokun Webhook Replay Protection

Bokun does not guarantee sending a timestamp header. Inspecting the request headers for `x-bokun-timestamp` and `x-timestamp` — neither is present in actual Bokun webhook requests. The code checks both and gracefully skips the timestamp check (logging at debug level) when no header is found.

**Accepted gap:** Replay protection for Bokun webhooks relies solely on HMAC signature verification (`x-bokun-hmac` header validated via `validateBokunWebhookHmac`). This is sufficient security since a replayed request would still carry a valid HMAC — the timing protection is an additional layer that cannot be applied without a timestamp from Bokun.

## User Setup Required

To enable Sentry error tracking, add to environment:

```bash
SENTRY_DSN=https://...@sentry.io/...     # Required to enable Sentry
SENTRY_ENVIRONMENT=production            # Optional, defaults to "development"
```

Rate limiting is configurable via:

```bash
RATE_LIMIT_MAX=10                        # Max messages per window (default: 10)
RATE_LIMIT_WINDOW_MS=60000              # Window in milliseconds (default: 60000 = 60s)
```

## Next Phase Readiness

- Observability foundation complete: structured logging (01-01), audit log (01-02), and error tracking + rate limiting + replay protection (01-03) are all wired
- Server startup now uses `npm start` (with Sentry preload) for production deployments
- Ready for Phase 2: Deploy infrastructure

## Self-Check: PASSED

- FOUND: src/lib/sentry.ts
- FOUND: src/middleware/rateLimiter.ts
- FOUND: .planning/phases/01-observability-hardening/01-03-SUMMARY.md
- FOUND commit: 4ad637c (feat(01-03): add Sentry module and rate limiter module)
- FOUND commit: 8efc830 (feat(01-03): wire Sentry, rate limiter, and timestamp replay protection)

---
*Phase: 01-observability-hardening*
*Completed: 2026-03-01*
