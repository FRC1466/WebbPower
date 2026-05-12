import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      _id: user._id,
      email: (user as { email?: string }).email,
      name: (user as { name?: string }).name,
      isAnonymous: (user as { isAnonymous?: boolean }).isAnonymous ?? false,
      role: role?.role ?? "viewer",
    };
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("pit"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const callerRole = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .first();
    const anyAdmin = await ctx.db.query("roles").first();
    // First role assignment is always allowed (bootstrapping the first admin).
    // After that, only admins may change roles.
    if (anyAdmin && callerRole?.role !== "admin") {
      throw new Error("Only admins can change roles");
    }
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("roles", { userId: args.userId, role: args.role });
    }
  },
});

export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if ((user as { isAnonymous?: boolean })?.isAnonymous) {
      throw new Error("Anonymous users cannot claim admin");
    }
    const anyAdmin = await ctx.db.query("roles").first();
    if (anyAdmin) throw new Error("An admin already exists");
    await ctx.db.insert("roles", { userId, role: "admin" });
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const callerRole = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (callerRole?.role !== "admin") return [];
    const users = await ctx.db.query("users").collect();
    const roles = await ctx.db.query("roles").collect();
    const rolesByUser = new Map(roles.map((r) => [r.userId, r.role]));
    return users.map((u) => ({
      _id: u._id,
      email: (u as { email?: string }).email,
      name: (u as { name?: string }).name,
      isAnonymous: (u as { isAnonymous?: boolean }).isAnonymous ?? false,
      role: rolesByUser.get(u._id) ?? "viewer",
    }));
  },
});
