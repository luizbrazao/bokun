# Phase 2: Production Deployment - Research

**Researched:** 2026-03-01
**Domain:** Render.com deployment (Blueprint IaC), Convex production deploy keys, environment variable management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Render service architecture:**
- Two services defined in a single `render.yaml` Blueprint at the repo root
- Services deploy independently from the same repository (a frontend failure must not block backend deploy, and vice versa)
- Both services auto-deploy on push to `main`, but operate as separate services in Render

**Node.js backend:**
- Type: Web Service (Starter tier)
- Root directory: `.`
- Build command: `npm install`
- Start command: `npm start`
  - `npm start` must preserve the Sentry preload flag: `node --import @sentry/node/preload --experimental-strip-types src/server.ts`
- Health check path: `/health`

**React dashboard:**
- Type: Static Site
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

**Environment management:**
- `.env.example` committed at repo root documenting all backend environment variables
  - Each variable includes: description, where to obtain it, and example format
- `frontend/.env.example` documents dashboard variables (e.g., Convex URL)
- Render Environment Groups used for production secrets — no secrets stored in the repository
- Local development: `.env` at repo root (gitignored), `frontend/.env.local` (gitignored)
- Environment variable names are identical across environments
- Switching environments requires swapping environment variable sets only — zero code changes
- Two documented contexts: `local` (via `.env`) and `production` (via Render env groups)
- No staging environment in this phase

**Convex deploy sequencing:**
- Convex production deployment runs as part of the backend deployment pipeline before application start
- Implemented via backend pre-deploy step: `npm run convex:deploy`
- `convex:deploy` script already exists: `"convex:deploy": "convex deploy"`
- Convex deployment must run **after dependencies are installed** and before the service starts
- If Convex deploy fails, Render aborts backend deployment automatically
- Convex deployment key stored as `CONVEX_DEPLOY_KEY` environment variable on the backend service
- No separate CI pipeline required — Render native deployment pipeline is sufficient for v1

**Staging environment:** Out of scope for this phase

### Claude's Discretion

- Exact `render.yaml` YAML structure and field naming
- Prefer `envVarGroups` for secrets over inline env vars
- Node.js version specified via `engines.node` in `package.json` (>=18)
- Render region selection (default closest to primary user base)

### Deferred Ideas (OUT OF SCOPE)

- Staging environment on Render
- PR preview deployments for frontend
- GitHub Actions CI pipeline
- Blue/green or zero-downtime deploy strategy
- Multi-region deployment
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-05 | Application config supports dev/staging/prod environments via environment variable sets (no hardcoded values differ between envs) | `.env.example` pattern, Render env groups, identical var names across envs |
| DEPLOY-01 | render.yaml Blueprint defines two Render services: Node.js web service (Starter tier minimum) and React dashboard as static site | Render Blueprint spec with `type: web` + `runtime: node` and `runtime: static` |
| DEPLOY-02 | All required environment variables are documented per service with clear descriptions and examples | Complete env var audit from source code grep + `.env.example` authoring |
| DEPLOY-03 | Convex production deployment runs before app deploy in the pipeline (schema never lags behind app code) | `preDeployCommand: npm run convex:deploy` with `CONVEX_DEPLOY_KEY` |
| DEPLOY-04 | HMAC signature verification passes for all three webhook types (Meta, Bokun, Stripe) in the production Render environment immediately after first deploy | Env var documentation for `WHATSAPP_APP_SECRET`, `BOKUN_APP_CLIENT_SECRET`; Stripe is Phase 3 — DEPLOY-04 scoped to Meta + Bokun for this phase |
</phase_requirements>

---

## Summary

Phase 2 is an infrastructure-configuration phase — no new application code is needed. The work consists of three deliverables: a `render.yaml` Blueprint file at the repo root, a pair of `.env.example` files (backend + frontend), and a production environment variable set in the Render dashboard. All application code already exists and works; this phase is about connecting it to a hosting environment.

