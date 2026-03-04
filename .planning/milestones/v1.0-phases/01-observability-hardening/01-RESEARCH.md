# Phase 1: Observability & Hardening - Research

**Researched:** 2026-03-01
**Domain:** Structured logging (pino), error tracking (Sentry), rate limiting, webhook replay protection, Convex audit/cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Structured Logging**
- Library: **pino** (fastest JSON logger for Node.js, drop-in for console.log)
- Destination: **stdout/stderr only** — Render.com captures this natively
- Log levels: **error / warn / info / debug** — debug enabled via `LOG_LEVEL=debug` env var; production defaults to `info`
- Granularity: **entry + exit + errors** per WhatsApp message — log when message arrives (tenantId, messageId, waUserId) and when response is sent; log all errors always; do NOT log every handler step
- Every log line must include: `tenantId`, `channel`, `requestId`, `correlationId`, and `event` (event name) as structured JSON fields
- `providerMessageId` must be included when available
- All existing `console.log` / `console.error` / `console.warn` calls must be replaced

**Rate Limiting**
- **No per-tenant rate limit in v1** — each tenant bears their own LLM cost
- **Per end-user (phone number) throttle**: inbound WhatsApp messages only
  - When limit hit: send polite "Too many messages, please wait a moment" to the user and stop processing
  - State: **in-memory** (single Render.com instance assumption); structure must be easy to swap to Convex-backed limiter when scaling
  - Thresholds: configurable via env vars (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`); Claude sets conservative defaults
  - This is a **UX/backpressure guardrail only** — not a security control; must not be documented or used as one
- **Internal backpressure**: if service is overloaded, return 200 to WhatsApp but defer/drop processing — no retry storms
- **Webhook replay protection**: reject webhook requests with timestamps outside a **5-minute tolerance window** (industry standard)
- Webhook idempotency (dedup table) remains the primary protection against duplicate deliveries

**Health Check & Audit Log**
- `GET /health` checks: server up + Convex reachable (no Bokun/Meta checks — those are external)
- Response format: JSON `{ "status": "ok", "version": "1.0.0", "uptime": 3600, "convex": "ok" }` (or `"degraded"`/`"error"` states)
- **Audit log stored in a Convex table** (persistent, queryable, future dashboard access), with TTL
- Audit events to capture:
  - Booking confirmed
  - Booking cancelled
  - Booking started (draft created)
  - Tenant onboarded (OAuth complete)
  - Bot toggled on/off
  - Booking failed

**Sentry & Error Tracking**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OBS-01 | System writes structured JSON logs using Pino with tenantId and messageId as correlation fields on every log line | Pino v10 child logger pattern: create request-scoped child with `logger.child({ tenantId, messageId, channel })` |
| OBS-02 | Sentry error tracking captures unhandled exceptions and forwards to Sentry project | @sentry/node v10 `Sentry.init()` + `Sentry.withScope()` for per-error context |
| OBS-03 | GET /health endpoint returns service status and version, integrated with Render health check monitoring | Health route already exists in server.ts — needs enrichment with Convex ping + version + uptime |
| OBS-04 | Audit log entries are written for booking confirmation and cancellation events | New `audit_log` Convex table + `internalMutation` called from booking handlers |
| OBS-05 | All console.log statements replaced with Pino structured equivalents | 13 occurrences across 5 files: server.ts, llm/agent.ts, llm/tools.ts, whatsapp/handlers/handoff.ts, whatsapp/handlers/afterAskParticipants.ts |
| INFRA-01 | WhatsApp and Bokun webhook processing is idempotent — duplicate delivery produces no side effects | Existing dedup table is the mechanism — research confirms pattern is correct, needs verification test |
| INFRA-02 | Every Convex query/mutation that accesses tenant data filters by tenantId from auth session | Auth-derived tenantId pattern — gap analysis needed on existing Convex functions |
| INFRA-03 | Per-tenant rate limiting enforced on incoming WhatsApp messages | rate-limiter-flexible v9 RateLimiterMemory — in-memory, swappable |
| INFRA-04 | Bokun API unavailability results in graceful error message (not unhandled exception) | Error boundary pattern in booking flow — wrap Bokun calls in try/catch with user-facing fallback |
| INFRA-06 | Webhook requests from Meta and Bokun rejected if timestamp outside ±5 minute window | Timestamp extraction from Meta webhook payload + Math.abs(Date.now() - ts) > 300_000 check |
| INFRA-07 | Conversation and booking data older than 90 days automatically purged via Convex cron | New `internalMutation` for conversations + booking_drafts + chat_messages, registered in crons.ts |
</phase_requirements>

---

## Summary

This phase hardens the existing WhatsApp Bokun bot for production without adding new user-facing features. The work falls into five technical domains: (1) replacing all `console.log` calls with a pino structured logging singleton using child loggers for request context, (2) integrating `@sentry/node` for error-only capture with tenant context and no PII, (3) enriching the existing `/health` endpoint and adding a Convex-backed audit log, (4) adding per-user in-memory rate limiting with webhook replay protection (timestamp tolerance), and (5) extending the Convex cleanup cron to purge conversation/booking data older than 90 days.

The project is a pure ES Module TypeScript project (`"type": "module"`, `--experimental-strip-types`). This has specific implications for both pino (works natively with ESM imports) and Sentry (requires `--import @sentry/node/preload` startup flag or an `instrument.mjs` pattern). The existing codebase already has: HMAC validation for both WhatsApp and Bokun webhooks, a dedup table with atomic claim, and a partial health endpoint. The main gaps are structured logging, Sentry, rate limiting, timestamp replay protection, an audit table, and extended TTL cleanup.

**Primary recommendation:** Implement in order: (1) pino singleton + replace console.log, (2) Sentry init module, (3) rate limiter module, (4) webhook timestamp validation, (5) health endpoint enrichment, (6) audit log table + mutation, (7) cron extension for 90-day purge.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | ^10.3.1 | Structured JSON logging to stdout | Fastest Node.js JSON logger; built-in TypeScript types; child logger pattern for per-request context |
| @sentry/node | ^10.40.0 | Error capture and forwarding to Sentry | Industry standard; supports ESM via `--import` preload; errors-only mode (omit tracesSampleRate) |
| rate-limiter-flexible | ^9.1.1 | In-memory per-user rate limiting | No dependencies; RateLimiterMemory is swappable to Redis/Convex backend; typed; points-based API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino | built-in `pino.stdTimeFunctions.isoTime` | ISO timestamp in logs | Always — Render.com log viewer handles ISO timestamps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pino | winston | pino is 5x faster; native JSON; less config; locked in CONTEXT.md |
| rate-limiter-flexible | hand-rolled Map+setTimeout | Missing atomicity, expiry edge cases, TypeScript types; library is minimal with zero production deps |
| Sentry | Datadog / Rollbar | Sentry is locked in CONTEXT.md; free tier sufficient for v1 |

**Installation:**
```bash
npm install pino @sentry/node rate-limiter-flexible
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── logger.ts          # pino singleton + child factory
│   └── sentry.ts          # Sentry init (conditional on SENTRY_DSN)
├── middleware/
│   └── rateLimiter.ts     # RateLimiterMemory module with abstraction interface
convex/
├── auditLog.ts            # audit_log table mutations
├── cleanup.ts             # Extended with 90-day purge for conversations/drafts
└── crons.ts               # Extended with new cleanup jobs
```

### Pattern 1: Pino Singleton with Child Logger Per Request

**What:** Create a single root pino logger in `src/lib/logger.ts`. For each incoming request, derive a child logger bound to `{ tenantId, channel, requestId }`. Pass the child logger (or create further children) for message-scoped logging.

**When to use:** Always — every function that logs anything receives a child logger as a parameter or creates one from the singleton.

**Example:**
```typescript
// src/lib/logger.ts
// Source: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
import pino from "pino";

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default rootLogger;

export function createRequestLogger(bindings: {
  tenantId: string;
  channel: string;
  requestId: string;
  correlationId?: string;
  messageId?: string;
}) {
  return rootLogger.child(bindings);
}
```

```typescript
// Usage in server.ts (per-message processing)
// Source: pino docs — logger.child(bindings) merges bindings onto every log line
const reqLog = createRequestLogger({
  tenantId: channel.tenantId,
  channel: "wa",
  requestId: crypto.randomUUID(),
  messageId: msg.messageId,
  event: "message_received",
});
reqLog.info({ waUserId: msg.from }, "message_received");
// → {"level":30,"time":"2026-03-01T...","tenantId":"...","channel":"wa","requestId":"...","messageId":"...","event":"message_received","waUserId":"...","msg":"message_received"}
```

**Handling missing messageId:** For routes without a message (health, OAuth), omit `messageId` from the child bindings — pino silently omits undefined fields. Use `requestId` (UUID) as correlation ID.

### Pattern 2: Sentry — Errors Only, ESM Init

**What:** Initialize Sentry once at process startup via `--import` flag. Only capture errors, no tracing. Only active when `SENTRY_DSN` is set.

**When to use:** Wrap all top-level error handlers in server.ts with `Sentry.captureException`. Use `Sentry.withScope` to attach per-error context without polluting the global scope.

**Example:**
```typescript
// src/lib/sentry.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/node/install/esm/
import * as Sentry from "@sentry/node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // Dev mode — no Sentry credentials needed
  }
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    // Deliberately omit tracesSampleRate — errors only, no performance tracing
  });
}

