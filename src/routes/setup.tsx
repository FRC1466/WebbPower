import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useIsAdmin, useCurrentUser } from "@/lib/role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Plus, Trash2, Pencil, Check, X } from "lucide-react";

export default function SetupRoute() {
  const user = useCurrentUser();
  const cfg = useQuery(api.config.getConfig);
  const upsert = useMutation(api.config.upsertConfig);
  const importTba = useAction(api.tba.importEvent);
  const claimAdmin = useMutation(api.users.claimFirstAdmin);
  const isAdmin = useIsAdmin();

  // Robots
  const robots = useQuery(api.robots.list);
  const createRobot = useMutation(api.robots.create);
  const updateRobot = useMutation(api.robots.update);
  const removeRobot = useMutation(api.robots.remove);

  // Events
  const events = useQuery(api.events.list);
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  const [eventKey, setEventKey] = useState("");
  const [teamKey, setTeamKey] = useState("");
  const [pdType, setPdType] = useState<"PDH" | "PDP">("PDH");
  const [brownout, setBrownout] = useState("6.75");
  const [nt4Host, setNt4Host] = useState("");
  const [busy, setBusy] = useState(false);

  // New robot form
  const [newRobot, setNewRobot] = useState({ name: "", pdType: "PDH" as "PDH" | "PDP", brownoutThreshold: "6.75", nt4Host: "", notes: "" });
  const [editingRobotId, setEditingRobotId] = useState<Id<"robots"> | null>(null);
  const [editRobot, setEditRobot] = useState({ name: "", pdType: "PDH" as "PDH" | "PDP", brownoutThreshold: "6.75", nt4Host: "", notes: "" });

  // New event form
  const [newEvent, setNewEvent] = useState({ name: "", robotId: "" as string, tbaEventKey: "", notes: "" });
  const [editingEventId, setEditingEventId] = useState<Id<"events"> | null>(null);
  const [editEvent, setEditEvent] = useState({ name: "", robotId: "" as string, tbaEventKey: "", notes: "" });

  useEffect(() => {
    if (cfg) {
      setEventKey(cfg.tbaEventKey ?? "");
      setTeamKey(cfg.tbaTeamKey ?? "");
      setPdType(cfg.pdType);
      setBrownout(String(cfg.brownoutThreshold));
      setNt4Host(cfg.nt4Host);
    }
  }, [cfg]);

  if (user === null) return <p>Sign in required.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Event, robot and capture configuration. Admin only.
        </p>
      </header>

      {!isAdmin && user && !user.isAnonymous && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>No admin yet</AlertTitle>
          <AlertDescription>
            If no admin exists yet, the first signed-in user can claim it.
            <div className="mt-2">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await claimAdmin({});
                    toast.success("You are now admin.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                Claim admin role
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event & Robot</CardTitle>
          <CardDescription>
            TBA event/team keys, power distribution type, brownout threshold, NT4 host.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!isAdmin) {
                toast.error("Admin only");
                return;
              }
              setBusy(true);
              try {
                await upsert({
                  tbaEventKey: eventKey || undefined,
                  tbaTeamKey: teamKey || undefined,
                  pdType,
                  brownoutThreshold: Number(brownout),
                  nt4Host,
                });
                toast.success("Saved.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Save failed",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-key">TBA event key</Label>
                <Input
                  id="event-key"
                  value={eventKey}
                  onChange={(e) => setEventKey(e.target.value)}
                  placeholder="2026nvlv"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-key">TBA team key</Label>
                <Input
                  id="team-key"
                  value={teamKey}
                  onChange={(e) => setTeamKey(e.target.value)}
                  placeholder="frc1466"
                />
              </div>
              <div className="space-y-2">
                <Label>Power distribution</Label>
                <Select
                  value={pdType}
                  onValueChange={(v) => setPdType(v as "PDH" | "PDP")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDH">REV PDH (24 channels)</SelectItem>
                    <SelectItem value="PDP">CTRE PDP (16 channels)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brownout">Brownout threshold (V)</Label>
                <Input
                  id="brownout"
                  type="number"
                  step="0.01"
                  value={brownout}
                  onChange={(e) => setBrownout(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nt4-host">NT4 server address</Label>
                <Input
                  id="nt4-host"
                  value={nt4Host}
                  onChange={(e) => setNt4Host(e.target.value)}
                  placeholder="roborio-1466-frc.local or 10.14.66.2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={busy || !isAdmin}>
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import TBA schedule</CardTitle>
          <CardDescription>
            Pulls qualification matches and times for the saved event key.
            Requires TBA_API_KEY in Convex env.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            disabled={!cfg?.tbaEventKey || busy || !isAdmin}
            onClick={async () => {
              if (!cfg?.tbaEventKey) {
                toast.error("Save an event key first");
                return;
              }
              setBusy(true);
              try {
                const result = await importTba({
                  eventKey: cfg.tbaEventKey,
                  teamKey: cfg.tbaTeamKey,
                });
                toast.success(`Imported ${result.imported} matches.`);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Import failed",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Import schedule
          </Button>
        </CardContent>
      </Card>

      {/* ── Robots ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Robots</CardTitle>
          <CardDescription>
            Each robot has its own power distribution config and NT4 address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing robots */}
          {robots && robots.length > 0 && (
            <div className="space-y-2">
              {robots.map((r) =>
                editingRobotId === r._id ? (
                  <div key={r._id} className="rounded-lg border p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input value={editRobot.name} onChange={(e) => setEditRobot((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>PD type</Label>
                        <Select value={editRobot.pdType} onValueChange={(v) => setEditRobot((p) => ({ ...p, pdType: v as "PDH" | "PDP" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PDH">REV PDH</SelectItem>
                            <SelectItem value="PDP">CTRE PDP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Brownout (V)</Label>
                        <Input type="number" step="0.01" value={editRobot.brownoutThreshold} onChange={(e) => setEditRobot((p) => ({ ...p, brownoutThreshold: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>NT4 host</Label>
                        <Input value={editRobot.nt4Host} onChange={(e) => setEditRobot((p) => ({ ...p, nt4Host: e.target.value }))} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Notes</Label>
                        <Input value={editRobot.notes} onChange={(e) => setEditRobot((p) => ({ ...p, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => {
                        try {
                          await updateRobot({ id: r._id, name: editRobot.name, pdType: editRobot.pdType, brownoutThreshold: Number(editRobot.brownoutThreshold), nt4Host: editRobot.nt4Host, notes: editRobot.notes || undefined });
                          setEditingRobotId(null);
                          toast.success("Robot updated.");
                        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                      }}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingRobotId(null)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div key={r._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.pdType} · {r.nt4Host} · brownout {r.brownoutThreshold}V</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setEditingRobotId(r._id);
                          setEditRobot({ name: r.name, pdType: r.pdType, brownoutThreshold: String(r.brownoutThreshold), nt4Host: r.nt4Host, notes: r.notes ?? "" });
                        }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={async () => {
                          try { await removeRobot({ id: r._id }); toast.success("Robot deleted."); }
                          catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {isAdmin && (
            <>
              {robots && robots.length > 0 && <Separator />}
              <p className="text-sm font-medium">Add robot</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="Robot name" value={newRobot.name} onChange={(e) => setNewRobot((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>PD type</Label>
                  <Select value={newRobot.pdType} onValueChange={(v) => setNewRobot((p) => ({ ...p, pdType: v as "PDH" | "PDP" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDH">REV PDH</SelectItem>
                      <SelectItem value="PDP">CTRE PDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Brownout (V)</Label>
                  <Input type="number" step="0.01" value={newRobot.brownoutThreshold} onChange={(e) => setNewRobot((p) => ({ ...p, brownoutThreshold: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>NT4 host</Label>
                  <Input placeholder="10.14.66.2" value={newRobot.nt4Host} onChange={(e) => setNewRobot((p) => ({ ...p, nt4Host: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes (optional)</Label>
                  <Input value={newRobot.notes} onChange={(e) => setNewRobot((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" disabled={!newRobot.name || !newRobot.nt4Host} onClick={async () => {
                try {
                  await createRobot({ name: newRobot.name, pdType: newRobot.pdType, brownoutThreshold: Number(newRobot.brownoutThreshold), nt4Host: newRobot.nt4Host, notes: newRobot.notes || undefined });
                  setNewRobot({ name: "", pdType: "PDH", brownoutThreshold: "6.75", nt4Host: "", notes: "" });
                  toast.success("Robot added.");
                } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add robot
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Events ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Competition events attended by each robot. Sessions can be tagged to an event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {events && events.length > 0 && (
            <div className="space-y-2">
              {events.map((ev) =>
                editingEventId === ev._id ? (
                  <div key={ev._id} className="rounded-lg border p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input value={editEvent.name} onChange={(e) => setEditEvent((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Robot</Label>
                        <Select value={editEvent.robotId} onValueChange={(v) => setEditEvent((p) => ({ ...p, robotId: v ?? "" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(robots ?? []).map((r) => <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>TBA event key</Label>
                        <Input placeholder="2026nvlv" value={editEvent.tbaEventKey} onChange={(e) => setEditEvent((p) => ({ ...p, tbaEventKey: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Notes</Label>
                        <Input value={editEvent.notes} onChange={(e) => setEditEvent((p) => ({ ...p, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => {
                        try {
                          await updateEvent({ id: ev._id, name: editEvent.name, robotId: editEvent.robotId as Id<"robots">, tbaEventKey: editEvent.tbaEventKey || undefined, notes: editEvent.notes || undefined });
                          setEditingEventId(null);
                          toast.success("Event updated.");
                        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                      }}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingEventId(null)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div key={ev._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {robots?.find((r) => r._id === ev.robotId)?.name ?? "Unknown robot"}
                        {ev.tbaEventKey && ` · ${ev.tbaEventKey}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setEditingEventId(ev._id);
                          setEditEvent({ name: ev.name, robotId: ev.robotId, tbaEventKey: ev.tbaEventKey ?? "", notes: ev.notes ?? "" });
                        }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={async () => {
                          try { await removeEvent({ id: ev._id }); toast.success("Event deleted."); }
                          catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {isAdmin && (
            <>
              {events && events.length > 0 && <Separator />}
              <p className="text-sm font-medium">Add event</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Silicon Valley Regional" value={newEvent.name} onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Robot</Label>
                  <Select value={newEvent.robotId} onValueChange={(v) => setNewEvent((p) => ({ ...p, robotId: v ?? "" }))}>
                    <SelectTrigger><SelectValue>{newEvent.robotId ? robots?.find((r) => r._id === newEvent.robotId)?.name : "Select robot"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {(robots ?? []).map((r) => <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>TBA event key (optional)</Label>
                  <Input placeholder="2026nvlv" value={newEvent.tbaEventKey} onChange={(e) => setNewEvent((p) => ({ ...p, tbaEventKey: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input value={newEvent.notes} onChange={(e) => setNewEvent((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" disabled={!newEvent.name || !newEvent.robotId || !(robots && robots.length > 0)} onClick={async () => {
                try {
                  await createEvent({ name: newEvent.name, robotId: newEvent.robotId as Id<"robots">, tbaEventKey: newEvent.tbaEventKey || undefined, notes: newEvent.notes || undefined, startedAt: Date.now() });
                  setNewEvent({ name: "", robotId: "", tbaEventKey: "", notes: "" });
                  toast.success("Event added.");
                } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add event
              </Button>
              {!(robots && robots.length > 0) && (
                <p className="text-xs text-muted-foreground">Add a robot first before creating an event.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
