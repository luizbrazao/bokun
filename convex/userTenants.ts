import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

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

export const getMyTenant = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membership = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return null;

    const tenant = await ctx.db.get(membership.tenantId);
    if (!tenant) return null;

    return { ...tenant, role: membership.role };
  },
});

export const joinByInviteCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const existing = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
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

    const existing = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
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
