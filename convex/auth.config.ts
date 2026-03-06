export default {
  providers: [
    {
      // Must match the JWT issuer, which is always CONVEX_SITE_URL (auto-set by Convex).
      // Do NOT use CUSTOM_AUTH_SITE_URL here — that is for the OAuth endpoint base, not for JWT validation.
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
