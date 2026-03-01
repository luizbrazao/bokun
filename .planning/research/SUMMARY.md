# Project Research Summary

**Project:** WhatsApp Bokun Bot — Production Launch
**Domain:** Multi-tenant WhatsApp SaaS for tour/activity operators (Bokun marketplace)
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

This project is a multi-tenant SaaS product that transforms a working WhatsApp booking chatbot into a commercially launchable service. The core bot logic — deterministic state machine for bookings, LLM fallback for natural language, Bokun API integration, WhatsApp webhook handling — is already built and proven. What remains is the commercial layer: subscription billing (Stripe), a vendor admin dashboard (already partially built in `frontend/`), production deployment (Render.com), and observability (Pino + Sentry). Experts build this type of product by layering commercial infrastructure on top of working product logic, not by rebuilding from scratch.

The recommended approach follows a strict dependency chain: observability first (every subsequent phase benefits from structured logging), then production deployment (Stripe webhooks need a public URL), then Stripe billing (the revenue gate), then dashboard completion (billing page and profile page), and finally subscription gating (enforcement mechanism that should only activate after billing is confirmed working end-to-end). The existing codebase is architecturally sound: the Node.js webhook server is stateless, Convex is the single source of truth, and the React dashboard connects directly to Convex without proxying through the server. This architecture should be preserved and extended, not changed.

The key risks are concentrated in two areas. First, Stripe webhook reliability: events arrive out of order, retries cause duplicate processing, and the Customer Portal triggers subscription changes that must all be handled. The mitigation is to reuse the existing `webhook_dedup` pattern from WhatsApp, always fetch current subscription state from Stripe (not just the event payload), and treat Stripe as source of truth with Convex as a cache. Second, multi-tenant data isolation in the new dashboard code: Convex has no row-level security, so every new query must filter by `tenantId` extracted from the auth session. A missed filter causes a privacy breach between competing vendors.

## Key Findings

### Recommended Stack

The existing stack (Node.js 18+, TypeScript 5.4, Convex, React 19, Vite, Tailwind CSS) is locked and requires no changes. Four additions are needed for commercial launch: `stripe` SDK + `@convex-dev/stripe` component for billing (official Convex component, eliminates webhook boilerplate), Render.com Blueprint (`render.yaml`) for infrastructure-as-code deployment (two services: Node.js web service + React static site), `pino` + `pino-http` for structured JSON logging (5x faster than Winston, JSON output works natively with Render log streams), and `@sentry/node` for error tracking (free tier covers early SaaS scale). Frontend additions are minimal: `recharts` for dashboard charts, `sonner` for toast notifications. No state management library, no form library, no shadcn/ui CLI — the existing patterns are sufficient.

**Core technologies to add:**
- `stripe` (^20.4.0) + `@convex-dev/stripe` (^0.1.3): Subscription billing — official Convex component handles webhook routing, data sync, and checkout sessions
- `render.yaml` Blueprint: Infrastructure-as-code deployment — two services from one Git repo, auto-deploy on push
- `pino` (^10.3.1) + `pino-http`: Structured logging — JSON output for Render log streams, child loggers with `tenantId`/`messageId` context
- `@sentry/node` (^10.40.0): Error tracking — unhandled exception capture, performance tracing, free tier sufficient
- `recharts` (^2.15.x): Dashboard charts — React-native, composable, avoids canvas complexity
- `sonner` (^2.x): Toast notifications — better Tailwind integration than alternatives

**What NOT to add:** Redux/Zustand (Convex handles state), React Hook Form (forms are simple), shadcn/ui CLI (conflicts with existing component structure), Next.js (Vite SPA already built, no SSR need).

### Expected Features

**Must have (table stakes — launch blockers):**
- Stripe subscription billing with plan selection (2 tiers: Starter ~EUR 29/mo, Pro ~EUR 79/mo), 14-day trial, self-service via Stripe Customer Portal
- Landing page with hero, features, pricing, and CTA to Bokun marketplace install (static, 5 sections)
- Dashboard overview page: messages today, bookings this week, bot status, WhatsApp connection indicator
- Profile/settings page: business name, timezone (currently hardcoded `Europe/Madrid`), language, bot on/off toggle
- Conversation log: read-only view of `chat_messages` with search and date filter

**Should have (differentiators — competitive advantage):**
- One-click Bokun marketplace install via OAuth (already built — this is the moat, must be marketed heavily)
- Deterministic booking state machine reliability over pure LLM (already built — market as "99% booking completion rate")
- Human handoff with conversation context (already built — market this)
- Quick replies / WhatsApp interactive messages (buttons, lists) — improves UX, reduces errors, medium effort
- Automated post-booking follow-up (24h reminder, post-activity review request) — needs scheduled message system

