import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveStore } from "@/store/live";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Zap, Wifi, WifiOff } from "lucide-react";
import { startCapture } from "@/nt4/capture-loop";
import { useCanWrite } from "@/lib/role";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import { toast } from "sonner";
import { formatVoltage, formatCurrent } from "@/lib/utils";

function VoltageGauge({
  v,
  brownout,
}: {
  v: number | null;
  brownout: number;
}) {
  const value = v ?? 0;
  const min = 6.5;
  const max = 13.5;
  const pct = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );
  const color =
    v == null
      ? "var(--color-muted-foreground)"
      : v < brownout
        ? "var(--color-destructive)"
        : v < 7.0
          ? "var(--color-warning)"
          : "var(--color-success)";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span
          className="text-4xl font-mono font-semibold tabular-nums sm:text-5xl"
          style={{ color }}
        >
          {formatVoltage(v)}
        </span>
        <span className="text-xs text-muted-foreground">
          brownout {brownout.toFixed(2)}V
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function LiveRoute() {
  const cfg = useQuery(api.config.getConfig);
  const lock = useQuery(api.capture.getLock);
  const subs = useQuery(api.subsystems.list);
  const claim = useMutation(api.capture.claim);
  const takeover = useMutation(api.capture.takeover);
  const release = useMutation(api.capture.release);
  const createSession = useMutation(api.sessions.create);
  const convex = useConvex();
  const canWrite = useCanWrite();
  const captureRef = useRef<{ stop: () => void } | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(
    null,
  );
  const deviceId = useMemo(() => getDeviceId(), []);
  const deviceLabel = useMemo(() => getDeviceLabel(), []);

  const connected = useLiveStore((s) => s.connected);
  const isCapturing = useLiveStore((s) => s.isCapturing);
  const latest = useLiveStore((s) => s.latest);

  // Listen to live buffer for viewer mode
  const recentLive = useQuery(
    api.sessions.recentLive,
    lock?.sessionId && !isCapturing
      ? { sessionId: lock.sessionId, sinceMs: Date.now() - 30000 }
      : "skip",
  );

  // When in viewer mode, hydrate the live store from Convex (rolling 30s).
  useEffect(() => {
    if (isCapturing) return;
    if (!recentLive || recentLive.length === 0) return;
    const last = recentLive[recentLive.length - 1];
    useLiveStore.getState().pushSample({
      capturedAt: last.capturedAt,
      voltage: last.voltage,
      totalCurrent: last.totalCurrent,
      channelCurrents: last.channelCurrents,
      canUtil: last.canUtil ?? 0,
      mode: last.mode ?? "Unknown",
      matchTime: last.matchTime,
    });
  }, [recentLive, isCapturing]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      captureRef.current?.stop();
      captureRef.current = null;
    };
  }, []);

  const otherDeviceHoldsLock =
    lock && !lock.stale && lock.deviceId !== deviceId;

  async function startCapturing(takeoverExisting = false) {
    if (!cfg) return;
    try {
      const sessionId = await createSession({
        label: `Live ${new Date().toLocaleTimeString()}`,
        source: "live",
        startedAt: Date.now(),
        sampleRateHz: 10,
        channels: Array.from(
          { length: cfg.pdType === "PDH" ? 24 : 16 },
          (_, i) => i,
        ),
      });
      if (takeoverExisting) {
        await takeover({ sessionId, deviceId, deviceLabel });
      } else {
        await claim({ sessionId, deviceId, deviceLabel });
      }
      setActiveSessionId(sessionId);
      captureRef.current = startCapture({
        host: cfg.nt4Host,
        sessionId,
        convex,
        deviceId,
        brownoutThreshold: cfg.brownoutThreshold,
      });
      toast.success("Capture started.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start capture");
    }
  }

  async function stopCapturing() {
    captureRef.current?.stop();
    captureRef.current = null;
    setActiveSessionId(null);
    await release({ deviceId }).catch(() => {});
    toast.success("Capture stopped.");
  }

  const brownout = cfg?.brownoutThreshold ?? 6.75;
  const voltage = latest?.voltage ?? null;
  const totalCurrent = latest?.totalCurrent ?? null;
  const canUtil = latest?.canUtil ?? null;
  const mode = latest?.mode ?? "Unknown";
  const matchTime = latest?.matchTime;

  const channelCurrents = latest?.channelCurrents ?? [];

  // Group channels by subsystem.
  const subsystemRows = useMemo(() => {
    if (!subs) return [];
    const byName = new Map<string, { name: string; current: number; limit: number; stall: number }>();
    for (const s of subs) {
      const v = byName.get(s.name) ?? {
        name: s.name,
        current: 0,
        limit: 0,
        stall: 0,
      };
      v.current += channelCurrents[s.channel] ?? 0;
      v.limit += s.supplyLimit;
      v.stall += s.stallCurrent;
      byName.set(s.name, v);
    }
    return [...byName.values()];
  }, [subs, channelCurrents]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2 sm:items-end">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Live dashboard
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Real-time bus voltage, per-subsystem current, brownout warnings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? "success" : "outline"}>
            {connected ? (
              <Wifi className="mr-1 h-3 w-3" />
            ) : (
              <WifiOff className="mr-1 h-3 w-3" />
            )}
            NT4 {connected ? "connected" : "disconnected"}
          </Badge>
          <Badge variant={isCapturing ? "default" : "outline"}>
            {isCapturing ? "Capturing" : "Viewing"}
          </Badge>
        </div>
      </header>

      {otherDeviceHoldsLock && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>
            Viewing — capture device is {lock.deviceLabel}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Another device is currently capturing live data.</span>
            {canWrite && (
              <Button size="sm" onClick={() => startCapturing(true)}>
                Take over capture
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isCapturing && !otherDeviceHoldsLock && canWrite && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertTitle>No capture running</AlertTitle>
          <AlertDescription className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Connect to {cfg?.nt4Host ?? "the robot"} and start capturing.</span>
            <Button size="sm" onClick={() => startCapturing(false)}>
              Start capture
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isCapturing && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={stopCapturing}>
            Stop capture
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bus voltage</CardTitle>
          </CardHeader>
          <CardContent>
            <VoltageGauge v={voltage} brownout={brownout} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Mode" value={mode} />
            <Stat
              label="Match time"
              value={matchTime != null ? `${matchTime.toFixed(1)}s` : "—"}
            />
            <Stat
              label="Total current"
              value={formatCurrent(totalCurrent)}
            />
            <Stat
              label="CAN utilization"
              value={canUtil != null ? `${canUtil.toFixed(0)}%` : "—"}
              warn={canUtil != null && canUtil > 80}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subsystems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subsystemRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No subsystems configured. Add some on the Subsystems page.
            </p>
          )}
          {subsystemRows.map((row) => {
            const pct = row.stall
              ? Math.min(100, (row.current / row.stall) * 100)
              : 0;
            const overLimit = row.current > row.limit && row.limit > 0;
            return (
              <div key={row.name} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{row.name}</span>
                  <span className="font-mono">
                    {formatCurrent(row.current)} /{" "}
                    <span className="text-muted-foreground">
                      {row.limit}A limit
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: overLimit
                        ? "var(--color-destructive)"
                        : pct > 75
                          ? "var(--color-warning)"
                          : "var(--color-success)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          warn
            ? "font-mono text-warning"
            : "font-mono text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
