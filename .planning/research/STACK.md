# Technology Stack

**Project:** WhatsApp Bokun Bot - Production Launch Stack
**Researched:** 2026-03-01

## Existing Stack (No Changes)

These are locked per project constraints and already working:

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ (recommend 20 LTS for deploy) | Runtime |
| TypeScript | ~5.9.3 (frontend), ~5.4 (backend) | Type safety |
| Convex | ^1.31.7 | Serverless DB + backend functions |
| @convex-dev/auth | ^0.0.90 | Authentication |
| OpenAI SDK | ^6.22.0 | LLM agent fallback |
| React | ^19.2.0 | Frontend framework |
| Vite | ^7.3.1 | Frontend build tool |
| React Router DOM | ^7.13.0 | Client-side routing |
| Tailwind CSS | ^4.1.18 | Styling |
| Radix UI | ^1.1.15 (dialog) | Headless UI primitives |
| Lucide React | ^0.574.0 | Icons |
| CVA + clsx + tailwind-merge | latest | Component variant styling |

## Recommended Additions

### 1. Stripe Billing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (Node SDK) | ^20.4.0 | Server-side Stripe API calls | Official SDK, actively maintained, supports subscription billing, Customer Portal, webhook verification. v20 is current stable. |
| @convex-dev/stripe | ^0.1.3 | Convex-native Stripe integration | Official Convex component. Handles webhook routing via httpAction, auto-syncs Stripe data to Convex tables, manages checkout sessions and subscriptions. Eliminates boilerplate for webhook verification and event routing. |

**Confidence:** HIGH - Official Convex component exists specifically for this use case. Stripe Node SDK v20 is current stable.

**Pattern:** Use `@convex-dev/stripe` for webhook handling and data sync. Use raw `stripe` SDK in Convex actions for Checkout Session creation and Customer Portal session generation. Stripe Customer Portal handles subscription self-service (plan changes, cancellation, payment method updates) -- do NOT build custom billing management UI.

**Stripe Events to Handle:**
- `checkout.session.completed` - activate subscription after payment
- `customer.subscription.updated` - plan changes, renewals
- `customer.subscription.deleted` - cancellation
- `invoice.payment_failed` - failed payment, trigger grace period

### 2. Production Deployment (Render.com)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| render.yaml (Blueprint) | N/A | Infrastructure-as-code | Render Blueprints define the full deployment in version control. Two services: Node.js web service (backend/API) + static site (React frontend). Auto-deploy on push. |
| Node.js 20 LTS | 20.x | Production runtime | LTS with best ESM support. Render supports specifying Node version via `engines` in package.json. Node 18 works but 20 LTS is recommended for production longevity. |

**Confidence:** HIGH - Render docs clearly document Blueprint spec and Node.js deployment.

**Deployment Architecture:**
```yaml
# render.yaml (two services)
services:
  # Backend: Node.js web service
  - type: web
    runtime: node
    name: bokun-bot-api
    buildCommand: npm install
    startCommand: node --experimental-strip-types src/server.ts
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      # ... all env vars from CLAUDE.md

  # Frontend: Static site (Vite build)
  - type: web
    runtime: static
    name: bokun-bot-dashboard
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

**Key Render.com Considerations:**
- Free tier spins down after 15 min inactivity (webhook receiver CANNOT use free tier -- will miss WhatsApp/Bokun webhooks)
- Starter plan ($7/mo) keeps service alive -- minimum for production
- Use `healthCheckPath: /health` for zero-downtime deploys
- Static sites are CDN-backed and free on Render
- Convex is deployed separately (`npx convex deploy`) -- not part of Render Blueprint

### 3. Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pino | ^10.3.1 | Structured JSON logging | 5x faster than Winston. JSON output by default works perfectly with Render's log aggregation. Async, non-blocking. Industry standard for Node.js production. |
| pino-http | ^10.x | HTTP request logging | Auto-logs request/response for every HTTP handler. Integrates with existing server.ts. |
| pino-pretty | ^13.x | Dev-only log formatting | Human-readable colored output during development. Never use in production. |
| @sentry/node | ^10.40.0 | Error tracking + performance | Catches unhandled exceptions, tracks slow transactions, alerts on errors. Free tier covers small SaaS (5K errors/mo). v10 is current major with full ESM support for Node 18+. |

**Confidence:** HIGH - Pino and Sentry are the dominant choices in Node.js production. Well-documented, actively maintained.

**Logging Pattern:**
```typescript
// src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty' }
  })
});

