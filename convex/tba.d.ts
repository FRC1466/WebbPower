export declare const importEvent: import("convex/server").RegisteredAction<"public", {
    teamKey?: string | undefined;
    eventKey: string;
}, Promise<{
    imported: number;
}>>;
