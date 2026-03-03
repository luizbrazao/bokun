---
phase: 04-dashboard-landing-profile
plan: "04"
subsystem: ui, database, payments
tags: [stripe, checkout, convex, react, timezone, language, settings]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dashboard frontend scaffolding, SettingsPage with tabs, Convex tenants table

provides:
  - Tenant profile fields in schema (businessName, logoUrl, contactEmail, timezone, language)
  - getTenantProfile query and updateTenantProfile mutation in convex/tenants.ts
  - Stripe Checkout session creation endpoint POST /api/create-checkout-session
  - Perfil tab in Settings: name, logo URL, email, timezone dropdown, language dropdown
  - Assinatura tab in Settings: subscription status, monthly/annual Stripe Checkout buttons
  - Runtime timezone injection into availability formatting (listTimes -> availabilityToOptionMap)
  - Runtime language injection into LLM system prompt (agent.ts -> buildSystemPrompt)

affects: [05-billing-gating, 05-testing, llm-agent, availability-formatting, settings-ui]

# Tech tracking
tech-stack:
  added: [stripe (checkoutHandler.ts — new file using Stripe Checkout sessions)]
  patterns:
    - "Profile fields added to tenants table as all-optional schema additions (no migration needed)"
    - "Runtime tenant preference lookup pattern: convex.query('tenants:getTenantById') -> use field ?? default"
    - "Stripe Checkout session creation with 7-day trial via subscription_data.trial_period_days"
    - "tz parameter generalized from literal to string in availabilityToOptionMap for multi-tenant timezone support"

key-files:
  created:
    - src/stripe/checkoutHandler.ts
    - .planning/phases/04-dashboard-landing-profile/04-04-SUMMARY.md
  modified:
    - convex/schema.ts
    - convex/tenants.ts
    - src/server.ts
    - frontend/src/pages/SettingsPage.tsx
    - src/bokun/availabilityToOptionMap.ts
    - src/whatsapp/handlers/listTimes.ts
    - src/llm/systemPrompt.ts
    - src/llm/agent.ts
    - .env.example
    - render.yaml
    - frontend/.env.example

key-decisions:
  - "7-day free trial in Stripe Checkout (trial_period_days: 7) per CONTEXT.md locked decision — overrides any conflicting docs"
  - "booking_drafts.lastOptionMap.tz changed from v.literal('Europe/Madrid') to v.string() in schema to allow runtime tenant timezone"
  - "Tenant timezone also used for LLM currentDateTime display in agent.ts (bonus consistency improvement)"
  - "getTenantById (no auth check) used in server-side handlers (listTimes, agent) — correct pattern for webhook/server contexts"
  - "FRONTEND_URL env var added for Checkout success/cancel redirect — avoids hardcoding dashboard URL in backend"

patterns-established:
  - "Multi-tenant preference injection: fetch from Convex before calling function, pass as param with safe default"
  - "Stripe checkout flow: frontend POST /api/create-checkout-session -> backend createCheckoutSession -> redirect to session.url"

requirements-completed: [BILL-01, BILL-02, PROF-01, PROF-02, PROF-03, PROF-04]

# Metrics
duration: 8min
completed: 2026-03-03
---

# Phase 4 Plan 04: Profile + Billing Settings Summary

