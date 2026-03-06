import { getActivityById, searchActivities } from "./activities.ts";
import { getAvailabilities } from "./availabilities.ts";
import {
  addActivityToCart,
  reserveBooking,
  confirmBooking,
  abortReservedBooking,
  getBooking,
  cancelBooking,
} from "./booking.ts";
import { getBokunContextOrThrow } from "./context.ts";
import { getPickupPlaces } from "./pickupPlaces.ts";
import {
  getActivityQuestions,
  getShoppingCartQuestions,
  getBookingQuestions,
  getActivityBookingQuestions,
  saveShoppingCartAnswers,
  type BookingQuestion,
} from "./questions.ts";

export type { BookingQuestion };

export async function bokunSearchActivitiesForTenant(args: {
  tenantId: string;
  body?: Record<string, unknown>;
  lang?: string;
  currency?: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return searchActivities({
    baseUrl: context.baseUrl,
    headers: context.headers,
    body: args.body,
    lang: args.lang,
    currency: args.currency,
  });
}

export async function bokunGetActivityByIdForTenant(args: {
  tenantId: string;
  id: string | number;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return getActivityById({
    baseUrl: context.baseUrl,
    headers: context.headers,
    id: args.id,
  });
}

export async function bokunGetAvailabilitiesForTenant(args: {
  tenantId: string;
  id: string | number;
  start: string;
  end: string;
  currency?: string;
  lang?: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return getAvailabilities({
    baseUrl: context.baseUrl,
    headers: context.headers,
    id: args.id,
    start: args.start,
    end: args.end,
    currency: args.currency,
    lang: args.lang,
  });
}

export async function bokunGetPickupPlacesForTenant(args: {
  tenantId: string;
  id: string | number;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return getPickupPlaces({
    baseUrl: context.baseUrl,
    headers: context.headers,
    id: args.id,
  });
}

export async function bokunAddActivityToCartForTenant(args: {
  tenantId: string;
  sessionId: string;
  body: Record<string, unknown>;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return addActivityToCart({
    baseUrl: context.baseUrl,
    headers: context.headers,
    sessionId: args.sessionId,
    body: args.body,
  });
}

export async function bokunReserveBookingForTenant(args: {
  tenantId: string;
  sessionId: string;
  body?: Record<string, unknown>;
  currency?: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return reserveBooking({
    baseUrl: context.baseUrl,
    headers: context.headers,
    sessionId: args.sessionId,
    body: args.body,
    currency: args.currency,
  });
}

export async function bokunConfirmBookingForTenant(args: {
  tenantId: string;
  confirmationCode: string;
  body?: Record<string, unknown>;
  currency?: string;
  lang?: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return confirmBooking({
    baseUrl: context.baseUrl,
    headers: context.headers,
    confirmationCode: args.confirmationCode,
    body: args.body,
    currency: args.currency,
    lang: args.lang,
  });
}

export async function bokunAbortReservedBookingForTenant(args: {
  tenantId: string;
  confirmationCode: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return abortReservedBooking({
    baseUrl: context.baseUrl,
    headers: context.headers,
    confirmationCode: args.confirmationCode,
  });
}

export async function bokunGetBookingForTenant(args: {
  tenantId: string;
  confirmationCode: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return getBooking({
    baseUrl: context.baseUrl,
    headers: context.headers,
    confirmationCode: args.confirmationCode,
  });
}

export async function bokunCancelBookingForTenant(args: {
  tenantId: string;
  confirmationCode: string;
  note?: string;
}) {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return cancelBooking({
    baseUrl: context.baseUrl,
    headers: context.headers,
    confirmationCode: args.confirmationCode,
    note: args.note,
  });
}

export async function bokunGetActivityQuestionsForTenant(args: {
  tenantId: string;
  activityId: string | number;
}): Promise<BookingQuestion[]> {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });

  return getActivityQuestions({
    baseUrl: context.baseUrl,
    headers: context.headers,
    activityId: args.activityId,
  });
}

export async function bokunGetShoppingCartQuestionsForTenant(args: {
  tenantId: string;
  sessionId: string;
}): Promise<BookingQuestion[]> {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });
  return getShoppingCartQuestions({
    baseUrl: context.baseUrl,
    headers: context.headers,
    sessionId: args.sessionId,
  });
}

export async function bokunSaveShoppingCartAnswersForTenant(args: {
  tenantId: string;
  sessionId: string;
  questions: BookingQuestion[];
  answersByQuestionId: Record<string, string>;
}): Promise<unknown> {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });
  return saveShoppingCartAnswers({
    baseUrl: context.baseUrl,
    headers: context.headers,
    sessionId: args.sessionId,
    questions: args.questions,
    answersByQuestionId: args.answersByQuestionId,
  });
}

export async function bokunGetBookingQuestionsForTenant(args: {
  tenantId: string;
  bookingId: string | number;
}): Promise<BookingQuestion[]> {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });
  return getBookingQuestions({
    baseUrl: context.baseUrl,
    headers: context.headers,
    bookingId: args.bookingId,
  });
}

export async function bokunGetActivityBookingQuestionsForTenant(args: {
  tenantId: string;
  activityBookingId: string | number;
}): Promise<BookingQuestion[]> {
  const context = await getBokunContextOrThrow({ tenantId: args.tenantId });
  return getActivityBookingQuestions({
    baseUrl: context.baseUrl,
    headers: context.headers,
    activityBookingId: args.activityBookingId,
  });
}
