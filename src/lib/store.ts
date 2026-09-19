"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { ImportSource, Player, Squad } from "./fm/types";
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

/** Fuentes fijas; los filiales se añaden con addSquad. */
export const DEFAULT_SQUADS: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "ojeados", name: "Ojeados / búsqueda", kind: "ojeados", maxAge: null, competitive: false },
];

interface AppState {
  players: Record<ImportSource, Player[]>;
  imports: Record<ImportSource, ImportMeta | null>;
  /** Plantillas del club (primer equipo, filiales) y la lista de ojeados. */
  squads: Squad[];
  /** Cabecera → clave forzada, reutilizado en importaciones posteriores. */
  headerOverrides: Record<string, string | null>;
  /** Nombre del club del usuario (se deduce de la plantilla). */
  clubName: string | null;
  hydrated: boolean;
  tactics: Tactic[];
  activeTacticId: string | null;
  /** uid → ids de rasgos que tiene el jugador (entrada manual). */
  playerTraits: Record<string, string[]>;
  /** Opciones del calendario semanal de entrenamiento. */
  trainingWeek: { matchDays: number[]; preseason: boolean; goal?: string; weekIndex?: number; youthTheme?: string };
  /** Presupuestos de fichajes: traspaso total y sueldo máximo por jugador (mismas unidades que la exportación). */
  scoutingBudget: { transfer: number | null; wage: number | null };

  setPlayers: (source: ImportSource, players: Player[], meta: ImportMeta) => void;
  clearSource: (source: ImportSource) => void;
  addSquad: (s: Omit<Squad, "id" | "kind">) => string;
  updateSquad: (id: string, patch: Partial<Squad>) => void;
  removeSquad: (id: string) => void;
  setHeaderOverrides: (o: Record<string, string | null>) => void;
  setClubName: (name: string | null) => void;
  markHydrated: () => void;
  addTactic: (t: Tactic) => void;
  updateTactic: (id: string, patch: Partial<Tactic> | ((t: Tactic) => Tactic)) => void;
  removeTactic: (id: string) => void;
  setActiveTactic: (id: string | null) => void;
  setPlayerTraits: (uid: string, traitIds: string[]) => void;
  setTrainingWeek: (w: { matchDays: number[]; preseason: boolean; goal?: string; weekIndex?: number; youthTheme?: string }) => void;
  setScoutingBudget: (b: { transfer: number | null; wage: number | null }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      players: { plantilla: [], ojeados: [] },
      imports: { plantilla: null, ojeados: null },
      squads: DEFAULT_SQUADS,
      headerOverrides: {},
      clubName: null,
      hydrated: false,
      tactics: [],
      activeTacticId: null,
      playerTraits: {},
      trainingWeek: { matchDays: [5], preseason: false },
      scoutingBudget: { transfer: null, wage: null },

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
      addSquad: (sq) => {
        const id = `filial-${Date.now().toString(36)}`;
        set((s) => ({
          squads: [...s.squads, { ...sq, id, kind: "filial" }],
          players: { ...s.players, [id]: [] },
          imports: { ...s.imports, [id]: null },
        }));
        return id;
      },
      updateSquad: (id, patch) => set((s) => ({ squads: s.squads.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      removeSquad: (id) =>
        set((s) => {
          const players = { ...s.players };
          const imports = { ...s.imports };
          delete players[id];
          delete imports[id];
          return { squads: s.squads.filter((q) => q.id !== id), players, imports };
        }),
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
      setPlayerTraits: (uid, traitIds) => set((s) => ({ playerTraits: { ...s.playerTraits, [uid]: traitIds } })),
      setTrainingWeek: (trainingWeek) => set({ trainingWeek }),
      setScoutingBudget: (scoutingBudget) => set({ scoutingBudget }),
    }),
    {
      name: "fm24-assistant",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        players: s.players,
        imports: s.imports,
        squads: s.squads,
        headerOverrides: s.headerOverrides,
        clubName: s.clubName,
        tactics: s.tactics,
        activeTacticId: s.activeTacticId,
        playerTraits: s.playerTraits,
        trainingWeek: s.trainingWeek,
        scoutingBudget: s.scoutingBudget,
      }),
      // Datos guardados antes de que existieran los filiales: se completan las fuentes fijas.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const squads = p.squads?.length ? p.squads : DEFAULT_SQUADS;
        return { ...current, ...p, squads, players: { plantilla: [], ojeados: [], ...(p.players ?? {}) }, imports: { plantilla: null, ojeados: null, ...(p.imports ?? {}) } };
      },
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
