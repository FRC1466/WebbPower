import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alerts")
      .withIndex("by_occurred")
      .order("desc")
      .take(args.limit ?? 200);
  },
});

export const emit = mutation({
  args: {
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical"),
    ),
    kind: v.string(),
    message: v.string(),
    sessionId: v.optional(v.id("sessions")),
    subsystemId: v.optional(v.id("subsystems")),
    matchId: v.optional(v.id("matches")),
    batteryId: v.optional(v.id("batteries")),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // silently ignore if no auth
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("alerts")
        .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
        .first();
      if (existing) return existing._id;
    }
    return await ctx.db.insert("alerts", {
      ...args,
      occurredAt: Date.now(),
    });
  },
});
