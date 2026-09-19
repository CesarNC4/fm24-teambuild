/**
 * Entrenamiento: foco individual, calendario semanal de equipo y tutorías.
 */

import type { AttrKey } from "./attributes";
import type { RoleDef } from "./roles";
import type { Player } from "./types";
import { personalityTierLevel } from "./personalities";

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
      // Los mentales son los que más tardan en subir (físicos > técnicos > mentales).
      else if (area.id === "final-third") { deficit *= 0.85; note = "área mental: la mejora es la más lenta de todas"; }
      return { area, deficit, detail, note };
    })
    .filter((r) => r.detail.length > 0 && r.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);
}

/**
 * Carga individual recomendada. La regla de la guía de entrenamiento es que la
 * intensidad individual se deje en "Automática" y que la carga total (foco
 * adicional + rasgo + pie débil) no pase de "Media": si el juego la marca en
 * Alta, se quita algo. Aquí se estima cuántos extras aguanta cada jugador.
 */
export interface LoadRecommendation {
  /** Extras simultáneos (foco adicional, rasgo, pie débil) que aguanta sin pasar de Media. */
  extras: 0 | 1 | 2;
  why: string;
}

export function recommendLoad(player: Player): LoadRecommendation {
  const age = player.age ?? 25;
  const nat = player.attrs.Nat?.value ?? 12;
  if (age >= 33 || nat <= 7) return { extras: 0, why: `${age >= 33 ? "veterano" : "forma física natural muy baja"}: solo entrenamiento de rol, nada extra` };
  if (age >= 30 || nat <= 10) return { extras: 1, why: age >= 30 ? "30+: un solo extra (foco o rasgo), el resto es riesgo de lesión" : "forma física natural baja: un solo extra" };
  if (age <= 23 && nat >= 14) return { extras: 2, why: "joven y con buena forma física natural: foco + rasgo sin pasar de Media" };
  return { extras: 2, why: "carga normal: foco + rasgo, pero vigila que la intensidad total no marque Alta" };
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
  "tiki-taka": { attack: ["att-patient", "ball-retention", "att-movement", "chance-creation"], defend: ["def-front", "transition-press", "def-engaged", "def-shadow"], physical: ["endurance", "quickness"] },
  "contra-fluido": { attack: ["att-movement", "att-direct", "chance-creation", "att-shadow"], defend: ["def-shape", "transition-restrict", "def-disengaged", "def-shadow"], physical: ["quickness", "endurance"] },
  "route-one": { attack: ["att-direct", "att-wings", "chance-conversion", "sp-attacking"], defend: ["def-shape", "def-disengaged", "def-wide", "sp-defending"], physical: ["resistance", "endurance"] },
  bandas: { attack: ["att-wings", "chance-creation", "chance-conversion", "att-shadow"], defend: ["def-wide", "def-shape", "transition-restrict", "def-shadow"], physical: ["quickness", "endurance"] },
  autobus: { attack: ["att-direct", "chance-conversion", "sp-attacking", "att-shadow"], defend: ["def-disengaged", "def-shape", "def-wide", "def-shadow"], physical: ["resistance", "endurance"] },
  catenaccio: { attack: ["att-direct", "att-wings", "chance-conversion", "att-shadow"], defend: ["def-shape", "def-disengaged", "transition-restrict", "def-shadow"], physical: ["resistance", "quickness"] },
  default: { attack: ["att-movement", "chance-creation", "att-direct", "att-shadow"], defend: ["def-shape", "transition-press", "def-engaged", "def-shadow"], physical: ["endurance", "quickness"] },
};

export const DAY_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export interface DayPlan {
  day: number;
  isMatch: boolean;
  /** Hasta 3 sesiones (mañana, tarde, noche). null = vacío. */
  sessions: (string | null)[];
}

export type WeekGoal = "normal" | "cohesion" | "defensa" | "ataque";
export const WEEK_GOAL_LABEL: Record<WeekGoal, string> = {
  normal: "Normal (estilo de la táctica)",
  cohesion: "Cohesión (fichajes nuevos / vestuario)",
  defensa: "Cerrar la portería",
  ataque: "Crear y marcar más",
};

export interface WeekOptions {
  styleId: string | null;
  /** Días con partido (0 = lunes … 6 = domingo). */
  matchDays: number[];
  preseason: boolean;
  /** Objetivo de la semana (schedules de escenario de Passion4FM). */
  goal?: WeekGoal;
  /** Número de semana para rotar las sesiones de ataque/defensa (guía de jonasmorais). */
  weekIndex?: number;
}

