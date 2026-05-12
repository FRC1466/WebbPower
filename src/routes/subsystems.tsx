import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { useIsAdmin } from "@/lib/role";
import { useUiStore } from "@/store/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TopicImportDialog } from "@/components/subsystems/topic-import-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type SubsystemForm = {
  channel: string;
  name: string;
  deviceType: string;
  controller: string;
  nominalCurrent: number;
  stallCurrent: number;
  supplyLimit: number;
  notes: string;
};

const empty: SubsystemForm = {
  channel: "",
  name: "",
  deviceType: "Kraken X60",
  controller: "Talon FX",
  nominalCurrent: 20,
  stallCurrent: 300,
  supplyLimit: 60,
  notes: "",
};

export default function SubsystemsRoute() {
  const allSubs = useQuery(api.subsystems.list);
  const robots = useQuery(api.robots.list);
  const create = useMutation(api.subsystems.create);
  const update = useMutation(api.subsystems.update);
  const remove = useMutation(api.subsystems.remove);
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"subsystems"> | null>(null);
  const [form, setForm] = useState<SubsystemForm>(empty);

  const activeRobotId = useUiStore((s) => s.activeRobotId);
  const setActiveRobotId = useUiStore((s) => s.setActiveRobotId);

  // Filter by active robot; show all if no robot selected.
  const subs = activeRobotId
    ? (allSubs ?? []).filter((s) => (s as any).robotId === activeRobotId)
    : (allSubs ?? []);

  function openForCreate() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Subsystems</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Map PDH/PDP channels to named subsystems with current limits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Robot filter selector */}
          {robots && robots.length > 0 && (
            <Select
              value={activeRobotId ?? ""}
              onValueChange={(v) => setActiveRobotId(v || null)}
            >
              <SelectTrigger className="h-9 w-full text-sm sm:h-8 sm:w-40">
                <SelectValue>
                  {activeRobotId
                    ? robots.find((r) => r._id === activeRobotId)?.name ?? "Robot"
                    : "All robots"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All robots</SelectItem>
                {robots.map((r) => (
                  <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <TopicImportDialog robotId={activeRobotId ?? undefined} />
              <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={(props) => (
                <Button {...props} variant="outline" onClick={openForCreate}>
                  <Plus className="h-4 w-4" /> Manual
                </Button>
              )}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit subsystem" : "New subsystem"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const channel = form.channel !== "" ? Number(form.channel) : undefined;
                    if (editingId) {
                      await update({ id: editingId, ...form, channel, notes: form.notes || undefined });
                      toast.success("Updated.");
                    } else {
                      await create({ ...form, channel, notes: form.notes || undefined, robotId: activeRobotId as any ?? undefined });
                      toast.success("Added.");
                    }
                    setOpen(false);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              >
                <div className="space-y-1">
                  <Label>PDH/PDP channel (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Leave blank for topic-based"
                    value={form.channel}
                    onChange={(e) =>
                      setForm({ ...form, channel: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Device type</Label>
                  <Input
                    value={form.deviceType}
                    onChange={(e) =>
                      setForm({ ...form, deviceType: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Controller</Label>
                  <Input
                    value={form.controller}
                    onChange={(e) =>
                      setForm({ ...form, controller: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nominal current (A)</Label>
                  <Input
                    type="number"
                    value={form.nominalCurrent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nominalCurrent: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Stall current (A)</Label>
                  <Input
                    type="number"
                    value={form.stallCurrent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stallCurrent: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Supply current limit (A)</Label>
                  <Input
                    type="number"
                    value={form.supplyLimit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        supplyLimit: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="submit">
                    {editingId ? "Save" : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Subsystem mapping ({subs?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Nom A</th>
                <th className="py-2 pr-3">Stall A</th>
                <th className="py-2 pr-3">Limit A</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {subs?.toSorted((a, b) => (a.name < b.name ? -1 : 1)).map((s) => (
                <tr key={s._id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {s.topicPaths?.length
                      ? <span title={s.topicPaths.join("\n")}>{s.topicPaths.length} topic(s)</span>
                      : s.channel != null ? `ch${s.channel}` : "—"}
                  </td>
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">{s.deviceType}</td>
                  <td className="py-2 pr-3">{s.nominalCurrent}</td>
                  <td className="py-2 pr-3">{s.stallCurrent}</td>
                  <td className="py-2 pr-3">{s.supplyLimit}</td>
                  <td className="py-2 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(s._id);
                            setForm({
                              channel: s.channel != null ? String(s.channel) : "",
                              name: s.name,
                              deviceType: s.deviceType,
                              controller: s.controller,
                              nominalCurrent: s.nominalCurrent,
                              stallCurrent: s.stallCurrent,
                              supplyLimit: s.supplyLimit,
                              notes: s.notes ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm(`Delete ${s.name}?`)) return;
                            try {
                              await remove({ id: s._id });
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed",
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!subs?.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No subsystems yet. Add one to map a PDH/PDP channel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
