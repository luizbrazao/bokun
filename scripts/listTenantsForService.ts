import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getConvexClient, getConvexServiceToken } from "../src/convex/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env.local") });

async function main(): Promise<void> {
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  const tenants = (await convex.query(
    "tenants:listTenantsForService" as any,
    { serviceToken } as any
  )) as Array<{ _id: string; name: string; status: string }>;

  if (!tenants || tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  console.log("Tenants:");
  for (const t of tenants) {
    console.log(`- ${t._id} | ${t.name} | ${t.status}`);
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Failed to list tenants: ${message}`);
  process.exit(1);
});
