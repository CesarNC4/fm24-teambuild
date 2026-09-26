/**
 * Entrenamiento: foco individual, semana de equipo calculada (estilo,
 * carencias y carga) y grupos de aprendizaje. Los datos del juego están en
 * trainingData.ts.
 */

import type { AttrKey } from "./attributes";
import { ATTR_BY_KEY } from "./attributes";
import type { RoleDef } from "./roles";
import type { Player, PositionSlot } from "./types";
import { personalityTierLevel } from "./personalities";
import { STYLE_BY_ID } from "./stylePresets";
import type { LineupResult, Tactic } from "./tactics";
import { FOCUS_AREAS, SESSION_BY_ID, UNTRAINABLE, sessionLoad, type FocusArea } from "./trainingData";

export { FOCUS_AREAS, SESSION_BY_ID, SESSIONS, SESSION_CAT_LABEL, GROUP_LABEL, FAMILIARITY_LABEL, EFFECT_LABEL, UNTRAINABLE, sessionLoad } from "./trainingData";
export type { FocusArea, Session, SessionCat, SessionPart, Effect } from "./trainingData";

// ===========================================================================
// Unidades (las tres del juego)
// ===========================================================================

export type Unit = "portero" | "defensa" | "ataque";
export const UNIT_LABEL: Record<Unit, string> = { portero: "Unidad de portero", defensa: "Unidad defensiva", ataque: "Unidad de ataque" };

/** Portero; defensiva hasta el MCD (centrales, laterales, carrileros y pivotes); de ataque desde el MC. */
export function unitOfSlot(s: PositionSlot): Unit {
  if (s === "GK") return "portero";
  if (s === "DC" || s === "DR" || s === "DL" || s === "WBR" || s === "WBL" || s === "DM") return "defensa";
  return "ataque";
}

export function unitOf(p: Player): Unit {
  if (p.isGoalkeeper) return "portero";
  const x = p.position.slots[0];
  return x ? unitOfSlot(x) : "ataque";
}

// ===========================================================================
// Foco individual (opcional)
// ===========================================================================

export interface FocusRecommendation {
  area: FocusArea;
  /** Suma ponderada del déficit respecto al objetivo del rol. */
  deficit: number;
  detail: { key: AttrKey; have: number | null; target: number }[];
  note: string | null;
}

function targetFor(role: RoleDef, key: AttrKey): { target: number; weight: number } | null {
  if (UNTRAINABLE.includes(key)) return null;
  if (role.key.includes(key)) return { target: 15, weight: 2 };
  if (role.pref.includes(key) || role.watch.includes(key)) return { target: 13, weight: 1 };
  return null;
}

/** Áreas ordenadas por déficit respecto al rol. Los porteros ven las suyas y las físicas. */
export function recommendFocus(player: Player, role: RoleDef): FocusRecommendation[] {
  const age = player.age ?? 25;
  const areas = FOCUS_AREAS.filter((a) => (player.isGoalkeeper ? a.group === "portero" || a.physical : a.group === "campo"));
  return areas
    .map((area) => {
      let deficit = 0;
      const detail: FocusRecommendation["detail"] = [];
      // Solo cuenta si al menos la mitad de sus atributos importan al rol.
      const relevant = area.attrs.filter((k) => targetFor(role, k)).length;
      if (relevant * 2 < area.attrs.length) return { area, deficit: 0, detail, note: null };
      for (const key of area.attrs) {
        const t = targetFor(role, key);
        if (!t) continue;
        const have = player.attrs[key]?.value ?? null;
        deficit += have == null ? 0 : Math.max(0, t.target - have) * t.weight;
        detail.push({ key, have, target: t.target });
      }
      let note: string | null = null;
      if (area.physical && age >= 30) { deficit *= 0.2; note = "físico a los 30+: solo para frenar el declive"; }
      else if (area.physical && age >= 27) { deficit *= 0.5; note = "físico a los 27+: mejora lenta"; }
      else if (area.physical && age <= 21) { deficit *= 1.3; note = "físico con ≤21 años: la mejor edad para desarrollarlo"; }
      else if (!area.physical && age >= 32) { deficit *= 0.7; note = "a los 32+ la mejora técnica/mental es lenta"; }
      return { area, deficit, detail, note };
    })
    .filter((r) => r.detail.length > 0 && r.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);
}

