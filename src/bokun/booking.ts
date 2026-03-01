import { bokunRequest, type BokunRequestOptions } from "./client.ts";

export type BokunAuthHeaders = Record<string, string>;

// --- Shopping Cart ---

export type AddActivityToCartArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  sessionId: string;
  body: Record<string, unknown>;
};

export type CartResponse = {
  sessionId?: string;
  bookings?: unknown[];
  [key: string]: unknown;
};

export function buildAddActivityToCartRequest(args: AddActivityToCartArgs): BokunRequestOptions {
  return {
    method: "POST",
    baseUrl: args.baseUrl,
    path: `/shopping-cart.json/session/${encodeURIComponent(args.sessionId)}/activity`,
    headers: args.headers,
    body: args.body,
  };
}

export async function addActivityToCart(args: AddActivityToCartArgs): Promise<CartResponse> {
  return bokunRequest<CartResponse>(buildAddActivityToCartRequest(args));
}

// --- Reserve Booking ---

export type ReserveBookingArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  sessionId: string;
  body?: Record<string, unknown>;
  currency?: string;
};

export type ReserveBookingResponse = {
  confirmationCode?: string;
  bookingId?: string | number;
  id?: string | number;
  status?: string;
  [key: string]: unknown;
};

export function buildReserveBookingRequest(args: ReserveBookingArgs): BokunRequestOptions {
  let path = `/booking.json/guest/${encodeURIComponent(args.sessionId)}/reserve`;
  const params = new URLSearchParams();
  if (args.currency) {
    params.set("currency", args.currency);
  }
  params.set("paymentParameters", "RESERVE_FOR_EXTERNAL_PAYMENT");
  const qs = params.toString();
  if (qs) {
    path = `${path}?${qs}`;
  }

  return {
    method: "POST",
    baseUrl: args.baseUrl,
    path,
    headers: args.headers,
    body: args.body ?? {},
  };
}

export async function reserveBooking(args: ReserveBookingArgs): Promise<ReserveBookingResponse> {
  return bokunRequest<ReserveBookingResponse>(buildReserveBookingRequest(args));
}

// --- Confirm Booking ---

export type ConfirmBookingArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  confirmationCode: string;
  body?: Record<string, unknown>;
  currency?: string;
  lang?: string;
  sendCustomerNotification?: boolean;
};

export type ConfirmBookingResponse = {
  confirmationCode?: string;
  bookingId?: string | number;
  id?: string | number;
  status?: string;
  bookingUrl?: string;
  [key: string]: unknown;
};

export function buildConfirmBookingRequest(args: ConfirmBookingArgs): BokunRequestOptions {
  let path = `/booking.json/${encodeURIComponent(args.confirmationCode)}/confirm`;
  const params = new URLSearchParams();
  if (args.currency) {
    params.set("currency", args.currency);
  }
  if (args.lang) {
    params.set("lang", args.lang);
  }
  if (args.sendCustomerNotification !== undefined) {
    params.set("sendCustomerNotification", String(args.sendCustomerNotification));
  }
  const qs = params.toString();
  if (qs) {
    path = `${path}?${qs}`;
  }

  return {
    method: "POST",
    baseUrl: args.baseUrl,
    path,
    headers: args.headers,
    body: args.body ?? {},
  };
}

export async function confirmBooking(args: ConfirmBookingArgs): Promise<ConfirmBookingResponse> {
  return bokunRequest<ConfirmBookingResponse>(buildConfirmBookingRequest(args));
}

// --- Abort Reserved Booking ---

export type AbortReservedBookingArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  confirmationCode: string;
};

export async function abortReservedBooking(args: AbortReservedBookingArgs): Promise<unknown> {
  return bokunRequest({
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/booking.json/${encodeURIComponent(args.confirmationCode)}/abort-reserved`,
    headers: args.headers,
  });
}

// --- Get Booking ---

export type GetBookingArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  confirmationCode: string;
};

export type GetBookingResponse = {
  confirmationCode?: string;
  bookingId?: string | number;
  id?: string | number;
  status?: string;
  bookingUrl?: string;
  [key: string]: unknown;
};

export async function getBooking(args: GetBookingArgs): Promise<GetBookingResponse> {
  return bokunRequest<GetBookingResponse>({
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/booking.json/booking/${encodeURIComponent(args.confirmationCode)}`,
    headers: args.headers,
  });
}

// --- Cancel Booking ---

export type CancelBookingArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  confirmationCode: string;
  note?: string;
};

export type CancelBookingResponse = {
  status?: string;
  [key: string]: unknown;
};

export async function cancelBooking(args: CancelBookingArgs): Promise<CancelBookingResponse> {
  return bokunRequest<CancelBookingResponse>({
    method: "POST",
    baseUrl: args.baseUrl,
    path: `/booking.json/cancel-booking/${encodeURIComponent(args.confirmationCode)}`,
    headers: args.headers,
    body: args.note ? { note: args.note } : {},
  });
}
