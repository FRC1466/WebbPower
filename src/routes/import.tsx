import { useRef, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCanWrite } from "@/lib/role";
import { compareMatches, matchLabel } from "@/lib/match-sort";
import { detectFromFilename, matchTypeToCompLevel } from "@/lib/log-filename";
import { useUiStore, type ActiveImport } from "@/store/ui";
import { UploadCloud, FileCheck2, Loader2, X, AlertCircle } from "lucide-react";

// Per-import tagging state is kept locally (not in Zustand — ephemeral form values).
type TagState = { matchId: string; batteryId: string; notes: string };

export default function ImportRoute() {
  const canWrite = useCanWrite();
  const matches = useQuery(api.matches.list, {});
  const batteries = useQuery(api.batteries.list);
  const subsystems = useQuery(api.subsystems.list);
  const events = useQuery(api.events.list);
  const create = useMutation(api.sessions.create);
  const appendWindow = useMutation(api.sessions.appendSampleWindow);
  const finalize = useMutation(api.sessions.finalize);
  const tagMutation = useMutation(api.sessions.tag);
  const setProgress = useMutation(api.sessions.setImportProgress);
  const remove = useMutation(api.sessions.remove);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Per-import tag form state keyed by import id.
  const [tagStates, setTagStates] = useState<Record<string, TagState>>({});
  // Active event comes from global Zustand store (persists across tabs).
  const activeEventId = useUiStore((s) => s.activeEventId);
  const setActiveEventId = useUiStore((s) => s.setActiveEventId);

  const { activeImports, addImport, updateImport, removeImport } = useUiStore();

  const sortedMatches = useMemo(
    () => (matches ? [...matches].sort(compareMatches) : []),
    [matches],
  );
  const matchLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of sortedMatches) map.set(m._id, matchLabel(m));
    return map;
  }, [sortedMatches]);
  const batteryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of batteries ?? []) {
      map.set(b._id, b.nickname ? `${b.label} (${b.nickname})` : b.label);
    }
    return map;
  }, [batteries]);

  function setTag(importId: string, patch: Partial<TagState>) {
    setTagStates((prev) => {
      const existing = prev[importId] ?? { matchId: "", batteryId: "", notes: "" };
      return { ...prev, [importId]: { ...existing, ...patch } };
    });
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!canWrite) {
        toast.error("Sign in with a writer account to import.");
        return;
      }
      const buf = await file.arrayBuffer();
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "dslog" && ext !== "wpilog") {
        toast.error(`Unsupported file: ${file.name}. Only .dslog and .wpilog are supported.`);
        return;
      }

      const importId = crypto.randomUUID();
      const entry: ActiveImport = {
        id: importId,
        fileName: file.name,
        progress: 0,
        message: "Parsing…",
        done: false,
      };
      addImport(entry);
      setTagStates((prev) => ({ ...prev, [importId]: { matchId: "", batteryId: "", notes: "" } }));

      const worker = new Worker(
        new URL("../workers/log-parser.worker.ts", import.meta.url),
        { type: "module" },
      );

      let createdSessionId: Id<"sessions"> | undefined;
      let importDone = false; // guard against StrictMode double-invocation

      worker.onmessage = async (ev: MessageEvent) => {
        const msg = ev.data as
          | { type: "progress"; progress: number }
          | { type: "done"; result: any }
          | { type: "error"; message: string };

        if (msg.type === "progress") {
          updateImport(importId, { progress: msg.progress * 0.6 });
        } else if (msg.type === "error") {
          if (importDone) return;
          importDone = true;
          worker.terminate();
          updateImport(importId, { done: true, error: msg.message, message: "Failed" });
          if (createdSessionId) {
            const sid = createdSessionId;
            toast.error(`Import failed — ${file.name}`, {
              description: msg.message,
              duration: 15000,
              action: {
                label: "Delete log",
                onClick: async () => {
                  try {
                    await remove({ id: sid });
                    removeImport(importId);
                    toast.success("Incomplete log deleted.");
                  } catch {
                    toast.error("Failed to delete log.");
                  }
                },
              },
            });
          } else {
            toast.error(`Import failed — ${file.name}`, {
              description: msg.message,
              duration: 10000,
            });
          }
        } else if (msg.type === "done") {
          if (importDone) return;
          importDone = true;
          const result = msg.result;
          const sessionId = await create({
            label: file.name,
            source: ext === "dslog" ? "dslog" : "wpilog",
            startedAt: result.startedAt,
            sampleRateHz: 10,
            channels: result.channels,
            eventId: activeEventId ? (activeEventId as unknown as Id<"events">) : undefined,
          });
          createdSessionId = sessionId;
          updateImport(importId, { sessionId, message: "Uploading samples…", progress: 0.65 });
          await setProgress({ id: sessionId, progress: 0.65 });

          const samplesByWindow = new Map<number, any[]>();
          for (const s of result.samples) {
            const win = Math.floor(s.t / 1000);
            let arr = samplesByWindow.get(win);
            if (!arr) { arr = []; samplesByWindow.set(win, arr); }
            arr.push(s);
          }
          const sortedWindows = [...samplesByWindow.keys()].sort((a, b) => a - b);
          let i = 0;
          let voltSum = 0, voltCount = 0, peak = 0, brownouts = 0, energy = 0;
          for (const win of sortedWindows) {
            const samples = samplesByWindow.get(win)!;
            for (const s of samples) {
              voltSum += s.v;
              voltCount++;
              const total = s.c.reduce((a: number, b: number) => a + b, 0);
              if (total > peak) peak = total;
              if (s.v < 6.75) brownouts++;
              energy += (s.v * total * 0.1) / 1000;
            }
            await appendWindow({
              sessionId,
              windowIndex: win,
              startMs: result.startedAt + win * 1000,
              samples,
            });
            i++;
            const p = 0.65 + (i / sortedWindows.length) * 0.3;
            updateImport(importId, { progress: p });
            if (i % 5 === 0 || i === sortedWindows.length) {
              await setProgress({ id: sessionId, progress: p });
            }
          }

          await finalize({
            id: sessionId,
            endedAt: result.endedAt,
            peakTotalCurrent: peak,
            avgVoltage: voltCount > 0 ? voltSum / voltCount : 0,
            energyJoules: energy,
            brownoutCount: brownouts,
          });
          updateImport(importId, { progress: 1, message: "Done", done: true });
          worker.terminate();

          // Auto-suggest match.
          const fromFile = detectFromFilename(file.name);
          const fromLog = result.meta ?? {};
          const guessedLevel = matchTypeToCompLevel(fromLog.matchType) ?? fromFile.compLevel;
          const guessedNumber = fromLog.matchNumber ?? fromFile.matchNumber;
          const guessedSet = fromFile.setNumber;
          if (guessedLevel && guessedLevel !== "practice" && guessedNumber != null && sortedMatches.length > 0) {
            const found = sortedMatches.find(
              (m) =>
                m.compLevel === guessedLevel &&
                m.matchNumber === guessedNumber &&
                (guessedSet == null || (m.setNumber ?? 0) === guessedSet),
            );
            if (found) setTag(importId, { matchId: found._id });
          }

          toast.success(`Import complete — ${file.name}`, {
            description: "Head to Import to tag it with a match & battery.",
            duration: 8000,
          });
        }
      };

      const wantedTopics: string[] = [];
      if (ext === "wpilog" && subsystems) {
        for (const s of subsystems) {
          if (s.topicPaths) wantedTopics.push(...s.topicPaths);
        }
      }
      worker.postMessage(
        { type: ext === "dslog" ? "parse-dslog" : "parse-wpilog", buf, fileName: file.name, wantedTopics },
        [buf],
      );
    },
    [canWrite, subsystems, sortedMatches, activeEventId, create, appendWindow, finalize, setProgress, remove, addImport, updateImport, removeImport],
  );

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) void handleFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) void handleFile(f);
  }

  const hasActive = activeImports.some((imp) => !imp.done);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Log import</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Upload one or more .dslog / .wpilog files. Each parses in its own Web Worker — you
          can navigate away and imports will keep going.
        </p>
      </header>

      {/* Event selector */}
      {events && events.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Label className="shrink-0">Event</Label>
          <Select value={activeEventId ?? ""} onValueChange={(val) => setActiveEventId(val || null)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue>
                {activeEventId
                  ? events.find((e) => e._id === activeEventId)?.name ?? "Select event"
                  : "No event"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No event</SelectItem>
              {events.map((ev) => (
                <SelectItem key={ev._id} value={ev._id}>
                  {ev.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            New imports will be tagged to this event.
          </p>
        </div>
      )}

      {/* Drop zone */}
      <button
        type="button"
        disabled={!canWrite}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "w-full rounded-xl border-2 border-dashed transition-colors p-6 sm:p-10 flex flex-col items-center gap-3 cursor-pointer text-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 hover:bg-accent/30",
        ].join(" ")}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Click to choose files, or drag &amp; drop</p>
          <p className="text-sm text-muted-foreground">.dslog · .wpilog · select multiple</p>
        </div>
        {hasActive && (
          <p className="text-xs text-muted-foreground">
            {activeImports.filter((i) => !i.done).length} import(s) in progress
          </p>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".dslog,.dsevents,.wpilog"
        multiple
        className="hidden"
        onChange={onInputChange}
      />

      {/* Import cards — one per file, persists across navigation */}
      {activeImports.map((imp) => (
        <ImportCard
          key={imp.id}
          imp={imp}
          tagState={tagStates[imp.id] ?? { matchId: "", batteryId: "", notes: "" }}
          setTag={(patch) => setTag(imp.id, patch)}
          sortedMatches={sortedMatches}
          batteries={batteries ?? []}
          matchLabelById={matchLabelById}
          batteryLabelById={batteryLabelById}
          onDismiss={() => removeImport(imp.id)}
          onTag={async () => {
            if (!imp.sessionId) return;
            const ts = tagStates[imp.id];
            await tagMutation({
              id: imp.sessionId,
              matchId: ts?.matchId ? (ts.matchId as unknown as Id<"matches">) : undefined,
              batteryId: ts?.batteryId ? (ts.batteryId as unknown as Id<"batteries">) : undefined,
              notes: ts?.notes || undefined,
            });
            toast.success("Session tagged.");
          }}
          onDeleteFailed={async () => {
            if (!imp.sessionId) { removeImport(imp.id); return; }
            try {
              await remove({ id: imp.sessionId });
              removeImport(imp.id);
              toast.success("Incomplete log deleted.");
            } catch {
              toast.error("Failed to delete log.");
            }
          }}
        />
      ))}
    </div>
  );
}

function ImportCard({
  imp,
  tagState,
  setTag,
  sortedMatches,
  batteries,
  matchLabelById,
  batteryLabelById,
  onDismiss,
  onTag,
  onDeleteFailed,
}: {
  imp: ActiveImport;
  tagState: TagState;
  setTag: (patch: Partial<TagState>) => void;
  sortedMatches: any[];
  batteries: any[];
  matchLabelById: Map<string, string>;
  batteryLabelById: Map<string, string>;
  onDismiss: () => void;
  onTag: () => Promise<void>;
  onDeleteFailed: () => Promise<void>;
}) {
  const failed = !!imp.error;

  return (
    <Card className={failed ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {failed ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          ) : imp.done ? (
            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{imp.fileName}</CardTitle>
            <CardDescription className={failed ? "text-destructive" : undefined}>
              {imp.error ?? imp.message}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={imp.progress * 100} className={failed ? "opacity-40" : undefined} />

        {failed && (
          <Button variant="destructive" size="sm" onClick={onDeleteFailed}>
            Delete incomplete log
          </Button>
        )}

        {imp.done && !failed && imp.sessionId && (
          <>
            <Separator />
            <p className="text-sm font-medium">Tag this session</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Match</Label>
                <Select value={tagState.matchId} onValueChange={(val) => setTag({ matchId: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue>
                      {tagState.matchId ? matchLabelById.get(tagState.matchId) : "Select match"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sortedMatches.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {matchLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Battery</Label>
                <Select value={tagState.batteryId} onValueChange={(val) => setTag({ batteryId: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue>
                      {tagState.batteryId ? batteryLabelById.get(tagState.batteryId) : "Select battery"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {batteries.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.label}{b.nickname ? ` (${b.nickname})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={tagState.notes} onChange={(e) => setTag({ notes: e.target.value })} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button className="flex-1" onClick={onTag}>
                  Save tags
                </Button>
                <Button variant="outline" onClick={onDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