The key technical insight for Convex deploy sequencing: Render's `preDeployCommand` runs **after** `buildCommand` but **before** `startCommand`. This makes it the correct hook for `npm run convex:deploy`, which requires `node_modules` (from `buildCommand: npm install`) to already be present. If the Convex deploy fails, Render aborts the entire deploy and the previous running version stays up — schema can never lag behind app code.

The HMAC webhook concern (DEPLOY-04) requires that `WHATSAPP_APP_SECRET` (or `META_APP_SECRET`), `BOKUN_APP_CLIENT_SECRET`, and `CONVEX_DEPLOY_KEY` are correctly set before first boot. The server reads these at request time, not at startup — so a missing variable causes a 500 on first webhook, not a startup crash. The `.env.example` file must clearly flag these as required (not optional) so the deployer sets them before enabling webhook routing.

**Primary recommendation:** Author `render.yaml` first, then enumerate all env vars by auditing source code with `grep -r "process.env" src/`, then write `.env.example` files, then set up Render env groups in the dashboard before linking the repository.

---

## Standard Stack

### Core (Infrastructure)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Render Blueprint (render.yaml) | Current | IaC defining both services from one file | Official Render IaC approach; single-file, single-push deploy |
| `preDeployCommand` | Render native | Runs `convex deploy` before service starts | Only hook that runs after `npm install` and before `npm start` |
| Render Environment Groups | Current | Centralized secret management across services | Keeps secrets out of the repo; one place to rotate |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `CONVEX_DEPLOY_KEY` env var | Convex CLI native | Non-interactive `convex deploy` in CI/CD | Required whenever `convex deploy` runs without a browser login |
| `engines.node` in package.json | `>=18` | Pin Node.js version on Render | Already set; Render respects this field |
| `sync: false` in envVars | Render Blueprint | Mark secret placeholders needing manual entry | For secrets that must not be committed to repo |

### No New npm Packages Required

This phase requires zero new dependencies. All tooling (`convex` CLI, `render.yaml`) is configuration-only.

---

## Architecture Patterns

### Recommended render.yaml Structure

```yaml
# render.yaml — at repo root
envVarGroups:
  - name: bokun-bot-production
    envVars:
      # Non-secret shared config (committed values are fine)
      - key: NODE_ENV
        value: production
      - key: LOG_LEVEL
        value: info
      # Secrets — values entered manually in Render Dashboard
      - key: CONVEX_URL
        sync: false
      - key: CONVEX_DEPLOY_KEY
        sync: false
      - key: WHATSAPP_APP_SECRET
        sync: false
      - key: WHATSAPP_VERIFY_TOKEN
        sync: false
      - key: BOKUN_APP_CLIENT_ID
        sync: false
      - key: BOKUN_APP_CLIENT_SECRET
        sync: false
      - key: BOKUN_ACCESS_KEY
        sync: false
      - key: BOKUN_SECRET_KEY
        sync: false
      - key: BOKUN_BASE_URL
        sync: false
      - key: BOKUN_OAUTH_REDIRECT_URI
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: SENTRY_DSN
        sync: false
      - key: CONVEX_SITE_URL
        sync: false

services:
  # ── Node.js Backend (Web Service) ──────────────────────────────────────
  - type: web
    name: bokun-bot-api
    runtime: node
    region: frankfurt          # closest to primary user base (Spain/EU)
    plan: starter
    buildCommand: npm install
    preDeployCommand: npm run convex:deploy
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - fromGroup: bokun-bot-production
      - key: SENTRY_ENVIRONMENT
        value: production

  # ── React Dashboard (Static Site) ──────────────────────────────────────
  - type: web
    name: bokun-bot-dashboard
    runtime: static
    region: frankfurt
    plan: free
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    autoDeploy: true
    envVars:
      - key: VITE_CONVEX_URL
        sync: false
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### Pattern 1: preDeployCommand for Schema Sequencing

**What:** Render runs commands in strict sequence: `buildCommand` → `preDeployCommand` → `startCommand`. If `preDeployCommand` exits non-zero, the deploy aborts and the previous service keeps running.

**When to use:** Any time you have a pre-start task that depends on installed dependencies and must complete before the app serves traffic.

**Example:**
```yaml
# Source: https://render.com/docs/deploys (verified 2026-03-01)
buildCommand: npm install
preDeployCommand: npm run convex:deploy   # reads CONVEX_DEPLOY_KEY from env
startCommand: npm start
```

The `convex deploy` CLI command reads `CONVEX_DEPLOY_KEY` from the environment and deploys functions non-interactively. This is equivalent to what Vercel/Netlify do with `npx convex deploy --cmd 'npm run build'`, but split across Render's native pipeline steps.

### Pattern 2: envVarGroups with sync:false for Secrets

**What:** Define environment groups in `render.yaml` with `sync: false` on secret fields. The YAML declares the variable names (committed to repo) but not their values (entered manually in dashboard after deploy).

**When to use:** Any time secrets must not appear in git history.

**Example:**
```yaml
# Source: https://render.com/docs/blueprint-spec (verified 2026-03-01)
envVarGroups:
  - name: my-secrets
    envVars:
      - key: API_SECRET
        sync: false        # Render Dashboard will prompt for this value
      - key: LOG_LEVEL
        value: info        # Safe to commit non-secret config