// Usage in handlers:
logger.info({ tenantId, waUserId, messageId }, 'webhook received');
logger.error({ err, tenantId }, 'booking confirmation failed');
```

**Sentry Pattern:**
```typescript
// src/instrument.ts (import FIRST in server.ts)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions in prod
});
```

### 4. Frontend Dashboard Additions

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | ^2.15.x | Dashboard charts (overview page) | Built on D3, React-native API, composable. 9M+ weekly downloads. The existing OverviewPage likely needs charts for booking stats. Recharts is the pragmatic choice -- massive ecosystem, well-documented, lightweight enough for a few dashboard charts. |
| @tanstack/react-query | ^5.x | Server state management (non-Convex APIs) | For Stripe API calls and any non-Convex data fetching. Convex queries handle DB state reactively, but Stripe Customer Portal session creation and similar needs a fetch layer. |
| react-hot-toast OR sonner | ^2.x / ^2.x | Toast notifications | User feedback for actions (settings saved, subscription changed, errors). Sonner is more modern and has better Tailwind integration. Use Sonner. |

**Confidence:** MEDIUM - The existing frontend already works with Convex reactive queries. These additions are for specific gaps (charts, Stripe integration, user feedback). Verify recharts bundle size is acceptable for the dashboard scope.

**What NOT to add to the frontend:**
- **No state management library (Redux, Zustand)** -- Convex reactive queries already handle this. Adding a state manager would be redundant.
- **No form library (React Hook Form, Formik)** -- The existing pages use controlled components. The dashboard forms are simple enough (settings, profile) that a form library adds complexity without value.
- **No shadcn/ui CLI** -- The project already has hand-built UI components following the same pattern (Radix + CVA + Tailwind). Adding shadcn/ui CLI would conflict with the existing component structure. Copy individual component patterns as needed.
- **No Tremor** -- Built on Recharts anyway. Adds another abstraction layer and design system on top of the already-established Tailwind + Radix pattern. Just use Recharts directly.
- **No Next.js** -- The frontend is already a Vite SPA with React Router. Migrating to Next.js would be a rewrite with no benefit -- this is a vendor dashboard, not an SEO-critical marketing site. The landing page is a separate concern (can be a simple static site).

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Logging | Pino | Winston | Winston is 5x slower, synchronous by default. Pino's JSON output is more production-friendly. |
| Error tracking | Sentry | Datadog, New Relic | Sentry has a generous free tier. Datadog/New Relic are expensive for early-stage SaaS and overkill for this scale. |
| Stripe integration | @convex-dev/stripe + stripe SDK | Custom webhook handler | The Convex component eliminates webhook verification boilerplate and auto-syncs data. No reason to build this manually. |
| Charts | Recharts | Chart.js, Tremor, Victory | Recharts is React-native (no canvas), composable, massive community. Chart.js uses canvas (harder to style with Tailwind). Tremor adds unnecessary abstraction. |
| Deployment | Render.com | Railway, Fly.io, Vercel | Project constraint. Render is explicitly specified. Good fit: simple Blueprint IaC, CDN for static sites, persistent web services for webhook receiver. |
| Frontend framework | Keep Vite SPA | Next.js, Remix | Already built as Vite SPA. No SSR/SSG need for a vendor admin dashboard. Migration cost with zero benefit. |
| Subscription billing UI | Stripe Customer Portal | Custom billing pages | Stripe Customer Portal is free, hosted by Stripe, handles PCI compliance, supports plan changes/cancellation/payment updates. Building custom billing UI is a liability (PCI, edge cases, maintenance). |
| Toast notifications | Sonner | react-hot-toast, react-toastify | Sonner has better Tailwind CSS integration, smaller bundle, modern API. |

## Installation

```bash
# Backend (root package.json)
npm install stripe @sentry/node pino pino-http

# Backend dev dependencies
npm install -D pino-pretty

# Frontend (frontend/package.json)
cd frontend
npm install recharts sonner
npm install -D @types/recharts  # if needed
```

**Convex component (installed separately):**
```bash
# In root project
npm install @convex-dev/stripe
```

**Note:** `@tanstack/react-query` should only be added if Stripe Customer Portal or other non-Convex API calls are needed from the frontend. Start without it -- Convex queries may cover all dashboard data needs. Add only when you hit a concrete need.

## Environment Variables (New)

```bash
# Stripe
STRIPE_SECRET_KEY=        # sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=    # whsec_... (from Stripe Dashboard > Webhooks)
STRIPE_PUBLISHABLE_KEY=   # pk_live_... (for frontend Checkout redirect)
STRIPE_PRICE_ID_MONTHLY=  # price_... (monthly plan price ID)
STRIPE_PRICE_ID_ANNUAL=   # price_... (annual plan price ID)

# Sentry
SENTRY_DSN=               # https://...@sentry.io/...

# Logging
LOG_LEVEL=info            # debug/info/warn/error (default: info)

# Render (auto-set by Render)
PORT=                     # Render sets this automatically
RENDER=true               # Render sets this to identify the platform
```

## Version Pinning Strategy

- **Use `^` (caret) for all packages** -- allows minor/patch updates.
- **Lock file (`package-lock.json`) must be committed** -- ensures reproducible builds on Render.
- **Stripe SDK**: Pin to `^20.x` to stay on v20 major. Stripe Node SDK follows semver.
- **Sentry**: Pin to `^10.x`. v10 was a major rewrite with ESM support; avoid mixing v8/v9 patterns.

## Sources

- [Stripe Node.js SDK releases](https://github.com/stripe/stripe-node/releases) - v20.4.0 current
- [Stripe Subscription Billing docs](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Stripe Customer Portal docs](https://docs.stripe.com/customer-management)
- [@convex-dev/stripe on npm](https://www.npmjs.com/package/@convex-dev/stripe) - v0.1.3
- [Convex + Stripe integration guide](https://stack.convex.dev/stripe-with-convex)
- [Convex Stripe component page](https://www.convex.dev/components/stripe)
- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Render Node.js deployment docs](https://render.com/docs/deploy-node-express-app)
- [Pino on npm](https://www.npmjs.com/package/pino) - v10.3.1
- [Pino production logging guide](https://www.dash0.com/guides/logging-in-node-js-with-pino)
- [Sentry Node.js SDK on npm](https://www.npmjs.com/package/@sentry/node) - v10.40.0
- [Sentry Node.js setup docs](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Recharts vs alternatives](https://npmtrends.com/@tremor/react-vs-chart.js-vs-d3-vs-echarts-vs-plotly.js-vs-recharts)
