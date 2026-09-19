/**
 * Catálogo de atributos de Football Manager 2024.
 *
 * La clave interna (`AttrKey`) es la abreviatura inglesa porque es la que usa
 * toda la comunidad para ponderaciones. `aliases` recoge las cabeceras que el
 * juego puede escribir en la exportación HTML en inglés y en español; el parser
 * las compara sin acentos ni mayúsculas.
 */

export type AttrGroup = "tecnico" | "mental" | "fisico" | "portero";

export interface AttrDef {
  key: AttrKey;
  group: AttrGroup;
  /** Nombre completo en español (como aparece en el juego). */
  es: string;
  /** Nombre completo en inglés. */
  en: string;
  /** Descripción corta (para tooltips). */
  desc?: string;
  /** Cabeceras posibles en la exportación (EN + ES). */
  aliases: string[];
}

export const ATTRIBUTES = [
  // --- Técnicos (jugadores de campo) ---
  { key: "Cor", group: "tecnico", es: "Saques de esquina", en: "Corners", desc: "Precisión en los saques de esquina. Depende de Técnica.", aliases: ["Cor", "Cór", "Esq", "S. Esq"] },
  { key: "Cro", group: "tecnico", es: "Centros", en: "Crossing", desc: "Calidad del centro desde banda. Depende de Técnica y Equilibrio.", aliases: ["Cro", "Cen"] },
  { key: "Dri", group: "tecnico", es: "Regate", en: "Dribbling", desc: "Conducir el balón controlado. Necesita Velocidad, Aceleración, Agilidad y Equilibrio.", aliases: ["Dri", "Reg"] },
  { key: "Fin", group: "tecnico", es: "Remate", en: "Finishing", desc: "Precisión del disparo a puerta. Se apoya en Serenidad y Decisiones.", aliases: ["Fin", "Rem"] },
  { key: "Fir", group: "tecnico", es: "Primer toque", en: "First Touch", desc: "Control del balón al recibirlo. Ligado a Técnica.", aliases: ["Fir", "Pri", "1er T", "Ctr"] },
  { key: "Fre", group: "tecnico", es: "Faltas", en: "Free Kick Taking", desc: "Golpeo de faltas. Ligado a Técnica.", aliases: ["Fre", "Lib", "Fal"] },
  { key: "Hea", group: "tecnico", es: "Cabeceo", en: "Heading", desc: "Juego de cabeza. Necesita Salto, Fuerza y altura.", aliases: ["Hea", "Cab"] },
  { key: "Lon", group: "tecnico", es: "Tiros lejanos", en: "Long Shots", desc: "Calidad del tiro desde fuera del área. Influyen los rasgos.", aliases: ["Lon", "Lej", "Tir"] },
  { key: "L Th", group: "tecnico", es: "Saques de banda largos", en: "Long Throws", desc: "Alcance del saque de banda. Necesita Fuerza.", aliases: ["L Th", "Sq L", "Ban", "S. Ban"] },
  { key: "Mar", group: "tecnico", es: "Marcaje", en: "Marking", desc: "Seguir al rival y no perderlo. Necesita Fuerza, Colocación y Anticipación.", aliases: ["Mar"] },
  { key: "Pas", group: "tecnico", es: "Pases", en: "Passing", desc: "Precisión al encontrar al compañero. Necesita Visión; ligado a Técnica.", aliases: ["Pas"] },
  { key: "Pen", group: "tecnico", es: "Penaltis", en: "Penalty Taking", desc: "Lanzar penaltis. Necesita Remate, Técnica, Serenidad, Concentración y Decisiones.", aliases: ["Pen"] },
  { key: "Tck", group: "tecnico", es: "Entradas", en: "Tackling", desc: "Robar el balón limpiamente. Necesita Colocación y Decisiones.", aliases: ["Tck", "Ent"] },
  { key: "Tec", group: "tecnico", es: "Técnica", en: "Technique", desc: "Refinamiento con el balón; multiplica Pases, Centros, Remate, Tiros lejanos y Faltas.", aliases: ["Tec", "Téc"] },

  // --- Mentales ---
  { key: "Agg", group: "mental", es: "Agresividad", en: "Aggression", desc: "Intensidad con la que juega. Ligada a Determinación y Valentía.", aliases: ["Agg", "Agr"] },
  { key: "Ant", group: "mental", es: "Anticipación", en: "Anticipation", desc: "Leer el juego y reaccionar antes. Crítico en todas las posiciones.", aliases: ["Ant"] },
  { key: "Bra", group: "mental", es: "Valentía", en: "Bravery", desc: "Meterse en situaciones de riesgo. Necesita Agresividad, Decisiones y Determinación.", aliases: ["Bra", "Val"] },
  { key: "Cmp", group: "mental", es: "Serenidad", en: "Composure", desc: "Frialdad bajo presión; mejora la calidad de las decisiones. Crítico en todas las fases.", aliases: ["Cmp", "Ser"] },
  { key: "Cnt", group: "mental", es: "Concentración", en: "Concentration", desc: "Mantener el foco jugada a jugada; determina la regularidad y los errores.", aliases: ["Cnt", "Con", "Cnc"] },
  { key: "Dec", group: "mental", es: "Decisiones", en: "Decisions", desc: "Elegir bien la opción. Crítico en todas las posiciones.", aliases: ["Dec"] },
  { key: "Det", group: "mental", es: "Determinación", en: "Determination", desc: "Hambre por ganar; los jugadores decididos se desarrollan más rápido. Casi no se entrena.", aliases: ["Det"] },
  { key: "Fla", group: "mental", es: "Talento", en: "Flair", desc: "Imprevisibilidad creativa; puede saltarse las instrucciones. Ligado a Desmarques y Visión.", aliases: ["Fla", "Tal"] },
  { key: "Ldr", group: "mental", es: "Liderazgo", en: "Leadership", desc: "Influir positivamente en los compañeros; atributo principal del capitán. Casi no se entrena.", aliases: ["Ldr", "Lid"] },
  { key: "OtB", group: "mental", es: "Desmarques", en: "Off the Ball", desc: "Ofrecerse sin balón. Necesita Decisiones, Anticipación y Aceleración.", aliases: ["OtB", "Dmq", "Des", "Dsm"] },
  { key: "Pos", group: "mental", es: "Colocación", en: "Positioning", desc: "Leer la situación defensiva y colocarse. Ligado a Anticipación, Concentración y Marcaje.", aliases: ["Pos", "Col"] },
  { key: "Tea", group: "mental", es: "Trabajo en equipo", en: "Teamwork", desc: "Seguir instrucciones y ayudar al equipo. Afecta al uso de los rasgos.", aliases: ["Tea", "JEq", "T. Eq", "TEq"] },
  { key: "Vis", group: "mental", es: "Visión", en: "Vision", desc: "Ver la oportunidad antes de que ocurra. Ligada a Técnica y Decisiones.", aliases: ["Vis"] },
  { key: "Wor", group: "mental", es: "Sacrificio", en: "Work Rate", desc: "Esfuerzo mental sostenido. Ligado a Resistencia. Casi no se entrena.", aliases: ["Wor", "Sac"] },

  // --- Físicos ---
  { key: "Acc", group: "fisico", es: "Aceleración", en: "Acceleration", desc: "Alcanzar la velocidad punta desde parado. Ligada a Velocidad.", aliases: ["Acc", "Ace"] },
  { key: "Agi", group: "fisico", es: "Agilidad", en: "Agility", desc: "Arrancar, frenar y cambiar de dirección. Necesita Velocidad, Aceleración y Equilibrio.", aliases: ["Agi"] },
  { key: "Bal", group: "fisico", es: "Equilibrio", en: "Balance", desc: "Mantener el control en movimiento y en los choques. Necesita Fuerza y Agilidad.", aliases: ["Bal", "Equ", "Eql"] },
  { key: "Jum", group: "fisico", es: "Salto", en: "Jumping Reach", desc: "Altura a la que llega en el salto. Influye la estatura.", aliases: ["Jum", "Sal", "Slt"] },
  { key: "Nat", group: "fisico", es: "Forma física natural", en: "Natural Fitness", desc: "Mantener la forma y recuperarse; si es baja, los físicos caen rápido a partir de los 30. Casi no se entrena.", aliases: ["Nat", "Fís", "For", "FFN"] },
  { key: "Pac", group: "fisico", es: "Velocidad", en: "Pace", desc: "Velocidad punta. Necesita Aceleración, Equilibrio, Resistencia y Forma física natural.", aliases: ["Pac", "Vel"] },
  { key: "Sta", group: "fisico", es: "Resistencia", en: "Stamina", desc: "Aguantar el esfuerzo todo el partido. Ligada a Forma física natural.", aliases: ["Sta", "Res"] },
  { key: "Str", group: "fisico", es: "Fuerza", en: "Strength", desc: "Imponerse físicamente. Necesaria para Marcaje, Cabeceo y Saques de banda.", aliases: ["Str", "Fue"] },

  // --- Portero ---
  { key: "Aer", group: "portero", es: "Alcance aéreo", en: "Aerial Reach", desc: "Altura a la que el portero llega a los balones aéreos.", aliases: ["Aer", "Aér", "Alc"] },
  { key: "Cmd", group: "portero", es: "Dominio del área", en: "Command of Area", desc: "Mandar en el área: salir a por centros y organizar la defensa.", aliases: ["Cmd", "Mdo", "Dom"] },
  { key: "Com", group: "portero", es: "Comunicación", en: "Communication", desc: "Hablar con la defensa para mantener la línea y las marcas.", aliases: ["Com"] },
  { key: "Ecc", group: "portero", es: "Excentricidad", en: "Eccentricity", desc: "Tendencia a hacer cosas imprevisibles (salir lejos, regatear). Cuanto más bajo, mejor.", aliases: ["Ecc", "Exc"] },
  { key: "Han", group: "portero", es: "Blocaje", en: "Handling", desc: "Atrapar el balón sin rechazarlo.", aliases: ["Han", "Blo"] },
  { key: "Kic", group: "portero", es: "Saque de puerta", en: "Kicking", desc: "Distancia y precisión del saque con el pie.", aliases: ["Kic", "Pue", "S. Pue"] },
  { key: "1v1", group: "portero", es: "Uno contra uno", en: "One on Ones", desc: "Cerrar el ángulo y ganar el mano a mano con el delantero.", aliases: ["1v1", "1c1"] },
  { key: "Pun", group: "portero", es: "Puños", en: "Punching (Tendency)", desc: "Tendencia a despejar de puños en vez de blocar (tendencia, no calidad).", aliases: ["Pun", "Puñ"] },
  { key: "Ref", group: "portero", es: "Reflejos", en: "Reflexes", desc: "Reacción a disparos cercanos.", aliases: ["Ref"] },
  { key: "TRO", group: "portero", es: "Salidas", en: "Rushing Out (Tendency)", desc: "Tendencia a salir a por balones largos a la espalda de la defensa (tendencia, no calidad).", aliases: ["TRO", "Sal", "Sld"] },
  { key: "Thr", group: "portero", es: "Saques de mano", en: "Throwing", desc: "Distancia y precisión del saque de mano.", aliases: ["Thr", "Saq", "Man", "S. Man"] },
] as const;

export type AttrKey = (typeof ATTRIBUTES)[number]["key"];

export const ATTR_KEYS: AttrKey[] = ATTRIBUTES.map((a) => a.key);

export const ATTR_BY_KEY: Record<AttrKey, AttrDef> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.key, a as unknown as AttrDef]),
) as Record<AttrKey, AttrDef>;

export const OUTFIELD_KEYS = ATTRIBUTES.filter((a) => a.group !== "portero").map((a) => a.key) as AttrKey[];
export const GK_KEYS = ATTRIBUTES.filter((a) => a.group === "portero").map((a) => a.key) as AttrKey[];

export const GROUP_LABEL: Record<AttrGroup, string> = {
  tecnico: "Técnicos",
  mental: "Mentales",
  fisico: "Físicos",
  portero: "Portero",
};

/** Normaliza una cabecera para compararla: sin acentos, minúsculas, sin espacios/puntos. */
export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s.]/g, "");
}
