import { QueryCtx } from "./_generated/server";

/**
 * Validates service-to-service calls from the Node backend to Convex.
 * Requires CONVEX_SERVICE_TOKEN configured in Convex environment variables.
 */
export async function requireServiceToken(_ctx: QueryCtx, providedToken: string): Promise<void> {
  const expected = process.env.CONVEX_SERVICE_TOKEN?.trim();
  if (!expected) {
    throw new Error("CONVEX_SERVICE_TOKEN is not configured on Convex.");
  }

  if (!providedToken || providedToken !== expected) {
    throw new Error("Invalid service token.");
  }
}
