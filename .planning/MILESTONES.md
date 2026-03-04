# Milestones: WhatsApp Bokun Bot

## v1.0 — MVP

**Completed:** 2026-03-04
**Phases:** 1–5 (15 plans, 95 commits)
**LOC:** ~11,400 TypeScript (src/ + convex/)
**Tests:** 51 automated tests (7 test files)
**Timeline:** 2026-03-01 → 2026-03-04 (4 days)

### What Shipped

**Phase 1: Observability & Hardening**
- Pino structured JSON logging — every log line includes tenantId, messageId, providerMessageId
- All 13+ console.log calls replaced with structured pino equivalents
- Sentry error tracking with tenant context (validated in production dashboard)
- GET /health endpoint with service status and version
- Audit log: booking confirmation/cancellation events with 365-day retention
- Webhook replay protection (±5 min tolerance window) + per-tenant rate limiting
- 90-day conversation/booking data auto-purge via Convex cron

**Phase 2: Production Deployment**
- render.yaml Blueprint: Node.js web service (Starter tier) + React static site
- Complete .env.example documentation for all environment variables per service
- Convex production deployment as pre-deploy step (schema never lags)
- HMAC signature verification validated in production for Meta and Bokun webhooks

**Phase 3: Billing + Ops Hardening**
- POST /stripe/webhook with Stripe-Signature HMAC verification
- Stripe subscription state persisted (checkout, subscription.updated, subscription.deleted)
- Idempotent Stripe event processing (stripe_event_dedup table)
- Dead-letter table (failed_webhooks) for all three webhook sources
- Two-tier rate limiting: per-user inbound + per-source server webhooks
- Sentry E2E validated in production dashboard

**Phase 4: Dashboard, Landing Page & Profile**
- Vendor admin dashboard: overview stats, bot on/off toggle, conversation log, booking list
- Failed webhooks page with manual retry capability
- Marketing landing page: hero, 4 feature blocks, pricing tiers → Stripe Checkout
- Vendor settings: business info, timezone selector, language (PT/EN/ES), subscription status
- Stripe Checkout integration (Monthly/Annual plans, 7-day free trial)
- OpenAI API key per tenant with model selection

**Phase 5: Automated Test Coverage**
- Vitest infrastructure: ESM/TypeScript, GitHub Actions CI, `npm test` script
- 51 tests across 7 files: booking state machine routing, cancellation flow, option map builder
- Subscription gating: `isSubscriptionGated()` in router with 7-day grace period for `past_due`
- Tenant isolation tests: cross-tenant data boundary validation
- Stripe webhook handler unit tests: 7 cases including idempotency and tenant-not-found

### Requirements Completed

38/38 v1 requirements — complete:
OBS-01–06, INFRA-01–07, DEPLOY-01–04, BILL-01–05,
DASH-01–04, LAND-01–04, PROF-01–04, TEST-01–04

---
