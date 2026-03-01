import { getConvexClient } from "../../convex/client.ts";
import rootLogger from "../../lib/logger.ts";

export type HandleAfterConfirmArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
};

export type HandleAfterConfirmResult = {
  text: string;
};

export type BookingDraftSummary = {
  _id: string;
  activityId?: string;
  selectedDateKey?: string;
  selectedStartTimeId?: number;
  pickupPlaceId?: string | number;
  participants?: number;
  bokunBookingId?: string;
  bokunConfirmationCode?: string;
  bokunBookingUrl?: string;
} | null;

export type CreateBookingFromDraftResult = {
  bokunBookingId?: string;
  bokunConfirmationCode?: string;
  bokunBookingUrl?: string;
} | null;

type AfterConfirmDeps = {
  getDraft: (args: { tenantId: string; waUserId: string }) => Promise<BookingDraftSummary>;
  confirmDraft: (args: { bookingDraftId: string }) => Promise<void>;
  abandonDraft: (args: { bookingDraftId: string }) => Promise<void>;
  createBookingFromDraft: (args: { bookingDraftId: string }) => Promise<CreateBookingFromDraftResult>;
};

export function parseConfirmationIntent(text: string): "confirm" | "cancel" | "invalid" {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) {
    return "invalid";
  }

  if (["sim", "s", "yes", "y"].includes(normalized)) {
    return "confirm";
  }

  if (["nao", "não", "n", "no"].includes(normalized)) {
    return "cancel";
  }

  return "invalid";
}

function buildConfirmedText(result: CreateBookingFromDraftResult): string {
  const parts = [
    result?.bokunBookingId ? `Booking ID: ${result.bokunBookingId}` : undefined,
    result?.bokunConfirmationCode ? `Código: ${result.bokunConfirmationCode}` : undefined,
    result?.bokunBookingUrl ? `Link: ${result.bokunBookingUrl}` : undefined,
  ].filter((part): part is string => part !== undefined);

  if (parts.length === 0) {
    return "Perfeito. Reserva confirmada e enviada para a Bokun.";
  }

  return `Perfeito. Reserva confirmada e enviada para a Bokun. ${parts.join(" | ")}`;
}

export async function handleAfterConfirmWithDeps(
  args: HandleAfterConfirmArgs,
  deps: AfterConfirmDeps
): Promise<HandleAfterConfirmResult> {
  const intent = parseConfirmationIntent(String(args.text ?? ""));
  if (intent === "invalid") {
    return {
      text: "Responda com sim ou não.",
    };
  }

  const draft = await deps.getDraft({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
  });

  if (!draft?._id) {
    return {
      text: "Não encontrei uma reserva em andamento. Me diga atividade e data para continuar.",
    };
  }

  if (intent === "cancel") {
    await deps.abandonDraft({ bookingDraftId: draft._id });
    try {
      const convex = getConvexClient();
      await convex.mutation("auditLog:insertAuditEvent" as any, {
        tenantId: args.tenantId,
        event: "booking_cancelled",
        waUserId: args.waUserId,
        bookingDraftId: draft._id,
      } as any);
    } catch {
      rootLogger.warn({ tenantId: args.tenantId, handler: "afterConfirm" }, "audit_log_write_failed");
    }
    return {
      text: "Ok, cancelei. Me diga atividade e data para recomeçar.",
    };
  }

  await deps.confirmDraft({ bookingDraftId: draft._id });

  try {
    const booking = await deps.createBookingFromDraft({ bookingDraftId: draft._id });
    try {
      const convex = getConvexClient();
      await convex.mutation("auditLog:insertAuditEvent" as any, {
        tenantId: args.tenantId,
        event: "booking_confirmed",
        waUserId: args.waUserId,
        confirmationCode: booking?.bokunConfirmationCode,
        bookingDraftId: draft._id,
        meta: JSON.stringify({ bokunBookingId: booking?.bokunBookingId }),
      } as any);
    } catch {
      rootLogger.warn({ tenantId: args.tenantId, handler: "afterConfirm" }, "audit_log_write_failed");
    }
    return {
      text: buildConfirmedText(booking),
    };
  } catch {
    return {
      text: "Reserva confirmada internamente, mas falhou ao criar booking na Bokun. Tente novamente em instantes.",
    };
  }
}

export async function handleAfterConfirm(
  args: HandleAfterConfirmArgs
): Promise<HandleAfterConfirmResult> {
  const convex = getConvexClient();

  return handleAfterConfirmWithDeps(args, {
    getDraft: async (params) =>
      (await convex.query(
        "bookingDrafts:getBookingDraftByWaUserId" as any,
        {
          tenantId: params.tenantId,
          waUserId: params.waUserId,
        } as any
      )) as BookingDraftSummary,
    confirmDraft: async (params) => {
      await convex.mutation(
        "bookingDrafts:confirmDraft" as any,
        {
          bookingDraftId: params.bookingDraftId,
        } as any
      );
    },
    abandonDraft: async (params) => {
      await convex.mutation(
        "bookingDrafts:abandonDraft" as any,
        {
          bookingDraftId: params.bookingDraftId,
        } as any
      );
    },
    createBookingFromDraft: async (params) =>
      (await convex.action(
        "bookings:createFromDraft" as any,
        {
          bookingDraftId: params.bookingDraftId,
        } as any
      )) as CreateBookingFromDraftResult,
  });
}
