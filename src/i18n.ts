export type SupportedLanguage = "pt" | "en" | "es";

export function normalizeLanguage(input: string | null | undefined): SupportedLanguage {
  if (input === "en" || input === "es" || input === "pt") return input;
  return "pt";
}

export function byLanguage(
  language: string | null | undefined,
  variants: { pt: string; en: string; es: string }
): string {
  const lang = normalizeLanguage(language);
  if (lang === "en") return variants.en;
  if (lang === "es") return variants.es;
  return variants.pt;
}
