export type BokunEnvironment = "production" | "test";

export type BokunHosts = {
  environment: BokunEnvironment;
  authorizeHost: string;
  tokenHost: string;
  apiBaseUrl: string;
};

/**
 * Resolves Bokun hosts (authorize, token, API) based on the vendor domain.
 *
 * Production: {domain}.bokun.io → api.bokun.io
 * Test:       {domain}.bokuntest.com → api.bokuntest.com
 *
 * The `bokunDomain` can be:
 * - Just the subdomain: "mycompany" (defaults to production)
 * - Full domain hint: "mycompany.bokuntest.com" (detected as test)
 *
 * Or pass `env` explicitly to override detection.
 */
export function resolveBokunHosts(
  bokunDomain: string,
  env?: BokunEnvironment
): BokunHosts {
  const isTest =
    env === "test" || bokunDomain.includes("bokuntest.com");

  // Extract just the subdomain part if a full domain was passed
  const subdomain = bokunDomain
    .replace(/\.bokuntest\.com$/i, "")
    .replace(/\.bokun\.io$/i, "")
    .replace(/\.bokun\.is$/i, "");

  if (isTest) {
    return {
      environment: "test",
      authorizeHost: `https://${subdomain}.bokuntest.com`,
      tokenHost: `https://${subdomain}.bokuntest.com`,
      apiBaseUrl: "https://api.bokuntest.com",
    };
  }

  return {
    environment: "production",
    authorizeHost: `https://${subdomain}.bokun.io`,
    tokenHost: `https://${subdomain}.bokun.io`,
    apiBaseUrl: "https://api.bokun.io",
  };
}

/**
 * Derives the Bokun environment from a base URL string.
 */
export function environmentFromBaseUrl(baseUrl: string): BokunEnvironment {
  return baseUrl.includes("bokuntest") ? "test" : "production";
}
