# Phase 3: Billing + Ops Hardening - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning
**Source:** Requirements + roadmap (no additional discussion)

<domain>
## Phase Boundary

Backend infrastructure only. Ship Stripe billing foundations (webhook endpoint with signature verification, basic subscription state in Convex) AND production-grade ops hardening (Sentry validated end-to-end, dead-letter/retry for failed webhooks, rate limiting on all inbound webhook endpoints).

No billing UI. No subscription gating (BILL-05 is out of this phase scope per roadmap). No Stripe Checkout flow.

</domain>

<decisions>
## Implementation Decisions

### Stripe Webhook
- `POST /stripe/webhook` route with `STRIPE_WEBHOOK_SECRET` signature verification; invalid signatures → 403
- Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Persist: `customerId`, `subscriptionId`, `status`, `current_period_end` per tenant
- Idempotent via Stripe `event.id` — duplicate delivery produces no duplicate state changes

### Dead-letter / Retry for Failed Webhooks
- Store failed webhook events in Convex (all three webhook types: WhatsApp, Bokun, Stripe)
- Persist: error reason + payload hash
- Basic retry/dead-letter mechanism — scope is "in place", not fully automated retry system

### Rate Limiting
- Extend rate limiting to ALL inbound webhook endpoints (WhatsApp already done in Phase 1; add Bokun and Stripe)
- Safe defaults, structured log entries on limit hits
- Consistent with Phase 1 approach (same library/pattern)

### Sentry Validation
- Prove Sentry is wired E2E with a test error visible in the production Sentry project
- Human checkpoint: manually trigger test error and verify it appears in dashboard
- No automated verification required for this phase

### render.yaml + .env.example
- Add any new Stripe vars (STRIPE_WEBHOOK_SECRET, etc.)
- Runbook notes for webhook verification and troubleshooting

### Claude's Discretion
- Convex schema design for subscription storage (fields on `tenants` table vs separate table — planner decides based on Phase 4 needs)
- Dead-letter table schema and retry count limits
- Rate limit thresholds for server-to-server webhook endpoints (Bokun/Stripe are servers, not end users)
- Exact retry logic (manual vs automated cron)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All constraints come from success criteria in ROADMAP.md.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-billing-ops-hardening*
*Context gathered: 2026-03-02*
