export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"robots">;
    _creationTime: number;
    notes?: string | undefined;
    pdType: "PDH" | "PDP";
    brownoutThreshold: number;
    nt4Host: string;
    name: string;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"robots">;
}, Promise<{
    _id: import("convex/values").GenericId<"robots">;
    _creationTime: number;
    notes?: string | undefined;
    pdType: "PDH" | "PDP";
    brownoutThreshold: number;
    nt4Host: string;
    name: string;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    pdType: "PDH" | "PDP";
    brownoutThreshold: number;
    nt4Host: string;
    name: string;
}, Promise<import("convex/values").GenericId<"robots">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    pdType?: "PDH" | "PDP" | undefined;
    brownoutThreshold?: number | undefined;
    nt4Host?: string | undefined;
    name?: string | undefined;
    notes?: string | undefined;
    id: import("convex/values").GenericId<"robots">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"robots">;
}, Promise<void>>;
