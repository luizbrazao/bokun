import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";

export const getDashboardStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);

    const bookings = await ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();

    let confirmedCount = 0;
    let pendingCount = 0;
    let abandonedCount = 0;
    for (const b of bookings) {
      if (b.status === "confirmed") confirmedCount++;
      else if (b.status === "abandoned") abandonedCount++;
      else pendingCount++;
    }

    const completed = confirmedCount + abandonedCount;
    const conversionRate =
      completed > 0 ? Math.round((confirmedCount / completed) * 100) : 0;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();

    const whatsappChannel = await ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const bokunInstallation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const recentBookings = bookings
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((b) => ({
        _id: b._id,
        waUserId: b.waUserId,
        activityId: b.activityId,
        date: b.date,
        status: b.status,
        bokunConfirmationCode: b.bokunConfirmationCode,
        updatedAt: b.updatedAt,
      }));

    return {
      confirmedCount,
      pendingCount,
      abandonedCount,
      totalConversations: conversations.length,
      conversionRate,
      whatsappConnected: whatsappChannel !== null,
      bokunConnected: bokunInstallation !== null,
      recentBookings,
    };
  },
});
