import type OpenAI from "openai";
import {
    checkAvailabilityForTenant,
    checkBookingDetailsForTenant,
    listServicesForTenant,
} from "../providers/service.ts";
import { handleStartHandoff } from "../whatsapp/handlers/handoff.ts";
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
                    args.toolArguments as { activityId: string; date: string }
                );
                break;

            case "check_booking_details":
                result = await executeCheckBookingDetails(
                    args.tenantId,
                    args.toolArguments as { confirmationCode: string }
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

    const summary = activities.map((activity) => ({
        id: activity.id ?? activity.activityId,
        title: activity.title ?? activity.name ?? activity.activityName,
        description: typeof activity.excerpt === "string"
            ? activity.excerpt.slice(0, 200)
            : typeof activity.description === "string"
              ? activity.description.slice(0, 200)
            : undefined,
        durationText: activity.durationText,
    }));

    return JSON.stringify({ activities: summary });
}

async function executeCheckAvailability(
    tenantId: string,
    params: { activityId: string; date: string }
): Promise<string> {
    const result = await checkAvailabilityForTenant({
        tenantId,
        activityId: params.activityId,
        date: params.date,
    });

    if (!Array.isArray(result) || result.length === 0) {
        return JSON.stringify({ message: "No availability data returned." });
    }

    return JSON.stringify(result);
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
