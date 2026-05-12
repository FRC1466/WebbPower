import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatCurrent, formatVoltage } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useCanWrite } from "@/lib/role";

export default function MatchesRoute() {
  const sessions = useQuery(api.sessions.list);
  const events = useQuery(api.events.list);
  const removeMutation = useMutation(api.sessions.remove);
  const canWrite = useCanWrite();

  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  // Per-card confirm state: sessionId → true if waiting for second click
  const [confirmDelete, setConfirmDelete] = useState<Record<string, boolean>>({});

  const filteredSessions =
    selectedEvent === "all"
      ? sessions
      : sessions?.filter((s) => (s as any).eventId === selectedEvent);

  // Build event name lookup
  const eventNameById = new Map(
    (events ?? []).map((e) => [e._id, e.name]),
  );

  async function handleDelete(e: React.MouseEvent, sessionId: Id<"sessions">) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete[sessionId]) {
      setConfirmDelete((prev) => ({ ...prev, [sessionId]: true }));
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setConfirmDelete((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
      }, 3000);
      return;
    }
    try {
      await removeMutation({ id: sessionId });
      toast.success("Session deleted.");
    } catch (err: any) {
      toast.error("Failed to delete: " + (err?.message ?? "unknown error"));
    }
    setConfirmDelete((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        <p className="text-sm text-muted-foreground">
          Every imported and captured session. Click to see voltage and
          subsystem current detail.
        </p>
      </header>

      {/* Event filter tabs */}
      {events && events.length > 0 && (
        <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {events.map((ev) => (
              <TabsTrigger key={ev._id} value={ev._id}>
                {ev.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredSessions?.map((s) => {
          const isConfirming = !!confirmDelete[s._id];
          return (
            <Link key={s._id} to={`/matches/${s._id}`}>
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base">
                      {s.label}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{s.source}</Badge>
                      {canWrite && (
                        <Button
                          variant={isConfirming ? "destructive" : "ghost"}
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => handleDelete(e, s._id)}
                          title={isConfirming ? "Click again to confirm delete" : "Delete session"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {formatDateTime(s.startedAt)}
                    {(s as any).eventId && eventNameById.has((s as any).eventId) && (
                      <span className="ml-2 text-xs text-muted-foreground/70">
                        {eventNameById.get((s as any).eventId)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak</span>
                    <span className="font-mono">
                      {formatCurrent(s.peakTotalCurrent ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg V</span>
                    <span className="font-mono">
                      {formatVoltage(s.avgVoltage ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brownouts</span>
                    <span className="font-mono">{s.brownoutCount ?? 0}</span>
                  </div>
                  {s.importDone === false && (
                    <Badge variant="warning" className="mt-1">
                      Importing {Math.round((s.importProgress ?? 0) * 100)}%
                    </Badge>
                  )}
                  {isConfirming && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      Click 🗑 again to confirm delete
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filteredSessions && filteredSessions.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {selectedEvent === "all"
                ? "No sessions yet. Capture a live run or import a log to see it here."
                : "No sessions for this event yet."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

