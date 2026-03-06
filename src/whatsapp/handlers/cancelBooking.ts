import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant } from "../../bokun/gateway.ts";
import rootLogger from "../../lib/logger.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleCancelBookingArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type HandleCancelBookingResult = {
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

const CANCEL_KEYWORDS = ["cancelar", "cancelar reserva", "cancel", "cancel booking", "anular reserva"];

export function isCancelIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return CANCEL_KEYWORDS.some((kw) => normalized === kw || normalized.startsWith(`${kw} `));
}

export async function handleCancelBooking(
  args: HandleCancelBookingArgs
): Promise<HandleCancelBookingResult> {
  const convex = getConvexClient();

  // Find the last confirmed booking for this user
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
        pt: "Não encontrei uma reserva confirmada para cancelar.",
        en: "I couldn't find a confirmed booking to cancel.",
        es: "No encontré una reserva confirmada para cancelar.",
      }),
      handled: true,
    };
  }

  try {
    await bokunCancelBookingForTenant({
      tenantId: args.tenantId,
      confirmationCode: draft.bokunConfirmationCode,
      note: "Cancelado pelo cliente via WhatsApp.",
    });

    await convex.mutation(
      "bookingDrafts:abandonDraft" as any,
      { bookingDraftId: draft._id } as any
    );

    try {
      await convex.mutation("auditLog:insertAuditEvent" as any, {
        tenantId: args.tenantId,
        event: "booking_cancelled",
        waUserId: args.waUserId,
        confirmationCode: draft.bokunConfirmationCode,
        bookingDraftId: draft._id,
      } as any);
    } catch {
      rootLogger.warn({ tenantId: args.tenantId, handler: "cancelBooking" }, "audit_log_write_failed");
    }

    return {
      text: byLanguage(args.language, {
        pt: `Reserva ${draft.bokunConfirmationCode} cancelada com sucesso.`,
        en: `Booking ${draft.bokunConfirmationCode} cancelled successfully.`,
        es: `Reserva ${draft.bokunConfirmationCode} cancelada con éxito.`,
      }),
      handled: true,
    };
  } catch (error) {
    rootLogger.error({ tenantId: args.tenantId, waUserId: args.waUserId, handler: "cancelBooking", err: error instanceof Error ? error.message : String(error) }, "bokun_cancel_failed");
    try {
      await convex.mutation("auditLog:insertAuditEvent" as any, {
        tenantId: args.tenantId,
        event: "booking_failed",
        waUserId: args.waUserId,
        confirmationCode: draft.bokunConfirmationCode,
        meta: JSON.stringify({ reason: "bokun_cancel_failed" }),
      } as any);
    } catch { /* audit log failure must not mask original error */ }
    return {
      text: byLanguage(args.language, {
        pt: "Não foi possível cancelar a reserva na Bokun. Tente novamente ou entre em contato com o suporte.",
        en: "Could not cancel the booking in Bokun. Please try again or contact support.",
        es: "No fue posible cancelar la reserva en Bokun. Inténtalo de nuevo o contacta con soporte.",
      }),
      handled: true,
    };
  }
}
