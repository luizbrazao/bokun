import { getConvexClient } from "../convex/client.ts";
import type OpenAI from "openai";

export type ChatMessage = {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCalls?: string; // JSON-stringified tool calls
    toolCallId?: string;
};

type StoredChatMessage = ChatMessage & {
    _id: string;
    createdAt: number;
};

const MAX_HISTORY_MESSAGES = 20; // 10 turns (user + assistant)

export async function loadHistory(
    tenantId: string,
    waUserId: string
): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const convex = getConvexClient();

    const messages = (await convex.query(
        "chatMessages:getRecentMessages" as any,
        {
            tenantId,
            waUserId,
            limit: MAX_HISTORY_MESSAGES,
        } as any
    )) as StoredChatMessage[];

    if (!messages || messages.length === 0) {
        return [];
    }

    const mapped = messages.map((msg) => {
        if (msg.role === "assistant" && msg.toolCalls) {
            try {
                const toolCalls = JSON.parse(msg.toolCalls);
                return {
                    role: "assistant" as const,
                    content: msg.content || null,
                    tool_calls: toolCalls,
                };
            } catch {
                // Invalid toolCalls JSON — treat as normal assistant message
                return {
                    role: "assistant" as const,
                    content: msg.content,
                };
            }
        }

        if (msg.role === "tool" && msg.toolCallId) {
            return {
                role: "tool" as const,
                content: msg.content,
                tool_call_id: msg.toolCallId,
            };
        }

        return {
            role: msg.role as "user" | "assistant",
            content: msg.content,
        };
    });

    // Validate: remove orphaned tool messages that have no preceding assistant with tool_calls.
    // OpenAI requires tool messages to follow an assistant message with matching tool_calls.
    const validToolCallIds = new Set<string>();
    const validated: OpenAI.ChatCompletionMessageParam[] = [];

    for (const msg of mapped) {
        if (msg.role === "assistant" && "tool_calls" in msg && msg.tool_calls) {
            for (const tc of msg.tool_calls as Array<{ id: string }>) {
                validToolCallIds.add(tc.id);
            }
            validated.push(msg);
        } else if (msg.role === "tool" && "tool_call_id" in msg) {
            if (validToolCallIds.has(msg.tool_call_id)) {
                validated.push(msg);
            }
            // Skip orphaned tool messages
        } else {
            validated.push(msg);
        }
    }

    return validated;
}

export async function saveMessages(
    tenantId: string,
    waUserId: string,
    messages: ChatMessage[]
): Promise<void> {
    const convex = getConvexClient();

    await convex.mutation(
        "chatMessages:addMessages" as any,
        {
            tenantId,
            waUserId,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
                toolCalls: m.toolCalls,
                toolCallId: m.toolCallId,
            })),
        } as any
    );
}
