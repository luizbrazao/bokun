# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Event-driven, multi-tenant chatbot system with layered architecture. WhatsApp/Telegram user messages flow through a hybrid router: deterministic state machine (booking flow) first, then LLM fallback for unhandled queries. Backend uses Convex (serverless database + functions) with external API integrations to Bokun (activity booking system) and OpenAI (language understanding).

**Key Characteristics:**
- Multi-tenant isolation: every operation scoped by `tenantId`
- Dual-mode message handling: booking state machine (deterministic) + LLM agent (flexible)
- Webhook-driven integrations: WhatsApp, Telegram, and Bokun webhooks processed by same core pipeline
- Transient state management: "option maps" cache availability/pickup data with 15-minute TTL
- Serverless + reactive database: Convex provides schema, mutations, queries, scheduled jobs

## Layers

**Presentation / Webhook Handlers:**
- Purpose: Receive and validate incoming webhooks from WhatsApp, Telegram, and Bokun. Validate HMAC signatures. Extract tenant context from channel metadata.
- Location: `src/server.ts`, `src/whatsapp/webhook.ts`, `src/telegram/webhook.ts`
- Contains: HTTP server, signature verification, message extraction, channel resolution
- Depends on: Convex client (to resolve channels and claim dedup)
- Used by: Incoming messages from Meta Cloud API, Telegram Bot API, Bokun webhooks

**Message Routing / Orchestration:**
- Purpose: Route messages through two paths: booking state machine (if active) or LLM fallback. Handle handoff to human operators.
- Location: `src/whatsapp/router.ts`, `src/whatsapp/handlers/orchestrateBooking.ts`
- Contains: Router logic, booking state machine orchestration, handoff detection
- Depends on: Booking handlers, LLM agent, Convex (for conversation state)
- Used by: Webhook handlers after dedup validation

**Booking Flow (State Machine):**
- Purpose: Deterministic multi-step booking flow via `booking_draft.nextStep` field. Each step has a dedicated handler.
- Location: `src/whatsapp/handlers/`
- Contains: Handlers for each step: `listTimes.ts`, `selectTime.ts`, `afterSelectTime.ts`, `afterSelectPickup.ts`, `afterAskParticipants.ts`, `askBookingQuestions.ts`, `collectBookingAnswers.ts`, `afterConfirm.ts`, `cancelBooking.ts`, `editBooking.ts`
- Depends on: Bokun gateway (for activity/availability/pickup queries), Convex (for state persistence), formatting utilities
- Used by: Router when `booking_draft.nextStep` is set

**LLM Agent (Fallback):**
- Purpose: Natural language understanding via OpenAI. Interprets free-form user input and executes tools (Bokun queries) as needed.
- Location: `src/llm/agent.ts`, `src/llm/systemPrompt.ts`, `src/llm/tools.ts`, `src/llm/memory.ts`, `src/llm/client.ts`
- Contains: Tool definitions (Bokun gateway methods as tools), system prompt builder, conversation history loader/saver, OpenAI API client factory
- Depends on: Bokun gateway, Convex (for chat history and tenant config), OpenAI API
- Used by: Router when booking state machine returns `handled: false`

**Bokun Integration Layer (Gateway):**
- Purpose: Abstraction over Bokun REST API. Handles multi-tenant credential resolution, HMAC signing, endpoint allowlisting.
- Location: `src/bokun/gateway.ts`, `src/bokun/context.ts`, `src/bokun/client.ts`, `src/bokun/allowlist.ts`
- Contains: Gateway functions (e.g., `bokunSearchActivitiesForTenant`), HTTP client with HMAC auth, credential resolution, endpoint validation
- Depends on: Bokun client (low-level HTTP), Convex (for tenant credentials)
- Used by: Booking handlers, LLM tools, webhook handlers

