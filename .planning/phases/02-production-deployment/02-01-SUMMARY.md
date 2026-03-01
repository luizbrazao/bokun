---
phase: 02-production-deployment
plan: 01
subsystem: infra
tags: [render, convex, docker, deployment, env-vars, blueprint]

# Dependency graph
requires:
  - phase: 01-observability-hardening
    provides: Health endpoint at /health, Sentry integration, LOG_LEVEL env var support
provides:
  - render.yaml Blueprint defining both production services (backend Web Service + dashboard Static Site)
  - Complete backend env var documentation (.env.example) with all 20+ variables annotated
  - Frontend env var documentation (frontend/.env.example) with VITE_CONVEX_URL
  - Convex deploy sequencing via preDeployCommand (schema-before-app guarantee)
affects:
  - 02-02 (Render dashboard setup — references render.yaml service names and env var list)
  - 02-03 (first deploy — depends on render.yaml structure being correct)
  - phase 03 (Stripe billing — env placeholders already present in render.yaml and .env.example)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "render.yaml Blueprint IaC: single file defining both services, deploys on git push"
    - "preDeployCommand for Convex schema sequencing: buildCommand -> preDeployCommand -> startCommand"
    - "sync: false at service-level envVars (not envVarGroups) for secrets requiring manual entry"
    - "SPA catch-all rewrite rule for React Router on Render Static Site"

key-files:
  created:
    - render.yaml
    - frontend/.env.example
  modified:
    - .env.example

key-decisions:
  - "Used per-service envVars with sync: false instead of envVarGroups — sync: false is invalid inside envVarGroups (Render silently drops them)"
  - "Backend plan: starter (not free) — preDeployCommand only runs on paid tier"
  - "startCommand: npm start (not raw node command) — preserves Sentry preload flag in npm script"
  - "Frankfurt region for both services — primary users in Spain/EU, Frankfurt is closest Render EU region"
  - "Stripe placeholder vars included in render.yaml and .env.example now — avoids future render.yaml edit in Phase 3"
  - "WHATSAPP_APP_SECRET as canonical name; META_APP_SECRET documented as accepted alias"

patterns-established:
  - "Pattern 1 (preDeployCommand): Convex deploy runs after npm install but before npm start — schema can never lag app code; failed Convex deploy aborts backend deploy and keeps previous version running"
  - "Pattern 2 (sync: false): Secrets declared in render.yaml with sync: false so variable names are versioned but values are entered in Render Dashboard — no secrets in git"
  - "Pattern 3 (env.example): Every variable has section, purpose, source URL, example format, required/optional classification"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, INFRA-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 2 Plan 01: Render Blueprint and Environment Variable Documentation Summary

**render.yaml Blueprint defining bokun-bot-api (Node.js Starter) and bokun-bot-dashboard (React Static), with Convex preDeployCommand sequencing and complete .env.example documentation for all 20+ backend variables**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T20:38:28Z
- **Completed:** 2026-03-01T20:40:13Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Authored render.yaml at repo root: single git push deploys both services, Convex schema deploys before app code, SPA routing works on direct URL access
- Rewrote .env.example with all 20+ variables, clear sections, source annotations, required/optional tags, and Phase 3 Stripe placeholders
- Created frontend/.env.example documenting VITE_CONVEX_URL with Vite prefix requirement explained

## Task Commits

Each task was committed atomically:

1. **Task 1: Write render.yaml Render Blueprint** - `63131dc` (chore)
2. **Task 2: Update .env.example and create frontend/.env.example** - `3790e90` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `render.yaml` - Render Blueprint IaC: defines both production services with correct plan tiers, preDeployCommand, health check, SPA rewrite, and all secrets as sync: false
- `.env.example` - Backend env var documentation: 20+ variables with section headers, purpose, source, example, required/optional classification, Phase 3 placeholders
- `frontend/.env.example` - Frontend env var documentation: VITE_CONVEX_URL with Vite prefix explanation

## Decisions Made

- Used per-service `envVars` with `sync: false` instead of `envVarGroups` — the `sync: false` flag is silently ignored by Render inside `envVarGroups` blocks; per-service is the correct scope
- Backend uses `plan: starter` — `preDeployCommand` is not available on Free tier; would silently not run Convex deploy
- `startCommand: npm start` (not the raw `node --import @sentry/node/preload ...` command) — `npm start` already includes the Sentry preload flag and is the stable public interface
- Frankfurt region for both services — primary users in Spain/EU, Frankfurt is the closest EU region Render offers
- Included Stripe placeholder vars now in render.yaml and .env.example — Phase 3 adds Stripe; pre-populating avoids a required render.yaml edit at that point; vars are clearly marked as "Phase 3 / not yet required"
- Canonical env var name is `WHATSAPP_APP_SECRET`; `META_APP_SECRET` documented as accepted alias to avoid breaking existing `.env.local` setups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Render Dashboard configuration required before first deploy.** Key steps after linking repository:

1. Open Render Dashboard after Blueprint sync
2. Fill in all `sync: false` variables before triggering any deploy
3. Critical: Set `CONVEX_DEPLOY_KEY` first — if missing, `preDeployCommand` hangs waiting for browser auth
4. Set `WHATSAPP_APP_SECRET` (or `META_APP_SECRET`) and all other secrets
5. Trigger first deploy manually only after all secrets are set
6. Verify: Render deploy logs show a "pre-deploy" phase running `convex deploy` before startup

## Next Phase Readiness

- render.yaml is committed and ready for Render Dashboard Blueprint sync
- Both .env.example files document every required variable for the deployer to fill in
- Phase 3 Stripe placeholders are already present — no render.yaml changes needed when Phase 3 begins
- Next: link GitHub repository to Render via Blueprint, set secret values in Dashboard, trigger first deploy

---
*Phase: 02-production-deployment*
*Completed: 2026-03-01*

## Self-Check: PASSED

- render.yaml: FOUND
- .env.example: FOUND
- frontend/.env.example: FOUND
- 02-01-SUMMARY.md: FOUND
- Commit 63131dc: FOUND
- Commit 3790e90: FOUND
