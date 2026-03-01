import { getConvexClient } from "../../convex/client.ts";
import type { Id } from "../../../convex/_generated/dataModel.ts";

export type CollectBookingAnswersArgs = {
    tenantId: Id<"tenants">;
    waUserId: string;
    bookingDraftId: Id<"booking_drafts">;
    text: string;
    bookingQuestions?: string; // JSON-stringified BookingQuestion[]
    bookingAnswers?: string;   // JSON-stringified { [questionId]: answer }
};

export type CollectBookingAnswersResult = {
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
 * Collect answers to booking questions.
 * Validates input, stores answer, and presents next question or advances to confirm.
 */
export async function collectBookingAnswers(
    args: CollectBookingAnswersArgs
): Promise<CollectBookingAnswersResult> {
    if (!args.bookingQuestions || args.bookingQuestions.trim().length === 0) {
        return {
            handled: true,
            text: "Nenhuma pergunta configurada. Avançando para confirmação.",
        };
    }

    let questions: BookingQuestion[];
    try {
        questions = JSON.parse(args.bookingQuestions);
    } catch {
        return {
            handled: true,
            text: "Erro ao processar perguntas. Avançando para confirmação.",
        };
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        return {
            handled: true,
            text: "Nenhuma pergunta configurada. Avançando para confirmação.",
        };
    }

    // Parse existing answers
    let answers: Record<string, string> = {};
    if (args.bookingAnswers && args.bookingAnswers.trim().length > 0) {
        try {
            answers = JSON.parse(args.bookingAnswers);
        } catch {
            answers = {};
        }
    }

    // Find next unanswered question
    const unansweredIndex = questions.findIndex((q) => !(String(q.id) in answers));
    if (unansweredIndex === -1) {
        // All questions answered
        const convex = getConvexClient();
        await convex.mutation("bookingDrafts:setBookingAnswers" as any, {
            bookingDraftId: args.bookingDraftId,
            answers: JSON.stringify(answers),
        } as any);

        return {
            handled: true,
            text: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
        };
    }

    const currentQuestion = questions[unansweredIndex];
    const userInput = args.text.trim();

    // Check for skip
    if (!currentQuestion.required && /^(pular|skip|próxima|next)$/i.test(userInput)) {
        answers[String(currentQuestion.id)] = "";

        // Check if more questions remain
        const nextUnansweredIndex = questions.findIndex(
            (q, i) => i > unansweredIndex && !(String(q.id) in answers)
        );

        if (nextUnansweredIndex === -1) {
            // No more questions
            const convex = getConvexClient();
            await convex.mutation("bookingDrafts:setBookingAnswers" as any, {
                bookingDraftId: args.bookingDraftId,
                answers: JSON.stringify(answers),
            } as any);

            return {
                handled: true,
                text: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
            };
        }

        // Present next question
        const nextQuestion = questions[nextUnansweredIndex];
        return {
            handled: true,
            text: formatQuestion(nextQuestion, nextUnansweredIndex + 1, questions.length),
        };
    }

    // Validate answer
    const validation = validateAnswer(userInput, currentQuestion);
    if (!validation.valid) {
        return {
            handled: true,
            text: `❌ ${validation.error}\n\n${formatQuestion(currentQuestion, unansweredIndex + 1, questions.length)}`,
        };
    }

    // Store answer
    answers[String(currentQuestion.id)] = validation.value!;

    // Check if more questions remain
    const nextUnansweredIndex = questions.findIndex(
        (q, i) => i > unansweredIndex && !(String(q.id) in answers)
    );

    if (nextUnansweredIndex === -1) {
        // No more questions
        const convex = getConvexClient();
        await convex.mutation("bookingDrafts:setBookingAnswers" as any, {
            bookingDraftId: args.bookingDraftId,
            answers: JSON.stringify(answers),
        } as any);

        return {
            handled: true,
            text: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
        };
    }

    // Present next question
    const nextQuestion = questions[nextUnansweredIndex];
    return {
        handled: true,
        text: formatQuestion(nextQuestion, nextUnansweredIndex + 1, questions.length),
    };
}

function validateAnswer(
    input: string,
    question: BookingQuestion
): { valid: boolean; value?: string; error?: string } {
    if (input.length === 0) {
        if (question.required) {
            return { valid: false, error: "Esta pergunta é obrigatória." };
        }
        return { valid: true, value: "" };
    }

    switch (question.type) {
        case "NUMBER":
            const num = Number(input);
            if (isNaN(num) || !isFinite(num)) {
                return { valid: false, error: "Por favor, envie um número válido." };
            }
            return { valid: true, value: String(num) };

        case "BOOLEAN":
            const normalized = input.toLowerCase();
            if (/^(sim|yes|s|y|true|1)$/.test(normalized)) {
                return { valid: true, value: "true" };
            }
            if (/^(não|nao|no|n|false|0)$/.test(normalized)) {
                return { valid: true, value: "false" };
            }
            return { valid: false, error: "Por favor, responda com 'sim' ou 'não'." };

        case "SELECT":
            if (!question.options || question.options.length === 0) {
                return { valid: true, value: input };
            }

            // Check if input is a number (option index)
            const optionIndex = Number(input);
            if (!isNaN(optionIndex) && Number.isInteger(optionIndex)) {
                const option = question.options[optionIndex - 1];
                if (option) {
                    return { valid: true, value: option };
                }
            }

            // Check if input matches an option
            const matchedOption = question.options.find(
                (opt) => opt.toLowerCase() === input.toLowerCase()
            );
            if (matchedOption) {
                return { valid: true, value: matchedOption };
            }

            return {
                valid: false,
                error: `Por favor, escolha uma das opções (1-${question.options.length}).`,
            };

        case "DATE":
            // Basic date validation (YYYY-MM-DD or DD/MM/YYYY)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(input) && !/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
                return {
                    valid: false,
                    error: "Por favor, envie uma data válida (DD/MM/AAAA ou AAAA-MM-DD).",
                };
            }
            return { valid: true, value: input };

        case "TEXT":
        default:
            return { valid: true, value: input };
    }
}

function formatQuestion(question: BookingQuestion, index: number, total: number): string {
    let text = `📋 Pergunta ${index}/${total}\n\n${question.question}`;

    if (question.type === "SELECT" && question.options && question.options.length > 0) {
        text += "\n\nOpções:";
        question.options.forEach((option, i) => {
            text += `\n${i + 1}. ${option}`;
        });
    }

    if (!question.required) {
        text += "\n\n(Opcional - envie 'pular' para avançar)";
    }

    return text;
}
