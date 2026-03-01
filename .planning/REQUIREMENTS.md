# Requirements: WhatsApp Bokun Bot

**Defined:** 2026-03-01
**Core Value:** Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure — install once via Bokun, configure channel, it works.

## v1 Requirements

Requirements for commercial launch. Each maps to roadmap phases.

### Observability

- [ ] **OBS-01**: System writes structured JSON logs using Pino with tenantId and messageId as correlation fields on every log line
- [ ] **OBS-02**: Sentry error tracking captures unhandled exceptions and forwards to Sentry project
- [ ] **OBS-03**: GET /health endpoint returns service status and version, integrated with Render health check monitoring
- [x] **OBS-04**: Audit log entries are written for booking confirmation and cancellation events (confirmationCode, tenantId, waUserId, timestamp)
- [ ] **OBS-05**: All console.log statements replaced with Pino structured equivalents
- [ ] **OBS-06**: Failed webhook events (WhatsApp, Bokun, Stripe) are persisted to Convex with error details; admin dashboard provides a simple view and manual retry capability

### Infrastructure & Reliability

- [ ] **INFRA-01**: WhatsApp and Bokun webhook processing is idempotent — duplicate delivery of the same message/event produces no side effects (dedup verified in production)
- [ ] **INFRA-02**: Every Convex query and mutation that accesses tenant data filters by tenantId derived from auth session (not from request params)
- [ ] **INFRA-03**: Per-tenant rate limiting enforced on incoming WhatsApp messages to prevent abuse
- [ ] **INFRA-04**: Bokun API unavailability results in a graceful error message to the end user rather than an unhandled exception
- [ ] **INFRA-05**: Application config supports dev/staging/prod environments via environment variable sets (no hardcoded values differ between envs)
- [ ] **INFRA-06**: Webhook requests from Meta, Bokun, and Stripe are rejected if the request timestamp is outside a configurable tolerance window (default ±5 minutes), in addition to HMAC signature verification
- [x] **INFRA-07**: Conversation messages and booking-related data older than 90 days are automatically purged via a scheduled Convex cron job (retention period is a constant, designed to be configurable per tenant in future)

### Deployment

- [ ] **DEPLOY-01**: render.yaml Blueprint defines two Render services: Node.js web service (Starter tier minimum) and React dashboard as static site
- [ ] **DEPLOY-02**: All required environment variables are documented per service with clear descriptions and examples
- [ ] **DEPLOY-03**: Convex production deployment runs before app deploy in the pipeline (schema never lags behind app code)
- [ ] **DEPLOY-04**: HMAC signature verification passes for all three webhook types (Meta, Bokun, Stripe) in the production Render environment immediately after first deploy

### Billing

- [ ] **BILL-01**: Vendor can select a Monthly or Annual subscription plan via Stripe Checkout
- [ ] **BILL-02**: New subscription includes a 14-day free trial before first charge
- [ ] **BILL-03**: Stripe webhook events checkout.session.completed, customer.subscription.updated, and customer.subscription.deleted activate/deactivate the tenant subscription status in Convex
- [ ] **BILL-04**: Stripe webhook processing is idempotent — duplicate Stripe event delivery produces no duplicate state changes
- [ ] **BILL-05**: Bot service is gated on active subscription status — vendors with cancelled or expired subscriptions receive a polite message instead of booking service (with 7-day grace period for past_due)

### Admin Dashboard

- [ ] **DASH-01**: Dashboard overview page displays: total messages today, total bookings this week, bot on/off status, and WhatsApp channel connection indicator
- [ ] **DASH-02**: Vendor can toggle the bot on or off from the dashboard; toggle state is persisted and the webhook router respects it
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
| OBS-01 | Phase 1 | Pending |
| OBS-02 | Phase 1 | Pending |
| OBS-03 | Phase 1 | Pending |
| OBS-04 | Phase 1 | Complete |
| OBS-05 | Phase 1 | Pending |
| OBS-06 | Phase 4 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 2 | Pending |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 1 | Complete |
| DEPLOY-01 | Phase 2 | Pending |
| DEPLOY-02 | Phase 2 | Pending |
| DEPLOY-03 | Phase 2 | Pending |
| DEPLOY-04 | Phase 2 | Pending |
| BILL-01 | Phase 3 | Pending |
| BILL-02 | Phase 3 | Pending |
| BILL-03 | Phase 3 | Pending |
| BILL-04 | Phase 3 | Pending |
| BILL-05 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
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
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap revision (BILL-05 moved to Phase 3 — billing and enforcement ship together)*
