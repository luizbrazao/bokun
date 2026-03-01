import { assertBokunEndpointAllowed } from "../src/bokun/allowlist.ts";

function expectNoThrow(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

function expectThrow(name: string, fn: () => void): void {
  try {
    fn();
    console.error(`FAIL: ${name}`);
    console.error("Expected function to throw, but it did not.");
    process.exit(1);
  } catch {
    console.log(`PASS: ${name}`);
  }
}

expectNoThrow("allow POST /activity.json/search", () => {
  assertBokunEndpointAllowed("POST", "/activity.json/search");
});

expectNoThrow("allow GET /activity.json/123 (matches {id})", () => {
  assertBokunEndpointAllowed("get", "/activity.json/123?foo=bar");
});

expectNoThrow("allow GET /activity.json/123/availabilities?start=2026-02-16&end=2026-02-28", () => {
  assertBokunEndpointAllowed("GET", "/activity.json/123/availabilities?start=2026-02-16&end=2026-02-28");
});

expectNoThrow("allow GET /activity.json/123/pickup-places", () => {
  assertBokunEndpointAllowed("GET", "/activity.json/123/pickup-places");
});

expectThrow("block GET /booking.json/product-list.json", () => {
  assertBokunEndpointAllowed("GET", "/booking.json/product-list.json");
});

expectThrow("block GET /activity.json/123/availabilities/startTime/999", () => {
  assertBokunEndpointAllowed("GET", "/activity.json/123/availabilities/startTime/999");
});

expectThrow("block GET /cart.json/whatever", () => {
  assertBokunEndpointAllowed("GET", "/cart.json/whatever");
});

console.log("All allowlist checks passed.");
