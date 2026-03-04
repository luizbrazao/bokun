import { describe, expect, it } from "vitest";
import { requireServiceToken } from "./serviceAuth";

describe("requireServiceToken", () => {
  it("accepts a matching service token", async () => {
    const previous = process.env.CONVEX_SERVICE_TOKEN;
    const previousV2 = process.env.CONVEX_SERVICE_TOKEN_V2;
    process.env.CONVEX_SERVICE_TOKEN = "token-abc";
    delete process.env.CONVEX_SERVICE_TOKEN_V2;

    await expect(requireServiceToken({} as any, "token-abc")).resolves.toBeUndefined();

    process.env.CONVEX_SERVICE_TOKEN = previous;
    process.env.CONVEX_SERVICE_TOKEN_V2 = previousV2;
  });

  it("rejects a non-matching token", async () => {
    const previous = process.env.CONVEX_SERVICE_TOKEN;
    const previousV2 = process.env.CONVEX_SERVICE_TOKEN_V2;
    process.env.CONVEX_SERVICE_TOKEN = "token-abc";
    delete process.env.CONVEX_SERVICE_TOKEN_V2;

    await expect(requireServiceToken({} as any, "token-wrong")).rejects.toThrow("Invalid service token.");

    process.env.CONVEX_SERVICE_TOKEN = previous;
    process.env.CONVEX_SERVICE_TOKEN_V2 = previousV2;
  });

  it("accepts V2 token during rotation", async () => {
    const previous = process.env.CONVEX_SERVICE_TOKEN;
    const previousV2 = process.env.CONVEX_SERVICE_TOKEN_V2;
    process.env.CONVEX_SERVICE_TOKEN = "token-v1";
    process.env.CONVEX_SERVICE_TOKEN_V2 = "token-v2";

    await expect(requireServiceToken({} as any, "token-v2")).resolves.toBeUndefined();

    process.env.CONVEX_SERVICE_TOKEN = previous;
    process.env.CONVEX_SERVICE_TOKEN_V2 = previousV2;
  });
});
