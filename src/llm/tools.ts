import type OpenAI from "openai";
import {
    checkAvailabilityForTenant,
    checkBookingDetailsForTenant,
    listServicesForTenant,
} from "../providers/service.ts";
import { handleStartHandoff } from "../whatsapp/handlers/handoff.ts";
import { handleCancelBooking } from "../whatsapp/handlers/cancelBooking.ts";
import { rootLogger } from "../lib/logger.ts";

// ── Tool definitions for OpenAI function calling ──

export const toolDefinitions: OpenAI.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "search_activities",
            description:
                "Search for available activities/experiences offered by this vendor. Use when the user asks what activities or services are available.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "check_availability",
            description:
                "Check availability and pricing for a specific activity on a given date. Use when the user asks about availability, times, or prices for a specific date.",
            parameters: {
                type: "object",
                properties: {
                    activityId: {
                        type: "string",
                        description: "The ID of the activity to check availability for.",
                    },
                    date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format.",
                    },
                    participants: {
                        type: "integer",
                        description: "Number of participants for exact pricing.",
                        minimum: 1,
                    },
                    currency: {
                        type: "string",
                        description: "Currency code (e.g. EUR, USD).",
                    },
                },
                required: ["activityId", "date"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "check_booking_details",
            description:
                "Look up details of an existing booking by its confirmation code. Use when the user asks about the status of their reservation.",
            parameters: {
                type: "object",
                properties: {
                    confirmationCode: {
                        type: "string",
                        description: "The booking confirmation code.",
                    },
                },
                required: ["confirmationCode"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "cancel_booking",
            description:
                "Cancel an existing booking. Use when the user explicitly asks to cancel a reservation. Prefer passing confirmationCode when available.",
            parameters: {
                type: "object",
                properties: {
                    confirmationCode: {
                        type: "string",
                        description: "Booking confirmation code to cancel.",
                    },
                    reason: {
                        type: "string",
                        description: "Optional cancellation reason/note.",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "escalate_to_operator",
            description:
                "Transfer the conversation to a human operator. Use when you cannot resolve the user's issue, when they have a complaint, a technical problem, or when the situation is outside your capabilities.",
            parameters: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "Brief description of why escalation is needed.",
                    },
                },
                required: ["reason"],
            },
        },
    },
];

// ── Tool executors ──

export type ToolExecutorArgs = {
    tenantId: string;
    waUserId: string;
    channel: "wa" | "tg";
    toolName: string;
    toolArguments: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractActivities(raw: unknown): JsonRecord[] {
    if (Array.isArray(raw)) {
        return raw.filter(isRecord);
    }

    if (!isRecord(raw)) {
        return [];
    }

    const nestedData = isRecord(raw.data) ? raw.data : undefined;
    const candidates = [
        raw.items,
        raw.activities,
        raw.results,
        nestedData?.items,
        nestedData?.activities,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate.filter(isRecord);
        }
    }

    return [];
}

function toNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function executeTool(args: ToolExecutorArgs): Promise<string> {
    rootLogger.info({ handler: "llm_tools", tenantId: args.tenantId, waUserId: args.waUserId, toolName: args.toolName }, "llm_tool_executing");
    try {
        let result: string;
        switch (args.toolName) {
            case "search_activities":
                result = await executeSearchActivities(args.tenantId);
                break;

            case "check_availability":
                result = await executeCheckAvailability(
                    args.tenantId,
                    args.toolArguments as {
                        activityId: string;
                        date: string;
                        participants?: number;
                        currency?: string;
                    }
                );
                break;

            case "check_booking_details":
                result = await executeCheckBookingDetails(
                    args.tenantId,
                    args.toolArguments as { confirmationCode: string }
                );
                break;

            case "cancel_booking":
                result = await executeCancelBooking(
                    args.tenantId,
                    args.waUserId,
                    args.toolArguments as { confirmationCode?: string; reason?: string }
                );
                break;

            case "escalate_to_operator":
                result = await executeEscalateToOperator(
                    args.tenantId,
                    args.waUserId,
                    args.channel,
                    args.toolArguments as { reason: string }
                );
                break;

            default:
                result = JSON.stringify({ error: `Unknown tool: ${args.toolName}` });
        }
        rootLogger.info({ handler: "llm_tools", tenantId: args.tenantId, toolName: args.toolName, resultPreview: result.slice(0, 300) }, "llm_tool_result");
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        rootLogger.error({ handler: "llm_tools", tenantId: args.tenantId, toolName: args.toolName, err: message }, "llm_tool_error");
        return JSON.stringify({ error: `Tool execution failed: ${message}` });
    }
}

async function executeSearchActivities(tenantId: string): Promise<string> {
    const result = await listServicesForTenant({
        tenantId,
    });

    const activities = extractActivities(result);
    if (activities.length === 0) {
        return JSON.stringify({ message: "No activities found for this vendor." });
    }

    const summary = activities.slice(0, 12).map((activity) => ({
        id: activity.id ?? activity.activityId,
        title: activity.title ?? activity.name ?? activity.activityName,
        durationText: activity.durationText,
    }));

    return JSON.stringify({
        activities: summary,
        totalFound: activities.length,
        returned: summary.length,
    });
}