**Defer (v2+):**
- Booking analytics by channel (cross-channel comparison requires Bokun API integration)
- Multi-language bot responses (state machine i18n is significant effort; LLM path already handles this somewhat)
- Bot persona customization textarea (nice-to-have; default persona works at launch)
- RBAC / multi-user teams (most vendors are 1-3 people; single login per tenant is sufficient for v1)
- Payment processing through bot (Bokun handles this; reserve-for-external-payment is the correct model)

**Anti-features to explicitly avoid:** custom analytics builder, per-booking commission billing, white-label bot, multi-channel expansion (beyond WhatsApp + Telegram), custom booking flow per vendor, native mobile app.

### Architecture Approach

The system is a four-component architecture with clear boundaries: the Node.js webhook server (stateless, handles all inbound webhooks and OAuth), the React dashboard (static site, connects directly to Convex, never calls Node.js server), Convex Cloud (database + serverless functions + auth + cron jobs), and Stripe (billing, hosted Customer Portal). This architecture already exists and is correct — the commercial launch adds Stripe as a fourth managed service and two new dashboard pages. The critical architectural invariant is that the dashboard NEVER calls the Node.js server; all data access goes through Convex queries and mutations directly.

**Major components:**
1. **Node.js Webhook Server** (Render Web Service, Starter tier minimum) — WhatsApp/Bokun/Stripe webhook ingestion, HMAC validation, OAuth callbacks, subscription gating
2. **React Dashboard** (Render Static Site, free CDN) — vendor admin UI with auth, all data via ConvexReactClient, new Billing and Profile pages
3. **Convex Cloud** (managed) — single source of truth for all state including Stripe subscription data synced via webhooks
4. **Stripe** (managed) — subscription billing, Customer Portal self-service, webhook events drive Convex state updates

**Key patterns to preserve:**
- Convex as single source of truth (never cache subscription status in Node.js memory)
- Webhook forwarding pattern: validate signature in Node.js -> forward to Convex action for processing
- Subscription gating at webhook entry: check subscription status after tenant resolution, before routing to booking state machine or LLM
- Multi-tenant isolation: every Convex query filtered by `tenantId` from auth session, never from request params

### Critical Pitfalls

1. **Stripe webhook event ordering** — Events arrive out of order (e.g., `subscription.updated` before `subscription.created`). Always fetch current state from Stripe API (`stripe.subscriptions.retrieve()`) rather than relying on event payload. Reuse the existing `webhook_dedup` claim pattern from WhatsApp.

2. **Multi-tenant data leakage in dashboard** — Convex has no row-level security. A single new query missing `tenantId` filter exposes one vendor's data to another. Build a `withTenantAuth` wrapper that injects `tenantId` from auth session into every query. Add cross-tenant isolation tests.

3. **Render free tier cold starts killing webhooks** — Free tier spins down after 15 minutes. Cold starts take 30-60 seconds. WhatsApp webhooks have a 20-second timeout; Bokun webhooks have a 5-second timeout with no retry. Use Render Starter tier ($7/month) minimum for the webhook server. Never the free tier.

4. **Stripe subscription state desync** — If a Stripe webhook fails silently, Convex billing state diverges from Stripe. Treat Stripe as source of truth. Implement a daily reconciliation Convex cron job that re-syncs subscription status. Add a 5-minute cache TTL for subscription status checks to avoid hitting Stripe on every message.

5. **HMAC verification fails post-deploy** — Raw body parsing changes when moving from local dev to Render, breaking all three HMAC verifications (Meta, Bokun, Stripe). Test all three HMAC flows immediately after first deploy before going live.

## Implications for Roadmap

Based on research, the dependency chain is clear and mandates this order: observability must come first (debugging without structured logs in production is unacceptable), deployment second (Stripe webhooks need a live URL), billing third (the revenue gate), dashboard completion fourth (billing page depends on Stripe data in Convex), and subscription gating last (enforce payment only after billing is confirmed working). Five phases.

### Phase 1: Observability and Structured Logging

**Rationale:** Every subsequent phase generates production logs. Without structured logging from day one, debugging deployment issues, billing webhook failures, and multi-tenant problems is guesswork. This phase has no external dependencies and adds immediate value to the already-deployed development environment.

**Delivers:** Production-grade logging with `tenantId`/`messageId` correlation IDs, Sentry error tracking with unhandled exception capture, enhanced `/health` endpoint, replacement of all `console.log` with Pino structured JSON output.

**Addresses:** Pitfall 8 (unstructured logging insufficient for production). Enables diagnosis of all subsequent phases.

**Avoids:** The "why did vendor X's message fail?" question being unanswerable in production.

**Research flag:** No deeper research needed. Standard Pino + Sentry patterns are well-documented.

