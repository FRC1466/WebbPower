import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { useCanWrite } from "@/lib/role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Battery as BatteryIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BatteryDetail } from "@/components/batteries/battery-detail";
import { formatVoltage, formatMilliOhms } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: "default" | "secondary" | "outline" | "warning" | "success" | "destructive"; label: string }> = {
    rotation: { v: "success", label: "In Rotation" },
    reserved: { v: "secondary", label: "Reserved" },
    charging: { v: "warning", label: "Charging" },
    retired: { v: "outline", label: "Retired" },
  };
  const cfg = map[status] ?? { v: "outline" as const, label: status };
  return <Badge variant={cfg.v}>{cfg.label}</Badge>;
}

export default function BatteriesRoute() {
  const batteries = useQuery(api.batteries.list);
  const create = useMutation(api.batteries.create);
  const canWrite = useCanWrite();
  const [selected, setSelected] = useState<Id<"batteries"> | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [nickname, setNickname] = useState("");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-2 sm:items-end">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Batteries</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Inventory and health for every battery in the rotation.
          </p>
        </div>
        {canWrite && (
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger
              render={(props) => (
                <Button {...props} size="sm" className="shrink-0">
                  <Plus className="h-4 w-4" /> New battery
                </Button>
              )}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add battery</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await create({
                      label,
                      nickname: nickname || undefined,
                    });
                    setLabel("");
                    setNickname("");
                    setNewOpen(false);
                    toast.success("Added.");
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Failed",
                    );
                  }
                }}
              >
                <div className="space-y-1">
                  <Label>Label</Label>
                  <Input
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="B1"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nickname (optional)</Label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Add</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {batteries?.map((b) => (
          <button
            key={b._id}
            onClick={() => setSelected(b._id)}
            className="text-left"
          >
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <BatteryIcon className="h-4 w-4 text-warning" />
                    {b.label}
                  </CardTitle>
                  <StatusBadge status={b.status} />
                </div>
                {b.nickname && (
                  <p className="text-xs text-muted-foreground">{b.nickname}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resting V</span>
                  <span className="font-mono">
                    {formatVoltage(b.lastRestingVoltage)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IR</span>
                  <span className="font-mono">
                    {formatMilliOhms(b.lastInternalResistance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cycles</span>
                  <span className="font-mono">{b.cycleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Health</span>
                  <span className="font-mono">
                    {b.healthScore != null ? `${b.healthScore}/100` : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
        {batteries && batteries.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No batteries yet. Add one to start logging measurements.
            </CardContent>
          </Card>
        )}
      </div>

      <BatteryDetail
        id={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
