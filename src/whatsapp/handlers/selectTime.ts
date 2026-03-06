import { getConvexClient } from "../../convex/client.ts";
import { handleRouteAfterSelectTime } from "./routeAfterSelectTime.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleSelectTimeArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
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
      text: byLanguage(args.language, {
        pt: "Responda com um número da lista.",
        en: "Reply with a number from the list.",
        es: "Responde con un número de la lista.",
      }),
    };
  }

  if (selectedIndex < 1) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Responda com um número da lista.",
        en: "Reply with a number from the list.",
        es: "Responde con un número de la lista.",
      }),
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
      text: byLanguage(args.language, {
        pt: "Não encontrei uma lista recente de horários. Vamos listar os horários novamente?",
        en: "I couldn't find a recent time list. Shall we list the times again?",
        es: "No encontré una lista reciente de horarios. ¿Volvemos a listar los horarios?",
      }),
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
      text: byLanguage(args.language, {
        pt: "Essa lista de horários expirou. Vamos listar os horários novamente?",
        en: "This time list has expired. Shall we list the times again?",
        es: "Esta lista de horarios caducó. ¿Volvemos a listar los horarios?",
      }),
      selectedIndex,
    };
  }

  if (!selection.ok && selection.reason === "OPTION_NOT_FOUND") {
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

  if (!selection.ok && selection.reason === "OPTION_INVALID") {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Esse horário não está mais selecionável. Vamos listar novamente?",
        en: "That time is no longer selectable. Shall we list again?",
        es: "Ese horario ya no se puede seleccionar. ¿Volvemos a listar?",
      }),
      selectedIndex,
    };
  }

  if (!selection.ok) {
    return {
      ok: false,
      text: byLanguage(args.language, {
        pt: "Não encontrei uma lista recente de horários. Vamos listar os horários novamente?",
        en: "I couldn't find a recent time list. Shall we list the times again?",
        es: "No encontré una lista reciente de horarios. ¿Volvemos a listar los horarios?",
      }),
      selectedIndex,
    };
  }

  let next: "check_pickup" | "skip_pickup";
  let routeText: string;

  if (typeof selection.selectedPickupSelectionType === "string") {
    if (selection.selectedPickupSelectionType === "UNAVAILABLE") {
      next = "skip_pickup";
      routeText = byLanguage(args.language, {
        pt: "Perfeito. Não há pickup para essa atividade. Continuando…",
        en: "Perfect. There is no pickup for this activity. Continuing…",
        es: "Perfecto. No hay pickup para esta actividad. Continuando…",
      });
    } else {
      next = "check_pickup";
      routeText = byLanguage(args.language, {
        pt: "Beleza. Agora vou verificar se há pickup para essa atividade.",
        en: "Great. Now I'll check whether pickup is available for this activity.",
        es: "Perfecto. Ahora voy a verificar si hay pickup para esta actividad.",
      });
    }
  } else {
    const route = await handleRouteAfterSelectTime({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      language: args.language,
    });
    next = route.next;
    routeText = route.text;
  }

  const confirmationText = byLanguage(args.language, {
    pt: `Perfeito. Horário selecionado para ${selection.selectedDateKey} (startTimeId: ${selection.selectedStartTimeId}).`,
    en: `Perfect. Time selected for ${selection.selectedDateKey} (startTimeId: ${selection.selectedStartTimeId}).`,
    es: `Perfecto. Horario seleccionado para ${selection.selectedDateKey} (startTimeId: ${selection.selectedStartTimeId}).`,
  });

  return {
    ok: true,
    text: [confirmationText, routeText].join("\n\n"),
    selectedIndex,
    next,
  };
}
