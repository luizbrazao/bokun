# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Weak TypeScript Type Safety (`as any` pattern):**
- Issue: Extensive use of `as any` type assertions throughout handlers and queries to Convex backend, bypassing TypeScript's type checking system
- Files: `src/whatsapp/handlers/listTimes.ts` (lines 76, 82, 85, 89, 100, 107), `src/whatsapp/handlers/handoff.ts` (lines 59, 60, 72, 73, 107, 114, 132, 133), `src/whatsapp/handlers/selectTime.ts` (lines 53, 57, 69, 73), `src/whatsapp/handlers/afterAskParticipants.ts`, `src/whatsapp/handlers/afterConfirm.ts`, `src/whatsapp/handlers/collectBookingAnswers.ts`, `src/llm/agent.ts` (line 24), and many more in `src/providers/service.ts` (lines 22-23)
- Impact: Mutations and queries are not validated at compile time; runtime errors possible if Convex backend signatures change; refactoring risk
- Fix approach: Generate proper TypeScript types from Convex schema using official `convex/_generated/api.ts` instead of casting. Replace all handler mutation/query calls with properly typed wrappers.

**Manual JSON Serialization/Deserialization:**
- Issue: Booking data, questions, answers, option maps stored and loaded as JSON strings (e.g., `bookingQuestions?: string`, `bookingAnswers?: string`), requiring manual JSON.parse with try-catch blocks throughout code
- Files: `src/whatsapp/handlers/collectBookingAnswers.ts` (lines 41-48, 59-65), `convex/bookingDrafts.ts`, `src/llm/memory.ts` (lines 38-52, 76-86)
- Impact: Silent failures when JSON parsing fails; error handling inconsistent; data corruption if JSON is malformed; cognitive load on developers
- Fix approach: Store structured data in separate Convex tables or use validated JSON schemas (e.g., Zod). Add invariant checks after JSON.parse.

**Tight Coupling to Convex HTTP Client:**
- Issue: Every handler function directly imports and calls `getConvexClient()` with `as any` casts; no abstraction layer
- Files: `src/whatsapp/handlers/*`, `src/llm/agent.ts`, `src/bokun/webhookHandler.ts`
- Impact: Hard to test handlers in isolation; tight coupling to Convex; mutations cannot be easily mocked or stubbed
- Fix approach: Create service layer with dependency injection (e.g., `*WithDeps` pattern mentioned in CLAUDE.md). Extract Convex calls into injectable modules.

## Known Bugs

**Option Map TTL Not Enforced on Retrieval:**
- Issue: Option maps stored with `createdAt` timestamp and 15-minute TTL (line 4, `convex/bookingDrafts.ts`: `const OPTION_MAP_TTL_MS = 15 * 60_000`), but `isValidStoredOptionMap()` does NOT check TTL expiration
- Files: `convex/bookingDrafts.ts` (lines 61-78), `src/whatsapp/handlers/selectTime.ts` (line 53+)
- Trigger: User sees stale time options after 15 minutes; selecting old option may fail or select wrong availability
- Workaround: None; requires handler to check TTL before using map
- Fix: Add TTL validation in `isValidStoredOptionMap()` or add `isOptionMapExpired()` check in handlers before selection

**Orphaned Tool Messages in LLM History:**
- Issue: `loadHistory()` in `src/llm/memory.ts` (lines 69-88) attempts to remove orphaned tool messages that have no preceding assistant message with tool_calls, but validation only happens AFTER messages are loaded—if stored data is corrupted, the message is silently dropped
- Files: `src/llm/memory.ts` (lines 71-88)
- Trigger: If database has malformed chat history with orphaned tool messages, context is lost without warning
- Workaround: None; silent data loss
- Fix: Log warnings when orphaned tool messages are detected; add data repair mechanism

