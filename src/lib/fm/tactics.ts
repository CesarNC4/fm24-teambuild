/**
 * Motor táctico: asignación óptima de jugadores a los huecos de una formación,
 * profundidad por hueco y avisos de equilibrio entre roles.
 */

import { FORMATION_BY_ID, type Formation, type FormationSlot } from "./formations";
import { ROLE_BY_ID, type RoleDef } from "./roles";
import { DEFAULT_SCORING, scoreRole, type RoleScore, type ScoringConfig } from "./scoring";
import type { Player, PositionSlot } from "./types";

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

export interface Tactic {
  id: string;
  name: string;
  formationId: string;
  /** slotId → roleId */
  roles: Record<string, string>;
  /** slotId → uid del jugador fijado a mano (opcional). */
  locks: Record<string, string>;
  /** Estilo de juego elegido (id de STYLE_PRESETS) o null. */
  styleId: string | null;
  /** Instrucciones activadas por el usuario (ids). */
  instructions: string[];
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

export function buildLineup(
  tactic: Tactic,
  players: Player[],
  opts: { exclude?: Set<string>; cfg?: ScoringConfig } = {},
): LineupResult {
  const cfg = opts.cfg ?? DEFAULT_SCORING;
  const formation = FORMATION_BY_ID[tactic.formationId];
  const pool = players.filter((p) => !opts.exclude?.has(p.uid));
  const roles = formation.slots.map((s) => ROLE_BY_ID[tactic.roles[s.id]] ?? ROLE_BY_ID[s.defaultRole]);
  const cands = formation.slots.map((s, i) => candidatesFor(pool, s, roles[i], cfg));

  // Fijados a mano
  const lockedUid = new Map<number, string>();
  formation.slots.forEach((s, i) => {
    const uid = tactic.locks[s.id];
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
// Avisos de equilibrio
// ---------------------------------------------------------------------------

export interface TacticWarning {
  level: "warn" | "info";
  text: string;
}

const PLAYMAKERS = new Set(["DLP", "AP", "RPM", "REG", "WP", "EG", "TQ"]);
const HOLDERS = new Set(["DM-D", "A-D", "HB-D", "BWM-D", "DLP-D", "CM-D", "DM-S"]);
const WIDE_INSIDE = new Set(["IF", "IW", "RMD", "AP", "WP", "TQ"]);
const WIDE_WIDTH = new Set(["W", "WM", "DW", "WTF"]);

export function tacticWarnings(tactic: Tactic): TacticWarning[] {
  const f = FORMATION_BY_ID[tactic.formationId];
  const out: TacticWarning[] = [];
  const entries = f.slots.map((s) => ({ slot: s, role: ROLE_BY_ID[tactic.roles[s.id]] ?? ROLE_BY_ID[s.defaultRole] }));
  const codes = entries.map((e) => e.role.code);
  const ids = entries.map((e) => e.role.id);

  const playmakers = codes.filter((c) => PLAYMAKERS.has(c)).length;
  if (playmakers === 0) out.push({ level: "info", text: "No hay ningún organizador: el balón se repartirá sin un foco creativo claro. Válido en estilos directos." });
  if (playmakers > 2) out.push({ level: "warn", text: `${playmakers} organizadores: compiten por el balón y ralentizan el juego. Deja uno o dos.` });

  const attack = entries.filter((e) => e.role.duty === "A").length;
  const defend = entries.filter((e) => e.role.duty === "D" || e.role.duty === "St" || e.role.duty === "Co").length;
  if (attack > 5) out.push({ level: "warn", text: `${attack} deberes de ataque: mucho riesgo en las transiciones defensivas.` });
  if (attack < 2) out.push({ level: "info", text: "Menos de dos deberes de ataque: poca amenaza en carrera." });
  void defend;

  const midfield = entries.filter((e) => e.slot.slot === "DM" || e.slot.slot === "MC");
  if (midfield.length > 0 && !midfield.some((e) => HOLDERS.has(e.role.id))) {
    out.push({ level: "warn", text: "Ningún mediocentro con deber de contención (MCD-De, Ancla, Medio escoba, Recuperador-De…). La defensa quedará expuesta." });
  }

  const fullbacks = entries.filter((e) => ["DL", "DR", "WBL", "WBR"].includes(e.slot.slot));
  if (fullbacks.length >= 2 && fullbacks.every((e) => e.role.duty === "A") && !midfield.some((e) => HOLDERS.has(e.role.id))) {
    out.push({ level: "warn", text: "Ambos laterales en ataque sin un pivote de contención: contragolpes por las bandas." });
  }

  const wide = entries.filter((e) => ["AML", "AMR", "ML", "MR"].includes(e.slot.slot));
  const insideCount = wide.filter((e) => WIDE_INSIDE.has(e.role.code)).length;
  const widthFromWide = wide.some((e) => WIDE_WIDTH.has(e.role.code));
  const widthFromBacks = fullbacks.some((e) => e.role.duty === "A" || e.role.code === "CWB" || e.role.code === "WB");
  if (wide.length > 0 && insideCount === wide.length && !widthFromWide && !widthFromBacks) {
    out.push({ level: "warn", text: "Todos los extremos entran por dentro y nadie da amplitud: pon un lateral/carrilero en apoyo o ataque." });
  }

  if (ids.includes("SK-A") && !ids.some((i) => i.startsWith("CD-Co") || i.startsWith("BPD-Co"))) {
    out.push({ level: "info", text: "Portero líbero en ataque: conviene un central con cobertura o mucha velocidad en la zaga." });
  }
  const strikers = entries.filter((e) => e.slot.slot === "ST");
  if (strikers.length === 1 && strikers[0].role.duty === "S" && !entries.some((e) => e.slot.slot === "AMC" && e.role.duty === "A")) {
    out.push({ level: "info", text: "Delantero único en apoyo sin mediapunta en ataque: falta alguien que ataque el área." });
  }
  return out;
}
