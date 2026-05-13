export declare const currentUser: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    email: string | undefined;
    name: string | undefined;
    isAnonymous: boolean;
    role: "admin" | "pit" | "viewer";
} | null>>;
export declare const setRole: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    role: "admin" | "pit" | "viewer";
}, Promise<void>>;
export declare const claimFirstAdmin: import("convex/server").RegisteredMutation<"public", {}, Promise<void>>;
export declare const listUsers: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    email: string | undefined;
    name: string | undefined;
    isAnonymous: boolean;
    role: "admin" | "pit" | "viewer";
}[]>>;
/**
 * Called right after sign-in. Looks up the current user's email in the
 * team-1466 dashboard and automatically assigns the matching WebbPower role
 * (admin / pit / viewer) based on their team permission level.
 *
 * Requires TEAM_DASHBOARD_URL and TEAM_DASHBOARD_API_KEY to be set in the
 * WebbPower Convex deployment environment variables.
 *
 * Silently no-ops if the env vars are missing, the user isn't found in the
 * team dashboard, or the user already has an explicitly-assigned role that is
 * equal or higher than the derived one (prevents accidental downgrades).
 */
export declare const syncRoleFromTeamDashboard: import("convex/server").RegisteredAction<"public", {}, Promise<{
    synced: boolean;
    role?: string;
}>>;
/**
 * Upserts the calling user's own role. Unlike `setRole` (which requires an
 * admin caller), this is only callable by the user themselves and is intended
 * solely for the team-dashboard sync flow.  It will NOT downgrade a role that
 * was explicitly set by an admin to be higher than the derived value.
 */
export declare const upsertOwnRole: import("convex/server").RegisteredMutation<"public", {
    role: "admin" | "pit" | "viewer";
}, Promise<void>>;
