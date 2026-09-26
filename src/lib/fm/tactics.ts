/**
 * Motor táctico: asignación óptima de jugadores a los huecos de una formación,
 * profundidad por hueco y avisos de equilibrio entre roles.
 */

import { FORMATIONS, FORMATION_BY_ID, type Formation, type FormationSlot } from "./formations";
import { ROLE_BY_ID, type RoleDef } from "./roles";
import { DEFAULT_SCORING, scoreRole, type RoleScore, type ScoringConfig } from "./scoring";
import type { Player, PositionSlot, Squad } from "./types";

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

export interface Tactic {
  id: string;
  name: string;
  formationId: string;
  /** slotId → roleId */
  roles: Record<string, string>;
  /** Fijados a mano por plantilla: pool → (slotId → uid). Fijar en el primer equipo no fija en el segundo. */
  locks: Record<string, Record<string, string>>;
  /** Estilo de juego elegido (id de STYLE_PRESETS) o null. */
  styleId: string | null;
  /** Mentalidad del equipo (id de MENTALITIES). Ausente en tácticas antiguas = equilibrada. */
  mentality?: string;
  /** Instrucciones activadas por el usuario (ids). */
  instructions: string[];
  /**
   * Plantilla con la que se arma el XI: "plantilla" (primer equipo, por
   * defecto), "segundo" (primer equipo sin el XI titular), "juveniles" (todos
   * los filiales juveniles juntos), "copa" (primer equipo + juveniles con un
   * mínimo de juveniles en el campo) o el id de un filial.
   */
  pool?: string;
  /** Equipo de copa: mínimo de juveniles en el XI (5 por defecto). */
  cupYouthMin?: number;
}

export const POOL_LABEL: Record<string, string> = {
  plantilla: "Primer equipo",
  segundo: "Segundo equipo",
  juveniles: "Juveniles",
  copa: "Equipo de copa",
};

export const DEFAULT_CUP_YOUTH = 5;

/** Fijados de la táctica en una plantilla (por defecto, la elegida). */
export function tacticLocks(t: Tactic, pool: string = t.pool ?? "plantilla"): Record<string, string> {
  return t.locks?.[pool] ?? {};
}

/** Copia de la táctica con los fijados de una plantilla cambiados. */
export function withLocks(t: Tactic, pool: string, locks: Record<string, string>): Tactic {
  return { ...t, locks: { ...t.locks, [pool]: locks } };
}

/**
 * Roles guardados que ya no se pueden poner en su hueco (p.ej. el Organizador
 * en banda en MP banda, que FM24 no tiene): pasan al rol más parecido.
 */
export function migrateTacticRoles(t: Tactic): Tactic {
  const f = FORMATION_BY_ID[t.formationId];
  if (!f) return t;
  let changed = false;
  const roles = { ...t.roles };
  for (const fs of f.slots) {
    const rid = roles[fs.id];
    const r = rid ? ROLE_BY_ID[rid] : null;
    if (r && r.positions.includes(fs.slot)) continue;
    const dutyOf = rid?.split("-")[1];
    const alt = rid?.startsWith("WP-") && ROLE_BY_ID[`IW-${dutyOf}`] ? `IW-${dutyOf}` : fs.defaultRole;
    if (rid !== alt) { roles[fs.id] = alt; changed = true; }
  }
  return changed ? { ...t, roles } : t;
}

/**
 * Tácticas guardadas antes de los fijados por plantilla: los fijados pasan al
 * primer equipo y «Titulares + filiales» pasa a Equipo de copa.
 */
export function migrateTactic(t: Tactic): Tactic {
  const raw = (t.locks ?? {}) as Record<string, unknown>;
  const flat = Object.values(raw).some((v) => typeof v === "string");
  const locks = flat ? { plantilla: raw as Record<string, string> } : (raw as Tactic["locks"]);
  const pool = t.pool === "todos" ? "copa" : t.pool;
  return migrateTacticRoles({ ...t, locks, ...(pool ? { pool } : {}) });
}