export function captureWithContext(
  error: unknown,
  context: {
    tenantId: string;
    messageId?: string;
    waUserId?: string;
    handler: string;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("tenantId", context.tenantId);
    scope.setTag("handler", context.handler);
    if (context.messageId) scope.setTag("messageId", context.messageId);
    // waUserId is NOT PII in this context (it's a WhatsApp phone number ID)
    if (context.waUserId) scope.setTag("waUserId", context.waUserId);
    Sentry.captureException(error);
  });
}
```

**ESM startup (server.ts entry point):**
```bash
# package.json scripts (add --import flag)
"start": "node --import @sentry/node/preload --experimental-strip-types src/server.ts"
```
Note: `--import @sentry/node/preload` must come before `--experimental-strip-types`. Requires Node >= 18.19.0 (project already uses Node 18+).

### Pattern 3: In-Memory Rate Limiter (Swappable Interface)

**What:** Wrap `RateLimiterMemory` behind an interface so swapping to Convex or Redis backend later is a config change, not a rewrite.

**When to use:** Apply at the WhatsApp webhook handler level, before `processWebhookWithDedup`, keyed by `waUserId`.

**Example:**
```typescript
// src/middleware/rateLimiter.ts
// Source: https://github.com/animir/node-rate-limiter-flexible/wiki/Memory
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; msBeforeNext?: number }>;
}

