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

  it("detects 'Hi' greeting as English", () => {
    const lang = detectReplyLanguageFromUserMessage("Hi");
    expect(lang).toBe("en");
  });

  it("returns null for ambiguous short phrase without strong language signals", () => {
    // "Id like to make an schedule" has no signals in the word list — detection returns null.
    // The fallback to English is handled by normalizeLanguage defaulting to "en".
    const lang = detectReplyLanguageFromUserMessage("Id like to make an schedule");
    expect(lang).toBeNull();
  });

  it("detects booking intent from English user", () => {
    const lang = detectReplyLanguageFromUserMessage("I want to book a tour please");
    expect(lang).toBe("en");
  });

  it("detects Spanish prompt", () => {
    const lang = detectReplyLanguageFromUserMessage("Hola, quiero reservar un tour para mañana");
    expect(lang).toBe("es");
  });
});