```

**Important constraint:** `sync: false` is only valid at the service level, NOT inside envVarGroups. In environment groups, you can only use `value:` or `generateValue: true`. To mark a secret as requiring manual entry, define it with `sync: false` directly on the service's `envVars`, OR create the Environment Group in the Render Dashboard (not via YAML) and set values there.

**Practical resolution:** Use `sync: false` directly on service-level `envVars` for secrets. Use `envVarGroups` only for values that are safe to commit (like `NODE_ENV=production`). OR define the group in the dashboard and reference it by name.

### Pattern 3: SPA Routing for React Static Site

**What:** React Router requires all routes to serve `index.html` so client-side routing works. Without this, direct URL access to `/settings` returns 404.

**When to use:** Any React SPA with client-side routing.

**Example:**
```yaml
# Source: https://render.com/docs/static-sites (verified 2026-03-01)
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

### Anti-Patterns to Avoid

- **Hardcoding secrets in render.yaml:** Never set real secret values in render.yaml — it is committed to git. Use `sync: false` or dashboard-only env groups.
- **Using `cd` in buildCommand with rootDir set:** When `rootDir: frontend` is set, all commands run relative to that directory. Do NOT use `cd frontend && npm install`; just use `npm install`.
- **Putting CONVEX_DEPLOY_KEY in buildCommand instead of preDeployCommand:** The build command cannot access the running Convex backend. Always use `preDeployCommand` so it runs after install but before start.
- **Omitting the SPA rewrite rule:** React Router will return 404 on any direct URL hit except `/`. Always add the catch-all rewrite.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema-before-app guarantee | Custom deploy script | Render `preDeployCommand` | Render enforces sequencing natively; fail = rollback |
| Secret rotation | Custom vault integration | Render Dashboard + Environment Groups | Built-in, per-service isolation, no code changes |
| Non-interactive Convex deploy | Shell script with credentials | `CONVEX_DEPLOY_KEY` env var | Official Convex mechanism; any other approach is unsupported |
| Node.js version enforcement | `.nvmrc` + CI check | `engines.node` in `package.json` | Render reads this natively |

**Key insight:** This entire phase is configuration — no custom tooling needed. Render and Convex both have native mechanisms for every requirement.

---

## Complete Environment Variable Audit

### Backend (`src/` grep of `process.env.*`)

All variables found in source code:

