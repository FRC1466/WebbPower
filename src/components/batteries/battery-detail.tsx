import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatVoltage,
  formatMilliOhms,
  formatDateTime,
  formatDate,
} from "@/lib/utils";
import { useCanWrite, useIsAdmin } from "@/lib/role";
import { MeasurementForm } from "@/components/batteries/measurement-form";
import { toast } from "sonner";
import { Sparkline } from "@/components/charts/sparkline";

export function BatteryDetail({
  id,
  onClose,
}: {
  id: Id<"batteries"> | null;
  onClose: () => void;
}) {
  const data = useQuery(api.batteries.get, id ? { id } : "skip");
  const update = useMutation(api.batteries.update);
  const remove = useMutation(api.batteries.remove);
  const canWrite = useCanWrite();
  const isAdmin = useIsAdmin();

  const battery = data?.battery ?? null;
  const measurements = data?.measurements ?? [];
  const sessions = data?.sessions ?? [];

  const voltageSeries = [...measurements]
    .reverse()
    .map((m) => m.restingVoltage);
  const irSeries = [...measurements]
    .reverse()
    .map((m) => m.internalResistance);

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        {battery ? (
          <div className="space-y-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {battery.label}
                <Badge variant="outline">{battery.status}</Badge>
              </SheetTitle>
              {battery.nickname && (
                <p className="text-sm text-muted-foreground">
                  {battery.nickname}
                </p>
              )}
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat
                label="Resting V"
                value={formatVoltage(battery.lastRestingVoltage)}
              />
              <Stat
                label="IR"
                value={formatMilliOhms(battery.lastInternalResistance)}
              />
              <Stat label="Cycles" value={String(battery.cycleCount)} />
              <Stat
                label="Health"
                value={
                  battery.healthScore != null
                    ? `${battery.healthScore}/100`
                    : "—"
                }
              />
              <Stat
                label="Purchased"
                value={formatDate(battery.purchasedAt)}
              />
              <Stat
                label="First use"
                value={formatDate(battery.firstUsedAt)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs uppercase text-muted-foreground">
                  Resting voltage
                </span>
                <Sparkline values={voltageSeries} stroke="var(--color-success)" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase text-muted-foreground">
                  Internal resistance
                </span>
                <Sparkline values={irSeries} stroke="var(--color-warning)" />
              </div>
            </div>

            {canWrite && (
              <>
                <Separator />
                <MeasurementForm batteryId={battery._id} />
              </>
            )}

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Recent measurements ({measurements.length})
              </h4>
              <div className="space-y-1 text-sm">
                {measurements.slice(0, 10).map((m) => (
                  <div
                    key={m._id}
                    className="flex justify-between border-b border-border/40 py-1"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(m.measuredAt)}
                    </span>
                    <span className="font-mono">
                      {formatVoltage(m.restingVoltage)} /{" "}
                      {formatMilliOhms(m.internalResistance)}
                    </span>
                  </div>
                ))}
                {measurements.length === 0 && (
                  <p className="text-muted-foreground">No measurements yet.</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Matches used ({sessions.length})
              </h4>
              <div className="space-y-1 text-sm">
                {sessions.slice(0, 10).map((s) => (
                  <div
                    key={s._id}
                    className="flex justify-between border-b border-border/40 py-1"
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="text-muted-foreground">
                      {formatDate(s.startedAt)}
                    </span>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-muted-foreground">No sessions yet.</p>
                )}
              </div>
            </div>

            {canWrite && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await update({ id: battery._id, status: "rotation" });
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    }}
                  >
                    Move to rotation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await update({ id: battery._id, status: "reserved" });
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    }}
                  >
                    Reserve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await update({ id: battery._id, status: "charging" });
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    }}
                  >
                    Mark charging
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await update({ id: battery._id, status: "retired" });
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    }}
                  >
                    Retire
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Delete this battery permanently?")) return;
                        try {
                          await remove({ id: battery._id });
                          onClose();
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : "Failed",
                          );
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card/40 p-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}
