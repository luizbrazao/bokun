/**
 * adminBootstrap.ts
 *
 * Server-side-only mutations for bootstrapping tenant/user/channel data in
 * production without a running UI. These mutations intentionally skip the
 * normal auth checks because they are called from the Node.js backend, which
 * enforces its own ADMIN_API_KEY gate before ever reaching Convex.
 *
 * ⚠️  NEVER expose these via a public HTTP endpoint without ADMIN_API_KEY.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Create tenant + bootstrap user ──────────────────────────────────────────

/**
 * Creates a tenant and a lightweight "bootstrap" user entry, then links them
 * with an owner user_tenant. The user entry only stores an email label; the
 * real auth credential is managed by @convex-dev/auth (not set here).
 *
 * Idempotent by adminEmail: if a user with that email already exists AND is
 * already a member of a tenant, returns the existing IDs.
 */
export const createTenantWithUser = mutation({
  args: {
    tenantName: v.string(),
    adminEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.adminEmail.trim().toLowerCase();
    const tenantName = args.tenantName.trim();

    if (!tenantName) throw new Error("tenantName is required.");
    if (!email || !email.includes("@")) throw new Error("adminEmail must be a valid email.");

    // Check if a user with this email already exists in the auth users table
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    let userId = existingUser?._id;

    if (!userId) {
      // Insert a minimal user record — @convex-dev/auth will enrich it on first login
      userId = await ctx.db.insert("users", {
        email,
        name: email.split("@")[0],
      } as any); // schema uses authTables which may have optional fields
    }

    // Check if this user is already linked to a tenant
    const existingMembership = await ctx.db
      .query("user_tenants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      const tenant = await ctx.db.get(existingMembership.tenantId);
      return {
        tenantId: existingMembership.tenantId as string,
        userId: userId as string,
        alreadyExisted: true,
        tenantName: tenant?.name ?? "(unknown)",
      };
    }

    // Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: tenantName,
      status: "active",
      createdAt: Date.now(),
    });

    // Link user as owner
    await ctx.db.insert("user_tenants", {
      userId,
      tenantId,
      role: "owner",
      createdAt: Date.now(),
    });

    return {
      tenantId: tenantId as string,
      userId: userId as string,
      alreadyExisted: false,
      tenantName,
    };
  },
});

// ── Upsert WhatsApp channel ──────────────────────────────────────────────────

/**
 * Creates or updates a whatsapp_channel for a given tenant.
 * Uses by_tenantId index — one channel per tenant (matches upsert in whatsappChannels.ts).
 * Also ensures status is set to "active".
 */
export const upsertWhatsappChannel = mutation({
  args: {
    tenantId: v.string(), // raw Id string — validated below
    phoneNumberId: v.string(),
    wabaId: v.optional(v.string()),
    accessToken: v.string(),
    verifyToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const phoneNumberId = args.phoneNumberId.trim();
    const accessToken = args.accessToken.trim();
    const wabaId = args.wabaId?.trim() || phoneNumberId;
    const verifyToken = args.verifyToken?.trim() || "admin-bootstrap";

    if (!phoneNumberId) throw new Error("phoneNumberId is required.");
    if (!accessToken) throw new Error("accessToken is required.");

    // Resolve tenantId — ConvexHttpClient passes it as a string
    const tenantId = args.tenantId as any;
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) throw new Error(`Tenant not found: ${args.tenantId}`);

    const now = Date.now();

    // Try to find existing channel by tenantId first, then by phoneNumberId
    let existing = await ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (!existing) {
      existing = await ctx.db
        .query("whatsapp_channels")
        .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", phoneNumberId))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        phoneNumberId,
        wabaId,
        accessToken,
        verifyToken,
        status: "active",
        updatedAt: now,
      });
      return { channelId: existing._id as string, created: false, tenantId: tenantId as string };
    }

    const channelId = await ctx.db.insert("whatsapp_channels", {
      tenantId,
      phoneNumberId,
      wabaId,
      accessToken,
      verifyToken,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return { channelId: channelId as string, created: true, tenantId: tenantId as string };
  },
});

// ── Read-only helpers ────────────────────────────────────────────────────────

/** List all tenants — admin only. */
export const listAllTenants = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("tenants").collect();
  },
});
