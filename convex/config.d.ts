export declare const getConfig: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"config">;
    _creationTime: number;
    tbaEventKey?: string | undefined;
    tbaTeamKey?: string | undefined;
    pdType: "PDH" | "PDP";
    brownoutThreshold: number;
    nt4Host: string;
    updatedAt: number;
} | {
    _id: null;
    tbaEventKey: undefined;
    tbaTeamKey: undefined;
    pdType: "PDH";
    brownoutThreshold: number;
    nt4Host: string;
    updatedAt: number;
}>>;
export declare const upsertConfig: import("convex/server").RegisteredMutation<"public", {
    tbaEventKey?: string | undefined;
    tbaTeamKey?: string | undefined;
    pdType: "PDH" | "PDP";
    brownoutThreshold: number;
    nt4Host: string;
}, Promise<void>>;