### Phase 2: Production Deployment (Render.com)

**Rationale:** Stripe webhooks require a publicly accessible endpoint with a stable URL. The dashboard needs CDN hosting. This phase establishes the production infrastructure that all subsequent phases depend on.

**Delivers:** `render.yaml` Blueprint defining two services (webhook server as Web Service on Starter tier, React dashboard as Static Site), all environment variables documented per service, Convex production deployment (`npx convex deploy`), validated HMAC verification for all three webhook types (Meta, Bokun, and Stripe endpoint registered but not yet live), health check integrated with Render monitoring.

**Uses:** Render.com Blueprint spec, Node.js 20 LTS (upgrade from 18 for production longevity).

**Avoids:** Pitfall 4 (free tier cold starts), Pitfall 7 (HMAC verification failure post-deploy), Pitfall 12 (env var mismanagement — use Render Environment Groups), Pitfall 14 (schema deployment drift — Convex deploy before app deploy in pipeline).

**Research flag:** No deeper research needed. Render Blueprint patterns are well-documented.

### Phase 3: Stripe Billing Integration

**Rationale:** This is the revenue gate. Without billing, the product cannot be monetized. After deployment provides a public Stripe webhook endpoint, this phase wires up the full subscription lifecycle.

**Delivers:** `@convex-dev/stripe` component installed and configured, Stripe Products/Prices defined (Starter and Pro tiers, monthly + annual), Checkout Session flow (vendor selects plan -> Stripe Checkout -> payment -> subscription activated in Convex), Customer Portal link in Settings page (self-service plan changes/cancellation/invoice history), handling of all subscription lifecycle events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`), Stripe webhook idempotency using the existing `webhook_dedup` claim pattern, daily reconciliation Convex cron for subscription state sync.

**Uses:** `stripe` SDK (^20.4.0), `@convex-dev/stripe` (^0.1.3), new Convex tables managed by component (`stripe_customers`, `stripe_subscriptions`).

**Avoids:** Pitfall 1 (event ordering — always fetch from Stripe API), Pitfall 2 (idempotency — reuse dedup pattern), Pitfall 6 (state desync — daily reconciliation), Pitfall 10 (Customer Portal bypasses UI — handle all portal-triggered events).

**Research flag:** Needs attention during implementation. Stripe webhook event ordering is subtle. Verify `@convex-dev/stripe` component handles order-independence, or add custom fetch-from-Stripe logic. Test full portal cancellation flow before shipping.

### Phase 4: Dashboard Completion

**Rationale:** Vendors need two missing dashboard pages to manage their subscription and business profile. These depend on Stripe data being available in Convex (from Phase 3) and the dashboard being deployed (from Phase 2).

**Delivers:** `BillingPage.tsx` (current plan, next billing date, upgrade/downgrade CTA, link to Stripe Customer Portal, payment status), `ProfilePage.tsx` (business name, logo URL, contact email, timezone dropdown replacing hardcoded `Europe/Madrid`, language preference dropdown for PT/EN/ES), dashboard KPI charts with `recharts` on the existing OverviewPage, `sonner` toast notifications for user actions across the dashboard.

**Uses:** Convex queries for subscription status, `recharts` (^2.15.x), `sonner` (^2.x).

**Avoids:** Pitfall 3 (multi-tenant data leakage — `withTenantAuth` wrapper on every new Convex query, cross-tenant integration test).

**Research flag:** Auth layer evaluation needed. Pitfall 5 flags `@convex-dev/auth` as pre-1.0 beta. During this phase, confirm the existing auth implementation is sufficient for vendor email+password login, or plan a Clerk migration path. The auth abstraction should be in place before adding billing-sensitive dashboard pages.

### Phase 5: Subscription Gating and Access Control

**Rationale:** This is the enforcement mechanism — it closes the loop between payment and service access. It must come last because it depends on Stripe subscription status being reliable in Convex (only verified after Phase 3 is tested and stable). Shipping gating too early, before billing is confirmed working, risks blocking paying vendors.

**Delivers:** Subscription status check in the webhook processing pipeline (after tenant resolution, before routing to booking state machine or LLM), grace period logic for `past_due` status (7 days with vendor warning), hard cutoff for `canceled` status (polite end-user message, no Bokun API calls), 5-minute TTL subscription status cache in Convex to avoid Stripe API calls on every message, bot on/off toggle in dashboard wired to a `tenants.botEnabled` flag checked at the same gate.

**Avoids:** Pitfall 13 (bot continues working for unpaying vendors), resource consumption (OpenAI/Bokun API calls) for non-paying tenants.

**Research flag:** No deeper research needed. The pattern is well-established and the implementation is straightforward given the existing webhook processing pipeline.

### Phase Ordering Rationale

- Observability before everything: impossible to debug production issues without structured logs. Every other phase generates logs that need to be traceable.
- Deployment before Stripe: Stripe webhook registration requires a live public URL. Cannot configure Stripe webhooks pointing to `localhost`.
- Stripe before dashboard completion: the Billing page queries Stripe subscription data from Convex. That data does not exist until Phase 3 runs.
- Dashboard completion before gating: vendors need to be able to subscribe (Phase 4 billing page) before the system can gate on subscription status. Gating before the billing UI exists means vendors cannot pay even if they want to.
- Gating last: this is enforcement, not enablement. Ship it after the billing flow is validated end-to-end, not before.

### Research Flags

Phases needing deeper research or careful implementation attention:
- **Phase 3 (Stripe Billing):** Stripe webhook event ordering is a known post-mortem source. Verify `@convex-dev/stripe` handles it, or add custom guard. Test full Customer Portal cancellation -> webhook -> Convex state update -> dashboard update flow before shipping.
- **Phase 4 (Dashboard Completion):** Evaluate `@convex-dev/auth` stability (v0.0.90, pre-1.0) for vendor-facing billing-connected auth. Decide on Clerk migration path now or accept current auth for v1.

Phases with standard patterns (research not required):
- **Phase 1 (Observability):** Pino + Sentry patterns are universally documented and straightforward.
- **Phase 2 (Deployment):** Render Blueprint spec is clear. Two-service deployment from one repo is a documented pattern.
- **Phase 5 (Gating):** Subscription check in webhook pipeline is a single Convex query call at a known insertion point.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions are official packages with official Convex component support. Stripe SDK v20 and Sentry v10 are current stable majors. Render deployment is documented with Blueprint spec. |
| Features | HIGH | Feature landscape is well-researched from Stripe SaaS docs, B2B SaaS landing page patterns, and tour operator market analysis. Pricing tiers are based on competitor benchmarking. |
| Architecture | HIGH | Architecture research is grounded in the existing codebase (HIGH confidence source). Convex + Stripe integration uses the official Convex component with documented patterns. Component boundaries and dependency chain are clear. |
| Pitfalls | HIGH | Most pitfalls are HIGH confidence from official Stripe docs and confirmed by multiple post-mortems. Render cold start behavior is extensively documented in community forums. Multi-tenant data leakage is a universally documented pattern. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@convex-dev/auth` stability:** The auth package is pre-1.0 (v0.0.90). The dashboard already uses it for auth (existing pages work). The question is whether it is sufficient for a billing-connected vendor dashboard long-term, or whether a migration to Clerk should be planned. Recommend evaluating at Phase 4 start. If auth is already working for existing dashboard users, the practical risk for v1 is low.

