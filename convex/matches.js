import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
export const list = query({
    args: { eventKey: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.eventKey) {
            return await ctx.db
                .query("matches")
                .withIndex("by_event", (q) => q.eq("eventKey", args.eventKey))
                .collect();
        }
        return await ctx.db.query("matches").collect();
    },
});
export const get = query({
    args: { id: v.id("matches") },
    handler: async (ctx, args) => ctx.db.get(args.id),
});
export const upsertMatch = mutation({
    args: {
        tbaMatchKey: v.string(),
        eventKey: v.string(),
        matchNumber: v.number(),
        setNumber: v.optional(v.number()),
        compLevel: v.string(),
        scheduledTime: v.optional(v.number()),
        actualTime: v.optional(v.number()),
        alliance: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            throw new Error("Not authenticated");
        const existing = await ctx.db
            .query("matches")
            .withIndex("by_match_key", (q) => q.eq("tbaMatchKey", args.tbaMatchKey))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, args);
            return existing._id;
        }
        return await ctx.db.insert("matches", args);
    },
});