| Variable | Required | Source | Description |
|----------|----------|--------|-------------|
| `CONVEX_URL` | YES | `src/convex/client.ts` | Convex deployment URL (e.g., `https://xxx.convex.cloud`) |
| `CONVEX_DEPLOY_KEY` | YES (deploy only) | Convex CLI | Non-interactive deploy key; used by `convex deploy`, not the app itself |
| `CONVEX_SITE_URL` | Situational | CLAUDE.md docs | Convex site URL for HTTP actions; may be needed if HTTP actions are used |
| `WHATSAPP_APP_SECRET` | YES | `src/server.ts:552` | HMAC secret for Meta webhook validation (alias: `META_APP_SECRET`) |
| `META_APP_SECRET` | Alias | `src/server.ts:552` | Legacy alias for `WHATSAPP_APP_SECRET` — either works |
| `WHATSAPP_VERIFY_TOKEN` | YES | `src/server.ts:763` | Webhook verification token for GET challenge |
| `BOKUN_APP_CLIENT_ID` | YES | `src/oauth/handler.ts` | Bokun OAuth app client ID |
| `BOKUN_APP_CLIENT_SECRET` | YES | `src/oauth/handler.ts` + `src/server.ts:784` | Bokun OAuth secret (also used for Bokun webhook HMAC) |
| `BOKUN_OAUTH_REDIRECT_URI` | YES | `src/oauth/handler.ts` | OAuth callback URL (must match Bokun app config) |
| `BOKUN_OAUTH_SCOPES` | NO | `src/oauth/handler.ts` | OAuth scopes; defaults to `"bookings activities"` |
| `BOKUN_BASE_URL` | YES | `src/bokun/context.ts` | Bokun API base URL (`https://api.bokun.io` prod) |
| `BOKUN_ACCESS_KEY` | Situational | `src/bokun/context.ts`, `client.ts` | HMAC auth key (required if using HMAC auth, not OAuth) |
| `BOKUN_SECRET_KEY` | Situational | `src/bokun/context.ts`, `client.ts` | HMAC auth secret |
| `BOKUN_DEFAULT_DOMAIN` | NO | `src/server.ts:893` | Default Bokun domain for OAuth flow |
| `BOKUN_DEFAULT_LANG` | NO | `src/providers/bokunAdapter.ts` | Default language; defaults to `"EN"` |
| `BOKUN_DEFAULT_CURRENCY` | NO | `src/providers/bokunAdapter.ts` | Default currency; defaults to `"EUR"` |
| `OPENAI_API_KEY` | Conditional | `src/llm/agent.ts`, `client.ts` | Fallback LLM key if tenant has none configured |
| `OPENAI_MODEL` | NO | `src/llm/client.ts` | Fallback model; defaults to `gpt-4o-mini` |
| `SENTRY_DSN` | NO | `src/lib/sentry.ts` | Sentry project DSN; Sentry is no-op if not set |
| `SENTRY_ENVIRONMENT` | NO | `src/lib/sentry.ts` | Sentry env tag; defaults to `"development"` |
| `LOG_LEVEL` | NO | `src/lib/logger.ts` | Pino log level; defaults to `"info"` |
| `PORT` | NO | `src/server.ts:985` | HTTP port; Render auto-sets this |
| `RATE_LIMIT_MAX` | NO | `src/middleware/rateLimiter.ts` | Max msgs per window; defaults to `10` |
| `RATE_LIMIT_WINDOW_MS` | NO | `src/middleware/rateLimiter.ts` | Window ms; defaults to `60000` |
| `WHATSAPP_WEBHOOK_DEBUG` | NO | `src/server.ts:39` | Set to `"1"` for verbose webhook debug logs |

### Frontend (`frontend/` environment variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | YES | Convex deployment URL for client-side SDK (must have `VITE_` prefix for Vite) |

### Existing .env.example Status

