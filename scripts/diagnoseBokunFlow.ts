import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import {
  bokunGetAvailabilitiesForTenant,
  bokunSearchActivitiesForTenant,
} from "../src/bokun/gateway.ts";

type CliArgs = {
  phoneNumberId?: string;
  tenantId?: string;
  activityId?: string;
  date?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--phone-number-id" && next) {
      result.phoneNumberId = next;
      i++;
      continue;
    }
    if (current === "--tenant-id" && next) {
      result.tenantId = next;
      i++;
      continue;
    }
    if (current === "--activity-id" && next) {
      result.activityId = next;
      i++;
      continue;
    }
    if (current === "--date" && next) {
      result.date = next;
      i++;
    }
  }
  return result;
}

function requireConvexUrl(): string {
  const value = process.env.CONVEX_URL?.trim();
  if (!value) {
    throw new Error("CONVEX_URL ausente. Configure no .env.local.");
  }
  return value;
}

function requireServiceToken(): string {
  const value = process.env.CONVEX_SERVICE_TOKEN?.trim();
  if (!value) {
    throw new Error("CONVEX_SERVICE_TOKEN ausente. Configure no .env.local e no Convex.");
  }
  return value;
}

function extractActivities(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const record = raw as Record<string, unknown>;
  const data = record.data as Record<string, unknown> | undefined;
  const candidates = [record.items, record.activities, record.results, data?.items, data?.activities];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item)
      );
    }
  }
  return [];
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function printUsage(): void {
  console.log("Uso:");
  console.log("  node --experimental-strip-types scripts/diagnoseBokunFlow.ts --phone-number-id <id>");
  console.log(
    "  node --experimental-strip-types scripts/diagnoseBokunFlow.ts --tenant-id <tenantId> [--activity-id <id>] [--date YYYY-MM-DD]"
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.tenantId && !args.phoneNumberId) {
    printUsage();
    process.exit(1);
  }

  const convexUrl = requireConvexUrl();
  const serviceToken = requireServiceToken();
  const convex = new ConvexHttpClient(convexUrl);

  let tenantId = args.tenantId;
  if (!tenantId && args.phoneNumberId) {
    const channel = (await convex.query("whatsappChannels:getByPhoneNumberId" as any, {
      phoneNumberId: args.phoneNumberId,
      serviceToken,
    } as any)) as
      | {
          tenantId: string;
          status: string;
          phoneNumberId: string;
        }
      | null;

    if (!channel) {
      throw new Error(`Canal não encontrado para phone_number_id=${args.phoneNumberId}`);
    }

    tenantId = channel.tenantId;
    console.log("Canal WhatsApp:");
    console.log(JSON.stringify(channel, null, 2));
  }

  if (!tenantId) {
    throw new Error("Não foi possível resolver tenantId.");
  }

  const context = (await convex.query("bokunInstallations:getBokunContext" as any, {
    tenantId,
  } as any)) as { baseUrl?: string; headers?: Record<string, string> } | null;
  const providerContext = (await convex.query("providerInstallations:getProviderContextForService" as any, {
    tenantId,
    provider: "bokun",
    serviceToken,
  } as any)) as { baseUrl?: string; headers?: Record<string, string>; provider?: string } | null;
  const primaryProvider = (await convex.query("providerInstallations:getPrimaryProvider" as any, {
    tenantId,
  } as any)) as string | null;

  console.log(`Primary provider: ${primaryProvider ?? "(none)"}`);

  if (providerContext) {
    console.log("Contexto provider_installations (bokun):");
    console.log(
      JSON.stringify(
        {
          provider: providerContext.provider,
          baseUrl: providerContext.baseUrl,
          headerKeys: Object.keys(providerContext.headers ?? {}),
        },
        null,
        2
      )
    );
  } else {
    console.log("Contexto provider_installations (bokun): inexistente");
  }

  if (!context) {
    console.log("Contexto legado bokun_installations: inexistente");
  } else {
    console.log("Contexto legado bokun_installations:");
    console.log(
      JSON.stringify(
        {
          baseUrl: context.baseUrl,
          headerKeys: Object.keys(context.headers ?? {}),
        },
        null,
        2
      )
    );
  }

  console.log("\nTeste 1: search_activities");
  const searchResult = await bokunSearchActivitiesForTenant({
    tenantId,
    body: { page: 0, pageSize: 10 },
    lang: process.env.BOKUN_DEFAULT_LANG?.trim() ?? "EN",
    currency: process.env.BOKUN_DEFAULT_CURRENCY?.trim() ?? "EUR",
  });
  const activities = extractActivities(searchResult);
  console.log(`Atividades retornadas: ${activities.length}`);
  for (const activity of activities.slice(0, 5)) {
    console.log(
      `- ${String(activity.id ?? activity.activityId ?? "?")} | ${String(
        activity.title ?? activity.name ?? activity.activityName ?? "(sem título)"
      )}`
    );
  }

  const activityId = args.activityId ?? String(activities[0]?.id ?? activities[0]?.activityId ?? "");
  if (!activityId) {
    console.log("\nSem activityId para testar disponibilidade.");
    return;
  }

  const date = args.date ?? todayYmd();
  console.log(`\nTeste 2: check_availability (activityId=${activityId}, date=${date})`);
  const availabilities = await bokunGetAvailabilitiesForTenant({
    tenantId,
    id: activityId,
    start: date,
    end: date,
    lang: process.env.BOKUN_DEFAULT_LANG?.trim() ?? "EN",
    currency: process.env.BOKUN_DEFAULT_CURRENCY?.trim() ?? "EUR",
  });
  console.log(`Availabilities retornadas: ${availabilities.length}`);
  console.log(JSON.stringify(availabilities.slice(0, 3), null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nDiagnóstico falhou:");
  console.error(message);
  process.exit(1);
});
