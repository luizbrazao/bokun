import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getRecentMessages = query({
    args: {
        tenantId: v.id("tenants"),
        waUserId: v.string(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chat_messages")
            .withIndex("by_tenantId_waUserId", (q) =>
                q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
            )
            .order("desc")
            .take(args.limit);

        // Return in chronological order (oldest first)
        return messages.reverse();
    },
});

export const addMessage = mutation({
    args: {
        tenantId: v.id("tenants"),
        waUserId: v.string(),
        role: v.union(
            v.literal("user"),
            v.literal("assistant"),
            v.literal("system"),
            v.literal("tool")
        ),
        content: v.string(),
        toolCalls: v.optional(v.string()),
        toolCallId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return ctx.db.insert("chat_messages", {
            tenantId: args.tenantId,
            waUserId: args.waUserId,
            role: args.role,
            content: args.content,
            toolCalls: args.toolCalls,
            toolCallId: args.toolCallId,
            createdAt: Date.now(),
        });
    },
});

export const addMessages = mutation({
    args: {
        tenantId: v.id("tenants"),
        waUserId: v.string(),
        messages: v.array(
            v.object({
                role: v.union(
                    v.literal("user"),
                    v.literal("assistant"),
                    v.literal("system"),
                    v.literal("tool")
                ),
                content: v.string(),
                toolCalls: v.optional(v.string()),
                toolCallId: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const ids: string[] = [];

        for (let i = 0; i < args.messages.length; i++) {
            const msg = args.messages[i];
            const id = await ctx.db.insert("chat_messages", {
                tenantId: args.tenantId,
                waUserId: args.waUserId,
                role: msg.role,
                content: msg.content,
                toolCalls: msg.toolCalls,
                toolCallId: msg.toolCallId,
                createdAt: now + i, // Ensure ordering within batch
            });
            ids.push(id);
        }

        return ids;
    },
});

export const clearHistory = mutation({
    args: {
        tenantId: v.id("tenants"),
        waUserId: v.string(),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chat_messages")
            .withIndex("by_tenantId_waUserId", (q) =>
                q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
            )
            .collect();

        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }

        return { deleted: messages.length };
    },
});