The backend `.env.example` already exists at repo root but is **missing** these variables:
- `CONVEX_DEPLOY_KEY` (deploy-only, needed for render.yaml docs)
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `LOG_LEVEL`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MS`
- `BOKUN_DEFAULT_LANG`
- `BOKUN_DEFAULT_CURRENCY`
- `BOKUN_DEFAULT_DOMAIN`
- `NODE_ENV`

The frontend does NOT have a `.env.example` — only `.env.local` (gitignored). A `frontend/.env.example` must be created with `VITE_CONVEX_URL`.

---

## Common Pitfalls

### Pitfall 1: sync:false in envVarGroups (Constraint Mismatch)

**What goes wrong:** You define `sync: false` inside an `envVarGroups` block in render.yaml. Render silently ignores the variable — it does not appear in the service environment, and no error is thrown during Blueprint sync.

**Why it happens:** The `sync: false` flag is only valid at the service-level `envVars` scope, not inside root-level `envVarGroups`.

**How to avoid:** Use `sync: false` only in the per-service `envVars` block. For environment groups, either commit safe values directly (e.g., `NODE_ENV: production`) or create the group in the Render Dashboard manually with secrets set there.

**Warning signs:** After Blueprint sync, open Render Dashboard > Service > Environment and check whether all expected variables appear with values.

### Pitfall 2: preDeployCommand Not Available on Free Tier

**What goes wrong:** If the web service is accidentally set to `plan: free` instead of `plan: starter`, `preDeployCommand` silently does not run. The app starts without Convex deploy.

**Why it happens:** Render's `preDeployCommand` is documented as available for "paid web services." Starter ($7/mo) is paid; Free is not.

**How to avoid:** Set `plan: starter` in render.yaml for the backend service. Never use `plan: free` for a service that needs `preDeployCommand`.

**Warning signs:** Render deploy logs show no pre-deploy phase. Check plan setting in dashboard.

### Pitfall 3: CONVEX_DEPLOY_KEY Not Set Before First Deploy

**What goes wrong:** `npm run convex:deploy` runs in `preDeployCommand` but `CONVEX_DEPLOY_KEY` is not yet set in Render. The Convex CLI falls back to interactive browser auth, which hangs indefinitely, causing the deploy to timeout.

**Why it happens:** Render Blueprint creates services and asks for `sync: false` values, but if you link the repo before setting secret values, the first auto-deploy fires with empty env vars.

**How to avoid:** After linking the repo to Render via Blueprint, **do not trigger a deploy** until all `sync: false` values are filled in the Dashboard. Set values first, then trigger first deploy manually.

**Warning signs:** Pre-deploy log shows Convex CLI waiting for browser input or timeout error.

### Pitfall 4: React Router 404 on Static Site

**What goes wrong:** The React SPA deploys, homepage loads, but navigating directly to any route (e.g., `/settings`) returns a 404 from Render's static file server.

**Why it happens:** Static file servers serve actual files. `/settings` has no corresponding file. Client-side routing only works if the server returns `index.html` for all paths.

**How to avoid:** Add a catch-all rewrite rule in render.yaml for the static site service:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

**Warning signs:** Direct URL navigation fails; navigating from within the app works.

### Pitfall 5: WHATSAPP_APP_SECRET vs META_APP_SECRET Aliasing

**What goes wrong:** Deployer sets `META_APP_SECRET` in Render but the code checks `WHATSAPP_APP_SECRET` first. Since both are accepted (`process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET`), this works — but leads to confusion about which canonical name to document.

**How to avoid:** Standardize on `WHATSAPP_APP_SECRET` in `.env.example` and render.yaml. Keep `META_APP_SECRET` documented as an alias only.

### Pitfall 6: VITE_ Prefix Missing on Frontend Env Vars

**What goes wrong:** Frontend sets `CONVEX_URL` but it doesn't appear in the built bundle. Convex client fails silently.

**Why it happens:** Vite only exposes env vars with `VITE_` prefix to client-side code. Variables without the prefix are stripped at build time.

**How to avoid:** Always use `VITE_CONVEX_URL` for the frontend. Already confirmed in existing `frontend/.env.local`.

---

## Code Examples

### Minimal render.yaml (Authoritative Structure)

```yaml
# Source: https://render.com/docs/blueprint-spec (verified 2026-03-01)