const MAX = Number(process.env.RATE_LIMIT_MAX ?? "10");
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");

const limiter = new RateLimiterMemory({
  points: MAX,
  duration: Math.ceil(WINDOW_MS / 1000), // duration in seconds
});

export const inboundMessageLimiter: RateLimiter = {
  async check(key: string) {
    try {
      await limiter.consume(key);
      return { allowed: true };
    } catch (res) {
      const rejection = res as RateLimiterRes;
      return { allowed: false, msBeforeNext: rejection.msBeforeNext };
    }
  },
};
```

**Conservative defaults:** 10 messages per 60 seconds per phone number. This prevents message spam while being lenient enough for legitimate multi-message bookings. Adjust via env vars.

### Pattern 4: Webhook Timestamp Replay Protection

**What:** Extract `timestamp` from webhook payload, compare with `Date.now()`, reject if delta > 5 minutes. Applied in server.ts before processing.

**When to use:** For WhatsApp webhooks (Meta format includes timestamp in message object) and Bokun webhooks.

**Example:**
```typescript
// Source: https://webhooks.fyi/security/replay-prevention (Stripe standard, 5 min tolerance)
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

function isTimestampWithinTolerance(timestampSeconds: number): boolean {
  const delta = Math.abs(Date.now() - timestampSeconds * 1000);
  return delta <= REPLAY_TOLERANCE_MS;
}

