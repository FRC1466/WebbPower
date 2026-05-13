export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"batteries">;
    _creationTime: number;
    notes?: string | undefined;
    nickname?: string | undefined;
    manufacturer?: string | undefined;
    model?: string | undefined;
    purchasedAt?: number | undefined;
    firstUsedAt?: number | undefined;
    lastRestingVoltage?: number | undefined;
    lastInternalResistance?: number | undefined;
    healthScore?: number | undefined;
    label: string;
    cycleCount: number;
    status: "rotation" | "reserved" | "charging" | "retired";
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"batteries">;
}, Promise<{
    battery: {
        _id: import("convex/values").GenericId<"batteries">;
        _creationTime: number;
        notes?: string | undefined;
        nickname?: string | undefined;
        manufacturer?: string | undefined;
        model?: string | undefined;
        purchasedAt?: number | undefined;
        firstUsedAt?: number | undefined;
        lastRestingVoltage?: number | undefined;
        lastInternalResistance?: number | undefined;
        healthScore?: number | undefined;
        label: string;
        cycleCount: number;
        status: "rotation" | "reserved" | "charging" | "retired";
    };
    measurements: {
        _id: import("convex/values").GenericId<"batteryMeasurements">;
        _creationTime: number;
        notes?: string | undefined;
        cca?: number | undefined;
        enteredByUserId?: import("convex/values").GenericId<"users"> | undefined;
        batteryId: import("convex/values").GenericId<"batteries">;
        measuredAt: number;
        restingVoltage: number;
        internalResistance: number;
    }[];
    sessions: {
        _id: import("convex/values").GenericId<"sessions">;
        _creationTime: number;
        notes?: string | undefined;
        batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
        endedAt?: number | undefined;
        matchId?: import("convex/values").GenericId<"matches"> | undefined;
        eventId?: import("convex/values").GenericId<"events"> | undefined;
        peakTotalCurrent?: number | undefined;
        avgVoltage?: number | undefined;
        energyJoules?: number | undefined;
        brownoutCount?: number | undefined;
        importProgress?: number | undefined;
        importDone?: boolean | undefined;
        startedAt: number;
        label: string;
        source: "live" | "dslog" | "wpilog";
        sampleRateHz: number;
        channels: number[];
    }[];
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    nickname?: string | undefined;
    manufacturer?: string | undefined;
    model?: string | undefined;
    purchasedAt?: number | undefined;
    firstUsedAt?: number | undefined;
    label: string;
}, Promise<import("convex/values").GenericId<"batteries">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    label?: string | undefined;
    nickname?: string | undefined;
    status?: "rotation" | "reserved" | "charging" | "retired" | undefined;
    id: import("convex/values").GenericId<"batteries">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"batteries">;
}, Promise<void>>;
export declare const addMeasurement: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    measuredAt?: number | undefined;
    cca?: number | undefined;
    batteryId: import("convex/values").GenericId<"batteries">;
    restingVoltage: number;
    internalResistance: number;
}, Promise<import("convex/values").GenericId<"batteryMeasurements">>>;
