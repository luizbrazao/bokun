import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("CONVEX_URL ausente. Configure no .env.local.");
  process.exit(1);
}

const tenantId = process.argv[2];
const waUserId = process.argv[3];

if (!tenantId || !waUserId) {
  console.error("Uso: node --experimental-strip-types --env-file=.env.local scripts/clearChatHistory.ts <tenantId> <waUserId>");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

const result = await client.mutation(
  "chatMessages:clearHistory" as any,
  { tenantId, waUserId } as any
);

console.log("Histórico limpo:", result);
