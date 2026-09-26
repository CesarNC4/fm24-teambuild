/**
 * Datos de entrenamiento de FM24 tal como aparecen en el juego en español
 * (capturas de focos adicionales y del panel de influencia de cada sesión).
 */

import type { AttrKey } from "./attributes";

// ===========================================================================
// Focos adicionales (22)
// ===========================================================================

export type FocusGroup = "campo" | "balon-parado" | "portero";

export interface FocusArea {
  id: string;
  es: string;
  group: FocusGroup;
  attrs: AttrKey[];
  /** Físico: rinde poco a partir de cierta edad. */
  physical?: boolean;
}

export const FOCUS_AREAS: FocusArea[] = [
  { id: "rapidez", es: "Rapidez", group: "campo", attrs: ["Acc", "Pac"], physical: true },
  { id: "agilidad-equilibrio", es: "Agilidad y equilibrio", group: "campo", attrs: ["Agi", "Bal"], physical: true },
  { id: "fuerza", es: "Fuerza", group: "campo", attrs: ["Jum", "Str"], physical: true },
  { id: "aguante", es: "Aguante", group: "campo", attrs: ["Sta", "Wor"], physical: true },
  { id: "colocacion-defensiva", es: "Colocación defensiva", group: "campo", attrs: ["Mar", "Pos", "Dec"] },
  { id: "movimiento-ataque", es: "Movimiento de ataque", group: "campo", attrs: ["Ant", "Dec", "OtB"] },
  { id: "ultimo-tercio", es: "Último tercio", group: "campo", attrs: ["Dec", "Cmp"] },
  { id: "disparos", es: "Disparos", group: "campo", attrs: ["Fin", "Tec", "Lon"] },
  { id: "pases", es: "Pases", group: "campo", attrs: ["Pas", "Tec", "Vis"] },
  { id: "centros", es: "Centros", group: "campo", attrs: ["Cro", "Tec"] },
  { id: "control", es: "Control de balón", group: "campo", attrs: ["Fir", "Dri", "Tec"] },
  { id: "juego-aereo", es: "Juego aéreo", group: "campo", attrs: ["Hea", "Bra"] },
  { id: "corners", es: "Lanzamientos de córner", group: "balon-parado", attrs: ["Cor", "Tec"] },
  { id: "tiros-libres", es: "Tiros libres", group: "balon-parado", attrs: ["Fre", "Tec"] },
  { id: "penaltis", es: "Lanzamiento de penaltis", group: "balon-parado", attrs: ["Pen", "Tec"] },
  { id: "saques-largos", es: "Saques largos", group: "balon-parado", attrs: ["L Th"] },
  { id: "gk-reacciones", es: "Reacciones (portero)", group: "portero", attrs: ["Ref", "Ant", "Cnt"] },
  { id: "gk-entradas", es: "Entradas (portero)", group: "portero", attrs: ["Cmd", "TRO", "1v1"] },
  { id: "gk-tecnica", es: "Técnica (portero)", group: "portero", attrs: ["Han", "Cmp", "Tec"] },
  { id: "gk-tactica", es: "Táctica (portero)", group: "portero", attrs: ["Com", "Pos", "Dec"] },
  { id: "gk-dist-corto", es: "Distribución en corto (portero)", group: "portero", attrs: ["Fir", "Pas", "Vis"] },
  { id: "gk-dist-largo", es: "Distribución en largo (portero)", group: "portero", attrs: ["Thr", "Kic"] },
];

export const FOCUS_BY_ID: Record<string, FocusArea> = Object.fromEntries(FOCUS_AREAS.map((f) => [f.id, f]));

/**
 * Atributos que ninguna sesión ni foco entrena (solo cambian con la edad,
 * tutorías o charlas). Sacrificio y Recuperación física sí se entrenan: salen
 * en Aguante, Físico y otras sesiones del juego.
 */
export const UNTRAINABLE: AttrKey[] = ["Det", "Ldr"];

// ===========================================================================
// Sesiones
// ===========================================================================

export type SessionCat =
  | "general" | "ofensiva" | "defensiva" | "tecnica" | "tactica" | "porteria"
  | "fisico" | "balon-parado" | "preparacion" | "extracurricular" | "partido";

