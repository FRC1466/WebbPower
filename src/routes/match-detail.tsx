import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, Link, useNavigate } from "react-router";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeChart } from "@/components/charts/mode-chart";
import { lttb } from "@/lib/lttb";
import { formatCurrent, formatVoltage, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2 } from "lucide-react";
import { SessionTagger } from "@/components/matches/session-tagger";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useIsAdmin } from "@/lib/role";

const MAX_PLOT_POINTS = 500;

export type ModeSegment = {
  start: number;
  end: number;
  mode: "auto" | "teleop" | "disabled" | "test";
};

export default function MatchDetailRoute() {
  const params = useParams();
  const sessionId = params.sessionId as Id<"sessions"> | undefined;
  const data = useQuery(api.sessions.get, sessionId ? { id: sessionId } : "skip");
  const windows = useQuery(api.sessions.listWindows, sessionId ? { sessionId } : "skip");
  const subs = useQuery(api.subsystems.list);
  const removeSession = useMutation(api.sessions.remove);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const flat = useMemo(() => {
    if (!windows) return null;
    const xs: number[] = [];
    const vs: number[] = [];
    const modes: string[] = [];
    const channelMap = new Map<number, number[]>();
    const topicMap = new Map<string, number[]>();
    const sortedWindows = [...windows].sort((a, b) => a.windowIndex - b.windowIndex);
    const firstStart = sortedWindows[0]?.startMs ?? 0;
    for (const w of sortedWindows) {
      for (const s of w.samples) {
        const t = (w.startMs - firstStart + s.t) / 1000;
        xs.push(t);
        vs.push(s.v);
        modes.push((s.mode ?? "disabled").toLowerCase() as ModeSegment["mode"]);
        for (let i = 0; i < s.c.length; i++) {
          let arr = channelMap.get(i);
          if (!arr) { arr = new Array(xs.length - 1).fill(0); channelMap.set(i, arr); }
          arr.push(s.c[i]);
        }
        if (s.topics) {
          for (const [k, v] of Object.entries(s.topics)) {
            let arr = topicMap.get(k);
            if (!arr) { arr = new Array(xs.length - 1).fill(0); topicMap.set(k, arr); }
            arr.push(v);
          }
        }
      }
    }
    return { xs, vs, modes, channelMap, topicMap };
  }, [windows]);

  const modeSegments = useMemo((): ModeSegment[] => {
    if (!flat || flat.xs.length === 0) return [];
    const segs: ModeSegment[] = [];
    let cur = flat.modes[0] as ModeSegment["mode"];
    let start = flat.xs[0];
    for (let i = 1; i < flat.xs.length; i++) {
      const m = flat.modes[i] as ModeSegment["mode"];
      if (m !== cur) {
        segs.push({ start, end: flat.xs[i], mode: cur });
        cur = m;
        start = flat.xs[i];
      }
    }
    if (flat.xs.length > 0)
      segs.push({ start, end: flat.xs[flat.xs.length - 1], mode: cur });
    return segs;
  }, [flat]);

  const voltageData = useMemo(() => {
    if (!flat) return null;
    const d = lttb(flat.xs, flat.vs, MAX_PLOT_POINTS);
    return [d.xs, d.ys] as [number[], number[]];
  }, [flat]);

  const currentData = useMemo(() => {
    if (!flat || !subs) return null;
    const bySubsystem = new Map<string, number[]>();
    for (const sub of subs) {
      if (sub.topicPaths && sub.topicPaths.length > 0) {
        // Topic-based subsystem: sum topic values.
        for (const path of sub.topicPaths) {
          const arr = flat.topicMap.get(path);
          if (!arr) continue;
          const existing = bySubsystem.get(sub.name);
          if (!existing) {
            bySubsystem.set(sub.name, [...arr]);
          } else {
            for (let i = 0; i < arr.length; i++) existing[i] += arr[i];
          }
        }
      } else if (sub.channel != null) {
        // Legacy channel-based.
        const arr = flat.channelMap.get(sub.channel);
        if (!arr) continue;
        const existing = bySubsystem.get(sub.name);
        if (!existing) {
          bySubsystem.set(sub.name, [...arr]);
        } else {
          for (let i = 0; i < arr.length; i++) existing[i] += arr[i];
        }
      }
    }
    const names = [...bySubsystem.keys()];
    const series = names.map((n) => {
      const ys = bySubsystem.get(n)!;
      const d = lttb(flat.xs, ys, MAX_PLOT_POINTS);
      return { name: n, xs: d.xs, ys: d.ys };
    });
    if (series.length === 0) return null;
    return { xs: series[0].xs, names, ys: series.map((s) => s.ys) };
  }, [flat, subs]);

  if (!sessionId) return null;
  if (!data) return <p className="p-4 text-muted-foreground">Loading…</p>;
  if (!data.session) return <p className="p-4 text-muted-foreground">Not found.</p>;
  const s = data.session;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/matches"
          className="-ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to matches
        </Link>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{s.label}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{s.source}</Badge>
            {data.match && (
              <Badge variant="outline">
                {data.match.tbaMatchKey}
              </Badge>
            )}
            {data.battery && (
              <Badge variant="outline">battery {data.battery.label}</Badge>
            )}
            <span className="text-muted-foreground">{formatDateTime(s.startedAt)}</span>
          </div>
        </div>
        <SessionTagger
          sessionId={s._id}
          currentBatteryId={s.batteryId ?? undefined}
          currentMatchId={s.matchId ?? undefined}
          currentNotes={s.notes ?? undefined}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Peak total" value={formatCurrent(s.peakTotalCurrent ?? null)} />
        <Stat label="Avg voltage" value={formatVoltage(s.avgVoltage ?? null)} />
        <Stat label="Brownouts" value={String(s.brownoutCount ?? 0)} />
        <Stat
          label="Energy"
          value={s.energyJoules != null ? `${(s.energyJoules / 1000).toFixed(1)} kJ` : "—"}
        />
      </div>

      {/* Mode legend */}
      {modeSegments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium">Mode:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 rounded-sm bg-yellow-400" style={{ opacity: 0.18 }} />
            Auto
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 rounded-sm bg-blue-400" style={{ opacity: 0.15 }} />
            Teleop
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 rounded-sm bg-gray-400" style={{ opacity: 0.08 }} />
            Disabled
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bus voltage</CardTitle>
          <CardDescription>Drag to zoom · Double-click to reset</CardDescription>
        </CardHeader>
        <CardContent>
          {voltageData ? (
            <ModeChart
              data={voltageData}
              modeSegments={modeSegments}
              series={[{ label: "V", stroke: "oklch(0.696 0.17 162.48)" }]}
              yLabel="Volts"
              height={220}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No data.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current per subsystem</CardTitle>
        </CardHeader>
        <CardContent>
          {currentData ? (
            <ModeChart
              data={[currentData.xs, ...currentData.ys] as any}
              modeSegments={modeSegments}
              series={currentData.names.map((n, i) => ({
                label: n,
                stroke: `hsl(${(i * 53) % 360} 70% 55%)`,
              }))}
              yLabel="Amps"
              height={300}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No subsystems configured. Add topic-based subsystems on the Subsystems page.
            </p>
          )}
        </CardContent>
      </Card>

      {s.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{s.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              This permanently deletes "{s.label}" and all its sample windows. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await removeSession({ id: s._id });
                  toast.success("Session deleted.");
                  navigate("/matches");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                  setDeleting(false);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}
