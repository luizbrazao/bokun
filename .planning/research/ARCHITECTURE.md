# Architecture Patterns

**Domain:** Multi-tenant WhatsApp SaaS with vendor admin dashboard, subscription billing, and production deployment
**Researched:** 2026-03-01

## Recommended Architecture

The system expands from a headless webhook server into a four-component architecture. The existing Node.js server and Convex backend remain unchanged. Two new concerns (vendor dashboard, Stripe billing) layer on top. Deployment bundles everything on Render.com with Convex Cloud as the managed backend.

```
                        Internet
                           |
          +----------------+----------------+
          |                                 |
   Render Web Service               Render Static Site
   (Node.js HTTP server)            (React + Vite dashboard)
   - WhatsApp webhooks              - Vendor login/auth
   - Telegram webhooks              - Dashboard UI
   - Bokun webhooks                 - Settings, bookings, convos
   - Stripe webhooks                - Stripe billing portal
   - OAuth callbacks                - Connects to Convex directly
   - Health check                   |
          |                         |
          +--------+--------+------+
                   |        |
            Convex Cloud    Stripe API
            (database +     (subscriptions,
             serverless     webhooks,
             functions)     customer portal)
```

### Key Decision: Separate Frontend App (Not Served From Node.js Server)

The admin dashboard should remain a **separate static site** deployed independently from the Node.js webhook server. Reasons:

1. **Already exists as separate Vite app.** The `frontend/` directory is a standalone React+Vite project with its own `package.json`, build pipeline, and Convex Auth integration. Merging it into the Node.js server would be a regression.

2. **Convex handles the data layer.** The frontend connects directly to Convex Cloud via `ConvexReactClient` -- it does not need the Node.js server as a proxy. Auth, queries, and mutations all go through Convex.

3. **Independent scaling and deployment.** The Node.js server handles webhook traffic (bursty, latency-sensitive). The dashboard serves static assets (cacheable, CDN-friendly). These have different performance profiles and should deploy independently.

4. **Render.com supports this natively.** Deploy the Node.js server as a Web Service and the React app as a Static Site -- both from the same Git repo with different root directories and build commands.

### Component Boundaries

| Component | Responsibility | Communicates With | Deployment |
|-----------|---------------|-------------------|------------|
| **Node.js Webhook Server** | Receive/process WhatsApp, Telegram, Bokun, Stripe webhooks. OAuth callbacks. Health checks. | Convex (mutations/queries), Bokun API, Meta API, Telegram API, OpenAI API, Stripe API | Render Web Service |
| **React Dashboard** (frontend/) | Vendor admin UI: auth, onboarding, channel config, bookings, conversations, settings, billing | Convex Cloud (direct via ConvexReactClient), Stripe Customer Portal (redirect) | Render Static Site |
| **Convex Cloud** | Database, serverless functions, auth, real-time subscriptions, cron jobs | Called by both Node.js server and React dashboard | Convex Cloud (managed) |
| **Stripe** | Subscription billing, payment processing, customer portal, invoicing | Sends webhooks to Node.js server; called by Convex actions | Stripe (managed) |

### Data Flow

```
[Vendor Browser]
    |
    v
[React Dashboard on Render Static Site]
    |  (ConvexReactClient over WebSocket)
    v
[Convex Cloud]
    ^           ^
    |           |
    |           |  (ConvexHttpClient over HTTPS)
    |           |
    |    [Node.js Server on Render Web Service]
    |           ^          ^         ^
    |           |          |         |
    |    [WhatsApp]  [Bokun]   [Stripe Webhooks]
    |    webhooks    webhooks
    |
    +--- [Stripe API] (called by Convex actions for checkout/subscription management)
```

## Component Architecture Details

### 1. Stripe Billing Integration

**Use the official `@convex-dev/stripe` component.** It provides subscription checkout, webhook handling, customer management, and real-time status queries -- all native to Convex. This avoids building custom webhook handlers and subscription state tracking.

**Confidence:** HIGH (official Convex component, well-documented)

**Architecture:**

```
Vendor clicks "Subscribe" in Dashboard
    |
    v
React Dashboard calls Convex action: stripe.createCheckoutSession()
    |
    v
Convex action calls Stripe API -> returns checkout URL
    |
    v
Vendor redirected to Stripe Checkout (hosted page)
    |
    v
Payment completes -> Stripe sends webhook to Node.js server
    |
    v
Node.js server forwards to Convex HTTP action: stripe.handleWebhook()
    |
    v
Convex mutation updates subscription status in Convex tables
    |
    v
Dashboard reactively updates (real-time via Convex subscriptions)
```

