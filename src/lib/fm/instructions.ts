/**
 * Instrucciones de equipo de FM24 (con los nombres reales del juego en
 * español) y mentalidades. Los estilos viven en `stylePresets.ts` y se
 * reexportan desde aquí.
 *
 * Cada instrucción declara qué jugadores del XI le afectan (por posición) y
 * qué atributos necesita. El "encaje" es la media de esos atributos en los
 * titulares: sirve para ver si la plantilla puede ejecutar la instrucción.
 *
 * Los deslizadores del juego (pases, ritmo, amplitud, perder tiempo, línea
 * defensiva, activar presión) se modelan como grupos de exclusión con un
 * `level` de -2 a 2 (el estándar es no tener ninguna activa).
 */

import type { AttrKey } from "./attributes";
import { SPECIALIST_BY_ID, specialistIndex } from "./specialists";
import type { LineupResult } from "./tactics";
import type { PositionSlot } from "./types";

export { STYLE_PRESETS, STYLE_BY_ID, STYLES_BY_FAMILY, FAMILY_LABEL, MOTOR_LABEL, COMMON_LEVERS, styleTraits, styleLevers, styleChildren, profileOf } from "./stylePresets";
export type { StylePreset, StyleFamily, StyleProfile, StyleTraits, Lever, EvolutionReq, SignatureRole, MotorRating } from "./stylePresets";

export type InstructionPhase = "posesion" | "transicion" | "sin-balon";

/** Grupo de exclusión: solo una instrucción activa por grupo. */
export type InstructionGroup =
  | "pases" | "ritmo" | "amplitud" | "perder-tiempo" | "creatividad" | "regate" | "centros"
  | "desmarque-izq" | "desmarque-der" | "explotar"
  | "trans-def" | "trans-atq" | "distribucion" | "gk-tipo" | "gk-destino"
  | "linea-def" | "linea-presion" | "presion" | "linea-ajuste" | "estilo-presion" | "entradas" | "centros-def"
  | null;

/** Grupos que en el juego son un deslizador (el estándar es no marcar nada). */
export const AXIS_GROUPS: Partial<Record<NonNullable<InstructionGroup>, string>> = {
  pases: "Pases directos",
  ritmo: "Ritmo de juego",
  amplitud: "Amplitud del ataque",
  "perder-tiempo": "Perder tiempo",
  "linea-def": "Línea defensiva",
  "linea-presion": "Línea de presión",
  presion: "Activar presión",
};

/** Grupos de dos o más opciones excluyentes que no son deslizador. */
export const CHOICE_GROUPS: Partial<Record<NonNullable<InstructionGroup>, string>> = {
  creatividad: "Libertad creativa",
  regate: "Regate",
  centros: "Tipo de centro",
  "desmarque-izq": "Doblar (izquierda)",
  "desmarque-der": "Doblar (derecha)",
  explotar: "Enfocar el juego",
  "trans-def": "Al perder el balón",
  "trans-atq": "Al recuperar el balón",
  distribucion: "Ritmo del portero",
  "gk-tipo": "Tipo de saque",
  "gk-destino": "Distribuir a",
  "linea-ajuste": "Ajuste de la línea",
  "estilo-presion": "Estilo de presión",
  entradas: "Entradas",
  "centros-def": "Compromiso con los centros",
};

export interface Requirement {
  /** Posiciones del XI afectadas. Vacío = todos los jugadores de campo. */
  positions: PositionSlot[];
  attrs: AttrKey[];
  /** Descripción corta de por qué. */
  why: string;
  /** Índice de especialista (specialists.ts) que mide el requisito en lugar de la media simple de `attrs`. */
  index?: string;
}

export interface Instruction {
  id: string;
  name: string;
  phase: InstructionPhase;
  group: InstructionGroup;
  /** Posición en el deslizador (-2 … 2) para los grupos de AXIS_GROUPS. */
  level?: number;
  /** Etiqueta corta dentro de su grupo (deslizadores y opciones). */
  short?: string;
  /** Requisitos; vacío = no depende de atributos. */
  reqs: Requirement[];
}