/** Sesiones de los escenarios "Shut up shop" y "Chance creation" del megapack. */
const GOAL_SESSIONS: Record<Exclude<WeekGoal, "normal">, { attack: string[]; defend: string[] }> = {
  cohesion: { attack: ["teamwork", "att-movement", "team-bonding", "ball-retention"], defend: ["def-shape", "teamwork", "team-bonding", "def-shadow"] },
  defensa: { attack: ["transition-restrict", "att-direct", "chance-conversion", "sp-attacking"], defend: ["def-shape", "def-disengaged", "def-wide", "def-shadow"] },
  ataque: { attack: ["chance-creation", "chance-conversion", "att-movement", "att-shadow"], defend: ["transition-press", "def-front", "sp-defending", "def-shape"] },
};

/**
 * Genera una semana con las reglas de las guías de entrenamiento:
 * - día después del partido: recuperación + análisis (y descanso si hay dos partidos);
 * - la carga sube dos días después del partido y baja hacia el siguiente;
 * - días alternos fuerte/ligero, físico nunca la víspera ni con dos partidos;
 * - la sesión de ataque de mitad de semana y la defensiva del final rotan
 *   entre semanas; previa el día anterior;
 * - pretemporada sin partidos = física pura; con partidos = física + táctica.
 */
export function buildWeek(opts: WeekOptions): DayPlan[] {
  const goal = opts.goal ?? "normal";
  const base = STYLE_SESSIONS[opts.styleId === "directo" ? "bandas" : opts.styleId ?? "default"] ?? STYLE_SESSIONS.default;
  const st = goal === "normal" ? base : { ...base, ...GOAL_SESSIONS[goal] };
  const wk = opts.weekIndex ?? 0;
  const matchSet = new Set(opts.matchDays);
  const days: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ day: d, isMatch: matchSet.has(d), sessions: [null, null, null] }));
  const prevMatch = (d: number) => matchSet.has((d + 6) % 7);
  const nextMatch = (d: number) => matchSet.has((d + 1) % 7);
  const twoMatches = opts.matchDays.length >= 2;
  const noMatches = opts.matchDays.length === 0;

  // Rotación entre semanas: cada semana empieza en una sesión distinta de la lista
  let ai = wk, di = wk, pi = 0;
  const next = (arr: string[], i: number) => arr[i % arr.length];
  /** Días desde el último partido (1 = día siguiente). 0 si no hay partidos. */
  const sinceMatch = (d: number) => {
    if (noMatches) return 0;
    for (let k = 1; k <= 7; k++) if (matchSet.has((d - k + 7) % 7)) return k;
    return 0;
  };

  for (const day of days) {
    if (day.isMatch) { day.sessions = ["match", null, null]; continue; }
    const after = prevMatch(day.day);
    const before = nextMatch(day.day);

    if (opts.preseason) {
      if (noMatches) {
        // Semanas 1-2 de pretemporada: solo condición física y cohesión
        const phys = ["endurance", "resistance", "quickness", "physical"];
        if (day.day === 6) { day.sessions = ["rest", null, null]; continue; }
        day.sessions = [next(phys, pi++), day.day % 2 === 0 ? "team-bonding" : "ball-retention", day.day % 2 === 0 ? next(phys, pi++) : "teamwork"];
        continue;
      }
      if (before) { day.sessions = ["match-preview", "team-bonding", null]; continue; }
      if (after) { day.sessions = ["recovery", "match-review", null]; continue; }
      const third = ["team-bonding", "tactical", "match-practice"][day.day % 3];
      day.sessions = [next(st.physical, pi++), day.day % 2 === 0 ? next(st.attack, ai++) : next(st.defend, di++), third];
      continue;
    }
    if (after && before) { day.sessions = ["recovery", "match-review", "match-preview"]; continue; }
    if (after) { day.sessions = ["recovery", "match-review", twoMatches ? "rest" : null]; continue; }
    if (before) { day.sessions = ["match-preview", twoMatches ? "rest" : goal === "defensa" ? "sp-defending" : "sp-attacking", null]; continue; }

    if (twoMatches) {
      // Entre partidos: una sesión táctica y descanso; sin físico
      day.sessions = [sinceMatch(day.day) === 2 ? next(st.attack, ai++) : next(st.defend, di++), "rest", null];
      continue;
    }
    const k = sinceMatch(day.day);
    if (noMatches) {
      // Parón: desarrollo puro alternando ataque/defensa, físico dos veces
      day.sessions = day.day % 2 === 0
        ? [next(st.attack, ai++), pi < 2 ? next(st.physical, pi++) : "teamwork", null]
        : [next(st.defend, di++), "ball-retention", null];
    } else if (k === 2) {
      // Pico de carga: físico + sesión del estilo
      day.sessions = [next(st.physical, pi++), next(st.attack, ai++), "teamwork"];
    } else if (nextMatch((day.day + 1) % 7)) {
      // Dos días antes del partido: sesión defensiva rotatoria y ligero
      day.sessions = [next(st.defend, di++), "rest", null];
    } else if (k % 2 === 1) {
      // Día ligero
      day.sessions = [next(st.attack, ai++), goal === "cohesion" ? "team-bonding" : "rest", null];
    } else {
      day.sessions = [next(st.defend, di++), pi < 2 ? next(st.physical, pi++) : "ball-retention", null];
    }
  }
  if (noMatches && !opts.preseason) {
    // Semana sin partidos (parón): desarrollo puro, un descanso el domingo
    days[6].sessions = ["rest", null, null];
    days[0].sessions = ["recovery", "match-review", null];
  }
  return days;
}

