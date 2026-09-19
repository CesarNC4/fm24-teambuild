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
  /** Cabeceras posibles en la exportación (EN + ES). */
  aliases: string[];
}

export const ATTRIBUTES = [
  // --- Técnicos (jugadores de campo) ---
  { key: "Cor", group: "tecnico", es: "Saques de esquina", en: "Corners", aliases: ["Cor", "Cór", "Esq", "S. Esq"] },
  { key: "Cro", group: "tecnico", es: "Centros", en: "Crossing", aliases: ["Cro", "Cen"] },
  { key: "Dri", group: "tecnico", es: "Regate", en: "Dribbling", aliases: ["Dri", "Reg"] },
  { key: "Fin", group: "tecnico", es: "Remate", en: "Finishing", aliases: ["Fin", "Rem"] },
  { key: "Fir", group: "tecnico", es: "Primer toque", en: "First Touch", aliases: ["Fir", "Pri", "1er T", "Ctr"] },
  { key: "Fre", group: "tecnico", es: "Faltas", en: "Free Kick Taking", aliases: ["Fre", "Lib", "Fal"] },
  { key: "Hea", group: "tecnico", es: "Cabeceo", en: "Heading", aliases: ["Hea", "Cab"] },
  { key: "Lon", group: "tecnico", es: "Tiros lejanos", en: "Long Shots", aliases: ["Lon", "Lej", "Tir"] },
  { key: "L Th", group: "tecnico", es: "Saques de banda largos", en: "Long Throws", aliases: ["L Th", "Sq L", "Ban", "S. Ban"] },
  { key: "Mar", group: "tecnico", es: "Marcaje", en: "Marking", aliases: ["Mar"] },
  { key: "Pas", group: "tecnico", es: "Pases", en: "Passing", aliases: ["Pas"] },
  { key: "Pen", group: "tecnico", es: "Penaltis", en: "Penalty Taking", aliases: ["Pen"] },
  { key: "Tck", group: "tecnico", es: "Entradas", en: "Tackling", aliases: ["Tck", "Ent"] },
  { key: "Tec", group: "tecnico", es: "Técnica", en: "Technique", aliases: ["Tec", "Téc"] },

  // --- Mentales ---
  { key: "Agg", group: "mental", es: "Agresividad", en: "Aggression", aliases: ["Agg", "Agr"] },
  { key: "Ant", group: "mental", es: "Anticipación", en: "Anticipation", aliases: ["Ant"] },
  { key: "Bra", group: "mental", es: "Valentía", en: "Bravery", aliases: ["Bra", "Val"] },
  { key: "Cmp", group: "mental", es: "Serenidad", en: "Composure", aliases: ["Cmp", "Ser"] },
  { key: "Cnt", group: "mental", es: "Concentración", en: "Concentration", aliases: ["Cnt", "Con", "Cnc"] },
  { key: "Dec", group: "mental", es: "Decisiones", en: "Decisions", aliases: ["Dec"] },
  { key: "Det", group: "mental", es: "Determinación", en: "Determination", aliases: ["Det"] },
  { key: "Fla", group: "mental", es: "Talento", en: "Flair", aliases: ["Fla", "Tal"] },
  { key: "Ldr", group: "mental", es: "Liderazgo", en: "Leadership", aliases: ["Ldr", "Lid"] },
  { key: "OtB", group: "mental", es: "Desmarques", en: "Off the Ball", aliases: ["OtB", "Dmq", "Des", "Dsm"] },
  { key: "Pos", group: "mental", es: "Colocación", en: "Positioning", aliases: ["Pos", "Col"] },
  { key: "Tea", group: "mental", es: "Trabajo en equipo", en: "Teamwork", aliases: ["Tea", "JEq", "T. Eq", "TEq"] },
  { key: "Vis", group: "mental", es: "Visión", en: "Vision", aliases: ["Vis"] },
  { key: "Wor", group: "mental", es: "Sacrificio", en: "Work Rate", aliases: ["Wor", "Sac"] },

  // --- Físicos ---
  { key: "Acc", group: "fisico", es: "Aceleración", en: "Acceleration", aliases: ["Acc", "Ace"] },
  { key: "Agi", group: "fisico", es: "Agilidad", en: "Agility", aliases: ["Agi"] },
  { key: "Bal", group: "fisico", es: "Equilibrio", en: "Balance", aliases: ["Bal", "Equ", "Eql"] },
  { key: "Jum", group: "fisico", es: "Salto", en: "Jumping Reach", aliases: ["Jum", "Sal", "Slt"] },
  { key: "Nat", group: "fisico", es: "Forma física natural", en: "Natural Fitness", aliases: ["Nat", "Fís", "For", "FFN"] },
  { key: "Pac", group: "fisico", es: "Velocidad", en: "Pace", aliases: ["Pac", "Vel"] },
  { key: "Sta", group: "fisico", es: "Resistencia", en: "Stamina", aliases: ["Sta", "Res"] },
  { key: "Str", group: "fisico", es: "Fuerza", en: "Strength", aliases: ["Str", "Fue"] },

  // --- Portero ---
  { key: "Aer", group: "portero", es: "Alcance aéreo", en: "Aerial Reach", aliases: ["Aer", "Aér", "Alc"] },
  { key: "Cmd", group: "portero", es: "Dominio del área", en: "Command of Area", aliases: ["Cmd", "Mdo", "Dom"] },
  { key: "Com", group: "portero", es: "Comunicación", en: "Communication", aliases: ["Com"] },
  { key: "Ecc", group: "portero", es: "Excentricidad", en: "Eccentricity", aliases: ["Ecc", "Exc"] },
  { key: "Han", group: "portero", es: "Blocaje", en: "Handling", aliases: ["Han", "Blo"] },
  { key: "Kic", group: "portero", es: "Saque de puerta", en: "Kicking", aliases: ["Kic", "Pue", "S. Pue"] },
  { key: "1v1", group: "portero", es: "Uno contra uno", en: "One on Ones", aliases: ["1v1", "1c1"] },
  { key: "Pun", group: "portero", es: "Puños", en: "Punching (Tendency)", aliases: ["Pun", "Puñ"] },
  { key: "Ref", group: "portero", es: "Reflejos", en: "Reflexes", aliases: ["Ref"] },
  { key: "TRO", group: "portero", es: "Salidas", en: "Rushing Out (Tendency)", aliases: ["TRO", "Sal", "Sld"] },
  { key: "Thr", group: "portero", es: "Saques de mano", en: "Throwing", aliases: ["Thr", "Saq", "Man", "S. Man"] },
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