/** Filiales juveniles: los que tienen edad máxima (Sub-18, Sub-21…). El equipo B no cuenta. */
export function youthSquadIds(squads: Squad[]): string[] {
  return squads.filter((q) => q.kind === "filial" && q.maxAge != null).map((q) => q.id);
}

function uniqueByUid(list: Player[]): Player[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.uid) ? false : (seen.add(p.uid), true)));
}

export interface PoolPlayers {
  players: Player[];
  exclude?: Set<string>;
  /** Jugadores importados en un filial juvenil (cuentan como juveniles en la copa). */
  youth: Set<string>;
}

/** Jugadores disponibles para una táctica según su `pool`. */
export function poolPlayers(tactic: Tactic, players: Record<string, Player[]>, squads: Squad[]): PoolPlayers {
  const first = players.plantilla ?? [];
  const pool = tactic.pool ?? "plantilla";
  const youthPlayers = uniqueByUid(youthSquadIds(squads).flatMap((id) => players[id] ?? []));
  const youth = new Set(youthPlayers.map((p) => p.uid));
  if (pool === "segundo") {
    const xi = buildLineup(tactic, first, { locks: tacticLocks(tactic, "plantilla") });
    return { players: first, exclude: new Set(xi.slots.filter((s) => s.starter).map((s) => s.starter!.player.uid)), youth };
  }
  if (pool === "juveniles") return { players: youthPlayers, youth };
  if (pool === "copa") return { players: uniqueByUid([...youthPlayers, ...first]), youth };
  if (pool !== "plantilla" && players[pool]) return { players: players[pool], youth };
  return { players: first, youth };
}

export interface CupSwap {
  slotId: string;
  player: Player;
  /** Titular del mejor XI al que sustituye. */
  replaced: Player | null;
  /** Puntos que se pierden en el hueco. */
  cost: number;
}

export interface PoolLineup extends PoolPlayers {
  lineup: LineupResult | null;
  /** Segundo equipo: huecos sin nadie de su puesto y el titular que tendría que repetir. */
  gaps: { slotId: string; repeat: Player | null; text: string }[];
  /** Equipo de copa: juveniles en el XI y los que entran por el mínimo. */
  cup?: { min: number; count: number; swaps: CupSwap[]; cost: number };
}

