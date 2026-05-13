import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
// Thresholds match batteries.ts healthScore() bands.
const HEALTH_LOW_THRESHOLD = 30;
const HEALTH_QUESTIONABLE_THRESHOLD = 50;
export const list = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("alerts")
            .withIndex("by_occurred")
            .order("desc")
            .take(args.limit ?? 200);
        return await Promise.all(rows.map(async (a) => {
            const [battery, session, subsystem, match] = await Promise.all([
                a.batteryId ? ctx.db.get(a.batteryId) : null,
                a.sessionId ? ctx.db.get(a.sessionId) : null,
                a.subsystemId ? ctx.db.get(a.subsystemId) : null,
                a.matchId ? ctx.db.get(a.matchId) : null,
            ]);
            // Compute stale-ness for state assertions whose underlying condition
            // may have recovered since the alert was emitted. Event alerts
            // (brownout, near_brownout, can_high) are historical and never stale.
            let isStale = false;
            if (!a.resolvedAt && battery) {
                const score = battery.healthScore ?? 0;
                if (a.kind === "battery_health_low" && score >= HEALTH_LOW_THRESHOLD) {
                    isStale = true;
                }
                else if (a.kind === "battery_health_questionable" &&
                    score >= HEALTH_QUESTIONABLE_THRESHOLD) {
                    isStale = true;
                }
            }
            return {
                ...a,
                battery: battery
                    ? {
                        _id: battery._id,
                        label: battery.label,
                        nickname: battery.nickname,
                        healthScore: battery.healthScore,
                    }
                    : null,
                session: session
                    ? {
                        _id: session._id,
                        label: session.label,
                        startedAt: session.startedAt,
                    }
                    : null,
                subsystem: subsystem
                    ? { _id: subsystem._id, name: subsystem.name }
                    : null,
                match: match
                    ? {
                        _id: match._id,
                        tbaMatchKey: match.tbaMatchKey,
                        matchNumber: match.matchNumber,
                        compLevel: match.compLevel,
                    }
                    : null,
                isStale,
            };
        }));
    },
});
export const emit = mutation({
    args: {
        severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
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
        if (!userId)
            return; // silently ignore if no auth
        if (args.dedupeKey) {
            const existing = await ctx.db
                .query("alerts")
                .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
                .first();
            if (existing)
                return existing._id;
        }
        return await ctx.db.insert("alerts", {
            ...args,
            occurredAt: Date.now(),
        });
    },
});
export const resolve = mutation({
    args: {
        id: v.id("alerts"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            throw new Error("Not authenticated");
        await ctx.db.patch(args.id, {
            resolvedAt: Date.now(),
            resolvedReason: args.reason,
            resolvedByUserId: userId,
        });
    },
});
export const unresolve = mutation({
    args: { id: v.id("alerts") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            throw new Error("Not authenticated");
        await ctx.db.patch(args.id, {
            resolvedAt: undefined,
            resolvedReason: undefined,
            resolvedByUserId: undefined,
        });
    },
});
// Bulk-resolve every currently-stale alert in one click.
// Used by the "Sweep stale" admin action on the Alerts page.
export const resolveStale = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            throw new Error("Not authenticated");
        const rows = await ctx.db.query("alerts").collect();
        let count = 0;
        for (const a of rows) {
            if (a.resolvedAt || !a.batteryId)
                continue;
            const battery = await ctx.db.get(a.batteryId);
            if (!battery)
                continue;
            const score = battery.healthScore ?? 0;
            const stale = (a.kind === "battery_health_low" && score >= HEALTH_LOW_THRESHOLD) ||
                (a.kind === "battery_health_questionable" &&
                    score >= HEALTH_QUESTIONABLE_THRESHOLD);
            if (!stale)
                continue;
            await ctx.db.patch(a._id, {
                resolvedAt: Date.now(),
                resolvedReason: "Condition no longer applies",
                resolvedByUserId: userId,
            });
            count++;
        }
        return { resolved: count };
    },
});
