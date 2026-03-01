import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant } from "../../bokun/gateway.ts";

export type HandleEditBookingArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
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
      text: "Não encontrei uma reserva confirmada para alterar. Se quiser fazer uma nova reserva, me diga qual atividade e data deseja.",
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
      text: `Reserva ${confirmationCode} cancelada para remarcação. Para qual data deseja remarcar?`,
      handled: true,
    };
  } catch (error) {
    return {
      text: "Não foi possível cancelar a reserva atual na Bokun. Tente novamente ou entre em contato com o suporte.",
      handled: true,
    };
  }
}
