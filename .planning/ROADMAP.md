# Roadmap: WhatsApp Bokun Bot

## Overview

This roadmap takes a working WhatsApp booking chatbot and layers the commercial infrastructure needed for launch: production-grade observability, deployment on Render.com, Stripe subscription billing, a complete vendor admin dashboard with landing page, and end-to-end testing with subscription gating. The core bot logic (state machine, LLM fallback, Bokun API, multi-tenancy) is already built -- this roadmap delivers everything else needed to list on the Bokun marketplace and charge vendors.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Observability & Hardening** - Structured logging, error tracking, security hardening, and reliability improvements
- [ ] **Phase 2: Production Deployment** - Render.com infrastructure, environment config, Convex production deployment
- [ ] **Phase 3: Stripe Billing & Subscription Enforcement** - Subscription plans, checkout flow, webhook processing, trial support, and access gating
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
- [ ] 01-01-PLAN.md — Pino logger singleton + replace all console.log/error/warn in src/ (OBS-01, OBS-05)
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
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Stripe Billing & Subscription Enforcement
**Goal**: Vendors can subscribe to a paid plan with a free trial, their subscription lifecycle is tracked reliably, and non-paying vendors are immediately blocked from bot service
**Depends on**: Phase 2
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. A vendor can select Monthly or Annual plan and complete payment through Stripe Checkout
  2. New subscriptions start with a 14-day free trial before the first charge
  3. Stripe webhook events (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted) correctly update tenant subscription status in Convex
  4. Duplicate delivery of the same Stripe webhook event produces no duplicate state changes
  5. Vendors with cancelled or expired subscriptions receive a polite message instead of booking service, with a 7-day grace period for past_due status
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
| 1. Observability & Hardening | 1/4 | In Progress|  |
| 2. Production Deployment | 0/0 | Not started | - |
| 3. Stripe Billing & Subscription Enforcement | 0/0 | Not started | - |
| 4. Dashboard, Landing Page & Profile | 0/0 | Not started | - |
| 5. Automated Test Coverage | 0/0 | Not started | - |
