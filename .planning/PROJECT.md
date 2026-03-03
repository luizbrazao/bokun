# WhatsApp Bokun Bot

## What This Is

A multi-tenant SaaS that lets Bokun activity vendors serve their customers via WhatsApp. Vendors install the app through Bokun's OAuth marketplace, configure their WhatsApp channel, and their customers can immediately search activities, check availability, answer booking questions, select time/pickup/participants, and confirm or cancel bookings — all through natural WhatsApp conversation.

The system runs a deterministic booking state machine first (fast, predictable reservation flows) with an OpenAI agent fallback for natural language understanding. All state is stored in Convex.

## Core Value

Vendors close bookings through WhatsApp without building or managing any chatbot infrastructure — they install once via Bokun, configure their channel, and it works.

## Current Milestone: v1.1 Dashboard, Launch & Testing

**Goal:** Complete the vendor-facing product surface (admin dashboard, landing page, profile/settings, billing UI) and automated test coverage required for commercial launch on the Bokun marketplace.

**Target features:**
- Vendor admin dashboard (overview stats, bot toggle, conversation log, booking list)
- Marketing landing page with hero, features, pricing tiers → Stripe Checkout CTA
- Vendor profile & settings (business info, timezone, language, subscription status)
- Billing UI — Stripe Checkout for plan selection + 14-day trial
- Subscription gating — bot disabled for expired/cancelled subscriptions
- Automated test coverage (booking flows, tenant isolation, Stripe webhook handlers)

## Requirements

### Validated

<!-- Already built and working in the codebase. -->

- ✓ Booking state machine (select_time → select_pickup → ask_participants → ask_booking_questions → confirm) — existing
- ✓ LLM fallback agent (OpenAI with Bokun tool-calling) — existing
- ✓ Bokun API integration layer (activities, availabilities, cart, reserve, confirm, cancel) — existing
- ✓ WhatsApp webhook handler with HMAC validation and deduplication — existing
- ✓ Multi-tenant architecture with full tenant isolation (Convex) — existing
- ✓ Bokun OAuth marketplace installation flow — existing
- ✓ Booking questions support (TEXT, NUMBER, DATE, BOOLEAN, SELECT) — existing
- ✓ Handoff to human operator — existing
- ✓ OpenAI API key + model per tenant configuration — existing
- ✓ Option maps with TTL (translate user input to Bokun payloads) — existing

### Active

<!-- What needs to be built to reach full commercial launch. -->

- [ ] Vendor admin dashboard fully functional (audit existing partial dashboard, complete missing screens)
- [ ] Vendor profile page (business info, logo, contact details used in WhatsApp responses)
- [ ] Vendor account & billing settings page (change password, subscription plan, billing info)
- [ ] Stripe subscription integration (per-vendor monthly/annual billing)
- [ ] Landing page — marketing site (features, pricing, CTA to install) + post-install onboarding flow
- [ ] Production deployment on Render.com (infra setup, env config, process management)
- [ ] Monitoring & observability (structured logging, error tracking, health check endpoints)
- [ ] End-to-end test suite covering the critical booking flows

### Out of Scope

- Per-booking commission model — subscription-only billing for v1
- Mobile native app — WhatsApp is the customer-facing surface, vendor management is web
- Multi-language vendor dashboard — Portuguese/English only for v1
- SMS or other messaging channels — WhatsApp only for v1
- Custom booking logic per tenant — Bokun is the source of truth for availability and pricing

## Context

- The codebase is well-structured and already handles the hard parts: state machine, Bokun API, webhook dedup, multi-tenancy.
- The admin dashboard exists but is partial — needs audit before planning work.
- A reference n8n chatbot (docs/n8n_chatbot_web_reference.json) documents the business logic baseline.
- Target: Bokun marketplace listing so vendors can install directly from Bokun's app store.
- The existing system is headless (no frontend served from the same server) — the admin dashboard likely needs to be a separate app or served from the same Node server.

## Constraints

- **Tech stack**: Node.js 18+, TypeScript 5.4, ES Modules, Convex backend — no stack changes
- **Package manager**: npm
- **Database**: Convex (serverless reactive) — no additional databases
- **Deployment**: Render.com — must work within Render's free/paid tier constraints
- **WhatsApp**: Meta Cloud API only — no third-party WhatsApp providers
- **Payments**: Stripe — subscription billing per vendor

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deterministic state machine first, LLM fallback | Booking flows need reliability; LLM covers unstructured intent | ✓ Good |
| Convex for all state | Reactive queries, no infra to manage, serverless | — Pending evaluation in prod |
| Bokun OAuth marketplace installation | Reduces onboarding friction; vendors already in Bokun ecosystem | — Pending |
| Stripe subscription per vendor | Predictable SaaS revenue; simpler than per-booking fees | — Pending |

---
*Last updated: 2026-03-03 after milestone v1.1 start*