/** XI de la plantilla elegida con sus fijados y las reglas de cada plantilla. */
export function lineupForPool(tactic: Tactic, players: Record<string, Player[]>, squads: Squad[]): PoolLineup {
  const pp = poolPlayers(tactic, players, squads);
  const pool = tactic.pool ?? "plantilla";
  const out: PoolLineup = { ...pp, lineup: null, gaps: [] };
  if (!pp.players.length) return out;
  const locks = tacticLocks(tactic);
  let lineup = buildLineup(tactic, pp.players, { exclude: pp.exclude, locks });

  if (pool === "segundo") {
    const first = buildLineup(tactic, players.plantilla ?? [], { locks: tacticLocks(tactic, "plantilla") });
    lineup.slots.forEach((s, i) => {
      const repeat = first.slots[i]?.starter?.player ?? null;
      if (!s.starter) out.gaps.push({ slotId: s.slot.id, repeat, text: repeat ? `Nadie más para el puesto: tendría que repetir ${repeat.name}.` : "Nadie para el puesto." });
      else if (s.starter.familiarity < 0.85) out.gaps.push({ slotId: s.slot.id, repeat, text: `Lo cubre ${s.starter.player.name} fuera de su puesto; el que lo domina es ${repeat?.name ?? "el titular"}.` });
    });
  }

  if (pool === "copa") {
    const min = tactic.cupYouthMin ?? DEFAULT_CUP_YOUTH;
    const isYouth = (p: Player | undefined) => !!p && pp.youth.has(p.uid);
    const inXi = new Set(lineup.slots.map((s) => s.starter?.player.uid).filter(Boolean) as string[]);
    let count = lineup.slots.filter((s) => isYouth(s.starter?.player)).length;
    const swaps: CupSwap[] = [];
    const taken = new Set<string>();
    while (count < min) {
      let best: CupSwap | null = null;
      for (const s of lineup.slots) {
        if (s.locked || taken.has(s.slot.id) || !s.starter || isYouth(s.starter.player)) continue;
        for (const p of pp.players) {
          if (!pp.youth.has(p.uid) || inXi.has(p.uid) || p.isGoalkeeper !== (s.slot.slot === "GK")) continue;
          const eff = scoreRole(p, s.role).score * familiarity(p, s.slot.slot);
          const cost = s.starter.effective - eff;
          if (!best || cost < best.cost) best = { slotId: s.slot.id, player: p, replaced: s.starter.player, cost };
        }
      }
      if (!best) break;
      swaps.push(best);
      taken.add(best.slotId);
      inXi.add(best.player.uid);
      count++;
    }
    if (swaps.length) {
      // Los juveniles que ya eran titulares se quedan donde estaban: así el nuevo XI no los desplaza
      const keep = Object.fromEntries(lineup.slots.filter((s) => isYouth(s.starter?.player)).map((s) => [s.slot.id, s.starter!.player.uid]));
      const before = lineup.average;
      lineup = buildLineup(tactic, pp.players, { locks: { ...locks, ...keep, ...Object.fromEntries(swaps.map((w) => [w.slotId, w.player.uid])) } });
      count = lineup.slots.filter((s) => isYouth(s.starter?.player)).length;
      out.cup = { min, count, swaps, cost: before - lineup.average };
    } else out.cup = { min, count, swaps, cost: 0 };
  }

  out.lineup = lineup;
  return out;
}

export type DepthTone = "good" | "ok" | "poor";

export interface DepthEntry {
  slot: SlotResult;
  /** Suplente real: quien juega ese hueco en el segundo XI (cada jugador cuenta una vez). */
  backup: SlotCandidate | null;
  /** Puntos del titular al suplente. */
  gap: number | null;
  tone: DepthTone;
}

/**
 * Mapa de profundidad del primer equipo: titular del primer XI y suplente real
 * del segundo XI en cada hueco. Verde a 8 puntos o menos, ámbar hasta 15, rojo
 * más lejos, sin suplente o con el suplente fuera de su puesto.
 */
export function depthMap(tactic: Tactic, firstTeam: Player[]): DepthEntry[] {
  const first = buildLineup(tactic, firstTeam, { locks: tacticLocks(tactic, "plantilla") });
  const exclude = new Set(first.slots.map((s) => s.starter?.player.uid).filter(Boolean) as string[]);
  const second = buildLineup(tactic, firstTeam, { exclude, locks: tacticLocks(tactic, "segundo") });
  return first.slots.map((s, i) => {
    const backup = second.slots[i]?.starter ?? null;
    const gap = s.starter && backup ? s.starter.effective - backup.effective : null;
    const tone: DepthTone = !backup || backup.familiarity < 0.85 || gap == null || gap > 15 ? "poor" : gap > 8 ? "ok" : "good";
    return { slot: s, backup, gap, tone };
  });
}

export function newTactic(formationId: string, name = "Nueva táctica"): Tactic {
  const f = FORMATION_BY_ID[formationId];
  return {
    id: `t-${Date.now().toString(36)}`,
    name,
    formationId,
    roles: Object.fromEntries(f.slots.map((s) => [s.id, s.defaultRole])),
    locks: {},
    styleId: null,
    mentality: "equilibrada",
    instructions: [],
  };
}

// ---------------------------------------------------------------------------
// Familiaridad posicional
// ---------------------------------------------------------------------------

