import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertAuditEvent = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    event: v.string(),
    waUserId: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
    bookingDraftId: v.optional(v.id("booking_drafts")),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_log", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
