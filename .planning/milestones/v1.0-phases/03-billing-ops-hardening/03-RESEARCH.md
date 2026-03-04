# Phase 3: Billing + Ops Hardening - Research

**Researched:** 2026-03-02
**Domain:** Stripe webhook processing, subscription state management, Sentry E2E validation, dead-letter patterns, rate limiting extension
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Stripe Webhook
- `POST /stripe/webhook` route with `STRIPE_WEBHOOK_SECRET` signature verification; invalid signatures → 403
- Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Persist: `customerId`, `subscriptionId`, `status`, `current_period_end` per tenant
- Idempotent via Stripe `event.id` — duplicate delivery produces no duplicate state changes

#### Dead-letter / Retry for Failed Webhooks
- Store failed webhook events in Convex (all three webhook types: WhatsApp, Bokun, Stripe)
- Persist: error reason + payload hash
- Basic retry/dead-letter mechanism — scope is "in place", not fully automated retry system

#### Rate Limiting
- Extend rate limiting to ALL inbound webhook endpoints (WhatsApp already done in Phase 1; add Bokun and Stripe)
- Safe defaults, structured log entries on limit hits
- Consistent with Phase 1 approach (same library/pattern)

#### Sentry Validation
- Prove Sentry is wired E2E with a test error visible in the production Sentry project
- Human checkpoint: manually trigger test error and verify it appears in dashboard
- No automated verification required for this phase

#### render.yaml + .env.example
- Add any new Stripe vars (STRIPE_WEBHOOK_SECRET, etc.)
- Runbook notes for webhook verification and troubleshooting

