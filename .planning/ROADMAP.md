# Roadmap: WhatsApp Bokun Bot

## Overview

This roadmap takes a working WhatsApp booking chatbot and layers the commercial infrastructure needed for launch: production-grade observability, deployment on Render.com, Stripe subscription billing, a complete vendor admin dashboard with landing page, and end-to-end testing with subscription gating. The core bot logic (state machine, LLM fallback, Bokun API, multi-tenancy) is already built -- this roadmap delivers everything else needed to list on the Bokun marketplace and charge vendors.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Observability & Hardening** - Structured logging, error tracking, security hardening, and reliability improvements (completed 2026-03-01)
- [x] **Phase 2: Production Deployment** - Render.com infrastructure, environment config, Convex production deployment (completed 2026-03-02)
- [ ] **Phase 3: Billing + Ops Hardening** - Stripe webhook foundations, basic subscription state, ops hardening (Sentry validated, dead-letter/retry, rate limiting)
- [ ] **Phase 4: Dashboard, Landing Page & Profile** - Complete vendor admin UI, marketing landing page, vendor settings
- [ ] **Phase 5: Automated Test Coverage** - Automated test suite covering critical booking, isolation, and billing flows

## Phase Details

### Phase 1: Observability & Hardening
**Goal**: Every request is traceable, every error is captured, and the system degrades gracefully under failure
**Depends on**: Nothing (first phase)
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. Every log line includes tenantId and messageId as structured JSON fields, and no console.log statements remain in the codebase
  2. Unhandled exceptions in webhook processing appear in Sentry with tenant context within 60 seconds
  3. GET /health returns service status and version, and booking confirmation/cancellation events are recorded in an audit log
  4. A duplicate WhatsApp or Bokun webhook delivery produces no side effects, webhook requests with timestamps outside the tolerance window are rejected, and per-tenant rate limiting prevents message flooding
  5. Conversation and booking data older than 90 days is automatically purged by the scheduled cleanup job
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Pino logger singleton + replace all console.log/error/warn in src/ (OBS-01, OBS-05)
- [ ] 01-02-PLAN.md — Convex audit_log table + 90-day cleanup cron + schema indexes (OBS-04, INFRA-07)
- [ ] 01-03-PLAN.md — Sentry error tracking + rate limiter + webhook timestamp replay protection (OBS-02, INFRA-03, INFRA-06)
- [ ] 01-04-PLAN.md — Health endpoint enrichment + audit event wiring + INFRA-01/02/04 compliance (OBS-03, INFRA-01, INFRA-02, INFRA-04)

### Phase 2: Production Deployment
**Goal**: The application runs on Render.com with validated webhook processing and environment-driven configuration
**Depends on**: Phase 1
**Requirements**: INFRA-05, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. render.yaml defines both services (Node.js web service on Starter tier, React dashboard as static site) and a single git push triggers deployment of both
  2. All environment variables are documented per service, and switching between dev/staging/prod requires only changing the environment variable set (no code changes)
  3. Convex production deployment runs before app deploy, ensuring schema is never behind app code
  4. HMAC signature verification passes for Meta, Bokun, and Stripe webhooks immediately after deploy in the production Render environment
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — render.yaml Blueprint (both services) + .env.example files (backend + frontend) (DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, INFRA-05)
- [ ] 02-02-PLAN.md — Human checkpoint: Render setup, first deploy, HMAC webhook verification in production (DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, INFRA-05)

### Phase 3: Billing + Ops Hardening
**Goal**: Ship Stripe billing foundations (webhook verified, basic subscription state) AND production-grade ops hardening (Sentry validated end-to-end, dead-letter/retry for failed webhooks, rate limiting on all inbound endpoints). Must be deploy-safe and verified in production. No billing UI — backend and observability foundations only.
**Depends on**: Phase 2
**Requirements**: BILL-03, BILL-04, OBS-06
**Success Criteria** (what must be TRUE):
  1. POST /stripe/webhook route exists and verifies Stripe-Signature using STRIPE_WEBHOOK_SECRET; invalid signatures rejected with 403
  2. Stripe webhook events (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted) persist basic subscription state (customerId, subscriptionId, status, current_period_end) in Convex
  3. Stripe webhook processing is idempotent — duplicate delivery of the same event.id produces no duplicate state changes
  4. Sentry is wired end-to-end and proven by a test error captured in the production Sentry project (event visible in dashboard)
  5. Failed webhook events (WhatsApp, Bokun, Stripe) are stored in Convex with error reason and payload hash; basic retry/dead-letter mechanism in place
  6. Rate limiting is enforced on all inbound webhook endpoints (WhatsApp, Bokun, Stripe) with safe defaults and structured log entries on limit hits
  7. render.yaml and .env.example updated with any new Stripe vars; runbook notes added for webhook verification and troubleshooting
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Dashboard, Landing Page & Profile
**Goal**: Vendors have a complete admin dashboard to monitor their bot, a public landing page attracts new vendors, and vendors can configure their business profile
**Depends on**: Phase 3
**Requirements**: OBS-06, DASH-01, DASH-02, DASH-03, DASH-04, LAND-01, LAND-02, LAND-03, LAND-04, PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. Dashboard overview shows total messages today, bookings this week, bot on/off status, and WhatsApp connection indicator
  2. Vendor can toggle the bot on/off from the dashboard and the webhook router respects the toggle state immediately
  3. Conversation log page shows chat messages with text search and date filter, and booking list page shows WhatsApp-originated bookings with confirmation code, status, customer phone, and activity date
  4. Landing page communicates the value proposition with hero, features (4 benefits), pricing (plan tiers linked to Stripe Checkout), and is fully responsive on mobile
  5. Vendor can save business info (name, logo, contact email), select timezone (replacing hardcoded Europe/Madrid), select language (PT/EN/ES), and view current subscription status on the settings pages
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Automated Test Coverage
**Goal**: Critical booking, isolation, and billing flows are verified by automated tests before the product scales
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Automated tests cover the booking state machine happy path (select_time through confirm) and the cancellation flow triggered mid-booking
  2. Tests verify that tenant A cannot read or modify data belonging to tenant B across all critical Convex queries
  3. Unit tests cover Stripe webhook handlers for the three subscription lifecycle events (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
  4. All tests pass in CI on every push to main
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Observability & Hardening | 3/4 | Complete    | 2026-03-01 |
| 2. Production Deployment | 2/2 | Complete   | 2026-03-02 |
| 3. Billing + Ops Hardening | 0/0 | Not started | - |
| 4. Dashboard, Landing Page & Profile | 0/0 | Not started | - |
| 5. Automated Test Coverage | 0/0 | Not started | - |
