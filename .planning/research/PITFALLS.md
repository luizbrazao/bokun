# Domain Pitfalls

**Domain:** Multi-tenant WhatsApp SaaS -- commercial launch additions (Stripe billing, vendor dashboard, production deployment, observability, E2E testing)
**Researched:** 2026-03-01

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security breaches.

### Pitfall 1: Stripe Webhook Events Arrive Out of Order

**What goes wrong:** Stripe does NOT guarantee event delivery order. A `customer.subscription.updated` event can arrive before `customer.subscription.created`. Code that assumes "create then update" sequence will fail silently -- the update handler looks up a subscription that does not exist yet, drops the event, and the tenant's billing state becomes permanently wrong.

**Why it happens:** Stripe uses independent delivery queues per event type. Network latency and retries compound the ordering problem.

**Consequences:** Tenants appear on wrong plan or no plan at all. Vendors who paid are blocked from using the service. Manual Stripe dashboard intervention required per affected tenant.

**Prevention:**
- When processing any subscription event, always fetch the current subscription state from Stripe API (`stripe.subscriptions.retrieve(subscriptionId)`) rather than relying solely on the event payload.
- If a referenced object does not exist locally, create it from the fetched Stripe data before applying the update.
- Store `stripeSubscriptionId` and `stripeCustomerId` on the `tenants` table. Use the Stripe object as source of truth, local DB as cache.

**Detection:** Monitor for "subscription not found" errors in webhook handler logs. Alert if any Stripe webhook returns a non-2xx response.

**Phase:** Stripe billing integration.

**Confidence:** HIGH -- documented by Stripe and confirmed by multiple post-mortems.

### Pitfall 2: Stripe Webhook Idempotency Not Implemented

**What goes wrong:** Stripe retries failed webhooks for up to 3 days. Without idempotency, a single `invoice.payment_succeeded` event processed twice creates duplicate subscription activations, sends duplicate welcome emails, or double-counts revenue metrics.

**Why it happens:** Developers return 200 after processing but before persisting the event ID. If the server crashes between processing and acknowledgment, Stripe retries and the handler re-executes the side effects.

**Consequences:** Duplicate charges surfaced to vendors. Broken trust. Manual cleanup in Stripe dashboard.

**Prevention:**
- Store processed `event.id` values in a Convex table (`stripe_webhook_events`) with TTL.
- Check for existing `event.id` BEFORE any processing. Return 200 immediately if already seen.
- This project already has a `webhook_dedup` table pattern for WhatsApp -- reuse the same "claim" mutation pattern for Stripe events.

**Detection:** Log every Stripe event ID received. Alert on duplicate event IDs that pass the dedup check.

**Phase:** Stripe billing integration.

**Confidence:** HIGH -- Stripe's own documentation explicitly warns about this.

### Pitfall 3: Multi-Tenant Data Leakage in Vendor Dashboard

**What goes wrong:** A dashboard query forgets `tenantId` filtering, or a frontend route allows one vendor to see another vendor's bookings, conversations, or billing data.

**Why it happens:** Convex has no row-level security at the database layer. Every query and mutation must manually filter by `tenantId`. A single missed filter in a new dashboard query leaks data. The existing codebase already has this discipline for WhatsApp handlers, but new dashboard code written by a different mindset (UI-first) may skip it.

**Consequences:** GDPR/privacy violation. Loss of vendor trust. Potentially catastrophic for a marketplace app where vendors are competitors.

**Prevention:**
- Every Convex query/mutation for the dashboard MUST receive `tenantId` from the authenticated session, never from the client request body or URL params.
- Create a `withTenantAuth` wrapper function that extracts `tenantId` from the auth session and injects it into every query -- make it impossible to call a query without tenant scoping.
- Add integration tests that attempt cross-tenant data access and assert failure.
- Review every new Convex function: if it does not filter by `tenantId`, it must not ship.

**Detection:** Periodic audit of all Convex queries. Automated test that creates two tenants and verifies complete isolation.

**Phase:** Vendor dashboard.

**Confidence:** HIGH -- this is the most common multi-tenant security flaw. The existing codebase handles it well for the bot, but new dashboard code is fresh attack surface.

### Pitfall 4: Render.com Free Tier Sleeps After 15 Minutes of Inactivity