/**
 * Por defecto sin foco: los PDF coinciden en que diluye el entrenamiento del
 * rol. Solo se propone ante una carencia clara (un atributo clave 3 o más por
 * debajo del objetivo, o déficit total alto) y en jugadores que aún crecen.
 */
export function clearFocus(player: Player, role: RoleDef): FocusRecommendation | null {
  const best = recommendFocus(player, role)[0];
  if (!best) return null;
  const keyGap = best.detail.some((d) => d.have != null && role.key.includes(d.key) && d.target - d.have >= 3);
  if ((player.age ?? 25) >= 30) return null;
  return keyGap || best.deficit >= 8 ? best : null;
}

/** Extras simultáneos (foco adicional, rasgo, pierna mala) que aguanta sin que la carga individual pase de Media. */
export interface LoadRecommendation {
  extras: 0 | 1 | 2;
  why: string;
}

export function recommendLoad(player: Player): LoadRecommendation {
  const age = player.age ?? 25;
  const nat = player.attrs.Nat?.value ?? 12;
  if (age >= 33 || nat <= 7) return { extras: 0, why: `${age >= 33 ? "veterano" : "recuperación física muy baja"}: solo entrenamiento de rol, nada extra` };
  if (age >= 30 || nat <= 10) return { extras: 1, why: age >= 30 ? "30+: un solo extra (foco o rasgo), el resto es riesgo de lesión" : "recuperación física baja: un solo extra" };
  if (age <= 23 && nat >= 14) return { extras: 2, why: "joven y con buena recuperación física: foco + rasgo sin pasar de Media" };
  return { extras: 2, why: "carga normal: foco + rasgo, pero vigila que la carga total no marque Alta" };
}

/** Intensidad individual: automática (el juego aplica el descanso por el corazón) y doble para jóvenes sanos. */
export function recommendIntensity(player: Player): { level: "Doble" | "Automática"; why: string } {
  const age = player.age ?? 25;
  const nat = player.attrs.Nat?.value ?? 12;
  const injured = /les/i.test(player.info ?? "");
  if (age <= 21 && nat >= 12 && !injured) return { level: "Doble", why: "≤21 años y sano: más desarrollo; bájala si el corazón se pone amarillo" };
  return { level: "Automática", why: "el juego regula el descanso según la condición" };
}

// ===========================================================================
// Sesiones que pide la táctica (instrucciones reales, no solo el estilo)
// ===========================================================================

export interface SessionPick {
  id: string;
  why: string;
}

export interface TacticSessions {
  attack: SessionPick[];
  defend: SessionPick[];
  physical: SessionPick[];
}

function push(list: SessionPick[], id: string, why: string) {
  const prev = list.find((x) => x.id === id);
  if (prev) { if (!prev.why.includes(why)) prev.why += `; ${why}`; return; }
  list.push({ id, why });
}

/**
 * Matriz de los PDF: cada instrucción de la táctica pide una sesión concreta.
 * Si la táctica no tiene instrucciones propias se usan las de su estilo.
 */
