/**
 * Entrenamiento: foco individual, calendario semanal de equipo y tutorías.
 */

import type { AttrKey } from "./attributes";
import type { RoleDef } from "./roles";
import type { Player } from "./types";

// ===========================================================================
// Foco individual
// ===========================================================================

/** Áreas de "foco adicional" del entrenamiento individual de FM24. */
export interface FocusArea {
  id: string;
  es: string;
  en: string;
  attrs: AttrKey[];
  gk?: boolean;
  /** Físico: rinde poco a partir de cierta edad. */
  physical?: boolean;
}

export const FOCUS_AREAS: FocusArea[] = [
  { id: "quickness", es: "Rapidez", en: "Quickness", attrs: ["Acc", "Pac"], physical: true, gk: true },
  { id: "agility-balance", es: "Agilidad y equilibrio", en: "Agility & Balance", attrs: ["Agi", "Bal"], physical: true, gk: true },
  { id: "strength", es: "Fuerza", en: "Strength", attrs: ["Str"], physical: true, gk: true },
  { id: "endurance", es: "Resistencia", en: "Endurance", attrs: ["Sta", "Nat"], physical: true, gk: true },
  { id: "aerial", es: "Juego aéreo", en: "Aerial", attrs: ["Hea", "Jum"], physical: true },
  { id: "defending", es: "Defensa", en: "Defending", attrs: ["Mar", "Tck", "Pos"] },
  { id: "passing", es: "Pase", en: "Passing", attrs: ["Pas", "Vis", "Tec"] },
  { id: "dribbling", es: "Regate", en: "Dribbling", attrs: ["Dri", "Fla", "Tec"] },
  { id: "crossing", es: "Centros", en: "Crossing", attrs: ["Cro", "Tec"] },
  { id: "shooting", es: "Tiro", en: "Shooting", attrs: ["Fin", "Lon", "Cmp"] },
  { id: "final-third", es: "Último tercio", en: "Final Third", attrs: ["Ant", "Dec", "OtB", "Cmp"] },
  { id: "ball-control", es: "Control del balón", en: "Ball Control", attrs: ["Fir", "Tec"] },
  { id: "set-pieces", es: "Balón parado", en: "Set Pieces", attrs: ["Cor", "Fre", "Pen", "L Th"] },
  // Portero
  { id: "gk-shot-stopping", es: "Paradas", en: "Shot Stopping", attrs: ["Ref", "1v1", "Agi"], gk: true },
  { id: "gk-handling", es: "Blocaje", en: "Handling", attrs: ["Han", "Aer", "Cmd"], gk: true },
  { id: "gk-distribution", es: "Distribución", en: "Distribution", attrs: ["Kic", "Thr", "Pas", "Fir"], gk: true },
];

export interface FocusRecommendation {
  area: FocusArea;
  /** Suma ponderada del déficit respecto al objetivo del rol. */
  deficit: number;
  /** Atributos del área con su valor y objetivo. */
  detail: { key: AttrKey; have: number | null; target: number }[];
  note: string | null;
}

/**
 * Atributos "absolutos": apenas cambian con entrenamiento (solo con la edad o
 * por tutoría), así que no tiene sentido enfocarlos.
 */
export const UNTRAINABLE: AttrKey[] = ["Det", "Wor", "Nat", "Ldr"];

/** Objetivo por atributo según importancia para el rol. */
function targetFor(role: RoleDef, key: AttrKey): { target: number; weight: number } | null {
  if (UNTRAINABLE.includes(key)) return null;
  if (role.key.includes(key)) return { target: 15, weight: 2 };
  if (role.pref.includes(key)) return { target: 13, weight: 1 };
  return null;
}

