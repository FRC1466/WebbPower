import { get, set, del } from "idb-keyval";

const QUEUE_KEY = "webbpower:measurement-queue";

export type QueuedMeasurement = {
  id: string;
  batteryId: string;
  measuredAt: number;
  restingVoltage: number;
  internalResistance: number;
  cca?: number;
  notes?: string;
};

export async function loadQueue(): Promise<QueuedMeasurement[]> {
  return (await get<QueuedMeasurement[]>(QUEUE_KEY)) ?? [];
}

export async function enqueue(m: Omit<QueuedMeasurement, "id">) {
  const queue = await loadQueue();
  queue.push({ id: crypto.randomUUID(), ...m });
  await set(QUEUE_KEY, queue);
}

export async function clearQueueItem(id: string) {
  const queue = await loadQueue();
  const filtered = queue.filter((q) => q.id !== id);
  if (filtered.length === 0) await del(QUEUE_KEY);
  else await set(QUEUE_KEY, filtered);
}
