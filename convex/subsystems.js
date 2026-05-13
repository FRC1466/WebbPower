import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
async function requireAdmin(ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId)
        throw new Error("Not authenticated");
    const role = await ctx.db
        .query("roles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (role?.role !== "admin")
        throw new Error("Admin only");
}
const baseFields = {
    channel: v.optional(v.number()),
    topicPaths: v.optional(v.array(v.string())),
    name: v.string(),
    robotId: v.optional(v.id("robots")),
    deviceType: v.string(),
    controller: v.string(),
    nominalCurrent: v.number(),
    stallCurrent: v.number(),
    supplyLimit: v.number(),
    notes: v.optional(v.string()),
};
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("subsystems").collect();
    },
});
export const listForRobot = query({
    args: { robotId: v.id("robots") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("subsystems")
            .withIndex("by_robot", (q) => q.eq("robotId", args.robotId))
            .collect();
    },
});
export const create = mutation({
    args: baseFields,
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.insert("subsystems", args);
    },
});
export const update = mutation({
    args: { id: v.id("subsystems"), ...baseFields },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const { id, ...rest } = args;
        await ctx.db.patch(id, rest);
    },
});
export const remove = mutation({
    args: { id: v.id("subsystems") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
    },
});
// Bulk-create subsystems from a topic mapping (used by the "Import from log" flow).
export const createFromTopics = mutation({
    args: {
        robotId: v.optional(v.id("robots")),
        subsystems: v.array(v.object({
            name: v.string(),
            topicPaths: v.array(v.string()),
            deviceType: v.optional(v.string()),
            controller: v.optional(v.string()),
            nominalCurrent: v.optional(v.number()),
            stallCurrent: v.optional(v.number()),
            supplyLimit: v.optional(v.number()),
        })),
        replaceExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        if (args.replaceExisting) {
            const existing = await ctx.db.query("subsystems").collect();
            for (const s of existing)
                await ctx.db.delete(s._id);
        }
        let inserted = 0;
        for (const s of args.subsystems) {
            await ctx.db.insert("subsystems", {
                name: s.name,
                robotId: args.robotId,
                topicPaths: s.topicPaths,
                deviceType: s.deviceType ?? "Unknown",
                controller: s.controller ?? "Unknown",
                nominalCurrent: s.nominalCurrent ?? 20,
                stallCurrent: s.stallCurrent ?? 300,
                supplyLimit: s.supplyLimit ?? 60,
            });
            inserted++;
        }
        return { inserted };
    },
});
