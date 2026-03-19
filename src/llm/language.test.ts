import { describe, expect, it } from "vitest";
import { detectReplyLanguageFromUserMessage } from "./language.ts";

describe("detectReplyLanguageFromUserMessage", () => {
  it("detects English prompt", () => {
    const lang = detectReplyLanguageFromUserMessage("Hi, can you help me check available tours tomorrow?");
    expect(lang).toBe("en");
  });

  it("detects Portuguese prompt", () => {
    const lang = detectReplyLanguageFromUserMessage("Olá, quero saber os passeios disponíveis amanhã.");
    expect(lang).toBe("pt");
  });

  it("detects short English catalog intent", () => {
    const lang = detectReplyLanguageFromUserMessage("list activities");
    expect(lang).toBe("en");
  });

  it("returns null when confidence is low", () => {
    const lang = detectReplyLanguageFromUserMessage("12345 ???");
    expect(lang).toBeNull();
  });
});
