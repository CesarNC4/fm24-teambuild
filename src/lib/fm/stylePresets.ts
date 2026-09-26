/**
 * Estilos de juego: los presets del juego y los estilos «reales» que los
 * evolucionan (juego de posición, relacionismo, cholismo, escuela Red Bull…).
 *
 * Cada estilo lleva sus instrucciones con los nombres reales de FM24, la
 * familia y el estilo del que evoluciona, los roles-firma, qué hace falta
 * para dar el salto (evolución), las palancas en partido y una nota honesta
 * de cómo rinde en el motor. Fuentes: guía de estilos de Passion4FM, hilos de
 * 04texag (juego de posición FM20/21 y FM24), DarkHorse Tactics, Exeter
 * (posesión en League One), FM Scout (cholismo) y FM Base (relacionismo).
 */

import type { AttrKey } from "./attributes";
import type { PositionSlot } from "./types";

export type StyleFamily = "posesion" | "presion" | "contra" | "directo";
export const FAMILY_LABEL: Record<StyleFamily, string> = {
  posesion: "Posesión",
  presion: "Presión y transiciones",
  contra: "Contraataque y bloque",
  directo: "Directo y bandas",
};

/** Cómo rinde el estilo en el motor de FM24 según las fuentes. */
export type MotorRating = "alto" | "medio" | "medio-cond" | "bajo";
export const MOTOR_LABEL: Record<MotorRating, string> = { alto: "rinde bien", medio: "rinde regular", "medio-cond": "rinde con condiciones", bajo: "rinde mal" };

export interface SignatureRole {
  /** Códigos de rol que valen (uno de ellos). */
  codes: string[];
  label: string;
}

/** Palanca en partido: síntoma → instrucción (o consejo) → efecto. */
export interface Lever {
  symptom: string;
  /** Instrucción a activar (id) o null si es un consejo. */
  instruction: string | null;
  label?: string;
  effect: string;
  /** Instrucciones que conviene quitar al aplicarla. */
  remove?: string[];
}

export type EvolutionReq =
  | { kind: "role"; codes: string[]; min?: number; label: string }
  | { kind: "attr"; positions: PositionSlot[] | "campo" | "xi"; attrs: AttrKey[]; min: number; count?: number; label: string }
  | { kind: "versatile"; min: number; label: string };

/** Instrucción individual que el estilo recomienda a ciertos roles. */
export interface StylePI {
  roles: string[];
  pi: string;
  why: string;
}

export interface StylePreset {
  id: string;
  name: string;
  /** Nombre del preset del juego o del estilo en inglés. */
  en: string;
  description: string;
  mentality: string;
  /** id de MENTALITIES */
  mentalityId: string;
  instructions: string[];
  /** Formaciones recomendadas (ids de FORMATIONS). */
  formations: string[];
  /** Atributos clave por unidad para medir el encaje con la plantilla. */
  attrs: { def: AttrKey[]; mid: AttrKey[]; att: AttrKey[] };
  /** Códigos de rol (sin deber) que el estilo pide y que le sientan mal. */
  roles: { favor: string[]; avoid: string[] };
  strengths: string[];
  weaknesses: string[];
  when: string;
  family: StyleFamily;
  /** Estilo del que evoluciona (id) o null si es raíz. */
  parent: string | null;
  /** Entrenadores / fuentes. */
  origin: string;
  principles: string[];
  /** 0 = no vive de la posesión · 1 = la usa · 2 = es su idea. */
  posesion: 0 | 1 | 2;
  /** Forma con balón. */
  forma: string;
  motor: MotorRating;
  motorNote?: string;
  signature: SignatureRole[];
  /** Roles que sostienen la forma («Mantener posición») y los que la rompen («Variar la posición»). */
  staticRoles?: string[];
  mobileRoles?: string[];
  /** El marcaje al hombre se hace con «Marcajes más férreos» por jugador. */
  manMarking?: boolean;
  /** El bloque cambia según el rival (enlazar con la pestaña Rival). */
  bloqueSegunRival?: boolean;
  pis?: StylePI[];
  levers: Lever[];
  evolution: EvolutionReq[];
}

// ---------------------------------------------------------------------------
// Palancas comunes (04texag + guía de pressing)
// ---------------------------------------------------------------------------

export const COMMON_LEVERS: Lever[] = [
  { symptom: "Posesión ≈ 60 % sin peligro, tiros a puerta normales", instruction: "pasar-espacio", effect: "más balones al tercer hombre; baja la posesión. Si sigue faltando profundidad, A la contra." },
  { symptom: "Posesión alta, muchos tiros lejanos, pocos a puerta", instruction: "trabajar-area", effect: "menos tiros lejanos y centros inútiles, pero frena el juego: solo si vas ganando. Si no, Buscar balón parado.", remove: ["tirar-minima"] },
  { symptom: "Te presionan fuerte y pierdes la posesión", instruction: null, label: "Ritmo +1", effect: "soltar el balón justo antes de que llegue el presionador; sin pasarse, o saltas a tus organizadores. Contra un autobús que no presiona, ritmo mínimo." },
  { symptom: "Muchos pases arriesgados sin necesidad", instruction: null, label: "quitar Ser más expresivos", effect: "«mover al rival, no el balón»", remove: ["mas-creatividad"] },
  { symptom: "Contras que pierden la forma antes de armar el ataque", instruction: "mantener-forma", effect: "sube la posesión; deja que el sistema desmonte al rival", remove: ["contraatacar"] },
  { symptom: "Rompen tu presión con un pase", instruction: "presionar-menos", effect: "gatillo un punto menos, línea un punto más baja y bloque medio", remove: ["presionar-mas", "presionar-mucho-mas"] },
  { symptom: "Rival pasivo que no sale de su campo", instruction: "presionar-mucho-mas", effect: "con Contrapresión y línea más alta: que el error llegue con la presión", remove: ["presionar-menos", "presionar-mucho-menos"] },
  { symptom: "Proteges un resultado", instruction: "reagruparse", effect: "gatillo menos y bloque medio o bajo; nada de correr detrás del balón", remove: ["contrapresionar"] },
  { symptom: "A remolque en el tramo final", instruction: "linea-presion-alta", effect: "Muy ofensiva + bloque alto + gatillo máximo: aceptas la contra", remove: ["linea-presion-baja", "linea-presion-media"] },
  { symptom: "Un organizador rival que aparece en todos los highlights", instruction: null, label: "Oposición: Marcajes más férreos + presionar", effect: "solo si tu marcador tiene Marcaje suficiente; pegado a un extremo con Desmarques 16 y Marcaje 10, le regalas el giro" },
  { symptom: "Tu lateral con «Mantener posición» no lo marcan y su extremo baja a tapar a tu extremo", instruction: null, label: "cambiar deberes en esa banda", effect: "extremo baja a atraer y el Mezzala rompe a la espalda, o lateral a apoyo/ataque: sacrificar algo de defensa preventiva donde el rival no la explota" },
  { symptom: "Estrella cansada o floja pronto", instruction: null, label: "sustituir sin dudar", effect: "«el sistema trabaja a nuestro favor si le dejamos»" },
];

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

const AXIS_STATIC = ["CD", "BPD", "NCB", "WCB", "DM", "A", "HB", "FB", "NFB", "IFB", "W"];