// ===========================================================================
// Semana de los filiales (guías de jonasmorais y del megapack de Passion4FM)
// ===========================================================================

/**
 * Temas de la semana juvenil. Passion4FM (modelo TIPS del Ajax) rota
 * 3 meses de general → 3 de técnica → 3 de inteligencia, con velocidad solo
 * en semanas sin partido por el riesgo de lesión. jonasmorais: en el Sub-18
 * cada día es de una categoría (no hacen falta previas ni análisis); el
 * Sub-21 mezcla días temáticos con preparación del partido.
 */
export type YouthTheme = "general" | "tecnica" | "inteligencia" | "velocidad" | "fisico" | "equipo";
export const YOUTH_THEME_LABEL: Record<YouthTheme, string> = {
  general: "General (3 meses al empezar)",
  tecnica: "Técnica (3 meses)",
  inteligencia: "Inteligencia / visión (3 meses)",
  velocidad: "Velocidad (solo semanas sin partido)",
  fisico: "Físico (fuerza y resistencia)",
  equipo: "Cohesión (canteranos nuevos)",
};

/** Sesiones de cada tema, en orden de prioridad; se reparten dos por día. */
const YOUTH_SESSIONS: Record<YouthTheme, string[]> = {
  general: ["ball-retention", "att-movement", "def-shape", "quickness", "ball-distribution", "endurance", "chance-creation", "def-engaged"],
  tecnica: ["ball-distribution", "ball-retention", "chance-creation", "chance-conversion", "att-patient", "att-wings", "goalkeeping", "sp-attacking"],
  inteligencia: ["tactical", "att-shadow", "def-shadow", "def-shape", "att-movement", "teamwork", "def-front", "match-practice"],
  velocidad: ["quickness", "att-movement", "transition-press", "quickness", "def-engaged", "endurance", "att-direct", "quickness"],
  fisico: ["resistance", "endurance", "quickness", "physical", "resistance", "def-shape", "endurance", "att-movement"],
  equipo: ["team-bonding", "teamwork", "match-practice", "att-movement", "def-shape", "team-bonding", "ball-retention", "teamwork"],
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
  const days: DayPlan[] = Array.from({ length: 7 }, (_, d) => ({ day: d, isMatch: matchSet.has(d), sessions: [null, null, null] }));
  const prevMatch = (d: number) => matchSet.has((d + 6) % 7);
  const nextMatch = (d: number) => matchSet.has((d + 1) % 7);
  let i = 0;
  const next = () => list[i++ % list.length];
  for (const day of days) {
    if (day.isMatch) { day.sessions = ["match", null, null]; continue; }
    if (prevMatch(day.day)) { day.sessions = ["recovery", opts.competitive ? "match-review" : next(), null]; continue; }
    if (day.day === 6) { day.sessions = ["rest", null, null]; continue; }
    if (nextMatch(day.day) && opts.competitive) { day.sessions = ["match-preview", next(), null]; continue; }
    // Día temático: dos sesiones del tema y una tercera ligera en días alternos
    day.sessions = [next(), next(), day.day % 2 === 0 ? "rest" : opts.theme === "velocidad" || opts.theme === "fisico" ? "recovery" : "teamwork"];
  }
  return days;
}

/** Avisos sobre la configuración elegida. */
export function youthWeekWarnings(opts: YouthWeekOptions): string[] {
  const out: string[] = [];
  if (opts.theme === "velocidad" && opts.matchDays.length > 0) out.push("La semana de velocidad va en semanas sin partido: es la de más lesiones.");
  if (opts.matchDays.length >= 2) out.push("Dos partidos: quita la tercera sesión de los días temáticos si aparecen fatigados.");
  if (!opts.competitive) out.push("Sub-18: sin previa ni análisis; con 15 minutos ya reciben nota, así que rota a todos.");
  return out;
}

