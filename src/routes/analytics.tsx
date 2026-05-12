import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useMemo } from "react";

export default function AnalyticsRoute() {
  const sessions = useQuery(api.sessions.list);
  const batteries = useQuery(api.batteries.list);

  const sessionTimeline = useMemo(() => {
    if (!sessions) return [];
    return [...sessions]
      .filter((s) => s.startedAt && s.peakTotalCurrent != null)
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((s) => ({
        time: new Date(s.startedAt).toLocaleDateString(),
        peak: s.peakTotalCurrent ?? 0,
        avgV: s.avgVoltage ?? 0,
        brownouts: s.brownoutCount ?? 0,
        energy: (s.energyJoules ?? 0) / 1000,
      }));
  }, [sessions]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Analytics</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Trends across sessions.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Peak total current</CardTitle>
          <CardDescription>Per session over time (A)</CardDescription>
        </CardHeader>
        <CardContent className="h-56 px-2 sm:h-72 sm:px-6">
          <ResponsiveContainer>
            <LineChart data={sessionTimeline}>
              <CartesianGrid stroke="rgba(127,127,127,0.2)" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="peak"
                stroke="var(--color-warning)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brownouts per session</CardTitle>
        </CardHeader>
        <CardContent className="h-56 px-2 sm:h-72 sm:px-6">
          <ResponsiveContainer>
            <BarChart data={sessionTimeline}>
              <CartesianGrid stroke="rgba(127,127,127,0.2)" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="brownouts" fill="var(--color-destructive)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Energy per session (kJ)</CardTitle>
        </CardHeader>
        <CardContent className="h-56 px-2 sm:h-72 sm:px-6">
          <ResponsiveContainer>
            <LineChart data={sessionTimeline}>
              <CartesianGrid stroke="rgba(127,127,127,0.2)" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="var(--color-primary)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgV"
                stroke="var(--color-success)"
                dot={false}
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Battery health</CardTitle>
          <CardDescription>Per battery health score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {batteries?.map((b) => (
              <div
                key={b._id}
                className="flex items-baseline justify-between rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{b.label}</span>
                <span className="font-mono">
                  {b.healthScore != null ? `${b.healthScore}/100` : "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