export const SESSION_CAT_LABEL: Record<SessionCat, string> = {
  general: "General", ofensiva: "Ofensiva", defensiva: "Defensiva", tecnica: "Técnica", tactica: "Táctica",
  porteria: "Portería", fisico: "Físico", "balon-parado": "Balón parado", preparacion: "Preparación de partido",
  extracurricular: "Extracurricular", partido: "Partido",
};

/** Grupos del panel de influencia: unidades (portero, defensiva, de ataque) o el equipo entero. */
export type SessionGroup = "todos" | "campo" | "porteros" | "defensa" | "ataque" | "lanzadores" | "resto";

export const GROUP_LABEL: Record<SessionGroup, string> = {
  todos: "Todos", campo: "Jugadores de campo", porteros: "Porteros", defensa: "Unidad defensiva",
  ataque: "Unidad de ataque", lanzadores: "Lanzadores", resto: "Resto",
};

export interface SessionPart {
  group: SessionGroup;
  pct: number;
  /** "roles" = el grupo trabaja los atributos de su rol individual. */
  attrs: AttrKey[] | "roles";
}

export type Familiarity = "mentalidad" | "pase" | "libertad" | "presion" | "marcaje" | "ritmo" | "amplitud" | "rol";
export const FAMILIARITY_LABEL: Record<Familiarity, string> = {
  mentalidad: "Mentalidad", pase: "Estilo de pase", libertad: "Libertad creativa", presion: "Activar presión",
  marcaje: "Marcaje", ritmo: "Ritmo de juego", amplitud: "Amplitud", rol: "Posición/rol/tarea",
};
const ALL_FAM: Familiarity[] = ["mentalidad", "pase", "libertad", "presion", "marcaje", "ritmo", "amplitud", "rol"];

export type Effect = "felicidad" | "cohesion" | "lesion" | "condicion" | "fatiga" | "ritmo";
export const EFFECT_LABEL: Record<Effect, string> = {
  felicidad: "Felicidad", cohesion: "Cohesión", lesion: "Riesgo de lesión", condicion: "Condición", fatiga: "Fatiga", ritmo: "Ritmo competitivo",
};

export interface Session {
  id: string;
  es: string;
  cat: SessionCat;
  /** A quién va: dividido en unidades o al equipo entero. */
  mode: "unidades" | "equipo";
  parts: SessionPart[];
  familiarity: Familiarity[];
  /** −2 enorme reducción · −1 reducción · +1 aumento · +2 enorme aumento. */
  effects: Partial<Record<Effect, number>>;
  /** Lo pone el juego (enfoque del partido, viaje): la app solo lo muestra. */
  auto?: boolean;
  note?: string;
}

const GK_DEF: AttrKey[] = ["Aer", "Han", "1v1", "Ref", "Agi", "Pos", "Cmd", "Com", "Ant", "Cnt", "Dec"];
const GK_DIST: AttrKey[] = ["Fir", "Kic", "Pas", "Thr", "Vis"];
const ATT_GEN: AttrKey[] = ["Cro", "Dri", "Fin", "Fir", "Hea", "Lon", "Pas", "Tec", "Cmp", "Fla", "OtB", "Vis"];
const DEF_GEN: AttrKey[] = ["Hea", "Mar", "Tck", "Tec", "Agg", "Ant", "Cnt", "Dec", "Pos", "Tea", "Wor"];
const OUTFIELD_ALL: AttrKey[] = ["Agg", "Ant", "Cmp", "Cnt", "Cro", "Dec", "Dri", "Fin", "Fir", "Fla", "Hea", "Lon", "Mar", "OtB", "Pas", "Pos", "Tck", "Tea", "Tec", "Vis", "Wor"];
const PATIENT: AttrKey[] = ["Fin", "Fir", "Pas", "Tec", "Cmp", "Dec", "Fla", "OtB", "Vis", "Tea"];

