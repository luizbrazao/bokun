import { getConvexClient } from "../../convex/client.ts";

export type HandleAfterSelectPickupArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
};

export type HandleAfterSelectPickupResult = {
  text: string;
};

type BookingDraft = {
  _id: string;
} | null;

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

export async function handleAfterSelectPickup(
  args: HandleAfterSelectPickupArgs
): Promise<HandleAfterSelectPickupResult> {
  const selectedIndex = parseSelectedIndex(String(args.text ?? "").trim());
  if (selectedIndex === null || selectedIndex < 1) {
    return {
      text: "Responda com um número da lista.",
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
      text: "Não encontrei uma lista recente de pickup. Vamos listar os locais novamente?",
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
      text: "Essa lista de pickup expirou. Vamos listar os locais novamente?",
    };
  }

  if (!selection.ok && selection.reason === "OPTION_NOT_FOUND") {
    return {
      text: "Não reconheci essa opção. Escolha um número das opções enviadas.",
    };
  }

  if (!selection.ok && selection.reason === "OPTION_INVALID") {
    return {
      text: "Esse local não está selecionável. Vamos listar novamente?",
    };
  }

  if (!selection.ok) {
    return {
      text: "Não encontrei uma lista recente de pickup. Vamos listar os locais novamente?",
    };
  }

  return {
    text: "Perfeito. Pickup selecionado. Quantas pessoas vão participar? (ex: 2)",
  };
}
