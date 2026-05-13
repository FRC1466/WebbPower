import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { LogOut, User, Settings, Cpu, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useState } from "react";

const TEAM_DASHBOARD_URL = import.meta.env.VITE_TEAM_DASHBOARD_URL as string | undefined;

export function UserMenu() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const syncRole = useAction(api.users.syncRoleFromTeamDashboard);
  const [syncing, setSyncing] = useState(false);

  async function handleResync() {
    setSyncing(true);
    try {
      const result = await syncRole();
      if (result.synced) {
        toast.success(`Role synced: ${result.role} (from team dashboard)`);
      } else {
        const msgs: Record<string, string> = {
          not_found: "Email not found in team dashboard.",
          inactive: "Account is inactive or alumni in team dashboard.",
          login_disabled: "Login access is disabled in team dashboard.",
          login_pending: "Login access is pending in team dashboard.",
        };
        toast.warning(
          result.reason
            ? (msgs[result.reason] ?? "Role not synced.")
            : "Role not synced — check TEAM_DASHBOARD_URL env var.",
          { duration: 6000 },
        );
      }
    } catch {
      toast.error("Failed to sync role from team dashboard.");
    } finally {
      setSyncing(false);
    }
  }

  if (user === undefined) {
    return null;
  }

  if (user === null) {
    return (
      <Button size="sm" onClick={() => navigate("/signin")}>
        Sign in
      </Button>
    );
  }

  const label = user.email ?? (user.isAnonymous ? "Guest" : "User");
  const isPrivileged = user.role === "admin" || user.role === "pit";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button {...props} variant="ghost" size="sm">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{label}</span>
          </Button>
        )}
      />
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate text-sm">{label}</span>
            <Badge
              variant={
                user.role === "admin"
                  ? "default"
                  : user.role === "pit"
                    ? "secondary"
                    : "outline"
              }
              className="mt-1 w-fit text-xs"
            >
              {user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPrivileged && (
          <>
            <DropdownMenuItem onClick={() => navigate("/subsystems")}>
              <Cpu className="mr-2 h-4 w-4" /> Subsystems
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/setup")}>
              <Settings className="mr-2 h-4 w-4" /> Setup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {!user.isAnonymous && (
          <>
            <DropdownMenuItem onClick={handleResync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync role from dashboard
            </DropdownMenuItem>
            {TEAM_DASHBOARD_URL && (
              <DropdownMenuItem
                onClick={() => window.open(TEAM_DASHBOARD_URL, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Team dashboard
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate("/signin");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
