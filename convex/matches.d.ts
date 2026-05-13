export declare const list: import("convex/server").RegisteredQuery<"public", {
    eventKey?: string | undefined;
}, Promise<{
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
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"matches">;
}, Promise<{
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
} | null>>;
export declare const upsertMatch: import("convex/server").RegisteredMutation<"public", {
    setNumber?: number | undefined;
    scheduledTime?: number | undefined;
    actualTime?: number | undefined;
    alliance?: string | undefined;
    tbaMatchKey: string;
    eventKey: string;
    matchNumber: number;
    compLevel: string;
}, Promise<import("convex/values").GenericId<"matches">>>;