const u = (a: AttrKey[] | "roles", d: AttrKey[] | "roles", g: AttrKey[] | "roles" = GK_DEF): SessionPart[] => [
  { group: "ataque", pct: 60, attrs: a }, { group: "defensa", pct: 20, attrs: d }, { group: "porteros", pct: 20, attrs: g },
];
const ud = (d: AttrKey[] | "roles", a: AttrKey[] | "roles", g: AttrKey[] | "roles" = GK_DEF): SessionPart[] => [
  { group: "defensa", pct: 60, attrs: d }, { group: "ataque", pct: 20, attrs: a }, { group: "porteros", pct: 20, attrs: g },
];
const gk = (g: AttrKey[]): SessionPart[] => [
  { group: "porteros", pct: 60, attrs: g }, { group: "defensa", pct: 20, attrs: "roles" }, { group: "ataque", pct: 20, attrs: "roles" },
];
const all = (a: AttrKey[] | "roles"): SessionPart[] => [{ group: "todos", pct: 100, attrs: a }];

export const SESSIONS: Session[] = [
  // --- General
  { id: "gen-campo", es: "Jugadores de campo", cat: "general", mode: "equipo", parts: [{ group: "campo", pct: 60, attrs: OUTFIELD_ALL }, { group: "porteros", pct: 40, attrs: "roles" }], familiarity: ALL_FAM, effects: { felicidad: 1, cohesion: 1, lesion: 1 } },
  { id: "gen-total", es: "Total", cat: "general", mode: "equipo", parts: all([...OUTFIELD_ALL, ...GK_DEF, "Kic", "Thr"]), familiarity: ALL_FAM, effects: { felicidad: 1, cohesion: 1, lesion: 1, fatiga: 1, condicion: -1 } },
  { id: "gen-tactica", es: "Táctica", cat: "general", mode: "equipo", parts: all(["Ant", "Cmp", "Cnt", "Dec", "OtB", "Pos", "Tea", "Vis"]), familiarity: ["mentalidad", "amplitud", "rol"], effects: { cohesion: 1, lesion: 1, condicion: -1 } },
  { id: "gen-ofensiva", es: "Ofensiva", cat: "general", mode: "equipo", parts: [{ group: "campo", pct: 60, attrs: ATT_GEN }, { group: "campo", pct: 20, attrs: DEF_GEN }, { group: "porteros", pct: 20, attrs: GK_DEF }], familiarity: ["libertad"], effects: { felicidad: 1, cohesion: 1, lesion: 1, condicion: -1 } },
  { id: "gen-defensiva", es: "Defensiva", cat: "general", mode: "equipo", parts: [{ group: "campo", pct: 60, attrs: DEF_GEN }, { group: "campo", pct: 20, attrs: ATT_GEN }, { group: "porteros", pct: 20, attrs: GK_DEF }], familiarity: ["presion", "marcaje"], effects: { felicidad: 1, lesion: 1 } },
  { id: "gen-posesion", es: "Posesión", cat: "general", mode: "equipo", parts: [{ group: "campo", pct: 60, attrs: ["Dri", "Fir", "Pas", "Tec", "Ant", "Cmp", "Dec", "OtB", "Tea", "Vis"] }, { group: "campo", pct: 20, attrs: ["Mar", "Tck", "Tec", "Agg", "Ant", "Cnt", "Dec", "Pos", "Tea", "Wor"] }, { group: "porteros", pct: 20, attrs: ["Pas", "Cmp", "Cnt", "Dec", "Vis", "Fir"] }], familiarity: ["pase", "ritmo"], effects: { lesion: 1 } },
  { id: "gen-porteros", es: "Porteros", cat: "general", mode: "equipo", parts: [{ group: "porteros", pct: 60, attrs: ["Aer", "Agi", "Ant", "Cmd", "Com", "Cnt", "Dec", "Han", "Kic", "1v1", "Pos", "Ref"] }, { group: "ataque", pct: 20, attrs: "roles" }, { group: "defensa", pct: 20, attrs: "roles" }], familiarity: [], effects: { lesion: 1 } },
  { id: "gen-fisico", es: "Físico", cat: "general", mode: "equipo", parts: all(["Acc", "Agi", "Bal", "Jum", "Nat", "Pac", "Sta", "Str", "Wor", "Aer"]), familiarity: [], effects: { lesion: 1, condicion: -1, fatiga: 1 } },
  // --- Ofensiva
  { id: "att-directo", es: "Ataque directo", cat: "ofensiva", mode: "unidades", parts: u(["Dri", "Fin", "Fir", "Lon", "Pas", "Tec", "Ant", "OtB", "Vis"], ["Mar", "Tck", "Ant", "Cnt", "Pos", "Tea"]), familiarity: ["pase", "libertad"], effects: { felicidad: 1, lesion: 1 } },
  { id: "att-bandas", es: "Atacar por las bandas", cat: "ofensiva", mode: "unidades", parts: u(["Ant", "Cro", "Dri", "Fin", "Hea", "OtB", "Tec"], ["Hea", "Mar", "Ant", "Dec", "Pos"]), familiarity: ["pase", "libertad"], effects: { lesion: 1 } },
  { id: "att-doblando", es: "Atacar doblando", cat: "ofensiva", mode: "equipo", parts: ud(["Cro", "Dri", "Fin", "Lon", "Ant", "OtB"], ["Hea", "Mar", "Tck", "Cnt", "Pos"], "roles"), familiarity: ["pase", "libertad"], effects: { lesion: 1 }, note: "La unidad principal es la defensiva: es la sesión de laterales y carrileros." },
  { id: "att-paciente", es: "Ataque paciente", cat: "ofensiva", mode: "unidades", parts: u(PATIENT, ["Mar", "Tck", "Agg", "Ant", "Dec", "Pos"]), familiarity: ["pase", "libertad"], effects: { lesion: 1 } },
  // --- Defensiva
  { id: "def-posesion", es: "Defender cuando no se tiene la posesión", cat: "defensiva", mode: "unidades", parts: ud(["Mar", "Tck", "Agg", "Ant", "Dec", "Pos"], PATIENT), familiarity: ["presion", "marcaje"], effects: { lesion: 1 } },
  { id: "def-esperando", es: "Defender esperando", cat: "defensiva", mode: "unidades", parts: u(["Mar", "Tck", "Ant", "Cnt", "Pos", "Tea"], ["Dri", "Fin", "Fir", "Lon", "Tec", "Ant", "OtB", "Vis"]), familiarity: ["presion", "marcaje"], effects: { lesion: 1 }, note: "La unidad principal es la de ataque: el bloque de los de arriba." },
  { id: "def-bandas", es: "Defender bandas", cat: "defensiva", mode: "unidades", parts: ud(["Hea", "Mar", "Ant", "Dec", "Pos"], ["Cro", "Dri", "Fin", "Hea", "Tec", "Ant", "OtB"]), familiarity: ["presion", "marcaje"], effects: { lesion: 1 } },
  { id: "def-rasos", es: "Defender balones rasos", cat: "defensiva", mode: "unidades", parts: ud(["Mar", "Tck", "Tec", "Cnt", "Pos"], "roles", "roles"), familiarity: [], effects: { lesion: 1 } },
  { id: "def-aereos", es: "Defender balones aéreos", cat: "defensiva", mode: "unidades", parts: ud(["Hea", "Mar", "Tec", "Cnt", "Pos"], "roles", "roles"), familiarity: [], effects: { lesion: 1 } },
  { id: "def-arriba", es: "Defender arriba", cat: "defensiva", mode: "equipo", parts: u(["Hea", "Mar", "Tck", "Cnt", "Pos"], ["Cro", "Dri", "Fin", "Lon", "Ant", "OtB"], "roles"), familiarity: ["presion", "marcaje"], effects: { felicidad: 1, lesion: 1 }, note: "La unidad principal es la de ataque; la defensiva practica la salida contra esa presión." },
  // --- Técnica
  { id: "tec-convertir", es: "Convertir oportunidades", cat: "tecnica", mode: "unidades", parts: u(["Fin", "Hea", "Lon", "Tec", "Ant", "Cmp"], "roles", "roles"), familiarity: [], effects: { lesion: 1 } },
  { id: "tec-creacion", es: "Creación de oportunidades", cat: "tecnica", mode: "unidades", parts: u(["Cro", "Pas", "Tec", "Dec", "Fla", "OtB", "Vis"], "roles", "roles"), familiarity: [], effects: { felicidad: 1, lesion: 1 } },
  { id: "tec-distribucion", es: "Distribución de balón", cat: "tecnica", mode: "unidades", parts: u(["Dri", "Pas", "Dec", "Vis", "Tea"], ["Mar", "Tck", "Ant", "Dec", "Cnt", "Pos", "Tea"], GK_DIST), familiarity: [], effects: { lesion: 1 } },
  { id: "tec-trans-presionar", es: "Transición – Presionar", cat: "tecnica", mode: "unidades", parts: [{ group: "ataque", pct: 40, attrs: ["Fir", "Pas", "Tck", "Ant", "Agg", "Dec", "Tea", "Wor"] }, { group: "defensa", pct: 40, attrs: ["Fir", "Pas", "Tck", "Ant", "Agg", "Dec", "Tea", "Wor"] }, { group: "porteros", pct: 20, attrs: "roles" }], familiarity: [], effects: { lesion: 1 } },
  { id: "tec-trans-restringir", es: "Transición – Restringir", cat: "tecnica", mode: "unidades", parts: [{ group: "ataque", pct: 40, attrs: ["Pas", "Tck", "Ant", "Cnt", "Mar", "Pos", "Tea"] }, { group: "defensa", pct: 40, attrs: ["Pas", "Tck", "Ant", "Cnt", "Mar", "Pos", "Tea"] }, { group: "porteros", pct: 20, attrs: "roles" }], familiarity: [], effects: { lesion: 1 } },
  { id: "tec-retencion", es: "Retención de balón", cat: "tecnica", mode: "unidades", parts: u(["Fir", "Ant", "Cmp", "Dec", "Tea"], ["Mar", "Tck", "Ant", "Dec", "Cnt", "Pos", "Tea"], "roles"), familiarity: [], effects: {} },
  { id: "tec-desde-atras", es: "Jugar desde atrás", cat: "tecnica", mode: "equipo", parts: ud(["Dri", "Fir", "Pas", "Cmp", "Fla", "Vis", "Tea"], ["Dri", "Fir", "Pas", "Cmp", "Fla", "Vis", "Tea"], GK_DIST), familiarity: [], effects: { felicidad: 1, lesion: 1 }, note: "La unidad principal es la defensiva." },
  // --- Táctica
  { id: "tac-atacar", es: "Atacar sin balón", cat: "tactica", mode: "unidades", parts: u(["Ant", "Cmp", "Dec", "OtB", "Tea"], ["Ant", "Cnt", "Dec", "Pos", "Tea"], ["Ant", "Dec", "Pos", "Tea"]), familiarity: ["mentalidad", "amplitud", "rol"], effects: {} },
  { id: "tac-defender", es: "Defender sin balón", cat: "tactica", mode: "unidades", parts: ud(["Ant", "Cnt", "Dec", "Pos", "Tea"], ["Ant", "Cmp", "Dec", "OtB", "Tea"], ["Ant", "Dec", "Pos", "Tea"]), familiarity: ["mentalidad", "amplitud", "rol"], effects: {} },
  // --- Portería
  { id: "gk-paradas", es: "Paradas", cat: "porteria", mode: "unidades", parts: gk(["1v1", "Ref", "Ant", "Pos", "Agi"]), familiarity: [], effects: { lesion: 1 } },
  { id: "gk-blocaje", es: "Blocaje", cat: "porteria", mode: "unidades", parts: gk(["Han", "Aer", "Cnt", "Bal"]), familiarity: [], effects: { lesion: 1, condicion: -1 } },
  { id: "gk-1v1", es: "Uno contra uno", cat: "porteria", mode: "unidades", parts: gk(["1v1", "TRO", "Ant", "Dec", "Acc"]), familiarity: [], effects: { lesion: 1, condicion: -1 } },
  { id: "gk-distribucion", es: "Distribución", cat: "porteria", mode: "unidades", parts: gk(["Fir", "Kic", "Pas", "Thr", "Cmp", "Vis"]), familiarity: [], effects: { lesion: 1 } },
  // --- Físico
  { id: "fis-aguante", es: "Aguante", cat: "fisico", mode: "equipo", parts: all(["Sta", "Nat", "Wor"]), familiarity: [], effects: { felicidad: -1, lesion: 1, condicion: -1, fatiga: 2 } },
  { id: "fis-resistencia", es: "Resistencia", cat: "fisico", mode: "equipo", parts: all(["Bal", "Jum", "Str", "Wor", "Aer"]), familiarity: [], effects: { lesion: 1, fatiga: 1 }, note: "Es la sesión de gimnasio (fuerza), no la de resistencia aeróbica, que se llama Aguante." },
  { id: "fis-rapidez", es: "Rapidez", cat: "fisico", mode: "equipo", parts: all(["Acc", "Agi", "Pac"]), familiarity: [], effects: { fatiga: 1, lesion: 2, condicion: -2 } },
  { id: "fis-recuperacion", es: "Recuperación", cat: "fisico", mode: "equipo", parts: all([]), familiarity: [], effects: { lesion: -2, fatiga: -1, condicion: 1, felicidad: 1, ritmo: -1 } },
  { id: "fis-descanso", es: "Dar descanso", cat: "fisico", mode: "equipo", parts: all([]), familiarity: [], effects: { fatiga: -2, condicion: 1, felicidad: 1, cohesion: -1, ritmo: -2 } },
  // --- Balón parado
  { id: "bp-penaltis", es: "Penaltis", cat: "balon-parado", mode: "equipo", parts: [{ group: "lanzadores", pct: 60, attrs: ["Pen", "Cmp"] }, { group: "resto", pct: 20, attrs: ["Pen", "Cmp"] }, { group: "porteros", pct: 20, attrs: ["Ref", "Ant", "Dec"] }], familiarity: [], effects: { lesion: 1 } },
  { id: "bp-rutinas", es: "Rutinas de jugadas a balón parado", cat: "balon-parado", mode: "equipo", parts: [{ group: "lanzadores", pct: 60, attrs: ["Fre", "Cor", "L Th", "Tec"] }, { group: "resto", pct: 20, attrs: ["Hea", "Mar", "Ant", "Cnt", "OtB", "Pos"] }, { group: "porteros", pct: 20, attrs: ["Cmd", "Han", "Ant", "Cnt", "Dec", "Pos"] }], familiarity: [], effects: { felicidad: -1, lesion: 1 } },
  // --- Preparación de partido
  { id: "prep-tacticas", es: "Tácticas de partido", cat: "preparacion", mode: "equipo", parts: all(["Dec", "Tea"]), familiarity: ALL_FAM, effects: { cohesion: 1 } },
  { id: "prep-practica", es: "Práctica de partido", cat: "preparacion", mode: "equipo", parts: all("roles"), familiarity: ALL_FAM, effects: { felicidad: 2, cohesion: 2, ritmo: 1, fatiga: 1, lesion: 2, condicion: -2 } },
  { id: "prep-enfoque", es: "Enfoque del partido", cat: "preparacion", mode: "equipo", parts: all([]), familiarity: ALL_FAM, effects: {}, auto: true, note: "Lo añade el juego solo en la víspera de cada partido." },
  { id: "prep-revision", es: "Revisión de partido", cat: "preparacion", mode: "equipo", parts: all([]), familiarity: ALL_FAM, effects: { cohesion: 1 }, note: "Solo se puede poner el día después del partido." },
  // --- Extracurricular
  { id: "ext-comunidad", es: "Compromiso con la comunidad", cat: "extracurricular", mode: "equipo", parts: all(["Tea"]), familiarity: [], effects: { cohesion: 1, condicion: -1 } },
  { id: "ext-cohesion", es: "Cohesión equipo", cat: "extracurricular", mode: "equipo", parts: all(["Tea"]), familiarity: [], effects: { felicidad: 2, cohesion: 1, fatiga: -1 } },
  // --- Lo pone el juego
  { id: "viaje", es: "Viaje", cat: "partido", mode: "equipo", parts: [], familiarity: [], effects: {}, auto: true, note: "Partido fuera: el juego ocupa este hueco con el viaje." },
];

export const SESSION_BY_ID: Record<string, Session> = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));

/** Carga física de una sesión (0 = nada): suma riesgo de lesión, fatiga y bajada de condición. */
export function sessionLoad(s: Session): number {
  const e = s.effects;
  return Math.max(0, e.lesion ?? 0) + Math.max(0, e.fatiga ?? 0) + Math.max(0, -(e.condicion ?? 0));
}

/** Sesiones que se pueden elegir (no las que pone el juego). */
export const PICKABLE = SESSIONS.filter((s) => !s.auto);
