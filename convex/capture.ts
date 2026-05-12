import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const LOCK_KEY = "robot";
const STALE_AFTER_MS = 15_000;

export const getLock = query({
  args: {},
  handler: async (ctx) => {
    const lock = await ctx.db
      .query("captureLocks")
      .withIndex("by_key", (q) => q.eq("key", LOCK_KEY))
      .first();
    if (!lock) return null;
    const stale = Date.now() - lock.heartbeatAt > STALE_AFTER_MS;
    return { ...lock, stale };
  },
});

export const claim = mutation({
  args: {
    sessionId: v.id("sessions"),
    deviceId: v.string(),
    deviceLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (role?.role !== "admin" && role?.role !== "pit") {
      throw new Error("Admin or pit role required to capture");
    }
    const existing = await ctx.db
      .query("captureLocks")
      .withIndex("by_key", (q) => q.eq("key", LOCK_KEY))
      .first();
    const now = Date.now();
    if (existing) {
      const stale = now - existing.heartbeatAt > STALE_AFTER_MS;
      if (!stale && existing.deviceId !== args.deviceId) {
        throw new Error("Capture lock held by another device");
      }
      await ctx.db.patch(existing._id, {
        sessionId: args.sessionId,
        deviceId: args.deviceId,
        deviceLabel: args.deviceLabel,
        userId,
        heartbeatAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("captureLocks", {
      key: LOCK_KEY,
      sessionId: args.sessionId,
      deviceId: args.deviceId,
      deviceLabel: args.deviceLabel,
      userId,
      heartbeatAt: now,
    });
  },
});

export const heartbeat = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("captureLocks")
      .withIndex("by_key", (q) => q.eq("key", LOCK_KEY))
      .first();
    if (!existing) return;
    if (existing.deviceId !== args.deviceId) return;
    await ctx.db.patch(existing._id, { heartbeatAt: Date.now() });
  },
});

export const takeover = mutation({
  args: {
    sessionId: v.id("sessions"),
    deviceId: v.string(),
    deviceLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (role?.role !== "admin" && role?.role !== "pit") {
      throw new Error("Admin or pit role required to take over");
    }
    const existing = await ctx.db
      .query("captureLocks")
      .withIndex("by_key", (q) => q.eq("key", LOCK_KEY))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionId: args.sessionId,
        deviceId: args.deviceId,
        deviceLabel: args.deviceLabel,
        userId,
        heartbeatAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("captureLocks", {
      key: LOCK_KEY,
      sessionId: args.sessionId,
      deviceId: args.deviceId,
      deviceLabel: args.deviceLabel,
      userId,
      heartbeatAt: Date.now(),
    });
  },
});

export const release = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("captureLocks")
      .withIndex("by_key", (q) => q.eq("key", LOCK_KEY))
      .first();
    if (existing && existing.deviceId === args.deviceId) {
      await ctx.db.delete(existing._id);
    }
  },
});
