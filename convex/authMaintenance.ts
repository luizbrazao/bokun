import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const inspectAuthIntegrity = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const accounts = await ctx.db.query("authAccounts").collect();
    const sessions = await ctx.db.query("authSessions").collect();
    const memberships = await ctx.db.query("user_tenants").collect();

    const orphanAccounts: Array<{
      accountId: string;
      userId: string;
      provider: string;
      providerAccountId: string;
    }> = [];

    for (const account of accounts) {
      const user = await ctx.db.get(account.userId);
      if (!user) {
        orphanAccounts.push({
          accountId: account._id,
          userId: account.userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
      }
    }

    const orphanSessions: Array<{ sessionId: string; userId: string }> = [];
    for (const session of sessions) {
      const user = await ctx.db.get(session.userId);
      if (!user) {
        orphanSessions.push({
          sessionId: session._id,
          userId: session.userId,
        });
      }
    }

    const orphanMemberships: Array<{ membershipId: string; userId: string; tenantId: string }> = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (!user) {
        orphanMemberships.push({
          membershipId: membership._id,
          userId: membership.userId,
          tenantId: membership.tenantId,
        });
      }
    }

    return {
      totals: {
        users: users.length,
        accounts: accounts.length,
        sessions: sessions.length,
        memberships: memberships.length,
      },
      orphanAccounts,
      orphanSessions,
      orphanMemberships,
    };
  },
});

export const repairOrphanAuthData = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const sessions = await ctx.db.query("authSessions").collect();
    const accounts = await ctx.db.query("authAccounts").collect();
    const refreshTokens = await ctx.db.query("authRefreshTokens").collect();
    const verificationCodes = await ctx.db.query("authVerificationCodes").collect();
    const memberships = await ctx.db.query("user_tenants").collect();

    const orphanSessionIds = new Set<string>();
    const orphanAccountIds = new Set<string>();

    for (const session of sessions) {
      const user = await ctx.db.get(session.userId);
      if (!user) orphanSessionIds.add(session._id);
    }

    for (const account of accounts) {
      const user = await ctx.db.get(account.userId);
      if (!user) orphanAccountIds.add(account._id);
    }

    const refreshTokenIdsToDelete = refreshTokens
      .filter((token) => orphanSessionIds.has(token.sessionId))
      .map((token) => token._id);

    const verificationCodeIdsToDelete = verificationCodes
      .filter((code) => orphanAccountIds.has(code.accountId))
      .map((code) => code._id);

    const membershipIdsToDelete = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (!user) membershipIdsToDelete.push(membership._id);
    }

    if (!dryRun) {
      for (const refreshTokenId of refreshTokenIdsToDelete) {
        await ctx.db.delete(refreshTokenId);
      }
      for (const sessionId of orphanSessionIds) {
        await ctx.db.delete(sessionId as never);
      }
      for (const verificationCodeId of verificationCodeIdsToDelete) {
        await ctx.db.delete(verificationCodeId);
      }
      for (const accountId of orphanAccountIds) {
        await ctx.db.delete(accountId as never);
      }
      for (const membershipId of membershipIdsToDelete) {
        await ctx.db.delete(membershipId);
      }
    }

    return {
      dryRun,
      orphanSessionCount: orphanSessionIds.size,
      orphanAccountCount: orphanAccountIds.size,
      orphanRefreshTokenCount: refreshTokenIdsToDelete.length,
      orphanVerificationCodeCount: verificationCodeIdsToDelete.length,
      orphanMembershipCount: membershipIdsToDelete.length,
      deleted: dryRun
        ? false
        : {
            sessions: orphanSessionIds.size,
            accounts: orphanAccountIds.size,
            refreshTokens: refreshTokenIdsToDelete.length,
            verificationCodes: verificationCodeIdsToDelete.length,
            memberships: membershipIdsToDelete.length,
          },
    };
  },
});
