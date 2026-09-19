/**
 * Instrucciones de equipo de FM24 y estilos predefinidos.
 *
 * Cada instrucción declara qué jugadores del XI le afectan (por posición) y
 * qué atributos necesita. El "encaje" es la media de esos atributos en los
 * titulares: sirve para ver si la plantilla puede ejecutar la instrucción.
 */

import type { AttrKey } from "./attributes";
import type { LineupResult } from "./tactics";
import type { PositionSlot } from "./types";

export type InstructionPhase = "posesion" | "transicion" | "sin-balon";

/** Grupo de exclusión: solo una instrucción activa por grupo. */
export type InstructionGroup =
  | "pases" | "ritmo" | "amplitud" | "creatividad" | "regate" | "centros"
  | "desmarque-izq" | "desmarque-der" | "explotar"
  | "trans-def" | "trans-atq" | "distribucion" | "gk-tipo" | "gk-destino"
  | "linea-def" | "linea-presion" | "presion" | "marcaje" | "entradas" | "anchura-def"
  | null;

export interface Requirement {
  /** Posiciones del XI afectadas. Vacío = todos los jugadores de campo. */
  positions: PositionSlot[];
  attrs: AttrKey[];
  /** Descripción corta de por qué. */
  why: string;
}

export interface Instruction {
  id: string;
  name: string;
  phase: InstructionPhase;
  group: InstructionGroup;
  /** Requisitos; vacío = no depende de atributos. */
  reqs: Requirement[];
}

const DEF: PositionSlot[] = ["DC", "DL", "DR", "WBL", "WBR"];
const CB: PositionSlot[] = ["DC"];
const MID: PositionSlot[] = ["DM", "MC", "ML", "MR"];
const ATT: PositionSlot[] = ["AMC", "AML", "AMR", "ST"];
const WIDE: PositionSlot[] = ["ML", "MR", "AML", "AMR", "WBL", "WBR", "DL", "DR"];
const CREATORS: PositionSlot[] = ["DM", "MC", "AMC", "AML", "AMR"];
const GK: PositionSlot[] = ["GK"];

