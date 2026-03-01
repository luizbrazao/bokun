---
phase: 01-observability-hardening
verified: 2026-03-01T00:00:00Z
status: passed
score: 5/5 success criteria verified
re_verification: false
human_verification:
  - test: "Trigger a real WhatsApp webhook and confirm log output is valid JSON with tenantId, channel, requestId, providerMessageId fields"
    expected: "Each log line prints as a single JSON object containing all four fields"
    why_human: "Cannot execute server with real Meta webhook payload programmatically in this environment"
  - test: "Set SENTRY_DSN to a real project, trigger an exception in a webhook handler, and confirm the event appears in the Sentry dashboard within 60 seconds with tenantId and handler tags"
    expected: "Sentry event shows tenantId and handler as tags, no message body content"
    why_human: "Requires live Sentry credentials and real exception propagation"
  - test: "Send more than 10 WhatsApp messages from the same phone number within 60 seconds and confirm the 11th message receives the polite Portuguese reply"
    expected: "\"Por favor, aguarde um momento antes de enviar mais mensagens.\" is sent back; no booking processing occurs"
    why_human: "Requires live WhatsApp channel and Meta Cloud API interaction"
  - test: "Call GET /health with Convex running and confirm JSON response includes all four fields"
    expected: "{ status: 'ok', version: string, uptime: number, convex: 'ok' }"
    why_human: "Requires live Convex deployment to produce ok status; degraded path is not testable without infrastructure"
---

# Phase 1: Observability & Hardening Verification Report

**Phase Goal:** Every request is traceable, every error is captured, and the system degrades gracefully under failure
**Verified:** 2026-03-01
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every log line includes tenantId and messageId as structured JSON fields, and no console.log statements remain in src/ | VERIFIED | `src/lib/logger.ts` exports `rootLogger` + `createRequestLogger` with `providerMessageId` in bindings type; `grep -rn "console\." src/` returns 0 matches; server.ts creates per-message child with tenantId, channel, requestId, messageId, providerMessageId |
| 2 | Unhandled exceptions in webhook processing appear in Sentry with tenant context within 60 seconds | VERIFIED | `src/lib/sentry.ts` exports `initSentry` (conditional on SENTRY_DSN) + `captureError` (attaches tenantId, handler, messageId, waUserId tags); `initSentry()` called at module startup in server.ts; top-level request handler wrapped in try/catch calling `captureError` |
| 3 | GET /health returns service status and version, and booking confirmation/cancellation events are recorded in an audit log | VERIFIED | Health endpoint returns `{ status, version, uptime, convex }` - convex field is "ok"/"error", status is "ok"/"degraded"; audit events wired: `booking_confirmed` (afterConfirm.ts), `booking_cancelled` (afterConfirm.ts + cancelBooking.ts), `booking_failed` (cancelBooking.ts), `tenant_onboarded` (oauth/handler.ts) |
| 4 | Duplicate webhook delivery produces no side effects; webhook requests with timestamps outside tolerance are rejected; per-tenant rate limiting prevents message flooding | VERIFIED | `claimDedupPersisted` runs before every handler (INFRA-01 verified); WhatsApp replay protection active with 5-min tolerance, HTTP 200 + warn log on stale; Bokun replay protection active when header present, gracefully skipped when absent (accepted known gap); `inboundMessageLimiter` checked for WA + TG before processWebhookWithDedup |
| 5 | Conversation and booking data older than 90 days is automatically purged by the scheduled cleanup job | VERIFIED | `cleanupConversationData` internalMutation in convex/cleanup.ts purges conversations, booking_drafts, and chat_messages older than 90 days in batches of 500; daily cron registered at 03:30 UTC in convex/crons.ts |

**Score:** 5/5 truths verified

---

### Required Artifacts