**Bokun API Clients:**
- Purpose: Domain-specific API operations: search activities, get availabilities, manage shopping cart, reserve/confirm bookings, fetch questions/pickup places.
- Location: `src/bokun/activities.ts`, `src/bokun/availabilities.ts`, `src/bokun/booking.ts`, `src/bokun/pickupPlaces.ts`, `src/bokun/questions.ts`, `src/bokun/availabilityNormalizer.ts`, `src/bokun/availabilityToOptionMap.ts`
- Contains: Domain logic for transforming Bokun payloads (normalize dates, convert availability arrays to option maps)
- Depends on: HTTP client, allowlist validator
- Used by: Gateway layer

**Backend (Convex):**
- Purpose: Reactive database + serverless functions. Provides schema, mutations (data mutations), queries (data reads), HTTP handler routing, and cron jobs.
- Location: `convex/schema.ts`, `convex/*.ts`
- Contains:
  - Schema: `tenants`, `bokun_installations`, `provider_installations`, `whatsapp_channels`, `telegram_channels`, `conversations`, `booking_drafts`, `chat_messages`, `webhook_dedup`, `oauth_states`, `bookings`, etc.
  - Mutations: Create/update/delete data; handle OAuth callback; create bookings; claim dedup; clear chat history
  - Queries: Fetch tenant data, channel metadata, conversation state, booking draft, chat history
  - HTTP handler: Proxy HTTP requests from src/ to mutations/queries
  - Crons: Cleanup expired dedup records, TTL for option maps
- Depends on: Convex SDK
- Used by: All src/ code via `getConvexClient()` (Convex HTTP proxy)

**OAuth Integration:**
- Purpose: Marketplace OAuth flow with Bokun. Vendor clicks "Install" → redirected to Bokun → code returned → callback creates tenant + Bokun credentials.
- Location: `src/oauth/handler.ts`
- Contains: Authorization request builder, callback handler (exchanges code for token, creates tenant + bokun_installation)
- Depends on: Bokun API, Convex
- Used by: HTTP server `/oauth/authorize` and `/oauth/callback` routes

**Conversation Management:**
- Purpose: Persist conversation state across messages. Track lastActivityId, option maps (with TTL), handoff state.
- Location: `convex/conversations.ts`, `src/whatsapp/conversationStore.ts`
- Contains: Convex mutations/queries for conversations table
- Depends on: Convex
- Used by: Router (to check handoff state), Booking handlers (to persist lastActivityId)

**Chat History / LLM Memory:**
- Purpose: Persist chat messages for LLM context window. Load recent N messages for agent.
- Location: `convex/chatMessages.ts`, `src/llm/memory.ts`
- Contains: Convex mutations/queries for chat_messages table; memory loader
- Depends on: Convex
- Used by: LLM agent

## Data Flow

**End-to-End Webhook Processing:**

1. **Webhook Ingestion** (`src/server.ts`)
   - Meta Cloud API (WhatsApp) or Telegram Bot API sends webhook POST
   - Extract raw body, validate HMAC signature (SHA256)
   - Parse payload to extract message(s), `messageId`, phone number / chat ID
   - Return 200 quickly to provider (required by Meta/Telegram spec)

2. **Tenant Resolution** (`src/server.ts`)
   - WhatsApp: Look up `whatsapp_channels` by `phoneNumberId` → `tenantId`
   - Telegram: Look up `telegram_channels` by `botUsername` → `tenantId`
   - Bokun webhook: Extract from header metadata → `tenantId`

3. **Deduplication** (`src/server.ts::processWebhookWithDedup`)
   - Create dedup key: Primary = `{prefix}:{messageId}`, fallback = SHA256 hash of (tenantId, waUserId, body)
   - Atomically claim key in `webhook_dedup` table (mutation returns false if already claimed)
   - Duplicate: return 200 immediately, skip processing

4. **Message Routing** (`src/whatsapp/router.ts::routeWhatsAppMessage`)
   - Check if conversation is in active handoff (operator relay mode) → if yes, forward to operator
   - Check for explicit "falar com operador" intent → if yes, initiate handoff
   - Try booking state machine: `orchestrateBooking()` → if handled, return response
   - Fallback to LLM agent: `runLLMAgent()` → return response

