# WhatsApp Bokun Bot

## What This Is

A multi-tenant SaaS that lets Bokun activity vendors serve their customers via WhatsApp. Vendors install the app through Bokun's OAuth marketplace, configure their WhatsApp channel, and their customers can immediately search activities, check availability, answer booking questions, select time/pickup/participants, and confirm or cancel bookings — all through natural WhatsApp conversation.

The system runs a deterministic booking state machine first (fast, predictable reservation flows) with an OpenAI agent fallback for natural language understanding. All state is stored in Convex. The vendor-facing surface is a React admin dashboard served at the same origin.

**Shipped v1.0:** Full commercial launch infrastructure — production deployment on Render.com, Stripe subscription billing, vendor admin dashboard + landing page, and 51 automated tests.

## Core Value

Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure — they install once via Bokun, configure their channel, and it works.

## Requirements

### Validated

- ✓ Booking state machine (select_time → select_pickup → ask_participants → ask_booking_questions → confirm) — existing pre-v1.0
- ✓ LLM fallback agent (OpenAI with Bokun tool-calling) — existing pre-v1.0
- ✓ Bokun API integration layer (activities, availabilities, cart, reserve, confirm, cancel) — existing pre-v1.0
- ✓ WhatsApp webhook handler with HMAC validation and deduplication — existing pre-v1.0
- ✓ Multi-tenant architecture with full tenant isolation (Convex) — existing pre-v1.0
- ✓ Bokun OAuth marketplace installation flow — existing pre-v1.0
- ✓ Booking questions support (TEXT, NUMBER, DATE, BOOLEAN, SELECT) — existing pre-v1.0
- ✓ Handoff to human operator — existing pre-v1.0
- ✓ OpenAI API key + model per tenant configuration — existing pre-v1.0
- ✓ Option maps with TTL (translate user input to Bokun payloads) — existing pre-v1.0
- ✓ Structured JSON logging (Pino) with tenantId/messageId/providerMessageId correlation — v1.0
- ✓ Sentry error tracking with tenant context — v1.0
- ✓ Production deployment on Render.com (render.yaml Blueprint) — v1.0
- ✓ Stripe subscription billing (Monthly/Annual, 7-day free trial, idempotent webhook processing) — v1.0
- ✓ Subscription gating with 7-day grace period for past_due — v1.0
- ✓ Vendor admin dashboard (overview, bot toggle, conversation log, booking list, failed webhooks) — v1.0
- ✓ Marketing landing page with Stripe Checkout CTA — v1.0
- ✓ Vendor settings (business info, timezone, language, subscription status) — v1.0
- ✓ Automated test suite: 51 tests, CI on every push to main — v1.0

### Active

<!-- Next milestone priorities. -->

- [ ] Stripe Customer Portal link for self-service plan management (BILL-V2-01)
- [ ] KPI charts on overview dashboard (messages/bookings trend graphs) (DASH-V2-01)
- [ ] WhatsApp interactive messages (buttons, list pickers) in booking flow (WA-V2-01)
- [ ] Post-booking follow-up: 24h activity reminder + review request (WA-V2-02)
- [ ] Social proof section on landing page (testimonials, booking counter) (LAND-V2-01)

### Out of Scope

- Per-booking commission model — subscription-only billing
- Mobile native app — WhatsApp is the customer-facing surface, vendor management is web
- RBAC / multi-user per tenant — single login per tenant sufficient for v1.x
- Multiple WhatsApp numbers per tenant — single channel per tenant
- Multi-channel (SMS, Instagram) — WhatsApp only until PMF confirmed
- Custom booking flow per tenant — Bokun is source of truth for availability and pricing
- Payment processing through bot — Bokun handles payments (reserve-for-external-payment)

## Context

**Current state (post-v1.0):**
- 11,400 LOC TypeScript (src/ + convex/), 51 automated tests, 95 commits
- Production: Render.com (Node.js backend + React static site) + Convex cloud
- Stripe integration live, dashboard functional, landing page published
- CI: GitHub Actions runs `npm test` on push/PR to main

**Known technical debt:**
- REQUIREMENTS.md archived — fresh requirements needed for v1.1 milestone
- Phase ROADMAP details archived to `.planning/milestones/v1.0-ROADMAP.md`

## Constraints

- **Tech stack**: Node.js 18+, TypeScript 5.4, ES Modules, Convex backend — no stack changes
- **Package manager**: npm
- **Database**: Convex (serverless reactive) — no additional databases
- **Deployment**: Render.com
- **WhatsApp**: Meta Cloud API only
- **Payments**: Stripe — subscription billing per vendor

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deterministic state machine first, LLM fallback | Booking flows need reliability; LLM covers unstructured intent | ✓ Good — zero booking flow bugs |
| Convex for all state | Reactive queries, no infra to manage, serverless | ✓ Good — simple mutations, real-time dashboard |
| Bokun OAuth marketplace installation | Reduces onboarding friction; vendors already in Bokun ecosystem | ✓ Good — single-click install flow |
| Stripe subscription per vendor (not per-booking) | Predictable SaaS revenue; simpler than per-booking fees | ✓ Good — simple model, straightforward webhook handling |
| render.yaml Blueprint for both services | One git push deploys both Node.js backend + React dashboard | ✓ Good — validated in production |
| 7-day grace period for past_due subscriptions | Avoid blocking vendors mid-billing cycle | ✓ Good — implemented in isSubscriptionGated() |
| Vitest for testing (not Jest) | ESM/TypeScript native support, no tsconfig needed | ✓ Good — zero config friction |

---
*Last updated: 2026-03-04 after v1.0 milestone*
