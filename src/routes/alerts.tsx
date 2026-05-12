import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Zap,
  BatteryWarning,
  Battery,
  Activity,
  BellOff,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CalendarClock,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useCanWrite } from "@/lib/role";
import { toast } from "sonner";

type Severity = "info" | "warning" | "critical";
type ScopeFilter = "active" | "resolved" | "all";

const SEVERITIES: { id: Severity | "any"; label: string }[] = [
  { id: "any", label: "All severities" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
];

const SCOPES: { id: ScopeFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: LucideIcon; tone: string; ring: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertOctagon,
    tone: "text-destructive",
    ring: "bg-destructive/10 ring-1 ring-destructive/30",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    tone: "text-warning",
    ring: "bg-warning/10 ring-1 ring-warning/30",
  },
  info: {
    label: "Info",
    icon: Info,
    tone: "text-muted-foreground",
    ring: "bg-muted ring-1 ring-border",
  },
};

const KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  brownout: { label: "Brownout detected", icon: Zap },
  near_brownout: { label: "Approaching brownout", icon: Zap },
  can_high: { label: "High CAN bus utilization", icon: Activity },
  battery_health_low: { label: "Battery health low", icon: BatteryWarning },
  battery_health_questionable: {
    label: "Battery health questionable",
    icon: Battery,
  },
};

function humanizeKind(kind: string): string {
  return kind
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w, i) =>
      i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase(),
    )
    .join(" ");
}

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: humanizeKind(kind), icon: Info };
}

type AlertRow = FunctionReturnType<typeof api.alerts.list>[number];

function Origin({ alert }: { alert: AlertRow }) {
  const chips: { icon: LucideIcon; label: string; to?: string }[] = [];
  if (alert.battery) {
    chips.push({
      icon: Battery,
      label: alert.battery.nickname
        ? `${alert.battery.label} (${alert.battery.nickname})`
        : alert.battery.label,
      to: "/batteries",
    });
  }
  if (alert.session) {
    chips.push({
      icon: CalendarClock,
      label: alert.session.label,
      to: `/matches/${alert.session._id}`,
    });
  }
  if (alert.subsystem) {
    chips.push({
      icon: Cpu,
      label: alert.subsystem.name,
      to: `/subsystems`,
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => {
        const Icon = c.icon;
        const inner = (
          <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background/60 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground">
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{c.label}</span>
          </span>
        );
        return c.to ? (
          <Link
            key={i}
            to={c.to}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0"
          >
            {inner}
          </Link>
        ) : (
          <span key={i} className="min-w-0">{inner}</span>
        );
      })}
    </div>
  );
}