export function tacticSessions(tactic: Tactic | null): TacticSessions {
  const out: TacticSessions = { attack: [], defend: [], physical: [] };
  const preset = tactic?.styleId ? STYLE_BY_ID[tactic.styleId] : null;
  const ins = new Set(tactic?.instructions?.length ? tactic.instructions : preset?.instructions ?? []);
  const has = (...ids: string[]) => ids.some((i) => ins.has(i));
  const roles = Object.values(tactic?.roles ?? {});

  // Defensa
  if (has("contrapresionar")) push(out.defend, "tec-trans-presionar", "Contrapresión (nunca Restringir)");
  if (has("linea-presion-alta", "presionar-mas", "presionar-mucho-mas")) push(out.defend, "def-arriba", "presión alta");
  if (has("linea-def-alta", "linea-def-mucho-mas-alta")) push(out.defend, "def-rasos", "línea alta: balones a la espalda");
  if (has("reagruparse") && !has("contrapresionar")) push(out.defend, "tec-trans-restringir", "Reagruparse");
  if (has("linea-presion-baja", "linea-def-baja", "linea-def-mucho-mas-baja")) push(out.defend, "def-esperando", "bloque bajo");
  if (has("evitar-centros")) push(out.defend, "def-bandas", "Evitar centros");
  if (has("permitir-centros")) push(out.defend, "def-aereos", "Permitir centros: defender el área");
  push(out.defend, "def-posesion", "base defensiva de cualquier estilo");
  push(out.defend, "tac-defender", "familiaridad táctica sin balón");

  // Ataque
  if (has("pases-cortos", "pases-mucho-mas-cortos", "ritmo-bajo", "ritmo-mucho-mas-bajo")) {
    push(out.attack, "tec-retencion", "posesión");
    push(out.attack, "att-paciente", "posesión");
  }
  const sk = roles.some((r) => r.startsWith("SK-"));
  if (has("salir-jugando", "gk-saque-corto", "gk-rodar", "gk-a-defensas") || sk) {
    push(out.attack, "tec-desde-atras", sk ? "portero cierre / salida en corto" : "salida en corto");
    push(out.attack, "gk-distribucion", sk ? "portero cierre" : "portero que sale jugando");
  }
  if (has("pases-directos", "pases-mucho-mas-directos", "pasar-espacio", "contraatacar")) push(out.attack, "att-directo", "juego directo / a la contra");
  const wide = has("amplitud-amplia", "amplitud-muy-amplia", "explotar-bandas", "explotar-izq", "explotar-der", "centros-tempranos", "centros-mixtos", "centros-rasos", "centros-rosca", "centros-colgados");
  const overlap = has("desmarque-fuera-izq", "desmarque-fuera-der", "desmarque-dentro-izq", "desmarque-dentro-der") || roles.some((r) => /^(FB|WB|CWB|WCB)-A$/.test(r));
  if (wide) push(out.attack, "att-bandas", "juego por bandas");
  if (overlap) push(out.attack, "att-doblando", "laterales o carrileros que doblan");
  if (has("trabajar-area", "mas-creatividad")) push(out.attack, "tec-creacion", "elaborar hasta el área");
  push(out.attack, "tec-convertir", "vale para cualquier estilo");
  push(out.attack, "tac-atacar", "familiaridad táctica con balón");

  // Físico
  if (has("presionar-mas", "presionar-mucho-mas", "contrapresionar", "ritmo-alto", "ritmo-mucho-mas-alto")) push(out.physical, "fis-aguante", "presión y ritmo alto piden resistencia");
  if (has("contraatacar", "pasar-espacio", "linea-def-alta", "linea-def-mucho-mas-alta")) push(out.physical, "fis-rapidez", "transiciones y línea alta piden velocidad");
  push(out.physical, "fis-resistencia", "fuerza");
  push(out.physical, "gen-fisico", "general");
  return out;
}

// ===========================================================================
// Sesiones por carencias del XI
// ===========================================================================

export interface NeedSession {
  id: string;
  score: number;
  /** Atributos flojos que cubre, con la media de la unidad. */
  weak: { key: AttrKey; mean: number }[];
  unit: Unit;
}

/**
 * Para cada unidad del XI, cuánto le falta en cada atributo respecto a lo que
 * piden los roles de sus jugadores (clave 15, preferible 13). Luego puntúa
 * las sesiones de desarrollo por los atributos flojos que trabaja su grupo
 * principal (el del 60 %).
 */
