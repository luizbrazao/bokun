# Phase 2: Production Deployment - Context

**Gathered:** 2026-03-01  
**Status:** Ready for planning  

<domain>

## Phase Boundary

Deploy the Node.js backend and React dashboard to Render.com using a single `render.yaml` Blueprint. Ship a validated environment-variable configuration strategy so environments differ only by env vars (no code changes). Ensure Convex production schema is never behind app code by running `convex deploy` as part of the backend deployment pipeline before the application starts. Confirm all three HMAC webhook signatures (Meta, Bokun, Stripe) pass in production immediately after first deploy.

Stripe billing, dashboard features, and landing page are separate phases.

</domain>

<decisions>

## Implementation Decisions

### Render service architecture

- Two services defined in a single `render.yaml` Blueprint at the repo root
- Services deploy independently from the same repository (a frontend failure must not block backend deploy, and vice versa)
- Both services auto-deploy on push to `main`, but operate as separate services in Render

#### Node.js backend
- Type: Web Service (Starter tier)
- Root directory: `.`
- Build command: `npm install`
- Start command: `npm start`
  - `npm start` must preserve the Sentry preload flag:
    `node --import @sentry/node/preload --experimental-strip-types src/server.ts`
- Health check path: `/health`

#### React dashboard
- Type: Static Site
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

---

### Environment management

- `.env.example` committed at repo root documenting all backend environment variables
  - Each variable includes: description, where to obtain it, and example format
- `frontend/.env.example` documents dashboard variables (e.g., Convex URL)
- Render Environment Groups used for production secrets — no secrets stored in the repository
- Local development:
  - `.env` at repo root (gitignored)
  - `frontend/.env.local` (gitignored)
- Environment variable names are identical across environments
- Switching environments requires swapping environment variable sets only — zero code changes
- Two documented contexts:
  - `local` (via `.env`)
  - `production` (via Render env groups)

No staging environment in this phase.

---

### Convex deploy sequencing

- Convex production deployment runs as part of the backend deployment pipeline before application start
- Implemented via backend pre-deploy step:
  - `npm run convex:deploy`
- `convex:deploy` script already exists:
  - `"convex:deploy": "convex deploy"`
- Convex deployment must run **after dependencies are installed** and before the service starts
- If Convex deploy fails, Render aborts backend deployment automatically
- Convex deployment key stored as `CONVEX_DEPLOY_KEY` environment variable on the backend service
- No separate CI pipeline required — Render native deployment pipeline is sufficient for v1

---

### Staging environment

- Out of scope for this phase
- No staging environment or preview deployments
- Single production environment on Render for v1
- Staging may be introduced after production stabilizes

---

### Claude's Discretion

- Exact `render.yaml` YAML structure and field naming
- Prefer `envVarGroups` for secrets over inline env vars
- Node.js version specified via `engines.node` in `package.json` (>=18)
- Render region selection (default closest to primary user base)

</decisions>

<specifics>

## Specific Ideas

- Preserve Sentry preload in backend start command — do not override with a raw `node` command in `render.yaml`
- Use `npm run convex:deploy` in deployment pipeline (do not duplicate command logic)
- Frontend is a Vite/React app located in `./frontend/` with its own `package.json`
- `.env.example` files must clearly document:
  - variable purpose
  - provider (Stripe, Meta, Bokun, Convex)
  - example format (never real secrets)
- Backend and frontend services must be logically independent in Render configuration

</specifics>

<deferred>

## Deferred Ideas

- Staging environment on Render
- PR preview deployments for frontend
- GitHub Actions CI pipeline
- Blue/green or zero-downtime deploy strategy
- Multi-region deployment

</deferred>

---

*Phase: 02-production-deployment*  
*Context gathered: 2026-03-01*