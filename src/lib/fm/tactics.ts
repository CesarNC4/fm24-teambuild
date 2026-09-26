/**
 * Motor táctico: asignación óptima de jugadores a los huecos de una formación,
 * profundidad por hueco y avisos de equilibrio entre roles.
 */

import { FORMATIONS, FORMATION_BY_ID, type Formation, type FormationSlot } from "./formations";
import { ROLE_BY_ID, type RoleDef } from "./roles";
import { DEFAULT_SCORING, scoreRole, type RoleScore, type ScoringConfig } from "./scoring";
import type { Player, PositionSlot } from "./types";
import { styleTraits } from "./instructions";

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
  /** Mentalidad del equipo (id de MENTALITIES). Ausente en tácticas antiguas = equilibrada. */
  mentality?: string;
  /** Instrucciones activadas por el usuario (ids). */
  instructions: string[];
  /**
   * Jugadores con los que se arma el XI: "plantilla" (primer equipo, por
   * defecto), "segundo" (primer equipo sin el XI titular), "todos" (primer
   * equipo + filiales) o el id de un filial.
   */
  pool?: string;
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

/** Jugadores disponibles para una táctica según su `pool`. */
export function poolPlayers(tactic: Tactic, players: Record<string, Player[]>, filialIds: string[]): { players: Player[]; exclude?: Set<string> } {
  const first = players.plantilla ?? [];
  const pool = tactic.pool ?? "plantilla";
  if (pool === "segundo") {
    const xi = buildLineup({ ...tactic, pool: "plantilla", locks: {} }, first);
    return { players: first, exclude: new Set(xi.slots.filter((s) => s.starter).map((s) => s.starter!.player.uid)) };
  }
  if (pool === "todos") return { players: [...first, ...filialIds.flatMap((id) => players[id] ?? [])] };
  if (pool !== "plantilla" && players[pool]) return { players: players[pool] };
  return { players: first };
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
  const raw = tacticWarningsRaw(tactic);
  const seen = new Set<string>();
  return raw.filter((w) => (seen.has(w.text) ? false : (seen.add(w.text), true)));
}

