# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**
- TypeScript files: `camelCase.ts` (e.g., `bokunClient.ts`, `orchestrateBooking.ts`)
- React components: `PascalCase.tsx` (e.g., `DashboardLayout.tsx`, `BookingsPage.tsx`)
- Index files: `index.ts` for barrel exports
- Handlers: prefix with action (e.g., `handleSelectTime.ts`, `handleCancelBooking.ts`)

**Functions:**
- camelCase for regular functions and async functions
- Prefix handlers with `handle`: `handleSelectTime()`, `handleCancelBooking()`
- Prefix gateway functions with `bokun`: `bokunGetActivityByIdForTenant()`, `bokunSearchActivitiesForTenant()`
- Prefix intent checkers with `is`: `isCancelIntent()`, `isHandoffIntent()`, `isEditIntent()`

**Variables and Constants:**
- camelCase for variables (e.g., `selectedIndex`, `bookingDraft`, `activityIdNumber`)
- UPPERCASE for module-level constants: `BOKUN_ALLOWED_ENDPOINTS`, `CANCEL_KEYWORDS`, `MAX_TOOL_ITERATIONS`
- Prefix regex patterns with `pattern` or suffix with `Regex`: `ymdMatch`, `slashMatch`, `timePattern`

**Types:**
- PascalCase for all types and interfaces
- Suffix types with `Args` for function parameters: `HandleSelectTimeArgs`, `SearchActivitiesArgs`
- Suffix types with `Result` for function return types: `HandleSelectTimeResult`, `OrchestrateBookingResult`
- Suffix types with `State` for internal state structures: `BookingDraftState`, `ConversationState`, `ConfirmedBookingDraft`
- Prefix optional types with `Maybe`: `MaybeTitle` (rare, prefer optional with `?`)

**Example patterns:**
```typescript
// Function signatures
export async function handleSelectTime(args: HandleSelectTimeArgs): Promise<HandleSelectTimeResult>

// Internal types
type ConversationState = {
  lastActivityId?: string;
} | null;

// Constants
const CANCEL_KEYWORDS = ["cancelar", "cancelar reserva", "cancel"];

// Variables
const selectedIndex = parseSelectedIndex(args.text);
const bookingDraft = await convex.query(...);
```

## Code Style

**Formatting:**
- No explicit formatter configured (no Prettier or Biome config)
- Manual formatting follows: 2-space indentation, trailing commas in objects/arrays
- Line length: no strict limit observed; typical 80-120 characters

**Linting:**
- Frontend uses ESLint with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- ESLint config: `frontend/eslint.config.js` (flat config format)
- Run: `npm run lint` in frontend
- Backend has no ESLint config at root (scripts/handlers use ad-hoc TypeScript)

**Key rules observed:**
- Import side effects only when needed (e.g., `import "dotenv/config"`)
- Unused variables avoided
- Proper async/await usage (no dangling promises)
- Consistent return types

## Import Organization

**Order:**
1. Node.js built-in imports (e.g., `import { createHmac } from "node:crypto"`)
2. Third-party packages (e.g., `import OpenAI from "openai"`, `import { useQuery } from "convex/react"`)
3. Local relative imports (e.g., `import { handleSelectTime } from "./selectTime.ts"`)

**Path Aliases:**
- Backend: None. Uses relative paths (`../../convex/client.ts`)
- Frontend: Convex API alias `@convex/api` (from generated types)

**Example from `src/llm/agent.ts`:**
```typescript
import { getOpenAIClientForKey, resolveModel } from "./client.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { toolDefinitions, executeTool } from "./tools.ts";
import { loadHistory, saveMessages, type ChatMessage } from "./memory.ts";
import { getConvexClient } from "../convex/client.ts";
import type OpenAI from "openai";
```

## Error Handling

**Patterns:**
- Throw descriptive `Error` instances with context: `throw new Error("Missing OAuth config: BOKUN_APP_CLIENT_ID, ...")`
- Try-catch blocks wrap potentially failing operations (Bokun API calls, Convex queries, OpenAI requests)
- Graceful degradation: catch errors and return user-friendly messages instead of crashing

**Error messaging:**
- Include what failed and why (e.g., "Bokun request failed (401 Unauthorized) for GET /activity.json/123")
- Fallback to English error messages internally; user-facing messages in Portuguese (pt-BR)

**Pattern example from `src/whatsapp/handlers/cancelBooking.ts`:**
```typescript
try {
  await bokunCancelBookingForTenant({
    tenantId: args.tenantId,
    confirmationCode: draft.bokunConfirmationCode,
    note: "Cancelado pelo cliente via WhatsApp.",
  });
  return { text: `Reserva ${draft.bokunConfirmationCode} cancelada com sucesso.`, handled: true };
} catch (error) {
  return {
    text: "Não foi possível cancelar a reserva na Bokun. Tente novamente ou entre em contato com o suporte.",
    handled: true,
  };
}
```

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Prefix logs with context labels in brackets: `[LLM Agent]`, `[LLM Tool]`, `[WA webhook]`, `[TG webhook]`, `[Handoff]`
- Use `console.log()` for info, `console.error()` for errors
- Include relevant state in logs: message counts, roles, finish_reason