export const STYLE_PRESETS: StylePreset[] = [
  // =========================================================== Presión y transiciones
  {
    id: "transiciones",
    name: "Transiciones rápidas",
    en: "Fast transitions (custom)",
    description: "Recuperar en bloque medio-alto y atacar el espacio en pocos pases. Ritmo alto, verticalidad y contrapresión.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "encarar", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-presion-media", "presionar-mas"],
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-4-2", "3-4-2-1"],
    attrs: { def: ["Pac", "Acc", "Ant", "Pos", "Pas"], mid: ["Wor", "Sta", "Dec", "Pas", "OtB"], att: ["Pac", "Acc", "OtB", "Fin", "Dri"] },
    roles: { favor: ["AF", "PF", "IF", "IW", "B2B", "BWM", "SV", "CWB", "BPD"], avoid: ["L", "TQ", "EG", "RPM", "NCB"] },
    strengths: ["Castiga a rivales que se estiran", "Mucha ocasión clara con pocos pases", "No exige dominar la posesión"],
    weaknesses: ["Sufre ante bloques bajos que no dejan espacio", "Exige velocidad y decisión arriba", "Contrapresión + ritmo alto cansa"],
    when: "Plantillas rápidas y verticales que no necesitan el balón para dominar.",
    family: "presion", parent: null, origin: "Estilo propio (raíz de la familia de presión)",
    principles: ["Recuperar en bloque medio-alto y llegar en pocos pases", "La contrapresión evita que el rival se organice"],
    posesion: 0, forma: "4-2-4", motor: "alto",
    signature: [{ codes: ["AF", "PF"], label: "punta que ataca el espacio" }, { codes: ["IF", "IW"], label: "extremos que entran" }, { codes: ["B2B", "SV", "BWM"], label: "medio que corre" }],
    levers: [],
    evolution: [],
  },
  {
    id: "gegenpress",
    name: "Gegenpress",
    en: "Gegenpress",
    description: "Presión asfixiante e inmediata tras pérdida, línea alta y pases progresivos cortos. Muy exigente físicamente.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "salir-jugando", "mas-creatividad", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-alta", "linea-presion-alta", "presionar-mas", "impedir-saque-corto", "adelantarse-mas"],
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-3-3-flat", "4-2-4"],
    attrs: { def: ["Pac", "Acc", "Ant", "Pos", "Agg"], mid: ["Wor", "Sta", "Agg", "Ant", "Pas"], att: ["Wor", "Acc", "Agg", "OtB", "Sta"] },
    roles: { favor: ["BWM", "PF", "IF", "IW", "CWB", "BPD", "SK"], avoid: ["A", "L", "NCB", "TQ", "EG", "HB"] },
    strengths: ["Recupera cerca de la portería rival", "Fuerza errores y domina el ritmo", "Genera confianza y momento"],
    weaknesses: ["Muy exigente física y mentalmente (edad ideal 21-28)", "Si superan la presión, campo abierto atrás", "Hay que gestionar la fatiga toda la temporada"],
    when: "Plantillas atléticas y agresivas; equipos que quieren imponer el ritmo. Máximo un organizador en el medio.",
    family: "presion", parent: "transiciones", origin: "Klopp (Dortmund, Liverpool) · preset del juego",
    principles: ["Recuperar en los seis segundos siguientes a la pérdida", "Línea alta con Adelantarse más (en FM24 no existe la trampa del fuera de juego)"],
    posesion: 0, forma: "4-3-3 alto", motor: "alto",
    signature: [{ codes: ["PF"], label: "Delantero presionante" }, { codes: ["BWM"], label: "Centrocampista recuperador" }, { codes: ["SK"], label: "Portero cierre" }],
    levers: [{ symptom: "Rival con dos puntas que te corren a la espalda", instruction: null, label: "quitar Adelantarse más", effect: "contra dos puntas la línea adelantada regala carreras; centrales en defender", remove: ["adelantarse-mas"] }],
    evolution: [{ kind: "attr", positions: "campo", attrs: ["Wor", "Sta"], min: 14, label: "Trabajo y Resistencia ≥ 14 en los diez de campo" }],
  },
  {
    id: "presion-hombre",
    name: "Presión hombre a hombre",
    en: "Man-to-man press (Bielsa)",
    description: "Marcaje hombre a hombre en todo el campo con +1 atrás; verticalidad, triángulos por fuera y rombos por dentro.",
    mentality: "Ofensiva", mentalityId: "atacante",
    instructions: ["pases-directos", "ritmo-alto", "amplitud-amplia", "pasar-espacio", "mas-creatividad", "contrapresionar", "contraatacar", "distribuir-rapido", "linea-def-mucho-mas-alta", "linea-presion-alta", "presionar-mucho-mas", "entradas-duras"],
    formations: ["4-1-4-1", "4-2-3-1-dm", "3-4-3", "4-3-3-dm"],
    attrs: { def: ["Wor", "Sta", "Agg", "Pos", "Ant"], mid: ["Wor", "Sta", "Agg", "Pos", "Ant"], att: ["Wor", "Sta", "Agg", "Acc", "OtB"] },
    roles: { favor: ["SK", "BPD", "HB", "B2B", "CM", "IF", "IW", "PF", "WB", "FB"], avoid: ["L", "TQ", "EG", "RPM", "DLP", "GK", "NCB", "P", "TF"] },
    strengths: ["Ahoga al rival en su campo", "Cada jugador sabe a quién marca", "Verticalidad inmediata tras robar"],
    weaknesses: ["El mayor coste físico del catálogo: rotación obligatoria", "Un regate rompe la cadena de marcajes", "Las lesiones y la fatiga llegan en marzo"],
    when: "Plantillas jóvenes con Trabajo y Resistencia altísimos; ligas donde el rival no regatea.",
    family: "presion", parent: "gegenpress", origin: "Bielsa (Leeds, Athletic, Chile)",
    principles: ["Marcaje hombre a hombre en todo el campo con un defensor libre", "3-3-1-3 sin balón que se convierte en 3-3-2-2 con balón", "Se entrena sin paradas: el partido es continuo"],
    posesion: 1, forma: "3-3-1-3", motor: "medio-cond", motorNote: "El hombre a hombre se hace con «Marcajes más férreos» y «Marcar jugador específico» por jugador; el coste físico exige rotar.",
    signature: [{ codes: ["HB"], label: "Medio cierre que forma la línea de tres" }, { codes: ["PF"], label: "Delantero presionante" }, { codes: ["B2B", "CM"], label: "medios que llegan como tercer hombre" }, { codes: ["SK"], label: "Portero cierre" }],
    manMarking: true,
    pis: [{ roles: ["CD", "BPD", "FB", "WB", "CM", "B2B", "DM", "HB"], pi: "tight-marking", why: "hombre a hombre: cada uno con su par" }],
    levers: [{ symptom: "Un regateador rival rompe la cadena de marcajes", instruction: "mantenerse-pie", effect: "que no le tiren al suelo; el +1 atrás cubre", remove: ["entradas-duras"] }],
    evolution: [
      { kind: "attr", positions: "campo", attrs: ["Wor", "Sta"], min: 15, label: "Trabajo y Resistencia ≥ 15 en los diez de campo" },
      { kind: "role", codes: ["HB"], label: "Medio cierre" },
      { kind: "role", codes: ["PF"], label: "Delantero presionante" },
    ],
  },
  {
    id: "gegenpress-vertical",
    name: "Gegenpress vertical (escuela Red Bull)",
    en: "Vertical gegenpress (Rangnick)",
    description: "Regla de 8 segundos para recuperar y 10 para rematar; 4-2-2-2 estrecho, presionar por dentro y pase vertical al instante.",
    mentality: "Ofensiva", mentalityId: "atacante",
    instructions: ["pases-directos", "ritmo-mucho-mas-alto", "amplitud-estrecha", "pasar-espacio", "encarar", "centros-rasos", "contrapresionar", "contraatacar", "distribuir-rapido", "gk-saque-largo", "linea-def-mucho-mas-alta", "linea-presion-alta", "presionar-mucho-mas", "presionar-dentro", "impedir-saque-corto"],
    formations: ["4-2-2-2", "4-1-2-1-2", "4-4-2"],
    attrs: { def: ["Pac", "Sta", "Wor", "Agg", "Ant"], mid: ["Wor", "Sta", "Agg", "Pas", "Dec"], att: ["Wor", "Agg", "Acc", "OtB", "Fin"] },
    roles: { favor: ["BWM", "REG", "PF", "CWB", "WB", "IW", "AP", "SV", "B2B", "BPD"], avoid: ["L", "TQ", "EG", "DLP", "HB", "A", "NCB", "GK", "W", "TF", "RMD"] },
    strengths: ["La versión «meta» del motor: mejor rendimiento esperado", "Roba por el centro y remata en diez segundos", "Dos puntas presionantes anulan la salida rival"],
    weaknesses: ["Coste físico enorme", "Sin extremos: si el rival cierra el centro, falta amplitud", "Las bandas las cubren solo los laterales"],
    when: "Plantillas atléticas con dos puntas trabajadores y laterales con Resistencia ≥ 15.",
    family: "presion", parent: "gegenpress", origin: "Rangnick, Nagelsmann, Marsch (Leipzig, Salzburgo)",
    principles: ["Ocho segundos para recuperar, diez para rematar", "4-2-2-2 estrecho que presiona por dentro", "Tirar el pase vertical al instante tras robar"],
    posesion: 0, forma: "4-2-2-2", motor: "alto", motorNote: "El estilo con mejor rendimiento esperado y mayor coste físico.",
    signature: [{ codes: ["PF"], label: "dos Delanteros presionantes" }, { codes: ["BWM"], label: "Centrocampista recuperador" }, { codes: ["REG", "DLP"], label: "Regista con «Entrar más duro»" }, { codes: ["CWB", "WB"], label: "laterales completos que dan la anchura" }],
    pis: [{ roles: ["REG", "DLP"], pi: "tackle-harder", why: "el regista también muerde en la escuela Red Bull" }],
    levers: [{ symptom: "El rival cierra el centro y no hay pase vertical", instruction: "explotar-bandas", effect: "los laterales completos son la única amplitud: enfocar por ambas bandas", remove: ["explotar-centro"] }],
    evolution: [
      { kind: "role", codes: ["PF"], min: 2, label: "dos Delanteros presionantes" },
      { kind: "attr", positions: ["DL", "DR", "WBL", "WBR"], attrs: ["Sta"], min: 15, label: "laterales con Resistencia ≥ 15" },
    ],
  },
  {
    id: "presion-dos-mediapuntas",
    name: "Presión con dos mediapuntas (3-4-2-1)",
    en: "Double 10 press (Xabi Alonso)",
    description: "Salida por el centro (3+2) con dos mediapuntas en los medios espacios; carrileros como extremos; presión alta y contrapresión inmediata.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "salir-jugando", "explotar-centro", "encarar", "contrapresionar", "contraatacar", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
    formations: ["3-4-2-1", "3-4-3", "5-2-3"],
    attrs: { def: ["Pas", "Cmp", "Pac", "Pos", "Ant"], mid: ["Vis", "Dec", "Pas", "OtB", "Wor"], att: ["OtB", "Vis", "Dec", "Fir", "Fin"] },
    roles: { favor: ["BPD", "WCB", "CD", "CWB", "WB", "DLP", "B2B", "AM", "AP", "SS", "CF", "DLF"], avoid: ["NCB", "TF", "WTF", "L", "NFB", "IWB", "W", "DW", "WM"] },
    strengths: ["La defensa de tres da la cuña de defensa preventiva sin instrucciones", "Dos 10 entre líneas: el rival no sabe a quién saltar", "Sin balón se convierte en 5-2-3 o 5-4-1"],
    weaknesses: ["Exige dos mediapuntas de nivel", "Los carrileros corren toda la banda", "Con un 10 flojo se convierte en un 3-5-2 sin creación"],
    when: "Con dos mediapuntas con Visión y Decisiones ≥ 14 y carrileros con piernas.",
    family: "presion", parent: "transiciones", origin: "Xabi Alonso (Leverkusen), Tuchel (Chelsea)",
    principles: ["Salida 3+2 por el centro", "Dos mediapuntas en los medios espacios conectan medio y ataque", "Carrileros como extremos; presión alta y contrapresión inmediata"],
    posesion: 1, forma: "3-2-5 con carrileros", motor: "alto",
    signature: [{ codes: ["AM", "AP", "SS"], label: "dos mediapuntas" }, { codes: ["CWB", "WB"], label: "carrileros que hacen de extremo" }, { codes: ["BPD"], label: "Defensa con toque en el medio" }, { codes: ["DLP", "B2B"], label: "pivote y medio que llega" }],
    mobileRoles: ["AM", "AP", "SS"],
    pis: [{ roles: ["AM", "AP", "SS"], pi: "roam", why: "los dos 10 cambian de medio espacio para que no les marquen" }, { roles: ["CWB"], pi: "cross-less", why: "un carrilero combina por dentro y el otro centra" }],
    levers: [],
    evolution: [
      { kind: "role", codes: ["AM", "AP", "SS", "TQ", "EG"], min: 2, label: "dos mediapuntas en el XI" },
      { kind: "attr", positions: ["AMC"], attrs: ["Vis", "Dec"], min: 14, label: "mediapuntas con Visión y Decisiones ≥ 14" },
      { kind: "attr", positions: ["WBL", "WBR", "DL", "DR"], attrs: ["Pac", "Sta"], min: 15, label: "carrileros con Velocidad y Resistencia ≥ 15" },
    ],
  },

  // =========================================================== Posesión
  {
    id: "posesion",
    name: "Control de posesión",
    en: "Control Possession",
    description: "Posesión paciente con bloque medio-alto; controla el ritmo sin la presión extrema del tiki-taka.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-cortos", "ritmo-bajo", "amplitud-amplia", "salir-jugando", "trabajar-area", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "linea-def-alta", "linea-presion-media", "presionar-mas"],
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "5-2-3", "3-4-3"],
    attrs: { def: ["Pas", "Fir", "Tec", "Cmp", "Dec"], mid: ["Pas", "Fir", "Vis", "Dec", "Ant"], att: ["Fir", "Tec", "Cmp", "OtB", "Agi"] },
    roles: { favor: ["SK", "DLP", "AP", "RPM", "DLF", "CF", "BPD"], avoid: ["NCB", "WTF", "L"] },
    strengths: ["Controla el ritmo y el movimiento rival", "Sirve a equipos sin técnica de élite", "Sin vulnerabilidades extremas"],
    weaknesses: ["Deja más espacio a la espalda que el tiki-taka", "Previsible contra bloques bajos", "Necesita familiaridad táctica"],
    when: "Equipos de media tabla o que equilibran ambición y realidad; al menos un organizador en el medio.",
    family: "posesion", parent: null, origin: "Preset del juego · Exeter (League One) demuestra que funciona en ligas menores con bloque medio",
    principles: ["Línea alta con bloque medio: el rival completa demasiados pases si presionas arriba (Data Hub del Exeter)", "Quitar «Llevar el balón hasta el área» cuando no rompe defensas cerradas"],
    posesion: 2, forma: "2-3-5", motor: "medio-cond", motorNote: "En ligas menores funciona con bloque medio, Delantero avanzado en vez de Falso nueve y centrales sin riesgo (Exeter, 5º en League One).",
    signature: [{ codes: ["DLP", "RPM", "REG"], label: "organizador en la base" }, { codes: ["BPD"], label: "Defensa con toque" }, { codes: ["SK"], label: "Portero cierre" }],
    levers: [
      { symptom: "Bloque bajo rival que no rompes", instruction: "ritmo-alto", effect: "Exeter subía el ritmo al máximo contra bloques bajos para mover al rival antes de que se asiente", remove: ["ritmo-bajo", "ritmo-mucho-mas-bajo"] },
      { symptom: "Muchos centros inútiles y tiros lejanos", instruction: null, label: "quitar Llevar el balón hasta el área", effect: "cuando no rompe defensas cerradas solo frena", remove: ["trabajar-area"] },
    ],
    evolution: [],
  },
  {
    id: "tiki-taka",
    name: "Tiki-taka",
    en: "Tiki-Taka",
    description: "Posesión extrema: pases muy cortos a ritmo bajo, sistema estrecho y presión altísima. El balón defiende.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-mucho-mas-cortos", "ritmo-bajo", "amplitud-estrecha", "salir-jugando", "regatear-menos", "trabajar-area", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "linea-def-alta", "linea-presion-alta", "presionar-mas", "impedir-saque-corto"],
    formations: ["4-3-3-dm", "4-3-3-flat", "4-2-3-1-dm", "3-4-3"],
    attrs: { def: ["Pas", "Fir", "Tec", "Cmp", "Dec"], mid: ["Pas", "Fir", "Tec", "Vis", "Dec"], att: ["Fir", "Tec", "OtB", "Ant", "Agi"] },
    roles: { favor: ["RPM", "DLP", "AP", "F9", "CF", "BPD", "WB", "CWB"], avoid: ["NCB", "TF", "WTF", "NFB", "L"] },
    strengths: ["Superioridad numérica con balón", "Agota al rival persiguiendo", "Triángulos y espacios por movimiento"],
    weaknesses: ["Sufre contra bloques bajos", "Línea altísima expuesta al contra", "Exige jugadores técnicos de élite y mucha familiaridad"],
    when: "Clubes grandes con plantilla muy técnica y tiempo para asimilar la táctica.",
    family: "posesion", parent: "posesion", origin: "Guardiola (Barça 2008-12) · preset del juego",
    principles: ["El balón defiende: si lo tienes, no te atacan", "Pases muy cortos y sistema estrecho para tener siempre tres apoyos"],
    posesion: 2, forma: "2-3-5", motor: "medio", motorNote: "Sin verticalidad el motor lo convierte en posesión estéril; los estilos que evolucionan de aquí añaden la intención.",
    signature: [{ codes: ["RPM", "DLP", "REG"], label: "organizador" }, { codes: ["F9", "CF"], label: "Falso nueve o Delantero completo" }, { codes: ["BPD"], label: "Defensa con toque" }],
    levers: [],
    evolution: [],
  },
  {
    id: "tiki-vertical",
    name: "Tiki-taka vertical (Sarrismo)",
    en: "Vertical Tiki-Taka / Sarriball",
    description: "Posesión rápida en corto con verticalidad: todo pasa por el organizador retrasado en el pivote; los extremos interiores entran a rematar.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-cortos", "ritmo-alto", "salir-jugando", "trabajar-area", "mas-creatividad", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
    formations: ["4-3-3-dm", "4-2-3-1-dm", "4-2-3-1-mc", "4-1-4-1", "4-1-2-1-2"],
    attrs: { def: ["Pas", "Tec", "Dec", "Pos", "Acc"], mid: ["Pas", "Tec", "Vis", "Dec", "Acc"], att: ["Acc", "Pac", "Dri", "OtB", "Ant"] },
    roles: { favor: ["DLP", "REG", "MEZ", "B2B", "IF", "CF", "F9", "FB", "BPD"], avoid: ["NCB", "TF", "A", "L", "WTF", "W", "DW"] },
    strengths: ["Domina la posesión sin ser previsible", "Terceros hombres y medios espacios", "Ritmo alto que no deja respirar"],
    weaknesses: ["El ritmo alto pierde balones en zonas peligrosas", "Línea alta vulnerable si superan la presión", "Si marcan al organizador retrasado, el equipo no sale"],
    when: "Plantillas técnicas y rápidas con un regista de verdad en el pivote (Jorginho) y laterales que dan la anchura.",
    family: "posesion", parent: "tiki-taka", origin: "Sarri (Nápoles, Chelsea) · preset «Vertical Tiki-Taka»",
    principles: ["Cada pase tiene intención: corto pero hacia delante", "Todo pasa por el organizador retrasado (De) en el pivote", "Laterales en apoyo con «Abrirse a banda» dan la anchura; los extremos interiores entran a rematar"],
    posesion: 1, forma: "2-3-5", motor: "alto",
    signature: [{ codes: ["DLP", "REG"], label: "organizador retrasado en el pivote" }, { codes: ["IF"], label: "dos Delanteros interiores en ataque" }, { codes: ["CF", "F9"], label: "Delantero completo o Falso nueve" }],
    staticRoles: ["DLP", "REG"],
    pis: [{ roles: ["FB", "WB"], pi: "stay-wider", why: "los laterales dan la anchura porque los extremos entran" }],
    levers: [{ symptom: "Marcan al hombre a tu organizador retrasado", instruction: "gk-a-defensas", effect: "que el portero busque a los centrales y el organizador reciba en segunda instancia", remove: ["gk-al-organizador"] }],
    evolution: [
      { kind: "role", codes: ["DLP", "REG"], label: "organizador retrasado o Regista" },
      { kind: "attr", positions: ["DL", "DR", "WBL", "WBR"], attrs: ["Cro", "Sta"], min: 13, label: "laterales con Centros y Resistencia ≥ 13" },
    ],
  },
  {
    id: "juego-posicion",
    name: "Juego de posición (2-3-5 / 3-2-5)",
    en: "Positional play (Lillo, Guardiola, 04texag)",
    description: "Estructura fija que mueve al rival: dos jugadores dan la anchura, un central estático da la profundidad y el balón atrae a la defensa para que el tercer hombre entre en el hueco.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["amplitud-estrecha", "ritmo-bajo", "mas-creatividad", "contrapresionar", "mantener-forma", "distribuir-lento", "gk-saque-corto", "gk-a-defensas", "linea-presion-alta", "presionar-mas", "presionar-fuera", "impedir-saque-corto"],
    formations: ["4-3-3-dm", "4-2-3-1-dm", "3-4-3", "4-1-4-1"],
    attrs: { def: ["Pas", "Cmp", "Pac", "Dec", "Fir"], mid: ["Pas", "Vis", "Cmp", "Pos", "OtB"], att: ["Dri", "Acc", "Fir", "OtB", "Str"] },
    roles: { favor: ["MEZ", "W", "DM", "BPD", "IFB", "IWB", "AF", "DLF", "SK", "AP", "CD", "FB"], avoid: ["NCB", "TF", "WTF", "P", "RMD", "RPM"] },
    strengths: ["Superioridad numérica, posicional y cualitativa a la vez", "Defensa preventiva incorporada: siempre hay 3-2 detrás del balón", "No depende de la posesión estéril: se trata de mover al rival"],
    weaknesses: ["Exige respetar la estructura: un rol mal puesto la rompe", "Sin un extremo que aguante abierto no hay anchura", "Contra dos puntas el 2-3-5 deja a los centrales 1v1"],
    when: "Plantillas técnicas con un Mezzala de nivel, un extremo puro, un pivote sereno y laterales que saben cerrarse.",
    family: "posesion", parent: "tiki-taka", origin: "Lillo, Guardiola (Barça, Bayern, City), Arteta · hilos de 04texag FM20 y FM24 · Exeter (versión de liga menor)",
    principles: [
      "Tres pilares: estructura, relación con el balón y superioridad (numérica, posicional y cualitativa)",
      "Estructura: dos jugadores fijos dan la anchura, un central estático la profundidad, un Delantero avanzado clava a los centrales",
      "Área de cooperación (6-7 estáticos, «Mantener posición») y área de ayuda mutua (portador y 2-3 cercanos, «Variar la posición»)",
      "Nunca más de tres en una línea horizontal ni dos en una vertical; un jugador por carril exterior; triángulos siempre",
      "Sin «Salir jugando desde la defensa»: en FM acaba en pelotazo por frustración; lo sustituyen Defensa con toque, ritmo bajo y pase corto",
      "Línea defensiva estándar (una línea alta comprime tu propio campo); Adelantarse más solo contra un punta",
      "Nunca «A la contra»: deshace la estructura. Mantener dibujo y Contrapresión siempre",
    ],
    posesion: 2, forma: "2-3-5 / 3-2-5", motor: "alto", motorNote: "04texag: «así está diseñado el motor para este equipo». Positiva + Ser más expresivos: rígido en la forma, libre en la ayuda mutua.",
    signature: [
      { codes: ["MEZ"], label: "Mezzala como foco (Ap crea, At llega)" },
      { codes: ["W"], label: "Extremo muy abierto con «Recortar hacia dentro»" },
      { codes: ["DM"], label: "MCD en apoyo (mejor que el Pivote organizador, que roba espacio al Mezzala)" },
      { codes: ["IFB", "IWB", "FB"], label: "lateral que cierra (invertido o en apoyo con «Mantener posición» + «Cerrarse»)" },
      { codes: ["BPD"], label: "Defensa con toque: Tapón por el lado de la sobrecarga, Cubrir por el débil" },
      { codes: ["AF", "DLF"], label: "Delantero avanzado (clava a los centrales) o Segundo delantero" },
    ],
    staticRoles: AXIS_STATIC,
    mobileRoles: ["MEZ", "AM", "AP", "DLF", "F9", "CF"],
    pis: [
      { roles: ["W"], pi: "cut-inside", why: "extremo abierto que recorta: clava al lateral y abre el pasillo interior (04texag)" },
      { roles: ["AM", "AP"], pi: "roam", why: "área de ayuda mutua: el mediapunta varía la posición y se mueve entre líneas" },
      { roles: ["FB"], pi: "sit-narrower", why: "lateral en apoyo que cierra por dentro para sostener la cuña" },
    ],
    levers: [
      { symptom: "Rival con un solo punta", instruction: "adelantarse-mas", effect: "comprime el campo sin riesgo; contra dos puntas, nunca (centrales en defender)" },
      { symptom: "El lateral invertido empuja al pivote y escora todo el medio", instruction: null, label: "Lateral en apoyo con «Mantener posición» + «Cerrarse»", effect: "más estable que el invertido para canalizar por un lado; dos invertidos equilibran" },
      { symptom: "Bloque bajo que no se mueve", instruction: "pasar-espacio", effect: "el tercer hombre necesita un pase que rompa; sube el ritmo un punto si tampoco" },
    ],
    evolution: [
      { kind: "role", codes: ["IFB", "IWB", "L"], label: "Lateral invertido, Carrilero invertido o Líbero que forme la cuña" },
      { kind: "attr", positions: ["DL", "DR", "WBL", "WBR", "DC"], attrs: ["Pas"], min: 14, label: "la salida (laterales y centrales) con Pases ≥ 14" },
      { kind: "attr", positions: ["DM"], attrs: ["Cmp"], min: 15, label: "pivote con Serenidad ≥ 15" },
      { kind: "role", codes: ["W"], label: "un Extremo puro que aguante abierto" },
      { kind: "role", codes: ["MEZ"], label: "Mezzala" },
    ],
  },
  {
    id: "cebar-presion",
    name: "Cebar la presión (De Zerbi)",
    en: "Build-up baiting",
    description: "La presión rival es una oportunidad: se atrae con pases cortos entre portero y centrales, se pisa el balón para provocar el salto y se sale con el tercer hombre.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-cortos", "ritmo-mucho-mas-bajo", "salir-jugando", "perder-tiempo", "trabajar-area", "pasar-espacio", "contrapresionar", "contraatacar", "distribuir-lento", "gk-saque-corto", "gk-a-defensas", "linea-def-alta", "linea-presion-alta", "presionar-mas"],
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm"],
    attrs: { def: ["Cmp", "Pas", "Fir", "Dec", "Tec"], mid: ["Cmp", "Pas", "Fir", "Vis", "Dec"], att: ["Wor", "OtB", "Fir", "Acc", "Tea"] },
    roles: { favor: ["SK", "BPD", "DLP", "DM", "AM", "W", "PF", "FB", "CD"], avoid: ["NCB", "TF", "WTF", "GK", "P", "L", "RPM"] },
    strengths: ["Convierte la presión rival en espacio a su espalda", "Transiciones «artificiales» de lento a vertical en dos pases", "El mediapunta libre rompe la presión por dentro"],
    weaknesses: ["El que más castiga el motor si falta serenidad", "«Salir jugando desde la defensa» puede acabar en pelotazo por frustración", "Contra rivales que no presionan no hay cebo"],
    when: "Portero, centrales y pivotes con Serenidad ≥ 14; rivales que presionan alto.",
    family: "posesion", parent: "posesion", origin: "De Zerbi (Sassuolo, Brighton)",
    principles: ["Salida 4+2 cauta con el portero como tercer central", "Pisar el balón para provocar el salto y salir con combinaciones de tercer hombre", "Extremos abiertos y punta que fija centrales; de lento a vertical en dos pases"],
    posesion: 2, forma: "4-2-4 / 2-4-4", motor: "medio-cond", motorNote: "Exige Serenidad ≥ 14 en portero, centrales y pivotes; compensar «Salir jugando» con Defensa con toque y ritmo mínimo.",
    signature: [{ codes: ["SK"], label: "Portero cierre en apoyo (tercer central)" }, { codes: ["BPD"], label: "Defensa con toque" }, { codes: ["DLP", "DM"], label: "doble pivote con pase corto" }, { codes: ["AM"], label: "Mediapunta libre con «Variar la posición»" }, { codes: ["PF"], label: "Delantero presionante en apoyo" }],
    mobileRoles: ["AM"],
    pis: [{ roles: ["AM"], pi: "roam", why: "el mediapunta libre rompe la presión por dentro" }, { roles: ["CD", "BPD"], pi: "pass-shorter", why: "cebar con pases cortos y cuadrados entre centrales y portero" }],
    levers: [{ symptom: "El rival no presiona: no hay cebo", instruction: "ritmo-alto", effect: "sin salto que atraer, pasa a Control directo: ritmo y pase al espacio", remove: ["ritmo-mucho-mas-bajo", "ritmo-bajo", "perder-tiempo"] }],
    evolution: [
      { kind: "attr", positions: ["GK"], attrs: ["Pas", "Cmp"], min: 14, label: "portero con Pases y Serenidad ≥ 14" },
      { kind: "attr", positions: ["DC", "DM"], attrs: ["Cmp"], min: 14, label: "centrales y pivotes con Serenidad ≥ 14" },
      { kind: "role", codes: ["PF"], label: "Delantero presionante" },
    ],
  },
  {
    id: "relacionismo",
    name: "Relacionismo",
    en: "Relationism (Diniz)",
    description: "Lo contrario del juego de posición: se ignoran las zonas y los jugadores buscan la proximidad al portador (5-6 en diez metros). Pasar y correr, paredes, escalonamiento e inclinar el campo hacia un flanco.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["ritmo-bajo", "mas-creatividad", "trabajar-area", "regatear-menos", "contrapresionar", "contraatacar", "linea-def-alta", "linea-presion-alta", "presionar-mas", "presionar-fuera"],
    formations: ["4-3-3-dm", "4-2-3-1-mc", "4-3-1-2", "4-1-2-1-2"],
    attrs: { def: ["Mar", "Pas", "Cmp", "Dec", "Sta"], mid: ["Cmp", "Agg", "Dec", "Fir", "Vis"], att: ["Dri", "Pac", "Bra", "Tec", "Tea"] },
    roles: { favor: ["RPM", "REG", "B2B", "WM", "CF", "F9", "DLF", "CWB", "WB", "AP", "MEZ"], avoid: ["NCB", "TF", "WTF", "A", "HB", "DW", "NFB", "P", "IFB"] },
    strengths: ["Caos que el rival no puede preparar", "Sobrecargas por congestión: se recupera por proximidad", "Los rasgos y la polivalencia valen más que el rol"],
    weaknesses: ["El motor devuelve a los jugadores a su posición: hay que crear «ecos»", "Sin estructura, la contra rival encuentra campo", "Exige Serenidad y Decisiones en todas las líneas"],
    when: "Plantillas técnicas, valientes y polivalentes con Serenidad ≥ 14 y Resistencia ≥ 15.",
    family: "posesion", parent: "tiki-taka", origin: "Diniz (Fluminense), Motta, Malmö · PDF de reclutamiento (Positiva) y FM Base (Ofensiva)",
    principles: ["Pass and move, tabela (pared), escadinha (escalonamiento) y pitch tilt (inclinar el campo)", "Ritmo bajo para que ocurran las rotaciones; amplitud equilibrada", "Ser más expresivos es indispensable; Regatear menos potencia el pase corto", "«Variar la posición» en todos los que lo admitan"],
    posesion: 2, forma: "libre / inclinación a un flanco", motor: "medio", motorNote: "El PDF pide Positiva (Ofensiva «es demasiado directa y no deja que ocurran las rotaciones»); FM Base usa Ofensiva. Positiva de base, Ofensiva como palanca.",
    signature: [{ codes: ["RPM", "REG"], label: "organizador móvil o Regista" }, { codes: ["B2B", "WM"], label: "Todoterreno y Centrocampista de banda con «Variar la posición»" }, { codes: ["CWB", "WB"], label: "carrileros con «Regatear más»" }, { codes: ["CF", "F9", "DLF"], label: "delantero que baja y rota" }],
    mobileRoles: ["RPM", "REG", "B2B", "WM", "CF", "F9", "DLF", "AM", "MEZ", "IF", "IW", "AP", "SS"],
    pis: [{ roles: ["CWB", "WB"], pi: "dribble-more", why: "los carrileros conducen para inclinar el campo" }, { roles: ["RPM", "B2B", "WM", "CF", "F9", "DLF", "AM", "MEZ"], pi: "roam", why: "ecos de relacionismo: proximidad al portador" }],
    levers: [{ symptom: "Demasiado lento: rotaciones sin profundidad", instruction: null, label: "mentalidad Ofensiva", effect: "la recreación de FM Base; vuelve a Positiva si se pierde el juego corto" }],
    evolution: [
      { kind: "attr", positions: "campo", attrs: ["Cmp"], min: 14, label: "Serenidad ≥ 14 en los diez de campo" },
      { kind: "attr", positions: "campo", attrs: ["Sta"], min: 15, label: "Resistencia ≥ 15 (90 minutos de presión)" },
      { kind: "versatile", min: 4, label: "al menos cuatro polivalentes en el XI" },
      { kind: "attr", positions: ["GK"], attrs: ["Ecc"], min: 10, label: "portero con Excentricidad ≥ 10" },
    ],
  },
  {
    id: "futbol-total",
    name: "Fútbol total",
    en: "Total football (Michels, Cruyff)",
    description: "Cualquiera ocupa la posición del compañero que se mueve; el campo se hace grande con balón y pequeño sin él; línea muy alta con portero cierre y un central que sube.",
    mentality: "Ofensiva", mentalityId: "atacante",
    instructions: ["pases-cortos", "ritmo-alto", "amplitud-muy-amplia", "mas-creatividad", "salir-jugando", "contrapresionar", "contraatacar", "distribuir-rapido", "gk-saque-corto", "linea-def-mucho-mas-alta", "linea-presion-alta", "presionar-mucho-mas", "adelantarse-mas"],
    formations: ["3-4-3", "3-5-2", "4-3-3-flat"],
    attrs: { def: ["Pac", "Pas", "Cmp", "Ant", "Pos"], mid: ["Vis", "Tec", "Pas", "OtB", "Sta"], att: ["OtB", "Fla", "Tec", "Acc", "Fin"] },
    roles: { favor: ["L", "SK", "CD", "DLP", "MEZ", "B2B", "AP", "EG", "W", "F9", "CF"], avoid: ["NCB", "TF", "WTF", "GK", "A", "DW", "NFB", "HB"] },
    strengths: ["Rotaciones que el rival no puede seguir", "Campo grande con balón, pequeño sin él", "El líbero suma un hombre a la salida"],
    weaknesses: ["Exige polivalencia real (varias posiciones naturales)", "Línea muy alta: centrales y portero rápidos o nada", "El líbero deja la defensa corta"],
    when: "Plantillas con seis o más polivalentes, centrales con Velocidad ≥ 14 y un portero cierre.",
    family: "posesion", parent: "tiki-taka", origin: "Michels y Cruyff (Ajax, Holanda 74) · Magicomonta lo recrea en 3-4-3 rombo / 3-3-3-1",
    principles: ["Intercambio de posiciones constante", "Presión altísima con Adelantarse más para hacer el campo pequeño", "Líbero en apoyo entre dos centrales en Cubrir"],
    posesion: 1, forma: "3-4-3 con rotaciones", motor: "medio", motorNote: "La exigencia real es la polivalencia, que la herramienta mide con la familiaridad; sin ella es un 3-4-3 ofensivo normal.",
    signature: [{ codes: ["L"], label: "Líbero en apoyo" }, { codes: ["SK"], label: "Portero cierre en ataque" }, { codes: ["AP", "EG"], label: "Organizador adelantado o Enganche" }, { codes: ["F9", "CF"], label: "Falso nueve o Delantero completo" }],
    mobileRoles: ["L", "MEZ", "B2B", "AP", "EG", "W", "F9", "CF"],
    levers: [{ symptom: "Te corren a la espalda una y otra vez", instruction: "linea-def-alta", effect: "baja un punto la línea (de muy alta a alta) y quita Adelantarse más", remove: ["linea-def-mucho-mas-alta", "adelantarse-mas"] }],
    evolution: [
      { kind: "versatile", min: 6, label: "seis o más polivalentes en el XI" },
      { kind: "attr", positions: ["DC"], attrs: ["Pac", "Acc"], min: 14, label: "centrales con Velocidad y Aceleración ≥ 14" },
      { kind: "role", codes: ["SK"], label: "Portero cierre" },
    ],
  },
  {
    id: "control-directo",
    name: "Control directo (Slot)",
    en: "Direct control (Slot)",
    description: "Salida con línea de cuatro muy abierta para que el doble pivote reciba con espacio; un central con licencia para el pase directo; control con verticalidad selectiva.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["amplitud-amplia", "ritmo-alto", "salir-jugando", "pasar-espacio", "encarar", "contrapresionar", "mantener-forma", "linea-def-alta", "linea-presion-alta", "presionar-mas", "retroceder-mas"],
    formations: ["4-2-3-1-dm", "4-3-3-dm", "4-2-3-1-mc"],
    attrs: { def: ["Pas", "Pos", "Cmp", "Pac", "Dec"], mid: ["Pas", "Vis", "Dec", "Dri", "Wor"], att: ["Pac", "Acc", "Dri", "OtB", "Fin"] },
    roles: { favor: ["FB", "CD", "BPD", "DM", "REG", "AM", "IF", "W", "PF", "DLP"], avoid: ["L", "TQ", "EG", "RPM", "NCB", "TF", "WTF", "CWB", "NFB"] },
    strengths: ["Control sin posesión estéril: el pase directo llega cuando el rival se estira", "Línea de cuatro abierta que el rival no puede presionar con dos", "Un extremo puro hasta la línea de fondo y otro por dentro"],
    weaknesses: ["Sin un central que pase largo se convierte en posesión normal", "Retroceder más cede metros si el rival no ataca", "El extremo puro necesita Velocidad de élite"],
    when: "Un central con Pases ≥ 15, un extremo con Velocidad ≥ 16 y un doble pivote que combine técnica y conducción.",
    family: "posesion", parent: "posesion", origin: "Slot (Feyenoord, Liverpool)",
    principles: ["Línea de cuatro muy abierta (no 3-2-5) para que el doble pivote reciba con espacio", "Un central con licencia para el pase directo por encima", "Mediapunta al medio espacio derecho; extremo puro hasta la línea de fondo por el otro lado"],
    posesion: 1, forma: "2-4-4 amplia", motor: "alto",
    signature: [{ codes: ["FB"], label: "Lateral en defender con «Abrirse a banda»" }, { codes: ["CD"], label: "Central con «Pases más directos»" }, { codes: ["DM", "REG", "DLP"], label: "doble pivote: uno corto, otro que conduce" }, { codes: ["W"], label: "Extremo en ataque hasta la línea de fondo" }, { codes: ["PF"], label: "Delantero presionante en ataque" }],
    pis: [{ roles: ["FB"], pi: "stay-wider", why: "línea de cuatro muy abierta en la salida" }, { roles: ["CD"], pi: "more-direct-passes", why: "el central con licencia para el pase directo" }, { roles: ["REG"], pi: "dribble-more", why: "el regista conduce para romper la primera línea" }],
    levers: [{ symptom: "El rival no presiona y Retroceder más cede metros", instruction: null, label: "quitar Retroceder más", effect: "la línea alta basta; retroceder es para rivales que corren", remove: ["retroceder-mas"] }],
    evolution: [
      { kind: "attr", positions: ["DC"], attrs: ["Pas"], min: 15, count: 1, label: "un central con Pases ≥ 15" },
      { kind: "attr", positions: ["AML", "AMR", "ML", "MR"], attrs: ["Pac"], min: 16, count: 1, label: "un extremo con Velocidad ≥ 16" },
    ],
  },

  // =========================================================== Contraataque y bloque
  {
    id: "contra-fluido",
    name: "Contraataque fluido",
    en: "Fluid Counter-Attack",
    description: "Salida elaborada y bloque medio, con contras rápidos y conducciones cuando hay espacio.",
    mentality: "Cauta", mentalityId: "cauta",
    instructions: ["encarar", "pasar-espacio", "reagruparse", "contraatacar", "distribuir-rapido", "linea-presion-media"],
    formations: ["3-4-2-1", "3-4-3", "4-3-3-dm", "4-2-3-1-dm", "5-2-3", "5-3-2"],
    attrs: { def: ["Pas", "Pos", "Dec", "Pac", "Tec"], mid: ["Pas", "Tec", "Dri", "Wor", "Dec"], att: ["Pac", "Acc", "Dri", "Agi", "OtB"] },
    roles: { favor: ["B2B", "CAR", "MEZ", "BPD", "WB", "IF", "W", "AF"], avoid: ["TQ", "EG", "RPM", "L", "A"] },
    strengths: ["Equilibra ataque y defensa", "Ocasiones en transición sin perder compacidad", "Flexible ante cualquier rival"],
    weaknesses: ["Puede parecer reactivo", "Riesgo de desconexión entre fases", "Domina menos que la posesión"],
    when: "Contra rivales algo mejores, para proteger ventajas con forma, o equipos de media tabla.",
    family: "contra", parent: null, origin: "Preset del juego",
    principles: ["Bloque medio que sale con criterio", "Conducciones cuando hay espacio"],
    posesion: 0, forma: "3-4-3 / 4-3-3", motor: "medio", motorNote: "Con Cauta rinde por debajo de lo que promete (DarkHorse): prueba Equilibrada o Positiva.",
    signature: [{ codes: ["B2B", "CAR", "MEZ"], label: "medio que conduce" }, { codes: ["IF", "W", "AF"], label: "corredores" }],
    levers: [{ symptom: "Contras que no llegan a nada", instruction: null, label: "mentalidad Positiva", effect: "Cauta es demasiado pasiva para la contra en el motor (DarkHorse)" }],
    evolution: [],
  },
  {
    id: "rombo-pragmatico",
    name: "Rombo pragmático (Ancelotti)",
    en: "Pragmatic diamond (Ancelotti)",
    description: "El sistema se adapta a los jugadores: rombo con enganche detrás de dos puntas, bloque medio sin presión loca; se concede posesión y se castiga por los canales.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["ritmo-alto", "amplitud-estrecha", "pasar-espacio", "explotar-centro", "desmarque-fuera-izq", "desmarque-fuera-der", "contraatacar", "reagruparse", "linea-presion-media", "retroceder-mas"],
    formations: ["4-1-2-1-2", "4-3-1-2", "4-4-2", "4-3-3-dm"],
    attrs: { def: ["Pos", "Cnt", "Sta", "Cro", "Dec"], mid: ["Pas", "Vis", "Dec", "Wor", "OtB"], att: ["Fin", "OtB", "Acc", "Vis", "Tec"] },
    roles: { favor: ["DLP", "REG", "CAR", "MEZ", "AM", "SS", "EG", "AF", "DLF", "WB", "FB", "CD"], avoid: ["W", "IW", "IF", "DW", "WM", "NCB", "L", "RPM", "NFB"] },
    strengths: ["Talento arriba sin obligarle a presionar 90 minutos", "Los laterales dan toda la anchura; el rombo domina el centro", "Concede posesión y castiga por los canales"],
    weaknesses: ["Sin laterales con piernas no hay amplitud", "El enganche tiene que ser de nivel", "Contra extremos rápidos, los laterales están solos"],
    when: "Plantillas con talento arriba y sin piernas para presionar 90 minutos: el estilo que recomendar cuando no hay Gegenpress posible.",
    family: "contra", parent: "contra-fluido", origin: "Ancelotti (Milan, Madrid)",
    principles: ["Rombo con enganche detrás de dos puntas, o 4-4-2 sin balón que se abre en 4-3-3 con balón", "Bloque medio sin presión loca; Retroceder más para proteger el espacio", "Doblar por fuera: los laterales son los extremos"],
    posesion: 1, forma: "rombo", motor: "alto",
    signature: [{ codes: ["DLP", "REG"], label: "organizador en la base del rombo" }, { codes: ["CAR", "MEZ"], label: "Interior mixto y Mezzala" }, { codes: ["AM", "SS", "EG"], label: "enganche o delantero sorpresa" }, { codes: ["WB", "FB", "CWB"], label: "laterales que dan la anchura" }],
    pis: [{ roles: ["WB", "FB", "CWB"], pi: "stay-wider", why: "sin extremos, los laterales son la anchura" }],
    levers: [{ symptom: "Extremos rápidos rivales contra tus laterales solos", instruction: "evitar-centros", effect: "los interiores bajan a ayudar; laterales en apoyo, no en ataque", remove: ["permitir-centros"] }],
    evolution: [
      { kind: "role", codes: ["EG", "AM", "SS", "TQ", "AP"], label: "un enganche o mediapunta" },
      { kind: "role", codes: ["DLP", "REG"], label: "organizador en la base" },
      { kind: "attr", positions: ["DL", "DR", "WBL", "WBR"], attrs: ["Sta", "Cro"], min: 13, label: "laterales con Resistencia y Centros ≥ 13" },
    ],
  },
  {
    id: "bloque-bajo",
    name: "Contragolpe directo",
    en: "Direct Counter-Attack",
    description: "Bloque bajo y compacto, sin contrapresión, y salida directa al espacio en cuanto se recupera.",
    mentality: "Cauta", mentalityId: "cauta",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "reagruparse", "contraatacar", "distribuir-rapido", "linea-def-baja", "linea-presion-baja", "presionar-menos"],
    formations: ["4-4-2", "5-3-2", "4-3-1-2", "3-4-2-1", "4-4-1-1"],
    attrs: { def: ["Pos", "Cnt", "Mar", "Hea", "Str"], mid: ["Wor", "Pos", "Tck", "Pas", "Dec"], att: ["Pac", "Acc", "OtB", "Fin", "Dri"] },
    roles: { favor: ["NCB", "CD", "GK", "BWM", "SV", "DLF", "AF", "P", "IW", "TF"], avoid: ["L", "RPM", "TQ", "EG", "AP", "SK", "CWB"] },
    strengths: ["Organización y compacidad", "Explota el espacio a la espalda de líneas altas", "Exige poca técnica; buena para plantillas inferiores"],
    weaknesses: ["Renuncia a la iniciativa", "Sufre contra equipos pacientes", "Depende de acertar con pocas ocasiones y del balón parado"],
    when: "Plantillas inferiores, recién ascendidos, últimos minutos con ventaja o contra dominadores de la posesión.",
    family: "contra", parent: null, origin: "Preset del juego",
    principles: ["Bloque bajo y compacto", "Salida directa al espacio al recuperar"],
    posesion: 0, forma: "4-4-2 bajo", motor: "medio-cond", motorNote: "Con Cauta la contra no llega (DarkHorse): la versión que rinde es el Contraataque directo con Ofensiva. El marcaje estricto se da por jugador.",
    signature: [{ codes: ["CD", "NCB"], label: "centrales que despejan" }, { codes: ["AF", "P"], label: "punta rápido" }],
    manMarking: true,
    levers: [{ symptom: "Defiendes bien pero la contra no llega", instruction: null, label: "mentalidad Ofensiva (Contraataque directo)", effect: "Cauta es demasiado pasiva: el equipo no ataca el espacio nada más recuperar" }],
    evolution: [],
  },
  {
    id: "cholismo",
    name: "Cholismo (bloque medio 4-4-2)",
    en: "Cholismo (Simeone)",
    description: "Dos líneas de cuatro muy juntas en bloque medio que baja a bajo en los últimos minutos; se presiona por fuera y se roba en banda; ataque estrecho con interiores por dentro y laterales que desdoblan.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["amplitud-estrecha", "pases-directos", "ritmo-alto", "pasar-espacio", "centros-rasos", "encarar", "contraatacar", "reagruparse", "gk-a-laterales", "linea-presion-media", "presionar-mas", "entradas-duras", "retroceder-mas", "presionar-fuera", "evitar-centros"],
    formations: ["4-4-2", "3-5-2", "4-4-1-1"],
    attrs: { def: ["Pos", "Mar", "Cnt", "Wor", "Bra"], mid: ["Wor", "Sta", "Pos", "Tea", "Agg"], att: ["Pac", "Acc", "OtB", "Wor", "Fin"] },
    roles: { favor: ["CD", "FB", "WB", "WM", "CM", "B2B", "DLF", "AF", "P", "BWM", "DM"], avoid: ["L", "TQ", "EG", "RPM", "AP", "RMD", "CWB", "IWB", "SK", "F9"] },
    strengths: ["Bloque compacto que roba en banda y sale rápido", "Balón parado como arma", "Triplete con 132 goles a favor y 33 en contra en la prueba de FM Scout"],
    weaknesses: ["Exige Colocación, Marcaje y Concentración en diez jugadores", "Sin dos puntas rápidos la contra no existe", "Contra rivales que no atacan, poco fútbol"],
    when: "Defensa y medio con Colocación/Marcaje/Concentración ≥ 14 y dos puntas con Velocidad.",
    family: "contra", parent: "bloque-bajo", origin: "Simeone (Atlético 13-14 y 23-25) · recreación de FM Scout",
    principles: ["Bloque medio 4-4-2 con dos líneas de cuatro muy juntas", "Presionar fuera: se roba en banda", "Ataque estrecho con interiores por dentro y laterales que desdoblan; contra obligatoria", "Positiva, no Cauta: la contención ya la da el bloque"],
    posesion: 0, forma: "4-4-2 estrecho", motor: "alto",
    signature: [{ codes: ["CD"], label: "dos Defensas centrales en defender" }, { codes: ["WM"], label: "Centrocampista de banda en apoyo por dentro" }, { codes: ["CM", "DM", "BWM"], label: "medio en defender" }, { codes: ["B2B"], label: "Todoterreno" }, { codes: ["DLF"], label: "Delantero retrasado" }, { codes: ["AF", "P"], label: "punta rápido" }],
    staticRoles: ["CD", "CM", "DM", "BWM", "FB"],
    pis: [{ roles: ["WM"], pi: "sit-narrower", why: "los interiores se meten y dejan la banda al lateral que desdobla" }],
    levers: [{ symptom: "Últimos minutos con ventaja", instruction: "linea-presion-baja", effect: "el bloque baja a bajo y se cierra", remove: ["linea-presion-media"] }],
    evolution: [
      { kind: "attr", positions: ["DC", "DL", "DR", "WBL", "WBR", "DM", "MC", "ML", "MR"], attrs: ["Pos", "Mar", "Cnt"], min: 14, label: "defensa y medio con Colocación, Marcaje y Concentración ≥ 14" },
      { kind: "attr", positions: ["ST"], attrs: ["Pac", "Acc"], min: 15, label: "puntas con Velocidad y Aceleración ≥ 15" },
    ],
  },
  {
    id: "contra-directo",
    name: "Contraataque directo (DarkHorse)",
    en: "Direct counter (DarkHorse Tactics)",
    description: "Defensa como unidad con suficientes jugadores atrás que no se aventuran; salida explosiva con salidas claras arriba. La clave es la mentalidad Ofensiva: obliga a atacar el espacio nada más recuperar.",
    mentality: "Ofensiva", mentalityId: "atacante",
    instructions: ["pasar-espacio", "pases-directos", "ritmo-alto", "mas-disciplina", "contraatacar", "distribuir-rapido", "linea-presion-media", "presionar-mucho-mas"],
    formations: ["4-2-3-1-dm", "4-1-4-1", "5-3-2", "4-3-3-dm"],
    attrs: { def: ["Pos", "Cnt", "Mar", "Pac", "Str"], mid: ["Wor", "Tck", "Pos", "Pas", "Dec"], att: ["Pac", "Acc", "Agg", "OtB", "Fin"] },
    roles: { favor: ["CD", "BPD", "BWM", "B2B", "SV", "REG", "PF", "AF", "CWB", "FB", "DM"], avoid: ["L", "TQ", "EG", "RPM", "AP", "F9", "NCB", "IWB", "SK"] },
    strengths: ["89 puntos con el Atlético: 2 derrotas, 18 goles en contra, más disparos que nadie", "Adaptable de liga baja (laterales en defender) a élite (carrileros completos)", "Orden colectivo por encima de la creatividad individual"],
    weaknesses: ["La directiva se quejará del «fútbol directo»", "Sin Centrocampista recuperador que destruya en el centro, se abre", "Contra rivales iguales o superiores hay que bajar a Equilibrada"],
    when: "Cualquier nivel: Centrocampista recuperador, Delantero presionante y puntas con Velocidad ≥ 15.",
    family: "contra", parent: "bloque-bajo", origin: "DarkHorse Tactics: Sudáfrica, East Fife (ascenso), Atlético (89 puntos)",
    principles: ["La paradoja de la mentalidad: Cauta es demasiado pasiva, Positiva demasiado de posesión; Ofensiva obliga a atacar el espacio", "Equilibrada solo contra rivales iguales o superiores", "Ser más disciplinados: orden colectivo", "Bloque medio o bajo según rival (el medio roba donde se puede golpear rápido)", "Gatillo «mucho más» para forzar errores; «más» en ligas bajas para no desordenarse"],
    posesion: 0, forma: "4-1-4-1 / 5-2-1-2", motor: "alto", motorNote: "Contrapresión opcional: bien en equipos grandes, con cuidado en bloques bajos.",
    signature: [{ codes: ["CD", "BPD"], label: "Central en defender; Defensa con toque mejor que Central práctico" }, { codes: ["BWM"], label: "Centrocampista recuperador en apoyo como destructor" }, { codes: ["B2B", "SV"], label: "Todoterreno o Segundo volante como enlace" }, { codes: ["PF"], label: "Delantero presionante (mejor que el Avanzado)" }, { codes: ["FB", "CWB", "WB"], label: "laterales en defender (ligas menores) o completos (élite)" }],
    bloqueSegunRival: true,
    levers: [
      { symptom: "Rival igual o superior (Madrid, PSG)", instruction: null, label: "mentalidad Equilibrada", effect: "la única excepción a Ofensiva" },
      { symptom: "Equipo grande que puede permitírselo", instruction: "contrapresionar", effect: "opcional: recuperar aún más arriba; con cuidado en bloques bajos", remove: ["reagruparse"] },
      { symptom: "Liga baja: el equipo se desordena al presionar", instruction: "presionar-mas", effect: "gatillo «más» en vez de «mucho más»", remove: ["presionar-mucho-mas"] },
      { symptom: "Rival que ataca con muchos hombres", instruction: "linea-presion-baja", effect: "bloque bajo; el medio es para golpear rápido", remove: ["linea-presion-media"] },
    ],
    evolution: [
      { kind: "role", codes: ["BWM"], label: "Centrocampista recuperador" },
      { kind: "role", codes: ["PF"], label: "Delantero presionante" },
      { kind: "attr", positions: ["ST"], attrs: ["Pac", "Acc"], min: 15, label: "puntas con Velocidad ≥ 15" },
    ],
  },
  {
    id: "reactivo",
    name: "Reactivo de transición (Mourinho)",
    en: "Reactive transition (Mourinho)",
    description: "Bloque que se adapta al rival (bajo contra grandes, medio o alto contra iguales); doble pivote que no deja espacio a la espalda; transición a través del 10 y dos rápidos por fuera.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-directos", "ritmo-alto", "pasar-espacio", "contraatacar", "reagruparse", "linea-presion-media", "presionar-menos", "retroceder-mas", "evitar-centros"],
    formations: ["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm"],
    attrs: { def: ["Pos", "Cnt", "Mar", "Dec", "Str"], mid: ["Pos", "Tck", "Wor", "Dec", "Pas"], att: ["Pac", "Acc", "Dec", "Vis", "Fin"] },
    roles: { favor: ["DM", "A", "HB", "DLP", "AM", "IF", "IW", "CD", "FB", "WB", "AF", "DLF"], avoid: ["L", "TQ", "EG", "RPM", "CWB", "SK", "F9", "MEZ"] },
    strengths: ["Tres variantes por rival con la misma plantilla", "El 10 conecta la transición; los dos rápidos la terminan", "Doble pivote: nada a la espalda"],
    weaknesses: ["Con Cauta es la versión que peor rinde en el motor: usar Equilibrada", "Poco fútbol contra rivales que no atacan", "Depende de un mediapunta de élite"],
    when: "Con doble pivote en defender, un mediapunta con Decisiones y Visión ≥ 15 y dos extremos rápidos.",
    family: "contra", parent: "bloque-bajo", origin: "Mourinho (Inter 09-10, Chelsea, Madrid)",
    principles: ["El bloque se adapta al rival: bajo contra grandes, medio o alto contra iguales o inferiores", "Transición a través del 10 (Sneijder) y dos extremos rápidos", "Central con pase corto y «Tomar menos riesgos»"],
    posesion: 0, forma: "4-2-3-1", motor: "medio", motorNote: "Su firma no es un conjunto fijo sino tres variantes por rival: bloque «según rival» enlazado a la pestaña Rival.",
    signature: [{ codes: ["DM", "A", "HB", "DLP"], label: "doble pivote en defender" }, { codes: ["AM"], label: "Mediapunta en ataque (el 10)" }, { codes: ["IF", "IW"], label: "dos extremos interiores rápidos" }],
    bloqueSegunRival: true,
    pis: [
      { roles: ["AM"], pi: "more-risky-passes", why: "el 10 asume el riesgo de la transición" },
      { roles: ["AM"], pi: "move-into-channels", why: "aparece en los canales tras robar" },
      { roles: ["IF", "IW"], pi: "shoot-more", why: "los dos rápidos terminan la transición" },
      { roles: ["CD", "BPD"], pi: "fewer-risky-passes", why: "el central pasa corto y seguro" },
    ],
    levers: [
      { symptom: "Rival grande", instruction: "linea-presion-baja", effect: "bloque bajo y línea baja", remove: ["linea-presion-media", "linea-presion-alta"] },
      { symptom: "Rival inferior", instruction: "linea-presion-alta", effect: "bloque alto con gatillo estándar", remove: ["linea-presion-media", "linea-presion-baja", "presionar-menos"] },
    ],
    evolution: [
      { kind: "role", codes: ["DM", "A", "HB", "DLP"], min: 2, label: "doble pivote de contención" },
      { kind: "attr", positions: ["AMC"], attrs: ["Dec", "Vis"], min: 15, label: "mediapunta con Decisiones y Visión ≥ 15" },
      { kind: "attr", positions: ["AML", "AMR", "ML", "MR"], attrs: ["Pac", "Acc"], min: 15, label: "extremos con Velocidad ≥ 15" },
    ],
  },
  {
    id: "autobus",
    name: "Autobús (Park the bus)",
    en: "Park the Bus",
    description: "Defensa extrema: bloque bajo, compacto y sin prisa. Solo para situaciones concretas, no toda la temporada.",
    mentality: "Defensiva", mentalityId: "defensiva",
    instructions: ["ritmo-bajo", "perder-tiempo", "reagruparse", "mantener-forma", "linea-def-baja", "linea-presion-baja", "presionar-menos", "permitir-centros"],
    formations: ["4-1-4-1", "5-3-2", "4-4-1-1", "4-4-2"],
    attrs: { def: ["Mar", "Tck", "Pos", "Cnt", "Hea"], mid: ["Wor", "Pos", "Tck", "Tea", "Sta"], att: ["Wor", "Str", "Hea", "Pac", "Bra"] },
    roles: { favor: ["CD", "FB", "DW", "DM", "A", "HB", "DLP", "PF", "P", "DLF"], avoid: ["TQ", "EG", "RPM", "CWB", "AP", "SK", "L", "MEZ"] },
    strengths: ["Organización defensiva máxima", "Rompe el ritmo rival", "Protege resultados al final"],
    weaknesses: ["Totalmente reactivo", "Sufre contra equipos pacientes", "Feo y desmoralizante a la larga"],
    when: "Proteger un resultado en el tramo final, permanencia o rivales muy superiores. Deberes de defender atrás y máximo un organizador.",
    family: "contra", parent: "bloque-bajo", origin: "Preset del juego",
    principles: ["Todo el mundo detrás del balón", "Permitir centros: el área está llena"],
    posesion: 0, forma: "4-5-1 bajo", motor: "bajo", motorNote: "La versión pasiva rinde mal; solo para tramos finales.",
    signature: [{ codes: ["CD"], label: "centrales que ganan por arriba" }, { codes: ["DM", "A", "HB"], label: "pivote de contención" }],
    manMarking: true,
    levers: [],
    evolution: [],
  },
  {
    id: "catenaccio",
    name: "Catenaccio",
    en: "Catenaccio",
    description: "Superioridad numérica atrás con líbero, defensa zonal disciplinada y contras directos con carrileros que suben.",
    mentality: "Defensiva", mentalityId: "defensiva",
    instructions: ["pases-directos", "mas-disciplina", "reagruparse", "contraatacar", "distribuir-rapido", "linea-def-baja", "linea-presion-baja", "presionar-menos"],
    formations: ["5-3-2", "3-4-2-1", "3-4-3", "4-4-2", "4-3-1-2"],
    attrs: { def: ["Pos", "Mar", "Ant", "Cnt", "Dec"], mid: ["Wor", "Pos", "Pas", "Tck", "Tea"], att: ["Pac", "OtB", "Fin", "Str", "Ant"] },
    roles: { favor: ["L", "WCB", "NCB", "CD", "WB", "CWB", "REG", "BWM", "PF", "TF", "AF"], avoid: ["TQ", "EG", "AP", "HB", "SK", "RPM"] },
    strengths: ["El líbero tapa el espacio entre defensa y portero", "Frustra al rival con defensa disciplinada", "Contras con espacio por delante"],
    weaknesses: ["Necesita un líbero de verdad", "Muchos empates y fútbol aburrido", "Poca ambición ofensiva"],
    when: "Buscar solidez ante dominadores de la posesión, ligas de muchos empates o divisiones bajas.",
    family: "contra", parent: "bloque-bajo", origin: "Herrera (Inter años 60) · preset del juego",
    principles: ["Líbero detrás de la línea", "Marcaje al hombre por jugador con el líbero libre"],
    posesion: 0, forma: "5-3-2 con líbero", motor: "bajo", motorNote: "No aporta firma distinta al Reactivo de Mourinho salvo el líbero; la versión pasiva rinde mal.",
    signature: [{ codes: ["L"], label: "Líbero" }, { codes: ["WB", "CWB"], label: "carrileros que suben" }],
    manMarking: true,
    levers: [],
    evolution: [{ kind: "role", codes: ["L"], label: "un Líbero" }],
  },

  // =========================================================== Directo y bandas
  {
    id: "route-one",
    name: "Balón largo (Route one)",
    en: "Route One",
    description: "Saltar el medio campo con balones largos al referencia y centros tempranos; segundas jugadas y balón parado.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-mucho-mas-directos", "ritmo-alto", "amplitud-amplia", "centros-tempranos", "balon-parado", "gk-saque-largo", "gk-al-referencia", "reagruparse", "mantener-forma", "linea-def-baja", "linea-presion-media"],
    formations: ["5-3-2", "4-4-2", "4-4-1-1", "4-1-4-1", "4-2-4"],
    attrs: { def: ["Hea", "Str", "Pos", "Jum", "Pas"], mid: ["Wor", "Tea", "Pos", "Sta", "Hea"], att: ["Hea", "Jum", "Str", "Fin", "Bra"] },
    roles: { favor: ["TF", "WTF", "PF", "DW", "WM", "NCB", "FB", "GK"], avoid: ["DLP", "AP", "RPM", "EG", "TQ", "F9", "L", "REG", "IW", "IF"] },
    strengths: ["Mínima exigencia técnica", "Salta medios campos organizados y presiones altas", "Aprovecha ventaja física y aérea"],
    weaknesses: ["Previsible y con poca creatividad", "Sufre ante defensas compactas", "Depende del balón parado"],
    when: "Equipos técnicamente inferiores, recién ascendidos, contra presiones altas o en los últimos minutos.",
    family: "directo", parent: null, origin: "Preset del juego · Brentford (Chutar en largo + Buscar balón parado)",
    principles: ["Saltar el medio campo al referencia", "Segundas jugadas y balón parado"],
    posesion: 0, forma: "4-4-2 directo", motor: "medio",
    signature: [{ codes: ["TF", "WTF"], label: "Delantero objetivo" }, { codes: ["DW", "WM"], label: "bandas que trabajan" }],
    levers: [],
    evolution: [{ kind: "role", codes: ["TF", "WTF"], label: "un Delantero objetivo" }],
  },
  {
    id: "bandas",
    name: "Juego por bandas",
    en: "Wing Play",
    description: "Estirar al rival por fuera con laterales que doblan y extremos que centran a un delantero alto.",
    mentality: "Equilibrada", mentalityId: "equilibrada",
    instructions: ["pases-directos", "ritmo-alto", "amplitud-amplia", "pasar-espacio", "centros-tempranos", "desmarque-fuera-izq", "desmarque-fuera-der", "gk-a-bandas", "reagruparse", "contraatacar", "linea-presion-media"],
    formations: ["4-4-2", "5-3-2", "4-3-3-flat", "4-2-3-1-mc", "4-2-4"],
    attrs: { def: ["Cro", "Pac", "Sta", "Wor", "Pos"], mid: ["Cro", "Dri", "Pac", "OtB", "Wor"], att: ["Hea", "Jum", "Str", "OtB", "Fin"] },
    roles: { favor: ["TF", "CF", "AF", "DLF", "PF", "W", "WB", "CWB", "FB", "MEZ", "WM"], avoid: ["IW", "IF", "WP", "NFB", "IWB", "NCB", "F9"] },
    strengths: ["Estira la defensa horizontalmente", "Usa la velocidad por fuera", "Eficaz contra defensas cerradas por dentro"],
    weaknesses: ["Previsible (todo por fuera)", "Depende de la calidad de los centros", "Poca creatividad central"],
    when: "Delantero alto y extremos rápidos que centran bien; contra defensas estrechas.",
    family: "directo", parent: null, origin: "Preset del juego",
    principles: ["Laterales que doblan y extremos que centran", "Un delantero alto que remate"],
    posesion: 0, forma: "4-2-4 amplio", motor: "medio",
    signature: [{ codes: ["W"], label: "extremos puros" }, { codes: ["TF", "CF"], label: "delantero alto" }, { codes: ["WB", "CWB"], label: "laterales que doblan" }],
    levers: [],
    evolution: [],
  },
  {
    id: "carrileros-directos",
    name: "Carrileros directos (Conte)",
    en: "Direct wing-backs (Conte)",
    description: "Defensa de tres con centrales cómodos con balón; carrileros completos que dan toda la anchura y sirven para saltarse el medio campo; secuencias ensayadas central abierto → carrilero → interior o punta.",
    mentality: "Positiva", mentalityId: "positiva",
    instructions: ["pases-directos", "ritmo-alto", "amplitud-muy-amplia", "desmarque-fuera-izq", "desmarque-fuera-der", "centros-mixtos", "explotar-bandas", "contraatacar", "reagruparse", "linea-presion-media", "presionar-mas", "presionar-fuera", "evitar-centros"],
    formations: ["3-5-2", "3-4-3", "5-3-2", "3-4-2-1"],
    attrs: { def: ["Pas", "Pos", "Pac", "Hea", "Cmp"], mid: ["Sta", "Cro", "Wor", "Pac", "Pos"], att: ["Fin", "OtB", "Str", "Hea", "Acc"] },
    roles: { favor: ["WCB", "CWB", "WB", "CM", "MEZ", "TF", "DLF", "AF", "SS", "AM", "BPD", "CD"], avoid: ["IWB", "IFB", "IW", "IF", "L", "TQ", "RPM", "F9", "NFB"] },
    strengths: ["Tres centrales dan la cuña sin instrucciones", "Los carrileros son extremos y laterales a la vez", "Secuencias ensayadas que el rival ve venir y no para"],
    weaknesses: ["Carrileros con Resistencia de élite o nada", "Sin referencia arriba los centros no valen", "Presionar fuera con solo dos jugadores de banda cansa"],
    when: "Tres centrales, dos carrileros con Resistencia y Centros ≥ 14 y una referencia arriba.",
    family: "directo", parent: "bandas", origin: "Conte (Juve, Chelsea, Inter, Nápoles)",
    principles: ["Central lateral en apoyo que conduce y saca el balón", "Carrileros completos que dan toda la anchura", "Referencia + móvil arriba, o dos interiores tras un punta"],
    posesion: 0, forma: "3-2-5 con carrileros", motor: "alto",
    signature: [{ codes: ["WCB"], label: "Central lateral que conduce" }, { codes: ["CWB"], label: "dos Carrileros completos" }, { codes: ["TF", "DLF"], label: "Delantero objetivo o Segundo delantero" }, { codes: ["AF", "SS"], label: "punta móvil" }],
    pis: [{ roles: ["CWB", "WB"], pi: "cross-more", why: "los carrileros son la fuente de centros" }, { roles: ["WCB"], pi: "dribble-more", why: "el central abierto conduce para atraer y soltar al carrilero" }],
    levers: [{ symptom: "El rival dobla a tus carrileros", instruction: "explotar-centro", effect: "los interiores tras el punta reciben entre líneas", remove: ["explotar-bandas"] }],
    evolution: [
      { kind: "role", codes: ["CD", "BPD", "WCB", "NCB", "L"], min: 3, label: "tres centrales" },
      { kind: "role", codes: ["WB", "CWB"], min: 2, label: "dos carrileros" },
      { kind: "attr", positions: ["WBL", "WBR", "DL", "DR"], attrs: ["Sta", "Cro"], min: 14, label: "carrileros con Resistencia y Centros ≥ 14" },
    ],
  },
];

