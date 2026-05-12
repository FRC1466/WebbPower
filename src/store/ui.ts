import { create } from "zustand";
import type { Id } from "@convex/_generated/dataModel";

export type ActiveImport = {
  id: string; // unique per import (crypto.randomUUID)
  fileName: string;
  progress: number;
  message: string;
  sessionId?: Id<"sessions">;
  done: boolean;
  error?: string;
};

type UiState = {
  selectedBatteryId: string | null;
  setSelectedBatteryId: (id: string | null) => void;
  selectedMatchId: string | null;
  setSelectedMatchId: (id: string | null) => void;
  liveTab: "subsystems" | "channels";
  setLiveTab: (t: "subsystems" | "channels") => void;
  // Active robot & event — persisted in memory for the session.
  activeRobotId: string | null;
  setActiveRobotId: (id: string | null) => void;
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  activeImports: ActiveImport[];
  addImport: (imp: ActiveImport) => void;
  updateImport: (id: string, partial: Partial<ActiveImport>) => void;
  removeImport: (id: string) => void;
  // Legacy compat (single import) — kept so nothing else breaks
  activeImport: ActiveImport | null;
  setActiveImport: (imp: ActiveImport | null) => void;
  updateActiveImport: (partial: Partial<ActiveImport>) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedBatteryId: null,
  setSelectedBatteryId: (id) => set({ selectedBatteryId: id }),
  selectedMatchId: null,
  setSelectedMatchId: (id) => set({ selectedMatchId: id }),
  liveTab: "subsystems",
  setLiveTab: (t) => set({ liveTab: t }),

  activeRobotId: null,
  setActiveRobotId: (id) => set({ activeRobotId: id }),
  activeEventId: null,
  setActiveEventId: (id) => set({ activeEventId: id }),

  activeImports: [],
  addImport: (imp) => set((s) => ({ activeImports: [...s.activeImports, imp] })),
  updateImport: (id, partial) =>
    set((s) => ({
      activeImports: s.activeImports.map((imp) =>
        imp.id === id ? { ...imp, ...partial } : imp,
      ),
    })),
  removeImport: (id) =>
    set((s) => ({ activeImports: s.activeImports.filter((imp) => imp.id !== id) })),

  // Legacy single-import shim — maps to activeImports[0]
  get activeImport() {
    return (this as UiState).activeImports[0] ?? null;
  },
  setActiveImport: (imp) =>
    set((s) => ({
      activeImports: imp ? [imp, ...s.activeImports.slice(1)] : s.activeImports.slice(1),
    })),
  updateActiveImport: (partial) =>
    set((s) => {
      if (s.activeImports.length === 0) return s;
      const [first, ...rest] = s.activeImports;
      return { activeImports: [{ ...first, ...partial }, ...rest] };
    }),
}));