export default function AlertsRoute() {
  const alerts = useQuery(api.alerts.list, {});
  const resolve = useMutation(api.alerts.resolve);
  const unresolve = useMutation(api.alerts.unresolve);
  const resolveStale = useMutation(api.alerts.resolveStale);
  const canWrite = useCanWrite();
  const [severity, setSeverity] = useState<Severity | "any">("any");
  const [scope, setScope] = useState<ScopeFilter>("active");

  const visible = useMemo(() => {
    return (alerts ?? []).filter((a) => {
      if (severity !== "any" && a.severity !== severity) return false;
      const resolved = a.resolvedAt != null || a.isStale;
      if (scope === "active" && resolved) return false;
      if (scope === "resolved" && !resolved) return false;
      return true;
    });
  }, [alerts, severity, scope]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 } as Record<Severity, number>;
    for (const a of alerts ?? []) {
      if (a.resolvedAt != null || a.isStale) continue;
      c[a.severity as Severity]++;
    }
    return c;
  }, [alerts]);

  const staleCount = useMemo(
    () => (alerts ?? []).filter((a) => a.isStale && a.resolvedAt == null).length,
    [alerts],
  );

  async function handleResolve(id: Id<"alerts">) {
    try {
      await resolve({ id, reason: "Dismissed manually" });
      toast.success("Resolved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleUnresolve(id: Id<"alerts">) {
    try {
      await unresolve({ id });
      toast.success("Reopened.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleSweep() {
    try {
      const res = await resolveStale({});
      toast.success(
        res.resolved > 0
          ? `Resolved ${res.resolved} stale alert${res.resolved === 1 ? "" : "s"}.`
          : "Nothing to clean up.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2 sm:items-end">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Alerts</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Brownouts, current-limit violations, and battery health drops across every session.
          </p>
        </div>
        {canWrite && staleCount > 0 && (
          <Button size="sm" variant="outline" onClick={handleSweep}>
            <Sparkles className="h-4 w-4" />
            Sweep {staleCount} stale
          </Button>
        )}
      </header>

      {/* Severity summary cards — counts reflect ACTIVE only. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(["critical", "warning", "info"] as const).map((s) => {
          const meta = SEVERITY_META[s];
          const Icon = meta.icon;
          const active = severity === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(active ? "any" : s)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40 sm:p-4",
                active && "ring-2 ring-ring",
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  meta.ring,
                )}
              >
                <Icon className={cn("h-4 w-4", meta.tone)} />
              </span>
              <span className="text-2xl font-semibold tabular-nums leading-none sm:text-3xl">
                {counts[s]}
              </span>
              <span className="text-xs text-muted-foreground">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scope + severity filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-card p-0.5">
          {SCOPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScope(sc.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                scope === sc.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={scope === sc.id}
            >
              {sc.label}
            </button>
          ))}
        </div>
        {SEVERITIES.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={severity === s.id ? "default" : "outline"}
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => setSeverity(s.id)}
          >
            {s.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Showing {visible.length} of {alerts?.length ?? 0}
        </span>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts == null ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-md bg-muted/50"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">
                {scope === "active"
                  ? "No active alerts."
                  : scope === "resolved"
                    ? "Nothing has been resolved yet."
                    : "No alerts recorded."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((a) => {
                const sev = SEVERITY_META[a.severity as Severity];
                const k = kindMeta(a.kind);
                const KindIcon = k.icon;
                const SevIcon = sev.icon;
                const resolved = a.resolvedAt != null;
                const stale = a.isStale;
                const dim = resolved || stale;
                return (
                  <li
                    key={a._id}
                    className={cn(
                      "transition-colors",
                      dim ? "bg-muted/20" : "hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          sev.ring,
                          dim && "opacity-50",
                        )}
                        aria-hidden="true"
                      >
                        <KindIcon className={cn("h-4 w-4", sev.tone)} />
                      </span>
                      <div className={cn("min-w-0 flex-1 space-y-1", dim && "opacity-70")}>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium">{k.label}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
                              sev.tone,
                            )}
                          >
                            <SevIcon className="h-3 w-3" />
                            {sev.label}
                          </span>
                          {resolved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                              <Check className="h-3 w-3" />
                              Resolved
                            </span>
                          )}
                          {stale && !resolved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              No longer applies
                            </span>
                          )}
                        </div>
                        <p className="break-words text-sm text-muted-foreground">
                          {a.message}
                        </p>
                        <Origin alert={a} />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground/80">
                          <span title={formatDateTime(a.occurredAt)}>
                            {formatRelativeTime(a.occurredAt)}
                          </span>
                          {resolved && a.resolvedReason && (
                            <span title={formatDateTime(a.resolvedAt)}>
                              · {a.resolvedReason} ({formatRelativeTime(a.resolvedAt)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {canWrite && !resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleResolve(a._id)}
                            title="Mark resolved"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Resolve</span>
                          </Button>
                        )}
                        {canWrite && resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => handleUnresolve(a._id)}
                            title="Reopen"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Reopen</span>
                          </Button>
                        )}
                        {a.sessionId && (
                          <Link
                            to={`/matches/${a.sessionId}`}
                            aria-label="Open session"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
