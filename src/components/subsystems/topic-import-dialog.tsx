import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileSearch, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TopicEntry = {
  name: string;
  type: string;
  sampleCount: number;
  stats?: { min: number; max: number; mean: number };
};

type PendingSubsystem = {
  id: string;
  name: string;
  topicPaths: string[];
  supplyLimit: number;
};

// Build a folder tree from flat topic paths.
type TreeNode = {
  label: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  entry?: TopicEntry;
};

function buildTree(entries: TopicEntry[]): TreeNode {
  const root: TreeNode = { label: "", fullPath: "", children: new Map() };
  for (const entry of entries) {
    const parts = entry.name.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        node.children.set(part, {
          label: part,
          fullPath: "/" + parts.slice(0, i + 1).join("/"),
          children: new Map(),
        });
      }
      node = node.children.get(part)!;
    }
    node.entry = entry;
  }
  return root;
}

function TopicRow({
  node,
  depth,
  selected,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selected: Set<string>;
  onToggle: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isLeaf = node.children.size === 0 && node.entry != null;
  const isFolder = node.children.size > 0;

  const folderSelectedCount = isFolder
    ? [...getAllLeafPaths(node)].filter((p) => selected.has(p)).length
    : 0;
  const folderTotal = isFolder ? [...getAllLeafPaths(node)].length : 0;

  return (
    <>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/40",
          isLeaf && selected.has(node.fullPath) && "bg-accent/60",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isLeaf) {
            onToggle(node.fullPath);
          } else {
            setExpanded((x) => !x);
          }
        }}
      >
        {isFolder ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 shrink-0"
            readOnly
            checked={selected.has(node.fullPath)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle(node.fullPath)}
          />
        )}
        <span className={cn("truncate", isFolder && "font-medium")}>
          {node.label}
        </span>
        {isFolder && folderSelectedCount > 0 && (
          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
            {folderSelectedCount}/{folderTotal}
          </Badge>
        )}
        {isLeaf && node.entry?.stats != null && (
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
            avg {node.entry.stats.mean.toFixed(1)} A
          </span>
        )}
      </div>
      {isFolder && expanded && (
        <>
          {[...node.children.values()].map((child) => (
            <TopicRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </>
      )}
    </>
  );
}

function* getAllLeafPaths(node: TreeNode): Generator<string> {
  if (node.children.size === 0 && node.entry) {
    yield node.fullPath;
  } else {
    for (const child of node.children.values()) {
      yield* getAllLeafPaths(child);
    }
  }
}

export function TopicImportDialog({
  onDone,
  robotId,
}: {
  onDone?: () => void;
  robotId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "select" | "group">("upload");
  const [entries, setEntries] = useState<TopicEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingSubsystem[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupLimit, setGroupLimit] = useState("60");
  const [busy, setBusy] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const createFromTopics = useMutation(api.subsystems.createFromTopics);

  const handleFile = useCallback((file: File) => {
    setBusy(true);
    const w = new Worker(
      new URL("../../workers/log-parser.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = w;
    file.arrayBuffer().then((buf) => {
      w.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        if (msg.type === "described") {
          const result = msg.result as {
            entries: TopicEntry[];
            stats: Record<string, { min: number; max: number; mean: number; count: number }>;
          };
          const enriched = result.entries.map((e) => ({
            ...e,
            stats: result.stats[e.name],
          }));
          // Filter down to scalar numeric entries (not arrays, not metadata).
          const scalar = enriched.filter(
            (e) =>
              (e.type === "double" || e.type === "float") &&
              !e.name.startsWith("/.schema"),
          );
          setEntries(scalar);
          setStep("select");
          setBusy(false);
        } else if (msg.type === "error") {
          toast.error(msg.message);
          setBusy(false);
        }
      };
      w.postMessage({ type: "describe-wpilog", buf }, [buf]);
    });
  }, []);

  function toggleTopic(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function addGroup() {
    if (!groupName.trim()) { toast.error("Enter a subsystem name"); return; }
    if (selected.size === 0) { toast.error("Select at least one topic"); return; }
    setPending((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: groupName.trim(),
        topicPaths: [...selected],
        supplyLimit: Number(groupLimit) || 60,
      },
    ]);
    setGroupName("");
    setSelected(new Set());
    setStep("group");
  }

  async function save(replace: boolean) {
    if (pending.length === 0) { toast.error("Add at least one subsystem"); return; }
    setBusy(true);
    try {
      const result = await createFromTopics({
        robotId: robotId as any,
        subsystems: pending.map((p) => ({
          name: p.name,
          topicPaths: p.topicPaths,
          supplyLimit: p.supplyLimit,
        })),
        replaceExisting: replace,
      });
      toast.success(`Saved ${result.inserted} subsystem(s).`);
      setOpen(false);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function resetDialog() {
    setStep("upload");
    setEntries([]);
    setSelected(new Set());
    setPending([]);
    setGroupName("");
    setGroupLimit("60");
    workerRef.current?.terminate();
  }

  const tree = buildTree(
    entries.filter(
      (e) => !pending.some((p) => p.topicPaths.includes(e.name)),
    ),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetDialog();
      }}
    >
      <DialogTrigger
        render={(props) => (
          <Button {...props} variant="outline" size="sm">
            <FileSearch className="h-4 w-4" />
            <span className="hidden sm:inline">Import from log</span>
            <span className="sm:hidden">Import</span>
          </Button>
        )}
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import subsystems from log</DialogTitle>
          <DialogDescription>
            Upload a .wpilog, select current topics, then group them into named subsystems.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload any match log — the file is only read locally to discover topic names.
            </p>
            <Input
              type="file"
              accept=".wpilog"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {busy && (
              <p className="text-sm text-muted-foreground">Scanning topics…</p>
            )}
          </div>
        )}

        {(step === "select" || step === "group") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left: topic tree */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Topics ({entries.filter((e) => !pending.some((p) => p.topicPaths.includes(e.name))).length} available)
                </span>
                <span className="text-xs text-muted-foreground">
                  {selected.size} selected
                </span>
              </div>
              <ScrollArea className="h-48 rounded-md border sm:h-72">
                <div className="py-1">
                  {[...tree.children.values()].map((child) => (
                    <TopicRow
                      key={child.fullPath}
                      node={child}
                      depth={0}
                      selected={selected}
                      onToggle={toggleTopic}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: group builder */}
            <div className="space-y-3">
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  Group selected into subsystem
                </p>
                {selected.size > 0 && (
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {[...selected].map((p) => (
                      <div key={p} className="truncate text-xs text-muted-foreground">
                        {p.split("/").pop()}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Subsystem name</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Drivetrain, Arm, Flywheel…"
                    onKeyDown={(e) => e.key === "Enter" && addGroup()}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Supply limit (A)</Label>
                  <Input
                    type="number"
                    value={groupLimit}
                    onChange={(e) => setGroupLimit(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={addGroup}
                  disabled={selected.size === 0 || !groupName.trim()}
                >
                  <Plus className="h-4 w-4" /> Add subsystem
                </Button>
              </div>

              {pending.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Pending ({pending.length})
                  </p>
                  {pending.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                    >
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.topicPaths.length} topic(s)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setPending((prev) => prev.filter((x) => x.id !== p.id))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step !== "upload" && (
          <>
            <Separator />
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setStep("select")}>
                ← Back to topics
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pending.length === 0 || busy}
                  onClick={() => save(false)}
                >
                  Add to existing
                </Button>
                <Button
                  disabled={pending.length === 0 || busy}
                  onClick={() => save(true)}
                >
                  Replace all & save
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