**Incomplete Bokun Webhook Handlers:**
- Issue: Webhook handlers in `src/bokun/webhookHandler.ts` acknowledge all topics (bookings/create, bookings/update, bookings/cancel, apps/uninstall) but do NOT implement the actual business logic—all marked with `Future: ...` comments
- Files: `src/bokun/webhookHandler.ts` (lines 74-103)
- Trigger: Bokun webhook events are received but ignored; booking status updates and app uninstalls are never processed
- Workaround: None; webhooks are ACK'd but data is discarded
- Fix: Implement handlers for each webhook topic; update booking status, sync availability, handle tenant uninstalls

**Timeout on Bokun Requests Not Propagated to User:**
- Issue: `BokunClient.request()` timeout (15 seconds default, `src/bokun/bokunClient.ts` line 71) is caught and throws `BokunError`, but handlers do not always catch or translate this to user-friendly messaging
- Files: `src/bokun/bokunClient.ts` (lines 150-158), callers in `src/whatsapp/handlers/listTimes.ts`, `src/llm/tools.ts`
- Trigger: Bokun API is slow; user sees generic error or no response
- Workaround: User must try again
- Fix: Implement exponential backoff; expose configurable timeouts per handler; provide user feedback ("Waiting for activity list...")

## Security Considerations

**OpenAI API Key Per Tenant Has No Rotation/Revocation:**
- Risk: Each tenant configures their own OpenAI API key in the database (`tenants.openaiApiKey`). If key is compromised, no immediate way to revoke it; rotating keys requires manual database update or frontend action
- Files: `src/llm/agent.ts` (lines 22-46), `convex/tenants.ts` (schema field `openaiApiKey`)
- Current mitigation: Keys stored in Convex (encrypted at rest by Convex); only retrieved when needed; fallback to env var if tenant key missing
- Recommendations:
  - Add audit logging when tenant key is accessed or changed
  - Implement key rotation workflow (old key valid for N days, new key issued)
  - Provide emergency key revocation endpoint
  - Hash keys in database; store only reference

**Bokun OAuth State Not Validated for Domain Mismatch:**
- Risk: `handleOAuthCallback()` in `src/oauth/handler.ts` accepts `bokunDomain` parameter from callback URL path, but relies on stored state to validate correctness. If attacker can predict or bypass state validation, they could redirect user to wrong Bokun domain
- Files: `src/oauth/handler.ts` (lines 100-108), `src/server.ts` (OAuth callback handler)
- Current mitigation: Random 32-byte state nonce; TTL 10 minutes; consumed atomically
- Recommendations:
  - Validate `bokunDomain` against whitelist of allowed domains
  - Log OAuth attempts with domain; alert on domain mismatch
  - Enforce HTTPS-only redirect URIs

**Allowlist Regex Bypass Possible:**
- Risk: `src/bokun/allowlist.ts` converts path patterns like `/booking.json/{confirmationCode}/confirm` to regex `^/booking\.json/[^/]+/confirm$`. Regex only matches single path segment (not `/` in parameter). If Bokun API accepts encoded `/` in parameters (e.g., `/booking.json/conf%2Fcode/confirm`), the check could be bypassed
- Files: `src/bokun/allowlist.ts` (lines 49-66)
- Current mitigation: `assertBokunEndpointAllowed()` is called on every request; path is normalized
- Recommendations:
  - Add test case for URL-encoded path traversal attempts
  - Validate that parameter values do not contain `.`, `..`, or percent-encoded `/`
  - Use URL parsing instead of regex matching when possible

**Dedup Key Generated from Unstable JSON Stringify:**
- Risk: Fallback dedup key in `src/server.ts` (line 68-76) uses `stableStringify()` to hash webhook payload. If payload structure changes subtly (e.g., new fields added, order changes), hash will differ and duplicate detection fails
- Files: `src/server.ts` (lines 55-76, 68-76 `createFallbackDedupKey`)
- Current mitigation: Primary dedup uses `messageId` from webhook; fallback only used if missing
- Recommendations:
  - Validate `messageId` is always present; fail loudly if missing instead of silently falling back
  - Add version field to dedup key format to handle schema changes
  - Log all dedup fallback uses for audit

## Performance Bottlenecks

