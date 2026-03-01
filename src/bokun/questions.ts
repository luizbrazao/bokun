import { bokunRequest, type BokunRequestOptions } from "./client.ts";
import { getActivityById, type BokunActivityDetailsResponse } from "./activities.ts";

export type BokunAuthHeaders = Record<string, string>;

export type BookingQuestion = {
    id: string | number;
    question: string;
    type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
    required: boolean;
    options?: string[];
};

export type GetActivityQuestionsArgs = {
    baseUrl: string;
    headers?: BokunAuthHeaders;
    activityId: string | number;
};

/**
 * Fetch booking questions (mainContactFields) from an activity.
 * Returns normalized BookingQuestion[] format.
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
 * Extract and normalize mainContactFields from activity response.
 */
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
            const question = asString(field.question) ?? asString(field.label) ?? asString(field.name);
            const type = normalizeQuestionType(asString(field.type));
            const required = Boolean(field.required);
            const options = Array.isArray(field.options)
                ? field.options.map((opt) => String(opt)).filter((s) => s.trim().length > 0)
                : undefined;

            if (!question || question.trim().length === 0) {
                return null;
            }

            return {
                id,
                question,
                type,
                required,
                ...(options && options.length > 0 ? { options } : {}),
            };
        })
        .filter((q): q is BookingQuestion => q !== null);
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
            return "SELECT";
        default:
            return "TEXT";
    }
}
