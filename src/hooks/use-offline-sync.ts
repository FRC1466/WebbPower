import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { loadQueue, clearQueueItem } from "@/lib/measurement-queue";
import { toast } from "sonner";

export function useOfflineSync() {
  const addMeasurement = useMutation(api.batteries.addMeasurement);

  useEffect(() => {
    async function flush() {
      if (!navigator.onLine) return;
      const queue = await loadQueue();
      if (queue.length === 0) return;
      let flushed = 0;
      for (const m of queue) {
        try {
          await addMeasurement({
            batteryId: m.batteryId as unknown as Id<"batteries">,
            restingVoltage: m.restingVoltage,
            internalResistance: m.internalResistance,
            cca: m.cca,
            notes: m.notes,
            measuredAt: m.measuredAt,
          });
          await clearQueueItem(m.id);
          flushed++;
        } catch {
          // leave in queue; try again later
        }
      }
      if (flushed > 0) {
        toast.success(`Synced ${flushed} offline measurement(s).`);
      }
    }
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [addMeasurement]);
}
