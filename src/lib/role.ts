import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useCurrentUser() {
  return useQuery(api.users.currentUser);
}

export function useRole(): "admin" | "pit" | "viewer" | null {
  const user = useCurrentUser();
  if (user === undefined) return null;
  if (user === null) return "viewer";
  return user.role;
}

export function useCanWrite() {
  const role = useRole();
  return role === "admin" || role === "pit";
}

export function useIsAdmin() {
  return useRole() === "admin";
}
