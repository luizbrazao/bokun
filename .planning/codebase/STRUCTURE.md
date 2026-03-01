# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
/Users/luizbrazao/Projetos/Bokun/
├── src/                      # Main application code (TypeScript)
│   ├── server.ts             # HTTP server entry point (webhooks, OAuth)
│   ├── bokun/                # Bokun API integration layer
│   ├── whatsapp/             # WhatsApp message handling
│   ├── telegram/             # Telegram message handling
│   ├── llm/                  # OpenAI LLM agent
│   ├── oauth/                # OAuth Bokun marketplace flow
│   ├── providers/            # Multi-provider abstraction
│   └── convex/               # Convex client initialization
├── convex/                   # Convex backend (database schema + functions)
│   ├── schema.ts             # Database schema definition
│   ├── http.ts               # HTTP handler routing
│   ├── tenants.ts            # Tenant CRUD
│   ├── bokun*.ts             # Bokun credential storage
│   ├── whatsapp*.ts          # WhatsApp channel storage
│   ├── telegram*.ts          # Telegram channel storage
│   ├── conversations.ts      # Conversation state
│   ├── booking*.ts           # Booking draft & confirmation
│   ├── chat*.ts              # Chat message history
│   ├── dedup.ts              # Webhook deduplication
│   ├── oauth*.ts             # OAuth state management
│   ├── auth.ts               # Auth system (login/users)
│   ├── cleanup.ts            # TTL cleanup jobs
│   ├── crons.ts              # Scheduled jobs
│   └── _generated/           # Generated types (auto)
├── frontend/                 # React + Vite dashboard (separate sub-project)
├── scripts/                  # Test & demo scripts (run via --experimental-strip-types)
├── docs/                     # Technical documentation
└── package.json              # Root dependencies
```

## Directory Purposes

**src/**
- Purpose: Main TypeScript application
- Contains: HTTP server, message handlers, integrations, LLM logic
- Key files: `server.ts` is entry point

**src/bokun/**
- Purpose: Bokun API integration layer
- Contains: Activity search, availabilities, pickup places, booking cart/reserve/confirm, credential resolution, HMAC signing, endpoint allowlisting
- Key files:
  - `gateway.ts` - Tenant-scoped gateway functions (entry point for all Bokun operations)
  - `context.ts` - Resolve baseUrl + auth headers from tenant config
  - `client.ts` - Low-level HTTP client with HMAC auth
  - `allowlist.ts` - Permitted endpoints (security critical)
  - `activities.ts`, `availabilities.ts`, `booking.ts`, `pickupPlaces.ts`, `questions.ts` - Domain-specific operations
  - `availabilityToOptionMap.ts` - Convert availability arrays to option maps
  - `availabilityNormalizer.ts` - Date/time normalization

**src/whatsapp/**
- Purpose: WhatsApp messaging (Meta Cloud API)
- Contains: Webhook handler, message parser, router, handlers for each booking step, formatting utilities
- Key files:
  - `webhook.ts` - Webhook entry point (called from server.ts)
  - `router.ts` - Route message to booking state machine or LLM
  - `metaClient.ts` - Send messages via Meta Cloud API
  - `parseMetaWebhook.ts` - Parse Meta webhook payload
  - `conversationStore.ts` - Load/save conversation state (through Convex)
  - `handlers/` - Booking flow handlers (one per step)
  - `formatAvailabilityOptions.ts`, `formatPickupPlaces.ts` - WhatsApp text formatting

**src/whatsapp/handlers/**
- Purpose: Booking state machine handlers
- Contains: One handler file per booking step, each handles user input → next step
- Key files:
  - `orchestrateBooking.ts` - Main dispatcher, loads draft, routes to correct handler
  - `listTimes.ts` - Query Bokun for availabilities, format as numbered options
  - `afterSelectTime.ts` - Validate time selection, determine next step (pickup or participants)
  - `selectPickupPlace.ts`, `afterSelectPickup.ts` - Pickup place selection
  - `afterAskParticipants.ts` - Parse participant count
  - `askBookingQuestions.ts`, `collectBookingAnswers.ts` - Booking questions (pre-reservation)
  - `afterConfirm.ts` - Execute Bokun booking flow (cart → reserve → confirm)
  - `cancelBooking.ts`, `editBooking.ts` - Cancellation and modification
  - `handoff.ts` - Operator relay

**src/telegram/**
- Purpose: Telegram Bot API (similar to WhatsApp but for Telegram channel)
- Contains: Webhook handler, message parser, routing
- Key files:
  - `webhook.ts` - Webhook entry point
  - `botClient.ts` - Send messages via Telegram Bot API
  - `parseTelegramUpdate.ts` - Parse Telegram update payload

**src/llm/**
- Purpose: OpenAI LLM agent for fallback NLU
- Contains: Agent loop, system prompt builder, tool definitions, conversation history, OpenAI client factory
- Key files:
  - `agent.ts` - Main agent loop (call OpenAI, execute tools, save history)
  - `client.ts` - OpenAI client factory with per-key caching
  - `systemPrompt.ts` - Build system prompt (tenant context, current time, available tools)
  - `tools.ts` - Define OpenAI tools (Bokun gateway methods) + executors
  - `memory.ts` - Load/save chat message history from Convex

**src/oauth/**
- Purpose: Bokun marketplace OAuth integration
- Contains: Authorization request builder, token exchange, tenant creation
- Key files:
  - `handler.ts` - `handleOAuthAuthorize()` and `handleOAuthCallback()`

**src/convex/**
- Purpose: Convex client initialization
- Contains: HTTP proxy client
- Key files:
  - `client.ts` - Get Convex client singleton

**convex/**
- Purpose: Serverless backend (Convex platform)
- Contains: Database schema, mutations, queries, HTTP handler routing, cron jobs
- Key files:
  - `schema.ts` - Database schema definition (all tables)
  - `http.ts` - HTTP handler routing (proxy from src/ to mutations/queries)
  - `tenants.ts` - Tenant CRUD mutations/queries
  - `bokun*.ts` - Bokun credential storage
  - `whatsapp*.ts` - WhatsApp channel metadata
  - `telegram*.ts` - Telegram channel metadata
  - `conversations.ts` - Conversation state (lastActivityId, option maps, handoff)
  - `booking*.ts` - Booking draft lifecycle + confirmation
  - `chat*.ts` - Chat message history (for LLM context)
  - `dedup.ts` - Webhook deduplication
  - `oauth*.ts` - OAuth state (CSRF protection)
  - `auth.ts` - Authentication system (Convex Auth)
  - `cleanup.ts` - TTL-based cleanup (expired dedup, old messages)
  - `crons.ts` - Scheduled jobs

**convex/_generated/**
- Purpose: Auto-generated types and API
- Contains: TypeScript definitions for mutations/queries, data model types
- Key files: `api.d.ts` (mutation/query types), `dataModel.d.ts` (table types), `server.d.ts` (Convex SDK types)
- Generated by: Convex CLI (do not edit manually)

**frontend/**
- Purpose: React + Vite dashboard (separate sub-project)
- Contains: Admin panel for vendors (channel config, settings, chat history, bookings)

**scripts/**
- Purpose: Test and demo scripts (no network, offline validation)
- Contains: Smoke tests, demo payloads, TTL simulations
- Run: `node --experimental-strip-types scripts/<name>.ts`

**docs/**
- Purpose: Technical documentation
- Contains: Architecture guides, endpoint references, booking flow diagrams, n8n reference chatbot

## Key File Locations

**Entry Points:**
- `src/server.ts` - HTTP server (webhooks: POST /whatsapp/webhook, /telegram/webhook/{botUsername}, /bokun/webhook, /oauth/*)
- `src/whatsapp/webhook.ts` - WhatsApp message handler (called from server.ts)
- `src/whatsapp/router.ts` - Message router (booking state machine vs. LLM)
- `convex/http.ts` - Convex HTTP handler (routes from src/ to mutations/queries)

**Configuration:**
- `.env.local` - Environment variables (secrets)
- `.env.example` - Template for .env vars
- `package.json` - npm dependencies
- `tsconfig.json` - TypeScript config
- `convex.json` - Convex project config
- `frontend/vite.config.ts` - Vite config for dashboard

**Core Logic:**
- `src/whatsapp/handlers/orchestrateBooking.ts` - Booking state machine dispatcher
- `src/bokun/gateway.ts` - Bokun API abstraction
- `src/llm/agent.ts` - LLM agent loop
- `convex/schema.ts` - Database schema
- `convex/conversations.ts`, `convex/bookingDrafts.ts` - State persistence

**Testing:**
- `scripts/` - All test/demo scripts
- Most files are `*_noNetwork.ts` (mock data, no external calls)

## Naming Conventions

**Files:**
- `*.ts` - TypeScript source files
- `{domain}*.ts` - Related domain files (e.g., `bokun*.ts` all in src/bokun/)
- `handle*.ts` - Handler functions (e.g., `handleListTimes.ts`, `handleAfterSelectTime.ts`)
- `format*.ts` - Formatting utilities (e.g., `formatAvailabilityOptions.ts`)
- `parse*.ts` - Parsing utilities (e.g., `parseMetaWebhook.ts`)
- `*Normalizer.ts` - Data transformation (e.g., `availabilityNormalizer.ts`)
- `*Store.ts` - Data access layer (e.g., `conversationStore.ts`)
- `*Client.ts` - External API client (e.g., `metaClient.ts`, `bokunClient.ts`)
- `_generated/` - Auto-generated (Convex compiler)
- `scripts/*.ts` - Test/demo scripts (optional `_noNetwork` suffix for offline ones)

**Directories:**
- `src/{domain}/` - Each integration domain (bokun, whatsapp, telegram, llm, oauth)
- `src/{domain}/handlers/` - Handler functions for domain
- `convex/` - Backend functions and schema
- `docs/` - Documentation markdown files

**Functions:**
- `bokun<Action>ForTenant(tenantId, ...)` - Bokun gateway functions (tenant-scoped)
- `handle<Event>(...)` - Event handler functions
- `format<Type>(...)` - Formatting functions
- `parse<Type>(...)` - Parsing functions
- `get<Resource>(...)` - Fetch operations
- `create<Resource>(...)`, `update<Resource>(...)`, `delete<Resource>(...)` - CRUD operations

**Variables:**
- camelCase for variables, functions, parameters
- UPPER_SNAKE_CASE for constants (e.g., `OPTION_MAP_TTL_MS`, `MAX_TOOL_ITERATIONS`)
- Prefixed with type hint: `is<Type>`, `as<Type>`, `maybe<Type>` (e.g., `isValidYmdDate()`, `asNonEmptyString()`, `maybeTitle`)

**Types/Interfaces:**
- PascalCase (e.g., `BookingDraftState`, `OrchestrateBookingArgs`, `OrchestrateBookingResult`)
- Suffixed with intent: `*Args`, `*Result`, `*State`, `*Config`, `*Options`, `*Record`

## Where to Add New Code

**New Booking Step:**
- Create `src/whatsapp/handlers/handle<StepName>.ts`
- Export function `handle<StepName>(args: Handle<StepName>Args): Promise<Handle<StepName>Result>`
- Import in `src/whatsapp/handlers/orchestrateBooking.ts` and add case to dispatcher
- Update `BookingNextStep` type to include new step

**New Bokun Endpoint:**
- Add to `src/bokun/allowlist.ts` if calling via HTTP
- Add domain function in appropriate file (e.g., `src/bokun/activities.ts`)
- Export gateway function from `src/bokun/gateway.ts` as `bokun<Action>ForTenant()`
- If used by LLM, add tool definition in `src/llm/tools.ts`

**New LLM Tool:**
- Add tool definition to `toolDefinitions` array in `src/llm/tools.ts`
- Add executor function in `executeTool()` (call gateway method)
- Test with smoke test in `scripts/smokeTestLLMAgent.ts`

**New Webhook (Incoming):**
- Add handler function (e.g., `handleWebhookPost()`)
- Add route in `src/server.ts::createAppServer()` if needed
- Validate signature if applicable
- Call `processWebhookWithDedup()` for dedup + routing

**New Convex Table:**
- Add `defineTable()` to `convex/schema.ts`
- Create corresponding file `convex/<table>.ts` for mutations/queries
- Export from `convex/http.ts` if exposing to frontend
- Update Convex schema with `npx convex dev`

**Utilities / Helpers:**
- Shared formatting: `src/whatsapp/format*.ts`
- Shared parsing: `src/whatsapp/parse*.ts`
- Bokun normalization: `src/bokun/*Normalizer.ts`
- Database access: `convex/<table>.ts`

## Special Directories

**convex/_generated/**
- Purpose: Auto-generated TypeScript types
- Generated: By Convex CLI (npx convex dev / convex deploy)
- Committed: Yes (to ensure consistent types in CI)
- Do not edit: Generated files are overwritten on each Convex CLI run

**scripts/**
- Purpose: Test and demo scripts (not part of production build)
- Generated: No (hand-written)
- Committed: Yes
- Run: `node --experimental-strip-types scripts/<name>.ts`
- Examples:
  - `smokeTestLLMAgent.ts` - Test LLM agent with mock data
  - `demoOptionMapTTL_noNetwork.ts` - Demonstrate option map TTL expiration
  - `demoBookingDraftPayload_noNetwork.ts` - Mock booking draft state transitions
  - All `*_noNetwork.ts` scripts are fully offline (no real API calls)

**docs/**
- Purpose: Technical documentation
- Contains: Architecture guides (PRD.md, booking_draft.md), endpoint references (bokun_endpoints_allowlist.md), per-handler guides (whatsapp_list_times.md)
- Committed: Yes

**.planning/codebase/**
- Purpose: Planning documents generated by GSD commands
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Generated: By `/gsd:map-codebase` command
- Committed: Yes (to inform future phases)

---

*Structure analysis: 2026-03-01*