export function recommendFocus(player: Player, role: RoleDef): FocusRecommendation[] {
  const age = player.age ?? 25;
  const areas = FOCUS_AREAS.filter((a) => (player.isGoalkeeper ? !!a.gk : !a.id.startsWith("gk-")));
  return areas
    .map((area) => {
      let deficit = 0;
      const detail: FocusRecommendation["detail"] = [];
      // El área solo cuenta si al menos la mitad de sus atributos importan al rol
      // (evita sugerir "Tiro" a un central porque Serenidad esté en el área).
      const relevant = area.attrs.filter((k) => targetFor(role, k)).length;
      if (relevant * 2 < area.attrs.length) return { area, deficit: 0, detail, note: null };
      for (const key of area.attrs) {
        const t = targetFor(role, key);
        if (!t) continue;
        const have = player.attrs[key]?.value ?? null;
        const gap = have == null ? 0 : Math.max(0, t.target - have);
        deficit += gap * t.weight;
        detail.push({ key, have, target: t.target });
      }
      // Los físicos apenas mejoran a partir de los 27-28 y decaen desde ~30.
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

/** Intensidad recomendada de entrenamiento individual. */
export function recommendIntensity(player: Player): { level: "doble" | "normal" | "media"; why: string } {
  const age = player.age ?? 25;
  const nat = player.attrs.Nat?.value ?? 12;
  if (age >= 30 && nat <= 10) return { level: "media", why: "30+ con forma física natural baja: los físicos caen rápido; prioriza recuperación" };
  if (age <= 23 && nat >= 12) return { level: "doble", why: "joven con buena forma física natural: desarrolla más rápido" };
  if (age >= 31 || nat <= 8) return { level: "media", why: age >= 31 ? "veterano: reduce riesgo de lesión y fatiga" : "forma física natural baja" };
  return { level: "normal", why: "edad y forma física estándar" };
}

// ===========================================================================
// Calendario semanal de equipo
// ===========================================================================

export type SessionCategory = "general" | "tactica" | "ataque" | "defensa" | "fisico" | "tecnica" | "extra";

export interface Session {
  id: string;
  es: string;
  en: string;
  category: SessionCategory;
}

export const SESSIONS: Session[] = [
  { id: "rest", es: "Descanso", en: "Rest", category: "general" },
  { id: "recovery", es: "Recuperación", en: "Recovery", category: "general" },
  { id: "match-practice", es: "Partido de práctica", en: "Match Practice", category: "general" },
  { id: "team-bonding", es: "Cohesión de equipo", en: "Team Bonding", category: "general" },
  { id: "physical", es: "Físico", en: "Physical", category: "general" },
  { id: "match-preview", es: "Previa del partido", en: "Match Preview", category: "tactica" },
  { id: "match-review", es: "Análisis del partido", en: "Match Review", category: "tactica" },
  { id: "tactical", es: "Táctica", en: "Tactical", category: "tactica" },
  { id: "teamwork", es: "Trabajo en equipo", en: "Teamwork", category: "tactica" },
  { id: "att-direct", es: "Ataque directo", en: "Attacking Direct", category: "ataque" },
  { id: "att-patient", es: "Ataque paciente", en: "Attacking Patient", category: "ataque" },
  { id: "att-wings", es: "Ataque por bandas", en: "Attacking Wings", category: "ataque" },
  { id: "att-movement", es: "Movimiento ofensivo", en: "Attacking Movement", category: "ataque" },
  { id: "chance-creation", es: "Creación de ocasiones", en: "Chance Creation", category: "ataque" },
  { id: "chance-conversion", es: "Definición", en: "Chance Conversion", category: "ataque" },
  { id: "att-shadow", es: "Juego sombra ofensivo", en: "Att Shadow Play", category: "ataque" },
  { id: "def-shape", es: "Estructura defensiva", en: "Defensive Shape", category: "defensa" },
  { id: "def-engaged", es: "Defensa presionante", en: "Defending Engaged", category: "defensa" },
  { id: "def-disengaged", es: "Defensa replegada", en: "Defending Disengaged", category: "defensa" },
  { id: "def-front", es: "Defender desde arriba", en: "Defending From The Front", category: "defensa" },
  { id: "def-wide", es: "Defensa en banda", en: "Defending Wide", category: "defensa" },
  { id: "transition-press", es: "Transición: presión", en: "Transition Press", category: "defensa" },
  { id: "transition-restrict", es: "Transición: contención", en: "Transition Restrict", category: "defensa" },
  { id: "def-shadow", es: "Juego sombra defensivo", en: "Def Shadow Play", category: "defensa" },
  { id: "endurance", es: "Resistencia", en: "Endurance", category: "fisico" },
  { id: "quickness", es: "Rapidez", en: "Quickness", category: "fisico" },
  { id: "resistance", es: "Fuerza y resistencia", en: "Resistance", category: "fisico" },
  { id: "ball-distribution", es: "Distribución del balón", en: "Ball Distribution", category: "tecnica" },
  { id: "ball-retention", es: "Retención del balón", en: "Ball Retention", category: "tecnica" },
  { id: "goalkeeping", es: "Porteros", en: "Goalkeeping", category: "tecnica" },
  { id: "sp-attacking", es: "Balón parado ofensivo", en: "Set Pieces: Attacking", category: "extra" },
  { id: "sp-defending", es: "Balón parado defensivo", en: "Set Pieces: Defending", category: "extra" },
  { id: "gen-outfield", es: "Jugadores de campo", en: "Outfield", category: "general" },
];

export const SESSION_BY_ID: Record<string, Session> = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));

/** Sesiones características de cada estilo, por prioridad. */
const STYLE_SESSIONS: Record<string, { attack: string[]; defend: string[]; physical: string[] }> = {
  transiciones: { attack: ["att-direct", "chance-conversion", "att-movement", "att-shadow"], defend: ["transition-press", "def-shape", "def-engaged", "def-shadow"], physical: ["quickness", "endurance"] },
  gegenpress: { attack: ["att-movement", "chance-creation", "att-patient", "att-shadow"], defend: ["def-front", "transition-press", "def-engaged", "def-shadow"], physical: ["endurance", "quickness"] },
  posesion: { attack: ["att-patient", "chance-creation", "att-movement", "ball-retention"], defend: ["def-shape", "transition-press", "def-engaged", "def-shadow"], physical: ["endurance", "resistance"] },
  "tiki-vertical": { attack: ["att-movement", "chance-creation", "att-direct", "ball-retention"], defend: ["transition-press", "def-front", "def-shape", "def-shadow"], physical: ["quickness", "endurance"] },
  "bloque-bajo": { attack: ["att-direct", "chance-conversion", "att-wings", "att-shadow"], defend: ["def-disengaged", "transition-restrict", "def-shape", "def-shadow"], physical: ["quickness", "resistance"] },
  directo: { attack: ["att-wings", "att-direct", "chance-conversion", "sp-attacking"], defend: ["def-shape", "def-disengaged", "def-wide", "sp-defending"], physical: ["resistance", "endurance"] },
  default: { attack: ["att-movement", "chance-creation", "att-direct", "att-shadow"], defend: ["def-shape", "transition-press", "def-engaged", "def-shadow"], physical: ["endurance", "quickness"] },
};

export const DAY_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export interface DayPlan {
  day: number;
  isMatch: boolean;
  /** Hasta 3 sesiones (mañana, tarde, noche). null = vacío. */
  sessions: (string | null)[];
}

export interface WeekOptions {
  styleId: string | null;
  /** Días con partido (0 = lunes … 6 = domingo). */
  matchDays: number[];
  preseason: boolean;
}

/**
 * Genera una semana siguiendo las reglas habituales: previa el día anterior al
 * partido, análisis + recuperación el día siguiente, físico solo lejos de
 * partidos, y sesiones de ataque/defensa/técnica del estilo en los días
 * intermedios. Con dos partidos se aligera; en pretemporada se carga físico.
 */
export function buildWeek(opts: WeekOptions): DayPlan[] {
  const st = STYLE_SESSIONS[opts.styleId ?? "default"] ?? STYLE_SESSIONS.default;
  const matchSet = new Set(opts.matchDays);
  const days: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ day: d, isMatch: matchSet.has(d), sessions: [null, null, null] }));
  const prevMatch = (d: number) => matchSet.has((d + 6) % 7);
  const nextMatch = (d: number) => matchSet.has((d + 1) % 7);
  const twoMatches = opts.matchDays.length >= 2;

  // Contadores para repartir sesiones sin repetir en la semana
  let ai = 0, di = 0, pi = 0;
  const next = (arr: string[], i: number) => arr[i % arr.length];

  for (const day of days) {
    if (day.isMatch) { day.sessions = ["match", null, null]; continue; }
    const after = prevMatch(day.day);
    const before = nextMatch(day.day);

    if (opts.preseason) {
      if (before) { day.sessions = ["match-preview", "team-bonding", null]; continue; }
      if (after) { day.sessions = ["recovery", "match-review", null]; continue; }
      const third = ["team-bonding", "tactical", "match-practice"][day.day % 3];
      day.sessions = [next(st.physical, pi++), day.day % 2 === 0 ? next(st.attack, ai++) : next(st.defend, di++), third];
      continue;
    }
    if (after && before) { day.sessions = ["recovery", "match-review", "match-preview"]; continue; }
    if (after) { day.sessions = ["recovery", "match-review", twoMatches ? null : "sp-defending"]; continue; }
    if (before) { day.sessions = ["match-preview", "sp-attacking", twoMatches ? "rest" : null]; continue; }

    if (twoMatches) {
      day.sessions = [next(st.attack, ai++), "rest", null];
    } else {
      // Máximo dos sesiones físicas por semana y nunca a dos días del partido.
      const slot: (string | null)[] = [next(st.attack, ai++), next(st.defend, di++), null];
      if (nextMatch((day.day + 1) % 7)) slot[2] = "rest";
      else if (pi < 2) slot[2] = next(st.physical, pi++);
      else slot[2] = "teamwork";
      day.sessions = slot;
    }
  }
  // Un día de descanso completo si no hay partido entre semana
  if (!twoMatches && !opts.preseason) {
    const free = days.find((d) => !d.isMatch && !prevMatch(d.day) && !nextMatch(d.day) && d.day === 6);
    if (free) free.sessions = ["rest", null, null];
  }
  return days;
}