const DEF: PositionSlot[] = ["DC", "DL", "DR", "WBL", "WBR"];
const CB: PositionSlot[] = ["DC"];
const BACKS: PositionSlot[] = ["DL", "DR", "WBL", "WBR"];
const MID: PositionSlot[] = ["DM", "MC", "ML", "MR"];
const ATT: PositionSlot[] = ["AMC", "AML", "AMR", "ST"];
const WIDE: PositionSlot[] = ["ML", "MR", "AML", "AMR", "WBL", "WBR", "DL", "DR"];
const CREATORS: PositionSlot[] = ["DM", "MC", "AMC", "AML", "AMR"];
const GK: PositionSlot[] = ["GK"];

const SHORT_REQ = [{ positions: [] as PositionSlot[], attrs: ["Pas", "Fir", "Tec", "Tea"] as AttrKey[], why: "todo el equipo debe combinar con fiabilidad" }];
const DIRECT_REQ = [
  { positions: [...DEF, ...MID], attrs: ["Pas", "Vis", "Dec"] as AttrKey[], why: "quien saca el balón debe encontrar el pase largo" },
  { positions: ATT, attrs: ["Pac", "Acc", "OtB", "Ant"] as AttrKey[], why: "los atacantes deben ganar la carrera al espacio" },
];
const HIGH_LINE_REQ = [
  { positions: DEF, attrs: ["Pac", "Acc", "Ant", "Pos", "Cnt"] as AttrKey[], why: "hay mucho espacio a la espalda" },
  { positions: GK, attrs: ["TRO", "1v1", "Acc", "Ant"] as AttrKey[], why: "el portero debe salir a cubrir" },
];
const MUCH_HIGHER_LINE_REQ = [
  { positions: DEF, attrs: ["Pos", "Pac", "Dec", "Ant", "Cnt"] as AttrKey[], why: "hay mucho espacio a la espalda", index: "ti-high-line" },
  HIGH_LINE_REQ[1],
];

