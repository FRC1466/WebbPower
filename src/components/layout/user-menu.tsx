import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { LogOut, User, Settings, Cpu } from "lucide-react";
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

export function UserMenu() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

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
