import type { Id } from "../../../convex/_generated/dataModel.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type AskBookingQuestionsArgs = {
    tenantId: Id<"tenants">;
    waUserId: string;
    bookingDraftId: Id<"booking_drafts">;
    bookingQuestions?: string; // JSON-stringified BookingQuestion[]
    language?: SupportedLanguage;
};

export type AskBookingQuestionsResult = {
    handled: boolean;
    text: string;
};

type BookingQuestion = {
    id: string | number;
    question: string;
    type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
    required: boolean;
    options?: string[];
};

/**
 * Present booking questions to the user.
 * If no questions, skip to confirm step.
 */
export async function askBookingQuestions(
    args: AskBookingQuestionsArgs
): Promise<AskBookingQuestionsResult> {
    if (!args.bookingQuestions || args.bookingQuestions.trim().length === 0) {
        // No questions configured, skip to confirm
        return {
            handled: true,
            text: "", // Will be handled by orchestrator setting nextStep to confirm
        };
    }

    let questions: BookingQuestion[];
    try {
        questions = JSON.parse(args.bookingQuestions);
    } catch {
        // Invalid JSON, skip questions
        return {
            handled: true,
            text: "",
        };
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        return {
            handled: true,
            text: "",
        };
    }

    // Present first question
    const firstQuestion = questions[0];
    const questionText = formatQuestion(firstQuestion, 1, questions.length, args.language);

    return {
        handled: true,
        text: questionText,
    };
}

function formatQuestion(
    question: BookingQuestion,
    index: number,
    total: number,
    language?: SupportedLanguage
): string {
    let text = `${byLanguage(language, {
        pt: "📋 Pergunta",
        en: "📋 Question",
        es: "📋 Pregunta",
    })} ${index}/${total}\n\n${question.question}`;

    if (question.type === "SELECT" && question.options && question.options.length > 0) {
        text += byLanguage(language, {
            pt: "\n\nOpções:",
            en: "\n\nOptions:",
            es: "\n\nOpciones:",
        });
        question.options.forEach((option, i) => {
            text += `\n${i + 1}. ${option}`;
        });
    }

    if (!question.required) {
        text += byLanguage(language, {
            pt: "\n\n(Opcional - envie 'pular' para avançar)",
            en: "\n\n(Optional - send 'skip' to continue)",
            es: "\n\n(Opcional - envía 'saltar' para continuar)",
        });
    }

    return text;
}