export function needSessions(lineup: LineupResult | null): NeedSession[] {
  if (!lineup) return [];
  const gaps: Record<Unit, Map<AttrKey, { gap: number; sum: number; n: number }>> = { portero: new Map(), defensa: new Map(), ataque: new Map() };
  for (const s of lineup.slots) {
    const p = s.starter?.player;
    if (!p) continue;
    const unit = unitOfSlot(s.slot.slot);
    for (const key of [...s.role.key, ...s.role.pref, ...s.role.watch]) {
      const t = targetFor(s.role, key);
      const v = p.attrs[key]?.value;
      if (!t || v == null) continue;
      const e = gaps[unit].get(key) ?? { gap: 0, sum: 0, n: 0 };
      e.gap += Math.max(0, t.target - v) * t.weight;
      e.sum += v;
      e.n++;
      gaps[unit].set(key, e);
    }
  }
  const candidates = ["att-directo", "att-bandas", "att-doblando", "att-paciente", "def-posesion", "def-esperando", "def-bandas", "def-rasos", "def-aereos", "def-arriba",
    "tec-convertir", "tec-creacion", "tec-distribucion", "tec-trans-presionar", "tec-trans-restringir", "tec-retencion", "tec-desde-atras", "tac-atacar", "tac-defender",
    "gk-paradas", "gk-blocaje", "gk-1v1", "gk-distribucion"];
  const out: NeedSession[] = [];
  for (const id of candidates) {
    const s = SESSION_BY_ID[id];
    const main = s.parts.reduce((a, b) => (b.pct > a.pct ? b : a));
    if (main.attrs === "roles") continue;
    const unit: Unit = main.group === "porteros" ? "portero" : main.group === "defensa" ? "defensa" : "ataque";
    const g = gaps[unit];
    const weak = main.attrs
      .map((key) => ({ key, e: g.get(key) }))
      .filter((x): x is { key: AttrKey; e: { gap: number; sum: number; n: number } } => !!x.e && x.e.gap / x.e.n >= 1.5)
      .map((x) => ({ key: x.key, mean: x.e.sum / x.e.n, gap: x.e.gap / x.e.n }));
    if (weak.length < 2 && !(unit === "portero" && weak.length)) continue;
    const score = weak.reduce((a, w) => a + w.gap, 0) / Math.sqrt(main.attrs.length);
    out.push({ id, score, weak: weak.sort((a, b) => a.mean - b.mean).map(({ key, mean }) => ({ key, mean })), unit });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function needText(n: NeedSession): string {
  return `${UNIT_LABEL[n.unit]} floja en ${n.weak.slice(0, 3).map((w) => `${ATTR_BY_KEY[w.key].es} ${w.mean.toFixed(1)}`).join(", ")}`;
}

// ===========================================================================
// Semana de equipo
// ===========================================================================

export const DAY_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type RivalLevel = "superior" | "igual" | "inferior";
export const RIVAL_LEVEL_LABEL: Record<RivalLevel, string> = { superior: "Rival superior", igual: "Rival parejo", inferior: "Rival inferior" };

export interface MatchInfo { home: boolean; rival: RivalLevel }

export type WeekGoal = "normal" | "cohesion" | "defensa" | "ataque";
export const WEEK_GOAL_LABEL: Record<WeekGoal, string> = {
  normal: "Normal (lo que pide la táctica)",
  cohesion: "Cohesión (fichajes nuevos / vestuario)",
  defensa: "Cerrar la portería",
  ataque: "Crear y marcar más",
};

/** Lo que se guarda en el store. */
export interface TrainingWeekSettings {
  matchDays: number[];
  preseason: boolean;
  goal?: string;
  weekIndex?: number;
  youthTheme?: string;
  /** Día → local/visitante y nivel del rival. */
  matchInfo?: Record<string, MatchInfo>;
  /** Partido el domingo de la semana anterior / el lunes de la siguiente. */
  prevSunday?: boolean;
  nextMonday?: boolean;
}

export interface DayPlan {
  day: number;
  isMatch: boolean;
  match?: MatchInfo;
  /** Hasta 3 sesiones (mañana, tarde, noche). "match" = partido; null = vacío. */
  sessions: (string | null)[];
  /** Carga física del día (suma de riesgo de lesión, fatiga y bajada de condición). */
  load: number;
}

export interface WeekPlan {
  days: DayPlan[];
  /** Por qué sale cada sesión que no es de rutina. */
  reasons: { id: string; why: string }[];
  warnings: string[];
}

export interface WeekOptions {
  matchDays: number[];
  matchInfo?: Record<string, MatchInfo>;
  prevSunday?: boolean;
  nextMonday?: boolean;
  preseason: boolean;
  goal?: WeekGoal;
  weekIndex?: number;
  tactic: TacticSessions;
  needs: NeedSession[];
}

const GOAL_OVERRIDE: Record<Exclude<WeekGoal, "normal">, { attack: string[]; defend: string[] }> = {
  cohesion: { attack: ["tac-atacar", "tec-retencion", "prep-practica"], defend: ["tac-defender", "def-posesion"] },
  defensa: { attack: ["tec-trans-restringir", "att-directo", "tec-convertir"], defend: ["def-esperando", "def-aereos", "def-bandas", "tac-defender"] },
  ataque: { attack: ["tec-creacion", "tec-convertir", "tac-atacar", "att-paciente"], defend: ["tec-trans-presionar", "def-arriba"] },
};

/**
 * Semana calculada. Reglas (PDF de entrenamiento y microciclo del manual):
 * - día después: Revisión de partido + Recuperación; víspera: Tácticas de
 *   partido + balón parado + Enfoque del partido (fuera: Viaje);
 * - dos días después del partido, el pico de carga (físico); dos días antes,
 *   Práctica de partido o Jugadores de campo;
 * - el resto de días, sesiones de la táctica y de carencias, alternando;
 * - rival superior: primero lo defensivo; inferior: primero lo ofensivo;
 * - dos partidos: sin físico; tres: solo recuperación, revisión, tácticas y
 *   balón parado.
 */
export function buildWeek(opts: WeekOptions): WeekPlan {
  const goal = opts.goal ?? "normal";
  const wk = opts.weekIndex ?? 0;
  const matchSet = new Set(opts.matchDays);
  // Fuera de la semana se asume el mismo calendario, salvo el domingo anterior y el lunes siguiente si los marcas.
  const prevSunday = opts.prevSunday ?? matchSet.has(6);
  const nextMonday = opts.nextMonday ?? matchSet.has(0);
  const isMatch = (d: number) =>
    d === -1 ? prevSunday : d === 7 ? nextMonday : d < -1 ? matchSet.has(d + 7) : d > 7 ? matchSet.has(d - 7) : matchSet.has(d);
  const info = (d: number): MatchInfo => opts.matchInfo?.[String(d)] ?? { home: true, rival: "igual" };
  const reasons = new Map<string, string>();
  const note = (id: string, why: string) => { if (!reasons.has(id)) reasons.set(id, why); };

  const attack = goal === "normal" ? opts.tactic.attack.map((x) => x.id) : GOAL_OVERRIDE[goal].attack;
  const defend = goal === "normal" ? opts.tactic.defend.map((x) => x.id) : GOAL_OVERRIDE[goal].defend;
  for (const x of [...opts.tactic.attack, ...opts.tactic.defend, ...opts.tactic.physical]) if (goal === "normal" || x.id.startsWith("fis-")) note(x.id, x.why);
  if (goal !== "normal") for (const id of [...GOAL_OVERRIDE[goal].attack, ...GOAL_OVERRIDE[goal].defend]) note(id, WEEK_GOAL_LABEL[goal]);
  const needs = opts.needs.filter((n) => !attack.includes(n.id) && !defend.includes(n.id)).slice(0, 4);
  for (const n of needs) note(n.id, needText(n));
  const physical = opts.tactic.physical.map((x) => x.id);

  // Rotación entre semanas: cada semana empieza en otro punto de las listas
  let ai = wk, di = wk, ni = wk, pi = wk;
  const pick = (arr: string[], i: number) => (arr.length ? arr[i % arr.length] : null);
  const nextAttack = () => pick(attack, ai++);
  const nextDefend = () => pick(defend, di++);
  const nextNeed = () => (needs.length ? needs[ni++ % needs.length].id : nextAttack());
  const nextPhysical = () => pick(physical, pi++);

  const since = (d: number) => { for (let k = 1; k <= 8; k++) if (isMatch(d - k)) return k; return 0; };
  const until = (d: number) => { for (let k = 1; k <= 8; k++) if (isMatch(d + k)) return { k, day: d + k }; return null; };
  const nMatches = opts.matchDays.length;

  const days: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ day: d, isMatch: matchSet.has(d), match: matchSet.has(d) ? info(d) : undefined, sessions: [null, null, null], load: 0 }));
  for (const day of days) {
    const d = day.day;
    if (day.isMatch) { day.sessions = ["match", null, null]; continue; }
    const after = isMatch(d - 1);
    const nxt = until(d);
    const before = nxt?.k === 1;
    const away = before && nxt.day <= 6 ? !info(nxt.day).home : false;
    const eve: (string | null)[] = away ? ["prep-tacticas", "prep-enfoque", "viaje"] : ["prep-tacticas", "bp-rutinas", "prep-enfoque"];

    if (opts.preseason && nMatches === 0) {
      // Primeras semanas de pretemporada: días duros de físico alternos con táctica y cohesión, domingo libre
      if (d === 6) { day.sessions = ["fis-descanso", null, null]; continue; }
      const phys = ["fis-aguante", "fis-resistencia", "fis-rapidez"];
      day.sessions = d % 2 === 0 ? [phys[(d / 2 + wk) % phys.length], "ext-cohesion", null] : ["gen-tactica", "tec-retencion", "fis-recuperacion"];
      note("ext-cohesion", "pretemporada: el grupo se conoce");
      continue;
    }
    if (after && before) { day.sessions = ["prep-revision", "fis-recuperacion", "prep-enfoque"]; continue; }
    if (after) { day.sessions = ["prep-revision", "fis-recuperacion", nMatches >= 2 ? "fis-descanso" : null]; continue; }
    if (before) { day.sessions = eve; continue; }
    if (nMatches >= 3) { day.sessions = ["fis-recuperacion", "bp-rutinas", "fis-descanso"]; continue; }
    if (nMatches === 0 && !prevSunday && !nextMonday) {
      // Parón: desarrollo puro, dos días de físico, domingo libre
      if (d === 6) { day.sessions = ["fis-descanso", null, null]; continue; }
      if (d === 0) { day.sessions = ["fis-recuperacion", nextNeed(), null]; continue; }
      day.sessions = d % 2 === 0 ? [nextAttack(), nextNeed(), d <= 3 ? nextPhysical() : null] : [nextDefend(), nextNeed(), null];
      continue;
    }
    const target = nxt && nxt.day <= 6 ? info(nxt.day) : null;
    const k = since(d);
    const u = nxt?.k ?? 9;
    const first = target?.rival === "superior" ? nextDefend : target?.rival === "inferior" ? nextAttack : (d % 2 === 0 ? nextAttack : nextDefend);
    const second = first === nextDefend ? nextAttack : nextDefend;
    if (nMatches >= 2) {
      // Entre dos partidos: una sesión de la táctica, balón parado y descanso
      day.sessions = [first(), "bp-rutinas", "fis-descanso"];
      continue;
    }
    if (k === 2 && u >= 3) {
      // Pico de carga
      day.sessions = [nextPhysical(), first(), nextNeed()];
      continue;
    }
    if (u === 2) {
      // Dos días antes: partido de práctica o jugadores de campo
      const team = wk % 2 === 0 ? "prep-practica" : "gen-campo";
      note(team, "dos días antes del partido: todo el equipo junto");
      day.sessions = [team, first(), null];
      continue;
    }
    day.sessions = [first(), second(), nextNeed()];
  }
  // Sin partido en toda la semana y sin pretemporada: un domingo de cohesión si hay fichajes
  if (goal === "cohesion") {
    const free = days.find((x) => !x.isMatch && x.sessions.includes(null) && !isMatch(x.day + 1));
    if (free) { free.sessions[free.sessions.indexOf(null)] = "ext-cohesion"; note("ext-cohesion", WEEK_GOAL_LABEL.cohesion); }
  }
  for (const day of days) day.load = day.sessions.reduce((a, s) => a + (s && s !== "match" ? sessionLoad(SESSION_BY_ID[s]) : 0), 0);
  return { days, reasons: [...reasons.entries()].map(([id, why]) => ({ id, why })), warnings: weekWarnings(days, opts) };
}

