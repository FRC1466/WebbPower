import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router";
import { formatDateTime } from "@/lib/utils";

const SEVERITY_VARIANT = {
  info: "outline",
  warning: "warning",
  critical: "destructive",
} as const;

export default function AlertsRoute() {
  const alerts = useQuery(api.alerts.list, {});
  const [severity, setSeverity] = useState<string>("all");

  const filtered = (alerts ?? []).filter((a) =>
    severity === "all" ? true : a.severity === severity,
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Alerts</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Brownouts, current-limit violations, battery health drops.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} alerts</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No alerts.
            </p>
          )}
          {filtered.map((a) => (
            <div key={a._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Badge variant={SEVERITY_VARIANT[a.severity]} className="shrink-0">
                {a.severity}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium break-words">{a.message}</div>
                <div className="text-xs text-muted-foreground">
                  {a.kind} — {formatDateTime(a.occurredAt)}
                </div>
              </div>
              {a.sessionId && (
                <Link
                  to={`/matches/${a.sessionId}`}
                  className="shrink-0 text-xs text-primary underline"
                >
                  match
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
