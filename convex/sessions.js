import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
async function requireWriteRole(ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId)
        throw new Error("Not authenticated");
    const role = await ctx.db
        .query("roles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (role?.role !== "admin" && role?.role !== "pit") {
        throw new Error("Admin or pit role required");
    }
    return userId;
}
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("sessions")
            .withIndex("by_started")
            .order("desc")
            .take(200);
    },
});
export const listByEvent = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("sessions")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .order("desc")
            .collect();
    },
});
export const get = query({
    args: { id: v.id("sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.id);
        if (!session)
            return null;
        const battery = session.batteryId
            ? await ctx.db.get(session.batteryId)
            : null;
        const match = session.matchId ? await ctx.db.get(session.matchId) : null;
        return { session, battery, match };
    },
});
export const create = mutation({
    args: {
        label: v.string(),
        source: v.union(v.literal("live"), v.literal("dslog"), v.literal("wpilog")),
        startedAt: v.number(),
        sampleRateHz: v.number(),
        channels: v.array(v.number()),
        batteryId: v.optional(v.id("batteries")),
        matchId: v.optional(v.id("matches")),
        eventId: v.optional(v.id("events")),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        return await ctx.db.insert("sessions", {
            ...args,
            importProgress: 0,
            importDone: args.source === "live" ? true : false,
        });
    },
});
export const finalize = mutation({
    args: {
        id: v.id("sessions"),
        endedAt: v.number(),
        peakTotalCurrent: v.optional(v.number()),
        avgVoltage: v.optional(v.number()),
        energyJoules: v.optional(v.number()),
        brownoutCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        const { id, ...rest } = args;
        await ctx.db.patch(id, { ...rest, importDone: true, importProgress: 1 });
    },
});
export const setImportProgress = mutation({
    args: { id: v.id("sessions"), progress: v.number() },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        await ctx.db.patch(args.id, { importProgress: args.progress });
    },
});
export const tag = mutation({
    args: {
        id: v.id("sessions"),
        batteryId: v.optional(v.id("batteries")),
        matchId: v.optional(v.id("matches")),
        eventId: v.optional(v.id("events")),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        const { id, ...rest } = args;
        await ctx.db.patch(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    },
});
export const remove = mutation({
    args: { id: v.id("sessions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            throw new Error("Not authenticated");
        const role = await ctx.db
            .query("roles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
        if (role?.role !== "admin")
            throw new Error("Admin only");
        const windows = await ctx.db
            .query("sampleWindows")
            .withIndex("by_session", (q) => q.eq("sessionId", args.id))
            .collect();
        for (const w of windows) {
            await ctx.db.delete(w._id);
        }
        await ctx.db.delete(args.id);
    },
});
export const appendSampleWindow = mutation({
    args: {
        sessionId: v.id("sessions"),
        windowIndex: v.number(),
        startMs: v.number(),
        samples: v.array(v.object({
            t: v.number(),
            v: v.number(),
            c: v.array(v.number()),
            topics: v.optional(v.record(v.string(), v.number())),
            can: v.optional(v.number()),
            mode: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        await ctx.db.insert("sampleWindows", args);
    },
});
export const listWindows = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("sampleWindows")
            .withIndex("by_session_window", (q) => q.eq("sessionId", args.sessionId))
            .collect();
    },
});
export const recentLive = query({
    args: { sessionId: v.id("sessions"), sinceMs: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const cutoff = args.sinceMs ?? Date.now() - 30_000;
        return await ctx.db
            .query("liveBuffers")
            .withIndex("by_session_time", (q) => q.eq("sessionId", args.sessionId).gte("capturedAt", cutoff))
            .collect();
    },
});
export const appendLive = mutation({
    args: {
        sessionId: v.id("sessions"),
        capturedAt: v.number(),
        voltage: v.number(),
        totalCurrent: v.number(),
        channelCurrents: v.array(v.number()),
        canUtil: v.optional(v.number()),
        mode: v.optional(v.string()),
        matchTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        await ctx.db.insert("liveBuffers", args);
        // Trim older than 60s to keep table small.
        const cutoff = Date.now() - 60_000;
        const old = await ctx.db
            .query("liveBuffers")
            .withIndex("by_session_time", (q) => q.eq("sessionId", args.sessionId).lt("capturedAt", cutoff))
            .take(50);
        for (const o of old)
            await ctx.db.delete(o._id);
    },
});