export const INSTRUCTIONS: Instruction[] = [
  // ------------------------------------------------------------- Con balón
  { id: "pases-cortos", name: "Pases más cortos", phase: "posesion", group: "pases",
    reqs: [{ positions: [], attrs: ["Pas", "Fir", "Tec", "Tea"], why: "todo el equipo debe combinar con fiabilidad" }] },
  { id: "pases-directos", name: "Pases más directos", phase: "posesion", group: "pases",
    reqs: [
      { positions: [...DEF, ...MID], attrs: ["Pas", "Vis", "Dec"], why: "quien saca el balón debe encontrar el pase largo" },
      { positions: ATT, attrs: ["Pac", "Acc", "OtB", "Ant"], why: "los atacantes deben ganar la carrera al espacio" },
    ] },
  { id: "ritmo-bajo", name: "Ritmo más bajo", phase: "posesion", group: "ritmo",
    reqs: [{ positions: [], attrs: ["Cmp", "Dec", "Pas"], why: "controlar el balón sin precipitarse" }] },
  { id: "ritmo-alto", name: "Ritmo más alto", phase: "posesion", group: "ritmo",
    reqs: [{ positions: [], attrs: ["Dec", "Fir", "Tec", "Cmp"], why: "decidir y ejecutar rápido bajo presión" }] },
  { id: "amplitud-estrecha", name: "Juego más estrecho", phase: "posesion", group: "amplitud",
    reqs: [{ positions: [...CREATORS, "ST"], attrs: ["Fir", "Tec", "Pas", "Agi", "Cmp"], why: "combinar en espacios reducidos" }] },
  { id: "amplitud-amplia", name: "Juego más amplio", phase: "posesion", group: "amplitud",
    reqs: [{ positions: WIDE, attrs: ["Cro", "Sta", "Wor"], why: "los jugadores de banda estiran el campo y centran" }] },
  { id: "pasar-espacio", name: "Pasar al espacio", phase: "posesion", group: null,
    reqs: [
      { positions: ATT, attrs: ["Pac", "Acc", "OtB", "Ant"], why: "hay que atacar el espacio antes de que se cierre" },
      { positions: CREATORS, attrs: ["Vis", "Pas", "Ant"], why: "ver el desmarque y servirlo a tiempo" },
    ] },
  { id: "salir-jugando", name: "Salir jugando desde atrás", phase: "posesion", group: null,
    reqs: [
      { positions: CB, attrs: ["Pas", "Fir", "Cmp", "Tec", "Dec"], why: "los centrales inician bajo presión" },
      { positions: GK, attrs: ["Kic", "Cmp", "Fir", "Pas"], why: "el portero participa con el pie" },
    ] },
  { id: "trabajar-area", name: "Trabajar el balón hasta el área", phase: "posesion", group: null,
    reqs: [{ positions: ["MC", "AMC", "AML", "AMR"], attrs: ["Pas", "Tec", "Dec", "Cmp", "Vis"], why: "paciencia y calidad en el último tercio" }] },
  { id: "centros-tempranos", name: "Centros tempranos", phase: "posesion", group: null,
    reqs: [
      { positions: WIDE, attrs: ["Cro", "Tec"], why: "centros de calidad desde posiciones profundas" },
      { positions: ["ST"], attrs: ["Hea", "Jum", "Str", "OtB"], why: "hay que rematar de cabeza en el área" },
    ] },
  { id: "encarar", name: "Encarar la defensa", phase: "posesion", group: "regate",
    reqs: [{ positions: ["AML", "AMR", "AMC", "ML", "MR", "ST"], attrs: ["Dri", "Acc", "Agi", "Fla", "Bal"], why: "regateadores que rompan líneas" }] },
  { id: "regatear-menos", name: "Regatear menos", phase: "posesion", group: "regate",
    reqs: [{ positions: [], attrs: ["Pas", "Fir", "Tea", "Dec"], why: "si no se regatea hay que mover el balón rápido y bien" }] },
  { id: "tirar-minima", name: "Tirar a la mínima", phase: "posesion", group: null,
    reqs: [{ positions: [...ATT, "MC"], attrs: ["Lon", "Tec", "Fin"], why: "tiros desde fuera con buen porcentaje" }] },
  { id: "mas-creatividad", name: "Más creatividad", phase: "posesion", group: "creatividad",
    reqs: [{ positions: ATT, attrs: ["Fla", "Vis", "Tec", "Dec"], why: "libertad para improvisar sin desordenarse" }] },
  { id: "mas-disciplina", name: "Más disciplina", phase: "posesion", group: "creatividad",
    reqs: [{ positions: [], attrs: ["Tea", "Dec", "Pos", "Cnt"], why: "cumplir el plan sin salirse del guion" }] },
  { id: "desmarque-fuera-izq", name: "Desmarque por fuera (izquierda)", phase: "posesion", group: "desmarque-izq",
    reqs: [{ positions: ["DL", "WBL"], attrs: ["OtB", "Sta", "Cro", "Acc"], why: "el lateral izquierdo dobla por fuera y centra" }] },
  { id: "desmarque-dentro-izq", name: "Desmarque por dentro (izquierda)", phase: "posesion", group: "desmarque-izq",
    reqs: [{ positions: ["DL", "WBL"], attrs: ["OtB", "Pas", "Dec", "Fir"], why: "el lateral izquierdo entra por el pasillo interior" }] },
  { id: "desmarque-fuera-der", name: "Desmarque por fuera (derecha)", phase: "posesion", group: "desmarque-der",
    reqs: [{ positions: ["DR", "WBR"], attrs: ["OtB", "Sta", "Cro", "Acc"], why: "el lateral derecho dobla por fuera y centra" }] },
  { id: "desmarque-dentro-der", name: "Desmarque por dentro (derecha)", phase: "posesion", group: "desmarque-der",
    reqs: [{ positions: ["DR", "WBR"], attrs: ["OtB", "Pas", "Dec", "Fir"], why: "el lateral derecho entra por el pasillo interior" }] },
  { id: "explotar-izq", name: "Explotar la banda izquierda", phase: "posesion", group: null,
    reqs: [{ positions: ["DL", "WBL", "ML", "AML"], attrs: ["Cro", "Dri", "Acc", "Dec"], why: "los de esa banda serán más directos" }] },
  { id: "explotar-der", name: "Explotar la banda derecha", phase: "posesion", group: null,
    reqs: [{ positions: ["DR", "WBR", "MR", "AMR"], attrs: ["Cro", "Dri", "Acc", "Dec"], why: "los de esa banda serán más directos" }] },
  { id: "explotar-centro", name: "Explotar el centro", phase: "posesion", group: "explotar",
    reqs: [{ positions: ["DM", "MC", "AMC", "ST"], attrs: ["Pas", "Fir", "Vis", "OtB", "Dec"], why: "los del centro serán más directos; las bandas, más pasivas" }] },
  { id: "centros-mixtos", name: "Centros mixtos", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST", "AMC"], attrs: ["Hea", "Jum", "OtB", "Acc"], why: "rematadores buenos por arriba y por abajo" }] },
  { id: "centros-rasos", name: "Centros rasos", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST", "AMC", "MC"], attrs: ["Acc", "OtB", "Fin", "Ant"], why: "delantero rápido y llegadores al borde del área (recortes atrás)" }] },
  { id: "centros-rosca", name: "Centros con rosca", phase: "posesion", group: "centros",
    reqs: [{ positions: WIDE, attrs: ["Cro", "Tec"], why: "centros rápidos y con efecto: el centrador debe ser muy bueno" }] },
  { id: "centros-colgados", name: "Centros colgados", phase: "posesion", group: "centros",
    reqs: [{ positions: ["ST"], attrs: ["Hea", "Jum", "Str"], why: "el balón llega sin fuerza; el delantero debe ganar el duelo aéreo" }] },
  { id: "balon-parado", name: "Jugar para el balón parado", phase: "posesion", group: null,
    reqs: [{ positions: CB, attrs: ["Hea", "Jum", "Str"], why: "los centrales suben a rematar córners y faltas" }] },
  { id: "perder-tiempo", name: "Perder tiempo", phase: "posesion", group: null, reqs: [] },

  // ------------------------------------------------------------- Transición
  { id: "contrapresionar", name: "Contrapresionar", phase: "transicion", group: "trans-def",
    reqs: [{ positions: [...MID, ...ATT], attrs: ["Wor", "Sta", "Agg", "Tea", "Ant"], why: "recuperar el balón nada más perderlo exige piernas y actitud" }] },
  { id: "reagruparse", name: "Reagruparse", phase: "transicion", group: "trans-def",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Dec", "Tea", "Cnt", "Pac"], why: "volver rápido y ordenado a la posición" }] },
  { id: "contraatacar", name: "Contraatacar", phase: "transicion", group: "trans-atq",
    reqs: [{ positions: [...ATT, "ML", "MR"], attrs: ["Pac", "Acc", "OtB", "Dri", "Dec"], why: "correr al espacio y decidir bien con pocos apoyos" }] },
  { id: "mantener-forma", name: "Mantener la forma", phase: "transicion", group: "trans-atq",
    reqs: [{ positions: [], attrs: ["Pos", "Tea", "Cnt", "Dec"], why: "conservar la estructura al recuperar el balón" }] },
  { id: "distribuir-rapido", name: "Distribuir rápidamente (portero)", phase: "transicion", group: "distribucion",
    reqs: [{ positions: GK, attrs: ["Thr", "Kic", "Vis", "Dec"], why: "el portero lanza el contragolpe" }] },
  { id: "distribuir-lento", name: "Distribuir con calma (portero)", phase: "transicion", group: "distribucion",
    reqs: [{ positions: GK, attrs: ["Cmp", "Kic", "Pas", "Dec"], why: "el portero inicia con criterio y sin regalar el balón" }] },
  { id: "gk-rodar", name: "Portero: rodar el balón", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Cnt", "Dec"], why: "para porteros con mal pie o mal saque de mano pero concentrados" }] },
  { id: "gk-saque-corto", name: "Portero: saque corto", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Kic", "Pas"], why: "buen saque de puerta y pases" }] },
  { id: "gk-mano-largo", name: "Portero: saque de mano largo", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Thr", "Vis"], why: "buen saque de mano y visión" }] },
  { id: "gk-saque-largo", name: "Portero: saque largo", phase: "transicion", group: "gk-tipo",
    reqs: [{ positions: GK, attrs: ["Kic", "Vis"], why: "buen saque de puerta y visión" }] },
  { id: "gk-a-defensas", name: "Portero: distribuir a los defensas", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: CB, attrs: ["Fir", "Pas", "Cmp"], why: "los centrales reciben bajo presión" }] },
  { id: "gk-por-encima", name: "Portero: distribuir por encima de la defensa", phase: "transicion", group: "gk-destino",
    reqs: [
      { positions: GK, attrs: ["Kic", "Vis"], why: "saque largo preciso" },
      { positions: ["ST"], attrs: ["Acc", "Pac", "OtB"], why: "el delantero debe ganar la carrera; funciona contra líneas altas" },
    ] },
  { id: "gk-al-referencia", name: "Portero: distribuir al delantero referencia", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["ST"], attrs: ["Hea", "Jum", "Str", "Fir"], why: "el referencia aguanta y descarga; salta el medio campo" }] },
  { id: "gk-a-bandas", name: "Portero: distribuir a las bandas", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["ML", "MR", "AML", "AMR", "WBL", "WBR"], attrs: ["Fir", "Dri", "Hea", "Str"], why: "los de banda deben retener el balón contra su par" }] },
  { id: "gk-al-organizador", name: "Portero: distribuir al organizador", phase: "transicion", group: "gk-destino",
    reqs: [{ positions: ["DM", "MC"], attrs: ["Fir", "Pas", "Cmp", "Vis"], why: "el organizador más retrasado inicia; riesgo si le hacen marcaje al hombre" }] },

  // ------------------------------------------------------------- Sin balón
  { id: "linea-def-baja", name: "Línea defensiva más baja", phase: "sin-balon", group: "linea-def",
    reqs: [{ positions: CB, attrs: ["Hea", "Jum", "Mar", "Pos", "Str"], why: "defender el área ante centros y balones largos" }] },
  { id: "linea-def-alta", name: "Línea defensiva más alta", phase: "sin-balon", group: "linea-def",
    reqs: [
      { positions: DEF, attrs: ["Pac", "Acc", "Ant", "Pos", "Cnt"], why: "hay mucho espacio a la espalda" },
      { positions: GK, attrs: ["TRO", "1v1", "Acc", "Ant"], why: "el portero debe salir a cubrir" },
    ] },
  { id: "linea-presion-baja", name: "Línea de presión baja", phase: "sin-balon", group: "linea-presion",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Cnt", "Mar", "Hea", "Bra"], why: "defender muchos minutos cerca del área propia" }] },
  { id: "linea-presion-media", name: "Línea de presión media", phase: "sin-balon", group: "linea-presion",
    reqs: [{ positions: [...MID, ...ATT], attrs: ["Pos", "Tea", "Wor", "Ant"], why: "bloque compacto en el medio campo" }] },
  { id: "linea-presion-alta", name: "Línea de presión alta", phase: "sin-balon", group: "linea-presion",
    reqs: [{ positions: ATT, attrs: ["Wor", "Sta", "Tea", "Agg", "Ant"], why: "los atacantes lideran la presión" }] },
  { id: "presionar-menos", name: "Presionar con menos frecuencia", phase: "sin-balon", group: "presion",
    reqs: [{ positions: [], attrs: ["Pos", "Cnt", "Ant", "Mar"], why: "esperar bien colocado en lugar de saltar" }] },
  { id: "presionar-mas", name: "Presionar con más frecuencia", phase: "sin-balon", group: "presion",
    reqs: [{ positions: [], attrs: ["Wor", "Sta", "Tea", "Agg"], why: "todo el equipo corre más" }] },
  { id: "impedir-saque-corto", name: "Impedir el saque corto", phase: "sin-balon", group: null,
    reqs: [{ positions: ATT, attrs: ["Wor", "Ant", "Acc"], why: "presión coordinada sobre el portero rival" }] },
  { id: "fuera-de-juego", name: "Trampa del fuera de juego", phase: "sin-balon", group: null,
    reqs: [{ positions: CB, attrs: ["Pos", "Ant", "Cnt", "Tea", "Pac"], why: "coordinación y concentración; un fallo es gol" }] },
  { id: "marcaje-estricto", name: "Marcaje más estricto", phase: "sin-balon", group: "marcaje",
    reqs: [{ positions: DEF, attrs: ["Mar", "Str", "Pos", "Ant"], why: "duelos individuales" }] },
  { id: "entradas-duras", name: "Entradas más duras", phase: "sin-balon", group: "entradas",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Tck", "Agg", "Bra", "Dec"], why: "agresividad sin regalar faltas" }] },
  { id: "anchura-def-estrecha", name: "Anchura defensiva más estrecha", phase: "sin-balon", group: "anchura-def",
    reqs: [{ positions: [...CB, "DL", "DR", "WBL", "WBR"], attrs: ["Hea", "Jum", "Mar", "Str"], why: "llegarán más centros: la zaga debe ganar por arriba" }] },
  { id: "anchura-def-amplia", name: "Anchura defensiva más amplia", phase: "sin-balon", group: "anchura-def",
    reqs: [{ positions: [...CB, "DL", "DR", "WBL", "WBR"], attrs: ["Pac", "Agi", "Ant", "Pos"], why: "se cubre la banda con movilidad e inteligencia; el centro queda menos poblado" }] },
  { id: "mantenerse-pie", name: "Mantenerse de pie", phase: "sin-balon", group: "entradas",
    reqs: [{ positions: [...DEF, ...MID], attrs: ["Pos", "Ant", "Cnt", "Mar"], why: "contener sin ir al suelo" }] },
];

export const INSTRUCTION_BY_ID: Record<string, Instruction> = Object.fromEntries(INSTRUCTIONS.map((i) => [i.id, i]));

export const PHASE_LABEL: Record<InstructionPhase, string> = {
  posesion: "Con balón",
  transicion: "Transición",
  "sin-balon": "Sin balón",
};

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
  { id: "cauta", name: "Cauta", level: -1, idea: "Juega por el espacio: niega al rival y ataca los espacios que deja." },
  { id: "equilibrada", name: "Equilibrada", level: 0, idea: "Juega por la posesión sin riesgo, o arriesga solo para recuperarla." },
  { id: "positiva", name: "Positiva", level: 1, idea: "Control: juega por la posesión, accede a espacios pequeños y se la niega al rival." },
  { id: "atacante", name: "Atacante", level: 2, idea: "Asume que la posesión está asegurada y busca crear muchas ocasiones." },
  { id: "muy-atacante", name: "Muy atacante", level: 3, idea: "Sacrifica toda la posesión por la oportunidad (desbordar)." },
];

export const MENTALITY_BY_ID: Record<string, Mentality> = Object.fromEntries(MENTALITIES.map((m) => [m.id, m]));

/** Lo que sube o baja la mentalidad, según la guía: sirve de recordatorio en la UI. */
export const MENTALITY_EFFECTS = {
  up: ["amplitud", "distancia de pase y ritmo", "intensidad de presión", "líneas defensivas", "marcaje y riesgo en entradas", "creatividad, libertad y pases arriesgados", "carreras y regates", "velocidad de contrapresión y contraataque", "riesgo en la distribución del portero"],
  down: ["amplitud", "distancia de pase y ritmo", "intensidad de presión", "líneas defensivas", "disciplina, colocación y pase seguro ↑", "carreras y regates ↓", "defensa pasiva negando espacio ↑", "velocidad de reagrupamiento ↑", "contraataques ↓"],
};

// ---------------------------------------------------------------------------
// Estilos predefinidos
// ---------------------------------------------------------------------------

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  mentality: string;
  /** id de MENTALITIES */
  mentalityId: string;
  instructions: string[];
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "transiciones",
    name: "Transiciones rápidas",
    description: "Recuperar y atacar el espacio en pocos pases. Presión media-alta, ritmo alto y verticalidad.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "encarar", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-presion-media", "presionar-mas"],
  },
  {
    id: "gegenpress",
    name: "Gegenpress",
    description: "Presión asfixiante arriba, línea alta y recuperación inmediata. Exige mucho físico.",
    mentality: "Positiva / Atacante", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "salir-jugando", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-alta", "linea-presion-alta", "presionar-mas", "impedir-saque-corto", "fuera-de-juego"],
  },
  {
    id: "posesion",
    name: "Control de posesión",
    description: "Dominar con el balón, ritmo bajo y paciencia en el último tercio.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-bajo", "amplitud-amplia", "salir-jugando", "trabajar-area", "contrapresionar", "mantener-forma", "distribuir-lento", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
  },
  {
    id: "tiki-vertical",
    name: "Tiki-taka vertical",
    description: "Pases cortos pero a ritmo alto buscando siempre el espacio.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "pasar-espacio", "salir-jugando", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
  },
  {
    id: "bloque-bajo",
    name: "Bloque bajo y contragolpe",
    description: "Defender compacto cerca del área y salir rápido al espacio.",
    mentality: "Cauta / Equilibrada", mentalityId: "cauta",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "reagruparse", "contraatacar", "distribuir-rapido", "linea-def-baja", "linea-presion-baja", "presionar-menos", "marcaje-estricto"],
  },
  {
    id: "directo",
    name: "Juego directo por bandas",
    description: "Balón largo al referencia, centros tempranos y segundas jugadas.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-directos", "amplitud-amplia", "centros-tempranos", "reagruparse", "mantener-forma", "linea-def-baja", "linea-presion-media", "entradas-duras"],
  },
];

export const STYLE_BY_ID: Record<string, StylePreset> = Object.fromEntries(STYLE_PRESETS.map((s) => [s.id, s]));

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