// Meta webhook payload: messages[0].timestamp is Unix seconds
// Bokun webhooks: check x-bokun-timestamp header if present
```

**Important caveat:** WhatsApp Meta webhooks do not guarantee real-time delivery — the `timestamp` field in the message payload is the *send* time, not delivery time. The tolerance check prevents old replays but should not be overly strict. 5 minutes covers network delays; the HMAC remains the primary security control.

### Pattern 5: Audit Log in Convex

**What:** A new `audit_log` Convex table with `internalMutation` for insert. Called from booking handlers at key lifecycle moments.

**When to use:** After booking confirmed, cancelled, started; after OAuth completes; on error paths.

**Schema design (anticipating Phase 4 dashboard):**
```typescript
// convex/schema.ts — add to defineSchema
audit_log: defineTable({
  tenantId: v.id("tenants"),
  event: v.string(),               // "booking_confirmed" | "booking_cancelled" | "booking_started" | "booking_failed" | "tenant_onboarded" | "bot_toggled"
  waUserId: v.optional(v.string()),
  confirmationCode: v.optional(v.string()),
  bookingDraftId: v.optional(v.id("booking_drafts")),
  meta: v.optional(v.string()),    // JSON-stringified additional context (no PII)
  createdAt: v.number(),
})
  .index("by_tenantId", ["tenantId"])
  .index("by_tenantId_event", ["tenantId", "event"])
  .index("by_createdAt", ["createdAt"]),
```

```typescript
// convex/auditLog.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertAuditEvent = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    event: v.string(),
    waUserId: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
    bookingDraftId: v.optional(v.id("booking_drafts")),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_log", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

**TTL recommendation:** 1 year (365 days). Audit logs are compliance-adjacent data — keep longer than conversation data (90 days). Cleanup cron runs monthly.

### Pattern 6: Extended Convex Cleanup Cron (90-Day Purge)

**What:** Extend `convex/cleanup.ts` with mutations to purge `conversations`, `booking_drafts`, and `chat_messages` older than 90 days. Register additional crons in `convex/crons.ts`.

**Example:**
```typescript
// convex/cleanup.ts (addition)
// Source: https://docs.convex.dev/scheduling/cron-jobs
const RETENTION_90_DAYS_MS = 90 * 24 * 60 * 60_000;

export const cleanupConversationData = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? RETENTION_90_DAYS_MS);
    // query by_createdAt index, delete in batches of 500
    // Repeat for conversations, booking_drafts, chat_messages tables
  },
});
```

```typescript
// convex/crons.ts (extension)
crons.daily(
  "cleanup conversation data",
  { hourUTC: 3, minuteUTC: 30 },
  internal.cleanup.cleanupConversationData,
  {}
);
```

**Batching is required:** Convex mutations have a 1MB document write limit per transaction. Always use `.take(500)` batches and avoid `.collect()` on large tables.

### Anti-Patterns to Avoid