async function executeCheckAvailability(
    tenantId: string,
    params: { activityId: string; date: string; participants?: number; currency?: string }
): Promise<string> {
    const participants = Number.isInteger(params.participants) && (params.participants as number) > 0
        ? (params.participants as number)
        : null;

    const result = await checkAvailabilityForTenant({
        tenantId,
        activityId: params.activityId,
        date: params.date,
        currency: typeof params.currency === "string" && params.currency.trim().length > 0
            ? params.currency.trim().toUpperCase()
            : undefined,
    });

    if (!Array.isArray(result) || result.length === 0) {
        return JSON.stringify({ message: "No availability data returned." });
    }

    const condensed = result.slice(0, 12).map((slot) => {
        const rec = isRecord(slot) ? slot : {};
        const firstRate = Array.isArray(rec.rates) && rec.rates.length > 0 && isRecord(rec.rates[0])
            ? rec.rates[0]
            : {};

        let minPrice: number | null = null;
        let minPriceCurrency: string | null = null;
        let selectedPriceAmount: number | null = null;
        let selectedPriceCurrency: string | null = null;
        const pricesByRate = Array.isArray(rec.pricesByRate) ? rec.pricesByRate : [];
        const defaultRateId = toNumber(rec.defaultRateId);
        for (const priceGroup of pricesByRate) {
            if (!isRecord(priceGroup)) continue;
            const rateId = toNumber(priceGroup.activityRateId);
            const perCategory = Array.isArray(priceGroup.pricePerCategoryUnit) ? priceGroup.pricePerCategoryUnit : [];
            for (const item of perCategory) {
                if (!isRecord(item) || !isRecord(item.amount)) continue;
                const amount = toNumber(item.amount.amount);
                const currency = typeof item.amount.currency === "string" ? item.amount.currency : null;
                if (amount === null) continue;
                if (minPrice === null || amount < minPrice) {
                    minPrice = amount;
                    minPriceCurrency = currency;
                }

                if (participants !== null) {
                    const minPax = toNumber(item.minParticipantsRequired);
                    const maxPax = toNumber(item.maxParticipantsRequired);
                    const matchesParticipants =
                        minPax !== null &&
                        maxPax !== null &&
                        participants >= minPax &&
                        participants <= maxPax;

                    if (matchesParticipants) {
                        const isPreferredRate = defaultRateId !== null && rateId !== null && defaultRateId === rateId;
                        if (selectedPriceAmount === null || isPreferredRate) {
                            selectedPriceAmount = amount;
                            selectedPriceCurrency = currency;
                            if (isPreferredRate) {
                                // Stop searching once we found the participant-matching price for default rate.
                                break;
                            }
                        }
                    }
                }
            }
            if (participants !== null && selectedPriceAmount !== null && selectedPriceCurrency !== null && defaultRateId !== null && rateId === defaultRateId) {
                break;
            }
        }

        return {
            startTime: rec.startTime,
            startTimeLabel: rec.startTimeLabel,
            availabilityCount: rec.availabilityCount,
            soldOut: rec.soldOut,
            rateTitle: firstRate.title,
            participants,
            selectedPriceAmount,
            selectedPriceCurrency,
            fromPriceAmount: minPrice,
            fromPriceCurrency: minPriceCurrency,
        };
    });

    return JSON.stringify({
        activityId: params.activityId,
        date: params.date,
        participants,
        requestedCurrency: params.currency ?? null,
        availabilities: condensed,
        totalFound: result.length,
        returned: condensed.length,
    });
}

async function executeCheckBookingDetails(
    tenantId: string,
    params: { confirmationCode: string }
): Promise<string> {
    const result = await checkBookingDetailsForTenant({
        tenantId,
        confirmationCode: params.confirmationCode,
    });

    if (!result) {
        return JSON.stringify({ message: "Booking not found." });
    }

    return JSON.stringify(result);
}

async function executeCancelBooking(
    tenantId: string,
    waUserId: string,
    params: { confirmationCode?: string; reason?: string }
): Promise<string> {
    const inputText = [params.reason, params.confirmationCode].filter((part) => typeof part === "string" && part.trim().length > 0).join(" ");
    const result = await handleCancelBooking({
        tenantId,
        waUserId,
        text: inputText.length > 0 ? inputText : "cancelar",
    });

    return JSON.stringify({
        handled: result.handled,
        message: result.text,
    });
}

async function executeEscalateToOperator(
    tenantId: string,
    waUserId: string,
    channel: "wa" | "tg",
    params: { reason: string }
): Promise<string> {
    const result = await handleStartHandoff({
        tenantId,
        waUserId,
        text: params.reason,
        channel,
    });

    return JSON.stringify({
        escalated: result.handled,
        message: result.text,
    });
}
