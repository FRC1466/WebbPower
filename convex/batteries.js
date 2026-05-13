import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
async function requireAuth(ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId)
        throw new Error("Not authenticated");
    return userId;
}
async function requireWriteRole(ctx) {
    const userId = await requireAuth(ctx);
    const role = await ctx.db
        .query("roles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (role?.role !== "admin" && role?.role !== "pit") {
        throw new Error("Admin or pit role required");
    }
    return { userId, role: role.role };
}
async function requireAdmin(ctx) {
    const userId = await requireAuth(ctx);
    const role = await ctx.db
        .query("roles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (role?.role !== "admin")
        throw new Error("Admin only");
}
function healthScore(restingVoltage, internalResistance) {
    if (restingVoltage == null || internalResistance == null)
        return undefined;
    let v = 0;
    if (restingVoltage >= 12.9)
        v = 50;
    else if (restingVoltage >= 12.7)
        v = 40;
    else if (restingVoltage >= 12.5)
        v = 25;
    else
        v = 10;
    let r = 0;
    if (internalResistance < 13)
        r = 50;
    else if (internalResistance < 18)
        r = 30;
    else if (internalResistance < 22)
        r = 15;
    else
        r = 5;
    return Math.max(0, Math.min(100, v + r));
}
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("batteries").collect();
    },
});
export const get = query({
    args: { id: v.id("batteries") },
    handler: async (ctx, args) => {
        const battery = await ctx.db.get(args.id);
        if (!battery)
            return null;
        const measurements = await ctx.db
            .query("batteryMeasurements")
            .withIndex("by_battery", (q) => q.eq("batteryId", args.id))
            .order("desc")
            .take(200);
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_battery", (q) => q.eq("batteryId", args.id))
            .order("desc")
            .take(100);
        return { battery, measurements, sessions };
    },
});
export const create = mutation({
    args: {
        label: v.string(),
        nickname: v.optional(v.string()),
        manufacturer: v.optional(v.string()),
        model: v.optional(v.string()),
        purchasedAt: v.optional(v.number()),
        firstUsedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        return await ctx.db.insert("batteries", {
            ...args,
            cycleCount: 0,
            status: "rotation",
        });
    },
});
export const update = mutation({
    args: {
        id: v.id("batteries"),
        label: v.optional(v.string()),
        nickname: v.optional(v.string()),
        notes: v.optional(v.string()),
        status: v.optional(v.union(v.literal("rotation"), v.literal("reserved"), v.literal("charging"), v.literal("retired"))),
    },
    handler: async (ctx, args) => {
        await requireWriteRole(ctx);
        const { id, ...rest } = args;
        const filtered = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, filtered);
    },
});
export const remove = mutation({
    args: { id: v.id("batteries") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
    },
});
export const addMeasurement = mutation({
    args: {
        batteryId: v.id("batteries"),
        measuredAt: v.optional(v.number()),
        restingVoltage: v.number(),
        internalResistance: v.number(),
        cca: v.optional(v.number()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireWriteRole(ctx);
        const measuredAt = args.measuredAt ?? Date.now();
        const id = await ctx.db.insert("batteryMeasurements", {
            batteryId: args.batteryId,
            measuredAt,
            restingVoltage: args.restingVoltage,
            internalResistance: args.internalResistance,
            cca: args.cca,
            notes: args.notes,
            enteredByUserId: userId,
        });
        const score = healthScore(args.restingVoltage, args.internalResistance);
        await ctx.db.patch(args.batteryId, {
            lastRestingVoltage: args.restingVoltage,
            lastInternalResistance: args.internalResistance,
            healthScore: score,
        });
        // Auto-resolve any open health alerts whose underlying condition has
        // recovered. A new measurement is the only event that can change health,
        // so this is the right place to sweep.
        const openAlerts = await ctx.db
            .query("alerts")
            .withIndex("by_battery", (q) => q.eq("batteryId", args.batteryId))
            .filter((q) => q.eq(q.field("resolvedAt"), undefined))
            .collect();
        for (const a of openAlerts) {
            const recovered = (a.kind === "battery_health_low" && score != null && score >= 30) ||
                (a.kind === "battery_health_questionable" &&
                    score != null &&
                    score >= 50);
            if (recovered) {
                await ctx.db.patch(a._id, {
                    resolvedAt: Date.now(),
                    resolvedReason: `Recovered (health ${score})`,
                    resolvedByUserId: userId,
                });
            }
        }
        // Emit fresh alerts when the new measurement crosses a bad threshold.
        if (score != null && score < 30) {
            await ctx.db.insert("alerts", {
                severity: "critical",
                kind: "battery_health_low",
                message: `Battery ${(await ctx.db.get(args.batteryId))?.label ?? ""} health dropped to ${score}`,
                batteryId: args.batteryId,
                occurredAt: Date.now(),
                dedupeKey: `battery_health_low:${args.batteryId}:${new Date(measuredAt).toDateString()}`,
            });
        }
        else if (score != null && score < 50) {
            await ctx.db.insert("alerts", {
                severity: "warning",
                kind: "battery_health_questionable",
                message: `Battery health is questionable (${score})`,
                batteryId: args.batteryId,
                occurredAt: Date.now(),
                dedupeKey: `battery_health_questionable:${args.batteryId}:${new Date(measuredAt).toDateString()}`,
            });
        }
        return id;
    },
});
