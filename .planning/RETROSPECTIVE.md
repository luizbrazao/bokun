# Retrospective: WhatsApp Bokun Bot

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-04
**Phases:** 5 | **Plans:** 15 | **Timeline:** 4 days (2026-03-01 → 2026-03-04)

### What Was Built

- Pino structured logging + Sentry error tracking + webhook replay protection
- Render.com production deployment (render.yaml Blueprint, Convex pre-deploy)
- Stripe subscription billing with idempotent webhook processing + dead-letter queue
- Vendor admin dashboard: overview, bot toggle, conversation log, booking list, failed webhooks
- Marketing landing page with pricing tiers → Stripe Checkout
- Vendor settings: business info, timezone, language (PT/EN/ES), subscription status, OpenAI key per tenant
- 51 automated tests: booking state machine, cancellation flow, tenant isolation, Stripe webhooks, subscription gating
- GitHub Actions CI pipeline

### What Worked

- **Wave-based execution with gsd-executor subagents** — each plan ran in a fresh 200k context, preventing context contamination between plans
- **Phase CONTEXT.md as locked decisions** — prevented scope drift during execution (e.g., 7-day trial locked before Phase 3, no re-discussion needed)
- **Vitest over Jest** — zero config friction for ESM/TypeScript; no tsconfig required
- **`vi.hoisted()` for mock refs** — solved the common `vi.mock()` factory closure problem cleanly
- **Convex dependency injection (`*WithDeps` pattern)** — made handlers testable without complex mocking

### What Was Inefficient

- REQUIREMENTS.md checkboxes got stale (TEST-01, TEST-02, OBS-06 left unchecked after plans completed) — requires manual reconciliation at milestone close
- MILESTONES.md had a partial v1.0 entry from before phases 4-5 shipped, creating duplicate entries that needed manual merge
- Phase 5 VERIFICATION.md ran before Wave 2 fully completed (executor added select_pickup test in Wave 2, verifier ran after Wave 1) — timing issue with re-verification

### Patterns Established

- `vi.hoisted()` for shared mock references inside `vi.mock()` factories
- `isSubscriptionGated(tenant, now?)` pure function pattern — injectable `now` param for deterministic grace period testing
- Wave 2 builds on Wave 1 Vitest harness — sequential waves for test infrastructure phases work well
- Executor agent correctly adds tests missing from the verifier's gap analysis (Wave 2 fixed TEST-01 gap before verifier re-ran)

### Key Lessons

- **Re-run verifier after gap closure**: When executor adds code that fixes a verifier gap (like the select_pickup test), re-run verification before milestone close rather than accepting a "gaps_found" status
- **Lock requirement checkboxes in plan SUMMARY.md**: Each plan executor should mark specific REQ-IDs as complete in its commit rather than leaving REQUIREMENTS.md for batch updates
- **MILESTONES.md idempotency**: The `milestone complete` CLI should check for existing entries and update rather than append

### Cost Observations

- 5 phases, 15 plans, ~95 commits in 4 days
- Executor agents (sonnet): bulk of plan implementation
- Verifier agents (sonnet): phase verification
- Orchestrator context stayed lean (~10-15%) throughout

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Tests | Timeline |
|-----------|--------|-------|-------|----------|
| v1.0 MVP  | 5      | 15    | 51    | 4 days   |