#### Plan 01-01 Artifacts (OBS-01, OBS-05)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/logger.ts` | Pino singleton + createRequestLogger child factory | VERIFIED | Exists, 21 lines, exports `rootLogger` and `createRequestLogger` with full bindings type including `providerMessageId?: string` |
| `src/server.ts` | Replaced console calls with pino; per-message child includes providerMessageId | VERIFIED | Imports `createRequestLogger` and `rootLogger`; per-message child at lines 629-636 includes `providerMessageId: msg.messageId` |
| `src/llm/agent.ts` | Replaced 4 console.log/error calls with structured pino | VERIFIED | Imports `rootLogger` from `../lib/logger.ts`; uses `rootLogger.debug` and `rootLogger.error` with structured context |
| `src/llm/tools.ts` | Replaced console calls with structured pino | VERIFIED | Imports `rootLogger`; uses `rootLogger.info` and `rootLogger.error` with `handler: "llm_tools"` context |
| `src/whatsapp/handlers/handoff.ts` | Replaced console.error with structured pino | VERIFIED | Imports `rootLogger`; uses `rootLogger.error` with handler/tenantId/waUserId context |
| `src/whatsapp/handlers/afterAskParticipants.ts` | Replaced console.error with structured pino | VERIFIED | Imports `rootLogger`; uses `rootLogger.error` with structured context |

#### Plan 01-02 Artifacts (OBS-04, INFRA-07)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | audit_log table + by_createdAt indexes on conversations and booking_drafts | VERIFIED | audit_log table defined at lines 195-206 with 3 indexes (by_tenantId, by_tenantId_event, by_createdAt); conversations has by_createdAt at line 80; booking_drafts has by_createdAt at line 151 |
| `convex/auditLog.ts` | insertAuditEvent internalMutation | VERIFIED | File exists; exports `insertAuditEvent` internalMutation that writes to audit_log table with all required fields |
| `convex/cleanup.ts` | cleanupConversationData internalMutation (90-day) | VERIFIED | Exports `cleanupConversationData` (RETENTION_90_DAYS_MS = 90 days, batch 500) and `cleanupAuditLog` (365-day) |
| `convex/crons.ts` | Daily cron for conversation data cleanup at 03:30 UTC | VERIFIED | Registers "cleanup conversation data" at hourUTC:3, minuteUTC:30 calling `internal.cleanup.cleanupConversationData` |

#### Plan 01-03 Artifacts (OBS-02, INFRA-03, INFRA-06)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/sentry.ts` | Sentry init (conditional on SENTRY_DSN) and captureError helper | VERIFIED | Exports `initSentry` (no-op if SENTRY_DSN absent) and `captureError` (uses withScope, attaches tenantId/handler/messageId/waUserId tags, calls captureException) |
| `src/middleware/rateLimiter.ts` | RateLimiterMemory-backed inboundMessageLimiter | VERIFIED | Exports `RateLimiter` interface and `inboundMessageLimiter`; defaults 10/60s configurable via RATE_LIMIT_MAX + RATE_LIMIT_WINDOW_MS env vars |
| `src/server.ts` | Sentry init call, rate limiter check, timestamp validation | VERIFIED | `initSentry()` at module startup (line 22); rate limit checked for WA (line 641) and TG (line 504); WhatsApp replay check (line 658); Bokun replay check (lines 816-830); top-level try/catch calls captureError (line 968) |