/** Avisos de carga y calendario sobre una semana (también sirve si la editas a mano en el juego). */
export function weekWarnings(days: DayPlan[], opts: Pick<WeekOptions, "matchDays" | "prevSunday" | "nextMonday">): string[] {
  const out: string[] = [];
  const ids = (d: DayPlan) => d.sessions.filter((s): s is string => !!s && s !== "match");
  // Día intenso: lleva alguna sesión pesada (Rapidez, Aguante, Práctica de partido, Físico, Total…).
  const intense = (d: DayPlan) => ids(d).some((x) => sessionLoad(SESSION_BY_ID[x]) >= 3);
  for (const d of days) {
    const s = ids(d);
    if (s.includes("fis-rapidez") && s.includes("prep-practica")) out.push(`${DAY_LABEL[d.day]}: Rapidez y Práctica de partido el mismo día (las dos con riesgo de lesión enorme).`);
    const nextIsMatch = d.day === 6 ? !!opts.nextMonday : days[d.day + 1]?.isMatch;
    if (nextIsMatch && s.some((x) => ["fis-aguante", "fis-rapidez", "fis-resistencia", "gen-fisico", "prep-practica"].includes(x))) out.push(`${DAY_LABEL[d.day]}: carga física la víspera del partido.`);
  }
  for (let i = 0; i + 2 < days.length; i++) if (intense(days[i]) && intense(days[i + 1]) && intense(days[i + 2])) { out.push(`Tres días intensos seguidos (${DAY_LABEL[i]}-${DAY_LABEL[i + 2]}).`); break; }
  for (let i = 0; i + 1 < days.length; i++) if (ids(days[i]).includes("fis-descanso") && ids(days[i + 1]).includes("fis-descanso")) out.push(`Dar descanso ${DAY_LABEL[i]} y ${DAY_LABEL[i + 1]}: dos días seguidos bajan mucho el ritmo competitivo.`);
  if (opts.matchDays.length >= 2 && !days.some((d) => ids(d).includes("fis-recuperacion"))) out.push("Semana de dos partidos sin Recuperación.");
  return out;
}