function tacticWarningsRaw(tactic: Tactic): TacticWarning[] {
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
    out.push({ level: "warn", text: "Ningún mediocentro con deber de contención (Mediocentro-De, Pivote defensivo, Medio cierre, Centrocampista recuperador-De…). La defensa quedará expuesta." });
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
    out.push({ level: "info", text: "Portero cierre en ataque: conviene un central en Cubrir o mucha velocidad en la zaga." });
  }
  const strikers = entries.filter((e) => e.slot.slot === "ST");
  if (strikers.length === 1 && strikers[0].role.duty === "S" && !entries.some((e) => e.slot.slot === "AMC" && e.role.duty === "A")) {
    out.push({ level: "info", text: "Delantero único en apoyo sin mediapunta en ataque: falta alguien que ataque el área." });
  }

  // ---- Parejas (guía de combinaciones de Passion4FM)
  const cbs = entries.filter((e) => e.slot.slot === "DC");
  if (cbs.length === 2) {
    const d = cbs.map((e) => e.role.duty);
    if (d.every((x) => x === "St")) out.push({ level: "warn", text: "Dos centrales en Tapón: ambos saltan y dejan espacio a la espalda. Combina Tapón + Cubrir, o los dos en defender." });
    if (d.every((x) => x === "Co")) out.push({ level: "warn", text: "Dos centrales en Cubrir: regalan espacio por delante y no disputan. Combina Cubrir + Tapón, o los dos en defender." });
    if (cbs.every((e) => e.role.code === "BPD")) out.push({ level: "info", text: "Dos Defensas con toque: mucho riesgo de pase desde atrás; suele bastar con uno." });
  }
  const libero = entries.find((e) => e.role.code === "L");
  if (libero) {
    if (cbs.length < 3) out.push({ level: "warn", text: "Líbero en defensa de cuatro: necesita dos centrales en defender a los lados o un pivote que cubra cuando sube." });
    else if (cbs.filter((e) => e.role.code !== "L").some((e) => e.role.duty !== "D")) out.push({ level: "info", text: "Líbero: los otros dos centrales deberían ir en defender para cubrirle." });
  }
  if (entries.some((e) => e.role.code === "HB") && cbs.length !== 2) {
    out.push({ level: "warn", text: "Medio cierre solo tiene sentido delante de una pareja de centrales (baja entre ellos al defender)." });
  }
  const pivots = entries.filter((e) => e.slot.slot === "DM" || e.slot.slot === "MC");
  if (pivots.length === 2 && pivots.every((e) => e.role.duty === "D")) {
    out.push({ level: "info", text: "Doble pivote con los dos en defender: seguro pero sin progresión; uno en apoyo suele bastar para sacar el balón." });
  }

  // Lateral + extremo en la misma banda: uno ataca, el otro apoya
  for (const side of ["L", "R"] as const) {
    const back = entries.find((e) => e.slot.slot === (`D${side}` as PositionSlot) || e.slot.slot === (`WB${side}` as PositionSlot));
    const wide = entries.find((e) => e.slot.slot === (`M${side}` as PositionSlot) || e.slot.slot === (`AM${side}` as PositionSlot));
    const name = side === "L" ? "izquierda" : "derecha";
    if (back && wide) {
      if (back.role.duty === "A" && wide.role.duty === "A") out.push({ level: "warn", text: `Banda ${name}: lateral y extremo ambos en ataque; se pisan y dejan la banda vacía al perder el balón. Alterna ataque + apoyo.` });
      if (back.role.duty === "D" && wide.role.duty !== "A" && !["W", "WM", "DW", "WTF"].includes(wide.role.code) && !["CWB", "WB"].includes(back.role.code)) {
        out.push({ level: "info", text: `Banda ${name}: nadie da amplitud (lateral en defender y extremo que entra por dentro). Un lateral en apoyo o un extremo puro lo arregla.` });
      }
    } else if (wide && !back) {
      // Extremo único en su banda (sin lateral en la formación, p.ej. 3-4-3 con carrileros contados como back)
      if (wide.role.duty !== "S") out.push({ level: "info", text: `Banda ${name}: jugador de banda único; el deber de apoyo es el que mejor combina amplitud y repliegue.` });
    }
  }
  const leftAtt = entries.filter((e) => e.slot.slot.endsWith("L") && e.role.duty === "A").length;
  const rightAtt = entries.filter((e) => e.slot.slot.endsWith("R") && e.role.duty === "A").length;
  if ((leftAtt >= 2 && rightAtt === 0) || (rightAtt >= 2 && leftAtt === 0)) {
    out.push({ level: "warn", text: "Todos los deberes de ataque de banda en el mismo lado: el ataque es previsible y la otra banda no penetra." });
  }

  // Delanteros
  if (strikers.length === 2) {
    const d = strikers.map((e) => e.role.duty);
    if (d.every((x) => x === "A")) out.push({ level: "warn", text: "Dos delanteros en ataque: nadie enlaza con el medio campo. Pareja clásica: uno crea (segundo delantero/objetivo/completo en apoyo) y otro remata." });
    if (d.every((x) => x === "S")) out.push({ level: "info", text: "Dos delanteros en apoyo: poca amenaza a la espalda de la defensa." });
    if (strikers.some((e) => e.role.code === "TQ") && !strikers.some((e) => e.role.duty === "A" && e.role.code !== "TQ")) {
      out.push({ level: "info", text: "Trequartista sin rematador por delante: crea pero nadie remata." });
    }
  }
  const amc = entries.filter((e) => e.slot.slot === "AMC");
  if (strikers.length === 1 && amc.length === 1) {
    if (strikers[0].role.duty === "A" && amc[0].role.duty === "A") out.push({ level: "info", text: "Delantero y mediapunta ambos en ataque: sin enlace entre medio y ataque. Uno de los dos en apoyo reparte el trabajo." });
    if (strikers[0].role.code === "F9" && amc[0].role.code !== "SS") out.push({ level: "info", text: "Falso nueve: funciona mejor con un delantero sorpresa (SS) que ataque el espacio que deja." });
  }

  // Reparto vertical de deberes
  const attackTop = entries.filter((e) => e.role.duty === "A" && (e.slot.slot === "ST" || e.slot.slot.startsWith("AM"))).length;
  if (attack >= 3 && attackTop === attack) {
    out.push({ level: "info", text: "Todos los deberes de ataque están arriba: el equipo se parte en dos. Un lateral, carrilero o interior en ataque conecta las líneas." });
  }
  const supports = entries.filter((e) => e.role.duty === "S").length;
  if (supports <= 2) out.push({ level: "info", text: "Muy pocos deberes de apoyo: el equipo se estira. El apoyo es el pegamento entre líneas, sobre todo en posesión y presión." });

  // Sistemas estrechos sin amplitud natural
  const wideCount = entries.filter((e) => ["ML", "MR", "AML", "AMR", "WBL", "WBR"].includes(e.slot.slot)).length;
  if (wideCount === 0 && !entries.some((e) => ["MEZ", "CAR", "TQ", "CWB", "WB"].includes(e.role.code) || (["DL", "DR"].includes(e.slot.slot) && e.role.duty !== "D"))) {
    out.push({ level: "warn", text: "Sistema estrecho sin nadie que dé amplitud: usa mezzala/interior mixto en el medio o laterales en apoyo/ataque." });
  }

  // ---- Rol × estilo (guía de Magicomonta) y banda con uno o dos jugadores
  const style = tactic.styleId ?? "";
  const tr = styleTraits(style);
  const possession = tr.possession;
  const pressing = tr.pressing;
  const waiting = tr.deep;
  const transition = tr.counter && !tr.possession;
  if (style) {
    if (possession && codes.includes("NCB")) out.push({ level: "info", text: "Central práctico en un estilo de posesión: despeja en vez de jugar; mejor Defensa central o Defensa con toque." });
    if (transition && codes.includes("L")) out.push({ level: "info", text: "Líbero en un estilo de transiciones: sube y deja la defensa corta justo cuando más se contraataca. Es un rol de posesión." });
    if (possession && cbs.filter((e) => e.role.code === "BPD").length === 2) out.push({ level: "info", text: "Dos Defensas con toque en posesión: buscan el pase arriesgado; en posesión suele bastar uno junto a un Defensa central." });
    if (pressing && codes.includes("A")) out.push({ level: "warn", text: "Pivote defensivo en un estilo de presión: se queda protegiendo la zona y deja huecos en la presión. Mejor Mediocentro o Centrocampista recuperador." });
    if (waiting && (codes.includes("B2B") || codes.includes("BWM"))) out.push({ level: "info", text: "Todoterreno / Centrocampista recuperador en un estilo de espera: persiguen al rival y rompen el bloque. Mediocentro, Pivote defensivo o Segundo volante encajan mejor." });
    const gk = entries.find((e) => e.slot.slot === "GK");
    if (gk?.role.code === "SK" && ((tactic.instructions.includes("linea-def-baja") || tactic.instructions.includes("linea-def-mucho-mas-baja")) || cbs.some((e) => e.role.duty === "Co"))) {
      out.push({ level: "info", text: "Portero cierre con línea baja o un central en Cubrir: no tiene espacio que cubrir. Con esa defensa rinde más el Portero clásico." });
    }
  }
  // Banda con un solo jugador (sin nadie por delante ni por detrás en esa banda)
  const SINGLE_BAD = new Set(["NFB", "IWB", "IW", "IF", "RMD", "WP", "AP", "WTF", "IFB"]);
  const SINGLE_GOOD = new Set(["WB", "CWB", "DW", "WM", "W"]);
  for (const side of ["L", "R"] as const) {
    const flank = entries.filter((e) => e.slot.slot.endsWith(side));
    if (flank.length !== 1) continue;
    const e = flank[0];
    const name = side === "L" ? "izquierda" : "derecha";
    if (SINGLE_BAD.has(e.role.code)) {
      out.push({ level: "warn", text: `Banda ${name}: ${e.role.es} como único jugador de banda no cubre las dos fases (o se mete por dentro y deja la banda vacía). Carrilero, Carrilero completo, Centrocampista de banda o Extremo en apoyo.` });
    } else if (SINGLE_GOOD.has(e.role.code) && e.role.code !== "W" && e.role.duty === "A" && e.role.code !== "CWB") {
      out.push({ level: "info", text: `Banda ${name}: jugador único en ataque; le costará replegar. El apoyo equilibra las dos fases.` });
    } else if (e.role.code === "FB" && e.role.duty === "D") {
      out.push({ level: "info", text: `Banda ${name}: lateral en defender como único jugador de banda: nadie da amplitud por ese lado.` });
    }
  }
  // Rombo (sin bandas, con MCD y mediapunta)
  const isDiamond = wideCount === 0 && entries.some((e) => e.slot.slot === "DM") && entries.some((e) => e.slot.slot === "AMC");
  if (isDiamond) {
    for (const e of entries.filter((x) => x.slot.slot === "DL" || x.slot.slot === "DR")) {
      if (e.role.code === "FB") out.push({ level: "info", text: `Rombo: el Lateral clásico no llega a las dos fases; en posesión usa Carrilero y en transiciones Carrilero completo.` });
      if (e.role.code === "IWB" || e.role.code === "IFB") out.push({ level: "warn", text: `Rombo: el lateral invertido se mete en un centro ya lleno de jugadores. Carrilero o Carrilero completo.` });
    }
    const am = entries.find((e) => e.slot.slot === "AMC");
    if (am && (am.role.code === "TQ" || am.role.code === "EG")) out.push({ level: "info", text: "Rombo: el Trequartista/Enganche se desconecta del juego con cuatro en el centro; mejor Mediapunta u Organizador adelantado." });
    if (!entries.some((e) => e.role.code === "MEZ" || e.role.code === "CAR")) out.push({ level: "info", text: "Rombo: sin Mezzala ni Interior mixto nadie ocupa los pasillos exteriores del medio campo." });
  }
  // Delanteros por estilo
  if (style && strikers.length === 2) {
    const sc = strikers.map((e) => e.role.code);
    if (transition && !sc.includes("TF") && !sc.includes("CF")) out.push({ level: "info", text: "Estilo directo/transiciones con dos puntas: combina uno alto y fuerte (Objetivo o Completo) con uno rápido (Ariete/Avanzado)." });
    if (possession && !sc.some((c) => ["SS", "DLF", "F9", "TQ", "CF"].includes(c))) out.push({ level: "info", text: "Posesión con dos puntas: un creador (Segundo delantero, Falso nueve, Trequartista) y un rematador; el juego se apoya en paredes y desmarques al espacio." });
  }
  return out;
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
