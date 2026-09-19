"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { ImportSource, Player } from "./fm/types";
import type { Tactic } from "./fm/tactics";

/** Almacenamiento en IndexedDB (mucha más capacidad que localStorage). */
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => { await idbSet(name, value); },
  removeItem: async (name) => { await idbDel(name); },
};

export interface ImportMeta {
  fileName: string;
  importedAt: string;
  count: number;
}

interface AppState {
  players: Record<ImportSource, Player[]>;
  imports: Record<ImportSource, ImportMeta | null>;
  /** Cabecera → clave forzada, reutilizado en importaciones posteriores. */
  headerOverrides: Record<string, string | null>;
  /** Nombre del club del usuario (se deduce de la plantilla). */
  clubName: string | null;
  hydrated: boolean;
  tactics: Tactic[];
  activeTacticId: string | null;

  setPlayers: (source: ImportSource, players: Player[], meta: ImportMeta) => void;
  clearSource: (source: ImportSource) => void;
  setHeaderOverrides: (o: Record<string, string | null>) => void;
  setClubName: (name: string | null) => void;
  markHydrated: () => void;
  addTactic: (t: Tactic) => void;
  updateTactic: (id: string, patch: Partial<Tactic> | ((t: Tactic) => Tactic)) => void;
  removeTactic: (id: string) => void;
  setActiveTactic: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      players: { plantilla: [], ojeados: [] },
      imports: { plantilla: null, ojeados: null },
      headerOverrides: {},
      clubName: null,
      hydrated: false,
      tactics: [],
      activeTacticId: null,

      setPlayers: (source, players, meta) =>
        set((s) => ({
          players: { ...s.players, [source]: players },
          imports: { ...s.imports, [source]: meta },
          clubName: source === "plantilla" ? (mostCommonClub(players) ?? s.clubName) : s.clubName,
        })),
      clearSource: (source) =>
        set((s) => ({
          players: { ...s.players, [source]: [] },
          imports: { ...s.imports, [source]: null },
        })),
      setHeaderOverrides: (headerOverrides) => set({ headerOverrides }),
      setClubName: (clubName) => set({ clubName }),
      markHydrated: () => set({ hydrated: true }),
      addTactic: (t) => set((s) => ({ tactics: [...s.tactics, t], activeTacticId: t.id })),
      updateTactic: (id, patch) =>
        set((s) => ({
          tactics: s.tactics.map((t) => (t.id !== id ? t : typeof patch === "function" ? patch(t) : { ...t, ...patch })),
        })),
      removeTactic: (id) =>
        set((s) => {
          const tactics = s.tactics.filter((t) => t.id !== id);
          return { tactics, activeTacticId: s.activeTacticId === id ? (tactics[0]?.id ?? null) : s.activeTacticId };
        }),
      setActiveTactic: (activeTacticId) => set({ activeTacticId }),
    }),
    {
      name: "fm24-assistant",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        players: s.players,
        imports: s.imports,
        headerOverrides: s.headerOverrides,
        clubName: s.clubName,
        tactics: s.tactics,
        activeTacticId: s.activeTacticId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

function mostCommonClub(players: Player[]): string | null {
  const counts = new Map<string, number>();
  for (const p of players) if (p.club) counts.set(p.club, (counts.get(p.club) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
  return best;
}
