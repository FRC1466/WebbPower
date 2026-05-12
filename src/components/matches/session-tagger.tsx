import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCanWrite } from "@/lib/role";
import { compareMatches, matchLabel } from "@/lib/match-sort";

const UNSET = "__none__";

export function SessionTagger({
  sessionId,
  currentBatteryId,
  currentMatchId,
  currentNotes,
}: {
  sessionId: Id<"sessions">;
  currentBatteryId?: Id<"batteries">;
  currentMatchId?: Id<"matches">;
  currentNotes?: string;
}) {
  const canWrite = useCanWrite();
  const batteries = useQuery(api.batteries.list);
  const matches = useQuery(api.matches.list, {});
  const tag = useMutation(api.sessions.tag);

  const [open, setOpen] = useState(false);
  const [batteryId, setBatteryId] = useState<string>(currentBatteryId ?? UNSET);
  const [matchId, setMatchId] = useState<string>(currentMatchId ?? UNSET);
  const [notes, setNotes] = useState<string>(currentNotes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setBatteryId(currentBatteryId ?? UNSET);
      setMatchId(currentMatchId ?? UNSET);
      setNotes(currentNotes ?? "");
    }
  }, [open, currentBatteryId, currentMatchId, currentNotes]);

  const batteryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of batteries ?? []) {
      map.set(b._id, b.nickname ? `${b.label} (${b.nickname})` : b.label);
    }
    return map;
  }, [batteries]);

  const sortedMatches = useMemo(() => {
    if (!matches) return [];
    return [...matches].sort(compareMatches);
  }, [matches]);

  const matchLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of sortedMatches) map.set(m._id, matchLabel(m));
    return map;
  }, [sortedMatches]);

  if (!canWrite) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button {...props} variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Tag battery & match
          </Button>
        )}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag this session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Battery</Label>
            <Select value={batteryId} onValueChange={setBatteryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select battery">
                  {(v) =>
                    v === UNSET || !v
                      ? "— None —"
                      : (batteryLabelById.get(v) ?? "Select battery")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— None —</SelectItem>
                {batteries?.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.label}
                    {b.nickname ? ` (${b.nickname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Match</Label>
            <Select value={matchId} onValueChange={setMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select match">
                  {(v) =>
                    v === UNSET || !v
                      ? "— Practice / unmatched —"
                      : (matchLabelById.get(v) ?? "Select match")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>— Practice / unmatched —</SelectItem>
                {sortedMatches.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {matchLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await tag({
                  id: sessionId,
                  batteryId:
                    batteryId === UNSET
                      ? undefined
                      : (batteryId as Id<"batteries">),
                  matchId:
                    matchId === UNSET
                      ? undefined
                      : (matchId as Id<"matches">),
                  notes: notes || undefined,
                });
                toast.success("Tagged.");
                setOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
