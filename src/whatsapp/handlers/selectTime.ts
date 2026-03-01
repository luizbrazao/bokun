import { getConvexClient } from "../../convex/client.ts";
import { handleRouteAfterSelectTime } from "./routeAfterSelectTime.ts";

export type HandleSelectTimeArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
};

export type HandleSelectTimeResult = {
  ok: boolean;
  text: string;
  selectedIndex?: number;
  next?: "check_pickup" | "skip_pickup";
};

type ConversationState = {
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

export async function handleSelectTime(args: HandleSelectTimeArgs): Promise<HandleSelectTimeResult> {
  const selectedIndex = parseSelectedIndex(args.text);
  if (selectedIndex === null) {
    return {
      ok: false,
      text: "Responda com um número da lista.",
    };
  }

  if (selectedIndex < 1) {
    return {
      ok: false,
      text: "Responda com um número da lista.",
    };
  }

  const convex = getConvexClient();
  const bookingDraft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as ConversationState;

  if (!bookingDraft?._id) {
    return {
      ok: false,
      text: "Não encontrei uma lista recente de horários. Vamos listar os horários novamente?",
      selectedIndex,
    };
  }

  const selection = (await convex.mutation(
    "bookingDrafts:setSelectedTimeFromOption" as any,
    {
      bookingDraftId: bookingDraft._id,
      optionId: String(selectedIndex),
    } as any
  )) as
    | {
        ok: true;
        selectedAvailabilityId: string;
        selectedStartTimeId: number;
        selectedDateKey: string;
        selectedRateId?: number;
        selectedPickupSelectionType?: string;
      }
    | {
        ok: false;
        reason: "OPTION_MAP_MISSING" | "OPTION_MAP_EXPIRED" | "OPTION_NOT_FOUND" | "OPTION_INVALID";
      };

  if (!selection.ok && selection.reason === "OPTION_MAP_EXPIRED") {
    return {
      ok: false,
      text: "Essa lista de horários expirou. Vamos listar os horários novamente?",
      selectedIndex,
    };
  }

  if (!selection.ok && selection.reason === "OPTION_NOT_FOUND") {
    return {
      ok: false,
      text: "Não reconheci essa opção. Escolha um número das opções enviadas.",
      selectedIndex,
    };
  }

  if (!selection.ok && selection.reason === "OPTION_INVALID") {
    return {
      ok: false,
      text: "Esse horário não está mais selecionável. Vamos listar novamente?",
      selectedIndex,
    };
  }

  if (!selection.ok) {
    return {
      ok: false,
      text: "Não encontrei uma lista recente de horários. Vamos listar os horários novamente?",
      selectedIndex,
    };
  }

  let next: "check_pickup" | "skip_pickup";
  let routeText: string;

  if (typeof selection.selectedPickupSelectionType === "string") {
    if (selection.selectedPickupSelectionType === "UNAVAILABLE") {
      next = "skip_pickup";
      routeText = "Perfeito. Não há pickup para essa atividade. Continuando…";
    } else {
      next = "check_pickup";
      routeText = "Beleza. Agora vou verificar se há pickup para essa atividade.";
    }
  } else {
    const route = await handleRouteAfterSelectTime({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    });
    next = route.next;
    routeText = route.text;
  }

  const confirmationText = `Perfeito. Horário selecionado para ${selection.selectedDateKey} (startTimeId: ${selection.selectedStartTimeId}).`;

  return {
    ok: true,
    text: [confirmationText, routeText].join("\n\n"),
    selectedIndex,
    next,
  };
}
