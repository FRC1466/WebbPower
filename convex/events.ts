import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: { db: any }) {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) throw new Error("Not authenticated");
  const role = await ctx.db
    .query("roles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (role?.role !== "admin") throw new Error("Admin role required");
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_started")
      .order("desc")
      .collect();
  },
});

export const listForRobot = query({
  args: { robotId: v.id("robots") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_robot", (q) => q.eq("robotId", args.robotId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    robotId: v.id("robots"),
    tbaEventKey: v.optional(v.string()),
    startedAt: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("events", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    name: v.optional(v.string()),
    robotId: v.optional(v.id("robots")),
    tbaEventKey: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(
      id,
      Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
    );
  },
});

export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
