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
        throw new Error("Admin role required");
    return userId;
}
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("robots").collect();
    },
});
export const get = query({
    args: { id: v.id("robots") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
export const create = mutation({
    args: {
        name: v.string(),
        pdType: v.union(v.literal("PDH"), v.literal("PDP")),
        brownoutThreshold: v.number(),
        nt4Host: v.string(),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.insert("robots", args);
    },
});
export const update = mutation({
    args: {
        id: v.id("robots"),
        name: v.optional(v.string()),
        pdType: v.optional(v.union(v.literal("PDH"), v.literal("PDP"))),
        brownoutThreshold: v.optional(v.number()),
        nt4Host: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const { id, ...rest } = args;
        await ctx.db.patch(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    },
});
export const remove = mutation({
    args: { id: v.id("robots") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
    },
});
