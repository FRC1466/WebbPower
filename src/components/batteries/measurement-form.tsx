import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { enqueue } from "@/lib/measurement-queue";

export function MeasurementForm({ batteryId }: { batteryId: Id<"batteries"> }) {
  const add = useMutation(api.batteries.addMeasurement);
  const [v, setV] = useState("");
  const [ir, setIr] = useState("");
  const [cca, setCca] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid grid-cols-2 gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const payload = {
          batteryId,
          restingVoltage: Number(v),
          internalResistance: Number(ir),
          cca: cca ? Number(cca) : undefined,
          notes: notes || undefined,
        };
        setBusy(true);
        try {
          await add(payload);
          toast.success("Measurement saved.");
          setV("");
          setIr("");
          setCca("");
          setNotes("");
        } catch (err) {
          if (!navigator.onLine) {
            await enqueue({
              ...payload,
              measuredAt: Date.now(),
              batteryId: batteryId as unknown as string,
            });
            toast.success("Offline — queued for sync.");
            setV("");
            setIr("");
            setCca("");
            setNotes("");
          } else {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h4 className="col-span-2 text-sm font-semibold">New measurement</h4>
      <div className="space-y-1">
        <Label>Resting V</Label>
        <Input
          inputMode="decimal"
          required
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>IR (mΩ)</Label>
        <Input
          inputMode="decimal"
          required
          value={ir}
          onChange={(e) => setIr(e.target.value)}
        />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>CCA (optional)</Label>
        <Input
          inputMode="numeric"
          value={cca}
          onChange={(e) => setCca(e.target.value)}
        />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Notes</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="submit" className="col-span-2" disabled={busy}>
        Save measurement
      </Button>
    </form>
  );
}
