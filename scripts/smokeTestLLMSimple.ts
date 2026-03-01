/**
 * Simplified smoke test for the LLM Agent (without Convex memory).
 *
 * Usage:
 *   node --experimental-strip-types scripts/smokeTestLLMSimple.ts
 *
 * Requires:
 *   - OPENAI_API_KEY in .env.local
 *
 * This version tests the LLM directly without conversation history,
 * bypassing the need for a real tenant ID in Convex.
 */

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getOpenAIClient, getModelName } from "../src/llm/client.ts";
import { buildSystemPrompt } from "../src/llm/systemPrompt.ts";
import { toolDefinitions } from "../src/llm/tools.ts";

// Load .env.local from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env.local") });

async function testLLMDirect(userMessage: string, testName: string) {
    console.log(`--- ${testName} ---`);

    try {
        const openai = getOpenAIClient();
        const model = getModelName();

        const systemPrompt = buildSystemPrompt({
            tenantId: "test-tenant",
            currentDateTime: new Date().toLocaleString("en-GB", { timeZone: "Europe/Madrid" }),
        });

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            tools: toolDefinitions,
            temperature: 0.7,
        });

        const choice = response.choices[0];
        const assistantMessage = choice?.message;

        if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
            console.log(`Tool calls requested: ${assistantMessage.tool_calls.map((tc: any) => tc.type === 'function' ? tc.function.name : tc.type).join(', ')}`);
        }

        const responseText = assistantMessage?.content ?? "";
        console.log(`Response: ${responseText}\n`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}\n`);
    }
}

async function main() {
    console.log("=== LLM Agent Simple Smoke Test ===\n");
    console.log(`Model: ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}\n`);

    await testLLMDirect("Olá! Boa tarde!", "Test 1: Greeting (Portuguese)");
    await testLLMDirect("Quais atividades vocês oferecem?", "Test 2: Service Question (Portuguese)");
    await testLLMDirect("Do you have anything available tomorrow?", "Test 3: Availability (English)");
    await testLLMDirect("Hola, ¿qué tours tienen?", "Test 4: Service Question (Spanish)");

    console.log("=== Simple Smoke Test Complete ===");
    console.log("\nNote: This test validates LLM responses without Convex memory.");
    console.log("For full end-to-end testing with conversation history, you need a real tenant ID.");
}

main().catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
});