// ===========================================================================
// Semana de los filiales
// ===========================================================================

export type YouthTheme = "general" | "tecnica" | "inteligencia" | "velocidad" | "fisico" | "equipo";
export const YOUTH_THEME_LABEL: Record<YouthTheme, string> = {
  general: "General (3 meses al empezar)",
  tecnica: "Técnica (3 meses)",
  inteligencia: "Inteligencia / visión (3 meses)",
  velocidad: "Velocidad (solo semanas sin partido)",
  fisico: "Físico (fuerza y resistencia)",
  equipo: "Cohesión (canteranos nuevos)",
};

const YOUTH_SESSIONS: Record<YouthTheme, string[]> = {
  general: ["tec-retencion", "tac-atacar", "tac-defender", "fis-rapidez", "tec-distribucion", "fis-aguante", "tec-creacion", "def-posesion"],
  tecnica: ["tec-distribucion", "tec-retencion", "tec-creacion", "tec-convertir", "att-paciente", "att-bandas", "gen-porteros", "bp-rutinas"],
  inteligencia: ["gen-tactica", "tac-atacar", "tac-defender", "def-posesion", "att-paciente", "tec-trans-presionar", "def-arriba", "prep-practica"],
  velocidad: ["fis-rapidez", "tac-atacar", "tec-trans-presionar", "fis-rapidez", "def-posesion", "fis-aguante", "att-directo", "fis-rapidez"],
  fisico: ["fis-resistencia", "fis-aguante", "fis-rapidez", "gen-fisico", "fis-resistencia", "tac-defender", "fis-aguante", "tac-atacar"],
  equipo: ["ext-cohesion", "gen-tactica", "prep-practica", "tac-atacar", "tac-defender", "ext-cohesion", "tec-retencion", "gen-campo"],
};

