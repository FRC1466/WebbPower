export declare const getLock: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    stale: boolean;
    _id: import("convex/values").GenericId<"captureLocks">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users"> | undefined;
    sessionId: import("convex/values").GenericId<"sessions">;
    key: string;
    deviceId: string;
    deviceLabel: string;
    heartbeatAt: number;
} | null>>;
export declare const claim: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"sessions">;
    deviceId: string;
    deviceLabel: string;
}, Promise<import("convex/values").GenericId<"captureLocks">>>;
export declare const heartbeat: import("convex/server").RegisteredMutation<"public", {
    deviceId: string;
}, Promise<void>>;
export declare const takeover: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"sessions">;
    deviceId: string;
    deviceLabel: string;
}, Promise<import("convex/values").GenericId<"captureLocks">>>;
export declare const release: import("convex/server").RegisteredMutation<"public", {
    deviceId: string;
}, Promise<void>>;
