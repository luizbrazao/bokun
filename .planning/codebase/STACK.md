# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.4 - All source code and server logic
- JavaScript/ES Modules - Runtime and scripts

**Secondary:**
- JSON - Configuration and data serialization

## Runtime

**Environment:**
- Node.js 18+ (specified in `package.json` engines field)
- Execution: ES Modules with `import/export` syntax
- Script execution: `node --experimental-strip-types` for TypeScript files

**Package Manager:**
- npm
- Lockfile: Yes (`package-lock.json` inferred from standard setup)

## Frameworks

**Core:**
- Convex 1.31.7 - Serverless backend, database, and real-time reactivity
- OpenAI 6.22.0 - LLM integration for natural language understanding (GPT-4o-mini by default)

**Authentication:**
- @auth/core 0.37.4 - Authentication framework foundation
- @convex-dev/auth 0.0.90 - Convex-specific authentication layer

**Utilities:**
- dotenv 16.4.5 - Environment variable loading

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for scripts and development
- @types/node 20.11.0 - Node.js type definitions

## Key Dependencies

**Critical:**
- convex 1.31.7 - Provides backend-as-a-service with reactive database (Convex), mutations, queries, actions
- openai 6.22.0 - OpenAI API client for GPT-based agent functionality
- @convex-dev/auth 0.0.90 - Authentication tables and utilities for Convex

**Infrastructure:**
- @auth/core 0.37.4 - Base authentication framework (OAuth integration support)
- dotenv 16.4.5 - Environment variable configuration management

## Configuration

**Environment:**
- `.env.local` file required at runtime (loaded by dotenv)
- See `.env.example` for template
- Environment variables split into categories:
  - **Convex**: `CONVEX_URL`, `CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`
  - **Bokun API**: `BOKUN_BASE_URL`, `BOKUN_ACCESS_KEY`, `BOKUN_SECRET_KEY`
  - **Bokun OAuth**: `BOKUN_APP_CLIENT_ID`, `BOKUN_APP_CLIENT_SECRET`, `BOKUN_OAUTH_REDIRECT_URI`, `BOKUN_OAUTH_SCOPES`
  - **WhatsApp**: `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`
  - **OpenAI**: `OPENAI_API_KEY`, `OPENAI_MODEL` (optional fallback)
  - **Server**: `PORT` (default: 3000)
  - **Debug**: `WHATSAPP_WEBHOOK_DEBUG` (optional)

**Build:**
- No build config file needed (ES Modules directly)
- TypeScript compilation: via tsx during development
- Production: typically requires Node 18+ with ES Module support

## Platform Requirements

**Development:**
- Node.js 18 or higher
- npm
- `.env.local` file with Convex credentials
- Tunnel tool for webhook testing (ngrok, etc.)

**Production:**
- Node.js 18+ runtime
- Deployment target: Platform supporting Node.js HTTP servers (Railway, Fly.io, Render, Heroku, etc.)
- Required env vars: `CONVEX_URL`, `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `BOKUN_*` credentials
- HTTP server on port `PORT` (default 3000)
- Inbound webhooks from Meta (WhatsApp), Telegram, Bokun APIs

## HTTP Client

- Native `fetch` API - Used for all external HTTP requests (no axios/superagent)
- Located in: `src/whatsapp/metaClient.ts`, `src/telegram/botClient.ts`, `src/bokun/client.ts`

---

*Stack analysis: 2026-03-01*
