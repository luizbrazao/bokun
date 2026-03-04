import { describe, expect, it } from "vitest";
import { classifyLLMError } from "./errorClassifier.ts";

describe("classifyLLMError", () => {
  it("classifies fetch failed as network retryable", () => {
    const result = classifyLLMError(new Error("fetch failed"));
    expect(result.category).toBe("network");
    expect(result.retryable).toBe(true);
  });

  it("classifies 429 as rate_limit retryable", () => {
    const result = classifyLLMError({ status: 429, message: "Too Many Requests" });
    expect(result.category).toBe("rate_limit");
    expect(result.retryable).toBe(true);
  });

  it("classifies 401 as auth non-retryable", () => {
    const result = classifyLLMError({ status: 401, message: "Unauthorized" });
    expect(result.category).toBe("auth");
    expect(result.retryable).toBe(false);
  });
});