**Schema additions** (managed by `@convex-dev/stripe` component):

| Table | Purpose |
|-------|---------|
| `stripe_customers` | Maps Convex user/tenant to Stripe customer ID |
| `stripe_subscriptions` | Subscription status, plan, period, linked tenant |
| `stripe_checkout_sessions` | Checkout flow state |
| `stripe_invoices` | Invoice records |

**Stripe webhook endpoint:** Add `POST /stripe/webhook` to the Node.js server. Validate signature with `STRIPE_WEBHOOK_SECRET`, forward raw body to Convex HTTP action.

**Subscription gating:** Add a Convex query `getSubscriptionStatus(tenantId)` that returns the tenant's plan. Use this to:
- Gate API access in the webhook server (reject messages for expired tenants)
- Show billing status in the dashboard
- Enforce usage limits per plan

**Customer Portal:** Stripe's hosted portal lets vendors manage billing, update payment methods, cancel subscriptions. Link to it from the dashboard Settings page via `stripe.createPortalSession()`.

### 2. Vendor Admin Dashboard (frontend/)

**Already exists.** The dashboard is a React 19 + Vite + Tailwind CSS app using Convex Auth (Password + Google). Current pages:

| Page | Status | Notes |
|------|--------|-------|
| Auth (login/register) | Exists | Password + Google OAuth |
| Onboarding | Exists | Post-registration tenant setup |
| Overview | Exists | Dashboard home |
| Bookings | Exists | Booking list |
| Conversations | Exists | Conversation list + detail |
| Operator Inbox | Exists | Handoff management |
| Settings | Exists | Channel config, AI settings |
| **Billing** | **Missing** | Stripe subscription management |
| **Profile** | **Missing** | Business info, logo, contact |

**Auth flow (already implemented):**

```
Browser -> ConvexAuthProvider (sessionStorage) -> Convex Cloud auth endpoints
    |
    v
RequireAuth guard -> checks useConvexAuth().isAuthenticated
    |
    v
RequireTenant guard -> checks useTenant().hasTenant (user_tenants junction table)
    |
    v
DashboardLayout -> sidebar + page content
```

The dashboard does NOT communicate with the Node.js server. All data goes through Convex directly. This is correct and should not change.

**New pages to add:**
- `BillingPage.tsx` -- subscription status, plan selector, link to Stripe portal
- `ProfilePage.tsx` -- business name, logo upload, contact details (stored in `tenants` table)

### 3. Render.com Deployment Architecture

**Two Render services from one Git repo:**

| Service | Type | Root Dir | Build Command | Start Command |
|---------|------|----------|---------------|---------------|
| `bokun-server` | Web Service | `/` (root) | `npm install` | `node --experimental-strip-types src/server.ts` |
| `bokun-dashboard` | Static Site | `frontend/` | `npm install && npm run build` | N/A (serves `dist/`) |

**Critical: Do NOT use Free tier for the webhook server.** Free tier spins down after 15 minutes of inactivity. WhatsApp and Bokun webhooks arrive at unpredictable times -- a cold start of 30-60 seconds means missed webhooks and failed HMAC validations (Meta retries, but with delays). Use Render's Starter tier ($7/month) minimum for the web service.

The dashboard (Static Site) can use the free tier -- it's served from CDN and has no cold start issues.

**Environment variables on Render:**

For `bokun-server` (Web Service):
```
CONVEX_URL=<production convex URL>
META_APP_SECRET=<secret>
WHATSAPP_VERIFY_TOKEN=<token>
BOKUN_APP_CLIENT_ID=<id>
BOKUN_APP_CLIENT_SECRET=<secret>
BOKUN_OAUTH_REDIRECT_URI=https://bokun-server.onrender.com/oauth/callback
BOKUN_BASE_URL=https://api.bokun.io
OPENAI_API_KEY=<fallback key>
STRIPE_SECRET_KEY=<sk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
PORT=10000
```

For `bokun-dashboard` (Static Site):
```
VITE_CONVEX_URL=<production convex URL>
```

**Render Blueprint (render.yaml):**

```yaml
services:
  - type: web
    name: bokun-server
    runtime: node
    plan: starter
    buildCommand: npm install
    startCommand: node --experimental-strip-types src/server.ts
    envVars:
      - key: PORT
        value: 10000
      - key: CONVEX_URL
        sync: false
      # ... other env vars
    healthCheckPath: /health

  - type: web
    name: bokun-dashboard
    runtime: static
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=0, must-revalidate
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_CONVEX_URL
        sync: false
```

