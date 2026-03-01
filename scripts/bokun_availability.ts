// scripts/bokun_availability.ts
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config({ path: envPath });
}

import { BokunClient } from "../src/bokun/bokunClient";
import { availabilityToOptionMap } from "../src/bokun/availabilityToOptionMap";

function mustGetEnv(name: string): string {
    const v = process.env[name];
    if (!v || !v.trim()) {
        throw new Error(
            `Missing env var ${name}. Put it in .env.local (preferred) or .env.`
        );
    }
    return v.trim();
}

function toISODate(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main() {
    const baseUrl = mustGetEnv("BOKUN_BASE_URL");
    const accessKey = mustGetEnv("BOKUN_ACCESS_KEY");
    const secretKey = mustGetEnv("BOKUN_SECRET_KEY");

    const client = new BokunClient({ baseUrl, accessKey, secretKey, timeoutMs: 15_000 });

    const activityId = "1119877";

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);

    const pathWithQuery =
        `/activity.json/${encodeURIComponent(activityId)}/availabilities` +
        `?start=${encodeURIComponent(toISODate(from))}` +
        `&end=${encodeURIComponent(toISODate(to))}`;

    const res = await client.request<any>({ method: "GET", pathWithQuery });

    const optionMap = availabilityToOptionMap({
        activityId: Number(activityId),
        availabilities: res.data,
        limit: 9,
    });

    console.log("status:", res.status);
    console.log("path:", pathWithQuery);
    console.log("optionMap:", JSON.stringify(optionMap, null, 2));
}

main().catch((err) => {
    console.error("availability test failed:", err);
    process.exit(1);
});