export const INSTRUCTIONS: Instruction[] = [
  // ------------------------------------------------------------- Con posesión
  { id: "pases-mucho-mas-cortos", name: "Pases mucho más cortos", short: "Mucho más cortos", phase: "posesion", group: "pases", level: -2, reqs: SHORT_REQ },
  { id: "pases-cortos", name: "Pases más cortos", short: "Más cortos", phase: "posesion", group: "pases", level: -1, reqs: SHORT_REQ },
  { id: "pases-directos", name: "Pases más directos", short: "Más directos", phase: "posesion", group: "pases", level: 1, reqs: DIRECT_REQ },
  { id: "pases-mucho-mas-directos", name: "Pases mucho más directos", short: "Mucho más directos", phase: "posesion", group: "pases", level: 2, reqs: DIRECT_REQ },
  { id: "ritmo-mucho-mas-bajo", name: "Ritmo mucho más bajo", short: "Mucho más bajo", phase: "posesion", group: "ritmo", level: -2,
    reqs: [{ positions: [], attrs: ["Cmp", "Dec", "Pas"], why: "controlar el balón sin precipitarse" }] },
  { id: "ritmo-bajo", name: "Ritmo más bajo", short: "Más bajo", phase: "posesion", group: "ritmo", level: -1,
    reqs: [{ positions: [], attrs: ["Cmp", "Dec", "Pas"], why: "controlar el balón sin precipitarse" }] },
  { id: "ritmo-alto", name: "Ritmo más alto", short: "Más alto", phase: "posesion", group: "ritmo", level: 1,
    reqs: [{ positions: [], attrs: ["Dec", "Ant", "Tec", "Sta", "Acc", "Fir", "Vis"], why: "decidir y ejecutar rápido bajo presión", index: "ti-tempo" }] },
  { id: "ritmo-mucho-mas-alto", name: "Ritmo mucho más alto", short: "Mucho más alto", phase: "posesion", group: "ritmo", level: 2,
    reqs: [{ positions: [], attrs: ["Dec", "Ant", "Tec", "Sta", "Acc", "Fir", "Vis"], why: "decidir y ejecutar muy rápido durante 90 minutos", index: "ti-tempo" }] },
  { id: "amplitud-muy-estrecha", name: "Amplitud del ataque: muy estrecha", short: "Muy estrecha", phase: "posesion", group: "amplitud", level: -2,
    reqs: [{ positions: [...CREATORS, "ST"], attrs: ["Fir", "Tec", "Pas", "Agi", "Cmp"], why: "combinar en espacios muy reducidos" }] },
  { id: "amplitud-estrecha", name: "Amplitud del ataque: bastante estrecha", short: "Bastante estrecha", phase: "posesion", group: "amplitud", level: -1,
    reqs: [{ positions: [...CREATORS, "ST"], attrs: ["Fir", "Tec", "Pas", "Agi", "Cmp"], why: "combinar en espacios reducidos" }] },
  { id: "amplitud-amplia", name: "Amplitud del ataque: bastante amplia", short: "Bastante amplia", phase: "posesion", group: "amplitud", level: 1,
    reqs: [{ positions: WIDE, attrs: ["Cro", "Sta", "Wor"], why: "los jugadores de banda estiran el campo y centran" }] },
  { id: "amplitud-muy-amplia", name: "Amplitud del ataque: muy amplia", short: "Muy amplia", phase: "posesion", group: "amplitud", level: 2,
    reqs: [{ positions: WIDE, attrs: ["Cro", "Sta", "Wor", "Pac"], why: "los de banda pegados a la cal: mucho campo que recorrer" }] },
  { id: "perder-tiempo-nunca", name: "Perder tiempo: nunca", short: "Nunca", phase: "posesion", group: "perder-tiempo", level: -2, reqs: [] },
  { id: "perder-tiempo-poco", name: "Perder tiempo: rara vez", short: "Rara vez", phase: "posesion", group: "perder-tiempo", level: -1, reqs: [] },
  { id: "perder-tiempo", name: "Perder tiempo: a menudo", short: "A menudo", phase: "posesion", group: "perder-tiempo", level: 1, reqs: [] },
  { id: "perder-tiempo-mucho", name: "Perder tiempo: con frecuencia", short: "Con frecuencia", phase: "posesion", group: "perder-tiempo", level: 2, reqs: [] },
  { id: "pasar-espacio", name: "Pasar al espacio", phase: "posesion", group: null,
    reqs: [
      { positions: ATT, attrs: ["Pac", "Acc", "OtB", "Ant"], why: "hay que atacar el espacio antes de que se cierre" },
      { positions: CREATORS, attrs: ["Vis", "Pas", "Ant"], why: "ver el desmarque y servirlo a tiempo" },
    ] },
  { id: "salir-jugando", name: "Salir jugando desde la defensa", phase: "posesion", group: null,
    reqs: [
      { positions: CB, attrs: ["Pas", "Fir", "Cmp", "Tec", "Dec"], why: "los centrales inician bajo presión" },
      { positions: GK, attrs: ["Kic", "Cmp", "Fir", "Pas"], why: "el portero participa con el pie" },
    ] },
  { id: "trabajar-area", name: "Intentar llevar el balón hasta el área", phase: "posesion", group: null,
    reqs: [{ positions: ["MC", "AMC", "AML", "AMR"], attrs: ["Dec", "Tec", "Cmp", "Pas", "Vis"], why: "paciencia y calidad en el último tercio", index: "ti-box" }] },
  { id: "centros-tempranos", name: "Hacer centros rápidos", phase: "posesion", group: null,
    reqs: [
      { positions: WIDE, attrs: ["Cro", "Tec"], why: "centros de calidad desde posiciones profundas" },
      { positions: ["ST"], attrs: ["Hea", "Jum", "Str", "OtB"], why: "hay que rematar de cabeza en el área" },
    ] },
  { id: "encarar", name: "Encarar a la defensa", short: "Encarar a la defensa", phase: "posesion", group: "regate",
    reqs: [{ positions: ["AML", "AMR", "AMC", "ML", "MR", "ST"], attrs: ["Dri", "Acc", "Agi", "Fla", "Bal"], why: "regateadores que rompan líneas" }] },
  { id: "regatear-menos", name: "Regatear menos", short: "Regatear menos", phase: "posesion", group: "regate",
    reqs: [{ positions: [], attrs: ["Pas", "Fir", "Tea", "Dec"], why: "si no se regatea hay que mover el balón rápido y bien" }] },
  { id: "tirar-minima", name: "Disparar cuando se pueda", phase: "posesion", group: null,
    reqs: [{ positions: [...ATT, "MC"], attrs: ["Lon", "Tec", "Fin"], why: "tiros desde fuera con buen porcentaje" }] },
  { id: "mas-creatividad", name: "Ser más expresivos", short: "Más expresivos", phase: "posesion", group: "creatividad",
    reqs: [{ positions: ATT, attrs: ["Fla", "Tec", "Vis", "Dec"], why: "libertad para improvisar sin desordenarse", index: "ti-expressive" }] },
  { id: "mas-disciplina", name: "Ser más disciplinados", short: "Más disciplinados", phase: "posesion", group: "creatividad",
    reqs: [{ positions: [], attrs: ["Tea", "Dec", "Pos", "Cnt"], why: "cumplir el plan sin salirse del guion" }] },
  { id: "desmarque-fuera-izq", name: "Doblar por la izquierda", short: "Por fuera", phase: "posesion", group: "desmarque-izq",
    reqs: [{ positions: ["DL", "WBL"], attrs: ["OtB", "Sta", "Cro", "Acc"], why: "el lateral izquierdo dobla por fuera y centra" }] },
  { id: "desmarque-dentro-izq", name: "Doblar por dentro a la izquierda", short: "Por dentro", phase: "posesion", group: "desmarque-izq",
    reqs: [{ positions: ["DL", "WBL"], attrs: ["OtB", "Pas", "Dec", "Fir"], why: "el lateral izquierdo entra por el pasillo interior" }] },
  { id: "desmarque-fuera-der", name: "Doblar por la derecha", short: "Por fuera", phase: "posesion", group: "desmarque-der",
    reqs: [{ positions: ["DR", "WBR"], attrs: ["OtB", "Sta", "Cro", "Acc"], why: "el lateral derecho dobla por fuera y centra" }] },
  { id: "desmarque-dentro-der", name: "Doblar por dentro a la derecha", short: "Por dentro", phase: "posesion", group: "desmarque-der",
    reqs: [{ positions: ["DR", "WBR"], attrs: ["OtB", "Pas", "Dec", "Fir"], why: "el lateral derecho entra por el pasillo interior" }] },
  { id: "explotar-izq", name: "Enfocar el juego por la izquierda", short: "Izquierda", phase: "posesion", group: "explotar",
    reqs: [{ positions: ["DL", "WBL", "ML", "AML"], attrs: ["Cro", "Dri", "Acc", "Dec"], why: "los de esa banda serán más directos" }] },
  { id: "explotar-der", name: "Enfocar el juego por la derecha", short: "Derecha", phase: "posesion", group: "explotar",
    reqs: [{ positions: ["DR", "WBR", "MR", "AMR"], attrs: ["Cro", "Dri", "Acc", "Dec"], why: "los de esa banda serán más directos" }] },
  { id: "explotar-centro", name: "Enfocar el juego por el centro", short: "Centro", phase: "posesion", group: "explotar",
    reqs: [{ positions: ["DM", "MC", "AMC", "ST"], attrs: ["Pas", "Fir", "Vis", "OtB", "Dec"], why: "los del centro serán más directos; las bandas, más pasivas" }] },
  { id: "explotar-bandas", name: "Enfocar el juego por ambas bandas", short: "Ambas bandas", phase: "posesion", group: "explotar",
    reqs: [{ positions: WIDE, attrs: ["Cro", "Dri", "Acc", "Sta"], why: "los de banda cargan con el juego" }] },
  { id: "centros-mixtos", name: "Centros variados", short: "Variados", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST", "AMC"], attrs: ["Hea", "Jum", "OtB", "Acc"], why: "rematadores buenos por arriba y por abajo" }] },
  { id: "centros-rasos", name: "Centros rasos", short: "Rasos", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST", "AMC", "MC"], attrs: ["Acc", "OtB", "Fin", "Ant"], why: "delantero rápido y llegadores al borde del área (recortes atrás)" }] },
  { id: "centros-rosca", name: "Centros con rosca", short: "Con rosca", phase: "posesion", group: "centros",
    reqs: [{ positions: WIDE, attrs: ["Cro", "Tec"], why: "centros rápidos y con efecto: el centrador debe ser muy bueno" }] },
  { id: "centros-colgados", name: "Centros colgados", short: "Colgados", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST"], attrs: ["Hea", "Jum", "Str"], why: "el balón llega sin fuerza; el delantero debe ganar el duelo aéreo" }] },
  { id: "balon-parado", name: "Buscar balón parado", phase: "posesion", group: null,
    reqs: [{ positions: CB, attrs: ["Hea", "Jum", "Str"], why: "los centrales suben a rematar córners y faltas" }] },

  // ------------------------------------------------------------- En transición
  { id: "contrapresionar", name: "Contrapresión", short: "Contrapresión", phase: "transicion", group: "trans-def",
    reqs: [{ positions: [...MID, ...ATT], attrs: ["Agg", "Dec", "Ant", "Sta", "Acc", "Bra"], why: "recuperar el balón nada más perderlo exige piernas y actitud", index: "ti-counterpress" }] },
  { id: "reagruparse", name: "Reagruparse", short: "Reagruparse", phase: "transicion", group: "trans-def",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Dec", "Tea", "Cnt", "Pac"], why: "volver rápido y ordenado a la posición" }] },
  { id: "contraatacar", name: "A la contra", short: "A la contra", phase: "transicion", group: "trans-atq",
    reqs: [{ positions: [...ATT, "ML", "MR"], attrs: ["Acc", "Pac", "Ant", "Vis", "Dec", "Pas", "Tec", "Fir"], why: "correr al espacio y decidir bien con pocos apoyos", index: "ti-counter" }] },
  { id: "mantener-forma", name: "Mantener dibujo", short: "Mantener dibujo", phase: "transicion", group: "trans-atq",
    reqs: [{ positions: [], attrs: ["Pos", "Tea", "Cnt", "Dec"], why: "conservar la estructura al recuperar el balón" }] },
  { id: "distribuir-rapido", name: "Distribuir con rapidez", short: "Con rapidez", phase: "transicion", group: "distribucion",
    reqs: [{ positions: GK, attrs: ["Thr", "Kic", "Vis", "Dec"], why: "el portero lanza el contragolpe" }] },
  { id: "distribuir-lento", name: "Ralentizar el juego", short: "Ralentizar", phase: "transicion", group: "distribucion",
    reqs: [{ positions: GK, attrs: ["Cmp", "Kic", "Pas", "Dec"], why: "el portero inicia con criterio y sin regalar el balón" }] },
  { id: "gk-rodar", name: "Portero: pasar con la mano", short: "Pasar con la mano", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Thr", "Cnt", "Dec"], why: "para porteros con mal pie pero concentrados: rodar el balón a un defensa" }] },
  { id: "gk-saque-corto", name: "Portero: jugar en corto", short: "Jugar en corto", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Kic", "Pas"], why: "buen saque de puerta y pases" }] },
  { id: "gk-mano-largo", name: "Portero: lanzar en largo", short: "Lanzar en largo", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Thr", "Vis"], why: "buen saque de mano y visión" }] },
  { id: "gk-saque-largo", name: "Portero: chutar en largo", short: "Chutar en largo", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Kic", "Vis"], why: "buen saque de puerta y visión" }] },
  { id: "gk-a-defensas", name: "Distribuir a los centrales", short: "A los centrales", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: CB, attrs: ["Fir", "Pas", "Cmp"], why: "los centrales reciben bajo presión" }] },
  { id: "gk-a-laterales", name: "Distribuir a los laterales", short: "A los laterales", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: BACKS, attrs: ["Fir", "Pas", "Cmp", "Dec"], why: "los laterales reciben abiertos y sacan el balón por fuera" }] },
  { id: "gk-por-encima", name: "Distribuir por encima de la defensa rival", short: "Por encima de la defensa", phase: "transicion", group: "gk-destino",
    reqs: [
      { positions: GK, attrs: ["Kic", "Vis"], why: "saque largo preciso" },
      { positions: ["ST"], attrs: ["Acc", "Pac", "OtB"], why: "el delantero debe ganar la carrera; funciona contra líneas altas" },
    ] },
  { id: "gk-al-referencia", name: "Distribuir al delantero objetivo", short: "Al delantero objetivo", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["ST"], attrs: ["Hea", "Jum", "Str", "Fir"], why: "el referencia aguanta y descarga; salta el medio campo" }] },
  { id: "gk-a-bandas", name: "Distribuir a las bandas", short: "A las bandas", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["ML", "MR", "AML", "AMR", "WBL", "WBR"], attrs: ["Fir", "Dri", "Hea", "Str"], why: "los de banda deben retener el balón contra su par" }] },
  { id: "gk-al-organizador", name: "Distribuir al organizador", short: "Al organizador", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["DM", "MC"], attrs: ["Fir", "Pas", "Cmp", "Vis"], why: "el organizador más retrasado inicia; riesgo si le hacen marcaje al hombre" }] },

  // ------------------------------------------------------------- Sin posesión
  { id: "linea-def-mucho-mas-baja", name: "Línea defensiva mucho más baja", short: "Mucho más baja", phase: "sin-balon", group: "linea-def", level: -2,
    reqs: [{ positions: CB, attrs: ["Hea", "Jum", "Mar", "Pos", "Str"], why: "defender el área ante centros y balones largos" }] },
  { id: "linea-def-baja", name: "Línea defensiva más baja", short: "Más baja", phase: "sin-balon", group: "linea-def", level: -1,
    reqs: [{ positions: CB, attrs: ["Hea", "Jum", "Mar", "Pos", "Str"], why: "defender el área ante centros y balones largos" }] },
  { id: "linea-def-alta", name: "Línea defensiva más alta", short: "Más alta", phase: "sin-balon", group: "linea-def", level: 1, reqs: HIGH_LINE_REQ },
  { id: "linea-def-mucho-mas-alta", name: "Línea defensiva mucho más alta", short: "Mucho más alta", phase: "sin-balon", group: "linea-def", level: 2, reqs: MUCH_HIGHER_LINE_REQ },
  { id: "linea-presion-baja", name: "Bloque bajo", short: "Bloque bajo", phase: "sin-balon", group: "linea-presion", level: -1,
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Cnt", "Mar", "Hea", "Bra"], why: "defender muchos minutos cerca del área propia" }] },
  { id: "linea-presion-media", name: "Bloque medio", short: "Bloque medio", phase: "sin-balon", group: "linea-presion", level: 0,
    reqs: [{ positions: [...MID, ...ATT], attrs: ["Pos", "Tea", "Wor", "Ant"], why: "bloque compacto en el medio campo" }] },
  { id: "linea-presion-alta", name: "Bloque alto", short: "Bloque alto", phase: "sin-balon", group: "linea-presion", level: 1,
    reqs: [{ positions: ATT, attrs: ["Wor", "Sta", "Tea", "Agg", "Ant"], why: "los atacantes lideran la presión" }] },
  { id: "presionar-mucho-menos", name: "Activar presión: mucho menos", short: "Mucho menos", phase: "sin-balon", group: "presion", level: -2,
    reqs: [{ positions: [], attrs: ["Pos", "Cnt", "Ant", "Mar"], why: "esperar bien colocado en lugar de saltar" }] },
  { id: "presionar-menos", name: "Activar presión: menos a menudo", short: "Menos", phase: "sin-balon", group: "presion", level: -1,
    reqs: [{ positions: [], attrs: ["Pos", "Cnt", "Ant", "Mar"], why: "esperar bien colocado en lugar de saltar" }] },
  { id: "presionar-mas", name: "Activar presión: más a menudo", short: "Más", phase: "sin-balon", group: "presion", level: 1,
    reqs: [{ positions: [], attrs: ["Wor", "Sta", "Tea", "Agg"], why: "todo el equipo corre más" }] },
  { id: "presionar-mucho-mas", name: "Activar presión: mucho más", short: "Mucho más", phase: "sin-balon", group: "presion", level: 2,
    reqs: [{ positions: [], attrs: ["Wor", "Sta", "Tea", "Agg", "Dec"], why: "todo el equipo salta a cada balón: piernas y cabeza" }] },
  { id: "impedir-saque-corto", name: "Evitar pases en corto del portero", phase: "sin-balon", group: null,
    reqs: [{ positions: ATT, attrs: ["Wor", "Ant", "Acc"], why: "presión coordinada sobre el portero rival" }] },
  { id: "adelantarse-mas", name: "Adelantarse más", short: "Adelantarse más", phase: "sin-balon", group: "linea-ajuste",
    reqs: [{ positions: CB, attrs: ["Pos", "Ant", "Cnt", "Tea", "Pac"], why: "la línea sube al unísono para dejar en fuera de juego; un fallo es gol" }] },
  { id: "retroceder-mas", name: "Retroceder más", short: "Retroceder más", phase: "sin-balon", group: "linea-ajuste",
    reqs: [{ positions: CB, attrs: ["Pos", "Cnt", "Hea", "Mar", "Dec"], why: "la línea cede metros para no dejar espacio a la espalda" }] },
  { id: "presionar-dentro", name: "Presionar dentro", short: "Dentro", phase: "sin-balon", group: "estilo-presion",
    reqs: [{ positions: ["DM", "MC", "AMC", "ST"], attrs: ["Wor", "Agg", "Ant", "Tck"], why: "se empuja al rival hacia el centro para robar allí" }] },
  { id: "presionar-fuera", name: "Presionar fuera", short: "Fuera", phase: "sin-balon", group: "estilo-presion",
    reqs: [{ positions: WIDE, attrs: ["Wor", "Sta", "Pos", "Tck"], why: "se empuja al rival a la banda, donde los de fuera cierran" }] },
  { id: "entradas-duras", name: "Ser agresivos", short: "Ser agresivos", phase: "sin-balon", group: "entradas",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Tck", "Agg", "Bra", "Dec"], why: "agresividad sin regalar faltas" }] },
  { id: "mantenerse-pie", name: "Mantenerse de pie", short: "Mantenerse de pie", phase: "sin-balon", group: "entradas",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Ant", "Cnt", "Mar"], why: "contener sin ir al suelo" }] },
  { id: "evitar-centros", name: "Evitar centros", short: "Evitar centros", phase: "sin-balon", group: "centros-def",
    reqs: [{ positions: [...CB, ...BACKS], attrs: ["Pac", "Agi", "Ant", "Pos"], why: "se cubre la banda con movilidad e inteligencia; el centro queda menos poblado" }] },
  { id: "permitir-centros", name: "Permitir centros", short: "Permitir centros", phase: "sin-balon", group: "centros-def",
    reqs: [{ positions: [...CB, ...BACKS], attrs: ["Hea", "Jum", "Mar", "Str"], why: "llegarán más centros: la zaga debe ganar por arriba" }] },
];

export const INSTRUCTION_BY_ID: Record<string, Instruction> = Object.fromEntries(INSTRUCTIONS.map((i) => [i.id, i]));

export const PHASE_LABEL: Record<InstructionPhase, string> = {
  posesion: "Con posesión",
  transicion: "En transición",
  "sin-balon": "Sin posesión",
};

/**
 * Ids de instrucciones que ya no existen en FM24 (o que se han renombrado) y
 * su sustituto. null = se elimina (el marcaje estricto es ahora por jugador).
 */
export const LEGACY_INSTRUCTIONS: Record<string, string | null> = {
  "fuera-de-juego": "adelantarse-mas",
  "marcaje-estricto": null,
  "anchura-def-amplia": "evitar-centros",
  "anchura-def-estrecha": "permitir-centros",
};

/** Convierte una lista de instrucciones guardadas a los ids actuales. */
export function migrateInstructions(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const next = id in LEGACY_INSTRUCTIONS ? LEGACY_INSTRUCTIONS[id] : id;
    if (next && INSTRUCTION_BY_ID[next] && !out.includes(next)) out.push(next);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mentalidad
// ---------------------------------------------------------------------------

export interface Mentality {
  id: string;
  name: string;
  /** Qué busca el equipo con esa mentalidad. */
  idea: string;
  /** -3 … +3 */
  level: number;
}

export const MENTALITIES: Mentality[] = [
  { id: "muy-defensiva", name: "Muy defensiva", level: -3, idea: "Sacrifica toda oportunidad para negar al rival (contención)." },
  { id: "defensiva", name: "Defensiva", level: -2, idea: "Asume que no puede disputar la posesión; juega para reducir las ocasiones del rival." },
  { id: "cauta", name: "Cauta", level: -1, idea: "Juega por el espacio: niega al rival y ataca los espacios que deja. Para el contraataque resulta demasiado pasiva en el motor (DarkHorse)." },
  { id: "equilibrada", name: "Equilibrada", level: 0, idea: "Juega por la posesión sin riesgo, o arriesga solo para recuperarla." },
  { id: "positiva", name: "Positiva", level: 1, idea: "Control: juega por la posesión, accede a espacios pequeños y se la niega al rival. La mentalidad del juego de posición." },
  { id: "atacante", name: "Ofensiva", level: 2, idea: "Asume que la posesión está asegurada y busca crear muchas ocasiones. Obliga a atacar el espacio nada más recuperar: la del contraataque directo." },
  { id: "muy-atacante", name: "Muy ofensiva", level: 3, idea: "Sacrifica toda la posesión por la oportunidad (desbordar)." },
];

export const MENTALITY_BY_ID: Record<string, Mentality> = Object.fromEntries(MENTALITIES.map((m) => [m.id, m]));

/** Lo que sube o baja la mentalidad, según la guía: sirve de recordatorio en la UI. */
export const MENTALITY_EFFECTS = {
  up: ["amplitud", "distancia de pase y ritmo", "intensidad de presión", "líneas defensivas", "marcaje y riesgo en entradas", "creatividad, libertad y pases arriesgados", "carreras y regates", "velocidad de contrapresión y contraataque", "riesgo en la distribución del portero"],
  down: ["amplitud", "distancia de pase y ritmo", "intensidad de presión", "líneas defensivas", "disciplina, colocación y pase seguro ↑", "carreras y regates ↓", "defensa pasiva negando espacio ↑", "velocidad de reagrupamiento ↑", "contraataques ↓"],
};

// ---------------------------------------------------------------------------
// Encaje con el XI
// ---------------------------------------------------------------------------

export interface RequirementFit {
  req: Requirement;
  /** Media (1-20) de los atributos requeridos en los jugadores afectados. */
  mean: number | null;
  /** Jugadores afectados con su media individual, de peor a mejor. */
  players: { name: string; mean: number }[];
}

export interface InstructionFit {
  instruction: Instruction;
  /** Peor de las medias de sus requisitos (el eslabón débil manda). */
  mean: number | null;
  reqs: RequirementFit[];
}

export function fitTone(mean: number | null): "elite" | "good" | "ok" | "poor" | "na" {
  if (mean == null) return "na";
  if (mean >= 14.5) return "elite";
  if (mean >= 13) return "good";
  if (mean >= 11.5) return "ok";
  return "poor";
}

export function instructionFit(instr: Instruction, lineup: LineupResult): InstructionFit {
  const reqs: RequirementFit[] = instr.reqs.map((req) => {
    const affected = lineup.slots.filter((s) => s.starter && (req.positions.length === 0 ? s.slot.slot !== "GK" : req.positions.includes(s.slot.slot)));
    const players = affected
      .map((s) => {
        if (req.index && SPECIALIST_BY_ID[req.index]) return { name: s.starter!.player.name, mean: specialistIndex(s.starter!.player, req.index) ?? NaN };
        const vals = req.attrs.map((a) => s.starter!.player.attrs[a]?.value).filter((v): v is number => v != null);
        return { name: s.starter!.player.name, mean: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : NaN };
      })
      .filter((p) => !Number.isNaN(p.mean))
      .sort((a, b) => a.mean - b.mean);
    const mean = players.length ? players.reduce((x, p) => x + p.mean, 0) / players.length : null;
    return { req, mean, players };
  });
  const means = reqs.map((r) => r.mean).filter((m): m is number => m != null);
  return { instruction: instr, mean: means.length ? Math.min(...means) : null, reqs };
}
