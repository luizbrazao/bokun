# Phase 5: Automated Test Coverage - Context

**Gathered:** 2026-03-03  
**Status:** Ready for planning  

<domain>

## Phase Boundary

Write automated tests for:  
(1) booking state machine happy path + cancellation,  
(2) tenant isolation across critical Convex queries,  
(3) Stripe webhook handlers for the three subscription lifecycle events.  

Also gate the bot on active subscription status (BILL-05) with a 7-day grace period for `past_due`.  

All tests must pass in CI on every push to `main`.

</domain>

<decisions>

## Implementation Decisions

### Test Framework & Structure

- **Primary test runner:** Vitest (TypeScript-native, fast, ESM-friendly).
- **E2E (only if required):** Playwright for minimal smoke coverage (e.g., dashboard loads, landing page responsive check). Avoid Cypress.
- **Test types:**
  - Unit tests for pure logic (state machine, system prompt, availability mapping).
  - Integration tests with mocks for router, Stripe handlers, Convex queries.
- **File structure:** colocated `*.test.ts` next to source files unless repo conventions dictate otherwise.

---

### Mocking & Isolation Rules

- No real external calls in test environment.
- Mock:
  - Stripe SDK and webhook payloads
  - Bokun HTTP calls
  - WhatsApp webhook payloads
  - Convex queries/mutations (network layer mocked)
- Tests must be deterministic (no time-based flakiness; mock Date where needed).
- No secrets required to run tests.

---

### CI Requirements

- Tests run on every push to `main`.
- Tests run on PRs.
- No dependency on external services.
- CI must fail on any test failure.

---

### Coverage Philosophy

- Do not aim for arbitrary 100% coverage.
- Prioritize high-risk execution paths.
- Coverage focus order:

1. `src/whatsapp/router.ts`  
   - Bot disabled early-return  
   - Subscription gating logic  

2. `src/stripe/checkoutHandler.ts`  
   - Plan mapping (monthly vs annual)  
   - `trial_period_days: 7` present  
   - Environment variable validation  

3. `src/whatsapp/handlers/listTimes.ts`  
   - Timezone retrieved from tenant  
   - Correct pass-through into `availabilityToOptionMap`

4. `src/bokun/availabilityToOptionMap.ts`  
   - Correct timezone usage  
   - No hardcoded region assumptions  

5. `src/llm/agent.ts` + `src/llm/systemPrompt.ts`  
   - Tenant language retrieval  
   - Language injection into system prompt  

6. Booking state machine  
   - Happy path  
   - Cancellation path  

7. Tenant isolation  
   - Ensure tenantId filtering in critical Convex queries  

---

### Subscription Gating (BILL-05)

Gate bot execution before expensive operations (LLM calls or Bokun API calls).

**Location:** WhatsApp router (pre-processing stage).  

**Allowed statuses:**
- `active`
- `trialing`

**Grace allowed:**
- `past_due` for up to 7 days

**Blocked statuses:**
- `canceled`
- `unpaid`
- `incomplete`
- `incomplete_expired`
- `paused` (if present in Stripe lifecycle)

**Behavior when blocked:**
- Respond with a short, professional Portuguese message.
- Direct vendor to `/configuracoes` → `Assinatura`.
- Do not execute booking logic, LLM, or Bokun calls.

Grace period logic must be unit-tested and deterministic (mock time).

---

### Gating Message Guidelines

- Short
- Professional
- Same tone as existing bot responses
- Clear next action
- No technical jargon

---

</decisions>

<specifics>

## Specific Ideas

No additional constraints beyond the above decisions. Standard engineering best practices apply.

</specifics>

<deferred>

## Deferred Ideas

- Load testing
- Performance benchmarking
- Multi-tenant concurrency stress tests
- Chaos/failure injection testing

These are outside Phase 5 scope.

</deferred>

---

*Phase: 05-automated-test-coverage*  
*Context gathered: 2026-03-03*