**LLM Agent History Size Unbounded by Tokens:**
- Problem: `src/llm/memory.ts` (line 16) loads last 20 messages (10 turns). No token counting; if each message is long, total context could exceed OpenAI model limits or cause high API costs
- Files: `src/llm/memory.ts` (lines 16-30), `src/llm/agent.ts` (lines 68-80)
- Cause: No integration with token counting library (e.g., `js-tiktoken`); assumes message count is sufficient
- Improvement path:
  - Add token counter for each message; truncate history to stay under max_tokens (e.g., 4000 tokens)
  - Implement sliding window or summarization for long conversations
  - Log token usage for monitoring

**Availability Normalization Processes Raw Bokun Response Without Pagination:**
- Problem: `src/bokun/availabilityNormalizer.ts` (lines 109-150) normalizes all availability items from Bokun response. If activity has 1000+ time slots, response is large and processing is slow
- Files: `src/bokun/availabilityNormalizer.ts`, called from `src/whatsapp/handlers/listTimes.ts`
- Cause: Bokun API returns full list; no cursor/offset pagination in handler
- Improvement path:
  - Implement server-side pagination in `listTimes` handler; only fetch and format first N options (e.g., top 8)
  - Cache normalized availabilities per activity/date in Convex to avoid re-fetching
  - Use Bokun API filters (e.g., `from`, `to` date range) to reduce payload

**Chat Message Queries Not Indexed by Both Tenant and Date:**
- Problem: `convex/chatMessages.ts` schema likely has index `by_tenantId_waUserId`, but queries for "recent N messages" must sort by `createdAt` on client side
- Files: `src/llm/memory.ts` (lines 18-31), `convex/chatMessages.ts`
- Cause: Database scan + sort; slow for users with large history
- Improvement path:
  - Add compound index `by_tenantId_waUserId_createdAt` to enable efficient range queries
  - Implement TTL-based cleanup of old messages (e.g., delete after 30 days)

**Webhook Dedup Cleanup Only Runs Daily:**
- Problem: `convex/crons.ts` (line 6) schedules `cleanupWebhookDedup` daily at 03:00 UTC. Old dedup entries (>7 days) accumulate until cleanup runs, wasting storage
- Files: `convex/crons.ts`, `convex/cleanup.ts`
- Cause: Cron job granularity; only daily, not on-demand
- Improvement path:
  - Reduce cleanup interval to hourly or trigger on insertion count threshold
  - Implement incremental cleanup (delete batches throughout day instead of burst cleanup)
  - Monitor `webhook_dedup` table size; alert if growing too fast

## Fragile Areas

**State Machine Implementation in Handlers (No State Validation):**
- Files: `src/whatsapp/handlers/orchestrateBooking.ts` (lines 22-28 enum), handler dispatch logic
- Why fragile: `nextStep` field in `booking_drafts` determines handler dispatch, but no validation that transition is legal. If database is manually edited or handler crashes mid-transition, state can become inconsistent (e.g., `nextStep = "invalid_state"`)
- Safe modification:
  - Define explicit state transitions in a state machine graph (e.g., `select_time` -> `select_pickup | ask_participants`)
  - Validate `nextStep` before dispatch; throw error for invalid states
  - Add logging of state transitions for debugging