**What goes wrong:** On Render's free tier, the service spins down after 15 minutes of no inbound requests. When Meta sends a WhatsApp webhook during sleep, the cold start takes 30-60 seconds. Meta expects a 200 response quickly (within seconds) and will retry, potentially causing duplicate processing or marking the webhook endpoint as unhealthy.

**Why it happens:** Render free tier conserves resources by suspending idle services. WhatsApp webhook traffic is bursty -- a vendor may have no messages for hours, then receive several in a burst.

**Consequences:** Missed or delayed WhatsApp messages. Meta may disable the webhook endpoint after repeated timeouts. Vendors see the bot as unreliable.

**Prevention:**
- Use Render's Starter tier ($7/month) minimum, which keeps services always-on.
- Even on paid tier, set `server.keepAliveTimeout` and `server.headersTimeout` to at least 120000ms.
- Implement a `/health` endpoint and configure Render's health check to ping it.
- Consider a lightweight cron ping (every 5 minutes) as defense-in-depth even on paid tier.

**Detection:** Monitor webhook response times. Alert if any webhook takes more than 5 seconds to acknowledge.

**Phase:** Production deployment.

**Confidence:** HIGH -- extensively documented in Render community forums and confirmed by multiple developers.

### Pitfall 5: Convex Auth for Dashboard is Still Beta

**What goes wrong:** `@convex-dev/auth` (v0.0.90 in current stack) is pre-1.0 beta. It lacks SSO, MFA, and may have breaking changes between minor versions. Building a vendor dashboard login on top of it means the auth layer could break on any Convex dependency update.

**Why it happens:** Convex Auth is relatively new. The project already depends on it (v0.0.90), but has not yet built user-facing auth flows (the current system is machine-to-machine via OAuth and API keys).

**Consequences:** Vendors locked out of dashboard after a Convex update. No MFA means weaker security for a billing-connected dashboard. Migration pain if switching to Clerk/Auth0 later.

**Prevention:**
- Evaluate whether the existing `@convex-dev/auth` is sufficient for vendor login (email + password minimum).
- If vendor dashboard needs SSO or MFA (likely for enterprise vendors), plan for Clerk or Auth0 integration from the start rather than migrating later.
- Abstract auth behind an interface so the provider can be swapped without rewriting dashboard components.
- Pin `@convex-dev/auth` version strictly and test auth flows on every dependency update.

**Detection:** Subscribe to Convex Auth changelog. Run auth integration tests in CI.

**Phase:** Vendor dashboard (auth setup is the first thing to decide).

**Confidence:** MEDIUM -- based on Convex docs stating beta status and community reports.

## Moderate Pitfalls

### Pitfall 6: Stripe Subscription State Not Synced to Convex on Startup

**What goes wrong:** The app stores subscription status locally in Convex (e.g., `tenants.subscriptionStatus`). If the server was down when Stripe sent a webhook (or the webhook failed silently), the local state diverges from Stripe. Vendor appears active locally but is actually past_due or canceled in Stripe.

**Prevention:**
- On every authenticated dashboard request, verify subscription status against Stripe API (with a short cache TTL, e.g., 5 minutes).
- Implement a daily reconciliation job that fetches all active Stripe subscriptions and syncs status to Convex.
- Never gate features solely on local DB status -- always have a "check Stripe" fallback path.

**Phase:** Stripe billing integration.

**Confidence:** MEDIUM -- common pattern in SaaS billing implementations.

### Pitfall 7: Webhook Signature Verification Fails After Render Deploy

**What goes wrong:** After deploying to Render, the WhatsApp/Bokun/Stripe webhook signature verification fails because the raw request body is parsed differently. Express (or the built-in HTTP server) may parse the body before the HMAC verification function sees it, changing the byte sequence.

**Prevention:**
- The current codebase uses raw body for HMAC verification (`src/server.ts`). Ensure the Render deployment does NOT add a reverse proxy or middleware that modifies the request body before HMAC validation.
- For Stripe specifically: use `stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)` with the raw body buffer, not the parsed JSON.
- Test HMAC validation immediately after first Render deploy, before going live.

**Detection:** First webhook after deploy fails with 403. Monitor webhook endpoint error rates post-deploy.

**Phase:** Production deployment.

**Confidence:** HIGH -- extremely common deployment issue, especially when moving from local dev to cloud.