### Claude's Discretion
- Convex schema design for subscription storage (fields on `tenants` table vs separate table — planner decides based on Phase 4 needs)
- Dead-letter table schema and retry count limits
- Rate limit thresholds for server-to-server webhook endpoints (Bokun/Stripe are servers, not end users)
- Exact retry logic (manual vs automated cron)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-03 | Stripe webhook events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` activate/deactivate the tenant subscription status in Convex | Stripe SDK `constructEvent`, subscription object fields, Convex mutation pattern |
| BILL-04 | Stripe webhook processing is idempotent — duplicate Stripe event delivery produces no duplicate state changes | `webhook_dedup` table already exists with `claim` mutation; extend to use `event.id` as key |
| OBS-06 | Failed webhook events (WhatsApp, Bokun, Stripe) are persisted to Convex with error details; admin dashboard provides a simple view and manual retry capability | New `failed_webhooks` table in Convex schema; manual retry scope only for this phase |
</phase_requirements>

---

## Summary

Phase 3 has three distinct work streams: (1) Stripe webhook endpoint with signature verification and subscription state persistence, (2) dead-letter storage for all failed webhook types, and (3) extending rate limiting to Bokun and Stripe inbound routes. The Sentry E2E validation is a human checkpoint — no new code required beyond a temporary test endpoint or one-liner trigger.

The project already has all the patterns needed. The raw body reader (`readRawBody`), HMAC validation (using Node.js `crypto`), dedup via `webhook_dedup`, and `rate-limiter-flexible` (already installed) are all in place. The Stripe work follows the same server.ts handler pattern used for Bokun. The key difference is that Stripe uses its own SDK for signature verification (`stripe.webhooks.constructEvent`) rather than manual HMAC, and Stripe returns 403 (not 200) on invalid signature because Stripe does NOT retry on 4xx.

The subscription state storage question (tenants table vs separate table) is intentionally left to Claude's discretion. Research recommendation: add fields to the `tenants` table for Phase 3 (simple, no join), then migrate to a dedicated `subscriptions` table in Phase 4 if the billing UI needs richer history. This avoids premature schema complexity.

**Primary recommendation:** Use `stripe` npm package v20.x with `stripe.webhooks.constructEvent(rawBody, sig, secret)` for verified signature parsing; store `stripeCustomerId`, `stripeSubscriptionId`, `stripeStatus`, `stripeCurrentPeriodEnd` as optional fields on the `tenants` table; reuse `webhook_dedup.claim` for Stripe event idempotency using `stripe:{event.id}` as the dedup key.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | ^20.4.0 | Stripe API client + webhook signature verification | Official Stripe SDK; `constructEvent` handles HMAC-SHA256 verification and timestamp replay protection internally |

### Already Installed (No New Installs)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `rate-limiter-flexible` | ^9.1.1 | Rate limiting for Bokun + Stripe endpoints | Already installed; same `RateLimiterMemory` pattern |
| `@sentry/node` | ^10.40.0 | Error tracking; already wired | Already initialized via `initSentry()` + preload flag in npm start |
| `convex` | ^1.31.7 | Schema mutations for subscription + dead-letter storage | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `stripe.webhooks.constructEvent` | Manual HMAC-SHA256 | Stripe SDK handles timestamp tolerance (300s window) and multi-signature checking automatically; manual is error-prone |
| Fields on `tenants` table | Separate `subscriptions` table | Separate table is cleaner but requires joins; tenants table is simpler for Phase 3 scope — migrate in Phase 4 if needed |
| In-memory dedup for Stripe events | Extend existing `webhook_dedup` table | `webhook_dedup` already handles TTL + atomic claim; use `stripe:{event.id}` key, same pattern as WhatsApp `wa:{messageId}` |

**Installation:**
```bash
npm install stripe
```

---

## Architecture Patterns

### Recommended Project Structure

New files to add:
```
src/
├── stripe/
│   └── webhookHandler.ts     # Stripe event handler (subscription state updates)
convex/
├── subscriptions.ts           # Convex mutations: upsertSubscription, etc.
│                              # OR: extend tenants.ts with subscription fields
```

Existing files modified:
```
src/server.ts                  # Add POST /stripe/webhook route + rate limiting for Bokun+Stripe
src/middleware/rateLimiter.ts  # Add server-to-server limiter variant (higher thresholds)
convex/schema.ts               # Add subscription fields to tenants + new failed_webhooks table
convex/crons.ts                # Add cleanup cron for failed_webhooks if TTL desired
```

### Pattern 1: Stripe Webhook Route (mirrors Bokun pattern)

**What:** Plain Node.js HTTP handler for `POST /stripe/webhook` with raw body preservation.
**When to use:** All inbound Stripe webhook events.

```typescript
// src/stripe/webhookHandler.ts
// Source: stripe-node GitHub + project existing pattern

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function verifyAndParseStripeWebhook(
  rawBody: Buffer,
  signatureHeader: string,
  webhookSecret: string
): Promise<Stripe.Event> {
  // constructEvent throws SignatureVerificationError on invalid sig
  // It also validates that the timestamp in Stripe-Signature is within 300 seconds
  return stripe.webhooks.constructEvent(
    rawBody,          // raw Buffer — NOT parsed JSON
    signatureHeader,  // 'stripe-signature' header value
    webhookSecret     // STRIPE_WEBHOOK_SECRET env var
  );
}
```

**CRITICAL:** `rawBody` must be the raw `Buffer` from `readRawBody()` — same function already in server.ts. Do NOT call `.toString()` or `JSON.parse()` before passing to `constructEvent`. The Stripe SDK accepts `Buffer | string`.

### Pattern 2: Stripe Webhook Handler in server.ts

**What:** Handler function added to server.ts following the exact same structure as `handleBokunWebhookPost`.

```typescript
// In src/server.ts — add alongside handleBokunWebhookPost

