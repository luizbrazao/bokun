// scripts/bokun_smoke.ts
import "dotenv/config";
import { BokunClient } from "../src/bokun/bokunClient.ts";

async function main() {
    const baseUrl = process.env.BOKUN_BASE_URL!;
    const accessKey = process.env.BOKUN_ACCESS_KEY!;
    const secretKey = process.env.BOKUN_SECRET_KEY!;

    const client = new BokunClient({ baseUrl, accessKey, secretKey, timeoutMs: 15000 });

    // Exemplo do docs: POST /activity.json/search?lang=EN&currency=ISK
    // Você pode trocar currency/lang e refinar o body depois.
    const pathWithQuery = "/activity.json/search?lang=EN&currency=EUR";

    const body = {
        // corpo mínimo só pra bater no endpoint (pode variar conforme sua conta/dados)
        page: 0,
        pageSize: 1,
    };

    const res = await client.request<any>({ method: "POST", pathWithQuery, body });

    console.log("status:", res.status);
    console.log("data:", JSON.stringify(res.data, null, 2));
}

main().catch((err) => {
    console.error("smoke test failed:", err);
    process.exit(1);
});