### Pitfall 8: Console.log Observability is Insufficient for Production

**What goes wrong:** The current codebase uses `console.log` with string prefixes like `[WA webhook]`, `[LLM Agent]`. In production, these are unstructured text that cannot be filtered, aggregated, or alerted on. When a vendor reports "my bot is not responding," there is no way to trace a single message through the entire pipeline.

**Prevention:**
- Replace `console.log` with a structured logger (Pino is the recommended choice for Node.js -- fast, JSON output, low overhead).
- Include `tenantId`, `waUserId`, `messageId`, and a `requestId` (correlation ID) in every log line.
- Route logs to a centralized service (Render provides log streams that can connect to Datadog, Papertrail, or Better Stack).
- Add request tracing: generate a UUID at webhook ingestion and pass it through the entire handler chain.

**Detection:** Try to answer "why did vendor X's message at 14:32 fail?" with current logging. If you cannot, observability is insufficient.

**Phase:** Monitoring and observability (should be done BEFORE go-live, not after).

**Confidence:** HIGH -- universal production operations knowledge.

### Pitfall 9: E2E Tests for Webhook Flows Are Inherently Flaky

**What goes wrong:** E2E tests that simulate WhatsApp webhook -> booking flow -> Bokun API -> response are flaky because: (a) Bokun sandbox API has variable latency, (b) Convex mutations are async, (c) WhatsApp message delivery is non-deterministic. Tests pass locally but fail in CI 20-30% of the time.

**Prevention:**
- Do NOT make E2E tests hit real Bokun or WhatsApp APIs. Mock all external services at the HTTP boundary.
- Use Convex's testing utilities to wait for mutation completion rather than arbitrary `sleep()` calls.
- Structure tests as: send webhook POST to local server -> assert Convex state changed -> assert response body. No network calls to external services.
- Reserve true integration tests (hitting Bokun sandbox) for a separate, non-blocking CI job that runs nightly.
- Use the existing `*WithDeps` dependency injection pattern to swap real clients for test doubles.

**Detection:** If any test uses `setTimeout` or `sleep` to wait for async operations, it will be flaky. Grep for these patterns.

**Phase:** E2E testing.

**Confidence:** HIGH -- webhook chatbot testing is a well-known pain point.

### Pitfall 10: Stripe Customer Portal Bypasses Your UI

**What goes wrong:** Stripe's Customer Portal lets vendors cancel, upgrade, or change payment methods directly. If your dashboard does not listen for all portal-triggered webhook events, the local billing state gets out of sync. Vendor cancels via portal, but your dashboard still shows them as active.

