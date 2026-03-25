import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Não autenticado.");
  return userId;
}

export async function requireTenantMembership(
  ctx: QueryCtx,
  tenantId: Id<"tenants">,
) {
  const userId = await requireAuth(ctx);
  const membership = await ctx.db
    .query("user_tenants")
    .withIndex("by_userId_tenantId", (q) =>
      q.eq("userId", userId).eq("tenantId", tenantId),
    )
    .first();
  if (!membership) throw new Error("Acesso negado.");
  return membership;
}

type TenantRole = "owner" | "admin" | "viewer";
const ROLE_HIERARCHY: Record<TenantRole, number> = { owner: 3, admin: 2, viewer: 1 };

/**
 * Requires authenticated user to be a member of the tenant with at least `minRole`.
 * Role hierarchy: owner > admin > viewer.
 */
export async function requireTenantRole(
  ctx: QueryCtx,
  tenantId: Id<"tenants">,
  minRole: TenantRole,
) {
  const membership = await requireTenantMembership(ctx, tenantId);
  const userLevel = ROLE_HIERARCHY[membership.role as TenantRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole];
  if (userLevel < requiredLevel) {
    throw new Error(`Permissão insuficiente. Requer role: ${minRole}.`);
  }
  return membership;
}

type UserTenantMembership = {
  _id: Id<"user_tenants">;
  userId: Id<"users">;
  tenantId: Id<"tenants">;
  role: string;
  createdAt: number;
};

async function getMembershipsByUserId(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<UserTenantMembership[]> {
  const memberships = await ctx.db
    .query("user_tenants")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  return memberships.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

async function getValidTenantMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<{ membership: UserTenantMembership; tenant: Doc<"tenants"> } | null> {
  const memberships = await getMembershipsByUserId(ctx, userId);

  for (const membership of memberships) {
    const tenant = await ctx.db.get(membership.tenantId);
    if (tenant) {
      return { membership, tenant };
    }
  }

  return null;
}

async function cleanupOrphanMemberships(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const memberships = await getMembershipsByUserId(ctx, userId);

  for (const membership of memberships) {
    const tenant = await ctx.db.get(membership.tenantId);
    if (!tenant) {
      await ctx.db.delete(membership._id);
    }
  }
}

export const getMyTenant = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const resolved = await getValidTenantMembership(ctx, userId);
    if (!resolved) return null;

    return { ...resolved.tenant, role: resolved.membership.role };
  },
});

export const joinByInviteCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await cleanupOrphanMemberships(ctx, userId);

    const existing = await getValidTenantMembership(ctx, userId);
    if (existing) throw new Error("Você já está vinculado a uma empresa.");

    const tenants = await ctx.db.query("tenants").collect();
    const tenant = tenants.find(
      (t) => t.inviteCode === args.inviteCode.trim().toUpperCase(),
    );
    if (!tenant) throw new Error("Código de convite inválido.");

    await ctx.db.insert("user_tenants", {
      userId,
      tenantId: tenant._id,
      role: "admin",
      createdAt: Date.now(),
    });

    return tenant._id;
  },
});

export const listTeamMembers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const currentUserId = await requireAuth(ctx);
    await requireTenantMembership(ctx, args.tenantId);

    const memberships = await ctx.db
      .query("user_tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          userId: m.userId as string,
          role: m.role,
          createdAt: m.createdAt,
          name: user?.name ?? null,
          email: user?.email ?? null,
          isCurrentUser: m.userId === currentUserId,
        };
      }),
    );

    return members;
  },
});

export const removeTeamMember = mutation({
  args: {
    tenantId: v.id("tenants"),
    memberUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membership = await requireTenantMembership(ctx, args.tenantId);

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Apenas donos ou admins podem remover membros.");
    }

    const currentUserId = await requireAuth(ctx);
    if (args.memberUserId === currentUserId) {
      throw new Error("Você não pode remover a si mesmo.");
    }

    const targetMembership = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.memberUserId).eq("tenantId", args.tenantId),
      )
      .first();

    if (!targetMembership) {
      throw new Error("Membro não encontrado.");
    }

    if (targetMembership.role === "owner") {
      throw new Error("O dono da empresa não pode ser removido.");
    }

    await ctx.db.delete(targetMembership._id);
  },
});

export const createAndJoinTenant = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await cleanupOrphanMemberships(ctx, userId);

    const existing = await getValidTenantMembership(ctx, userId);
    if (existing) throw new Error("Você já está vinculado a uma empresa.");

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name.trim(),
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("user_tenants", {
      userId,
      tenantId,
      role: "owner",
      createdAt: Date.now(),
    });

    return tenantId;
  },
});