/** Posiciones "vecinas": jugar ahí sin ser natural cuesta menos que en otras. */
const ADJACENT: Record<PositionSlot, PositionSlot[]> = {
  GK: [],
  DR: ["WBR", "DC"], DC: ["DR", "DL", "DM"], DL: ["WBL", "DC"],
  WBR: ["DR", "MR"], WBL: ["DL", "ML"],
  DM: ["MC", "DC"],
  MR: ["AMR", "WBR", "MC"], MC: ["DM", "AMC", "MR", "ML"], ML: ["AML", "WBL", "MC"],
  AMR: ["MR", "AMC", "ST"], AMC: ["MC", "AMR", "AML", "ST"], AML: ["ML", "AMC", "ST"],
  ST: ["AMC", "AMR", "AML"],
};

export function familiarity(player: Player, slot: PositionSlot): number {
  if (slot === "GK" || player.isGoalkeeper) return player.position.slots.includes(slot) ? 1 : 0;
  if (player.position.slots.includes(slot)) return 1;
  if (ADJACENT[slot].some((s) => player.position.slots.includes(s))) return 0.85;
  return 0.7;
}

// ---------------------------------------------------------------------------
// Asignación óptima (algoritmo húngaro, maximizando)
// ---------------------------------------------------------------------------

/**
 * Resuelve la asignación de `rows` filas a `cols` columnas maximizando
 * `score[r][c]`. Devuelve col asignada a cada fila (-1 si ninguna).
 * Implementación O(n²m) de Kuhn-Munkres para matrices rectangulares (rows ≤ cols).
 */
export function hungarianMax(score: number[][]): number[] {
  const n = score.length;
  if (n === 0) return [];
  const m = score[0].length;
  if (n > m) throw new Error("hungarianMax: más filas que columnas");
  const INF = Number.POSITIVE_INFINITY;
  // Convertimos a coste minimizable
  let max = -INF;
  for (const row of score) for (const v of row) if (v > max) max = v;
  const cost = score.map((row) => row.map((v) => max - v));

  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j] > 0) result[p[j] - 1] = j - 1;
  return result;
}

// ---------------------------------------------------------------------------
// Mejor XI
// ---------------------------------------------------------------------------

export interface SlotCandidate {
  player: Player;
  role: RoleScore;
  familiarity: number;
  /** Puntuación efectiva = rol × familiaridad. */
  effective: number;
}

export interface SlotResult {
  slot: FormationSlot;
  role: RoleDef;
  starter: SlotCandidate | null;
  /** Mejores alternativas ordenadas (excluye al titular). */
  depth: SlotCandidate[];
  locked: boolean;
}

export interface LineupResult {
  formation: Formation;
  slots: SlotResult[];
  /** Media de las puntuaciones efectivas del XI. */
  average: number;
  /** Jugadores no usados en el XI, con su mejor hueco de esta táctica. */
  bench: { player: Player; bestSlot: SlotResult | null; effective: number }[];
}

function candidatesFor(players: Player[], slot: FormationSlot, role: RoleDef, cfg: ScoringConfig): SlotCandidate[] {
  const isGk = slot.slot === "GK";
  return players
    .filter((p) => p.isGoalkeeper === isGk)
    .map((p) => {
      const rs = scoreRole(p, role, cfg);
      const fam = familiarity(p, slot.slot);
      return { player: p, role: rs, familiarity: fam, effective: rs.score * fam };
    })
    .sort((a, b) => b.effective - a.effective);
}

/**
 * Mejor XI. Sin `locks` usa los fijados del primer equipo: es lo que quieren
 * las pantallas que miran la plantilla (Entrenamiento, Ojeados, Radiografía…).
 */
