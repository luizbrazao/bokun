import { getConvexClient } from "../../convex/client.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleAfterSelectPickupArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type HandleAfterSelectPickupResult = {
  text: string;
};

type BookingDraft = {
  _id: string;
} | null;

export function parseSelectedIndex(text: string): number | null {
  const match = text.match(/(\d+)/);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  if (!Number.isInteger(value)) return null;

  return value;
}

export async function handleAfterSelectPickup(
  args: HandleAfterSelectPickupArgs
): Promise<HandleAfterSelectPickupResult> {
  const selectedIndex = parseSelectedIndex(String(args.text ?? "").trim());
  if (selectedIndex === null || selectedIndex < 1) {
    return {
      text: byLanguage(args.language, {
        pt: "Responda com um número da lista.",
        en: "Reply with a number from the list.",
        es: "Responde con un número de la lista.",
      }),
    };
  }

  const convex = getConvexClient();
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as BookingDraft;

  if (!draft?._id) {
    return {
      text: byLanguage(args.language, {
        pt: "Não encontrei uma lista recente de pickup. Vamos listar os locais novamente?",
        en: "I couldn't find a recent pickup list. Shall we list pickup places again?",
        es: "No encontré una lista reciente de pickup. ¿Volvemos a listar los puntos de pickup?",
      }),
    };
  }

  const selection = (await convex.mutation(
    "bookingDrafts:setSelectedPickupFromOption" as any,
    {
      bookingDraftId: draft._id,
      selectedIndex,
    } as any
  )) as
    | {
        ok: true;
        pickupPlaceId: string | number;
      }
    | {
        ok: false;
        reason: "OPTION_MAP_MISSING" | "OPTION_MAP_EXPIRED" | "OPTION_NOT_FOUND" | "OPTION_INVALID";
      };

  if (!selection.ok && selection.reason === "OPTION_MAP_EXPIRED") {
    return {
      text: byLanguage(args.language, {
        pt: "Essa lista de pickup expirou. Vamos listar os locais novamente?",
        en: "This pickup list has expired. Shall we list pickup places again?",
        es: "Esta lista de pickup caducó. ¿Volvemos a listar los puntos de pickup?",
      }),
    };
  }

  if (!selection.ok && selection.reason === "OPTION_NOT_FOUND") {
    return {
      text: byLanguage(args.language, {
        pt: "Não reconheci essa opção. Escolha um número das opções enviadas.",
        en: "I didn't recognize that option. Choose a number from the sent options.",
        es: "No reconocí esa opción. Elige un número de las opciones enviadas.",
      }),
    };
  }

  if (!selection.ok && selection.reason === "OPTION_INVALID") {
    return {
      text: byLanguage(args.language, {
        pt: "Esse local não está selecionável. Vamos listar novamente?",
        en: "That pickup location is no longer selectable. Shall we list again?",
        es: "Ese punto de pickup ya no se puede seleccionar. ¿Volvemos a listar?",
      }),
    };
  }

  if (!selection.ok) {
    return {
      text: byLanguage(args.language, {
        pt: "Não encontrei uma lista recente de pickup. Vamos listar os locais novamente?",
        en: "I couldn't find a recent pickup list. Shall we list pickup places again?",
        es: "No encontré una lista reciente de pickup. ¿Volvemos a listar los puntos de pickup?",
      }),
    };
  }

  return {
    text: byLanguage(args.language, {
      pt: "Perfeito. Pickup selecionado. Quantas pessoas vão participar? (ex: 2)",
      en: "Perfect. Pickup selected. How many participants will join? (e.g., 2)",
      es: "Perfecto. Pickup seleccionado. ¿Cuántas personas van a participar? (ej.: 2)",
    }),
  };
}
