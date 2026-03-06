import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant, bokunGetBookingForTenant } from "../../bokun/gateway.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";
import { extractConfirmationCodeFromText } from "./cancelBooking.ts";

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

const EDIT_PATTERNS: RegExp[] = [
  /\balterar\b/u,
  /\beditar\b/u,
  /\bremarcar\b/u,
  /\bremarcacao\b/u,
  /\bremarcação\b/u,
  /\bmudar\b/u,
  /\btrocar data\b/u,
  /\bchange\b/u,
  /\bedit\b/u,
  /\breschedule\b/u,
  /\bmodify booking\b/u,
  /\bcambiar\b/u,
  /\breprogramar\b/u,
  /\bmodificar reserva\b/u,
];

export function isEditIntent(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.length === 0) return false;
  return EDIT_PATTERNS.some((pattern) => pattern.test(normalized));
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

  const explicitConfirmationCode = extractConfirmationCodeFromText(args.text);
  const confirmationCode =
    explicitConfirmationCode ??
    (draft?.status === "confirmed" ? draft.bokunConfirmationCode : undefined);

  if (!confirmationCode) {
    await convex.mutation(
      "conversations:setPendingAction" as any,
      {
        tenantId: args.tenantId,
        waUserId: args.waUserId,
        pendingAction: "edit_code",
      } as any
    );
    return {
      text: byLanguage(args.language, {
        pt: "Para remarcar, me envie o código da reserva atual (confirmation code).",
        en: "To reschedule, please send me the current booking confirmation code.",
        es: "Para reprogramar, envíame el código de confirmación de la reserva actual.",
      }),
      handled: true,
    };
  }

  const activityId = draft?.activityId;

  try {
    try {
      await bokunGetBookingForTenant({
        tenantId: args.tenantId,
        confirmationCode,
      });
    } catch {
      await convex.mutation(
        "conversations:setPendingAction" as any,
        {
          tenantId: args.tenantId,
          waUserId: args.waUserId,
          pendingAction: "edit_code",
        } as any
      );
      return {
        text: byLanguage(args.language, {
          pt: `Não encontrei reserva com o código ${confirmationCode}. Confira e tente novamente.`,
          en: `I couldn't find a booking with code ${confirmationCode}. Please check and try again.`,
          es: `No encontré una reserva con el código ${confirmationCode}. Verifica y vuelve a intentarlo.`,
        }),
        handled: true,
      };
    }

    await bokunCancelBookingForTenant({
      tenantId: args.tenantId,
      confirmationCode,
      note: "Cancelado para remarcação pelo cliente via chat.",
    });

    if (draft?._id && draft.bokunConfirmationCode === confirmationCode) {
      await convex.mutation(
        "bookingDrafts:abandonDraft" as any,
        { bookingDraftId: draft._id } as any
      );
    }
    await convex.mutation(
      "conversations:clearPendingAction" as any,
      {
        tenantId: args.tenantId,
        waUserId: args.waUserId,
      } as any
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

    if (activityId) {
      return {
        text: byLanguage(args.language, {
          pt: `Reserva ${confirmationCode} cancelada para remarcação. Para qual data deseja remarcar?`,
          en: `Booking ${confirmationCode} cancelled for rescheduling. Which date would you like?`,
          es: `Reserva ${confirmationCode} cancelada para reprogramación. ¿Qué fecha deseas?`,
        }),
        handled: true,
      };
    }

    return {
      text: byLanguage(args.language, {
        pt: `Reserva ${confirmationCode} cancelada para remarcação. Agora me diga a atividade e a nova data desejada.`,
        en: `Booking ${confirmationCode} was cancelled for rescheduling. Now tell me the activity and the new date you want.`,
        es: `La reserva ${confirmationCode} fue cancelada para reprogramación. Ahora dime la actividad y la nueva fecha deseada.`,
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