export const STYLE_BY_ID: Record<string, StylePreset> = Object.fromEntries(STYLE_PRESETS.map((s) => [s.id, s]));
// Id antiguo de "Juego directo por bandas" en tácticas ya guardadas.
STYLE_BY_ID.directo = STYLE_BY_ID.bandas;

/** Estilos agrupados por familia, en el orden del catálogo. */
export const STYLES_BY_FAMILY: Record<StyleFamily, StylePreset[]> = { posesion: [], presion: [], contra: [], directo: [] };
for (const s of STYLE_PRESETS) STYLES_BY_FAMILY[s.family].push(s);

/** Hijos directos de un estilo (a qué puede evolucionar). */
export function styleChildren(id: string): StylePreset[] {
  return STYLE_PRESETS.filter((s) => s.parent === id);
}

// ---------------------------------------------------------------------------
// Perfil por fases derivado de las instrucciones (nombres reales del juego)
// ---------------------------------------------------------------------------

export interface StyleProfile {
  /** -2 … 2 sobre el estándar. */
  pases: number;
  ritmo: number;
  amplitud: number;
  lineaDef: number;
  gatillo: number;
  bloque: "bajo" | "medio" | "alto";
  transDef: "contrapresion" | "reagruparse" | null;
  transAtq: "contra" | "dibujo" | null;
  estiloPresion: "dentro" | "fuera" | null;
  lineaAjuste: "adelantarse" | "retroceder" | null;
  centros: "evitar" | "permitir" | null;
}

