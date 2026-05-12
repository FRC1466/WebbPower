import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  Battery,
  BarChart3,
  Bell,
  ListChecks,
  Menu,
  Upload,
  Zap,
  ChevronDown,
  Bot,
  CalendarDays,
} from "lucide-react";
import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUiStore } from "@/store/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/user-menu";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { to: "/", label: "Live", icon: Activity },
  { to: "/batteries", label: "Batteries", icon: Battery },
  { to: "/matches", label: "Matches", icon: ListChecks },
  { to: "/import", label: "Import", icon: Upload },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/alerts", label: "Alerts", icon: Bell },
];

function RobotEventPicker() {
  const robots = useQuery(api.robots.list);
  const events = useQuery(api.events.list);
  const activeRobotId = useUiStore((s) => s.activeRobotId);
  const setActiveRobotId = useUiStore((s) => s.setActiveRobotId);
  const activeEventId = useUiStore((s) => s.activeEventId);
  const setActiveEventId = useUiStore((s) => s.setActiveEventId);

  // Auto-select first robot/event if none selected yet.
  useEffect(() => {
    if (robots && robots.length > 0 && !activeRobotId) {
      setActiveRobotId(robots[0]._id);
    }
  }, [robots, activeRobotId, setActiveRobotId]);

  useEffect(() => {
    if (!events || !activeRobotId) return;
    if (!activeEventId) {
      const first = events.find((e) => e.robotId === activeRobotId);
      if (first) setActiveEventId(first._id);
    }
  }, [events, activeRobotId, activeEventId, setActiveEventId]);

  if (!robots || robots.length === 0) return null;

  const robot = robots.find((r) => r._id === activeRobotId);
  const robotEvents = (events ?? []).filter((e) => e.robotId === activeRobotId);
  const event = robotEvents.find((e) => e._id === activeEventId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button {...props} variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="max-w-[80px] truncate font-medium">{robot?.name ?? "No robot"}</span>
            {event && (
              <>
                <span className="text-muted-foreground">/</span>
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[80px] truncate">{event.name}</span>
              </>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      />
      <DropdownMenuContent className="w-64">
        {robots.map((r) => {
          const rEvents = (events ?? []).filter((e) => e.robotId === r._id);
          return (
            <div key={r._id}>
              <DropdownMenuLabel
                className={cn(
                  "flex items-center gap-2 cursor-pointer px-2 py-1.5 text-xs font-semibold",
                  activeRobotId === r._id && "text-primary",
                )}
                onClick={() => {
                  setActiveRobotId(r._id);
                  // Switch event to first for this robot
                  const first = rEvents[0];
                  setActiveEventId(first?._id ?? null);
                }}
              >
                <Bot className="h-3.5 w-3.5" /> {r.name}
              </DropdownMenuLabel>
              {rEvents.length === 0 ? (
                <p className="px-4 pb-1 text-xs text-muted-foreground italic">No events</p>
              ) : (
                rEvents.map((ev) => (
                  <DropdownMenuItem
                    key={ev._id}
                    className={cn("pl-7 text-xs", activeEventId === ev._id && "bg-accent")}
                    onClick={() => {
                      setActiveRobotId(r._id);
                      setActiveEventId(ev._id);
                    }}
                  >
                    <CalendarDays className="mr-2 h-3.5 w-3.5" /> {ev.name}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
            </div>
          );
        })}
        <DropdownMenuItem
          className="text-xs text-muted-foreground"
          onClick={() => { setActiveRobotId(null); setActiveEventId(null); }}
        >
          Clear selection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const navOpen = useUiStore((s) => s.navOpen);
  const setNavOpen = useUiStore((s) => s.setNavOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/signin", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          />
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" /> WebbPower
            </SheetTitle>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          <span className="text-base font-semibold tracking-tight">WebbPower</span>
        </div>

        <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <RobotEventPicker />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main
        key={location.pathname}
        className="flex-1 px-4 pb-16 pt-4 md:px-6 md:pb-6"
      >
        <Outlet />
      </main>
    </div>
  );
}
