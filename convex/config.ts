import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_BROWNOUT_THRESHOLD = 6.75;
const DEFAULT_NT4_HOST = "roborio-1466-frc.local";

async function requireAdmin(ctx: { db: any }, userId: string | null) {
  if (!userId) throw new Error("Not authenticated");
  const role = await ctx.db
    .query("roles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (role?.role !== "admin") throw new Error("Admin only");
}

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const cfg = await ctx.db.query("config").first();
    if (cfg) return cfg;
    return {
      _id: null,
      tbaEventKey: undefined,
      tbaTeamKey: undefined,
      pdType: "PDH" as const,
      brownoutThreshold:
        Number(process.env.BROWNOUT_THRESHOLD_V) || DEFAULT_BROWNOUT_THRESHOLD,
      nt4Host: process.env.NT4_DEFAULT_HOST || DEFAULT_NT4_HOST,
      updatedAt: 0,
    };
  },
});

export const upsertConfig = mutation({
  args: {
    tbaEventKey: v.optional(v.string()),
    tbaTeamKey: v.optional(v.string()),
    pdType: v.union(v.literal("PDH"), v.literal("PDP")),
    brownoutThreshold: v.number(),
    nt4Host: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await requireAdmin(ctx, userId);
    const existing = await ctx.db.query("config").first();
    const data = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("config", data);
    }
  },
});
