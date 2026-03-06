import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant } from "../../bokun/gateway.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleEditBookingArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type HandleEditBookingResult = {
  text: string;
  handled: boolean;
};

type ConfirmedBookingDraft = {
  _id: string;
  bokunConfirmationCode?: string;
  activityId?: string;
  selectedDateKey?: string;
  status: string;
} | null;

const EDIT_KEYWORDS = [
  "alterar",
  "alterar reserva",
  "mudar",
  "mudar data",
  "mudar reserva",
  "editar",
  "editar reserva",
  "remarcar",
  "trocar data",
  "change",
  "change booking",
  "edit",
  "edit booking",
  "reschedule",
  "cambiar reserva",
  "cambiar fecha",
  "editar reserva",
  "reprogramar",
];

export function isEditIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return EDIT_KEYWORDS.some(
    (kw) => normalized === kw || normalized.startsWith(`${kw} `)
  );
}

export async function handleEditBooking(
  args: HandleEditBookingArgs
): Promise<HandleEditBookingResult> {
  const convex = getConvexClient();

  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as ConfirmedBookingDraft;

  if (!draft || draft.status !== "confirmed" || !draft.bokunConfirmationCode) {
    return {
      text: byLanguage(args.language, {
        pt: "Não encontrei uma reserva confirmada para alterar. Se quiser fazer uma nova reserva, me diga qual atividade e data deseja.",
        en: "I couldn't find a confirmed booking to edit. If you want a new booking, tell me which activity and date you want.",
        es: "No encontré una reserva confirmada para modificar. Si quieres una nueva reserva, dime qué actividad y fecha deseas.",
      }),
      handled: true,
    };
  }

  const activityId = draft.activityId;
  const confirmationCode = draft.bokunConfirmationCode;

  try {
    await bokunCancelBookingForTenant({
      tenantId: args.tenantId,
      confirmationCode,
      note: "Cancelado para remarcação pelo cliente via chat.",
    });

    await convex.mutation(
      "bookingDrafts:abandonDraft" as any,
      { bookingDraftId: draft._id } as any
    );

    // Preserve activityId so the booking flow can pick it up when user sends new date
    if (activityId) {
      await convex.mutation(
        "conversations:setLastActivityId" as any,
        {
          tenantId: args.tenantId,
          waUserId: args.waUserId,
          activityId: String(activityId),
        } as any
      );
    }

    return {
      text: byLanguage(args.language, {
        pt: `Reserva ${confirmationCode} cancelada para remarcação. Para qual data deseja remarcar?`,
        en: `Booking ${confirmationCode} cancelled for rescheduling. Which date would you like?`,
        es: `Reserva ${confirmationCode} cancelada para reprogramación. ¿Qué fecha deseas?`,
      }),
      handled: true,
    };
  } catch (error) {
    return {
      text: byLanguage(args.language, {
        pt: "Não foi possível cancelar a reserva atual na Bokun. Tente novamente ou entre em contato com o suporte.",
        en: "Could not cancel the current booking in Bokun. Please try again or contact support.",
        es: "No fue posible cancelar la reserva actual en Bokun. Inténtalo de nuevo o contacta con soporte.",
      }),
      handled: true,
    };
  }
}
