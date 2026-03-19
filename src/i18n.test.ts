import { describe, it, expect } from "vitest";
import { normalizeLanguage, byLanguage } from "./i18n.ts";

const variants = { pt: "olá", en: "hello", es: "hola" };

describe("normalizeLanguage", () => {
  it("returns 'en' as default when input is null", () => {
    expect(normalizeLanguage(null)).toBe("en");
  });

  it("returns 'en' as default when input is undefined", () => {
    expect(normalizeLanguage(undefined)).toBe("en");
  });

  it("returns 'en' as default when input is invalid", () => {
    expect(normalizeLanguage("fr")).toBe("en");
  });

  it("returns 'en' when input is 'en'", () => {
    expect(normalizeLanguage("en")).toBe("en");
  });

  it("returns 'pt' when input is 'pt'", () => {
    expect(normalizeLanguage("pt")).toBe("pt");
  });

  it("returns 'es' when input is 'es'", () => {
    expect(normalizeLanguage("es")).toBe("es");
  });
});

describe("byLanguage", () => {
  it("returns English variant for 'en'", () => {
    expect(byLanguage("en", variants)).toBe("hello");
  });

  it("returns Portuguese variant for 'pt'", () => {
    expect(byLanguage("pt", variants)).toBe("olá");
  });

  it("returns Spanish variant for 'es'", () => {
    expect(byLanguage("es", variants)).toBe("hola");
  });

  it("returns English variant (default) for null", () => {
    expect(byLanguage(null, variants)).toBe("hello");
  });

  it("returns English variant (default) for undefined", () => {
    expect(byLanguage(undefined, variants)).toBe("hello");
  });

  it("returns English variant (default) for unknown language string", () => {
    expect(byLanguage("fr", variants)).toBe("hello");
  });
});
