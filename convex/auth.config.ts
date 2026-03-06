export default {
  providers: [
    {
      domain: process.env.CUSTOM_AUTH_SITE_URL ?? process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
