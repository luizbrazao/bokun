import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";

export const getDashboardStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);

    // Compute time windows
    const now = Date.now();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const startOfTodayMs = d.getTime();

    const d2 = new Date(now);
    const dow = d2.getDay();
    const diff = d2.getDate() - dow;
    const weekStart = new Date(d2.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const startOfWeekMs = weekStart.getTime();

    // Fetch tenant for bot status
    const tenant = await ctx.db.get(args.tenantId);

    const bookings = await ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();

    let confirmedCount = 0;
    let pendingCount = 0;
    let abandonedCount = 0;
    let bookingsThisWeek = 0;
    for (const b of bookings) {
      if (b.status === "confirmed") {
        confirmedCount++;
        if (b.confirmedAt != null && b.confirmedAt >= startOfWeekMs) {
          bookingsThisWeek++;
        }
      } else if (b.status === "abandoned") {
        abandonedCount++;
      } else {
        pendingCount++;
      }
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

    // messagesToday: count chat_messages for this tenant created today
    const tenantMessages = await ctx.db
      .query("chat_messages")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();
    const messagesToday = tenantMessages.filter(
      (m) => m.createdAt >= startOfTodayMs,
    ).length;
    const conversationUsers = new Set<string>();
    for (const c of conversations) conversationUsers.add(c.waUserId);
    for (const m of tenantMessages) conversationUsers.add(m.waUserId);

    const whatsappChannel = await ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const bokunInstallation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const telegramChannel = await ctx.db
      .query("telegram_channels")
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
      totalConversations: conversationUsers.size,
      conversionRate,
      whatsappConnected: whatsappChannel !== null,
      telegramConnected: telegramChannel !== null,
      bokunConnected: bokunInstallation !== null,
      recentBookings,
      messagesToday,
      bookingsThisWeek,
      botStatus: (tenant?.status ?? "active") as "active" | "disabled",
    };
  },
});
