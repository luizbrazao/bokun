import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant, bokunGetBookingForTenant } from "../../bokun/gateway.ts";
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

const CANCEL_PATTERNS: RegExp[] = [
  /\bcancelar\b/u,
  /\bcancelamento\b/u,
  /\banular\b/u,
  /\bcancel\b/u,
  /\bcancellation\b/u,
  /\bcancelacion\b/u,
  /\bcancelación\b/u,
];

const NEGATED_CANCEL_PATTERNS: RegExp[] = [
  /\bnao\b.*\bcancel/u,
  /\bnão\b.*\bcancel/u,
  /\bnot\b.*\bcancel/u,
  /\bno\b.*\bcancel/u,
  /\bnunca\b.*\bcancel/u,
  /\bnever\b.*\bcancel/u,
  /\bjamas\b.*\bcancel/u,
  /\bjamás\b.*\bcancel/u,
];

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isLikelyNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = normalizeText(message);
  return (
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("nao encontrado") ||
    normalized.includes("não encontrado")
  );
}

export function extractConfirmationCodeFromText(text: string): string | null {
  const candidates = text.match(/\b[A-Za-z0-9][A-Za-z0-9-]{5,}\b/g);
  if (!candidates) return null;

  const blockedTokens = new Set([
    "cancelar",
    "cancelamento",
    "cancel",
    "cancellation",
    "anular",
    "reserva",
    "booking",
    "preciso",
    "quero",
    "necessito",
  ]);

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (blockedTokens.has(normalized)) continue;
    // Ignore date-like numeric tokens; require at least one letter.
    if (!/[A-Za-z]/.test(candidate)) continue;
    return candidate.toUpperCase();
  }

  return null;
}

export function isCancelIntent(text: string): boolean {
  const normalized = normalizeText(text);
  if (normalized.length === 0) return false;

  if (NEGATED_CANCEL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return CANCEL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function handleCancelBooking(
  args: HandleCancelBookingArgs
): Promise<HandleCancelBookingResult> {
  const convex = getConvexClient();
  const explicitConfirmationCode = extractConfirmationCodeFromText(args.text);

  // Find the last confirmed booking for this user
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as ConfirmedBookingDraft;

  const confirmationCode =
    explicitConfirmationCode ??
    (draft?.status === "confirmed" ? draft.bokunConfirmationCode : undefined);

  if (!confirmationCode) {
    await convex.mutation(
      "conversations:setPendingAction" as any,
      {
        tenantId: args.tenantId,
        waUserId: args.waUserId,
        pendingAction: "cancel_code",
      } as any
    );
    return {
      text: byLanguage(args.language, {
        pt: "Para cancelar, me envie o código da reserva (confirmation code).",
        en: "To cancel, please send me the booking confirmation code.",
        es: "Para cancelar, envíame el código de confirmación de la reserva.",
      }),
      handled: true,
    };
  }

  try {
    try {
      await bokunGetBookingForTenant({
        tenantId: args.tenantId,
        confirmationCode,
      });
    } catch (lookupError) {
      if (isLikelyNotFoundError(lookupError)) {
        await convex.mutation(
          "conversations:setPendingAction" as any,
          {
            tenantId: args.tenantId,
            waUserId: args.waUserId,
            pendingAction: "cancel_code",
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
      throw lookupError;
    }

    await bokunCancelBookingForTenant({
      tenantId: args.tenantId,
      confirmationCode,
      note: "Cancelado pelo cliente via WhatsApp.",
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

    try {
      await convex.mutation("auditLog:insertAuditEvent" as any, {
        tenantId: args.tenantId,
        event: "booking_cancelled",
        waUserId: args.waUserId,
        confirmationCode,
        bookingDraftId: draft?._id,
      } as any);
    } catch {
      rootLogger.warn({ tenantId: args.tenantId, handler: "cancelBooking" }, "audit_log_write_failed");
    }

    return {
      text: byLanguage(args.language, {
        pt: `Reserva ${confirmationCode} cancelada com sucesso.`,
        en: `Booking ${confirmationCode} cancelled successfully.`,
        es: `Reserva ${confirmationCode} cancelada con éxito.`,
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
        confirmationCode,
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
