import { createHmac, timingSafeEqual } from "node:crypto";
import { getConvexClient } from "../convex/client.ts";

export type BokunWebhookHeaders = {
  apiKey?: string;
  hmac?: string;
  topic?: string;
  vendorId?: string;
  bookingId?: string;
  experienceBookingId?: string;
};

export type BokunWebhookResult = {
  ok: boolean;
  topic: string;
  error?: string;
};

/**
 * Validates the Bokun webhook HMAC signature.
 *
 * Bokun signs: Base64(HMAC-SHA256(app_secret, request_body))
 * Header: x-bokun-hmac
 */
export function validateBokunWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string,
  appSecret: string
): boolean {
  const expectedHmac = createHmac("sha256", appSecret).update(rawBody).digest("base64");
  const providedBuffer = Buffer.from(hmacHeader, "base64");
  const expectedBuffer = Buffer.from(expectedHmac, "base64");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function extractBokunWebhookHeaders(headers: Record<string, string | string[] | undefined>): BokunWebhookHeaders {
  const get = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()];
    return typeof val === "string" ? val : Array.isArray(val) ? val[0] : undefined;
  };

  return {
    apiKey: get("x-bokun-apikey"),
    hmac: get("x-bokun-hmac"),
    topic: get("x-bokun-topic"),
    vendorId: get("x-bokun-vendor-id"),
    bookingId: get("x-bokun-booking-id"),
    experienceBookingId: get("x-bokun-experiencebooking-id"),
  };
}

/**
 * Handles a validated Bokun webhook event.
 *
 * Topics:
 * - bookings/create: Booking created in confirmed state
 * - bookings/update: Booking or product booking updated
 * - bookings/cancel: Booking cancelled
 * - apps/uninstall: Vendor uninstalled the app
 * - experiences/create, experiences/update, experiences/availability_update
 */
export async function handleBokunWebhookEvent(
  webhookHeaders: BokunWebhookHeaders,
  body: unknown
): Promise<BokunWebhookResult> {
  const topic = webhookHeaders.topic ?? "unknown";
  const convex = getConvexClient();

  switch (topic) {
    case "bookings/create":
    case "bookings/update": {
      // Bokun sends bookingId in headers, payload has timestamp
      // We log the event for now - future: sync booking status
      return { ok: true, topic };
    }

    case "bookings/cancel": {
      // Bokun notifies that a booking was cancelled
      // Future: update booking_draft status if we track it
      return { ok: true, topic };
    }

    case "apps/uninstall": {
      // Vendor uninstalled the app - disable their tenant
      const vendorId = webhookHeaders.vendorId;
      if (vendorId) {
        // Future: lookup tenant by vendorId and disable
        // For now, just acknowledge
      }
      return { ok: true, topic };
    }

    case "experiences/create":
    case "experiences/update":
    case "experiences/availability_update": {
      // Experience/availability updates - informational for now
      return { ok: true, topic };
    }

    default: {
      return { ok: true, topic };
    }
  }
}
