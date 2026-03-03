# Phase 5: Automated Test Coverage - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Write automated tests for: (1) booking state machine happy path + cancellation, (2) tenant isolation across critical Convex queries, (3) Stripe webhook handlers for the three subscription lifecycle events. Also gate the bot on active subscription status (BILL-05) with a 7-day grace period for past_due. All tests pass in CI on every push to main.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User deferred all implementation decisions to Claude. Full discretion on:

- Test framework selection (Jest, Vitest, or Node built-in test runner) — choose based on existing stack and what integrates best with TypeScript + ES Modules
- Test file location and naming conventions
- Mocking strategy for Convex, Bokun HTTP calls, and Stripe HTTP calls
- Level of integration vs unit testing for each area
- Subscription gating message text (polite, professional, in same language/tone as existing bot messages)
- Grace period logic: past_due status allows continued service; cancelled/expired status blocks
- CI configuration (GitHub Actions or whatever fits the repo)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-automated-test-coverage*
*Context gathered: 2026-03-03*
