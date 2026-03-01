# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**Messaging Platforms:**
- **WhatsApp (Meta Cloud API)** - Primary user channel for booking conversations
  - SDK/Client: Native `fetch` (no SDK)
  - Implementation: `src/whatsapp/metaClient.ts` - POST to `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
  - Auth: Bearer token (`accessToken` from whatsapp_channels table)
  - Webhook endpoint: `POST /whatsapp/webhook` - Validates `X-Hub-Signature-256` HMAC-SHA256

- **Telegram Bot API** - Secondary user channel for booking and operator handoff
  - SDK/Client: Native `fetch` (no SDK)
  - Implementation: `src/telegram/botClient.ts` - POST to `https://api.telegram.org/bot{botToken}/sendMessage`
  - Auth: Bot token (stored in telegram_channels table)
  - Webhook endpoint: `POST /telegram/webhook/{botUsername}` - Validates `X-Telegram-Bot-API-Secret-Token` header
  - Operator handoff: Messages forwarded to operator group, replies relayed back to user

**LLM / AI:**
- **OpenAI API** - Natural language understanding and generation fallback
  - SDK/Client: `openai@6.22.0` npm package
  - Implementation: `src/llm/client.ts` (factory pattern with per-key caching), `src/llm/agent.ts` (chat completion with tool calling)
  - Auth: API key per-tenant via `tenants.openaiApiKey`, fallback to `OPENAI_API_KEY` env var
  - Model: `gpt-4o-mini` (default), configurable per-tenant via `tenants.openaiModel`
  - Tool calling: Custom tools for Bokun gateway integration
  - Memory: Conversation history stored in `chat_messages` table (indexed by `tenantId` + `waUserId`)

