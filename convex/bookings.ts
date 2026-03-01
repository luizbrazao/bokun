import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : null;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractBokunStringField(data: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const direct = asNonEmptyString(data[key]);
    if (direct) {
      return direct;
    }
  }
  return undefined;
}

function parseJsonSafe(text: string): unknown {
  if (text.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Creates a booking on Bokun using the 2-step reserve & confirm flow:
 *
 * 1. Add activity to shopping cart (POST /shopping-cart.json/session/{sessionId}/activity)
 * 2. Reserve booking (POST /booking.json/guest/{sessionId}/reserve?paymentParameters=RESERVE_FOR_EXTERNAL_PAYMENT)
 * 3. Confirm booking (POST /booking.json/{confirmationCode}/confirm)
 *
 * This uses RESERVE_FOR_EXTERNAL_PAYMENT which holds availability for ~30 min
 * while external payment is collected, then confirms the booking.
 */
export const createFromDraft = action({
  args: {
    bookingDraftId: v.id("booking_drafts"),
  },
  handler: async (ctx, args): Promise<{
    bokunBookingId: string | undefined;
    bokunConfirmationCode: string;
    bokunBookingUrl: string | undefined;
  }> => {
    const draft: any = await ctx.runQuery(api.bookingDrafts.getBookingDraftById, {
      bookingDraftId: args.bookingDraftId,
    });
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    if (!draft.activityId || !draft.selectedStartTimeId || !draft.selectedDateKey || !draft.participants) {
      throw new Error(
        "Booking draft incompleto. activityId, selectedStartTimeId, selectedDateKey e participants são obrigatórios."
      );
    }

    const bokunContext: any = await ctx.runQuery(api.bokunInstallations.getBokunContext, {
      tenantId: draft.tenantId,
    });
    if (!bokunContext) {
      throw new Error("Tenant sem instalação Bokun.");
    }

    const baseUrl = bokunContext.baseUrl;
    const headers: Record<string, string> = {
      ...(bokunContext.headers ?? {}),
      "Content-Type": "application/json",
    };

    const sessionId = crypto.randomUUID();

    // Parse booking answers if present
    let mainContactDetails: JsonRecord | undefined;
    if (draft.bookingAnswers) {
      try {
        mainContactDetails = JSON.parse(draft.bookingAnswers) as JsonRecord;
      } catch {
        // Invalid JSON, skip answers
        mainContactDetails = undefined;
      }
    }

    // Step 1: Add activity to shopping cart
    const cartPayload: JsonRecord = {
      activityId: Number(draft.activityId),
      startTimeId: draft.selectedStartTimeId,
      date: draft.selectedDateKey,
      ...(typeof draft.selectedRateId === "number"
        ? { pricingCategoryBookings: [{ pricingCategoryId: draft.selectedRateId, participants: draft.participants }] }
        : {}),
      ...(draft.pickupPlaceId !== undefined ? { pickupPlaceId: draft.pickupPlaceId } : {}),
      ...(mainContactDetails ? { mainContactDetails } : {}),
    };

    const cartUrl = new URL(
      `/shopping-cart.json/session/${encodeURIComponent(sessionId)}/activity`,
      baseUrl
    );
    const cartResponse = await fetch(cartUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(cartPayload),
    });

    if (!cartResponse.ok) {
      const errorText = await cartResponse.text().catch(() => "");
      throw new Error(`Bokun cart add failed (${cartResponse.status}): ${errorText}`);
    }

    // Step 2: Reserve booking (holds availability for ~30 min)
    const reserveUrl = new URL(
      `/booking.json/guest/${encodeURIComponent(sessionId)}/reserve?paymentParameters=RESERVE_FOR_EXTERNAL_PAYMENT`,
      baseUrl
    );
    const reserveResponse = await fetch(reserveUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!reserveResponse.ok) {
      const errorText = await reserveResponse.text().catch(() => "");
      throw new Error(`Bokun reserve failed (${reserveResponse.status}): ${errorText}`);
    }

    const reserveRaw = await reserveResponse.text();
    const reserveRecord = asRecord(parseJsonSafe(reserveRaw)) ?? {};

    const confirmationCode = extractBokunStringField(
      reserveRecord,
      ["confirmationCode", "confirmation_code", "code"]
    );

    if (!confirmationCode) {
      throw new Error("Bokun reserve succeeded but no confirmationCode returned.");
    }

    // Step 3: Confirm booking
    const confirmUrl = new URL(
      `/booking.json/${encodeURIComponent(confirmationCode)}/confirm`,
      baseUrl
    );
    const confirmResponse = await fetch(confirmUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!confirmResponse.ok) {
      const errorText = await confirmResponse.text().catch(() => "");
      throw new Error(`Bokun confirm failed (${confirmResponse.status}): ${errorText}`);
    }

    const confirmRaw = await confirmResponse.text();
    const confirmRecord = asRecord(parseJsonSafe(confirmRaw)) ?? {};
    const nestedBooking = asRecord(confirmRecord.booking);

    const bokunBookingId =
      extractBokunStringField(confirmRecord, ["bookingId", "id"]) ??
      extractBokunStringField(reserveRecord, ["bookingId", "id"]) ??
      (nestedBooking ? extractBokunStringField(nestedBooking, ["id", "bookingId"]) : undefined);
    const bokunConfirmationCode = confirmationCode;
    const bokunBookingUrl =
      extractBokunStringField(confirmRecord, ["bookingUrl", "url"]) ??
      (nestedBooking ? extractBokunStringField(nestedBooking, ["bookingUrl", "url"]) : undefined);

    await ctx.runMutation(api.bookingDrafts.setBokunBookingResult, {
      bookingDraftId: args.bookingDraftId,
      bokunBookingId,
      bokunConfirmationCode,
      bokunBookingUrl,
    });

    return {
      bokunBookingId,
      bokunConfirmationCode,
      bokunBookingUrl,
    };
  },
});
