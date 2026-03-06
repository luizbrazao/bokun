import { getConvexClient } from "../../convex/client.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleRouteAfterSelectTimeArgs = {
  tenantId: string;
  waUserId: string;
  language?: SupportedLanguage;
};

export type HandleRouteAfterSelectTimeResult = {
  next: "check_pickup" | "skip_pickup";
  text: string;
};

type BookingDraft = {
  activityId?: string;
  date?: string;
  selectedStartTimeId?: number;
  startTimeId?: string | number;
  selectedPickupSelectionType?: string;
} | null;

export function hasBookingDraftForPickup(draftRaw: unknown): boolean {
  if (!draftRaw || typeof draftRaw !== "object") {
    return false;
  }

  const draft = draftRaw as Record<string, unknown>;
  const activityId = draft.activityId;
  const date = draft.date;
  const selectedStartTimeId = draft.selectedStartTimeId;
  const startTimeId = draft.startTimeId;
  const hasActivityId = typeof activityId === "string" && activityId.trim().length > 0;
  const hasDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const hasStartTimeId = selectedStartTimeId !== undefined || startTimeId !== undefined;
  return hasActivityId && hasDate && hasStartTimeId;
}

export async function handleRouteAfterSelectTime(
  args: HandleRouteAfterSelectTimeArgs
): Promise<HandleRouteAfterSelectTimeResult> {
  const convex = getConvexClient();
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as BookingDraft;

  if (!hasBookingDraftForPickup(draft)) {
    return {
      next: "skip_pickup",
      text: byLanguage(args.language, {
        pt: "Preciso primeiro de atividade, data e horário.",
        en: "I first need activity, date, and time.",
        es: "Primero necesito actividad, fecha y horario.",
      }),
    };
  }

  if (draft?.selectedPickupSelectionType === "UNAVAILABLE") {
    return {
      next: "skip_pickup",
      text: byLanguage(args.language, {
        pt: "Perfeito. Não há pickup para essa atividade. Continuando…",
        en: "Perfect. There is no pickup for this activity. Continuing…",
        es: "Perfecto. No hay pickup para esta actividad. Continuando…",
      }),
    };
  }

  return {
    next: "check_pickup",
    text: byLanguage(args.language, {
      pt: "Beleza. Agora vou verificar se há pickup para essa atividade.",
      en: "Great. Now I'll check whether pickup is available for this activity.",
      es: "Perfecto. Ahora voy a verificar si hay pickup para esta actividad.",
    }),
  };
}