**Booking Platform:**
- **Bokun API** - Core activity, availability, and booking integration
  - SDK/Client: Custom HTTP client (`src/bokun/client.ts`) with low-level fetch
  - Implementation: `src/bokun/gateway.ts` (high-level functions per-tenant), endpoints in `src/bokun/activities.ts`, `availabilities.ts`, `pickupPlaces.ts`, `booking.ts`
  - Auth: Dual support:
    1. **HMAC-SHA1 (API keys)**: `BOKUN_ACCESS_KEY` + `BOKUN_SECRET_KEY` (fallback)
    2. **OAuth Bearer**: Marketplace token from OAuth flow, stored in `bokun_installations.authHeaders`
  - Base URL: `BOKUN_BASE_URL` (https://api.bokun.io for production, https://api.bokuntest.com for test)
  - Endpoints (allowlisted in `src/bokun/allowlist.ts`):
    - `POST /activity.json/search` - Search activities
    - `GET /activity.json/{id}` - Get activity details
    - `GET /activity.json/{id}/availabilities` - Check availability by date
    - `GET /activity.json/{id}/pickup-places` - List pickup locations
    - `POST /shopping-cart.json/session/{sessionId}/activity` - Add to cart
    - `GET /shopping-cart.json/session/{sessionId}` - Get cart
    - `POST /booking.json/guest/{sessionId}/reserve` - Reserve (30-min hold)
    - `POST /booking.json/{confirmationCode}/confirm` - Confirm reservation
    - `GET /booking.json/{confirmationCode}/abort-reserved` - Cancel reserved booking
    - `GET /booking.json/booking/{confirmationCode}` - Get booking details
    - `POST /booking.json/cancel-booking/{confirmationCode}` - Cancel confirmed booking
  - Webhook endpoint: `POST /bokun/webhook` - Validates Base64-encoded `x-bokun-hmac` HMAC-SHA256
  - Webhook topics: `bookings/create`, `bookings/update`, `bookings/cancel`, `apps/uninstall`
  - Request timeout: Bokun expects 5-second response window

## Data Storage

**Databases:**
- **Convex** - Serverless reactive database (primary data store)
  - Connection: HTTP client via `CONVEX_URL` environment variable
  - ORM/Client: Custom `ConvexHttpClient` wrapper in `src/convex/client.ts`
  - Schema: `convex/schema.ts` defines all tables
  - Key tables:
    - `tenants` - Vendor/multi-tenant records
    - `bokun_installations` - Bokun OAuth credentials per tenant
    - `whatsapp_channels` - WhatsApp Business phone numbers per tenant
    - `telegram_channels` - Telegram bot credentials per tenant
    - `conversations` - User conversation state (option maps, handoff state)
    - `booking_drafts` - In-progress booking state machine (lifecycle ~18KB per draft)
    - `chat_messages` - LLM conversation history (indexed for memory retrieval)
    - `webhook_dedup` - Idempotence tracking (TTL: 7 days)
    - `oauth_states` - CSRF protection for OAuth flow (TTL: 10 minutes)
  - Mutations/Queries: Dynamic invocation via string names (no type-safe layer yet)

**File Storage:**
- Not detected - No S3, Firebase Storage, or file-based persistence
- All state persisted in Convex database

**Caching:**
- In-memory: OpenAI client caching per API key in `src/llm/client.ts` (Map<string, OpenAI>)
- Option maps: Stored in `booking_drafts.lastOptionMap` and `conversations.lastOptionMap` with TTL metadata
- No Redis or external cache

## Authentication & Identity

**Auth Provider:**
- **Bokun OAuth 2.0** - Marketplace integration for vendor onboarding
  - Implementation: `src/oauth/handler.ts` (Authorization Code Flow)
  - Flow: `/oauth/authorize` → Bokun vendor login → `/oauth/callback` → token exchange
  - State nonce: 32-byte random hex stored in `oauth_states` table (10-min TTL for CSRF protection)
  - Token: Permanent access token (no refresh needed), stored in `bokun_installations.authHeaders`
  - Scopes: `bookings activities` (configurable via `BOKUN_OAUTH_SCOPES`)

- **Convex Auth** - User authentication for admin/vendor dashboard (optional)
  - Implementation: `@convex-dev/auth` tables + utilities
  - Tables: `users` (auto-created by auth tables), `user_tenants` (junction for multi-tenant access)
  - Roles: `owner`, `admin`, `viewer`

**Session Management:**
- WhatsApp/Telegram user ID (`waUserId`, `tg:chatId`) as session key
- Conversation state tracked in `conversations` table (indexed by `tenantId` + `waUserId`)
- LLM message history in `chat_messages` (indexed for retrieval)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or error aggregation service
- Errors logged to console/stderr only

**Logs:**
- Console-based logging via `console.log()`
- Optional debug flag: `WHATSAPP_WEBHOOK_DEBUG=1` enables webhook payload logging in `src/server.ts`
- No centralized logging service

## CI/CD & Deployment

**Hosting:**
- Not pre-configured - Expected deployment targets:
  - Railway, Fly.io, Render, Heroku, or any platform supporting Node.js HTTP servers
  - Alternative: Convex serverless actions (if migrating from HTTP server)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or Jenkins workflows present

**Convex Deployment:**
- Command: `npm run convex:deploy` (manual)
- Requires: `CONVEX_DEPLOYMENT` environment variable set

## Environment Configuration

**Required env vars (for startup):**
- `CONVEX_URL` - Convex backend URL (generated during `convex dev`)
- `META_APP_SECRET` - WhatsApp webhook signature verification
- `WHATSAPP_VERIFY_TOKEN` - WhatsApp webhook challenge verification
- `BOKUN_APP_CLIENT_ID` - OAuth marketplace app ID
- `BOKUN_APP_CLIENT_SECRET` - OAuth marketplace app secret
- `BOKUN_OAUTH_REDIRECT_URI` - OAuth callback URL (e.g., `https://your-domain.com/oauth/callback`)

**Optional but recommended:**
- `BOKUN_BASE_URL` - Defaults to `https://api.bokuntest.com` (test) or set to `https://api.bokun.io` (production)
- `BOKUN_ACCESS_KEY` + `BOKUN_SECRET_KEY` - For direct HMAC auth (fallback if OAuth fails)
- `OPENAI_API_KEY` - Global fallback (per-tenant key in `tenants.openaiApiKey` takes precedence)
- `OPENAI_MODEL` - Default model (per-tenant in `tenants.openaiModel` overrides)
- `PORT` - Server port (default: 3000)
- `WHATSAPP_WEBHOOK_DEBUG` - Set to "1" for verbose webhook logging

**Secrets location:**
- `.env.local` file (loaded by `dotenv@16.4.5`)
- Never committed to git (`.gitignore` excludes `.env*`)
- For deployment: Set environment variables in platform settings (Fly.io, Railway, etc.)

## Webhooks & Callbacks

**Incoming (Webhook Endpoints):**
- **WhatsApp Messages**: `POST /whatsapp/webhook`
  - Signature: `X-Hub-Signature-256` (SHA256 HMAC with `META_APP_SECRET`)
  - Parser: `src/whatsapp/parseMetaWebhook.ts` extracts messages from Meta Cloud API payload
  - Dedup: Message ID based, fallback to SHA256 hash of (tenantId + waUserId + body)

- **Telegram Messages**: `POST /telegram/webhook/{botUsername}`
  - Signature: `X-Telegram-Bot-API-Secret-Token` header (simple string comparison)
  - Parser: `src/telegram/parseTelegramUpdate.ts` extracts text and metadata
  - Handoff: Operator group messages (identified by `operatorGroupChatId`) relayed to/from users

- **Bokun Events**: `POST /bokun/webhook`
  - Signature: `x-bokun-hmac` header (Base64-encoded SHA256 HMAC with `BOKUN_APP_CLIENT_SECRET`)
  - Topics: `bookings/create`, `bookings/update`, `bookings/cancel`, `apps/uninstall`
  - Handler: `src/bokun/webhookHandler.ts`
  - Response timeout: 5 seconds (Bokun requirement)

- **Health Check**: `GET /health`
  - Returns: `{ ok: true, environment: "test" | "production" }`

**Outgoing (Calls to External APIs):**
- **Meta Cloud API**: `POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
  - When: After booking handler or LLM agent produces reply text
  - Auth: Bearer token from `whatsapp_channels.accessToken`
  - Response: Message ID or error

- **Telegram Bot API**: `POST https://api.telegram.org/bot{botToken}/sendMessage`
  - When: After booking handler or LLM agent produces reply, or operator handoff messages
  - Auth: Bot token from `telegram_channels.botToken`
  - Chunking: Messages >4096 chars split across multiple requests

- **Bokun API**: Multiple endpoints (see Booking Platform section above)
  - When: Activity search, availability checks, booking lifecycle (reserve/confirm)
  - Auth: OAuth Bearer token or HMAC-SHA1
  - Errors: Allowlisted endpoints only; unauthorized endpoints throw error

- **OpenAI Chat API**: `POST https://api.openai.com/v1/chat/completions`
  - When: Booking flow defers to LLM for natural language understanding
  - Auth: API key (per-tenant or global fallback)
  - Tool calling: Custom tools for searching activities, checking availability, making bookings

---

*Integration audit: 2026-03-01*