export interface YouthWeekOptions {
  matchDays: number[];
  theme: YouthTheme;
  /** true = Sub-21/equipo B (prepara partidos); false = Sub-18 (solo desarrollo). */
  competitive: boolean;
}

export function buildYouthWeek(opts: YouthWeekOptions): DayPlan[] {
  const list = YOUTH_SESSIONS[opts.theme];
  const matchSet = new Set(opts.matchDays);
  const days: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ day: d, isMatch: matchSet.has(d), sessions: [null, null, null], load: 0 }));
  let i = 0;
  const next = () => list[i++ % list.length];
  for (const day of days) {
    if (day.isMatch) { day.sessions = ["match", null, null]; continue; }
    if (matchSet.has((day.day + 6) % 7)) { day.sessions = [opts.competitive ? "prep-revision" : next(), "fis-recuperacion", null]; continue; }
    if (day.day === 6) { day.sessions = ["fis-descanso", null, null]; continue; }
    if (matchSet.has((day.day + 1) % 7) && opts.competitive) { day.sessions = ["prep-tacticas", next(), "prep-enfoque"]; continue; }
    day.sessions = [next(), next(), day.day % 2 === 0 ? "fis-descanso" : opts.theme === "velocidad" || opts.theme === "fisico" ? "fis-recuperacion" : "gen-tactica"];
  }
  for (const day of days) day.load = day.sessions.reduce((a, s) => a + (s && s !== "match" ? sessionLoad(SESSION_BY_ID[s]) : 0), 0);
  return days;
}

