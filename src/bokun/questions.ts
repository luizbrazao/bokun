import { bokunRequest, type BokunRequestOptions } from "./client.ts";
import { getActivityById, type BokunActivityDetailsResponse } from "./activities.ts";

export type BokunAuthHeaders = Record<string, string>;

type QuestionScope =
  | "main_contact"
  | "activity_booking"
  | "pickup"
  | "dropoff"
  | "passenger";

export type BookingQuestion = {
  id: string | number;
  question: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  required: boolean;
  options?: string[];
  scope?: QuestionScope;
  activityBookingId?: string | number;
  passengerBookingId?: string | number;
};

export type GetActivityQuestionsArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  activityId: string | number;
};

export type GetShoppingCartQuestionsArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  sessionId: string;
};

export type GetBookingQuestionsArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  bookingId: string | number;
};

export type GetActivityBookingQuestionsArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  activityBookingId: string | number;
};

export type SaveShoppingCartAnswersArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  sessionId: string;
  questions: BookingQuestion[];
  answersByQuestionId: Record<string, string>;
};

/**
 * Fetch booking questions from activity catalog metadata (mainContactFields fallback).
 */
export async function getActivityQuestions(
  args: GetActivityQuestionsArgs
): Promise<BookingQuestion[]> {
  const activity = await getActivityById({
    baseUrl: args.baseUrl,
    headers: args.headers,
    id: args.activityId,
  });

  return extractMainContactFields(activity);
}

/**
 * Fetch booking questions in shopping cart context.
 */
export async function getShoppingCartQuestions(
  args: GetShoppingCartQuestionsArgs
): Promise<BookingQuestion[]> {
  const response = await bokunRequest<unknown>({
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/question.json/shopping-cart/${encodeURIComponent(args.sessionId)}`,
    headers: args.headers,
  });

  return extractQuestionsFromQuestionPayload(response);
}

/**
 * Fetch booking questions for a booking.
 */
export async function getBookingQuestions(
  args: GetBookingQuestionsArgs
): Promise<BookingQuestion[]> {
  const response = await bokunRequest<unknown>({
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/question.json/booking/${encodeURIComponent(String(args.bookingId))}`,
    headers: args.headers,
  });

  return extractQuestionsFromQuestionPayload(response);
}

/**
 * Fetch booking questions for a specific activity-booking id.
 */
