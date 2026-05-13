export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"events">;
    _creationTime: number;
    tbaEventKey?: string | undefined;
    notes?: string | undefined;
    name: string;
    robotId: import("convex/values").GenericId<"robots">;
    startedAt: number;
}[]>>;
export declare const listForRobot: import("convex/server").RegisteredQuery<"public", {
    robotId: import("convex/values").GenericId<"robots">;
}, Promise<{
    _id: import("convex/values").GenericId<"events">;
    _creationTime: number;
    tbaEventKey?: string | undefined;
    notes?: string | undefined;
    name: string;
    robotId: import("convex/values").GenericId<"robots">;
    startedAt: number;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    tbaEventKey?: string | undefined;
    notes?: string | undefined;
    name: string;
    robotId: import("convex/values").GenericId<"robots">;
    startedAt: number;
}, Promise<import("convex/values").GenericId<"events">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    tbaEventKey?: string | undefined;
    name?: string | undefined;
    notes?: string | undefined;
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    startedAt?: number | undefined;
    id: import("convex/values").GenericId<"events">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"events">;
}, Promise<void>>;
