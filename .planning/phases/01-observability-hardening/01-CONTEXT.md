# Phase 1: Observability & Hardening - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing WhatsApp booking bot production-ready: structured logging, error tracking via Sentry, a health check endpoint, audit logging for key events, per-user rate limiting (anti-spam), and webhook replay protection. No new user-facing features — this phase hardens and instruments what's already built.

</domain>

<decisions>
## Implementation Decisions

### Structured Logging
- Library: **pino** (fastest JSON logger for Node.js, drop-in for console.log)
- Destination: **stdout/stderr only** — Render.com captures this natively
- Log levels: **error / warn / info / debug** — debug enabled via `LOG_LEVEL=debug` env var; production defaults to `info`
- Granularity: **entry + exit + errors** per WhatsApp message — log when message arrives (tenantId, messageId, waUserId) and when response is sent; log all errors always; do NOT log every handler step
- Every log line must include `tenantId` and `messageId` as structured JSON fields
- All existing `console.log` / `console.error` / `console.warn` calls must be replaced

### Rate Limiting
- **No per-tenant rate limit in v1** — each tenant bears their own LLM cost
- **Per end-user (phone number) throttle**: inbound WhatsApp messages only
  - When limit hit: send polite "Too many messages, please wait a moment" to the user and stop processing
  - State: **in-memory** (single Render.com instance assumption); structure must be easy to swap to Convex-backed limiter when scaling
  - Thresholds: configurable via env vars (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`); Claude sets conservative defaults
  - This is a **UX/backpressure guardrail**, not a security control
- **Internal backpressure**: if service is overloaded, return 200 to WhatsApp but defer/drop processing — no retry storms
- **Webhook replay protection**: reject webhook requests with timestamps outside a **5-minute tolerance window** (industry standard)
- Webhook idempotency (dedup table) remains the primary protection against duplicate deliveries

### Health Check & Audit Log
- `GET /health` checks: server up + Convex reachable (no Bokun/Meta checks — those are external)
- Response format: JSON `{ "status": "ok", "version": "1.0.0", "uptime": 3600, "convex": "ok" }` (or `"degraded"`/`"error"` states)
- **Audit log stored in a Convex table** (persistent, queryable, future dashboard access), with TTL
- Audit events to capture:
  - Booking confirmed
  - Booking cancelled
  - Booking started (draft created)
  - Tenant onboarded (OAuth complete)
  - Bot toggled on/off

### Sentry & Error Tracking
- **Errors only** — no performance traces in v1
- **Single Sentry project**, prod/dev environments differentiated by `SENTRY_ENVIRONMENT` tag
- Only initialized when `SENTRY_DSN` env var is set — dev works without any Sentry credentials
- Context to attach per error: Claude decides, but must include tenantId, messageId, waUserId, and handler/step name — no PII (no message content, no customer data)

### Claude's Discretion
- Conservative defaults for `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`
- Exact Sentry context fields (beyond tenantId, messageId, waUserId, handler name)
- Pino logger singleton setup and child logger pattern for request context
- Audit log table schema and TTL duration
- How to handle missing `messageId` in log context (e.g., health check, OAuth routes)

</decisions>

<specifics>
## Specific Ideas

- Rate limiter should be a clearly abstracted module so swapping from in-memory to Convex-backed is a config-level change, not a rewrite
- Timestamp tolerance for webhook replay: 5 minutes (same as Stripe/Twilio standard)
- Audit log must be queryable from dashboard in Phase 4 — schema should anticipate that use case

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-observability-hardening*
*Context gathered: 2026-03-01*