- **Global pino instance without child loggers:** Each log call would be missing request context. Always create a child per request.
- **Calling `Sentry.setTag()` globally:** Tags set globally apply to all subsequent events. Use `withScope` for per-error tags.
- **Rate limiter keyed by IP:** This project doesn't have IPs (WebSocket/WebhookProxy), and Meta Cloud API sends from multiple IPs. Always key by `waUserId` (phone number).
- **Calling `console.log` in Convex functions:** Convex has its own logging — `console.log` in Convex mutations/queries is fine and separate from the pino logger. Only replace `console.log` in `src/` (Node.js server code), not `convex/`.
- **Timestamp-only replay protection without HMAC:** Never treat timestamp validation as a security control — it's a backpressure/UX safeguard. HMAC remains the security layer.
- **Using `.collect()` in cleanup mutations:** Can hit Convex memory limits on large tables. Always use `.take(N)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-user rate limiting with expiry | Map<phone, {count, resetAt}> in module scope | `rate-limiter-flexible` RateLimiterMemory | setTimeout expiry races, no atomic increment, no TypeScript types, no backend swap path |
| JSON structured logging with levels | Custom JSON.stringify wrapper | `pino` | Level filtering, child bindings, serializers, performance (5x faster than alternatives) |
| Sentry context management | Global variables for error context | `Sentry.withScope()` | Scope isolation across concurrent requests, correct cleanup |
| Timestamp tolerance check | Complex date parsing | Simple `Math.abs(Date.now() - ts * 1000) > tolerance` | It's literally 2 lines — no library needed, but don't complicate it |

**Key insight:** The rate limiter is the only case where a library is essential. Pino and Sentry provide their own abstractions. The timestamp check is trivial enough to inline.

---

## Common Pitfalls

### Pitfall 1: Sentry ESM Preload Order

**What goes wrong:** Sentry's auto-instrumentation does not wrap modules that were imported before `Sentry.init()` is called.

**Why it happens:** ESM imports are hoisted and evaluated before module body code runs. A top-level `import * as Sentry from "@sentry/node"; Sentry.init()` does NOT guarantee Sentry runs before http/node:http module is loaded.

**How to avoid:** Use `--import @sentry/node/preload` as a Node.js startup flag. This runs before any user code. Then call `Sentry.init()` in the first lines of `src/server.ts`. Only initialize when `SENTRY_DSN` is set.

**Warning signs:** Errors captured without automatic stack enhancement, or http request spans missing entirely.

### Pitfall 2: Pino Child Logger in Async Context

**What goes wrong:** Creating one child logger per module (as a module-level constant) instead of per-request. All concurrent requests share the same child, and their `tenantId`/`messageId` bindings overwrite each other.

**Why it happens:** Developers import the root logger and call `.child()` once at module load time.

**How to avoid:** Create child loggers inside request handlers, not at module level. Each handler invocation gets its own `logger.child({ tenantId, messageId, requestId })`.

**Warning signs:** Logs showing wrong tenantId for certain messages during high-concurrency testing.

### Pitfall 3: Rate Limiter Key Collision

**What goes wrong:** Keying the rate limiter by `waUserId` without channel prefix. If Telegram and WhatsApp users happen to share a numeric ID, they'd be throttled together.

**Why it happens:** The project has both WhatsApp (`from` field) and Telegram (`tg:${chatId}`) users sharing the same `waUserId` field.

**How to avoid:** Key the limiter with a channel prefix: `wa:${waUserId}` or `tg:${waUserId}`. The `waUserId` for Telegram is already prefixed with `tg:` in the codebase — just use it directly.

### Pitfall 4: Convex Cleanup Mutation Timeout

**What goes wrong:** Cleanup mutation tries to delete all 90-day-old records in one transaction, hits Convex's document limit, and times out.

**Why it happens:** `.collect()` fetches all matching documents into memory, then deletes them. At scale, this exceeds limits.

**How to avoid:** Always use `.take(DELETE_BATCH_SIZE)` (max 500) and let the next cron run clean the next batch. Schedule cron frequently enough (daily) that batches don't fall behind.

**Warning signs:** Cleanup mutation throwing `Error: Too many documents` or timing out in Convex dashboard.

### Pitfall 5: WhatsApp Timestamp Extraction

**What goes wrong:** The WhatsApp webhook payload timestamp is nested inside `entry[].changes[].value.messages[0].timestamp`, not at the top level. Missing it means the replay check never fires.

**Why it happens:** The Meta Cloud API webhook format is deeply nested. The existing `extractMessageId` function already navigates this structure — timestamp extraction should follow the same pattern.

**How to avoid:** Extract timestamp from the parsed Meta webhook message object (already done in `parseMetaWebhook.ts`) rather than from the raw body. The `timestamp` field is a Unix epoch in **seconds**, not milliseconds — multiply by 1000 before comparing to `Date.now()`.

### Pitfall 6: console.log in Convex Files

**What goes wrong:** Developer replaces all `console.log` occurrences including those in `convex/` directory, causing Convex function behavior changes.

**Why it happens:** Grep-based replacement is global across the project.

**How to avoid:** Only replace `console.log` calls in `src/` (Node.js server code). The `convex/` directory runs in the Convex runtime where `console.log` is the correct logging mechanism (it appears in the Convex dashboard).

**Files to update (13 occurrences in 5 files):**
- `src/server.ts` — 4 console.log (webhookDebug, tgDebug functions)
- `src/llm/agent.ts` — 4 console.log/error
- `src/llm/tools.ts` — 3 console.log/error
- `src/whatsapp/handlers/handoff.ts` — 1 console.error
- `src/whatsapp/handlers/afterAskParticipants.ts` — 1 console.error

---

## Code Examples

Verified patterns from official sources:

### Pino Singleton (src/lib/logger.ts)
```typescript
// Source: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
import pino from "pino";