services:
  - type: web
    name: bokun-bot-api
    runtime: node
    plan: starter
    region: frankfurt
    buildCommand: npm install
    preDeployCommand: npm run convex:deploy
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: CONVEX_DEPLOY_KEY
        sync: false
      - key: CONVEX_URL
        sync: false
      # ... (full list in Architecture Patterns section)

  - type: web
    name: bokun-bot-dashboard
    runtime: static
    rootDir: frontend
    plan: free
    region: frankfurt
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    autoDeploy: true
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_CONVEX_URL
        sync: false
```

### CONVEX_DEPLOY_KEY Usage Pattern

```bash
# Source: https://docs.convex.dev/cli/deploy-key-types (verified 2026-03-01)
#
# 1. Go to Convex Dashboard > Project Settings > Deploy Keys
# 2. Generate a Production deploy key
# 3. Format: prod:qualified-jaguar-123|eyJ2...0=
# 4. Set as CONVEX_DEPLOY_KEY in Render service environment
#
# When set, `convex deploy` runs non-interactively:
CONVEX_DEPLOY_KEY='prod:...' npx convex deploy
# or via npm script:
npm run convex:deploy   # uses CONVEX_DEPLOY_KEY from env automatically
```

### Backend .env.example Structure

```bash
# ─── Convex ────────────────────────────────────────────────────────────────
# From: Convex Dashboard > Deployment > Settings
CONVEX_URL=https://xxx.convex.cloud
CONVEX_SITE_URL=https://xxx.convex.site

# From: Convex Dashboard > Project Settings > Deploy Keys (Production type)
# Used by: npm run convex:deploy in Render preDeployCommand — NOT the running app
CONVEX_DEPLOY_KEY=prod:...

# ─── Bokun API ─────────────────────────────────────────────────────────────
# Production: https://api.bokun.io  |  Sandbox: https://api.bokuntest.com
BOKUN_BASE_URL=https://api.bokuntest.com
# From: Bokun vendor dashboard API credentials
BOKUN_ACCESS_KEY=
BOKUN_SECRET_KEY=

# ─── Bokun OAuth (Marketplace App) ─────────────────────────────────────────
# From: Bokun App Marketplace > Your App > Credentials
BOKUN_APP_CLIENT_ID=
BOKUN_APP_CLIENT_SECRET=
BOKUN_OAUTH_REDIRECT_URI=https://your-render-service.onrender.com/oauth/callback
BOKUN_OAUTH_SCOPES=bookings activities

# ─── WhatsApp (Meta Cloud API) ─────────────────────────────────────────────
# From: Meta Developer Console > App > WhatsApp > App Secret
WHATSAPP_APP_SECRET=
# From: Meta Developer Console > App > WhatsApp > Webhook > Verify Token (you choose this)
WHATSAPP_VERIFY_TOKEN=

# ─── OpenAI (LLM Agent — global fallback) ──────────────────────────────────
# Each tenant configures their own key in the dashboard; this is the system fallback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# ─── Observability ─────────────────────────────────────────────────────────
# From: Sentry Dashboard > Project > Settings > Client Keys
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# ─── Logging ───────────────────────────────────────────────────────────────
# Values: debug | info | warn | error  (default: info)
LOG_LEVEL=info

# ─── Server ────────────────────────────────────────────────────────────────
# Render sets PORT automatically; set locally if port 3000 conflicts
PORT=3000

# ─── Rate Limiting ─────────────────────────────────────────────────────────
# RATE_LIMIT_MAX=10           # Max messages per window per phone number (default: 10)
# RATE_LIMIT_WINDOW_MS=60000  # Window duration in ms (default: 60000 = 1 minute)