export async function getActivityBookingQuestions(
  args: GetActivityBookingQuestionsArgs
): Promise<BookingQuestion[]> {
  const response = await bokunRequest<unknown>({
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/question.json/activity-booking/${encodeURIComponent(String(args.activityBookingId))}`,
    headers: args.headers,
  });

  return extractQuestionsFromQuestionPayload(response);
}

/**
 * Persist answers in shopping-cart context before reserve/confirm.
 */
export async function saveShoppingCartAnswers(
  args: SaveShoppingCartAnswersArgs
): Promise<unknown> {
  const payload = buildShoppingCartAnswersPayload(args.questions, args.answersByQuestionId);

  return bokunRequest({
    method: "POST",
    baseUrl: args.baseUrl,
    path: `/question.json/shopping-cart/${encodeURIComponent(args.sessionId)}`,
    headers: args.headers,
    body: payload,
  });
}

export function buildGetShoppingCartQuestionsRequest(
  args: GetShoppingCartQuestionsArgs
): BokunRequestOptions {
  return {
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/question.json/shopping-cart/${encodeURIComponent(args.sessionId)}`,
    headers: args.headers,
  };
}

function extractMainContactFields(activity: BokunActivityDetailsResponse): BookingQuestion[] {
  const mainContactFields = activity.mainContactFields;

  if (!Array.isArray(mainContactFields)) {
    return [];
  }

  return mainContactFields
    .map((field, index) => {
      if (!isRecord(field)) {
        return null;
      }

      const id = field.id ?? field.name ?? `field_${index}`;
      const question =
        asString(field.question) ?? asString(field.label) ?? asString(field.name);
      const type = normalizeQuestionType(
        asString(field.type) ?? asString(field.questionType) ?? asString(field.inputType)
      );
      const required = Boolean(field.required);
      const options = normalizeQuestionOptions(field);

      if (!question || question.trim().length === 0) {
        return null;
      }

      return {
        id,
        question,
        type,
        required,
        ...(options.length > 0 ? { options } : {}),
        scope: "main_contact" as const,
      };
    })
    .filter((q): q is BookingQuestion => q !== null);
}

function extractQuestionsFromQuestionPayload(payload: unknown): BookingQuestion[] {
  if (!isRecord(payload)) {
    return [];
  }

  const out: BookingQuestion[] = [];

  const mainContact = extractQuestionGroup(
    payload.mainContactDetails,
    "main_contact",
    undefined,
    undefined,
    ""
  );
  out.push(...mainContact);

  const activityBookings = Array.isArray(payload.activityBookings)
    ? payload.activityBookings
    : [];

  for (const activityBooking of activityBookings) {
    if (!isRecord(activityBooking)) {
      continue;
    }

    const activityBookingId = activityBooking.bookingId ?? activityBooking.id;

    out.push(
      ...extractQuestionGroup(
        activityBooking,
        "activity_booking",
        activityBookingId,
        undefined,
        ""
      )
    );

    out.push(
      ...extractQuestionGroup(
        activityBooking.pickupDetails,
        "pickup",
        activityBookingId,
        undefined,
        "Pickup"
      )
    );

    out.push(
      ...extractQuestionGroup(
        activityBooking.dropoffDetails,
        "dropoff",
        activityBookingId,
        undefined,
        "Dropoff"
      )
    );

    const passengers = Array.isArray(activityBooking.passengers)
      ? activityBooking.passengers
      : [];

    for (const passenger of passengers) {
      if (!isRecord(passenger)) {
        continue;
      }

      const passengerBookingId = passenger.bookingId ?? passenger.id;
      out.push(
        ...extractQuestionGroup(
          passenger,
          "passenger",
          activityBookingId,
          passengerBookingId,
          "Passenger"
        )
      );
    }
  }

  return dedupeQuestions(out);
}

function extractQuestionGroup(
  node: unknown,
  scope: QuestionScope,
  activityBookingId: string | number | undefined,
  passengerBookingId: string | number | undefined,
  labelPrefix: string
): BookingQuestion[] {
  if (!isRecord(node)) {
    return [];
  }

  const candidates = [
    node.questions,
    node.additionalQuestions,
    node.questionItems,
  ];

  const questionsRaw = candidates.find((entry) => Array.isArray(entry));
  if (!Array.isArray(questionsRaw)) {
    return [];
  }

  return questionsRaw
    .map((rawQuestion, index) => {
      if (!isRecord(rawQuestion)) {
        return null;
      }

      const id =
        rawQuestion.questionId ?? rawQuestion.id ?? rawQuestion.code ?? `question_${scope}_${index}`;
      const baseQuestion =
        asString(rawQuestion.question) ??
        asString(rawQuestion.label) ??
        asString(rawQuestion.title) ??
        asString(rawQuestion.name);

      if (!baseQuestion || baseQuestion.trim().length === 0) {
        return null;
      }

      const type = normalizeQuestionType(
        asString(rawQuestion.type) ??
          asString(rawQuestion.questionType) ??
          asString(rawQuestion.inputType)
      );
      const required = Boolean(rawQuestion.required);
      const options = normalizeQuestionOptions(rawQuestion);

      const question =
        labelPrefix.trim().length > 0 ? `[${labelPrefix}] ${baseQuestion}` : baseQuestion;

      return {
        id,
        question,
        type,
        required,
        ...(options.length > 0 ? { options } : {}),
        scope,
        ...(activityBookingId !== undefined ? { activityBookingId } : {}),
        ...(passengerBookingId !== undefined ? { passengerBookingId } : {}),
      };
    })
    .filter((q): q is BookingQuestion => q !== null);
}

function dedupeQuestions(questions: BookingQuestion[]): BookingQuestion[] {
  const seen = new Set<string>();
  const out: BookingQuestion[] = [];

  for (const question of questions) {
    const key = [
      String(question.id),
      question.scope ?? "",
      question.activityBookingId === undefined ? "" : String(question.activityBookingId),
      question.passengerBookingId === undefined ? "" : String(question.passengerBookingId),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(question);
  }

  return out;
}

function buildShoppingCartAnswersPayload(
  questions: BookingQuestion[],
  answersByQuestionId: Record<string, string>
): Record<string, unknown> {
  const mainContactDetails: Record<string, unknown> = {
    questions: [] as Array<Record<string, unknown>>,
  };
  const activityBookingsById = new Map<
    string,
    {
      bookingId: string | number;
      questions: Array<Record<string, unknown>>;
      pickupDetails: { questions: Array<Record<string, unknown>> };
      dropoffDetails: { questions: Array<Record<string, unknown>> };
      passengersById: Map<string, { bookingId: string | number; questions: Array<Record<string, unknown>> }>;
    }
  >();

  for (const question of questions) {
    const answer = answersByQuestionId[String(question.id)];
    if (answer === undefined) {
      continue;
    }

    const questionAnswer = {
      questionId: question.id,
      answers: [answer],
    };

    if (!question.scope || question.scope === "main_contact") {
      (mainContactDetails.questions as Array<Record<string, unknown>>).push(questionAnswer);
      continue;
    }

    const activityBookingId = question.activityBookingId;
    if (activityBookingId === undefined) {
      (mainContactDetails.questions as Array<Record<string, unknown>>).push(questionAnswer);
      continue;
    }

    const activityBookingKey = String(activityBookingId);
    let booking = activityBookingsById.get(activityBookingKey);
    if (!booking) {
      booking = {
        bookingId: activityBookingId,
        questions: [],
        pickupDetails: { questions: [] },
        dropoffDetails: { questions: [] },
        passengersById: new Map(),
      };
      activityBookingsById.set(activityBookingKey, booking);
    }

    if (question.scope === "activity_booking") {
      booking.questions.push(questionAnswer);
      continue;
    }

    if (question.scope === "pickup") {
      booking.pickupDetails.questions.push(questionAnswer);
      continue;
    }

    if (question.scope === "dropoff") {
      booking.dropoffDetails.questions.push(questionAnswer);
      continue;
    }

    const passengerBookingId = question.passengerBookingId;
    if (passengerBookingId === undefined) {
      booking.questions.push(questionAnswer);
      continue;
    }

    const passengerKey = String(passengerBookingId);
    let passenger = booking.passengersById.get(passengerKey);
    if (!passenger) {
      passenger = {
        bookingId: passengerBookingId,
        questions: [],
      };
      booking.passengersById.set(passengerKey, passenger);
    }
    passenger.questions.push(questionAnswer);
  }

  const activityBookings = Array.from(activityBookingsById.values()).map((entry) => ({
    bookingId: entry.bookingId,
    questions: entry.questions,
    pickupDetails: entry.pickupDetails,
    dropoffDetails: entry.dropoffDetails,
    passengers: Array.from(entry.passengersById.values()),
  }));

  return {
    mainContactDetails,
    activityBookings,
  };
}

function normalizeQuestionOptions(field: Record<string, unknown>): string[] {
  const values = [
    field.options,
    field.answers,
    field.values,
    field.choices,
  ];

  for (const candidate of values) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const options = candidate
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (isRecord(entry)) {
          return (
            asString(entry.label) ??
            asString(entry.value) ??
            asString(entry.title) ??
            asString(entry.name)
          );
        }
        return undefined;
      })
      .filter((item): item is string => Boolean(item && item.trim().length > 0));

    if (options.length > 0) {
      return options;
    }
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeQuestionType(type: string | undefined): BookingQuestion["type"] {
  const normalized = (type ?? "").toUpperCase();

  switch (normalized) {
    case "NUMBER":
    case "INTEGER":
    case "NUMERIC":
      return "NUMBER";
    case "DATE":
    case "DATETIME":
      return "DATE";
    case "BOOLEAN":
    case "BOOL":
    case "CHECKBOX":
      return "BOOLEAN";
    case "SELECT":
    case "DROPDOWN":
    case "CHOICE":
    case "RADIO":
      return "SELECT";
    default:
      return "TEXT";
  }
}
