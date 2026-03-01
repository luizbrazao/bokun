# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Status:** No test framework currently integrated
- Frontend package.json has no test runner (Jest, Vitest, Mocha)
- Backend package.json has no test runner
- No `.test.ts` or `.spec.ts` files in `src/` or `convex/` directories

**Assertion Libraries:** None configured

**Run Commands:** Not applicable (no automated tests)

## Test Coverage Approach

**Current strategy:** Demo scripts and smoke tests instead of automated unit/integration tests

**Demo scripts location:** `scripts/` directory
- Purpose: Validate logic without network calls
- Naming: `demo*.ts` for unit demos, `smoke*.ts` for integration validation
- Execution: `node --experimental-strip-types scripts/<name>.ts`

**Available demo scripts:**
```
scripts/
├── demoSelectTime_noNetwork.ts         # Validate time selection parsing
├── demoSelectPickupPlace_noNetwork.ts  # Validate pickup selection logic
├── demoAfterSelectTime_noNetwork.ts    # Validate post-time routing
├── demoOptionMapTTL_noNetwork.ts       # Validate TTL expiration (15-min window)
├── demoBookingDraftPayload_noNetwork.ts # Validate booking draft structure
├── demoConfirmFlow_noNetwork.ts        # Validate confirmation flow
├── demoSaveOptionMap_noNetwork.ts      # Validate option map persistence
├── demoNormalizeAvailabilities.ts      # Validate availability normalization
├── demoFormatPickupPlaces_noNetwork.ts # Validate pickup formatting
├── demoHandleListTimes_noNetwork.ts    # Validate time listing
├── demoRouteAfterSelectTime_noNetwork.ts # Validate routing logic
├── demoWebhookDedup_noNetwork.ts       # Validate webhook deduplication
└── demoActivitiesPayloads.ts           # Sample activity payloads
```

## Test File Organization

**Location:** Demo scripts co-located in `scripts/` directory (not alongside source)
- Separate from production code
- "No network" suffix indicates no external API calls

**Naming:**
- `demo*.ts` for unit logic demos
- `smoke*.ts` for end-to-end validation tests
- `scripts/bokun_smoke.ts` - Validates Bokun API client connection
- `scripts/smokeTestLLMAgent.ts` - Validates LLM agent with real OpenAI calls
- `scripts/smokeTestLLMSimple.ts` - Simple LLM client validation

**Structure:** Each script is standalone and executable with Node.js

## Test Structure Patterns

**Demo pattern (no-network unit validation):**
```typescript
// scripts/demoSelectTime_noNetwork.ts
import { resolveStartTimeIdFromOptionMap } from "../src/whatsapp/handlers/selectTime.ts";

const conversation = {
  lastOptionMap: [
    { index: 1, startTimeId: "st-08" },
    { index: 2, startTimeId: "st-10" },
    { index: 3 },
  ],
};

function demoCase(input: string) {
  const parsed = parseSelectedIndex(input);
  if (parsed === null) {
    return { input, ok: false, reason: "sem número" };
  }

  const resolved = resolveStartTimeIdFromOptionMap(conversation.lastOptionMap, parsed);
  return {
    input,
    ok: resolved.found && resolved.startTimeId !== undefined,
    selectedIndex: parsed,
    resolved,
  };
}

console.log(JSON.stringify(demoCase("2"), null, 2));
console.log(JSON.stringify(demoCase("9"), null, 2));
```

**Smoke test pattern (integration validation):**
```typescript
// scripts/bokun_smoke.ts
import "dotenv/config";
import { BokunClient } from "../src/bokun/bokunClient";

async function main() {
    const baseUrl = process.env.BOKUN_BASE_URL!;
    const accessKey = process.env.BOKUN_ACCESS_KEY!;
    const secretKey = process.env.BOKUN_SECRET_KEY!;

    const client = new BokunClient({ baseUrl, accessKey, secretKey, timeoutMs: 15000 });
    const pathWithQuery = "/activity.json/search?lang=EN&currency=EUR";
    const body = { page: 0, pageSize: 1 };

    const res = await client.request<any>({ method: "POST", pathWithQuery, body });

    console.log("status:", res.status);
    console.log("data:", JSON.stringify(res.data, null, 2));
}

main().catch((err) => {
    console.error("smoke test failed:", err);
    process.exit(1);
});
```

## Patterns Used in Demos

**Input validation testing:**
```typescript
function parseSelectedIndex(text: string): number | null {
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isInteger(value)) return null;
  return value;
}

// Demo cases: valid input "2", out-of-range "9", non-numeric "oi"
```