**Prevention:**
- Handle ALL subscription lifecycle events: `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- When using Customer Portal, treat Stripe as the source of truth. Your dashboard displays Stripe state, not local state.
- Test the full portal flow: vendor opens portal -> cancels -> webhook arrives -> dashboard reflects cancellation.

**Phase:** Stripe billing integration.

**Confidence:** HIGH -- Stripe documentation explicitly covers this.

## Minor Pitfalls

### Pitfall 11: Landing Page and Dashboard on Same Domain Causes Cookie/CORS Conflicts

**What goes wrong:** Serving a marketing landing page and a vendor dashboard from the same origin or subdomain causes authentication cookie conflicts, CORS issues, or caching problems where unauthenticated pages serve authenticated content.

**Prevention:**
- Use separate subdomains: `www.yourapp.com` (landing page), `app.yourapp.com` (dashboard), `api.yourapp.com` (webhook server).
- Configure CORS explicitly per subdomain. Do not use wildcard `*` origins.
- Set cookies with `Domain=.yourapp.com` and `SameSite=Lax` for cross-subdomain auth if needed.

**Phase:** Landing page + production deployment.

**Confidence:** MEDIUM -- depends on architecture choice for serving the dashboard.

### Pitfall 12: Render Environment Variables Not Scoped Per Service

**What goes wrong:** When deploying multiple Render services (e.g., webhook server + dashboard + landing page), developers copy-paste environment variables between services. A variable intended for one service (e.g., `STRIPE_WEBHOOK_SECRET`) is set on the wrong service, or a production secret is accidentally set on a staging service.

**Prevention:**
- Use Render's Environment Groups to share common variables across services.
- Document which env vars belong to which service.
- Use separate Stripe webhook endpoints (and separate webhook signing secrets) for production vs staging.
- Never share `META_APP_SECRET` or `STRIPE_WEBHOOK_SECRET` across environments.

**Phase:** Production deployment.

**Confidence:** MEDIUM -- standard deployment hygiene.

### Pitfall 13: Booking Bot Stops Working After Subscription Lapses

**What goes wrong:** When a vendor's Stripe subscription becomes `past_due` or `canceled`, the WhatsApp bot continues processing messages and making Bokun API calls on behalf of an unpaying vendor. No billing enforcement gate exists in the message processing pipeline.

**Prevention:**
- Add a subscription status check early in the webhook processing pipeline (after tenant resolution, before routing).
- For `past_due`: allow a grace period (e.g., 7 days) with a warning message to the vendor.
- For `canceled`: respond to end users with a generic "this service is temporarily unavailable" message and stop making Bokun API calls.
- Cache the subscription status check (e.g., 5 minutes) to avoid hitting Stripe on every message.

**Phase:** Stripe billing integration (must be designed together with the billing system).

**Confidence:** HIGH -- every SaaS must gate features on subscription status.

### Pitfall 14: Convex Deployment Drift Between Webhook Server and Dashboard

**What goes wrong:** The webhook server and vendor dashboard share the same Convex backend and schema. If the dashboard deploys a schema migration while the webhook server is running an older version, queries fail or return unexpected data shapes.

**Prevention:**
- Always deploy schema changes to Convex FIRST, then deploy application code.
- Make schema changes backward-compatible (add fields as optional, never rename or remove fields in the same deploy).
- Use a single CI/CD pipeline that deploys Convex -> webhook server -> dashboard in sequence.

**Phase:** Production deployment.

**Confidence:** MEDIUM -- Convex handles this better than raw SQL migrations, but the risk remains for breaking schema changes.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Stripe billing | Webhook event ordering and idempotency (#1, #2) | Reuse existing dedup pattern; always fetch current state from Stripe API |
| Stripe billing | Subscription state desync (#6, #10) | Stripe is source of truth; local DB is cache with reconciliation |
| Stripe billing | No billing enforcement gate (#13) | Add subscription check in webhook pipeline before routing |
| Vendor dashboard | Multi-tenant data leakage (#3) | `withTenantAuth` wrapper on every query; cross-tenant integration tests |
| Vendor dashboard | Auth provider immaturity (#5) | Evaluate Convex Auth vs Clerk early; abstract behind interface |
| Production deployment | Render cold starts killing webhooks (#4) | Starter tier minimum ($7/mo); health check ping |
| Production deployment | HMAC verification fails post-deploy (#7) | Test all three HMAC flows (Meta, Bokun, Stripe) immediately after first deploy |
| Production deployment | Env var mismanagement (#12) | Use Render Environment Groups; document per-service vars |
| Production deployment | Schema deployment drift (#14) | Single pipeline: Convex deploy -> app deploy |
| Monitoring | Unstructured logging (#8) | Switch to Pino with JSON output; add correlation IDs before go-live |
| E2E testing | Flaky async webhook tests (#9) | Mock all external APIs; use Convex test utilities; no sleep() |
| Landing page | Cookie/CORS conflicts (#11) | Separate subdomains from day one |

## Sources

- [Stripe: Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) -- HIGH confidence
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) -- HIGH confidence
- [Stigg: Best practices for Stripe webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) -- MEDIUM confidence
- [Stripe: Integrate the customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal) -- HIGH confidence
- [Convex Auth: Security](https://labs.convex.dev/auth/security) -- MEDIUM confidence
- [Render.com: Pricing](https://render.com/pricing) -- HIGH confidence
- [Render community: Cold start issues](https://community.render.com/t/cold-boot-start-of-the-server-for-first-request/15911) -- MEDIUM confidence
- [Dash0: Pino for production logging](https://www.dash0.com/faq/the-top-5-best-node-js-and-javascript-logging-frameworks-in-2025-a-complete-guide) -- MEDIUM confidence
- [Chat Architect: Testing WhatsApp integrations](https://www.chatarchitect.com/news/testing-and-ci-cd-for-custom-integration-flows-in-whatsapp) -- LOW confidence
- Existing codebase analysis: `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md` -- HIGH confidence

---

*Pitfalls research: 2026-03-01*
