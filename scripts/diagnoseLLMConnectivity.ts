/**
 * Diagnoses LLM connectivity/config in one command.
 *
 * Usage:
 *   node --experimental-strip-types scripts/diagnoseLLMConnectivity.ts
 *
 * Optional env:
 *   AGENT_EVAL_TENANT_ID (default: test-tenant)
 */

import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getConvexClient, getConvexServiceToken } from "../src/convex/client.ts";
import { getOpenAIClientForKey, resolveModel } from "../src/llm/client.ts";
import { classifyLLMError } from "../src/llm/errorClassifier.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env.local") });

function maskSecret(value: string | undefined): string {
  if (!value || value.length < 8) return "(missing)";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function main(): Promise<void> {
  const tenantId = process.env.AGENT_EVAL_TENANT_ID ?? "test-tenant";
  const convexUrl = process.env.CONVEX_URL?.trim();
  const serviceToken = process.env.CONVEX_SERVICE_TOKEN_V2?.trim() || process.env.CONVEX_SERVICE_TOKEN?.trim();

  console.log("=== LLM Connectivity Diagnose ===");
  console.log(`tenantId: ${tenantId}`);
  console.log(`convexUrl: ${convexUrl ?? "(missing)"}`);
  console.log(`serviceToken: ${maskSecret(serviceToken)}`);
  console.log(`env OPENAI_API_KEY: ${maskSecret(process.env.OPENAI_API_KEY)}`);
  console.log("");

  let tenantOpenAIKey: string | null = null;
  let tenantModel: string | null = null;

  try {
    const convex = getConvexClient();
    const token = getConvexServiceToken();
    const settings = (await convex.query(
      "tenants:getOpenAIKeyForTenant" as any,
      { tenantId, serviceToken: token } as any
    )) as { openaiApiKey: string | null; openaiModel: string | null } | null;
    tenantOpenAIKey = settings?.openaiApiKey ?? null;
    tenantModel = settings?.openaiModel ?? null;
    console.log(`tenant OPENAI key: ${tenantOpenAIKey ? "present" : "missing"}`);
    console.log(`tenant model: ${tenantModel ?? "(default)"}`);
  } catch (error) {
    const classified = classifyLLMError(error);
    console.log(`tenant settings lookup: FAILED (${classified.category})`);
    console.log(`tenant settings error: ${classified.message}`);
  }

  const effectiveKey = tenantOpenAIKey ?? process.env.OPENAI_API_KEY ?? null;
  const effectiveModel = resolveModel(tenantModel ?? process.env.OPENAI_MODEL ?? null);
  console.log(`effective model: ${effectiveModel}`);
  console.log(`effective key source: ${tenantOpenAIKey ? "tenant" : process.env.OPENAI_API_KEY ? "env" : "none"}`);

  if (!effectiveKey) {
    console.log("");
    console.log("Result: FAILED (no OpenAI key available)");
    process.exit(1);
  }

  try {
    const openai = getOpenAIClientForKey(effectiveKey);
    const response = await openai.chat.completions.create({
      model: effectiveModel,
      messages: [
        { role: "system", content: "You are a connectivity probe. Reply with exactly: OK" },
        { role: "user", content: "ping" },
      ],
      temperature: 0,
      max_tokens: 16,
    });
    const reply = response.choices[0]?.message?.content?.trim() ?? "";
    console.log("");
    console.log("Result: OK");
    console.log(`Probe reply: ${reply}`);
  } catch (error) {
    const classified = classifyLLMError(error);
    console.log("");
    console.log(`Result: FAILED (${classified.category})`);
    console.log(`retryable: ${classified.retryable}`);
    console.log(`statusCode: ${classified.statusCode ?? "(none)"}`);
    console.log(`errorCode: ${classified.code ?? "(none)"}`);
    console.log(`message: ${classified.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const classified = classifyLLMError(error);
  console.error(`Fatal: ${classified.category} | ${classified.message}`);
  process.exit(1);
});