**Note:** The rewrite rule (`/* -> /index.html`) is critical for React Router -- without it, direct navigation to `/configuracoes` returns 404.

### 4. Observability Layer

**Use Pino for structured logging + Sentry for error tracking.**

**Confidence:** MEDIUM (standard Node.js patterns, not yet verified with Convex specifics)

**Logging (Pino):**
- Replace all `console.log` calls with Pino logger
- Structured JSON output (Render captures stdout automatically)
- Add `tenantId`, `waUserId`, `messageId` to log context
- Child loggers per request for correlation
- Log levels: `error` for failures, `warn` for retries, `info` for webhook receipt/completion, `debug` for payload details

```typescript
// src/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

**Error Tracking (Sentry):**
- Initialize `@sentry/node` in `src/server.ts`
- Capture unhandled exceptions and unhandled rejections
- Tag errors with `tenantId` for multi-tenant debugging
- Attach breadcrumbs for webhook processing steps
- Use `pino-sentry-transport` to forward `error`-level logs to Sentry

**Health Check (already exists):**
- `GET /health` returns `{ ok: true }` -- expose to Render's health check monitoring
- Add deeper health check: verify Convex connectivity, check last webhook processed time

**Metrics (defer to Phase 2):**
- Webhook processing latency (histogram)
- Booking conversion rate (counter)
- Bokun API error rate (counter)
- OpenAI token usage (gauge)
- Consider OpenTelemetry if metrics become critical

## Patterns to Follow

### Pattern 1: Convex as Single Source of Truth

**What:** All state (tenants, subscriptions, bookings, conversations) lives in Convex. The Node.js server is stateless -- it reads/writes to Convex for every operation.

**When:** Always. Never cache tenant state or subscription status in-memory on the Node.js server (except the existing OpenAI client cache, which is acceptable).

**Why:** Convex provides reactive queries. The dashboard gets real-time updates. If you cache subscription status on the server, the dashboard and server can disagree.

### Pattern 2: Webhook Forwarding to Convex

**What:** The Node.js server validates webhook signatures, then forwards the payload to a Convex HTTP action or mutation for processing. The server does not contain business logic beyond validation and routing.

**When:** For all new webhook integrations (Stripe). Already followed for WhatsApp/Bokun.

**Example:**
```typescript
// In src/server.ts - Stripe webhook handler
app.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);

  // Forward to Convex for processing
  await convex.action(api.stripe.handleWebhookEvent, { event });

  res.status(200).json({ received: true });
});
```

### Pattern 3: Subscription Gating at Webhook Entry

**What:** Check tenant subscription status early in webhook processing. If tenant has no active subscription, return a polite message ("Your subscription has expired") instead of processing the booking.

**When:** After tenant resolution, before routing to booking state machine or LLM.

**Why:** Prevents resource consumption (OpenAI calls, Bokun API calls) for non-paying tenants. Also serves as the enforcement point -- tenants must pay to keep their bot active.

```typescript
// In webhook processing, after tenant resolution:
const subscription = await convex.query(api.subscriptions.getStatus, { tenantId });
if (subscription.status !== "active" && subscription.status !== "trialing") {
  await sendWhatsAppMessage(phoneNumberId, accessToken, waUserId,
    "Este servico esta temporariamente indisponivel. Por favor, entre em contato com o administrador."
  );
  return;
}
```

### Pattern 4: Static Site + API Separation

**What:** The React dashboard is a static site that talks directly to Convex. It never calls the Node.js server. The Node.js server only receives webhooks and OAuth callbacks.

**When:** Always. Do not add REST API endpoints to the Node.js server for the dashboard to consume.

**Why:** Convex already provides auth-gated queries/mutations. Adding a REST layer would duplicate auth logic and create unnecessary coupling.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Node.js Server as API Gateway for Dashboard

**What:** Adding REST endpoints to `src/server.ts` that the React dashboard calls (e.g., `GET /api/bookings`, `POST /api/settings`).

**Why bad:** Duplicates Convex's auth and query infrastructure. Creates coupling between two independently deployable services. Adds latency (browser -> Render -> Convex, instead of browser -> Convex directly).

**Instead:** Use Convex queries/mutations directly from the React app via `useQuery()` and `useMutation()`.

### Anti-Pattern 2: Storing Stripe State Only in Stripe

**What:** Checking subscription status by calling Stripe's API on every webhook.

**Why bad:** Adds latency to every message. Stripe API has rate limits. Creates a hard dependency on Stripe availability for WhatsApp message processing.

**Instead:** Sync Stripe state to Convex via webhooks. Query Convex for subscription status (fast, local read).

### Anti-Pattern 3: Shared Process for Dashboard + Webhooks

**What:** Serving the React SPA from the same Node.js process that handles webhooks.

**Why bad:** Static file serving competes with webhook processing for CPU/memory. Deployment of UI changes requires restarting the webhook server (potential message loss). Cannot scale independently.

**Instead:** Deploy as two separate Render services.

### Anti-Pattern 4: Free Tier for Webhook Server

**What:** Using Render's free tier for the Node.js webhook server.

**Why bad:** Free tier spins down after 15 min inactivity. Cold starts take 30-60 seconds. WhatsApp webhooks have a 20-second timeout -- if the server is cold, the webhook fails. Meta retries, but with increasing delays. Bokun webhooks have a 5-second timeout and do NOT retry.

**Instead:** Use Render Starter tier ($7/month). No spin-down.

## Build Order (Dependencies Between Components)

The components have the following dependency chain:

```
1. Observability (logging + Sentry)
   |  No dependencies. Add to existing server first.
   |  All subsequent work benefits from structured logging.
   v
