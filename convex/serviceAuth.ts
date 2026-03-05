import type { QueryCtx } from "./_generated/server";

/**
 * Validates service-to-service calls from the Node backend to Convex.
 * Accepts either CONVEX_SERVICE_TOKEN or CONVEX_SERVICE_TOKEN_V2.
 */
export async function requireServiceToken(_ctx: QueryCtx, providedToken: string): Promise<void> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const expectedV1 = env?.CONVEX_SERVICE_TOKEN?.trim();
  const expectedV2 = env?.CONVEX_SERVICE_TOKEN_V2?.trim();
  const accepted = [expectedV2, expectedV1].filter(
    (token): token is string => Boolean(token && token.length > 0)
  );

  if (accepted.length === 0) {
    throw new Error("CONVEX_SERVICE_TOKEN (or CONVEX_SERVICE_TOKEN_V2) is not configured on Convex.");
  }

  if (!providedToken || !accepted.includes(providedToken)) {
    throw new Error("Invalid service token.");
  }
}
