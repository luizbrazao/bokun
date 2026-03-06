import { getConvexClient } from "../../convex/client.ts";
import type { Id } from "../../../convex/_generated/dataModel.ts";
import { handleAfterAskParticipants } from "./afterAskParticipants.ts";
import { handleAfterConfirm } from "./afterConfirm.ts";
import { handleListTimes } from "./listTimes.ts";
import { handleAfterSelectPickup } from "./afterSelectPickup.ts";
import { handleAfterSelectTime } from "./afterSelectTime.ts";
import { isCancelIntent, handleCancelBooking } from "./cancelBooking.ts";
import { isEditIntent, handleEditBooking } from "./editBooking.ts";
import type { SupportedLanguage } from "../../i18n.ts";

export type OrchestrateBookingArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type OrchestrateBookingResult = {
  text: string;
  handled: boolean;
};

type BookingNextStep =
  | "select_time"
  | "select_pickup"
  | "ask_participants"
  | "ask_booking_questions"
  | "collect_booking_answers"
  | "confirm";

type BookingDraftState = {
  _id: Id<"booking_drafts">;
  nextStep?: BookingNextStep;
  bookingQuestions?: string;
  bookingAnswers?: string;
} | null;

type ConversationState = {
  lastActivityId?: string;
} | null;

function isValidYmdDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return false;
  }

  const [year, month, day] = ymd.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function parseDateFromText(text: string): string | null {
  const normalized = text.trim();
  const ymdMatch = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (ymdMatch) {
    return isValidYmdDate(ymdMatch[1]) ? ymdMatch[1] : null;
  }

  const slashMatch = normalized.match(/\b(\d{2})\/(\d{2})(?:\/(\d{4}))?\b/);
  if (!slashMatch) {
    return null;
  }

  const day = Number.parseInt(slashMatch[1], 10);
  const month = Number.parseInt(slashMatch[2], 10);
  const year = slashMatch[3] ? Number.parseInt(slashMatch[3], 10) : new Date().getFullYear();

  const ymd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidYmdDate(ymd) ? ymd : null;
}

export async function orchestrateBooking(args: OrchestrateBookingArgs): Promise<OrchestrateBookingResult> {
  // Check for cancel intent before anything else
  if (isCancelIntent(args.text)) {
    const cancelResult = await handleCancelBooking(args);
    return { handled: cancelResult.handled, text: cancelResult.text };
  }

  // Check for edit intent (cancel + rebook)
  if (isEditIntent(args.text)) {
    const editResult = await handleEditBooking(args);
    return { handled: editResult.handled, text: editResult.text };
  }

  const convex = getConvexClient();
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as BookingDraftState;

  if (!draft?.nextStep) {
    const requestedDate = parseDateFromText(args.text);
    if (!requestedDate) {
      return {
        handled: false,
        text: "",
      };
    }

    const conversation = (await convex.query(
      "conversations:getConversationByWaUserId" as any,
      {
        tenantId: args.tenantId,
        waUserId: args.waUserId,
      } as any
    )) as ConversationState;

    const activityId = conversation?.lastActivityId;
    if (!activityId || activityId.trim().length === 0) {
      return {
        handled: false,
        text: "",
      };
    }

    try {
      const listTimes = await handleListTimes({
        tenantId: args.tenantId,
        waUserId: args.waUserId,
        activityId,
        date: requestedDate,
        language: args.language,
      });

      return {
        handled: true,
        text: listTimes.text,
      };
    } catch {
      return {
        handled: false,
        text: "",
      };
    }
  }

  if (draft.nextStep === "select_time") {
    const result = await handleAfterSelectTime({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      language: args.language,
    });

    return {
      handled: true,
      text: result.text,
    };
  }

  if (draft.nextStep === "select_pickup") {
    const result = await handleAfterSelectPickup({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      language: args.language,
    });

    return {
      handled: true,
      text: result.text,
    };
  }

  if (draft.nextStep === "ask_participants") {
    const result = await handleAfterAskParticipants({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      language: args.language,
    });

    return {
      handled: true,
      text: result.text,
    };
  }

  if (draft.nextStep === "ask_booking_questions") {
    const { askBookingQuestions } = await import("./askBookingQuestions.ts");
    const result = await askBookingQuestions({
      tenantId: args.tenantId as Id<"tenants">,
      waUserId: args.waUserId,
      bookingDraftId: draft._id,
      bookingQuestions: draft.bookingQuestions,
      language: args.language,
    });

    // If no questions, orchestrator will re-run with nextStep: confirm
    if (result.text.trim().length === 0) {
      // Re-fetch draft to get updated nextStep
      const updatedDraft = (await convex.query(
        "bookingDrafts:getBookingDraftByWaUserId" as any,
        {
          tenantId: args.tenantId,
          waUserId: args.waUserId,
        } as any
      )) as BookingDraftState;

      if (updatedDraft?.nextStep === "confirm") {
        const confirmResult = await handleAfterConfirm({
          tenantId: args.tenantId,
          waUserId: args.waUserId,
          text: "sim", // Auto-confirm after questions
        });

        return {
          handled: true,
          text: confirmResult.text,
        };
      }
    }

    // Set nextStep to collect_booking_answers
    await convex.mutation(
      "bookingDrafts:setNextStep" as any,
      {
        bookingDraftId: draft._id,
        nextStep: "collect_booking_answers",
      } as any
    );

    return {
      handled: true,
      text: result.text,
    };
  }

  if (draft.nextStep === "collect_booking_answers") {
    const { collectBookingAnswers } = await import("./collectBookingAnswers.ts");
    const result = await collectBookingAnswers({
      tenantId: args.tenantId as Id<"tenants">,
      waUserId: args.waUserId,
      bookingDraftId: draft._id,
      text: args.text,
      bookingQuestions: draft.bookingQuestions,
      bookingAnswers: draft.bookingAnswers,
      language: args.language,
    });

    return {
      handled: true,
      text: result.text,
    };
  }

  if (draft.nextStep === "confirm") {
    const result = await handleAfterConfirm({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      language: args.language,
    });

    return {
      handled: true,
      text: result.text,
    };
  }

  return {
    handled: false,
    text: "",
  };
}