// ===========================================================================
// Tutorías
// ===========================================================================

export type PersonalityTier = "buena" | "neutra" | "mala";

const GOOD_RE = /profesional|perfeccionista|modelo|resuelto|decidid|hierro|l[ií]der|ambicios|resistente|esp[ií]ritu|combativ|leal|fiel|devoto|professional|perfectionist|resolute|determined|iron|leader|ambitious|resilient|spirited|loyal|devoted|driven/i;
const BAD_RE = /vago|informal|temperamental|desanima|poca determinaci|cobarde|sin ambici|voluble|mercenario|descontent|casual|slack|easily discouraged|low determination|spineless|unambitious|fickle|mercenary|temperamental/i;

export function personalityTier(p: string | null): PersonalityTier {
  if (!p) return "neutra";
  if (BAD_RE.test(p)) return "mala";
  if (GOOD_RE.test(p)) return "buena";
  return "neutra";
}

export type Unit = "portero" | "defensa" | "medio" | "ataque";

/** Unidad según la posición principal (la primera que lista el juego). */
export function unitOf(p: Player): Unit {
  if (p.isGoalkeeper) return "portero";
  const x = p.position.slots[0];
  if (!x) return "medio";
  if (x === "ST" || x.startsWith("AM")) return "ataque";
  if (x === "DM" || x.startsWith("M")) return "medio";
  return "defensa";
}

