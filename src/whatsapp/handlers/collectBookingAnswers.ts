import { getConvexClient } from "../../convex/client.ts";
import type { Id } from "../../../convex/_generated/dataModel.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

export type CollectBookingAnswersArgs = {
    tenantId: Id<"tenants">;
    waUserId: string;
    bookingDraftId: Id<"booking_drafts">;
    text: string;
    bookingQuestions?: string; // JSON-stringified BookingQuestion[]
    bookingAnswers?: string;   // JSON-stringified { [questionId]: answer }
    language?: SupportedLanguage;
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
            text: byLanguage(args.language, {
                pt: "Nenhuma pergunta configurada. Avançando para confirmação.",
                en: "No questions configured. Moving to confirmation.",
                es: "No hay preguntas configuradas. Avanzando a la confirmación.",
            }),
        };
    }

    let questions: BookingQuestion[];
    try {
        questions = JSON.parse(args.bookingQuestions);
    } catch {
        return {
            handled: true,
            text: byLanguage(args.language, {
                pt: "Erro ao processar perguntas. Avançando para confirmação.",
                en: "Error processing questions. Moving to confirmation.",
                es: "Error al procesar preguntas. Avanzando a la confirmación.",
            }),
        };
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        return {
            handled: true,
            text: byLanguage(args.language, {
                pt: "Nenhuma pergunta configurada. Avançando para confirmação.",
                en: "No questions configured. Moving to confirmation.",
                es: "No hay preguntas configuradas. Avanzando a la confirmación.",
            }),
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
            text: byLanguage(args.language, {
                pt: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
                en: "✅ Questions answered! Let's confirm your booking.",
                es: "✅ ¡Preguntas respondidas! Vamos a confirmar tu reserva.",
            }),
        };
    }

    const currentQuestion = questions[unansweredIndex];
    const userInput = args.text.trim();

    // Check for skip
    if (!currentQuestion.required && /^(pular|skip|próxima|proxima|next|saltar)$/i.test(userInput)) {
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
                text: byLanguage(args.language, {
                    pt: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
                    en: "✅ Questions answered! Let's confirm your booking.",
                    es: "✅ ¡Preguntas respondidas! Vamos a confirmar tu reserva.",
                }),
            };
        }

        // Present next question
        const nextQuestion = questions[nextUnansweredIndex];
        return {
            handled: true,
            text: formatQuestion(nextQuestion, nextUnansweredIndex + 1, questions.length, args.language),
        };
    }

    // Validate answer
    const validation = validateAnswer(userInput, currentQuestion, args.language);
    if (!validation.valid) {
        return {
            handled: true,
            text: `❌ ${validation.error}\n\n${formatQuestion(currentQuestion, unansweredIndex + 1, questions.length, args.language)}`,
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
            text: byLanguage(args.language, {
                pt: "✅ Perguntas respondidas! Vamos confirmar sua reserva.",
                en: "✅ Questions answered! Let's confirm your booking.",
                es: "✅ ¡Preguntas respondidas! Vamos a confirmar tu reserva.",
            }),
        };
    }

    // Present next question
    const nextQuestion = questions[nextUnansweredIndex];
    return {
        handled: true,
        text: formatQuestion(nextQuestion, nextUnansweredIndex + 1, questions.length, args.language),
    };
}

function validateAnswer(
    input: string,
    question: BookingQuestion,
    language?: SupportedLanguage
): { valid: boolean; value?: string; error?: string } {
    if (input.length === 0) {
        if (question.required) {
            return {
                valid: false,
                error: byLanguage(language, {
                    pt: "Esta pergunta é obrigatória.",
                    en: "This question is required.",
                    es: "Esta pregunta es obligatoria.",
                }),
            };
        }
        return { valid: true, value: "" };
    }

    switch (question.type) {
        case "NUMBER":
            const num = Number(input);
            if (isNaN(num) || !isFinite(num)) {
                return {
                    valid: false,
                    error: byLanguage(language, {
                        pt: "Por favor, envie um número válido.",
                        en: "Please send a valid number.",
                        es: "Por favor, envía un número válido.",
                    }),
                };
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
            if (/^(sí|si)$/.test(normalized)) {
                return { valid: true, value: "true" };
            }
            return {
                valid: false,
                error: byLanguage(language, {
                    pt: "Por favor, responda com 'sim' ou 'não'.",
                    en: "Please answer with 'yes' or 'no'.",
                    es: "Por favor, responde con 'sí' o 'no'.",
                }),
            };

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
                error: byLanguage(language, {
                    pt: `Por favor, escolha uma das opções (1-${question.options.length}).`,
                    en: `Please choose one of the options (1-${question.options.length}).`,
                    es: `Por favor, elige una de las opciones (1-${question.options.length}).`,
                }),
            };

        case "DATE":
            // Basic date validation (YYYY-MM-DD or DD/MM/YYYY)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(input) && !/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
                return {
                    valid: false,
                    error: byLanguage(language, {
                        pt: "Por favor, envie uma data válida (DD/MM/AAAA ou AAAA-MM-DD).",
                        en: "Please send a valid date (DD/MM/YYYY or YYYY-MM-DD).",
                        es: "Por favor, envía una fecha válida (DD/MM/AAAA o AAAA-MM-DD).",
                    }),
                };
            }
            return { valid: true, value: input };

        case "TEXT":
        default:
            return { valid: true, value: input };
    }
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