export function buildLineup(
  tactic: Tactic,
  players: Player[],
  opts: { exclude?: Set<string>; cfg?: ScoringConfig; locks?: Record<string, string> } = {},
): LineupResult {
  const locks = opts.locks ?? tacticLocks(tactic, "plantilla");
  const cfg = opts.cfg ?? DEFAULT_SCORING;
  const formation = FORMATION_BY_ID[tactic.formationId];
  const pool = players.filter((p) => !opts.exclude?.has(p.uid));
  const roles = formation.slots.map((s) => ROLE_BY_ID[tactic.roles[s.id]] ?? ROLE_BY_ID[s.defaultRole]);
  const cands = formation.slots.map((s, i) => candidatesFor(pool, s, roles[i], cfg));

  // Fijados a mano
  const lockedUid = new Map<number, string>();
  formation.slots.forEach((s, i) => {
    const uid = locks[s.id];
    if (uid && pool.some((p) => p.uid === uid)) lockedUid.set(i, uid);
  });
  const lockedSet = new Set(lockedUid.values());

  // Húngaro sobre los huecos libres y los jugadores no fijados
  const freeSlots = formation.slots.map((_, i) => i).filter((i) => !lockedUid.has(i));
  const freePlayers = pool.filter((p) => !lockedSet.has(p.uid));
  const assignment = new Map<number, Player>();
  if (freeSlots.length > 0 && freePlayers.length >= freeSlots.length) {
    const matrix = freeSlots.map((si) => {
      const byUid = new Map(cands[si].map((c) => [c.player.uid, c.effective]));
      return freePlayers.map((p) => byUid.get(p.uid) ?? 0);
    });
    const res = hungarianMax(matrix);
    freeSlots.forEach((si, k) => { if (res[k] >= 0) assignment.set(si, freePlayers[res[k]]); });
  } else if (freeSlots.length > 0) {
    // Plantilla más corta que la alineación: codicioso
    const used = new Set<string>();
    for (const si of freeSlots) {
      const c = cands[si].find((x) => !used.has(x.player.uid));
      if (c) { assignment.set(si, c.player); used.add(c.player.uid); }
    }
  }
  for (const [si, uid] of lockedUid) assignment.set(si, pool.find((p) => p.uid === uid)!);

  const starters = new Set([...assignment.values()].map((p) => p.uid));
  const slots: SlotResult[] = formation.slots.map((s, i) => {
    const starterP = assignment.get(i);
    const starter = starterP ? cands[i].find((c) => c.player.uid === starterP.uid) ?? null : null;
    return {
      slot: s,
      role: roles[i],
      starter,
      depth: cands[i].filter((c) => !starters.has(c.player.uid)).slice(0, 4),
      locked: lockedUid.has(i),
    };
  });

  const eff = slots.map((s) => s.starter?.effective ?? 0);
  const average = eff.length ? eff.reduce((a, b) => a + b, 0) / eff.length : 0;

  const bench = pool
    .filter((p) => !starters.has(p.uid))
    .map((p) => {
      let best: SlotResult | null = null;
      let bestEff = -1;
      slots.forEach((s, i) => {
        const c = cands[i].find((x) => x.player.uid === p.uid);
        if (c && c.effective > bestEff) { bestEff = c.effective; best = s; }
      });
      return { player: p, bestSlot: best, effective: Math.max(bestEff, 0) };
    })
    .sort((a, b) => b.effective - a.effective);

  return { formation, slots, average, bench };
}

// ---------------------------------------------------------------------------
// Explorador de formaciones (idea del "tactic explorer" de FM24-Player-Analyzer)
// ---------------------------------------------------------------------------

export interface FormationFit {
  formation: Formation;
  /** Media del mejor XI con los roles por defecto de la formación. */
  average: number;
  /** Media del XI sin los tres mejores huecos: mide el fondo, no solo las estrellas. */
  floor: number;
}

/** Ordena todas las formaciones por cómo encaja la plantilla en ellas. */
export function rankFormations(players: Player[], exclude?: Set<string>): FormationFit[] {
  return FORMATIONS.map((f) => {
    const t = newTactic(f.id, f.name);
    const lineup = buildLineup(t, players, { exclude });
    const eff = lineup.slots.map((s) => s.starter?.effective ?? 0).sort((a, b) => a - b);
    const floorArr = eff.slice(0, Math.max(1, eff.length - 3));
    return { formation: f, average: lineup.average, floor: floorArr.reduce((a, b) => a + b, 0) / floorArr.length };
  }).sort((a, b) => b.average - a.average);
}
