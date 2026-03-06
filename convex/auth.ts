import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string) ?? undefined,
        };
      },
    }),
    Google,
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const { emailVerified, phoneVerified, ...rawProfile } = args.profile;

      const profile = {
        ...rawProfile,
        ...(typeof rawProfile.email === "string"
          ? { email: rawProfile.email.trim().toLowerCase() }
          : null),
      };

      const now = Date.now();
      const userData = {
        ...profile,
        ...(emailVerified ? { emailVerificationTime: now } : null),
        ...(phoneVerified ? { phoneVerificationTime: now } : null),
      };

      let userId = args.existingUserId;
      if (userId) {
        const existing = await ctx.db.get(userId);
        // Self-healing for orphaned authAccounts: recreate user and re-link account.
        if (existing) {
          await ctx.db.patch(userId, userData);
          return userId;
        }
        userId = null;
      }

      // Keep account-linking behavior safe by reusing a uniquely verified email user.
      if (typeof profile.email === "string" && (emailVerified === true || args.provider.type === "email")) {
        const verifiedByEmail = await ctx.db
          .query("users")
          .filter((q) =>
            q.and(
              q.eq(q.field("email"), profile.email as string),
              q.neq(q.field("emailVerificationTime"), undefined),
            ),
          )
          .take(2);
        if (verifiedByEmail.length === 1) {
          const verifiedUserId = verifiedByEmail[0]._id;
          await ctx.db.patch(verifiedUserId, userData);
          return verifiedUserId;
        }
      }

      const createdUserId = await ctx.db.insert("users", userData);
      return createdUserId;
    },
  },
});
