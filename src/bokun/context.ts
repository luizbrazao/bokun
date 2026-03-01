import { getConvexClient } from "../convex/client.ts";

export type BokunContext = {
  baseUrl: string;
  headers: Record<string, string>;
};

type BokunContextQueryResult = {
  provider?: string;
  baseUrl: string;
  headers?: Record<string, string>;
} | null;

function getEnvFallbackContext(): BokunContext | null {
  const baseUrl = process.env.BOKUN_BASE_URL?.trim();
  const accessKey = process.env.BOKUN_ACCESS_KEY?.trim();
  const secretKey = process.env.BOKUN_SECRET_KEY?.trim();

  if (!baseUrl || !accessKey || !secretKey) {
    return null;
  }

  return {
    baseUrl,
    headers: {
      "X-Bokun-AccessKey": accessKey,
      "X-Bokun-SecretKey": secretKey,
    },
  };
}

export async function getBokunContextOrThrow(args: { tenantId: string }): Promise<BokunContext> {
  const convex = getConvexClient();
  const providerContext = (await convex.query(
    "providerInstallations:getProviderContext" as any,
    { tenantId: args.tenantId, provider: "bokun" } as any
  )) as BokunContextQueryResult;

  if (providerContext) {
    return {
      baseUrl: providerContext.baseUrl,
      headers: providerContext.headers ?? {},
    };
  }

  const legacyContext = (await convex.query(
    "bokunInstallations:getBokunContext" as any,
    { tenantId: args.tenantId } as any
  )) as BokunContextQueryResult;

  if (!legacyContext) {
    const fallback = getEnvFallbackContext();
    if (fallback) {
      return fallback;
    }
    throw new Error(`Tenant sem instalação Bokun: ${args.tenantId}`);
  }

  return {
    baseUrl: legacyContext.baseUrl,
    headers: legacyContext.headers ?? {},
  };
}