- **Stripe event ordering with `@convex-dev/stripe`:** Research recommends always fetching current subscription state from Stripe API rather than relying on event payload. Needs verification of whether `@convex-dev/stripe` handles this internally or requires custom guards. Check the component's source code at implementation time.

- **Timezone hardcoding (`Europe/Madrid`):** Currently hardcoded in `availabilityNormalizer.ts`. The Profile page should expose a timezone dropdown stored on the tenant. The exact refactoring path (which files to touch) needs scoping at Phase 4 implementation.

- **Render environment variable strategy:** Render Environment Groups should be set up at Phase 2 to avoid the copy-paste pitfall. Document the authoritative per-service variable list at that time, before Stripe secrets are added.

## Sources

### Primary (HIGH confidence)
- Stripe Node.js SDK releases — v20.4.0 current stable, subscription billing patterns
- Stripe Customer Portal docs — portal integration and event handling
- Stripe Subscription Billing docs — webhook events, idempotency
- `@convex-dev/stripe` on npm (v0.1.3) — official Convex component
- Convex + Stripe integration guide (stack.convex.dev) — official Convex documentation
- Render.com Blueprint YAML Reference — infrastructure-as-code deployment spec
- Render.com service types and pricing docs — free tier limitations confirmed
- Existing codebase (`frontend/src/App.tsx`, `convex/schema.ts`, `convex/auth.ts`, `src/server.ts`) — HIGH confidence source for architecture decisions

### Secondary (MEDIUM confidence)
- Pino production logging guide (dash0.com) — structured logging patterns for Node.js
- Sentry Node.js setup docs — error tracking configuration
- B2B SaaS landing page best practices (Instapage, SaaS Hero) — feature and content guidance
- Convex Auth security docs — auth beta status and limitations
- Render community forums — cold start behavior confirmation
- Tour operator software market (Capterra) — vendor expectation benchmarking

### Tertiary (LOW confidence)
- Chat Architect: testing WhatsApp integrations — E2E testing patterns for chatbot flows (sparse documentation, verify during Phase implementation)

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
