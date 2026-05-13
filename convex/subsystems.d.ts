export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"subsystems">;
    _creationTime: number;
    notes?: string | undefined;
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    channel?: number | undefined;
    topicPaths?: string[] | undefined;
    name: string;
    deviceType: string;
    controller: string;
    nominalCurrent: number;
    stallCurrent: number;
    supplyLimit: number;
}[]>>;
export declare const listForRobot: import("convex/server").RegisteredQuery<"public", {
    robotId: import("convex/values").GenericId<"robots">;
}, Promise<{
    _id: import("convex/values").GenericId<"subsystems">;
    _creationTime: number;
    notes?: string | undefined;
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    channel?: number | undefined;
    topicPaths?: string[] | undefined;
    name: string;
    deviceType: string;
    controller: string;
    nominalCurrent: number;
    stallCurrent: number;
    supplyLimit: number;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    channel?: number | undefined;
    topicPaths?: string[] | undefined;
    name: string;
    deviceType: string;
    controller: string;
    nominalCurrent: number;
    stallCurrent: number;
    supplyLimit: number;
}, Promise<import("convex/values").GenericId<"subsystems">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    channel?: number | undefined;
    topicPaths?: string[] | undefined;
    id: import("convex/values").GenericId<"subsystems">;
    name: string;
    deviceType: string;
    controller: string;
    nominalCurrent: number;
    stallCurrent: number;
    supplyLimit: number;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"subsystems">;
}, Promise<void>>;
export declare const createFromTopics: import("convex/server").RegisteredMutation<"public", {
    robotId?: import("convex/values").GenericId<"robots"> | undefined;
    replaceExisting?: boolean | undefined;
    subsystems: {
        deviceType?: string | undefined;
        controller?: string | undefined;
        nominalCurrent?: number | undefined;
        stallCurrent?: number | undefined;
        supplyLimit?: number | undefined;
        name: string;
        topicPaths: string[];
    }[];
}, Promise<{
    inserted: number;
}>>;