const LEVEL: Record<string, number> = {
  "pases-mucho-mas-cortos": -2, "pases-cortos": -1, "pases-directos": 1, "pases-mucho-mas-directos": 2,
  "ritmo-mucho-mas-bajo": -2, "ritmo-bajo": -1, "ritmo-alto": 1, "ritmo-mucho-mas-alto": 2,
  "amplitud-muy-estrecha": -2, "amplitud-estrecha": -1, "amplitud-amplia": 1, "amplitud-muy-amplia": 2,
  "linea-def-mucho-mas-baja": -2, "linea-def-baja": -1, "linea-def-alta": 1, "linea-def-mucho-mas-alta": 2,
  "presionar-mucho-menos": -2, "presionar-menos": -1, "presionar-mas": 1, "presionar-mucho-mas": 2,
};

export function profileOf(instructions: string[]): StyleProfile {
  const has = (id: string) => instructions.includes(id);
  const lvl = (prefix: string) => instructions.filter((i) => i.startsWith(prefix) && LEVEL[i] != null).map((i) => LEVEL[i])[0] ?? 0;
  return {
    pases: lvl("pases-"),
    ritmo: lvl("ritmo-"),
    amplitud: lvl("amplitud-"),
    lineaDef: lvl("linea-def-"),
    gatillo: lvl("presionar-m"),
    bloque: has("linea-presion-baja") ? "bajo" : has("linea-presion-alta") ? "alto" : "medio",
    transDef: has("contrapresionar") ? "contrapresion" : has("reagruparse") ? "reagruparse" : null,
    transAtq: has("contraatacar") ? "contra" : has("mantener-forma") ? "dibujo" : null,
    estiloPresion: has("presionar-dentro") ? "dentro" : has("presionar-fuera") ? "fuera" : null,
    lineaAjuste: has("adelantarse-mas") ? "adelantarse" : has("retroceder-mas") ? "retroceder" : null,
    centros: has("evitar-centros") ? "evitar" : has("permitir-centros") ? "permitir" : null,
  };
}

export interface StyleTraits { possession: boolean; pressing: boolean; counter: boolean; deep: boolean }

/**
 * Rasgos clásicos del estilo, derivados del perfil: posesión (posesion ≥ 1),
 * presión (contrapresión, bloque alto o gatillo alto), contra («A la contra»)
 * y espera (línea o bloque bajos). Sin estilo todo es false.
 */
export function styleTraits(styleId: string | null | undefined): StyleTraits {
  const s = STYLE_BY_ID[styleId ?? ""];
  if (!s) return { possession: false, pressing: false, counter: false, deep: false };
  const p = profileOf(s.instructions);
  return {
    possession: s.posesion >= 1,
    pressing: p.transDef === "contrapresion" || p.bloque === "alto" || p.gatillo >= 1,
    counter: p.transAtq === "contra",
    deep: p.lineaDef <= -1 || p.bloque === "bajo",
  };
}

/** Palancas para un estilo: las comunes más las suyas. */
export function styleLevers(styleId: string | null | undefined): Lever[] {
  const s = STYLE_BY_ID[styleId ?? ""];
  return [...(s?.levers ?? []), ...COMMON_LEVERS];
}
