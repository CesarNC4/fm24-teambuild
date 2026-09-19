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
  /** Nombre del preset del juego (guía de estilos de Passion4FM). */
  en: string;
  description: string;
  mentality: string;
  /** id de MENTALITIES */
  mentalityId: string;
  instructions: string[];
  /** Rasgos del estilo que usan los avisos y las instrucciones individuales. */
  traits: { possession: boolean; pressing: boolean; counter: boolean; deep: boolean };
  /** Formaciones recomendadas (ids de FORMATIONS). */
  formations: string[];
  /** Atributos clave por unidad para medir el encaje con la plantilla. */
  attrs: { def: AttrKey[]; mid: AttrKey[]; att: AttrKey[] };
  /** Códigos de rol (sin deber) que el estilo pide y que le sientan mal. */
  roles: { favor: string[]; avoid: string[] };
  strengths: string[];
  weaknesses: string[];
  when: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "transiciones",
    name: "Transiciones rápidas",
    en: "Fast transitions (custom)",
    description: "Recuperar en bloque medio-alto y atacar el espacio en pocos pases. Ritmo alto, verticalidad y contrapresión.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "encarar", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-presion-media", "presionar-mas"],
    traits: { possession: false, pressing: true, counter: true, deep: false },
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-4-2", "3-4-2-1"],
    attrs: { def: ["Pac", "Acc", "Ant", "Pos", "Pas"], mid: ["Wor", "Sta", "Dec", "Pas", "OtB"], att: ["Pac", "Acc", "OtB", "Fin", "Dri"] },
    roles: { favor: ["AF", "PF", "IF", "IW", "B2B", "BWM", "SV", "CWB", "BPD"], avoid: ["L", "TQ", "EG", "RPM", "NCB"] },
    strengths: ["Castiga a rivales que se estiran", "Mucha ocasión clara con pocos pases", "No exige dominar la posesión"],
    weaknesses: ["Sufre ante bloques bajos que no dejan espacio", "Exige velocidad y decisión arriba", "Contrapresión + ritmo alto cansa"],
    when: "Plantillas rápidas y verticales que no necesitan el balón para dominar.",
  },
  {
    id: "gegenpress",
    name: "Gegenpress",
    en: "Gegenpress",
    description: "Presión asfixiante e inmediata tras pérdida, línea alta y pases progresivos cortos. Muy exigente físicamente.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "salir-jugando", "mas-creatividad", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-alta", "linea-presion-alta", "presionar-mas", "impedir-saque-corto", "fuera-de-juego"],
    traits: { possession: false, pressing: true, counter: true, deep: false },
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-3-3-flat", "4-2-4"],
    attrs: { def: ["Pac", "Acc", "Ant", "Pos", "Agg"], mid: ["Wor", "Sta", "Agg", "Ant", "Pas"], att: ["Wor", "Acc", "Agg", "OtB", "Sta"] },
    roles: { favor: ["BWM", "PF", "IF", "IW", "CWB", "BPD", "SK"], avoid: ["A", "L", "NCB", "TQ", "EG", "HB"] },
    strengths: ["Recupera cerca de la portería rival", "Fuerza errores y domina el ritmo", "Genera confianza y momento"],
    weaknesses: ["Muy exigente física y mentalmente (edad ideal 21-28)", "Si superan la presión, campo abierto atrás", "Hay que gestionar la fatiga toda la temporada"],
    when: "Plantillas atléticas y agresivas; equipos que quieren imponer el ritmo. Máximo un organizador en el medio.",
  },
  {
    id: "tiki-taka",
    name: "Tiki-taka",
    en: "Tiki-Taka",
    description: "Posesión extrema: pases muy cortos a ritmo bajo, sistema estrecho y presión altísima. El balón defiende.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-bajo", "amplitud-estrecha", "salir-jugando", "regatear-menos", "trabajar-area", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "linea-def-alta", "linea-presion-alta", "presionar-mas", "impedir-saque-corto"],
    traits: { possession: true, pressing: true, counter: false, deep: false },
    formations: ["4-3-3-dm", "4-3-3-flat", "4-2-3-1-dm", "3-4-3"],
    attrs: { def: ["Pas", "Fir", "Tec", "Cmp", "Dec"], mid: ["Pas", "Fir", "Tec", "Vis", "Dec"], att: ["Fir", "Tec", "OtB", "Ant", "Agi"] },
    roles: { favor: ["RPM", "DLP", "AP", "F9", "CF", "BPD", "WB", "CWB"], avoid: ["NCB", "TF", "WTF", "NFB", "L"] },
    strengths: ["Superioridad numérica con balón", "Agota al rival persiguiendo", "Triángulos y espacios por movimiento"],
    weaknesses: ["Sufre contra bloques bajos", "Línea altísima expuesta al contra", "Exige jugadores técnicos de élite y mucha familiaridad"],
    when: "Clubes grandes con plantilla muy técnica y tiempo para asimilar la táctica.",
  },
  {
    id: "tiki-vertical",
    name: "Tiki-taka vertical",
    en: "Vertical Tiki-Taka",
    description: "Pases cortos pero a ritmo alto, buscando el espacio y el pasillo interior. Cada pase tiene intención.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-cortos", "ritmo-alto", "pasar-espacio", "salir-jugando", "desmarque-dentro-izq", "desmarque-dentro-der", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
    traits: { possession: true, pressing: true, counter: true, deep: false },
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-1-4-1", "4-1-2-1-2"],
    attrs: { def: ["Pas", "Tec", "Dec", "Pos", "Acc"], mid: ["Pas", "Tec", "Vis", "Dec", "Acc"], att: ["Acc", "Pac", "Dri", "OtB", "Ant"] },
    roles: { favor: ["SV", "MEZ", "B2B", "AF", "IF", "IW", "DLP", "AP"], avoid: ["NCB", "TF", "A", "L", "WTF"] },
    strengths: ["Domina la posesión sin ser previsible", "Terceros hombres y medios espacios", "Ritmo alto que no deja respirar"],
    weaknesses: ["El ritmo alto pierde balones en zonas peligrosas", "Línea alta vulnerable si superan la presión", "Exige buenos decisores"],
    when: "Plantillas técnicas y rápidas que quieren dominar sin obsesionarse con la posesión.",
  },
  {
    id: "posesion",
    name: "Control de posesión",
    en: "Control Possession",
    description: "Posesión paciente con bloque medio-alto; controla el ritmo sin la presión extrema del tiki-taka.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-cortos", "ritmo-bajo", "amplitud-amplia", "salir-jugando", "trabajar-area", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "linea-def-alta", "linea-presion-media", "presionar-mas"],
    traits: { possession: true, pressing: true, counter: false, deep: false },
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "5-2-3", "3-4-3"],
    attrs: { def: ["Pas", "Fir", "Tec", "Cmp", "Dec"], mid: ["Pas", "Fir", "Vis", "Dec", "Ant"], att: ["Fir", "Tec", "Cmp", "OtB", "Agi"] },
    roles: { favor: ["SK", "DLP", "AP", "RPM", "DLF", "CF", "BPD"], avoid: ["NCB", "WTF", "L"] },
    strengths: ["Controla el ritmo y el movimiento rival", "Sirve a equipos sin técnica de élite", "Sin vulnerabilidades extremas"],
    weaknesses: ["Deja más espacio a la espalda que el tiki-taka", "Previsible contra bloques bajos", "Necesita familiaridad táctica"],
    when: "Equipos de media tabla o que equilibran ambición y realidad; al menos un organizador en el medio.",
  },
  {
    id: "contra-fluido",
    name: "Contraataque fluido",
    en: "Fluid Counter-Attack",
    description: "Salida elaborada y bloque medio, con contras rápidos y conducciones cuando hay espacio.",
    mentality: "Cauta", mentalityId: "cauta",
    instructions: ["encarar", "pasar-espacio", "reagruparse", "contraatacar", "distribuir-rapido", "linea-presion-media"],
    traits: { possession: false, pressing: false, counter: true, deep: false },
    formations: ["3-4-2-1", "3-4-3", "4-3-3-dm", "4-2-3-1-dm", "5-2-3", "5-3-2"],
    attrs: { def: ["Pas", "Pos", "Dec", "Pac", "Tec"], mid: ["Pas", "Tec", "Dri", "Wor", "Dec"], att: ["Pac", "Acc", "Dri", "Agi", "OtB"] },
    roles: { favor: ["B2B", "CAR", "MEZ", "BPD", "WB", "IF", "W", "AF"], avoid: ["TQ", "EG", "RPM", "L", "A"] },
    strengths: ["Equilibra ataque y defensa", "Ocasiones en transición sin perder compacidad", "Flexible ante cualquier rival"],
    weaknesses: ["Puede parecer reactivo", "Riesgo de desconexión entre fases", "Domina menos que la posesión"],
    when: "Contra rivales algo mejores, para proteger ventajas con forma, o equipos de media tabla.",
  },
  {
    id: "bloque-bajo",
    name: "Contragolpe directo",
    en: "Direct Counter-Attack",
    description: "Bloque bajo y compacto, sin contrapresión, y salida directa al espacio en cuanto se recupera.",
    mentality: "Cauta", mentalityId: "cauta",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "reagruparse", "contraatacar", "distribuir-rapido", "linea-def-baja", "linea-presion-baja", "presionar-menos", "marcaje-estricto"],
    traits: { possession: false, pressing: false, counter: true, deep: true },
    formations: ["4-4-2", "5-3-2", "4-3-1-2", "3-4-2-1", "4-4-1-1"],
    attrs: { def: ["Pos", "Cnt", "Mar", "Hea", "Str"], mid: ["Wor", "Pos", "Tck", "Pas", "Dec"], att: ["Pac", "Acc", "OtB", "Fin", "Dri"] },
    roles: { favor: ["NCB", "CD", "GK", "BWM", "SV", "DLF", "AF", "P", "IW", "TF"], avoid: ["L", "RPM", "TQ", "EG", "AP", "SK", "CWB"] },
    strengths: ["Organización y compacidad", "Explota el espacio a la espalda de líneas altas", "Exige poca técnica; buena para plantillas inferiores"],
    weaknesses: ["Renuncia a la iniciativa", "Sufre contra equipos pacientes", "Depende de acertar con pocas ocasiones y del balón parado"],
    when: "Plantillas inferiores, recién ascendidos, últimos minutos con ventaja o contra dominadores de la posesión.",
  },
  {
    id: "route-one",
    name: "Balón largo (Route one)",
    en: "Route One",
    description: "Saltar el medio campo con balones largos al referencia y centros tempranos; segundas jugadas y balón parado.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-directos", "ritmo-alto", "amplitud-amplia", "centros-tempranos", "gk-saque-largo", "gk-al-referencia", "reagruparse", "mantener-forma", "linea-def-baja", "linea-presion-media"],
    traits: { possession: false, pressing: false, counter: false, deep: true },
    formations: ["5-3-2", "4-4-2", "4-4-1-1", "4-1-4-1", "4-2-4"],
    attrs: { def: ["Hea", "Str", "Pos", "Jum", "Pas"], mid: ["Wor", "Tea", "Pos", "Sta", "Hea"], att: ["Hea", "Jum", "Str", "Fin", "Bra"] },
    roles: { favor: ["TF", "WTF", "PF", "DW", "WM", "NCB", "FB", "GK"], avoid: ["DLP", "AP", "RPM", "EG", "TQ", "F9", "L", "REG", "IW", "IF"] },
    strengths: ["Mínima exigencia técnica", "Salta medios campos organizados y presiones altas", "Aprovecha ventaja física y aérea"],
    weaknesses: ["Previsible y con poca creatividad", "Sufre ante defensas compactas", "Depende del balón parado"],
    when: "Equipos técnicamente inferiores, recién ascendidos, contra presiones altas o en los últimos minutos.",
  },
  {
    id: "bandas",
    name: "Juego por bandas",
    en: "Wing Play",
    description: "Estirar al rival por fuera con laterales que doblan y extremos que centran a un delantero alto.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-directos", "ritmo-alto", "amplitud-amplia", "pasar-espacio", "centros-tempranos", "desmarque-fuera-izq", "desmarque-fuera-der", "gk-a-bandas", "reagruparse", "contraatacar", "linea-presion-media"],
    traits: { possession: false, pressing: false, counter: true, deep: false },
    formations: ["4-4-2", "5-3-2", "4-3-3-flat", "4-2-3-1-mc", "4-2-4"],
    attrs: { def: ["Cro", "Pac", "Sta", "Wor", "Pos"], mid: ["Cro", "Dri", "Pac", "OtB", "Wor"], att: ["Hea", "Jum", "Str", "OtB", "Fin"] },
    roles: { favor: ["TF", "CF", "AF", "DLF", "PF", "W", "WB", "CWB", "FB", "MEZ", "WM"], avoid: ["IW", "IF", "WP", "NFB", "IWB", "NCB", "F9"] },
    strengths: ["Estira la defensa horizontalmente", "Usa la velocidad por fuera", "Eficaz contra defensas cerradas por dentro"],
    weaknesses: ["Previsible (todo por fuera)", "Depende de la calidad de los centros", "Poca creatividad central"],
    when: "Delantero alto y extremos rápidos que centran bien; contra defensas estrechas.",
  },
  {
    id: "autobus",
    name: "Autobús (Park the bus)",
    en: "Park the Bus",
    description: "Defensa extrema: bloque bajo, compacto y sin prisa. Solo para situaciones concretas, no toda la temporada.",
    mentality: "Defensiva", mentalityId: "defensiva",
    instructions: ["ritmo-bajo", "perder-tiempo", "reagruparse", "mantener-forma", "linea-def-baja", "linea-presion-baja", "presionar-menos", "anchura-def-estrecha", "marcaje-estricto"],
    traits: { possession: false, pressing: false, counter: false, deep: true },
    formations: ["4-1-4-1", "5-3-2", "4-4-1-1", "4-4-2"],
    attrs: { def: ["Mar", "Tck", "Pos", "Cnt", "Hea"], mid: ["Wor", "Pos", "Tck", "Tea", "Sta"], att: ["Wor", "Str", "Hea", "Pac", "Bra"] },
    roles: { favor: ["CD", "FB", "DW", "DM", "A", "HB", "DLP", "PF", "P", "DLF"], avoid: ["TQ", "EG", "RPM", "CWB", "AP", "SK", "L", "MEZ"] },
    strengths: ["Organización defensiva máxima", "Rompe el ritmo rival", "Protege resultados al final"],
    weaknesses: ["Totalmente reactivo", "Sufre contra equipos pacientes", "Feo y desmoralizante a la larga"],
    when: "Proteger un resultado en el tramo final, permanencia o rivales muy superiores. Deberes de defender atrás y máximo un organizador.",
  },
  {
    id: "catenaccio",
    name: "Catenaccio",
    en: "Catenaccio",
    description: "Superioridad numérica atrás con líbero, defensa zonal disciplinada y contras directos con carrileros que suben.",
    mentality: "Defensiva", mentalityId: "defensiva",
    instructions: ["pases-directos", "mas-disciplina", "reagruparse", "contraatacar", "distribuir-rapido", "linea-def-baja", "linea-presion-baja", "presionar-menos", "marcaje-estricto"],
    traits: { possession: false, pressing: false, counter: true, deep: true },
    formations: ["5-3-2", "3-4-2-1", "3-4-3", "4-4-2", "4-3-1-2"],
    attrs: { def: ["Pos", "Mar", "Ant", "Cnt", "Dec"], mid: ["Wor", "Pos", "Pas", "Tck", "Tea"], att: ["Pac", "OtB", "Fin", "Str", "Ant"] },
    roles: { favor: ["L", "WCB", "NCB", "CD", "WB", "CWB", "REG", "BWM", "PF", "TF", "AF"], avoid: ["TQ", "EG", "AP", "HB", "SK", "RPM"] },
    strengths: ["El líbero tapa el espacio entre defensa y portero", "Frustra al rival con defensa disciplinada", "Contras con espacio por delante"],
    weaknesses: ["Necesita un líbero de verdad", "Muchos empates y fútbol aburrido", "Poca ambición ofensiva"],
    when: "Buscar solidez ante dominadores de la posesión, ligas de muchos empates o divisiones bajas.",
  },
];

/** Rasgos de un estilo; sin estilo (instrucciones a medida) todo es false. */
export function styleTraits(styleId: string | null | undefined): StylePreset["traits"] {
  return STYLE_BY_ID[styleId ?? ""]?.traits ?? { possession: false, pressing: false, counter: false, deep: false };
}

export const STYLE_BY_ID: Record<string, StylePreset> = Object.fromEntries(STYLE_PRESETS.map((s) => [s.id, s]));
// Id antiguo de "Juego directo por bandas" en tácticas ya guardadas.
STYLE_BY_ID.directo = STYLE_BY_ID.bandas;

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