5. **Booking State Machine** (`src/whatsapp/handlers/orchestrateBooking.ts`)
   - Check for cancel/edit intents first
   - Load `booking_draft` by (tenantId, waUserId)
   - If no draft with nextStep: parse date from message, load lastActivityId, call `handleListTimes` → advance to `select_time`
   - If nextStep = `select_time`: call `handleAfterSelectTime` → advance to `select_pickup` or `ask_participants`
   - If nextStep = `select_pickup`: call `handleAfterSelectPickup` → advance to `ask_participants`
   - If nextStep = `ask_participants`: call `handleAfterAskParticipants` → advance to `ask_booking_questions` or `confirm`
   - If nextStep = `ask_booking_questions`: display first question, advance to `collect_booking_answers`
   - If nextStep = `collect_booking_answers`: validate response, store in `bookingAnswers`, display next question or advance to `confirm`
   - If nextStep = `confirm`: call `handleAfterConfirm` → execute Bokun booking flow (cart → reserve → confirm)
   - Each handler updates `booking_draft.nextStep` and returns formatted WhatsApp text

6. **Bokun Booking Execution** (`src/whatsapp/handlers/afterConfirm.ts`)
   - Create shopping cart session
   - Add activity to cart with selected time, pickup, participants, answers
   - Reserve booking (holds for ~30 min)
   - Confirm booking (completes)
   - Send confirmation message with booking reference

7. **LLM Fallback** (`src/llm/agent.ts`)
   - Load conversation history (last N chat messages from `chat_messages` table)
   - Build system prompt with tenant context
   - Send to OpenAI Chat Completion with tool definitions (Bokun gateway methods)
   - If OpenAI returns tool calls: execute tools, send results back in new message
   - Loop up to 3 times for tool calls
   - Save final user message + assistant response to `chat_messages` table

8. **Response Delivery** (`src/server.ts` + `src/whatsapp/metaClient.ts`)
   - Send response text via Meta Cloud API or Telegram Bot API
   - Log delivery status

**State Management:**

- **Booking Draft**: Lives in `booking_drafts` table, keyed by (tenantId, waUserId). Contains `nextStep`, `activityId`, `date`, `startTimeId`, `pickupPlaceId`, `participantCount`, `bookingAnswers` (JSON). Deleted after booking confirmed.
- **Option Maps**: Stored in `conversations.lastOptionMap` and `booking_draft.lastOptionMap`. Cache availabilities/pickups with TTL = 15 minutes. Prevents re-querying Bokun if user selects the same date/time again within window.
- **Conversation State**: `conversations` table tracks lastActivityId (for "give me times for DATE" shortcut), handoff state (active/idle), operator message ID for relay.
- **Chat History**: `chat_messages` table stores all messages (user + assistant). LLM loads last ~10 messages as context.

## Key Abstractions

**Booking Draft State Machine:**
- Purpose: Encodes the multi-step booking flow as deterministic state transitions
- Examples: `src/whatsapp/handlers/orchestrateBooking.ts`, `convex/bookingDrafts.ts`
- Pattern: Each step has a dedicated handler file. Handler loads draft, processes user input, updates nextStep, returns formatted response. Orchestrator dispatches based on nextStep value.

**Option Map (Time/Pickup):**
- Purpose: Translates user input (e.g., "2") to Bokun API payload without re-querying
- Examples: `src/bokun/availabilityToOptionMap.ts`, `convex/bookingDrafts.ts`
- Pattern: Array of { optionId, availabilityId, startTimeId, display, meta }. Keyed by array index. User selects index, handler looks up full payload. TTL prevents stale data.

**Bokun Gateway:**
- Purpose: Single-tenant context (baseUrl, auth headers) + method dispatch
- Examples: `src/bokun/gateway.ts`
- Pattern: Functions named `bokun<Action>ForTenant(tenantId, ...)`. Each resolves context, calls client, returns normalized payload.

**LLM Tools:**
- Purpose: Bokun gateway methods exposed as OpenAI tools
- Examples: `src/llm/tools.ts`
- Pattern: Each tool is a function that calls gateway, returns structured result. OpenAI selects which tool to call based on user intent.

