import { getOpenAIClientForKey, resolveModel } from "./client.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { toolDefinitions, executeTool } from "./tools.ts";
import { loadHistory, saveMessages, type ChatMessage } from "./memory.ts";
import { getConvexClient, getConvexServiceToken } from "../convex/client.ts";
import { rootLogger } from "../lib/logger.ts";
import { classifyLLMError } from "./errorClassifier.ts";
import { detectReplyLanguageFromUserMessage } from "./language.ts";
import type OpenAI from "openai";

export type RunLLMAgentArgs = {
    tenantId: string;
    waUserId: string;
    userMessage: string;
    channel?: "wa" | "tg";
};

export type RunLLMAgentResult = {
    text: string;
    handled: boolean;
};

const MAX_TOOL_ITERATIONS = 3;

function buildLanguageLockInstruction(language: "pt" | "en" | "es" | null): string | null {
    if (!language) return null;

    if (language === "en") {
        return "LANGUAGE LOCK: For this turn, respond strictly in English only. Do not reply in Portuguese or Spanish.";
    }
    if (language === "pt") {
        return "TRAVA DE IDIOMA: Nesta resposta, responda estritamente em Português. Não responda em inglês ou espanhol.";
    }
    return "BLOQUEO DE IDIOMA: En este turno, responde estrictamente en Español. No respondas en portugués ni inglés.";
}

async function resolveOpenAIConfig(tenantId: string): Promise<{ apiKey: string; model: string } | null> {
    const convex = getConvexClient();
    const serviceToken = getConvexServiceToken();
    const settings = await convex.query("tenants:getOpenAIKeyForTenant", { tenantId, serviceToken }) as {
        openaiApiKey: string | null;
        openaiModel: string | null;
    } | null;

    if (settings?.openaiApiKey) {
        return {
            apiKey: settings.openaiApiKey,
            model: resolveModel(settings.openaiModel),
        };
    }

    // Fallback: env var global (para backwards compat / dev)
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey?.trim()) {
        return {
            apiKey: envKey,
            model: resolveModel(null),
        };
    }

    return null;
}

export async function runLLMAgent(args: RunLLMAgentArgs): Promise<RunLLMAgentResult> {
    try {
        const config = await resolveOpenAIConfig(args.tenantId);
        if (!config) {
            return {
                text: "O assistente de IA não está configurado. Peça ao administrador para adicionar a chave OpenAI nas configurações.",
                handled: true,
            };
        }

        const openai = getOpenAIClientForKey(config.apiKey);
        const model = config.model;

        // Look up tenant language and timezone preferences for system prompt (PROF-03)
        const convex = getConvexClient();
        const serviceToken = getConvexServiceToken();
        const tenantRecord = (await convex.query(
            "tenants:getTenantByIdForService" as any,
            { tenantId: args.tenantId, serviceToken } as any
        )) as { language?: string; timezone?: string } | null;
        const tenantLanguage = tenantRecord?.language ?? "pt";
        const userLanguageHint = detectReplyLanguageFromUserMessage(args.userMessage);
        const languageLockInstruction = buildLanguageLockInstruction(userLanguageHint);

        // Build system prompt — use tenant timezone for current datetime display
        const now = new Date().toLocaleString("en-GB", { timeZone: tenantRecord?.timezone ?? "Europe/Madrid" });
        const systemPrompt = buildSystemPrompt({
            tenantId: args.tenantId,
            currentDateTime: now,
            language: tenantLanguage,
            userLanguageHint,
        });

        // Load conversation history
        const history = await loadHistory(args.tenantId, args.waUserId);
        rootLogger.debug({
            tenantId: args.tenantId,
            waUserId: args.waUserId,
            historyLength: history.length,
            roles: history.map(m => m.role).join(", "),
        }, "llm_history_loaded");

        // Build messages array
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...(languageLockInstruction ? [{ role: "system" as const, content: languageLockInstruction }] : []),
            ...history,
            { role: "user", content: args.userMessage },
        ];

        // Track messages to save
        const messagesToSave: ChatMessage[] = [
            { role: "user", content: args.userMessage },
        ];

        // Tool-call loop
        let iterations = 0;
        let lastResponse: OpenAI.ChatCompletion | null = null;

        while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            const response = await openai.chat.completions.create({
                model,
                messages,
                tools: toolDefinitions,
                temperature: 0.7,
            });

            lastResponse = response;
            const choice = response.choices[0];
            rootLogger.debug({ iteration: iterations, finishReason: choice?.finish_reason }, "llm_iteration");

            if (!choice || !choice.message) {
                break;
            }

            const assistantMessage = choice.message;

            // If there are tool calls, execute them
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Add assistant message with tool calls to conversation
                messages.push({
                    role: "assistant",
                    content: assistantMessage.content ?? "",
                    tool_calls: assistantMessage.tool_calls,
                });

                // Save assistant tool-call message
                messagesToSave.push({
                    role: "assistant",
                    content: assistantMessage.content ?? "",
                    toolCalls: JSON.stringify(assistantMessage.tool_calls),
                });

                // Execute each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== "function") {
                        continue;
                    }

                    let toolArgs: Record<string, unknown> = {};
                    try {
                        toolArgs = JSON.parse(toolCall.function.arguments);
                    } catch {
                        toolArgs = {};
                    }

                    const toolResult = await executeTool({
                        tenantId: args.tenantId,
                        waUserId: args.waUserId,
                        channel: args.channel ?? "wa",
                        toolName: toolCall.function.name,
                        toolArguments: toolArgs,
                    });

                    // Add tool result to conversation
                    messages.push({
                        role: "tool",
                        content: toolResult,
                        tool_call_id: toolCall.id,
                    });

                    // Save tool result message
                    messagesToSave.push({
                        role: "tool",
                        content: toolResult,
                        toolCallId: toolCall.id,
                    });
                }

                // Continue loop to get final response with tool results
                continue;
            }

            // No tool calls — we have a final text response
            const responseText = assistantMessage.content ?? "";

            messagesToSave.push({
                role: "assistant",
                content: responseText,
            });

            // Persist all messages
            await saveMessages(args.tenantId, args.waUserId, messagesToSave);

            return {
                text: responseText,
                handled: true,
            };
        }

        // If we exhausted iterations, extract whatever text we have
        const fallbackText = lastResponse?.choices[0]?.message?.content ?? "";
        if (fallbackText.trim().length > 0) {
            messagesToSave.push({
                role: "assistant",
                content: fallbackText,
            });
        }

        await saveMessages(args.tenantId, args.waUserId, messagesToSave);

        return {
            text: fallbackText || "Desculpe, não consegui processar sua mensagem. Tente novamente.",
            handled: true,
        };
    } catch (error) {
        const classified = classifyLLMError(error);
        rootLogger.error(
            {
                tenantId: args.tenantId,
                waUserId: args.waUserId,
                handler: "llm_agent",
                err: classified.message,
                errorCategory: classified.category,
                retryable: classified.retryable,
                statusCode: classified.statusCode,
                errorCode: classified.code,
            },
            "llm_agent_error"
        );

        // Graceful degradation: return a generic message instead of crashing
        if (classified.category === "auth" || classified.category === "config") {
            return {
                text: "O assistente de IA está temporariamente indisponível por configuração. Peça ao administrador para revisar a integração OpenAI.",
                handled: true,
            };
        }

        return {
            text: "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns minutos.",
            handled: true,
        };
    }
}