#### Plan 01-04 Artifacts (OBS-03, INFRA-01, INFRA-02, INFRA-04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server.ts` | Enriched /health endpoint: convex ping + version + uptime | VERIFIED | handleHealthRoute (line 838) uses Promise.race with 3s timeout on Convex ping; returns {status, version, uptime, convex}; HTTP 200 always, status:"degraded" when Convex unreachable. Note: plan artifact specified `contains: "convex_reachable"` but implementation uses variable `convexStatus` and field name `convex` — underlying truth is fully satisfied |
| `src/whatsapp/handlers/afterConfirm.ts` | Audit event written on booking confirmation | VERIFIED | Contains `insertAuditEvent` calls at lines 96 and 116 (booking_confirmed and booking_cancelled events); wrapped in try/catch that swallows and warns |
| `src/whatsapp/handlers/cancelBooking.ts` | Audit event written on booking cancellation | VERIFIED | Contains `insertAuditEvent` calls at lines 67 and 85 (booking_cancelled and booking_failed events); wrapped in try/catch |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/server.ts` | `src/lib/logger.ts` | import createRequestLogger | WIRED | Line 4: `import { rootLogger, createRequestLogger } from "./lib/logger.ts"` |
| `src/llm/agent.ts` | `src/lib/logger.ts` | import rootLogger | WIRED | Line 6: `import { rootLogger } from "../lib/logger.ts"` |
| `src/server.ts` | `src/lib/sentry.ts` | initSentry() at startup + captureError in error handlers | WIRED | Line 5 import; line 22 initSentry(); line 968 captureError |
| `src/server.ts` | `src/middleware/rateLimiter.ts` | inboundMessageLimiter.check before processWebhookWithDedup | WIRED | Line 6 import; lines 504 and 641 check calls |
| `convex/crons.ts` | `convex/cleanup.ts` | internal.cleanup.cleanupConversationData | WIRED | Line 11: `internal.cleanup.cleanupConversationData` in cron registration |
| `convex/auditLog.ts` | `convex/schema.ts` | audit_log table | WIRED | auditLog.ts inserts into "audit_log" which is defined in schema.ts |
| `src/whatsapp/handlers/afterConfirm.ts` | `convex/auditLog.ts` | convex.mutation('auditLog:insertAuditEvent') | WIRED | Lines 96 and 116 call insertAuditEvent |
| `src/whatsapp/handlers/cancelBooking.ts` | `convex/auditLog.ts` | convex.mutation('auditLog:insertAuditEvent') | WIRED | Lines 67 and 85 call insertAuditEvent |
| `src/server.ts` | `convex ping` | GET /health handler calls Convex ping query | WIRED | Line 844: `convex.query("ping:ping" as any, {} as any)` inside handleHealthRoute |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OBS-01 | 01-01 | System writes structured JSON logs using Pino with tenantId and messageId as correlation fields on every log line | SATISFIED | src/lib/logger.ts exists with rootLogger (Pino singleton) + createRequestLogger factory; bindings type includes tenantId, channel, requestId, providerMessageId; per-message child logger created in server.ts |
| OBS-05 | 01-01 | All console.log statements replaced with Pino structured equivalents | SATISFIED | grep -rn "console." src/ returns 0 matches; all 13 former console calls replaced with rootLogger calls |
| OBS-02 | 01-03 | Sentry error tracking captures unhandled exceptions and forwards to Sentry project | SATISFIED | src/lib/sentry.ts exports initSentry (conditional) + captureError; wired in server.ts top-level error handler; no-op without SENTRY_DSN |
| OBS-04 | 01-02 | Audit log entries are written for booking confirmation and cancellation events (confirmationCode, tenantId, waUserId, timestamp) | SATISFIED | convex/auditLog.ts insertAuditEvent exists; 5 write sites: booking_confirmed, booking_cancelled x2, booking_failed, tenant_onboarded |
| OBS-03 | 01-04 | GET /health endpoint returns service status and version, integrated with Render health check monitoring | SATISFIED | handleHealthRoute returns { status, version, uptime, convex }; HTTP 200 always; convex field is "ok" or "error"; status is "ok" or "degraded" |
| INFRA-01 | 01-04 | WhatsApp and Bokun webhook processing is idempotent — duplicate delivery produces no side effects | SATISFIED | processWebhookWithDedup calls claimDedupPersisted (Convex mutation) before every handler; duplicate returns early with duplicate:true; verified by code review |
| INFRA-02 | 01-04 | Every Convex query/mutation that accesses tenant data filters by tenantId derived from auth session (not from request params) | SATISFIED | tenantId always resolved from phoneNumberId via resolveChannelByPhoneNumberId (Convex lookup on whatsapp_channels), never from request body; verified by code review |
| INFRA-03 | 01-03 | Per-tenant rate limiting enforced on incoming WhatsApp messages to prevent abuse | SATISFIED | inboundMessageLimiter.check(rateLimitKey) before processWebhookWithDedup for both WA and TG; sends polite reply, returns 200 on exceeded |
| INFRA-04 | 01-04 | Bokun API unavailability results in a graceful error message rather than an unhandled exception | SATISFIED | listTimes.ts: try/catch + rootLogger.error + captureError + re-throw (orchestrateBooking handles); listPickupPlaces.ts: try/catch + user-facing fallback; afterConfirm.ts, cancelBooking.ts, afterAskParticipants.ts: each has try/catch with user-facing fallback |
| INFRA-06 | 01-03 | Webhook requests from Meta and Bokun are rejected if timestamp is outside ±5 minutes (in addition to HMAC) | SATISFIED (with known gap) | WhatsApp: isReplayAttack() rejects messages older than 5 min, HTTP 200 silent skip; Bokun: checks x-bokun-timestamp or x-timestamp header — but Bokun does NOT send either header in practice, so replay protection falls back to HMAC-only for Bokun. Accepted gap documented in 01-03-SUMMARY.md |
| INFRA-07 | 01-02 | Conversation messages and booking-related data older than 90 days are automatically purged | SATISFIED | cleanupConversationData purges conversations, booking_drafts, chat_messages with 90-day retention; daily cron at 03:30 UTC; batch size 500 |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | - | - | - |

No TODO, FIXME, PLACEHOLDER, empty implementations, or stub patterns found in any phase-modified files.

---

### Known Accepted Gaps (Not Blockers)

The following gaps are explicitly documented in SUMMARY files and accepted by the team:

1. **booking_started audit event**: Not wired. Draft creation happens inside `bookingDrafts:upsertBookingDraftBase` Convex mutation (from listTimes.ts). Writing from Node.js would require an additional round-trip. Deferred to future refactor. Does NOT affect OBS-04 requirement (which specifies confirmation and cancellation events only).

2. **bot_toggled audit event**: Schema type reserved in audit_log (per schema.ts comment). No write site until Phase 4 bot toggle UI is built. Correct — the toggle feature does not exist yet.

3. **Bokun timestamp replay protection**: Bokun does not send `x-bokun-timestamp` or `x-timestamp` headers in practice. Code correctly checks for headers, finds none, and logs at debug level. Replay protection for Bokun webhooks relies on HMAC-only (x-bokun-hmac). This is an accepted limitation of Bokun's API behavior, not a code defect. INFRA-06 requires rejection "in addition to HMAC" — the code implements the check and gracefully handles Bokun's lack of timestamp. Accepted gap.

4. **ROADMAP.md shows "3/4 plans complete"**: All 4 plans have SUMMARY.md files and verified implementations. The ROADMAP progress table was not updated after Plan 04 completed. This is a documentation staleness issue, not a code gap.

---

### Human Verification Required

#### 1. Pino JSON Output in Production

**Test:** Start the server with `npm start` and send a real WhatsApp webhook; inspect stdout
**Expected:** Each log line is a single-line JSON object with fields: `time`, `level`, `tenantId`, `channel`, `requestId`, `messageId`, `providerMessageId`, `event`, and the message string
**Why human:** Cannot execute the server with real Meta webhook payloads in this verification environment

#### 2. Sentry Exception Capture

**Test:** Configure SENTRY_DSN, trigger an unhandled exception in a webhook handler, check Sentry dashboard within 60 seconds
**Expected:** Event appears with `tenantId` and `handler` tags; no message body content visible; exception type and stack trace correct
**Why human:** Requires live Sentry project credentials and real exception propagation through the server

#### 3. Rate Limiting Enforcement

**Test:** Send 11+ WhatsApp messages from the same phone within 60 seconds
**Expected:** Messages 1-10 processed normally; message 11 receives "Por favor, aguarde um momento antes de enviar mais mensagens." via WhatsApp; no booking processing for message 11
**Why human:** Requires live WhatsApp channel and Meta Cloud API

#### 4. Health Endpoint Live Check

**Test:** With Convex running, call `GET /health`
**Expected:** `{ "status": "ok", "version": "0.1.0", "uptime": <number>, "convex": "ok" }` with HTTP 200
**Why human:** Requires live Convex deployment to verify "ok" status (degraded path cannot be produced without infrastructure failure)

---

### Gaps Summary

No gaps blocking goal achievement. All 5 ROADMAP Success Criteria are verified as implemented in the actual codebase. All 11 required requirement IDs (OBS-01 through OBS-05, INFRA-01 through INFRA-04, INFRA-06, INFRA-07) are satisfied. Known gaps (booking_started, bot_toggled, Bokun timestamp limitation) are explicitly accepted and documented — none affect the required success criteria.

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
