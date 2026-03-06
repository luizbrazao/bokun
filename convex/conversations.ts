import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function assertNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

export const getConversationByWaUserId = query({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();
  },
});

export const upsertConversationOptionMap = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.union(v.string(), v.number()),
    date: v.string(),
    optionMap: v.array(
      v.object({
        index: v.number(),
        startTimeId: v.optional(v.union(v.string(), v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    assertNonEmptyString(args.date, "date");
    if (typeof args.activityId === "string") {
      assertNonEmptyString(args.activityId, "activityId");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActivityId: String(args.activityId),
        lastDate: args.date,
        lastOptionMap: args.optionMap,
        lastOptionMapUpdatedAt: now,
        updatedAt: now,
      });

      return existing._id;
    }

    return ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      lastActivityId: String(args.activityId),
      lastDate: args.date,
      lastOptionMap: args.optionMap,
      lastOptionMapUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertConversationPickupOptionMap = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.union(v.string(), v.number()),
    date: v.string(),
    pickupOptionMap: v.array(
      v.object({
        index: v.number(),
        pickupPlaceId: v.optional(v.union(v.string(), v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    assertNonEmptyString(args.date, "date");
    if (typeof args.activityId === "string") {
      assertNonEmptyString(args.activityId, "activityId");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActivityId: String(args.activityId),
        lastDate: args.date,
        lastPickupOptionMap: args.pickupOptionMap,
        lastPickupOptionMapUpdatedAt: now,
        updatedAt: now,
      });

      return existing._id;
    }

    return ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      lastActivityId: String(args.activityId),
      lastDate: args.date,
      lastPickupOptionMap: args.pickupOptionMap,
      lastPickupOptionMapUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setLastActivityId = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.string(),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    assertNonEmptyString(args.activityId, "activityId");

    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActivityId: args.activityId,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      lastActivityId: args.activityId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setHandoffState = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    handoffState: v.union(v.literal("active"), v.literal("idle")),
    handoffOperatorMessageId: v.optional(v.number()),
    handoffChannel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");

    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    const patch: Record<string, unknown> = {
      handoffState: args.handoffState,
      updatedAt: now,
    };
    if (args.handoffOperatorMessageId !== undefined) {
      patch.handoffOperatorMessageId = args.handoffOperatorMessageId;
    }
    if (args.handoffChannel !== undefined) {
      patch.handoffChannel = args.handoffChannel;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      handoffState: args.handoffState,
      handoffOperatorMessageId: args.handoffOperatorMessageId,
      handoffChannel: args.handoffChannel,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const clearHandoff = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (!existing) return false;

    await ctx.db.patch(existing._id, {
      handoffState: undefined,
      handoffOperatorMessageId: undefined,
      handoffChannel: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const getByHandoffOperatorMessageId = query({
  args: {
    tenantId: v.id("tenants"),
    handoffOperatorMessageId: v.number(),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId)
      )
      .collect();

    return conversations.find(
      (c) => c.handoffOperatorMessageId === args.handoffOperatorMessageId
    ) ?? null;
  },
});

export const clearConversationOptionMap = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (!existing) {
      return false;
    }

    await ctx.db.patch(existing._id, {
      lastActivityId: undefined,
      lastDate: undefined,
      lastOptionMap: undefined,
      lastOptionMapUpdatedAt: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const clearConversationPickupOptionMap = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (!existing) {
      return false;
    }

    await ctx.db.patch(existing._id, {
      lastPickupOptionMap: undefined,
      lastPickupOptionMapUpdatedAt: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const setPendingAction = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    pendingAction: v.union(v.literal("cancel_code"), v.literal("edit_code")),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pendingAction: args.pendingAction,
        pendingActionUpdatedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      pendingAction: args.pendingAction,
      pendingActionUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const clearPendingAction = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (!existing) return false;

    await ctx.db.patch(existing._id, {
      pendingAction: undefined,
      pendingActionUpdatedAt: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});
