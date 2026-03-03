# Milestones: WhatsApp Bokun Bot

## v1.0 — Foundation & Deploy

**Completed:** 2026-03-03
**Phases:** 1–3 (last phase: 3)

### What Shipped

**Phase 1: Observability & Hardening**
- Pino structured JSON logging replacing all console.log/error/warn
- Sentry error tracking with tenant context
- GET /health endpoint with service status and version
- Audit log (booking confirmation/cancellation events, 365-day retention)
- Webhook replay protection (±5 min tolerance window)
- Per-tenant rate limiting on incoming WhatsApp messages
- 90-day conversation/booking data cleanup cron

**Phase 2: Production Deployment**
- render.yaml Blueprint (Node.js web service on Starter tier + React static site)
- Complete .env.example for backend and frontend services
- Convex production deployment (preDeployCommand)
- HMAC signature verification validated in production for Meta and Bokun webhooks

**Phase 3: Billing + Ops Hardening**
- POST /stripe/webhook with Stripe-Signature HMAC verification
- Stripe subscription state persisted in Convex (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
- Stripe event deduplication (stripe_event_dedup table)
- Dead-letter table (failed_webhooks) for all three webhook sources (WhatsApp, Bokun, Stripe)
- Two-tier rate limiting (per-user inbound + per-source server webhooks)
- POST /admin/sentry-test endpoint + Sentry E2E validated in production dashboard
- render.yaml and .env.example updated with Stripe vars + runbook notes

### Requirements Completed in v1.0

OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06a,
INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07,
DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04,
BILL-03, BILL-04

---
