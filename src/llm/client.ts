import OpenAI from "openai";

const clientCache = new Map<string, OpenAI>();

/**
 * Returns an OpenAI client for the given API key.
 * Instances are cached per key to avoid re-creating on every message.
 */
export function getOpenAIClientForKey(apiKey: string): OpenAI {
    const cached = clientCache.get(apiKey);
    if (cached) return cached;

    const client = new OpenAI({ apiKey });
    clientCache.set(apiKey, client);
    return client;
}

const DEFAULT_MODEL = "gpt-4o-mini";

export function resolveModel(tenantModel: string | null | undefined): string {
    return tenantModel?.trim() || process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

/**
 * Returns an OpenAI client using the global OPENAI_API_KEY.
 */
export function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in environment");
    return getOpenAIClientForKey(apiKey);
}

/**
 * Returns the resolved model name using the global OPENAI_MODEL or default.
 */
export function getModelName(): string {
    return resolveModel(process.env.OPENAI_MODEL);
}
