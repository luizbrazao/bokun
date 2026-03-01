import { query } from "./_generated/server";

export const ping = query({
  handler: async () => {
    return {
      ok: true,
      message: "Convex is alive",
      timestamp: Date.now(),
    };
  },
});
