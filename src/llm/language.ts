export type ReplyLanguage = "pt" | "en" | "es";

function countMatches(text: string, words: string[]): number {
  return words.reduce((acc, word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(text) ? acc + 1 : acc;
  }, 0);
}

/**
 * Lightweight language detector for routing response language.
 * Returns null when confidence is low to keep tenant default.
 */
export function detectReplyLanguageFromUserMessage(message: string): ReplyLanguage | null {
  const text = message.toLowerCase();

  const englishSignals = [
    "hi",
    "hello",
    "hey",
    "can you",
    "could you",
    "please",
    "tomorrow",
    "available",
    "tour",
    "tours",
    "activity",
    "activities",
    "list",
    "show",
    "book",
    "booking",
    "reservation",
  ];
  const portugueseSignals = [
    "olá",
    "ola",
    "bom dia",
    "boa tarde",
    "quero",
    "passeio",
    "amanhã",
    "reserva",
    "atendente",
  ];
  const spanishSignals = [
    "hola",
    "buenos",
    "buenas",
    "quiero",
    "mañana",
    "reserva",
    "disponible",
    "tour",
    "paseo",
  ];

  const en = countMatches(text, englishSignals);
  const pt = countMatches(text, portugueseSignals);
  const es = countMatches(text, spanishSignals);

  if (en > pt && en > es) return "en";
  if (pt > en && pt > es) return "pt";
  if (es > en && es > pt) return "es";

  // Tie-breakers for common short phrases.
  if (en === pt && en > 0 && text.includes("can you")) return "en";
  if (pt === es && pt > 0 && (text.includes("olá") || text.includes("amanhã"))) return "pt";
  if (es === en && es > 0 && (text.includes("hola") || text.includes("mañana"))) return "es";

  // Practical fallback: if the text looks like a short English intent and no PT/ES signals are present,
  // prefer English instead of tenant default to avoid cross-language replies.
  if (en > 0 && pt === 0 && es === 0) return "en";

  return null;
}
