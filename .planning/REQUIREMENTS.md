# Requirements: WhatsApp Bokun Bot

**Defined:** 2026-03-01
**Core Value:** Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure — install once via Bokun, configure channel, it works.

## v1 Requirements

Requirements for commercial launch. Each maps to roadmap phases.

### Observability

- [x] **OBS-01**: System writes structured JSON logs using Pino with tenantId and messageId as correlation fields on every log line
- [x] **OBS-02**: Sentry error tracking captures unhandled exceptions and forwards to Sentry project
- [x] **OBS-03**: GET /health endpoint returns service status and version, integrated with Render health check monitoring
- [x] **OBS-04**: Audit log entries are written for booking confirmation and cancellation events (confirmationCode, tenantId, waUserId, timestamp)
- [x] **OBS-05**: All console.log statements replaced with Pino structured equivalents
- [ ] **OBS-06**: Failed webhook events (WhatsApp, Bokun, Stripe) are persisted to Convex with error details; admin dashboard provides a simple view and manual retry capability
  - [x] **OBS-06a** (Phase 3 — storage): failed_webhooks Convex table + write sites in all three webhook handlers + cleanup cron. Storage layer only.
  - [ ] **OBS-06b** (Phase 4 — UI): Admin dashboard page showing failed_webhooks records with manual retry capability. Depends on OBS-06a.

### Infrastructure & Reliability

- [x] **INFRA-01**: WhatsApp and Bokun webhook processing is idempotent — duplicate delivery of the same message/event produces no side effects (dedup verified in production)
- [x] **INFRA-02**: Every Convex query and mutation that accesses tenant data filters by tenantId derived from auth session (not from request params)
- [x] **INFRA-03**: Per-tenant rate limiting enforced on incoming WhatsApp messages to prevent abuse
- [x] **INFRA-04**: Bokun API unavailability results in a graceful error message to the end user rather than an unhandled exception
- [x] **INFRA-05**: Application config supports dev/staging/prod environments via environment variable sets (no hardcoded values differ between envs)
- [x] **INFRA-06**: Webhook requests from Meta, Bokun, and Stripe are rejected if the request timestamp is outside a configurable tolerance window (default ±5 minutes), in addition to HMAC signature verification
- [x] **INFRA-07**: Conversation messages and booking-related data older than 90 days are automatically purged via a scheduled Convex cron job (retention period is a constant, designed to be configurable per tenant in future)

### Deployment

- [x] **DEPLOY-01**: render.yaml Blueprint defines two Render services: Node.js web service (Starter tier minimum) and React dashboard as static site
- [x] **DEPLOY-02**: All required environment variables are documented per service with clear descriptions and examples
- [x] **DEPLOY-03**: Convex production deployment runs before app deploy in the pipeline (schema never lags behind app code)
- [x] **DEPLOY-04**: HMAC signature verification passes for Meta (WhatsApp) and Bokun webhook types in the production Render environment immediately after first deploy. Stripe webhook HMAC verification is deferred to Phase 3 (billing); `STRIPE_WEBHOOK_SECRET` is declared as a placeholder in `render.yaml` and `.env.example`

### Billing

- [ ] **BILL-01**: Vendor can select a Monthly or Annual subscription plan via Stripe Checkout
- [ ] **BILL-02**: New subscription includes a 7-day free trial before first charge
- [x] **BILL-03**: Stripe webhook events checkout.session.completed, customer.subscription.updated, and customer.subscription.deleted activate/deactivate the tenant subscription status in Convex
- [x] **BILL-04**: Stripe webhook processing is idempotent — duplicate Stripe event delivery produces no duplicate state changes
- [ ] **BILL-05**: Bot service is gated on active subscription status — vendors with cancelled or expired subscriptions receive a polite message instead of booking service (with 7-day grace period for past_due)

### Admin Dashboard

- [x] **DASH-01**: Dashboard overview page displays: total messages today, total bookings this week, bot on/off status, and WhatsApp channel connection indicator
- [x] **DASH-02**: Vendor can toggle the bot on or off from the dashboard; toggle state is persisted and the webhook router respects it
- [ ] **DASH-03**: Conversation log page displays chat_messages for the authenticated tenant, supports text search and date range filter, and is paginated
- [ ] **DASH-04**: Booking list page displays WhatsApp-originated bookings with confirmation code, booking status, customer phone number, and activity date

### Landing Page

- [ ] **LAND-01**: Landing page hero section communicates the core value proposition and includes a primary CTA button linking to the Bokun marketplace listing
- [ ] **LAND-02**: Landing page features section describes 4 key product benefits with icons
- [ ] **LAND-03**: Landing page pricing section shows plan tiers with feature comparison and links each tier to the Stripe Checkout flow
- [ ] **LAND-04**: Landing page is fully responsive and readable on mobile devices