export function youthWeekWarnings(opts: YouthWeekOptions): string[] {
  const out: string[] = [];
  if (opts.theme === "velocidad" && opts.matchDays.length > 0) out.push("La semana de velocidad va en semanas sin partido: Rapidez tiene riesgo de lesión enorme.");
  if (opts.matchDays.length >= 2) out.push("Dos partidos: quita la tercera sesión de los días temáticos si aparecen fatigados.");
  if (!opts.competitive) out.push("Sub-18: sin revisión ni tácticas de partido; con 15 minutos ya reciben nota, así que rota a todos.");
  return out;
}

// ===========================================================================
// Grupos de aprendizaje
// ===========================================================================

export type PersonalityTier = "buena" | "neutra" | "mala";

export function personalityTier(p: string | null): PersonalityTier {
  const t = personalityTierLevel(p);
  if (t >= 5) return "buena";
  if (t <= 2) return "mala";
  return "neutra";
}

/** «Líder del equipo» o «Jugador muy influyente» en la columna Estructura. */
export function isLeader(p: Player): boolean {
  return /l[ií]der|muy influyente|team leader|highly influential/i.test(p.hierarchy ?? "");
}

export interface MentoringGroup {
  unit: Unit;
  mentor: Player;
  mentees: Player[];
  notes: string[];
}

export interface MentoringResult {
  groups: MentoringGroup[];
  /** Jóvenes que necesitan grupo y no caben (faltan líderes en su línea). */
  waiting: Player[];
  /** true si se usó la columna Estructura de la exportación. */
  usedHierarchy: boolean;
}

/**
 * Un líder (Líder del equipo o Muy influyente si la exportación trae
 * Estructura; si no, veterano con buena personalidad y Determinación o
 * Liderazgo altos) y 2-3 jóvenes como máximo de la misma unidad.
 */
export function suggestMentoring(players: Player[], opts: { youth?: boolean; maxMentees?: number } = {}): MentoringResult {
  const max = opts.maxMentees ?? 3;
  const usedHierarchy = players.some((p) => p.hierarchy);
  const minAge = opts.youth ? 19 : 24;
  const good = (p: Player) => personalityTierLevel(p.personality) >= 5;
  const strong = (p: Player) => (p.attrs.Det?.value ?? 0) >= (opts.youth ? 13 : 14) || (p.attrs.Ldr?.value ?? 0) >= (opts.youth ? 10 : 14);
  const isMentor = (p: Player) => (p.age ?? 0) >= minAge && good(p) && (usedHierarchy && !opts.youth ? isLeader(p) || strong(p) : strong(p)) && !/ambicios|ambitious/i.test(p.personality ?? "");
  const groups: MentoringGroup[] = [];
  const waiting: Player[] = [];
  for (const unit of ["portero", "defensa", "ataque"] as Unit[]) {
    const pool = players.filter((p) => unitOf(p) === unit);
    const mentors = pool.filter(isMentor).sort((a, b) =>
      Number(isLeader(b)) - Number(isLeader(a)) || personalityTierLevel(b.personality) - personalityTierLevel(a.personality) ||
      (b.attrs.Ldr?.value ?? 0) + (b.attrs.Det?.value ?? 0) - (a.attrs.Ldr?.value ?? 0) - (a.attrs.Det?.value ?? 0));
    const mentees = pool
      .filter((p) => (p.age ?? 99) <= 23 && !mentors.includes(p) && (personalityTierLevel(p.personality) < 5 || (p.attrs.Det?.value ?? 0) < 12))
      .sort((a, b) => personalityTierLevel(a.personality) - personalityTierLevel(b.personality) || (a.attrs.Det?.value ?? 0) - (b.attrs.Det?.value ?? 0));
    let i = 0;
    for (const m of mentors) {
      if (i >= mentees.length) break;
      const take = mentees.slice(i, i + max);
      i += take.length;
      const notes: string[] = [];
      if (/perfeccionista|perfectionist/i.test(m.personality ?? "")) notes.push(`${m.name} es perfeccionista: buen tutor, pero puede pasar temperamento bajo.`);
      if (usedHierarchy && !isLeader(m)) notes.push(`${m.name} no es líder ni muy influyente: su influencia en el grupo será ligera.`);
      groups.push({ unit, mentor: m, mentees: take, notes });
    }
    waiting.push(...mentees.slice(i));
  }
  return { groups, waiting, usedHierarchy };
}
