import { create } from "zustand";

export type LiveSample = {
  capturedAt: number;
  voltage: number;
  totalCurrent: number;
  channelCurrents: number[];
  canUtil: number;
  mode: string;
  matchTime?: number;
};

type LiveState = {
  connected: boolean;
  setConnected: (v: boolean) => void;
  isCapturing: boolean;
  setIsCapturing: (v: boolean) => void;
  latest: LiveSample | null;
  pushSample: (s: LiveSample) => void;
  reset: () => void;
};

// Live store for the capture device. Updates many times/sec — components
// read via selector hooks to avoid re-render storms.
export const useLiveStore = create<LiveState>((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),
  isCapturing: false,
  setIsCapturing: (v) => set({ isCapturing: v }),
  latest: null,
  pushSample: (s) => set({ latest: s }),
  reset: () => set({ latest: null, connected: false, isCapturing: false }),
}));

export const selectVoltage = (s: LiveState) => s.latest?.voltage ?? null;
export const selectTotalCurrent = (s: LiveState) => s.latest?.totalCurrent ?? null;
export const selectCanUtil = (s: LiveState) => s.latest?.canUtil ?? null;
export const selectMode = (s: LiveState) => s.latest?.mode ?? "Unknown";
export const selectMatchTime = (s: LiveState) => s.latest?.matchTime ?? null;
export const selectChannel = (idx: number) => (s: LiveState) =>
  s.latest?.channelCurrents[idx] ?? 0;
