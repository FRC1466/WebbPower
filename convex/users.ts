import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      _id: user._id,
      email: (user as { email?: string }).email,
      name: (user as { name?: string }).name,
      isAnonymous: (user as { isAnonymous?: boolean }).isAnonymous ?? false,
      role: role?.role ?? "viewer",
    };
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("pit"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const callerRole = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .first();
    const anyAdmin = await ctx.db.query("roles").first();
    // First role assignment is always allowed (bootstrapping the first admin).
    // After that, only admins may change roles.
    if (anyAdmin && callerRole?.role !== "admin") {
      throw new Error("Only admins can change roles");
    }
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("roles", { userId: args.userId, role: args.role });
    }
  },
});

export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if ((user as { isAnonymous?: boolean })?.isAnonymous) {
      throw new Error("Anonymous users cannot claim admin");
    }
    const anyAdmin = await ctx.db.query("roles").first();
    if (anyAdmin) throw new Error("An admin already exists");
    await ctx.db.insert("roles", { userId, role: "admin" });
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const callerRole = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (callerRole?.role !== "admin") return [];
    const users = await ctx.db.query("users").collect();
    const roles = await ctx.db.query("roles").collect();
    const rolesByUser = new Map(roles.map((r) => [r.userId, r.role]));
    return users.map((u) => ({
      _id: u._id,
      email: (u as { email?: string }).email,
      name: (u as { name?: string }).name,
      isAnonymous: (u as { isAnonymous?: boolean }).isAnonymous ?? false,
      role: rolesByUser.get(u._id) ?? "viewer",
    }));
  },
});

// ---------------------------------------------------------------------------
// Team-1466 dashboard integration
// ---------------------------------------------------------------------------

// Permission levels in team-1466 and the WebbPower role they map to:
//   manager | mentor        → admin   (full control)
//   team_lead | subteam_lead → pit    (can record data but not manage config)
//   sme | member            → viewer  (read-only)
function permissionToRole(
  permission: string,
): "admin" | "pit" | "viewer" {
  if (permission === "manager" || permission === "mentor") return "admin";
  if (permission === "team_lead" || permission === "subteam_lead") return "pit";
  return "viewer";
}

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
export const syncRoleFromTeamDashboard = action({
  args: {},
  handler: async (ctx): Promise<{ synced: boolean; role?: string; reason?: string }> => {
    const dashboardUrl = process.env.TEAM_DASHBOARD_URL;
    const apiKey = process.env.TEAM_DASHBOARD_API_KEY;
    if (!dashboardUrl) return { synced: false };

    // Fetch the current user's email from this deployment.
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user || !user.email || user.isAnonymous) return { synced: false };

    try {
      const res = await fetch(`${dashboardUrl}/internal/member-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!res.ok) return { synced: false };

      const data = (await res.json()) as {
        found: boolean;
        permission?: string;
        status?: string;
        loginAccess?: string;
      };

      if (!data.found || !data.permission) return { synced: false, reason: "not_found" };
      // Don't auto-grant access to inactive/alumni members.
      if (data.status === "inactive" || data.status === "alumni") {
        return { synced: false, reason: "inactive" };
      }
      // Only hard-block if login is explicitly disabled in team-1466.
      // "pending" just means the team-1466 manager hasn't reviewed them yet —
      // WebbPower manages its own access so we still sync the role.
      if (data.loginAccess === "disabled") {
        return { synced: false, reason: "login_disabled" };
      }

      const derivedRole = permissionToRole(data.permission);
      await ctx.runMutation(api.users.upsertOwnRole, { role: derivedRole });
      return { synced: true, role: derivedRole };
    } catch {
      return { synced: false };
    }
  },
});

/**
 * Upserts the calling user's own role. Unlike `setRole` (which requires an
 * admin caller), this is only callable by the user themselves and is intended
 * solely for the team-dashboard sync flow.  It will NOT downgrade a role that
 * was explicitly set by an admin to be higher than the derived value.
 */
export const upsertOwnRole = mutation({
  args: {
    role: v.union(v.literal("admin"), v.literal("pit"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const RANK = { admin: 2, pit: 1, viewer: 0 } as const;
    // Don't downgrade a role that is already higher.
    if (existing && RANK[existing.role] >= RANK[args.role]) return;

    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("roles", { userId, role: args.role });
    }
  },
});
