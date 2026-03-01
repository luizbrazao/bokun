/**
 * Smoke test for the LLM Agent.
 *
 * Usage:
 *   node --experimental-strip-types scripts/smokeTestLLMAgent.ts
 *
 * Requires:
 *   - OPENAI_API_KEY in .env.local
 *   - CONVEX_URL in .env.local (for conversation history)
 */

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load .env.local from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env.local") });
import { runLLMAgent } from "../src/llm/agent.ts";

const FAKE_TENANT_ID = process.env.SMOKE_TEST_TENANT_ID ?? "test-tenant";
const FAKE_WA_USER_ID = "smoke-test-user-" + Date.now();

async function main() {
    console.log("=== LLM Agent Smoke Test ===\n");
    console.log(`Tenant: ${FAKE_TENANT_ID}`);
    console.log(`WA User: ${FAKE_WA_USER_ID}`);
    console.log(`Model: ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}\n`);

    // Test 1: Simple greeting
    console.log("--- Test 1: Greeting ---");
    const greeting = await runLLMAgent({
        tenantId: FAKE_TENANT_ID,
        waUserId: FAKE_WA_USER_ID,
        userMessage: "Olá! Boa tarde!",
    });
    console.log(`Handled: ${greeting.handled}`);
    console.log(`Response: ${greeting.text}\n`);

    // Test 2: Service question
    console.log("--- Test 2: Service Question ---");
    const serviceQ = await runLLMAgent({
        tenantId: FAKE_TENANT_ID,
        waUserId: FAKE_WA_USER_ID,
        userMessage: "Quais atividades vocês oferecem?",
    });
    console.log(`Handled: ${serviceQ.handled}`);
    console.log(`Response: ${serviceQ.text}\n`);

    // Test 3: Availability question in English
    console.log("--- Test 3: Availability (English) ---");
    const availQ = await runLLMAgent({
        tenantId: FAKE_TENANT_ID,
        waUserId: FAKE_WA_USER_ID,
        userMessage: "Do you have anything available tomorrow?",
    });
    console.log(`Handled: ${availQ.handled}`);
    console.log(`Response: ${availQ.text}\n`);

    console.log("=== Smoke Test Complete ===");
}

main().catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
});