export interface MentoringGroup {
  unit: Unit;
  mentors: Player[];
  mentees: Player[];
}

/**
 * Mentores: ≥24 años, personalidad buena y determinación/liderazgo altos.
 * Aprendices: ≤23 años con personalidad no buena (o buena pero con
 * determinación baja). Se agrupan por unidad para que compartan sesiones.
 */
export function suggestMentoring(players: Player[]): MentoringGroup[] {
  const units: Unit[] = ["portero", "defensa", "medio", "ataque"];
  return units
    .map((unit) => {
      const pool = players.filter((p) => unitOf(p) === unit);
      const mentors = pool
        .filter((p) => (p.age ?? 0) >= 24 && personalityTier(p.personality) === "buena" && ((p.attrs.Det?.value ?? 0) >= 14 || (p.attrs.Ldr?.value ?? 0) >= 14))
        .sort((a, b) => (b.attrs.Ldr?.value ?? 0) + (b.attrs.Det?.value ?? 0) - (a.attrs.Ldr?.value ?? 0) - (a.attrs.Det?.value ?? 0));
      const mentees = pool
        .filter((p) => (p.age ?? 99) <= 23 && (personalityTier(p.personality) !== "buena" || (p.attrs.Det?.value ?? 0) < 12))
        .sort((a, b) => (a.attrs.Det?.value ?? 0) - (b.attrs.Det?.value ?? 0));
      return { unit, mentors, mentees };
    })
    .filter((g) => g.mentees.length > 0);
}

export const UNIT_LABEL: Record<Unit, string> = { portero: "Porteros", defensa: "Defensa", medio: "Medio campo", ataque: "Ataque" };