// ===========================================================================
// Charlas: elogios y críticas mensuales por rendimiento (guía de jonasmorais)
// ===========================================================================

export interface TalkSuggestion {
  player: Player;
  kind: "elogio" | "critica";
  rating: number;
  /** Aviso cuando la personalidad aconseja no criticar. */
  caution?: string;
}

export function suggestTalks(players: Player[]): TalkSuggestion[] {
  const out: TalkSuggestion[] = [];
  for (const p of players) {
    if (p.avgRating == null) continue;
    if (p.avgRating >= 7.5) out.push({ player: p, kind: "elogio", rating: p.avgRating });
    else if (p.avgRating <= 6.5) {
      const tier = personalityTierLevel(p.personality);
      const fragile = /confianza|desanima|agallas|temperamental|provocar|irascible|vol[aá]til/i.test(`${p.personality ?? ""} ${p.mediaHandling ?? ""}`);
      out.push({ player: p, kind: "critica", rating: p.avgRating, caution: fragile ? "personalidad frágil: critica en privado o no critiques" : tier <= 1 ? "personalidad mala: puede reaccionar mal" : undefined });
    }
  }
  return out.sort((a, b) => (a.kind === b.kind ? b.rating - a.rating : a.kind === "elogio" ? -1 : 1));
}

// ===========================================================================
// Tutorías
// ===========================================================================

export type PersonalityTier = "buena" | "neutra" | "mala";

/** Resumen en tres niveles a partir del catálogo de personalidades. */
export function personalityTier(p: string | null): PersonalityTier {
  const t = personalityTierLevel(p);
  if (t >= 5) return "buena";
  if (t <= 2) return "mala";
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
  /** Avisos sobre mentores que contagian algo indeseado. */
  notes: string[];
}

/**
 * Mentores: ≥24 años, personalidad buena (o mejor) y Determinación o Liderazgo
 * altos; se ordenan por nivel de personalidad y se proponen hasta tres por
 * unidad (la guía recomienda un grupo con un mentor por línea). Aprendices:
 * ≤23 años con personalidad no buena o determinación baja. Los ambiciosos se
 * marcan porque contagian lealtad baja además de ambición.
 */
export function suggestMentoring(players: Player[], opts: { youth?: boolean } = {}): MentoringGroup[] {
  const units: Unit[] = ["portero", "defensa", "medio", "ataque"];
  // En un filial no hay veteranos: valen los mayores del grupo con buena personalidad.
  const minAge = opts.youth ? 19 : 24;
  return units
    .map((unit) => {
      const pool = players.filter((p) => unitOf(p) === unit);
      const mentors = pool
        .filter((p) => (p.age ?? 0) >= minAge && personalityTierLevel(p.personality) >= 5 && ((p.attrs.Det?.value ?? 0) >= (opts.youth ? 13 : 14) || (p.attrs.Ldr?.value ?? 0) >= (opts.youth ? 10 : 14)))
        .sort((a, b) => personalityTierLevel(b.personality) - personalityTierLevel(a.personality) || (b.attrs.Ldr?.value ?? 0) + (b.attrs.Det?.value ?? 0) - (a.attrs.Ldr?.value ?? 0) - (a.attrs.Det?.value ?? 0))
        .slice(0, 3);
      const mentees = pool
        .filter((p) => (p.age ?? 99) <= 23 && !mentors.includes(p) && (personalityTierLevel(p.personality) < 5 || (p.attrs.Det?.value ?? 0) < 12))
        .sort((a, b) => personalityTierLevel(a.personality) - personalityTierLevel(b.personality) || (a.attrs.Det?.value ?? 0) - (b.attrs.Det?.value ?? 0));
      const notes: string[] = [];
      for (const m of pool.filter((p) => (p.age ?? 0) >= 24 && /ambicios|ambitious/i.test(p.personality ?? "") && !mentors.includes(p))) {
        notes.push(`${m.name} (${m.personality}) no como mentor: contagia lealtad baja.`);
      }
      for (const m of mentors.filter((p) => /perfeccionista|perfectionist/i.test(p.personality ?? ""))) {
        notes.push(`${m.name} es perfeccionista: buen mentor, pero puede pasar temperamento bajo.`);
      }
      return { unit, mentors, mentees, notes };
    })
    .filter((g) => g.mentees.length > 0);
}

export const UNIT_LABEL: Record<Unit, string> = { portero: "Porteros", defensa: "Defensa", medio: "Medio campo", ataque: "Ataque" };
