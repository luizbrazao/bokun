import { randomBytes } from "node:crypto";
import { getConvexClient, getConvexServiceToken } from "../convex/client.ts";
import { resolveBokunHosts, type BokunEnvironment } from "../bokun/env.ts";

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.BOKUN_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.BOKUN_APP_CLIENT_SECRET?.trim();
  const redirectUri = process.env.BOKUN_OAUTH_REDIRECT_URI?.trim();
  const rawScopes = process.env.BOKUN_OAUTH_SCOPES;
  const scopes = rawScopes !== undefined
    ? rawScopes
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(" ")
    : "bookings activities";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing OAuth config: BOKUN_APP_CLIENT_ID, BOKUN_APP_CLIENT_SECRET, BOKUN_OAUTH_REDIRECT_URI");
  }

  return { clientId, clientSecret, redirectUri, scopes };
}

/**
 * Generates the Bokun OAuth authorize URL and stores the state for CSRF validation.
 *
 * Flow:
 * 1. Generate random state nonce
 * 2. Store state in Convex (oauth_states table) with TTL + environment info
 * 3. Redirect vendor to: https://{domain}.bokun.io/appstore/oauth/authorize?...
 *    or https://{domain}.bokuntest.com/appstore/oauth/authorize?... for test
 */
export async function handleOAuthAuthorize(params: {
  bokunDomain: string;
  env?: BokunEnvironment;
}): Promise<{ redirectUrl: string }> {
  const config = getOAuthConfig();
  const hosts = resolveBokunHosts(params.bokunDomain, params.env);
  const state = randomBytes(32).toString("hex");

  const convex = getConvexClient();
  await convex.mutation("oauthStates:create" as any, {
    state,
    bokunEnvironment: hosts.environment,
    bokunDomain: params.bokunDomain,
    createdAt: Date.now(),
  } as any);

  const authorizeUrl = new URL(
    `/appstore/oauth/authorize`,
    hosts.authorizeHost
  );
  authorizeUrl.searchParams.set("client_id", config.clientId);
  if (config.scopes.length > 0) {
    authorizeUrl.searchParams.set("scope", config.scopes);
  }
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("state", state);

  return { redirectUrl: authorizeUrl.toString() };
}

type OAuthTokenResponse = {
  access_token: string;
  scope: string;
  vendor_id: string;
};

/**
 * Handles the OAuth callback from Bokun.
 *
 * Flow:
 * 1. Validate state param (CSRF protection)
 * 2. Resolve environment from stored state (test vs production)
 * 3. Exchange access_code for permanent token
 * 4. Create tenant + bokun_installation with correct baseUrl
 */
export async function handleOAuthCallback(params: {
  accessCode: string;
  state: string;
  bokunDomain: string;
}): Promise<{ tenantId: string; vendorId: string }> {
  const config = getOAuthConfig();
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  // Atomically validate + consume state (CSRF protection, strong consistency)
  const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const consumed = (await convex.mutation(
    "oauthStates:consumeState" as any,
    { state: params.state, ttlMs: STATE_TTL_MS } as any
  )) as {
    ok: boolean;
    error?: string;
    bokunEnvironment?: string;
    bokunDomain?: string;
  };

  if (!consumed.ok) {
    const msg = consumed.error === "expired" ? "OAuth state expired." : "Invalid or expired OAuth state.";
    throw new Error(msg);
  }

  // Resolve hosts from stored state (preferred) or fallback to callback param
  const domain = consumed.bokunDomain ?? params.bokunDomain;
  const env = (consumed.bokunEnvironment as BokunEnvironment | undefined) ?? undefined;
  const hosts = resolveBokunHosts(domain, env);

  // Exchange code for token
  const tokenUrl = `${hosts.tokenHost}/appstore/oauth/access_token`;
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.accessCode,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text().catch(() => "");
    throw new Error(`Bokun token exchange failed (${tokenResponse.status}): ${errorText}`);
  }

  const tokenData = (await tokenResponse.json()) as OAuthTokenResponse;

  if (!tokenData.access_token || !tokenData.vendor_id) {
    throw new Error("Bokun token exchange returned incomplete data.");
  }

  // Create tenant
  const tenantId = (await convex.mutation(
    "tenants:createTenant" as any,
    {
      name: `vendor-${tokenData.vendor_id}`,
      status: "active",
      serviceToken,
    } as any
  )) as string;

  // Create bokun installation with OAuth token + correct baseUrl
  const oauthHeaders = {
    Authorization: `Bearer ${tokenData.access_token}`,
  };
  const scopes = tokenData.scope
    ? tokenData.scope
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // New multi-provider installation record
  await convex.mutation(
    "providerInstallations:upsertInstallationForService" as any,
    {
      tenantId,
      provider: "bokun",
      status: "active",
      baseUrl: hosts.apiBaseUrl,
      authHeaders: oauthHeaders,
      scopes,
      serviceToken,
    } as any
  );

  // Legacy compatibility record
  await convex.mutation(
    "bokunInstallations:upsertBokunInstallation" as any,
    {
      tenantId,
      baseUrl: hosts.apiBaseUrl,
      authHeaders: oauthHeaders,
      scopes,
    } as any
  );

  // Write tenant_onboarded audit event — failure must never break OAuth flow
  try {
    await convex.mutation("auditLog:insertAuditEvent" as any, {
      tenantId,
      event: "tenant_onboarded",
      meta: JSON.stringify({ vendorId: tokenData.vendor_id }),
    } as any);
  } catch {
    // Audit log failure must not fail the OAuth callback
  }

  return { tenantId, vendorId: tokenData.vendor_id };
}