# ─── Debug ─────────────────────────────────────────────────────────────────
# WHATSAPP_WEBHOOK_DEBUG=1    # Verbose webhook debug logs (dev only)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate CI/CD pipeline (GitHub Actions) | Render native pipeline with `preDeployCommand` | 2023 (Render changelog) | No extra CI config needed for v1 |
| Manual `npx convex deploy` before push | `preDeployCommand: npm run convex:deploy` | Render preDeployCommand GA: Oct 2023 | Automatic, atomic, fail-safe |
| `.env` file copied to server | Render Environment Groups | Current standard | Secrets never in filesystem/logs |

---

## Open Questions

1. **DEPLOY-04 scope for Stripe (Phase 3)**
   - What we know: The requirement says "HMAC signature verification passes for all three webhook types (Meta, Bokun, Stripe)." Stripe integration is Phase 3.
   - What's unclear: Should Phase 2 pre-populate Stripe env var placeholders in `.env.example` and render.yaml, even though the code doesn't exist yet?
   - Recommendation: Yes — document Stripe var placeholders in `.env.example` with a note "required for Phase 3 billing" to avoid needing to update render.yaml later. DEPLOY-04's webhook verification test is deferred to Phase 3 for Stripe only. Meta + Bokun HMAC verification is fully testable in Phase 2.

2. **Render region selection**
   - What we know: Primary users are in Spain/Barcelona area (Sondevela reference). Frankfurt (`frankfurt`) is the closest EU region on Render.
   - What's unclear: Actual latency profile. Oregon would be worse for EU users.
   - Recommendation: Use `frankfurt` for both services. This is within Claude's discretion.

3. **CONVEX_SITE_URL requirement**
   - What we know: `CONVEX_SITE_URL` is documented in CLAUDE.md as a required env var but does not appear in current source code grep of `process.env`.
   - What's unclear: Whether it is used internally by the Convex client SDK or only needed for HTTP Actions.
   - Recommendation: Include in `.env.example` as documented in CLAUDE.md. Low risk to include; high risk to omit if the Convex client SDK requires it at init time.

---

## Sources

### Primary (HIGH confidence)

- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec) — service types, envVars, envVarGroups, preDeployCommand, staticPublishPath, routes, plan values, runtime values
- [Render Build Pipeline](https://render.com/docs/build-pipeline) — preDeployCommand availability and pipeline step sequencing
- [Render Environment Variables](https://render.com/docs/configure-environment-variables) — sync:false pattern, envVarGroups constraints
- [Render Monorepo Support](https://render.com/docs/monorepo-support) — rootDir field behavior
- [Convex Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) — key types, CONVEX_DEPLOY_KEY format, non-interactive usage
- [Convex Production Docs](https://docs.convex.dev/production) — CONVEX_DEPLOY_KEY, npx convex deploy command
- Source code audit: `grep -r "process.env" src/` on project — complete env var inventory

### Secondary (MEDIUM confidence)

- [Render Deploys](https://render.com/docs/deploys) — preDeployCommand requires paid web service (Starter or above); not available on Free
- [Convex Vercel Hosting](https://docs.convex.dev/production/hosting/vercel) — confirms CONVEX_DEPLOY_KEY is read by `npx convex deploy` from environment; wraps frontend build command pattern
- Render changelog (Oct 2023) — preDeployCommand GA release date, confirmed feature is stable

### Tertiary (LOW confidence)

- [Render community thread](https://community.render.com/t/environment-groups-in-yaml-with-sync-false-does-not-ask-for-variables-on-deployment/915) — sync:false constraint inside envVarGroups; needs dashboard verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified against official Render and Convex docs
- Architecture: HIGH — render.yaml structure verified against official Blueprint spec; env var list verified via source code grep
- Pitfalls: MEDIUM — most verified via official docs; sync:false envVarGroups constraint verified via community thread (single source, LOW → MEDIUM due to official constraint documentation corroborating it)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Render Blueprint spec is stable; Convex deploy key mechanism is stable)