**Handoff Relay:**
- Purpose: Forward user messages to human operator group without bot processing
- Examples: `src/whatsapp/handlers/handoff.ts`, `src/server.ts::handleOperatorGroupMessage`
- Pattern: When handoff active, router detects `conversation.handoffState === "active"` → forward message to operator Telegram group. Operator replies in group → relay back to user. Operator types `/resolver` to end handoff.

## Entry Points

**HTTP Server:**
- Location: `src/server.ts`
- Triggers: Node.js process start
- Responsibilities: Listen on PORT, dispatch requests to handlers

**WhatsApp Webhook Handler:**
- Location: `src/server.ts::handleWebhookPost` (POST `/whatsapp/webhook`)
- Triggers: Meta Cloud API webhook
- Responsibilities: Validate HMAC, parse message, resolve channel, dedup, route to booking/LLM

**Telegram Webhook Handler:**
- Location: `src/server.ts::handleTelegramWebhookPost` (POST `/telegram/webhook/{botUsername}`)
- Triggers: Telegram Bot API webhook
- Responsibilities: Validate secret token, parse update, resolve channel, dedup, route to booking/LLM. Also handle operator group replies.

**Bokun Webhook Handler:**
- Location: `src/server.ts::handleBokunWebhookPost` (POST `/bokun/webhook`)
- Triggers: Bokun event (booking created/updated/cancelled, app uninstalled)
- Responsibilities: Validate HMAC, parse event, update conversation/booking state

**OAuth Authorize:**
- Location: `src/server.ts::handleOAuthAuthorizeRoute` (GET `/oauth/authorize`)
- Triggers: Vendor clicks "Install" button in Bokun marketplace
- Responsibilities: Build Bokun OAuth authorization URL, redirect vendor

**OAuth Callback:**
- Location: `src/server.ts::handleOAuthCallbackRoute` (GET `/oauth/callback`)
- Triggers: Bokun redirects after vendor authorizes
- Responsibilities: Exchange code for token, create tenant + bokun_installation, return success response

## Error Handling

**Strategy:** Errors in booking flow are caught and formatted as user-friendly messages. LLM agent failures return "AI not configured" message. Webhook errors log but always return 200 (to prevent Meta/Telegram retries).

**Patterns:**

- **Booking Handler Errors**: Try-catch, return text like "Desculpe, erro ao listar horários. Tente novamente."
- **Bokun API Errors**: Caught by gateway, formatted as validation errors (e.g., "Atividade não encontrada")
- **LLM Errors**: Resolved OpenAI config → if missing, return "AI not configured" message; if API error, return generic error message
- **Webhook Validation Errors**: Return 403 (invalid signature) or 400 (parse error), but also 200 with error field (for status updates)
- **Dedup Claimed Twice**: Return 200 { duplicate: true } without processing

## Cross-Cutting Concerns

**Logging:** Console logs with prefixes: `[WA webhook]`, `[TG webhook]`, `[LLM Agent]`, `[Convex]`. Debug mode via `WHATSAPP_WEBHOOK_DEBUG=1` env var.

**Validation:**
- HMAC validation for all webhooks (timing-safe comparison)
- Allowlist validation for Bokun endpoints (reject any endpoint not explicitly allowed)
- Date validation for availability queries (YYYY-MM-DD format)
- Option map validation (kind, TTL, structure)

**Authentication:**
- WhatsApp: HMAC SHA256 (X-Hub-Signature-256 header, META_APP_SECRET)
- Bokun webhooks: HMAC SHA256 Base64 (x-bokun-hmac header, BOKUN_APP_CLIENT_SECRET)
- Bokun API (from server): HMAC SHA1 (X-Bokun-AccessKey, X-Bokun-SecretKey headers) or OAuth Bearer token
- Telegram Bot API: Secret token in header (x-telegram-bot-api-secret-token)
- Convex: HTTP proxy to serverless backend (CONVEX_URL env var)

**Multi-Tenancy:** Every query/mutation includes `tenantId` parameter. Convex enforces isolation at schema level (all tables have `tenantId` index). Credential resolution always scoped by `tenantId`.

---

*Architecture analysis: 2026-03-01*
