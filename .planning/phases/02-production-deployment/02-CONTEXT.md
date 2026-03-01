# Phase 2: Production Deployment - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the Node.js backend and React dashboard to Render.com with a single `render.yaml` Blueprint. Ship a validated environment-variable configuration strategy so dev/staging/prod differ only in env vars (no code changes). Ensure Convex production schema is never behind app code by running `convex deploy` before the app deploys. Confirm all three HMAC webhook signatures (Meta, Bokun, Stripe) pass in production immediately after first deploy.

Stripe billing, dashboard features, and landing page are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Render service architecture
- Two services in a single `render.yaml` Blueprint at the repo root
- **Node.js backend**: web service, Starter tier, root dir `.`, build command `npm install`, start command `npm start` (which runs `node --import @sentry/node/preload --experimental-strip-types src/server.ts`)
- **React dashboard**: static site, root dir `frontend`, build command `npm install && npm run build`, publish dir `dist`
- Both services deploy from the same repo on every push to `main`
- Health check path: `/health` (already implemented)

### Environment management
- `.env.example` committed to root documenting all backend env vars with descriptions and example values
- `frontend/.env.example` for dashboard env vars (Convex URL, etc.)
- Render env groups used for production secrets — no secrets in repo
- Local development: `.env` file at root (gitignored), `frontend/.env.local` (gitignored)
- All env var names match exactly between dev and prod — switching environments = swap the env var set only
- Three documented env contexts: `local` (`.env`), `production` (Render dashboard/env groups)

### Convex deploy sequencing
- Render `preDeployCommand` in `render.yaml` for the Node.js service: `npx convex deploy --prod`
- If Convex deploy fails, Render aborts the app deploy automatically (pre-deploy failure stops rollout)
- Convex deployment key stored as `CONVEX_DEPLOY_KEY` env var on the backend service
- No separate CI pipeline needed — Render's built-in pre-deploy hook is sufficient for v1

### Staging environment
- Out of scope for this phase — production only
- No staging environment or PR preview deployments for now
- Keep it simple: single prod environment on Render

### Claude's Discretion
- Exact `render.yaml` YAML structure and field names
- Whether to use `envVarGroups` or inline env vars in render.yaml (lean toward groups for secrets)
- Node.js version specification in render.yaml (use `engines.node` from package.json: >=18)
- Render region selection

</decisions>

<specifics>
## Specific Ideas

- The `npm start` script already includes the Sentry preload flag — this must be preserved in the Render start command
- Convex `convex:deploy` npm script already exists (`"convex:deploy": "convex deploy"`) — use it in pre-deploy: `npm run convex:deploy`
- Frontend is a Vite/React app at `./frontend/` — separate `package.json` with its own dependencies
- The `.env.example` should document each variable with: what it is, where to get it, and an example value format

</specifics>

<deferred>
## Deferred Ideas

- Staging environment on Render — add after initial production deploy is stable
- PR preview deployments for the frontend — v2 feature
- GitHub Actions CI pipeline — out of scope; Render's native deploy is sufficient for v1

</deferred>

---

*Phase: 02-production-deployment*
*Context gathered: 2026-03-01*
