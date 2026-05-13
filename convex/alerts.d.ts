export declare const list: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    battery: {
        _id: import("convex/values").GenericId<"batteries">;
        label: string;
        nickname: string | undefined;
        healthScore: number | undefined;
    } | null;
    session: {
        _id: import("convex/values").GenericId<"sessions">;
        label: string;
        startedAt: number;
    } | null;
    subsystem: {
        _id: import("convex/values").GenericId<"subsystems">;
        name: string;
    } | null;
    match: {
        _id: import("convex/values").GenericId<"matches">;
        tbaMatchKey: string;
        matchNumber: number;
        compLevel: string;
    } | null;
    isStale: boolean;
    _id: import("convex/values").GenericId<"alerts">;
    _creationTime: number;
    batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
    matchId?: import("convex/values").GenericId<"matches"> | undefined;
    sessionId?: import("convex/values").GenericId<"sessions"> | undefined;
    subsystemId?: import("convex/values").GenericId<"subsystems"> | undefined;
    dedupeKey?: string | undefined;
    resolvedAt?: number | undefined;
    resolvedReason?: string | undefined;
    resolvedByUserId?: import("convex/values").GenericId<"users"> | undefined;
    severity: "info" | "warning" | "critical";
    message: string;
    occurredAt: number;
    kind: string;
}[]>>;
export declare const emit: import("convex/server").RegisteredMutation<"public", {
    batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
    matchId?: import("convex/values").GenericId<"matches"> | undefined;
    sessionId?: import("convex/values").GenericId<"sessions"> | undefined;
    subsystemId?: import("convex/values").GenericId<"subsystems"> | undefined;
    dedupeKey?: string | undefined;
    severity: "info" | "warning" | "critical";
    message: string;
    kind: string;
}, Promise<import("convex/values").GenericId<"alerts"> | undefined>>;
export declare const resolve: import("convex/server").RegisteredMutation<"public", {
    reason?: string | undefined;
    id: import("convex/values").GenericId<"alerts">;
}, Promise<void>>;
export declare const unresolve: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"alerts">;
}, Promise<void>>;
export declare const resolveStale: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    resolved: number;
}>>;