**State transformation testing:**
- Load sample booking draft
- Call handler with test input
- Verify output matches expected state

**Date parsing validation:**
```typescript
function isValidYmdDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [year, month, day] = ymd.split("-").map((part) => Number.parseInt(part, 10));
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}
```

**Option map expiration testing:**
- Demo script validates TTL window (15 minutes)
- Checks timestamp-based expiration logic
- No actual time passage; uses hardcoded timestamps

## Mocking

**Framework:** None (demos use real data structures)

**Approach:**
- Mock data: hardcoded test payloads in demo scripts
- No mocking library (Jest, Sinon, etc.)
- Real API calls only in smoke tests (require `.env` secrets)

**Mock data patterns:**
```typescript
// Mock conversation with option map
const conversation = {
  lastOptionMap: [
    { index: 1, startTimeId: "st-08" },
    { index: 2, startTimeId: "st-10" },
    { index: 3 },
  ],
};

// Mock booking draft
const bookingDraft = {
  _id: "draft-123",
  tenantId: "tenant-001",
  waUserId: "user-456",
  activityId: "789",
  date: "2026-03-15",
  status: "draft",
  nextStep: "select_time",
};
```

**What to mock:**
- Bokun API responses (in demo payloads)
- Convex query/mutation results (hardcoded objects)
- Option maps and conversion rates

**What NOT to mock:**
- Core business logic (date parsing, parsing, indexing)
- Multi-tenant isolation rules
- Webhook validation and deduplication

## Fixtures and Factories

**Test data location:** `scripts/demo*Payloads.ts`

**Available fixtures:**
- `demoActivitiesPayloads.ts` - Sample activity search responses
- `demoAvailabilityAndPickupPayloads.ts` - Availability and pickup place responses
- `demoTenantGatewayPayloads.ts` - Complete tenant gateway responses

**Pattern from fixtures:**
```typescript
// Real Bokun API response structure
const activitySearchResponse = {
  items: [
    {
      id: 789,
      title: "Catamaran Tour Barcelona",
      description: "...",
      duration: 120,
      currency: "EUR",
    },
  ],
  total: 1,
};
```

**Factory approach:** Fixtures are hand-crafted JSON/object structures, not factories

## Validation Strategy (Current)

**What is tested via demos:**
1. Input parsing (date, index, intent keywords)
2. State transitions (booking flow state machine)
3. Option map TTL and expiration
4. Data normalization (availability processing)
5. Message formatting (for display in WhatsApp)
6. Deduplication logic (webhook message IDs)

**What lacks testing:**
- Convex mutations (database operations)
- API authentication (HMAC-SHA1, OAuth)
- Error recovery and retry logic
- Concurrency and race conditions
- Frontend component rendering
- Integration between systems (end-to-end flow)

## Future Test Framework

**Recommended approach for automated tests:**
1. **Unit tests:** Vitest or Jest
   - Input validation functions
   - Intent detection (keywords, patterns)
   - Date/time parsing
   - Option map TTL logic
   - Data normalizers

2. **Integration tests:** Would require:
   - Convex local development environment
   - Mocked Bokun API (nock, msw)
   - Mocked OpenAI API
   - Test database fixtures

3. **E2E tests:** Not currently implemented
   - Would need full staging environment
   - Convex dev deployment
   - Meta Cloud API webhook simulation
   - Full booking flow validation

## Coverage Analysis

**Current coverage by area:**
- **Core logic (time/pickup selection):** 70% (demo coverage)
- **Booking state machine:** 50% (demos for critical paths)
- **Data normalization:** 60% (demo scripts)
- **API clients:** 10% (smoke tests only)
- **Convex operations:** 0% (no tests)
- **Authentication:** 0% (no tests)
- **Frontend components:** 0% (no tests)

**Untested critical paths:**
- Webhook deduplication with concurrent messages
- OAuth token exchange and refresh
- Booking confirmation flow with real Bokun
- LLM tool execution
- Error handling and fallbacks
- Multi-tenant isolation edge cases

## Manual Testing Checklist

**Before deployment:**
1. Run all smoke tests: `scripts/bokun_smoke.ts`, `scripts/smokeTestLLMAgent.ts`
2. Execute demo validation scripts for each major feature
3. Manual testing in WhatsApp sandbox with real Bokun test environment
4. Verify tenant isolation (multi-tenant operations)
5. Test webhook deduplication (send duplicate messages)
6. Validate error states (network errors, invalid inputs, authorization)

---

*Testing analysis: 2026-03-01*
