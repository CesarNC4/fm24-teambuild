"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { ImportSource, Player, Squad } from "./fm/types";
import { migrateTacticRoles, type Tactic } from "./fm/tactics";
import { migrateInstructions } from "./fm/instructions";
import { appendSnapshots, type History } from "./fm/history";
import type { TrainingWeekSettings } from "./fm/training";

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

/** La liga se calcula sola (primer equipo + rivales de liga); esta fuente es la búsqueda manual que la completa. */
const LIGA_NAME = "Liga (búsqueda, opcional)";

/** Fuentes fijas; los filiales y los rivales se añaden con addSquad. */
export const DEFAULT_SQUADS: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "ojeados", name: "Ojeados / búsqueda", kind: "ojeados", maxAge: null, competitive: false },
  { id: "liga", name: LIGA_NAME, kind: "liga", maxAge: null, competitive: true },
];

/** Seguimiento de un objetivo de fichaje (por UID, sobrevive a las importaciones). */
export interface TargetEntry {
  status: "seguir" | "ofertar" | "rechazado" | "fichado";
  note: string;
  addedAt: string;
  /** Datos en el momento de marcarlo, para detectar cambios. */
  snapshot: { name: string; club: string | null; value: number | null; wage: number | null; contractExpiry: string | null; age: number | null };
}

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
  trainingWeek: TrainingWeekSettings;
  /** Presupuestos de fichajes: traspaso total y sueldo máximo por jugador (mismas unidades que la exportación). */
  scoutingBudget: { transfer: number | null; wage: number | null };
  /** Fotos de atributos por UID en cada importación (evolución). */
  history: History;
  /** Objetivos de fichaje marcados en Ojeados. */
  targets: Record<string, TargetEntry>;
  /** Número de clubes de tu liga, para el aviso de cobertura de la liga calculada. */
  leagueSize: number;

  setPlayers: (source: ImportSource, players: Player[], meta: ImportMeta) => void;
  clearSource: (source: ImportSource) => void;
  addSquad: (s: Omit<Squad, "id">) => string;
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
  setTrainingWeek: (w: TrainingWeekSettings) => void;
  setScoutingBudget: (b: { transfer: number | null; wage: number | null }) => void;
  setTarget: (uid: string, entry: TargetEntry | null) => void;
  setLeagueSize: (n: number) => void;
  /** Restaura una copia de seguridad (sustituye todo lo persistido). */
  restoreBackup: (data: Partial<PersistedState>) => void;
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
      history: {},
      targets: {},
      leagueSize: 20,

      setPlayers: (source, players, meta) =>
        set((s) => ({
          players: { ...s.players, [source]: players },
          imports: { ...s.imports, [source]: meta },
          clubName: source === "plantilla" ? (mostCommonClub(players) ?? s.clubName) : s.clubName,
          // Los ojeados, la liga y los rivales no cuentan: no son de tu club.
          history: source === "ojeados" || source === "liga" || source.startsWith("rival-") ? s.history : appendSnapshots(s.history, players, meta.importedAt),
        })),
      clearSource: (source) =>
        set((s) => ({
          players: { ...s.players, [source]: [] },
          imports: { ...s.imports, [source]: null },
        })),
      addSquad: (sq) => {
        const id = `${sq.kind}-${Date.now().toString(36)}`;
        set((s) => ({
          squads: [...s.squads, { ...sq, id }],
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
      setTarget: (uid, entry) =>
        set((s) => {
          const targets = { ...s.targets };
          if (entry) targets[uid] = entry; else delete targets[uid];
          return { targets };
        }),
      setLeagueSize: (leagueSize) => set({ leagueSize }),
      restoreBackup: (data) => set((s) => ({ ...s, ...normalizePersisted(data), hydrated: true })),
    }),
    {
      name: "fm24-assistant",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s): PersistedState => ({
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
        history: s.history,
        targets: s.targets,
        leagueSize: s.leagueSize,
      }),
      // Datos guardados antes de que existieran los filiales o la liga: se completan las fuentes fijas.
      merge: (persisted, current) => ({ ...current, ...normalizePersisted((persisted ?? {}) as Partial<PersistedState>) }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

/** Estado que se persiste (y que exporta la copia de seguridad). */
export type PersistedState = Pick<AppState, "players" | "imports" | "squads" | "headerOverrides" | "clubName" | "tactics" | "activeTacticId" | "playerTraits" | "trainingWeek" | "scoutingBudget" | "history" | "targets" | "leagueSize">;

/** Completa fuentes fijas y campos nuevos en datos guardados por versiones anteriores. */
function normalizePersisted(p: Partial<PersistedState>): Partial<PersistedState> {
  // Los rivales creados antes de existir la opción cuentan como Liga; la fuente de liga pasa a llamarse «búsqueda».
  const squads = (p.squads?.length ? p.squads : DEFAULT_SQUADS).map((q) =>
    q.kind === "rival" && !q.competition ? { ...q, competition: "liga" as const } : q.id === "liga" ? { ...q, name: LIGA_NAME } : q);
  for (const d of DEFAULT_SQUADS) if (!squads.some((q) => q.id === d.id)) squads.push(d);
  const players: Record<string, Player[]> = { ...(p.players ?? {}) };
  const imports: Record<string, ImportMeta | null> = { ...(p.imports ?? {}) };
  for (const q of squads) { players[q.id] ??= []; imports[q.id] ??= null; }
  // Instrucciones que ya no existen en FM24 (trampa del fuera de juego, marcaje estricto, anchura defensiva)
  // Roles que ya no caben en su hueco (Organizador en banda en MP banda → Extremo inverso)
  const tactics = (p.tactics ?? []).map((t) => migrateTacticRoles({ ...t, instructions: migrateInstructions(t.instructions ?? []) }));
  return { ...p, squads, players, imports, tactics, history: p.history ?? {}, targets: p.targets ?? {}, leagueSize: p.leagueSize ?? 20 };
}

function mostCommonClub(players: Player[]): string | null {
  const counts = new Map<string, number>();
  for (const p of players) if (p.club) counts.set(p.club, (counts.get(p.club) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
  return best;
}
