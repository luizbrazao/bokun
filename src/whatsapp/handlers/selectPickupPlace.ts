import { getConvexClient } from "../../convex/client.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleSelectPickupPlaceArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type HandleSelectPickupPlaceResult = {
  ok: boolean;
  text: string;
  pickupPlaceId?: string | number;
  selectedIndex?: number;
};

export type PickupOptionMapEntry = {
  index: number;
  pickupPlaceId?: string | number;
};

type ConversationState = {
  lastPickupOptionMap?: PickupOptionMapEntry[];
  lastPickupOptionMapUpdatedAt?: number;
} | null;

const OPTION_MAP_TTL_MS = 15 * 60_000;

export function isOptionMapExpired(updatedAt: unknown, nowMs: number, ttlMs: number): boolean {
  if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) {
    return true;
  }

  return nowMs - updatedAt > ttlMs;
}

export function parseSelectedIndex(text: string): number | null {
  const match = text.match(/(\d+)/);
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 10);
  if (!Number.isInteger(value)) {
    return null;
  }

  return value;
}

export function resolvePickupPlaceIdFromOptionMap(
  optionMap: PickupOptionMapEntry[] | undefined,
  selectedIndex: number
): { found: boolean; pickupPlaceId?: string | number } {
  if (!optionMap || optionMap.length === 0) {
    return { found: false };
  }

  const entry = optionMap.find((item) => item.index === selectedIndex);
  if (!entry) {
    return { found: false };
  }

  return { found: true, pickupPlaceId: entry.pickupPlaceId };
}

export async function handleSelectPickupPlace(
  args: HandleSelectPickupPlaceArgs
): Promise<HandleSelectPickupPlaceResult> {
  const selectedIndex = parseSelectedIndex(args.text);
  if (selectedIndex === null || selectedIndex < 1 || selectedIndex > 8) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Responda com um número de 1 a 8.",
        en: "Reply with a number from 1 to 8.",
        es: "Responde con un número del 1 al 8.",
      }),
    };
  }

  const convex = getConvexClient();
  const conversation = (await convex.query(
    "conversations:getConversationByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as ConversationState;

  if (!conversation?.lastPickupOptionMap) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Não encontrei uma lista recente de pickup. Vamos listar os locais novamente?",
        en: "I couldn't find a recent pickup list. Shall we list pickup places again?",
        es: "No encontré una lista reciente de pickup. ¿Volvemos a listar los puntos de pickup?",
      }),
      selectedIndex,
    };
  }

  if (isOptionMapExpired(conversation.lastPickupOptionMapUpdatedAt, Date.now(), OPTION_MAP_TTL_MS)) {
    try {
      await convex.mutation(
        "conversations:clearConversationPickupOptionMap" as any,
        {
          tenantId: args.tenantId,
          waUserId: args.waUserId,
        } as any
      );
    } catch {
      // Best-effort cleanup on TTL expiration.
    }

    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Essa lista de pickup expirou. Vamos listar os locais novamente?",
        en: "This pickup list has expired. Shall we list pickup places again?",
        es: "Esta lista de pickup caducó. ¿Volvemos a listar los puntos de pickup?",
      }),
      selectedIndex,
    };
  }

  const resolved = resolvePickupPlaceIdFromOptionMap(conversation.lastPickupOptionMap, selectedIndex);
  if (!resolved.found) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Não reconheci essa opção. Escolha um número das opções enviadas.",
        en: "I didn't recognize that option. Choose a number from the sent options.",
        es: "No reconocí esa opción. Elige un número de las opciones enviadas.",
      }),
      selectedIndex,
    };
  }

  if (resolved.pickupPlaceId === undefined) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Esse local não está selecionável. Vamos listar novamente?",
        en: "That pickup location is no longer selectable. Shall we list again?",
        es: "Ese punto de pickup ya no se puede seleccionar. ¿Volvemos a listar?",
      }),
      selectedIndex,
    };
  }

  await convex.mutation(
    "bookingDrafts:upsertBookingDraftPickupPlace" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      pickupPlaceId: resolved.pickupPlaceId,
    } as any
  );

  await convex.mutation(
    "conversations:clearConversationPickupOptionMap" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  );

  return {
    ok: true,
    text: byLanguage(args.language, {
      pt: `Perfeito. Vou usar o pickup ${selectedIndex}. Continuando…`,
      en: `Perfect. I'll use pickup ${selectedIndex}. Continuing…`,
      es: `Perfecto. Usaré el pickup ${selectedIndex}. Continuando…`,
    }),
    pickupPlaceId: resolved.pickupPlaceId,
    selectedIndex,
  };
}