export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(bindings: {
  tenantId: string;
  channel: string;
  requestId: string;
  correlationId?: string;
  messageId?: string;
  event?: string;
}) {
  return rootLogger.child(bindings);
}
```

### Sentry Init with Conditional DSN
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/node/install/esm/
import * as Sentry from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn?.trim()) return; // Dev mode — no credentials needed
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    // No tracesSampleRate — errors only per locked decision
  });
}

export function captureError(
  error: unknown,
  ctx: { tenantId: string; handler: string; messageId?: string; waUserId?: string }
): void {
  Sentry.withScope((scope) => {
    // Source: https://docs.sentry.io/platforms/javascript/guides/node/enriching-events/scopes/
    scope.setTag("tenantId", ctx.tenantId);
    scope.setTag("handler", ctx.handler);
    if (ctx.messageId) scope.setTag("messageId", ctx.messageId);
    if (ctx.waUserId) scope.setTag("waUserId", ctx.waUserId);
    Sentry.captureException(error);
  });
}
```

### RateLimiterMemory Consume Pattern
```typescript
// Source: https://github.com/animir/node-rate-limiter-flexible/wiki/Memory
import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({
  points: Number(process.env.RATE_LIMIT_MAX ?? "10"),
  duration: Math.ceil(Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000") / 1000),
});

export async function checkRateLimit(key: string): Promise<{ allowed: boolean }> {
  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch {
    return { allowed: false };
  }
}
```

### Timestamp Replay Protection (inline in server.ts)
```typescript
// Source: https://webhooks.fyi/security/replay-prevention
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

function isReplayAttack(timestampSeconds: number | undefined): boolean {
  if (!timestampSeconds) return false; // No timestamp present — don't reject
  const delta = Math.abs(Date.now() - timestampSeconds * 1000);
  return delta > REPLAY_TOLERANCE_MS;
}
```

### Convex Cleanup Batch Pattern
```typescript
// Source: https://docs.convex.dev/scheduling/cron-jobs
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const DELETE_BATCH_SIZE = 500;
const RETENTION_90_DAYS_MS = 90 * 24 * 60 * 60_000;

export const cleanupConversationData = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? RETENTION_90_DAYS_MS);
    const stale = await ctx.db
      .query("conversations")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(DELETE_BATCH_SIZE);
    for (const row of stale) await ctx.db.delete(row._id);
    return { deleted: stale.length };
  },
});
```

**Note:** The `conversations` table currently lacks a `by_createdAt` index. It will need to be added to `schema.ts` alongside the cleanup mutation. Same for `chat_messages` (already has `by_createdAt`) and `booking_drafts` (needs it added).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `console.log` for debugging | pino structured JSON to stdout | Industry standard 2020+ | Machine-parseable, log level filtering, zero overhead when disabled |
| Sentry v7 `configureScope()` | Sentry v8+ `withScope()` callback | Sentry SDK v8 (2024) | Scope changes are automatically cleaned up after callback |
| Sentry `tracesSampleRate: 1.0` default | Omit entirely for errors-only | Sentry v8+ supports omitting | No OpenTelemetry overhead, simpler setup |
| express-rate-limit (Express only) | rate-limiter-flexible (framework agnostic) | Ongoing | Works with raw Node.js http server (this project has no Express) |
| Sentry CJS `require()` | ESM `--import @sentry/node/preload` | Sentry v8 (Node 18.19+) | Required for proper ESM auto-instrumentation wrapping |

**Deprecated/outdated:**
- `Sentry.configureScope()`: deprecated in v7, removed in v8 — use `withScope()` instead
- `Sentry.getCurrentHub()`: deprecated in v8 — use `Sentry.getClient()` or `withScope()`
- pino v8 and below: current is v10.3.1 — use v10 for latest TypeScript types and ESM support

---

## Open Questions

