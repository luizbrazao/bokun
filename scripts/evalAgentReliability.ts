/**
 * Statistical reliability evaluation for the LLM agent.
 *
 * Usage:
 *   node --experimental-strip-types scripts/evalAgentReliability.ts
 *
 * Required env:
 *   - CONVEX_URL
 *   - OPENAI_API_KEY globally OR tenant OpenAI key configured in Convex
 * Optional env:
 *   - AGENT_EVAL_TENANT_ID (default: "test-tenant")
 *   - AGENT_EVAL_RUNS (default: 5)
 */

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runLLMAgent } from "../src/llm/agent.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env.local") });

type EvalCase = {
  id: string;
  prompt: string;
  validate: (reply: string) => { pass: boolean; reason?: string };
};

type EvalResult = {
  caseId: string;
  run: number;
  pass: boolean;
  reply: string;
  reason?: string;
};

const NON_EMPTY_MIN_LEN = 8;

const evalCases: EvalCase[] = [
  {
    id: "greeting_pt",
    prompt: "Ola, boa tarde. Quero informacoes sobre passeios.",
    validate: (reply) => {
      if (reply.trim().length < NON_EMPTY_MIN_LEN) {
        return { pass: false, reason: "empty_or_too_short" };
      }
      return { pass: true };
    },
  },
  {
    id: "handoff_request_pt",
    prompt: "Quero falar com um atendente humano agora.",
    validate: (reply) => {
      const normalized = reply.toLowerCase();
      const hasHandoffSignal =
        normalized.includes("atendente") ||
        normalized.includes("humano") ||
        normalized.includes("transfer");
      return hasHandoffSignal ? { pass: true } : { pass: false, reason: "missing_handoff_signal" };
    },
  },
  {
    id: "language_en",
    prompt: "Hi, can you help me check available tours tomorrow?",
    validate: (reply) => {
      const normalized = reply.toLowerCase();
      const hasEnglishSignal =
        normalized.includes("tour") ||
        normalized.includes("available") ||
        normalized.includes("tomorrow") ||
        normalized.includes("can") ||
        normalized.includes("please");
      return hasEnglishSignal ? { pass: true } : { pass: false, reason: "missing_english_signal" };
    },
  },
];

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function main(): Promise<void> {
  const tenantId = process.env.AGENT_EVAL_TENANT_ID ?? "test-tenant";
  const runs = Number.parseInt(process.env.AGENT_EVAL_RUNS ?? "5", 10);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error("AGENT_EVAL_RUNS must be an integer >= 1");
  }

  console.log("=== Agent Reliability Evaluation ===");
  console.log(`Tenant: ${tenantId}`);
  console.log(`Runs per case: ${runs}`);
  console.log(`Cases: ${evalCases.length}`);
  console.log("");

  const allResults: EvalResult[] = [];

  for (const evalCase of evalCases) {
    console.log(`--- Case: ${evalCase.id} ---`);
    for (let run = 1; run <= runs; run++) {
      const waUserId = `eval-${evalCase.id}-${Date.now()}-${run}`;
      const response = await runLLMAgent({
        tenantId,
        waUserId,
        userMessage: evalCase.prompt,
      });

      const verdict = evalCase.validate(response.text);
      const result: EvalResult = {
        caseId: evalCase.id,
        run,
        pass: verdict.pass,
        reply: response.text,
        reason: verdict.reason,
      };
      allResults.push(result);

      const flag = verdict.pass ? "PASS" : `FAIL(${verdict.reason ?? "unknown"})`;
      console.log(`[${flag}] run=${run} reply="${response.text.slice(0, 140).replace(/\s+/g, " ").trim()}"`);
    }
    console.log("");
  }

  const perCase = evalCases.map((c) => {
    const rows = allResults.filter((r) => r.caseId === c.id);
    const passed = rows.filter((r) => r.pass).length;
    const passRate = rows.length > 0 ? (passed / rows.length) * 100 : 0;
    const lengths = rows.map((r) => r.reply.length);
    return {
      caseId: c.id,
      passed,
      total: rows.length,
      passRate,
      p50Len: percentile(lengths, 50),
      p90Len: percentile(lengths, 90),
    };
  });

  const totalPass = allResults.filter((r) => r.pass).length;
  const total = allResults.length;
  const overall = total > 0 ? (totalPass / total) * 100 : 0;

  console.log("=== Summary ===");
  for (const row of perCase) {
    console.log(
      `${row.caseId}: ${row.passed}/${row.total} (${row.passRate.toFixed(1)}%) | len p50=${row.p50Len} p90=${row.p90Len}`
    );
  }
  console.log(`Overall: ${totalPass}/${total} (${overall.toFixed(1)}%)`);

  const failures = allResults.filter((r) => !r.pass);
  if (failures.length > 0) {
    console.log("");
    console.log("=== Failure Samples ===");
    for (const failure of failures.slice(0, 10)) {
      console.log(
        `case=${failure.caseId} run=${failure.run} reason=${failure.reason ?? "unknown"} reply="${failure.reply
          .slice(0, 200)
          .replace(/\s+/g, " ")
          .trim()}"`
      );
    }
  }
}

main().catch((err) => {
  console.error("Evaluation failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