### Profile & Settings

- [ ] **PROF-01**: Vendor can save business info (name, logo URL, contact email) through a settings form; changes persist to the tenants table
- [ ] **PROF-02**: Vendor can select their timezone from a dropdown; selected timezone replaces the hardcoded Europe/Madrid value used in availability formatting
- [ ] **PROF-03**: Vendor can select their preferred language (Portuguese, English, or Spanish); preference is stored and used in the LLM system prompt and hardcoded bot messages
- [ ] **PROF-04**: Settings billing page shows current subscription plan, next billing date, and subscription status (active/trial/past_due/cancelled)

### Testing

- [ ] **TEST-01**: Automated tests cover the booking state machine happy path: select_time → select_pickup → ask_participants → confirm
- [ ] **TEST-02**: Automated tests cover the cancellation flow triggered mid-booking
- [ ] **TEST-03**: Tests verify that tenant A cannot read or modify data belonging to tenant B across all critical Convex queries
- [ ] **TEST-04**: Unit tests cover Stripe webhook handlers for the three subscription lifecycle events

## v2 Requirements

Deferred to v1.1 or v2. Acknowledged but not in current roadmap.

### Billing

- **BILL-V2-01**: Stripe Customer Portal link for self-service plan changes, cancellation, and invoice history
- **BILL-V2-02**: Upgrade/downgrade flow with proration handling

### Admin Dashboard

- **DASH-V2-01**: KPI charts using recharts on the overview page (line/bar graphs for message and booking trends)

### Landing Page

- **LAND-V2-01**: Social proof section (testimonials, early adopter logos, "X bookings processed" counter)
- **LAND-V2-02**: "How it works" step-by-step walkthrough section

### Profile & Settings

- **PROF-V2-01**: Bot persona customization textarea (custom instructions appended to the LLM system prompt with character limit and preview mode)

### WhatsApp UX

- **WA-V2-01**: Use WhatsApp interactive message types (buttons, list pickers) in booking flow instead of plain text
- **WA-V2-02**: Automated post-booking follow-up: 24h activity reminder + post-activity review request

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe Customer Portal (v1) | Deferred to v1.1 — Checkout is sufficient for launch |
| Per-booking commission billing | Complexity; flat subscription is simpler and sufficient |
| RBAC / multi-user per tenant | Most vendors are 1-3 people; single login per tenant for v1 |
| Multiple WhatsApp numbers per tenant | Single channel per tenant sufficient for v1 |
| Native mobile app for vendors | Responsive web dashboard works on mobile for v1 |
| White-label bot branding | High effort, low value for v1; vendor name customizable via profile |
| Multi-channel (SMS, Instagram) | WhatsApp only for v1; add channels after PMF confirmed |
| Custom booking flow per tenant | Bokun is source of truth for flow logic; no per-vendor overrides |
| Payment processing through bot | Bokun handles payments; reserve-for-external-payment is correct model |
| Booking analytics by channel | Requires Bokun API channel tagging; post-launch feature |
| i18n for booking state machine messages | LLM path handles language detection; state machine en/pt/es only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OBS-01 | Phase 1 | Complete |
| OBS-02 | Phase 1 | Complete |
| OBS-03 | Phase 1 | Complete |
| OBS-04 | Phase 1 | Complete |
| OBS-05 | Phase 1 | Complete |
| OBS-06a (storage layer) | Phase 3 | Complete |
| OBS-06b (admin UI + retry) | Phase 4 | Pending |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 2 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| DEPLOY-01 | Phase 2 | Complete |
| DEPLOY-02 | Phase 2 | Complete |
| DEPLOY-03 | Phase 2 | Complete |
| DEPLOY-04 | Phase 2 | Complete |
| BILL-01 | Phase 4 | Pending |
| BILL-02 | Phase 4 | Pending |
| BILL-03 | Phase 3 | Complete |
| BILL-04 | Phase 3 | Complete |
| BILL-05 | Phase 5 | Pending |
| DASH-01 | Phase 4 | Complete |
| DASH-02 | Phase 4 | Complete |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| LAND-01 | Phase 4 | Pending |
| LAND-02 | Phase 4 | Pending |
| LAND-03 | Phase 4 | Pending |
| LAND-04 | Phase 4 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 38 total (OBS-06 spans two phases via sub-requirements OBS-06a and OBS-06b)
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-03 — BILL-01/BILL-02 moved from Phase 3 → Phase 4; BILL-05 moved Phase 3 → Phase 5 (Phase 3 scope was narrowed to billing foundations only); milestone v1.1 started*
*Last updated: 2026-03-03 — BILL-02 corrected from 14-day to 7-day free trial to match CONTEXT.md locked decision*
