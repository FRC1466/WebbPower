export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
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
}[]>>;
export declare const listByEvent: import("convex/server").RegisteredQuery<"public", {
    eventId: import("convex/values").GenericId<"events">;
}, Promise<{
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
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"sessions">;
}, Promise<{
    session: {
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
    };
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
    } | null;
    match: {
        _id: import("convex/values").GenericId<"matches">;
        _creationTime: number;
        setNumber?: number | undefined;
        scheduledTime?: number | undefined;
        actualTime?: number | undefined;
        alliance?: string | undefined;
        tbaMatchKey: string;
        eventKey: string;
        matchNumber: number;
        compLevel: string;
    } | null;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
    matchId?: import("convex/values").GenericId<"matches"> | undefined;
    eventId?: import("convex/values").GenericId<"events"> | undefined;
    startedAt: number;
    label: string;
    source: "live" | "dslog" | "wpilog";
    sampleRateHz: number;
    channels: number[];
}, Promise<import("convex/values").GenericId<"sessions">>>;
export declare const finalize: import("convex/server").RegisteredMutation<"public", {
    peakTotalCurrent?: number | undefined;
    avgVoltage?: number | undefined;
    energyJoules?: number | undefined;
    brownoutCount?: number | undefined;
    id: import("convex/values").GenericId<"sessions">;
    endedAt: number;
}, Promise<void>>;
export declare const setImportProgress: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"sessions">;
    progress: number;
}, Promise<void>>;
export declare const tag: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
    matchId?: import("convex/values").GenericId<"matches"> | undefined;
    eventId?: import("convex/values").GenericId<"events"> | undefined;
    id: import("convex/values").GenericId<"sessions">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"sessions">;
}, Promise<void>>;
export declare const appendSampleWindow: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"sessions">;
    windowIndex: number;
    startMs: number;
    samples: {
        topics?: Record<string, number> | undefined;
        can?: number | undefined;
        mode?: string | undefined;
        t: number;
        v: number;
        c: number[];
    }[];
}, Promise<void>>;
export declare const listWindows: import("convex/server").RegisteredQuery<"public", {
    sessionId: import("convex/values").GenericId<"sessions">;
}, Promise<{
    _id: import("convex/values").GenericId<"sampleWindows">;
    _creationTime: number;
    sessionId: import("convex/values").GenericId<"sessions">;
    windowIndex: number;
    startMs: number;
    samples: {
        topics?: Record<string, number> | undefined;
        can?: number | undefined;
        mode?: string | undefined;
        t: number;
        v: number;
        c: number[];
    }[];
}[]>>;
export declare const recentLive: import("convex/server").RegisteredQuery<"public", {
    sinceMs?: number | undefined;
    sessionId: import("convex/values").GenericId<"sessions">;
}, Promise<{
    _id: import("convex/values").GenericId<"liveBuffers">;
    _creationTime: number;
    mode?: string | undefined;
    canUtil?: number | undefined;
    matchTime?: number | undefined;
    sessionId: import("convex/values").GenericId<"sessions">;
    capturedAt: number;
    voltage: number;
    totalCurrent: number;
    channelCurrents: number[];
}[]>>;
export declare const appendLive: import("convex/server").RegisteredMutation<"public", {
    mode?: string | undefined;
    canUtil?: number | undefined;
    matchTime?: number | undefined;
    sessionId: import("convex/values").GenericId<"sessions">;
    capturedAt: number;
    voltage: number;
    totalCurrent: number;
    channelCurrents: number[];
}, Promise<void>>;
