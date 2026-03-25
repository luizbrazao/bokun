/**
 * Diagnostic script: tests which HTTP header format works for Bokun OAuth API calls.
 *
 * Usage:
 *   node --experimental-strip-types scripts/diagnoseOAuthHeader.ts <tenantId>
 *
 * Reads the tenant's OAuth token from provider_installations via Convex,
 * then tries two header formats against a safe read-only endpoint:
 *   1. Authorization: Bearer {token}
 *   2. X-Bokun-App-Access-Token: {token}
 *
 * Reports which one succeeds. This resolves the open question about Bokun's
 * expected OAuth header format (see refactoring plan, Decision D2).
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL;
const SERVICE_TOKEN = process.env.CONVEX_SERVICE_TOKEN;
const tenantId = process.argv[2];

if (!CONVEX_URL || !SERVICE_TOKEN || !tenantId) {
  console.error("Usage: CONVEX_URL=... CONVEX_SERVICE_TOKEN=... node --experimental-strip-types scripts/diagnoseOAuthHeader.ts <tenantId>");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

async function getInstallation(): Promise<{ baseUrl: string; token: string } | null> {
  const ctx = await convex.query("providerInstallations:getProviderContextForService" as any, {
    tenantId,
    provider: "bokun",
    serviceToken: SERVICE_TOKEN,
  } as any) as { baseUrl: string; headers: Record<string, string> } | null;

  if (!ctx) return null;

  // Extract raw token from stored headers
  const authHeader = ctx.headers["Authorization"] ?? ctx.headers["authorization"] ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  return { baseUrl: ctx.baseUrl, token };
}

async function testHeader(baseUrl: string, token: string, headerName: string): Promise<{ status: number; ok: boolean }> {
  // Use a safe read-only endpoint: search activities with empty body
  const url = `${baseUrl}/activity.json/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [headerName]: headerName === "Authorization" ? `Bearer ${token}` : token,
    },
    body: JSON.stringify({ pageSize: 1 }),
  });
  return { status: res.status, ok: res.ok };
}

async function main() {
  const installation = await getInstallation();
  if (!installation) {
    console.error(`No active Bokun installation found for tenant: ${tenantId}`);
    process.exit(1);
  }

  console.log(`Base URL: ${installation.baseUrl}`);
  console.log(`Token: ${installation.token.slice(0, 8)}...${installation.token.slice(-4)}`);
  console.log("");

  const variants: [string, string][] = [
    ["Authorization", "Authorization: Bearer {token}"],
    ["X-Bokun-App-Access-Token", "X-Bokun-App-Access-Token: {token}"],
  ];

  for (const [headerName, label] of variants) {
    try {
      const result = await testHeader(installation.baseUrl, installation.token, headerName);
      const icon = result.ok ? "✅" : "❌";
      console.log(`${icon} ${label} → HTTP ${result.status}`);
    } catch (err) {
      console.log(`💥 ${label} → ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\nIf both fail with 401/403, the token may be expired or revoked.");
  console.log("If only X-Bokun-App-Access-Token works, update src/oauth/handler.ts accordingly.");
}

main().catch(console.error);