1. **`conversations` table missing `by_createdAt` index**
   - What we know: The cleanup cron needs `by_createdAt` index on `conversations` and `booking_drafts` to efficiently query old records without a full table scan.
   - What's unclear: Whether adding this index will trigger Convex to rebuild existing data (it will, but it's a non-breaking migration).
   - Recommendation: Add the index in schema.ts as part of the cleanup task. Convex handles index backfills automatically on deploy.

2. **WhatsApp timestamp field location in Meta payload**
   - What we know: Meta Cloud API includes `timestamp` in `entry[].changes[].value.messages[0].timestamp` as Unix seconds. The `parseMetaWebhook.ts` already extracts messages — need to verify it also returns `timestamp`.
   - What's unclear: Whether the timestamp is present on all message types or only text messages.
   - Recommendation: Add `timestamp` to the `ParsedMessage` type in `parseMetaWebhook.ts`; default to `undefined` if missing. The replay check should gracefully skip if timestamp is absent.

3. **`booking_drafts` table `by_createdAt` index**
   - What we know: The 90-day cleanup needs to query `booking_drafts` by `createdAt`. No such index exists in the current schema.
   - What's unclear: Whether to query by `createdAt` or `updatedAt` for cleanup (drafts that were updated recently but created 90+ days ago — edge case for abandoned drafts).
   - Recommendation: Use `createdAt` for the index and cutoff. A draft created 90 days ago is definitively stale regardless of update time.

4. **INFRA-02: tenantId from auth session vs. request params**
   - What we know: The requirement says tenantId should be derived from auth session, not request params. However, the current server.ts resolves tenantId from `phoneNumberId` (webhook lookup), not from a user auth session — which is correct for webhook processing.
   - What's unclear: Whether INFRA-02 applies to webhook routes (which have no auth session) or only to the future admin API routes.
   - Recommendation: INFRA-02 likely refers to Convex mutations/queries that will be called from the dashboard (Phase 4), not from webhook processing. For this phase, verify that existing Convex functions always filter by `tenantId` and never accept tenant data from unauthenticated callers. Flag for Phase 4 to enforce auth-derived tenantId on dashboard API routes.

---

## Sources

### Primary (HIGH confidence)
- https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/ - pino v9/v10 child logger patterns, ESM setup (verified current as of 2026)
- https://github.com/pinojs/pino/blob/main/docs/api.md - pino official API (child, bindings, levels, serializers)
- https://docs.sentry.io/platforms/javascript/guides/node/install/esm/ - Sentry ESM `--import` flag pattern (official Sentry docs)
- https://docs.sentry.io/platforms/javascript/guides/node/enriching-events/scopes/ - Sentry `withScope`, `setTag`, `setUser` patterns
- https://github.com/animir/node-rate-limiter-flexible/wiki/Memory - RateLimiterMemory API (official wiki)
- https://docs.convex.dev/scheduling/cron-jobs - Convex cron job patterns, internalMutation scheduling
- npm view: `pino@10.3.1`, `@sentry/node@10.40.0`, `rate-limiter-flexible@9.1.1` (verified 2026-03-01)

### Secondary (MEDIUM confidence)
- https://webhooks.fyi/security/replay-prevention - Webhook timestamp tolerance (5 min industry standard, matches Stripe/Twilio pattern)
- https://docs.sentry.io/platforms/node/usage/ - Sentry captureException usage (verified with official docs)

### Tertiary (LOW confidence)
- WebSearch results for rate limiter alternatives (slide-limiter, rolling-rate-limiter) — not verified in depth, alternatives considered and rejected in favor of rate-limiter-flexible

---

## Metadata

**Confidence breakdown:**
- Standard stack (pino, @sentry/node, rate-limiter-flexible): HIGH — versions verified via `npm view`, APIs verified via official docs/wiki
- Architecture (child logger pattern, Sentry withScope, rate limiter interface): HIGH — verified in official docs
- Pitfalls (ESM preload order, console.log scope, Convex batch limits): HIGH — verified via Sentry ESM docs, Convex docs, existing codebase analysis
- Open questions (index gaps, timestamp field location): MEDIUM — based on schema inspection, needs confirmation during implementation

**Research date:** 2026-03-01
**Valid until:** 2026-06-01 (pino and Sentry release frequently; re-verify versions before install)