2. Render.com Deployment (server + dashboard)
   |  Depends on: observability (to debug deployment issues)
   |  Unblocks: Stripe webhooks (needs public URL), dashboard (needs hosting)
   v
3. Stripe Billing Integration
   |  Depends on: Render deployment (Stripe webhooks need public endpoint)
   |  Depends on: Convex schema additions (subscription tables)
   |  Unblocks: Subscription gating in webhook server
   v
4. Dashboard Completion (billing page, profile page)
   |  Depends on: Stripe integration (billing page queries subscription status)
   |  Depends on: Render Static Site (needs to be deployed to test)
   v
5. Subscription Gating
   |  Depends on: Stripe integration (subscription status in Convex)
   |  Final step: enforce payment before webhook processing
```

**Phase ordering rationale:**
- Observability first because debugging production issues without structured logging is painful. Every subsequent phase benefits.
- Deployment second because Stripe webhooks need a public URL, and the dashboard needs hosting. Cannot fully test billing without deployment.
- Stripe third because it's the revenue gate. Once deployed, you can start testing the billing flow end-to-end.
- Dashboard completion fourth because it depends on Stripe data being available in Convex.
- Subscription gating last because it's the enforcement mechanism -- only add after billing is working and tested.

## Scalability Considerations

| Concern | At 10 tenants | At 100 tenants | At 1000 tenants |
|---------|---------------|----------------|-----------------|
| **Webhook server** | Single Render instance ($7/mo) handles easily | Still single instance; consider horizontal scaling if latency increases | Multiple instances behind load balancer; Render supports auto-scaling on paid plans |
| **Convex database** | Well within free/starter limits | Monitor document counts; Convex scales automatically | May need Convex Pro plan for higher throughput |
| **Stripe** | Standard tier handles all | Standard tier handles all | Standard tier handles all; Stripe scales infinitely |
| **Static site (CDN)** | Free tier fine | Free tier fine | Free tier fine (CDN handles scale) |
| **Observability** | Sentry free tier (5K errors/mo) | Sentry Team tier ($26/mo) | Sentry Business tier; consider dedicated log aggregator |

## Sources

- Convex Stripe Component: https://www.convex.dev/components/stripe (HIGH confidence)
- Convex + Stripe integration guide: https://stack.convex.dev/stripe-with-convex (HIGH confidence)
- Convex SaaS starter template: https://github.com/get-convex/convex-saas (HIGH confidence)
- Render.com service types: https://render.com/docs/service-types (HIGH confidence)
- Render.com free tier docs: https://render.com/docs/free (HIGH confidence)
- Render.com deploy docs: https://render.com/docs/deploys (HIGH confidence)
- Pino logging guide: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/ (MEDIUM confidence)
- Pino + OpenTelemetry: https://dzone.com/articles/observability-nodejs-opentelemetry-pino (MEDIUM confidence)
- Existing codebase: `.planning/codebase/ARCHITECTURE.md`, `frontend/src/App.tsx`, `convex/schema.ts`, `convex/auth.ts` (HIGH confidence)

---

*Architecture research: 2026-03-01*