**Examples from `src/llm/agent.ts`:**
```typescript
console.log(`[LLM Agent] History loaded: ${history.length} messages`);
console.log(`[LLM Agent] History roles:`, history.map(m => m.role).join(", "));
console.log(`[LLM Agent] Iteration ${iterations}, finish_reason: ${choice?.finish_reason}`);
console.error(`[LLM Agent Error] ${message}`);
```

## Comments

**When to Comment:**
- Explain business logic intent, not implementation details
- Document workarounds and temporary solutions (e.g., retry logic, auth fallback)
- Clarify regex patterns and validation rules

**Comments observed:**
```typescript
// Retry once with env signature auth if token-based auth fails.
if ((response.status === 401 || response.status === 403) && !headerSignatureAuth && envSignatureAuth) { ... }

// Central Bokun HTTP client. This should be the single recommended path to call Bokun APIs.
export async function bokunRequest<T = unknown>({ ... }): Promise<T>

// Low-level Bokun calls. Application code should use src/bokun/gateway.ts.
export type BokunAuthHeaders = Record<string, string>;
```

**JSDoc/TSDoc:**
- Rarely used; type annotations (Args/Result types) replace documentation
- No @param/@returns decorators observed
- Type exports suffice for API documentation

## Function Design

**Size:**
- Small, focused functions (typically 20-60 lines)
- Handlers encapsulate single workflow steps
- Complex operations broken into helpers

**Parameters:**
- Use object parameters (Args pattern) for functions with >1 parameter
- Always provide `tenantId` as first or only required parameter (multi-tenant requirement)

**Return Values:**
- Handlers return result objects: `{ ok: boolean; text: string; ... }`
- Gateway functions return strong types or throw
- Async functions return `Promise<T>` where T is the result type

**Example from `src/whatsapp/handlers/listTimes.ts`:**
```typescript
export async function handleListTimes(args: HandleListTimesArgs): Promise<HandleListTimesResult>

type HandleListTimesArgs = {
  tenantId: string;
  waUserId: string;
  activityId: string | number;
  date: string;
  endDate?: string;
  currency?: string;
};

type HandleListTimesResult = {
  text: string;
  optionMap: Array<{ index: number; startTimeId?: string | number }>;
};
```

## Module Design

**Exports:**
- One main export per file (function or factory)
- Supporting types exported with `export type`
- Barrel files use `export * from "./module.ts"`

**Example from `src/bokun/gateway.ts`:**
```typescript
export type { BookingQuestion };

export async function bokunSearchActivitiesForTenant(args: { ... }) { ... }
export async function bokunGetActivityByIdForTenant(args: { ... }) { ... }
export async function bokunGetAvailabilitiesForTenant(args: { ... }) { ... }
// ... more exports
```

**Barrel Files:**
- `src/providers/index.ts` re-exports from submodules
- Used to simplify imports in consuming code

## Dependency Injection

**Pattern:** `*WithDeps` suffix functions accept dependencies as parameters

**Not heavily used; instead:**
- Clients initialized at module level (singleton pattern): `getOpenAIClient()`, `getConvexClient()`
- Lazy initialization with caching

**Example from `src/llm/client.ts`:**
```typescript
const clientCache = new Map<string, OpenAI>();

export function getOpenAIClientForKey(apiKey: string): OpenAI {
    const cached = clientCache.get(apiKey);
    if (cached) return cached;

    const client = new OpenAI({ apiKey });
    clientCache.set(apiKey, client);
    return client;
}
```

## Multi-Tenant Patterns

**Critical rule:** `tenantId` is mandatory in all queries, mutations, and handlers

**Examples:**
- `handleSelectTime(args: { tenantId: string; waUserId: string; ... })`
- `bokunGetActivityByIdForTenant(args: { tenantId: string; id: string | number })`
- Convex queries always include: `.index("by_tenantId", ["tenantId"])`

**Isolation:** No cross-tenant queries; all operations filtered by `tenantId` at database and application layers.

## Language Support

**Primary language:** TypeScript 5.4+
- ES Modules (`import`/`export`, never `require`)
- Strict type checking
- Optional chaining (`?.`) and nullish coalescing (`??`) used liberally

**Execution:**
- Scripts: `node --experimental-strip-types scripts/<name>.ts`
- Frontend build: `tsc -b && vite build`

---

*Convention analysis: 2026-03-01*
