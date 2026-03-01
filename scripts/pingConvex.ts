import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";

async function main() {
    const url = process.env.CONVEX_URL;
    if (!url) {
        throw new Error("CONVEX_URL não está definido. Verifique carregamento do .env.local.");
    }

    const client = new ConvexHttpClient(url);

    // sua query convex/ping.ts é chamada como "ping:ping"
    const result = await client.query("ping:ping" as any, {});
    console.log("✅ ping result:", result);
}

main().catch((err) => {
    console.error("❌ ping failed:", err);
    process.exit(1);
});
