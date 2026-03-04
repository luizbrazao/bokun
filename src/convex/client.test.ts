import { describe, expect, it } from "vitest";
import { getConvexServiceToken } from "./client.ts";

describe("getConvexServiceToken", () => {
  it("prefers CONVEX_SERVICE_TOKEN_V2 when present", () => {
    const prevV1 = process.env.CONVEX_SERVICE_TOKEN;
    const prevV2 = process.env.CONVEX_SERVICE_TOKEN_V2;

    process.env.CONVEX_SERVICE_TOKEN = "v1-token";
    process.env.CONVEX_SERVICE_TOKEN_V2 = "v2-token";

    expect(getConvexServiceToken()).toBe("v2-token");

    process.env.CONVEX_SERVICE_TOKEN = prevV1;
    process.env.CONVEX_SERVICE_TOKEN_V2 = prevV2;
  });

  it("falls back to CONVEX_SERVICE_TOKEN", () => {
    const prevV1 = process.env.CONVEX_SERVICE_TOKEN;
    const prevV2 = process.env.CONVEX_SERVICE_TOKEN_V2;

    process.env.CONVEX_SERVICE_TOKEN = "v1-token";
    delete process.env.CONVEX_SERVICE_TOKEN_V2;

    expect(getConvexServiceToken()).toBe("v1-token");

    process.env.CONVEX_SERVICE_TOKEN = prevV1;
    process.env.CONVEX_SERVICE_TOKEN_V2 = prevV2;
  });
});