- Test coverage gaps: No tests for state machine invariants (e.g., can't transition from `confirm` back to `select_time`)

**Booking Confirmation Flow Relies on Multiple Sequential Mutations:**
- Files: `src/whatsapp/handlers/afterConfirm.ts` (lines 120-150), `convex/bookings.ts`
- Why fragile: Creating booking involves multiple Convex mutations (setNextStep, confirmDraft, createFromDraft). If any mutation fails after first succeeds, state is partially committed
- Safe modification:
  - Wrap all mutations in a single atomic Convex transaction if possible
  - Add idempotency keys to mutations; detect and retry failed mutations
  - Add compensating mutations (rollback) if sequence fails
- Test coverage gaps: No tests for failure scenarios (e.g., confirmDraft succeeds but createFromDraft fails)

**Option Map Retrieval in Handlers Assumes Data Structure:**
- Files: `src/whatsapp/handlers/selectTime.ts` (lines 50-80), `src/whatsapp/handlers/selectPickupPlace.ts`
- Why fragile: Handlers read `optionMap` JSON directly from `booking_draft` and parse it without schema validation. If stored data is corrupted or schema changes, parsing fails silently
- Safe modification:
  - Validate option map structure with Zod schema after parsing
  - Log parse errors; return user-friendly message if data is invalid
  - Add data migration if schema changes (e.g., `kind: "time_options_v1"` -> `v2`)
- Test coverage gaps: No tests for malformed option maps; no tests for schema versioning

**LLM Agent Tool Execution Has No Rate Limiting:**
- Files: `src/llm/agent.ts` (lines 128-161), `src/llm/tools.ts` (lines 140-170)
- Why fragile: Agent can execute tools in a loop up to MAX_TOOL_ITERATIONS (3), but each tool call to Bokun API is not rate-limited. Malicious user or buggy prompt could cause burst of API calls
- Safe modification:
  - Add rate limiter: max N tool calls per user per minute
  - Add cost tracking: log API calls per tool; alert on unusual activity
  - Implement circuit breaker: if tool fails repeatedly, stop calling it
- Test coverage gaps: No tests for rate limiting; no tests for repeated tool failures

## Scaling Limits

**Webhook Dedup Table Growth:**
- Current capacity: 7 days of dedup entries; assumed ~100K webhooks/day = ~700K rows
- Limit: At ~700K rows, Convex database queries and index scans may degrade; no sharding by tenant
- Scaling path:
  - Partition dedup table by tenantId to allow parallel cleanup
  - Implement rolling-window TTL: soft-delete instead of hard-delete; archive old rows
  - Monitor table size; trigger alerts at 1M rows

**Chat Messages Table for LLM Memory:**
- Current capacity: All messages stored indefinitely; no cleanup
- Limit: For active users with 1+ message per hour, 1 year = 8760 messages. Loading last 20 messages is O(1), but full history queries O(n)
- Scaling path:
  - Implement TTL-based cleanup: delete messages older than 30 days
  - Archive older messages to separate table if audit trail needed
  - Add metrics: track avg history size per user; alert if > 1000 messages

**Single Bokun API Key Per Tenant:**
- Current capacity: One access key shared across all requests from tenant; Bokun may rate-limit by key
- Limit: If tenant has 100+ concurrent users, Bokun rate limits requests; users see slow responses
- Scaling path:
  - Implement request queue with backoff per tenant
  - Cache activity/availability data (5-10 min TTL) to reduce repeated calls
  - Negotiate higher rate limits with Bokun; use multiple API keys if available

**Option Map Storage in Booking Draft Document:**
- Current capacity: Booking draft is single document with nested `optionMap`; no separate table
- Limit: If option map has 100+ items or booking flow becomes complex, document size grows; Convex may reject oversized documents
- Scaling path:
  - Move option maps to separate `booking_draft_option_maps` table, referenced by ID
  - Implement pagination for large option lists

## Dependencies at Risk

**OpenAI Node SDK Dependency (No Fallback):**
- Risk: `src/llm/client.ts` imports OpenAI SDK; if package becomes unmaintained or breaking changes occur, entire LLM agent breaks
- Impact: Chatbot fallback (LLM route) is disabled; users see "IA não está configurado" message; state machine still works but no NLU
- Migration plan:
  - Abstract OpenAI client behind interface in `src/llm/client.ts`
  - Implement alternative provider adapter (e.g., Anthropic, LocalAI) with same interface
  - Add feature flag to switch providers at runtime

**Convex Backend Dependency (No Migration Path):**
- Risk: Entire app depends on Convex serverless database; schema is tightly coupled to application
- Impact: Switching away from Convex requires rewriting schema, migrations, security model
- Migration plan:
  - Document Convex schema in `convex/schema.ts` with migration comments
  - Create adapter layer between app logic and Convex (partially done with service layer)
  - Test app against PostgreSQL adapter using same interface for contingency

**Node.js Version Pinning:**
- Risk: CLAUDE.md specifies Node.js 18+ but no `.nvmrc` or `engines` field in `package.json` to enforce minimum version
- Impact: Developers on Node 16 may face subtle errors; CI/CD may use wrong version
- Migration plan:
  - Add `.nvmrc` with `18.20.0` or similar pinned version
  - Add `"engines": { "node": ">=18.0.0" }` to `package.json`
  - Document breaking changes if Node version is upgraded

## Missing Critical Features

**No Edit/Cancel Booking from WhatsApp After Confirmation:**
- Problem: User can cancel booking during flow, but CANNOT cancel/modify after confirmation. Must use Bokun dashboard or contact support
- Blocks: High-friction experience; customers frustrated if they need to reschedule
- Workaround: User calls support
- Fix: Implement `/cancel <bookingId>` command that calls `POST /booking.json/cancel-booking/{confirmationCode}` on Bokun; update booking_drafts table

**No Booking History View:**
- Problem: User cannot ask "what bookings do I have?" or "show my reservations"
- Blocks: Users must ask operator or use Bokun dashboard
- Workaround: Handoff to operator
- Fix: Add `get_my_bookings` LLM tool that calls Bokun API to fetch user's booking history; format nicely for WhatsApp

**No Multi-Language Support:**
- Problem: All messages are hardcoded in Portuguese; no translation mechanism
- Blocks: Vendors in non-Portuguese regions cannot use bot
- Workaround: None
- Fix: Extract strings to i18n file (e.g., `src/locales/pt.json`); add language detection (user locale or tenant config); implement message templating

**No Pickup Place Photos/Descriptions:**
- Problem: Pickup places shown as list of IDs only; users don't know which one they're selecting
- Blocks: User confusion; wrong pickup selected
- Workaround: None
- Fix: Fetch pickup place metadata from Bokun (description, address, phone); format and send as WhatsApp list items with descriptions

## Test Coverage Gaps

**Booking State Machine Has No Invariant Tests:**
- What's not tested: State transitions; invalid state detection; recovery from partial failures
- Files: `src/whatsapp/handlers/orchestrateBooking.ts`, `convex/bookingDrafts.ts`
- Risk: State corruption goes undetected; users stuck in wrong state
- Recommendation: Add test suite that verifies all legal transitions; assert illegal transitions throw error

**LLM Tool Execution Not Tested for Error Handling:**
- What's not tested: Tool returning error; timeout; OpenAI API unavailable
- Files: `src/llm/agent.ts` (lines 140-161), `src/llm/tools.ts` (lines 140-170)
- Risk: Unhandled exceptions bubble up; user sees cryptic error or agent loops indefinitely
- Recommendation: Add tests for each tool failure scenario (e.g., Bokun 500 error, OpenAI timeout)

**Webhook HMAC Validation Not Tested Against Real Payloads:**
- What's not tested: Actual Meta and Bokun webhook signatures; tampering detection
- Files: `src/server.ts` (HMAC validation), `src/bokun/webhookHandler.ts` (Bokun HMAC)
- Risk: Signature bypass undetected; forged webhooks accepted
- Recommendation: Add integration tests with real webhook samples from Meta and Bokun

**Option Map TTL Expiration Not Tested:**
- What's not tested: Expired option maps rejected; user sees error when selecting old option
- Files: `convex/bookingDrafts.ts`, `src/whatsapp/handlers/selectTime.ts`
- Risk: Users select stale options; wrong activity/time booked
- Recommendation: Add test that advances clock; verifies expired maps are rejected

**Availability Normalization Edge Cases Not Covered:**
- What's not tested: Empty availability list; invalid date format; missing required fields
- Files: `src/bokun/availabilityNormalizer.ts`, tests in `scripts/demoNormalizeAvailabilities.ts` (demo, not automated)
- Risk: Malformed data causes handler crash; normalization silently fails
- Recommendation: Add unit tests for normalization with invalid/edge-case inputs

---

*Concerns audit: 2026-03-01*
