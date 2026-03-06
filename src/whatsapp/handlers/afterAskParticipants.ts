import { getConvexClient } from "../../convex/client.ts";
import {
  bokunAddActivityToCartForTenant,
  bokunGetShoppingCartQuestionsForTenant,
} from "../../bokun/gateway.ts";
import { rootLogger } from "../../lib/logger.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type HandleAfterAskParticipantsArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
  language?: SupportedLanguage;
};

export type HandleAfterAskParticipantsResult = {
  text: string;
};

type BookingDraftRef = {
  _id: string;
  activityId?: string;
  selectedStartTimeId?: number;
  selectedDateKey?: string;
  selectedRateId?: number;
  pickupPlaceId?: string | number;
} | null;

function parseParticipants(text: string): number | null {
  const match = text.match(/(\d+)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export async function handleAfterAskParticipants(
  args: HandleAfterAskParticipantsArgs
): Promise<HandleAfterAskParticipantsResult> {
  const participants = parseParticipants(String(args.text ?? "").trim());
  if (participants === null) {
    return {
      text: byLanguage(args.language, {
        pt: "Digite um número de participantes (ex: 2).",
        en: "Enter the number of participants (e.g., 2).",
        es: "Escribe el número de participantes (ej.: 2).",
      }),
    };
  }

  const convex = getConvexClient();
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    } as any
  )) as BookingDraftRef;

  if (!draft?._id) {
    return {
      text: byLanguage(args.language, {
        pt: "Não encontrei uma reserva em andamento. Me diga atividade e data para continuar.",
        en: "I couldn't find an ongoing booking. Tell me the activity and date to continue.",
        es: "No encontré una reserva en curso. Dime la actividad y la fecha para continuar.",
      }),
    };
  }

  // Set participants
  await convex.mutation(
    "bookingDrafts:setParticipants" as any,
    {
      bookingDraftId: draft._id,
      participants,
    } as any
  );

  // Fetch booking questions from Bokun in shopping-cart context.
  if (draft.activityId && draft.selectedStartTimeId && draft.selectedDateKey) {
    try {
      const sessionId = crypto.randomUUID();
      await bokunAddActivityToCartForTenant({
        tenantId: args.tenantId,
        sessionId,
        body: {
          activityId: Number(draft.activityId),
          startTimeId: draft.selectedStartTimeId,
          date: draft.selectedDateKey,
          ...(typeof draft.selectedRateId === "number"
            ? {
                pricingCategoryBookings: [
                  {
                    pricingCategoryId: draft.selectedRateId,
                    participants,
                  },
                ],
              }
            : {}),
          ...(draft.pickupPlaceId !== undefined ? { pickupPlaceId: draft.pickupPlaceId } : {}),
        },
      });
      await convex.mutation(
        "bookingDrafts:setBokunSessionId" as any,
        {
          bookingDraftId: draft._id,
          bokunSessionId: sessionId,
        } as any
      );

      const questions = await bokunGetShoppingCartQuestionsForTenant({
        tenantId: args.tenantId,
        sessionId,
      });

      if (questions.length > 0) {
        // Store questions in draft
        await convex.mutation(
          "bookingDrafts:setBookingQuestions" as any,
          {
            bookingDraftId: draft._id,
            questions: JSON.stringify(questions),
          } as any
        );

        // Set nextStep to ask_booking_questions
        await convex.mutation(
          "bookingDrafts:setNextStep" as any,
          {
            bookingDraftId: draft._id,
            nextStep: "ask_booking_questions",
          } as any
        );

        // Return empty text — orchestrator will handle next step
        return { text: "" };
      }
    } catch (error) {
      // If fetching questions fails, log but continue to confirm
      rootLogger.error({ handler: "afterAskParticipants", tenantId: args.tenantId, waUserId: args.waUserId, err: error instanceof Error ? error.message : String(error) }, "Failed to fetch booking questions");
    }
  }

  // No questions or fetch failed — go straight to confirm
  return {
    text: byLanguage(args.language, {
      pt: "Perfeito. Confirma a reserva? (sim/não)",
      en: "Perfect. Do you confirm the booking? (yes/no)",
      es: "Perfecto. ¿Confirmas la reserva? (sí/no)",
    }),
  };
}