**Tenant profile fields (name, logo, email, timezone, language) + Stripe Checkout with 7-day trial, wired end-to-end into availability formatting and LLM system prompt**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-03T16:18:51Z
- **Completed:** 2026-03-03T16:26:37Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added 5 optional profile fields to Convex tenants table with zero migration needed
- Built Perfil tab (businessName, logoUrl, contactEmail, timezone dropdown, language dropdown) and Assinatura tab (subscription status + Stripe Checkout buttons for monthly/annual plans) in SettingsPage
- Created POST /api/create-checkout-session backend endpoint with 7-day free trial (BILL-02 per CONTEXT.md locked decision)
- Wired tenant.timezone end-to-end: stored in Settings -> fetched in listTimes.ts -> passed to availabilityToOptionMap (replacing hardcoded Europe/Madrid in Intl.DateTimeFormat)
- Wired tenant.language end-to-end: stored in Settings -> fetched in agent.ts -> injected as language-specific instruction in buildSystemPrompt

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + Convex mutations + checkoutHandler + server route** - `fcae82e` (feat)
2. **Task 2: Perfil + Assinatura tabs in SettingsPage** - `9b21a35` (feat)
3. **Task 3: Runtime timezone + language wiring** - `8470955` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `convex/schema.ts` - Added 5 optional profile fields; tz in booking_drafts changed from literal to string
- `convex/tenants.ts` - Added getTenantProfile query and updateTenantProfile mutation
- `src/stripe/checkoutHandler.ts` - New file: createCheckoutSession with 7-day trial (BILL-02)
- `src/server.ts` - Import checkoutHandler; add handleCreateCheckoutSessionRoute; wire POST /api/create-checkout-session
- `frontend/src/pages/SettingsPage.tsx` - Add PerfilTab and AssinaturaTab components; wire into Tabs
- `src/bokun/availabilityToOptionMap.ts` - Generalize tz from literal to string; rename helpers to formatDateKey/formatDisplay
- `src/whatsapp/handlers/listTimes.ts` - Fetch tenant.timezone from Convex; pass as tz to availabilityToOptionMap
- `src/llm/systemPrompt.ts` - Add language param to BuildSystemPromptArgs; inject language-specific default instruction
- `src/llm/agent.ts` - Fetch tenant.language and tenant.timezone; pass to buildSystemPrompt
- `.env.example` - Document STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, FRONTEND_URL
- `render.yaml` - Add STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, FRONTEND_URL to backend envVars
- `frontend/.env.example` - Document VITE_API_BASE_URL for Stripe checkout session endpoint

## Decisions Made

- 7-day trial in Stripe Checkout per CONTEXT.md locked decision (trial_period_days: 7 in subscription_data)
- booking_drafts.lastOptionMap.tz schema changed from v.literal to v.string to support runtime tenant timezone
- Bonus: tenant timezone also used for LLM currentDateTime display in agent.ts for consistency
- getTenantById (no auth check) used in server-side handlers — correct for webhook/server contexts where no user session exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Changed booking_drafts.tz schema from v.literal to v.string**
- **Found during:** Task 1 (schema changes)
- **Issue:** The booking_drafts.lastOptionMap schema had `tz: v.literal("Europe/Madrid")` which would reject any non-Madrid timezone value from the runtime wiring in Task 3
- **Fix:** Changed to `tz: v.string()` in schema.ts — backward compatible (existing Madrid values still valid)
- **Files modified:** convex/schema.ts
- **Verification:** Frontend build passes; no Convex schema errors
- **Committed in:** fcae82e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — schema type too narrow for runtime feature)
**Impact on plan:** Fix was required for PROF-02 correctness — without it, non-Madrid timezone values would fail Convex schema validation when stored in booking drafts.

## Issues Encountered

None — all planned changes implemented as specified.

## User Setup Required

External services require manual configuration before Stripe Checkout flows work:

- `STRIPE_MONTHLY_PRICE_ID` — Create "Bokun Bot Monthly" product at €29/month in Stripe Dashboard, copy Price ID
- `STRIPE_ANNUAL_PRICE_ID` — Create "Bokun Bot Annual" product at €290/year in Stripe Dashboard, copy Price ID
- `FRONTEND_URL` — Backend env var for Checkout success/cancel redirect URL
- `VITE_API_BASE_URL` — Frontend env var pointing to backend (http://localhost:3000 locally)

## Next Phase Readiness

- Profile settings are stored end-to-end and wired into runtime behavior (availability formatting + LLM language)
- Stripe Checkout session creation is ready — pending only Stripe Price IDs from user setup
- Subscription status display in Assinatura tab reads from tenant.stripeStatus (populated by Phase 3 webhook handler)
- Phase 5 (subscription gating + testing) can now rely on tenant.language and tenant.timezone fields being populated

---
*Phase: 04-dashboard-landing-profile*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: /Users/luizbrazao/Projetos/Bokun/src/stripe/checkoutHandler.ts
- FOUND: /Users/luizbrazao/Projetos/Bokun/.planning/phases/04-dashboard-landing-profile/04-04-SUMMARY.md
- FOUND: commit fcae82e (Task 1)
- FOUND: commit 9b21a35 (Task 2)
- FOUND: commit 8470955 (Task 3)
