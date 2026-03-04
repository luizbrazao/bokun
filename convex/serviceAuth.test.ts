import { describe, expect, it } from "vitest";
import { requireServiceToken } from "./serviceAuth";

describe("requireServiceToken", () => {
  it("accepts a matching service token", async () => {
    const previous = process.env.CONVEX_SERVICE_TOKEN;
    process.env.CONVEX_SERVICE_TOKEN = "token-abc";

    await expect(requireServiceToken({} as any, "token-abc")).resolves.toBeUndefined();

    process.env.CONVEX_SERVICE_TOKEN = previous;
  });

  it("rejects a non-matching token", async () => {
    const previous = process.env.CONVEX_SERVICE_TOKEN;
    process.env.CONVEX_SERVICE_TOKEN = "token-abc";

    await expect(requireServiceToken({} as any, "token-wrong")).rejects.toThrow("Invalid service token.");

    process.env.CONVEX_SERVICE_TOKEN = previous;
  });
});