async function handleStripeWebhookPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret?.trim()) {
    sendJson(res, 500, { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET." });
    return;
  }

  // Rate limit check (server-to-server: key by "stripe" constant — Stripe has its own IPs)
  const rateCheck = await stripeWebhookLimiter.check("stripe");
  if (!rateCheck.allowed) {
    rootLogger.warn({ handler: "stripe_webhook" }, "rate_limit_exceeded");
    sendJson(res, 429, { ok: false, error: "Rate limit exceeded." });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Failed to read request body." });
    return;
  }

  const sigHeader = req.headers["stripe-signature"];
  if (!sigHeader || typeof sigHeader !== "string") {
    sendJson(res, 400, { ok: false, error: "Missing stripe-signature header." });
    return;
  }

  let event: Stripe.Event;
  try {
    event = await verifyAndParseStripeWebhook(rawBody, sigHeader, webhookSecret);
  } catch (err) {
    // Invalid signature → 403 (per locked decision)
    rootLogger.warn({ handler: "stripe_webhook", error: err }, "stripe_signature_invalid");
    sendJson(res, 403, { ok: false, error: "Invalid Stripe webhook signature." });
    return;
  }

  // Idempotency: use existing webhook_dedup claim with key stripe:{event.id}
  // NOTE: Stripe webhook dedup does NOT use tenantId (Stripe is not tenant-scoped at webhook level)
  // Use a sentinel/system tenantId OR store in a global dedup key
  // See Pitfall #3 for details — recommend a dedicated stripe_event_dedup or adapt dedup schema

  await handleStripeEvent(event);
  sendJson(res, 200, { ok: true, eventId: event.id });
}
```

### Pattern 3: Subscription State in Convex

**What:** Convex mutation to upsert subscription state per tenant.
**When to use:** On `customer.subscription.updated` and `customer.subscription.deleted` events.

```typescript
// convex/subscriptions.ts (or extend tenants.ts)

export const upsertTenantSubscription = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeStatus: v.string(),        // "active" | "past_due" | "canceled" | "trialing" etc.
    stripeCurrentPeriodEnd: v.number(), // Unix timestamp (seconds from Stripe)
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error(`Tenant not found: ${args.tenantId}`);
    await ctx.db.patch(args.tenantId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeStatus: args.stripeStatus,
      stripeCurrentPeriodEnd: args.stripeCurrentPeriodEnd,
    });
  },
});
```

**Schema addition for `tenants` table:**
```typescript
// convex/schema.ts — add to tenants table definition
stripeCustomerId: v.optional(v.string()),
stripeSubscriptionId: v.optional(v.string()),
stripeStatus: v.optional(v.string()),
stripeCurrentPeriodEnd: v.optional(v.number()),
```

### Pattern 4: Stripe Event Idempotency

**What:** Prevent duplicate processing of the same Stripe event.
**Challenge:** Existing `webhook_dedup` table requires `tenantId` (typed as `v.id("tenants")`), but Stripe webhooks arrive before tenant resolution. Two options:

**Option A (Recommended for Phase 3):** Add a new `stripe_event_dedup` table with just `eventId` and `createdAt` — no tenantId dependency.

```typescript
// convex/schema.ts
stripe_event_dedup: defineTable({
  eventId: v.string(),   // Stripe event.id (e.g., "evt_abc123")
  createdAt: v.number(),
}).index("by_eventId", ["eventId"]),
```

**Option B:** Resolve tenant from Stripe customer ID first, then reuse existing `webhook_dedup`. More complex for Phase 3 scope.

**Claim mutation:**
```typescript
// convex/stripeDedup.ts
export const claimStripeEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripe_event_dedup")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) return { ok: false as const };
    await ctx.db.insert("stripe_event_dedup", { eventId: args.eventId, createdAt: Date.now() });
    return { ok: true as const };
  },
});
```

### Pattern 5: Dead-Letter Table Schema

**What:** Convex table to store failed webhook events across all three sources.

```typescript
// convex/schema.ts — new table
failed_webhooks: defineTable({
  source: v.union(v.literal("whatsapp"), v.literal("bokun"), v.literal("stripe")),
  payloadHash: v.string(),     // SHA256 of raw body — never store PII
  errorReason: v.string(),     // human-readable error message
  eventType: v.optional(v.string()), // e.g., "checkout.session.completed"
  retryCount: v.number(),      // starts at 0
  status: v.union(
    v.literal("failed"),
    v.literal("retried"),
    v.literal("resolved")
  ),
  resolvedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_source", ["source"])
  .index("by_status", ["status"])
  .index("by_createdAt", ["createdAt"]),
```

**Note:** `payloadHash` uses SHA256 of raw body — never store the raw payload itself (may contain PII or sensitive billing data).

### Pattern 6: Rate Limiting for Server-to-Server Endpoints

**What:** Apply rate limiting to Bokun and Stripe webhook endpoints using the existing `rate-limiter-flexible` library. Server-to-server needs much higher limits than end-user limits (WhatsApp: 10/60s per user).

```typescript
// src/middleware/rateLimiter.ts — add alongside inboundMessageLimiter

// Server-to-server webhooks: higher limits, keyed by source (not user)
// Stripe sends at most a few hundred events/hour under normal load
// Bokun is similar — vendor-scale, not consumer-scale
const SERVER_WEBHOOK_MAX = Number(process.env.SERVER_WEBHOOK_RATE_MAX ?? "300");
const SERVER_WEBHOOK_WINDOW_SEC = Math.ceil(
  Number(process.env.SERVER_WEBHOOK_RATE_WINDOW_MS ?? "60000") / 1000
);

const _serverWebhookLimiter = new RateLimiterMemory({
  points: SERVER_WEBHOOK_MAX,
  duration: SERVER_WEBHOOK_WINDOW_SEC,
});

export const serverWebhookLimiter: RateLimiter = {
  async check(key: string): Promise<{ allowed: boolean }> {
    try {
      await _serverWebhookLimiter.consume(key);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  },
};
```

**Rate limit keys:**
- Bokun webhook: `"bokun"` (single server source)
- Stripe webhook: `"stripe"` (single source)
- WhatsApp: already `"wa:{phoneNumber}"` per end user (unchanged)

**Structured log on limit hit:**
```typescript
rootLogger.warn({ handler: "bokun_webhook", key }, "rate_limit_exceeded");
// Return 429 for server-to-server (unlike WhatsApp which returns 200 to avoid retry storms)
// Stripe and Bokun retry on 429 automatically — this is fine, it signals backpressure
```

**IMPORTANT DIFFERENCE from WhatsApp:** WhatsApp rate limit returns HTTP 200 to prevent Meta retry storms. Bokun and Stripe are robust servers that handle 429 correctly with exponential backoff — return 429 for these.

### Pattern 7: Sentry E2E Validation (Human Checkpoint)

**What:** Add a temporary admin-authenticated endpoint `GET /admin/sentry-test` that calls `Sentry.captureException` and returns the event ID. Human verifies it appears in Sentry dashboard.

```typescript
// In server.ts — add to admin routes section
if (pathname === "/admin/sentry-test" && method === "POST") {
  const apiKey = req.headers["x-admin-api-key"];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    sendJson(res, 403, { ok: false, error: "Unauthorized." });
    return;
  }
  const testError = new Error("Sentry E2E validation test — Phase 3");
  Sentry.captureException(testError);
  await Sentry.flush(2000); // ensure event is sent before responding
  sendJson(res, 200, { ok: true, message: "Test error sent to Sentry. Check Sentry dashboard." });
  return;
}
```

**Verification steps:**
1. `curl -X POST https://bokun-bot-api.onrender.com/admin/sentry-test -H "x-admin-api-key: $ADMIN_API_KEY"`
2. Open Sentry project → Issues → confirm "Sentry E2E validation test — Phase 3" appears
3. Note event ID from Sentry dashboard as proof
4. Remove or gate the endpoint after verification (mark as manual-only in runbook)

### Anti-Patterns to Avoid

- **Parse body before constructEvent:** Never call `JSON.parse(rawBody)` before passing to Stripe SDK — this corrupts the signature.
- **Return 403 to WhatsApp/Meta:** Return 200 even on errors for Meta webhooks to prevent retry storms. Stripe + Bokun can receive real 4xx.
- **Store raw webhook payload in Convex:** Raw payloads may contain PII. Store only the payload hash.
- **Use tenantId-scoped dedup for Stripe events:** Stripe events don't map to a tenant until you look up the customerId. Use separate `stripe_event_dedup` table.
- **Forget `Sentry.flush()`:** In Node.js HTTP handlers, Sentry sends events asynchronously. Call `await Sentry.flush(2000)` in the test endpoint to ensure the event is delivered.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe signature verification | Manual HMAC-SHA256 | `stripe.webhooks.constructEvent()` | Stripe SDK handles: dual signature scheme (v1/v0), timestamp tolerance (300s), timing-safe comparison |
| Stripe event timestamp replay protection | Custom timestamp check | Built into `constructEvent` | Stripe-Signature header includes `t=` timestamp; SDK validates it within 300s automatically |
| Rate limiting | Custom counter logic | `RateLimiterMemory` (already installed) | Handles race conditions, window calculation, configurable via env vars |

**Key insight:** The Stripe SDK's `constructEvent` handles all security concerns for signature validation — timestamp tolerance, multi-signature support, and timing-safe comparison. The only requirement is passing the raw `Buffer` unchanged.

---

## Common Pitfalls

### Pitfall 1: Raw Body Corruption
**What goes wrong:** `constructEvent` throws "No signatures found matching the expected signature" even with correct secret.
**Why it happens:** Body was converted to string or parsed as JSON before being passed to `constructEvent`. Any whitespace normalization, key reordering, or encoding change breaks the HMAC.
**How to avoid:** Pass `rawBody: Buffer` directly from `readRawBody(req)` — the existing function in server.ts already returns a `Buffer`. Do NOT call `.toString()` before constructEvent; the Stripe SDK accepts `Buffer` directly.
**Warning signs:** Signature errors only happen in production but work with Stripe CLI locally (CLI sends pre-serialized body).

### Pitfall 2: Wrong Webhook Secret (Test vs Live)
**What goes wrong:** Signature verification always fails in production.
**Why it happens:** Using the Stripe CLI's local webhook secret (`whsec_...` from `stripe listen`) instead of the Dashboard endpoint secret.
**How to avoid:** Create a Stripe webhook endpoint in Dashboard pointing to the production URL. Use the secret from Dashboard > Developers > Webhooks > [endpoint] > Signing secret. Store as `STRIPE_WEBHOOK_SECRET`.
**Warning signs:** Works with `stripe trigger` locally but fails in production.

### Pitfall 3: Stripe Dedup Requires No TenantId
**What goes wrong:** Try to reuse existing `webhook_dedup` table for Stripe events, but the table schema requires `tenantId: v.id("tenants")`.
**Why it happens:** Existing dedup is designed for tenant-scoped WhatsApp dedup. Stripe events arrive without a tenant context (must look up tenant from `customerId`).
**How to avoid:** Create separate `stripe_event_dedup` table (no tenantId). Deduplicate by `event.id` before attempting tenant resolution.
**Warning signs:** TypeScript error when trying to insert into `webhook_dedup` without a tenantId.

### Pitfall 4: Stripe Returns `canceled` (One L), not `cancelled`
**What goes wrong:** Status comparison code checks `=== "cancelled"` and never matches.
**Why it happens:** Stripe uses American English spelling: `"canceled"` (one L). This is a known footgun.
**How to avoid:** Always use `"canceled"` (one L) in switch statements and schema comments.
**Warning signs:** Subscription deletions don't update tenant status in Convex.

### Pitfall 5: Rate Limiting Bokun/Stripe with Wrong 200 Response
**What goes wrong:** Bokun/Stripe receive HTTP 200 on rate limit hits and keep hammering.
**Why it happens:** Copy-pasting the WhatsApp rate limit handler which returns 200 to avoid Meta retry storms.
**How to avoid:** Return 429 for Bokun and Stripe rate limit hits. These servers handle 429 with exponential backoff. WhatsApp is the exception (Meta doesn't retry 429 gracefully).
**Warning signs:** Rate limit is hit but requests keep coming at the same rate.

### Pitfall 6: checkout.session.completed — Subscription Not Yet Active
**What goes wrong:** On `checkout.session.completed`, the subscription status may still be `"incomplete"` or `"trialing"`.
**Why it happens:** `checkout.session.completed` fires when checkout completes, but the subscription may not be in `active` state yet. The definitive state update comes from `customer.subscription.updated`.
**How to avoid:** For `checkout.session.completed`, record the `customerId` and `subscriptionId` from `event.data.object.customer` and `event.data.object.subscription`. For actual status, rely on `customer.subscription.updated` events. Alternatively, call `stripe.subscriptions.retrieve(subscriptionId)` to get the current status at time of checkout completion.
**Warning signs:** Tenant shows as subscribed but subscription is actually in `trialing` or `incomplete` state.

### Pitfall 7: Sentry flush() Needed for HTTP Handlers
**What goes wrong:** Test error is sent but never appears in Sentry dashboard.
**Why it happens:** Sentry sends events asynchronously. If the HTTP response is sent and the process handles the next request before Sentry flushes, the event may be dropped under load.
**How to avoid:** Add `await Sentry.flush(2000)` after `Sentry.captureException()` in the test endpoint.
**Warning signs:** Test error doesn't appear in Sentry despite `captureException` being called.

---

## Code Examples

Verified patterns from official sources and project codebase:

### Stripe constructEvent (Official SDK Pattern)
```typescript
// Source: github.com/stripe/stripe-node examples + official docs
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// rawBody is Buffer from readRawBody(req) — already in server.ts
// signatureHeader is req.headers["stripe-signature"] as string
// webhookSecret is process.env.STRIPE_WEBHOOK_SECRET
try {
  const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  // event.type: "checkout.session.completed" | "customer.subscription.updated" | etc.
  // event.id: "evt_..." — use for idempotency
  // event.data.object: the subscription or checkout session object
} catch (err) {
  // Thrown for: invalid signature, expired timestamp (>300s), malformed header
  // Return 403 per locked decision
}
```

### Stripe Subscription Object Fields
```typescript
// Source: Stripe API Reference + billing/subscriptions/webhooks docs
// For customer.subscription.updated and customer.subscription.deleted:
const subscription = event.data.object as Stripe.Subscription;
// subscription.id           → stripeSubscriptionId (e.g., "sub_abc123")
// subscription.customer     → stripeCustomerId (e.g., "cus_xyz789") — always a string ID
// subscription.status       → "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "incomplete_expired" | "unpaid" | "paused"
// subscription.current_period_end → Unix timestamp in SECONDS (not milliseconds!)

// For checkout.session.completed:
const session = event.data.object as Stripe.Checkout.Session;
// session.customer     → stripeCustomerId
// session.subscription → stripeSubscriptionId (string ID, not expanded object)
// Then call stripe.subscriptions.retrieve(session.subscription as string) for full subscription data
```

### Existing readRawBody (Already in server.ts)
```typescript
// Source: src/server.ts line 250 — use this function, don't reinvent
async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
// Pass the resulting Buffer directly to stripe.webhooks.constructEvent()
```

### Rate Limiter Extension (Based on Existing Pattern)
```typescript
// Source: src/middleware/rateLimiter.ts — extend with server-to-server variant
import { RateLimiterMemory } from "rate-limiter-flexible";

// Server-to-server: 300 requests per 60 seconds (much higher than end-user 10/60s)
const _serverWebhookLimiter = new RateLimiterMemory({
  points: Number(process.env.SERVER_WEBHOOK_RATE_MAX ?? "300"),
  duration: Math.ceil(Number(process.env.SERVER_WEBHOOK_RATE_WINDOW_MS ?? "60000") / 1000),
});

export const serverWebhookLimiter: RateLimiter = {
  async check(key: string): Promise<{ allowed: boolean }> {
    try {
      await _serverWebhookLimiter.consume(key);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  },
};
```

### Sentry flush() for HTTP Handlers
```typescript
// Source: Sentry Node.js docs — required for non-long-lived process testing
import * as Sentry from "@sentry/node";

Sentry.captureException(new Error("Sentry E2E validation test — Phase 3"));
await Sentry.flush(2000); // wait up to 2s for event to be sent
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stripe.webhooks.constructEventAsync` | `stripe.webhooks.constructEvent` (sync) | Stripe SDK v8+ | Sync version preferred; async variant exists but sync is simpler for Buffer payloads |
| Manual HMAC-SHA256 for Stripe | `constructEvent()` | Standard since Stripe SDK v2 | SDK handles v0/v1 signature schemes, timestamp tolerance automatically |
| Store raw webhook payloads | Store payload hash only | Current best practice | PII protection; hash sufficient for dedup and debugging |

**Deprecated/outdated:**
- Using `express.raw()` middleware for raw body: Not applicable — this project uses plain Node.js `http` module and `readRawBody()` already returns the raw Buffer.
- Stripe `v0` signature scheme: Stripe still accepts it but signs with `v1` by default. `constructEvent` validates both.

---

## Open Questions

1. **Stripe customer-to-tenant mapping**
   - What we know: Stripe events contain `customerId` (e.g., `cus_xyz`). Tenant lookup requires a `stripeCustomerId` field on the tenants table.
   - What's unclear: How is a Stripe customer created for a tenant in the first place? Phase 3 has no Checkout flow (BILL-01/BILL-02 are out of scope per CONTEXT.md). The Stripe webhook may arrive before any tenant has a customerId in Convex.
   - Recommendation: For Phase 3, store subscription data when received. If `customerId` can't be mapped to a tenant, log as warning and store in `failed_webhooks` with `errorReason: "tenant_not_found"`. The actual checkout flow (Phase 4 or later) will write the customerId first.

2. **Stripe webhook endpoint registration**
   - What we know: `render.yaml` already has `STRIPE_WEBHOOK_SECRET` as a placeholder. The production URL for the webhook is `https://bokun-bot-api.onrender.com/stripe/webhook`.
   - What's unclear: Who registers the webhook endpoint in Stripe Dashboard? This is a manual step that must happen after deploy.
   - Recommendation: Add to runbook in `.env.example` comments and in any deployment docs.

3. **Dead-letter cleanup TTL**
   - What we know: Other tables have cleanup crons (webhook_dedup: 7 days, conversations: 90 days).
   - What's unclear: What retention period for failed_webhooks? Presumably long enough for manual review (30+ days).
   - Recommendation: 30-day TTL for failed_webhooks; add to `cleanup.ts` with a daily cron. Or leave deletion manual for Phase 3 (OBS-06 scope says "in place" not "automated").

---

## Environment Variables Required

All new Stripe vars are already placeholders in `render.yaml` and `.env.example`. Phase 3 must uncomment/activate:

| Variable | Purpose | Where to Get |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API client initialization | Stripe Dashboard > Developers > API Keys > Restricted Key (or Secret Key for test) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Stripe Dashboard > Developers > Webhooks > [endpoint] > Signing secret (`whsec_...`) |

**No new variables** beyond these two — both already declared in `render.yaml` and `.env.example`.

---

## render.yaml Changes (Minimal)

`render.yaml` already has `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as `sync: false` placeholders. No new entries required. Phase 3 task: verify they are present and add runbook comments to `.env.example` documenting:
- How to get each value from Stripe Dashboard
- That `STRIPE_WEBHOOK_SECRET` differs between test mode (CLI) and production (Dashboard endpoint)
- The production webhook URL to register in Stripe

---

## Sources

### Primary (HIGH confidence)
- `stripe` npm package v20.4.0 — `constructEvent` API, subscription object fields, ES module import — verified via npmjs.com and stripe-node GitHub
- `https://docs.stripe.com/billing/subscriptions/webhooks` — subscription event types and lifecycle
- `https://docs.stripe.com/api/subscriptions/object` — subscription status enum values (verified: `"canceled"` one L)
- Existing `src/server.ts` codebase — `readRawBody`, handler patterns, rate limiter integration
- Existing `src/middleware/rateLimiter.ts` — `RateLimiterMemory` pattern (already installed)
- Existing `convex/schema.ts` — all table definitions, `webhook_dedup` structure
- Existing `convex/dedup.ts` — `claim` mutation pattern
- `src/lib/sentry.ts` — Sentry already initialized with `captureException` and `withScope`

### Secondary (MEDIUM confidence)
- `https://docs.stripe.com/webhooks` — raw body requirement, idempotency recommendation (verified by multiple sources)
- `https://docs.sentry.io/platforms/node/usage/` — `Sentry.captureException` usage
- `https://github.com/stripe/stripe-node` — ES module import syntax `import Stripe from 'stripe'`; `new Stripe(secretKey)` constructor

### Tertiary (LOW confidence)
- `checkout.session.completed` containing `session.subscription` as string ID — confirmed by multiple community sources but not directly from official API reference; verify with `Stripe.Checkout.Session` TypeScript types from the installed SDK

---

## Metadata

**Confidence breakdown:**
- Standard stack (stripe package, constructEvent): HIGH — verified via official npm/GitHub
- Subscription object fields (id, customer, status, current_period_end): HIGH — verified via Stripe API reference
- Architecture patterns (handler structure, schema design): HIGH — directly modeled on existing codebase patterns
- Stripe event idempotency via separate table: HIGH — matches existing dedup pattern, workaround for tenantId type constraint is clear
- checkout.session.completed data structure: MEDIUM — community confirmed but not verified from official ref page
- Dead-letter schema: MEDIUM — standard pattern, specific field choices are Claude's discretion
- Rate limit thresholds (300/60s): MEDIUM — reasonable for server-to-server, configurable via env vars
- Pitfalls: HIGH — timing-safe comparison, raw body requirement, "canceled" spelling all confirmed from multiple sources

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (Stripe SDK is fast-moving; re-check before Phase 4 billing UI work)
