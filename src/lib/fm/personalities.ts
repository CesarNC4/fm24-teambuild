/**
 * Personalidades y trato con la prensa de FM24, con los atributos ocultos que
 * las definen (guía de personalidades de FM Scout). Sirven para clasificar
 * mentores/aprendices y para saber qué esconde cada etiqueta del juego.
 *
 * Los nombres en español se reconocen por expresión regular porque la
 * traducción del juego varía ligeramente entre versiones.
 */

export type HiddenKey = "Amb" | "Det" | "Loy" | "Pre" | "Pro" | "Spo" | "Tem" | "Ctr";

export const HIDDEN_LABEL: Record<HiddenKey, string> = {
  Amb: "Ambición",
  Det: "Determinación",
  Loy: "Lealtad",
  Pre: "Presión",
  Pro: "Profesionalidad",
  Spo: "Deportividad",
  Tem: "Temperamento",
  Ctr: "Polémica",
};

/** 0 = pésima … 8 = élite. */
export type PersonalityTierLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const TIER_LABEL: Record<PersonalityTierLevel, string> = {
  8: "Élite",
  7: "Excelente",
  6: "Muy buena",
  5: "Buena",
  4: "Media",
  3: "Neutra",
  2: "Floja",
  1: "Mala",
  0: "Pésima",
};

export interface PersonalityDef {
  id: string;
  en: string;
  es: string;
  match: RegExp;
  tier: PersonalityTierLevel;
  /** Rangos de atributos ocultos que produce la etiqueta. */
  hidden: Partial<Record<HiddenKey, [number, number]>>;
  /** Qué implica para desarrollo, tutorías y vestuario. */
  note: string;
}

export const PERSONALITIES: PersonalityDef[] = [
  { id: "model-citizen", en: "Model Citizen", es: "Ciudadano modelo", match: /ciudadano (modelo|ejemplar)|model citizen/i, tier: 8, hidden: { Amb: [12, 20], Det: [14, 20], Loy: [15, 20], Pre: [14, 20], Pro: [15, 20], Spo: [15, 20], Tem: [15, 20] }, note: "Lo mejor que existe: entrena al máximo, no da problemas y es el mentor ideal." },
  { id: "born-leader", en: "Born Leader", es: "Líder nato", match: /l[ií]der nato|born leader/i, tier: 8, hidden: { Amb: [20, 20], Det: [20, 20] }, note: "Determinación y ambición máximas; capitán y mentor de referencia." },
  { id: "charismatic-leader", en: "Charismatic Leader", es: "Líder carismático", match: /l[ií]der carism|charismatic leader/i, tier: 8, hidden: { Spo: [18, 20], Tem: [18, 20] }, note: "Vestuario tranquilo y deportivo; excelente capitán y mentor." },
  { id: "perfectionist", en: "Perfectionist", es: "Perfeccionista", match: /perfeccionista|perfectionist/i, tier: 7, hidden: { Amb: [14, 20], Det: [14, 20], Pro: [14, 20], Tem: [1, 9] }, note: "Desarrolla muy bien, pero el temperamento bajo hace que reaccione mal a críticas y derrotas." },
  { id: "resolute", en: "Resolute", es: "Resuelto", match: /resuelt|resolute/i, tier: 7, hidden: { Det: [15, 17], Pre: [1, 16], Pro: [15, 20], Spo: [12, 20] }, note: "Profesional y decidido; gran mentor. Puede sufrir bajo presión." },
  { id: "driven", en: "Driven", es: "Motivado", match: /motivad|driven/i, tier: 6, hidden: { Amb: [12, 20], Det: [17, 20] }, note: "Determinación altísima; la profesionalidad no está garantizada, mira cómo entrena." },
  { id: "determined", en: "Determined", es: "Decidido", match: /^decidid|^determined/i, tier: 6, hidden: { Amb: [1, 11], Det: [17, 20] }, note: "Determinación altísima con ambición baja: se queda en el club y trabaja." },
  { id: "iron-willed", en: "Iron Willed", es: "Voluntad de hierro", match: /hierro|iron.?willed/i, tier: 6, hidden: { Det: [15, 17], Pre: [20, 20], Spo: [5, 20] }, note: "Presión máxima: rinde en partidos grandes." },
  { id: "resilient", en: "Resilient", es: "Resistente", match: /resistente|resilient/i, tier: 6, hidden: { Amb: [8, 20], Det: [15, 17], Pre: [17, 20], Spo: [5, 20] }, note: "Aguanta la presión y la mala racha." },
  { id: "model-professional", en: "Model Professional", es: "Profesional modelo", match: /profesional (modelo|ejemplar)|model professional/i, tier: 6, hidden: { Pro: [20, 20], Tem: [10, 20] }, note: "Profesionalidad máxima: el mejor desarrollo posible y mentor ideal para contagiarla." },
  { id: "professional", en: "Professional", es: "Profesional", match: /^profesional$|^professional$/i, tier: 5, hidden: { Pro: [18, 20], Tem: [10, 20] }, note: "Entrena muy bien y transmite profesionalidad como mentor." },
  { id: "fairly-professional", en: "Fairly Professional", es: "Bastante profesional", match: /bastante profesional|fairly professional/i, tier: 5, hidden: { Amb: [1, 14], Pro: [15, 20] }, note: "Buena profesionalidad; le falta ambición para el salto." },
  { id: "spirited", en: "Spirited", es: "Con espíritu", match: /esp[ií]ritu|animoso|con car[aá]cter|spirited/i, tier: 5, hidden: { Amb: [1, 17], Pre: [15, 20], Pro: [11, 17], Spo: [1, 14], Tem: [10, 20] }, note: "Aguanta la presión; deportividad baja (más tarjetas)." },
  { id: "leader", en: "Leader", es: "Líder", match: /^l[ií]der$|^leader$/i, tier: 5, hidden: {}, note: "Liderazgo alto; buen capitán aunque la etiqueta no garantiza profesionalidad." },
  { id: "fairly-determined", en: "Fairly Determined", es: "Bastante decidido", match: /bastante decidid|fairly determined/i, tier: 4, hidden: { Det: [15, 17], Pre: [1, 16], Pro: [1, 14], Spo: [5, 20] }, note: "Determinación buena pero profesionalidad ≤14: desarrollo medio, no mentor." },
  { id: "very-ambitious", en: "Very Ambitious", es: "Muy ambicioso", match: /muy ambicios|very ambitious/i, tier: 4, hidden: { Amb: [20, 20], Det: [1, 17], Loy: [1, 10] }, note: "Querrá irse a un club mayor; como mentor contagia ambición pero también lealtad baja." },
  { id: "ambitious", en: "Ambitious", es: "Ambicioso", match: /^ambicios|^ambitious/i, tier: 4, hidden: { Amb: [16, 20], Det: [1, 17], Loy: [1, 10] }, note: "Ambición alta y lealtad baja: pide más minutos y mejores contratos; contagia lealtad baja al tutelar." },
  { id: "fairly-ambitious", en: "Fairly Ambitious", es: "Bastante ambicioso", match: /bastante ambicios|fairly ambitious/i, tier: 4, hidden: { Amb: [15, 20], Det: [1, 14], Pro: [1, 14] }, note: "Determinación y profesionalidad ≤14: desarrollo medio; aprendiz, no mentor." },
  { id: "jovial", en: "Jovial", es: "Jovial", match: /jovial/i, tier: 4, hidden: { Amb: [1, 17], Pre: [15, 20], Pro: [1, 10], Spo: [1, 14], Tem: [10, 20] }, note: "Profesionalidad ≤10: entrena poco. Buen carácter pero mal desarrollo." },
  { id: "light-hearted", en: "Light-Hearted", es: "Despreocupado", match: /despreocupad|light.?hearted/i, tier: 4, hidden: { Amb: [1, 17], Pre: [15, 20], Pro: [1, 17], Spo: [15, 20], Tem: [10, 20] }, note: "Buen compañero; desarrollo variable." },
  { id: "balanced", en: "Balanced", es: "Equilibrado", match: /equilibrad|balanced/i, tier: 3, hidden: { Amb: [1, 14], Det: [1, 14], Loy: [1, 14], Pro: [1, 14], Spo: [1, 14] }, note: "Todo ≤14: nada destaca. Candidato a aprendiz para subir determinación y profesionalidad." },
  { id: "devoted", en: "Devoted", es: "Devoto", match: /devot/i, tier: 3, hidden: { Amb: [5, 8], Det: [18, 20], Loy: [20, 20] }, note: "Lealtad máxima y determinación alta; ambición baja. Mentor útil para fijar jóvenes al club." },
  { id: "very-loyal", en: "Very Loyal", es: "Muy leal", match: /muy leal|very loyal/i, tier: 3, hidden: { Loy: [18, 20] }, note: "Se queda pase lo que pase; el resto no está garantizado." },
  { id: "loyal", en: "Loyal", es: "Leal", match: /^leal$|^loyal$/i, tier: 3, hidden: { Amb: [1, 7], Det: [6, 17], Loy: [17, 19] }, note: "Lealtad alta, ambición baja." },
  { id: "fairly-loyal", en: "Fairly Loyal", es: "Bastante leal", match: /bastante leal|fairly loyal/i, tier: 3, hidden: { Amb: [6, 14], Det: [1, 14], Loy: [15, 20], Pro: [1, 14] }, note: "Determinación y profesionalidad ≤14: desarrollo medio; aprendiz." },
  { id: "honest", en: "Honest", es: "Honesto", match: /honest/i, tier: 3, hidden: { Amb: [1, 10], Pro: [5, 20], Spo: [20, 20] }, note: "Deportividad máxima; ambición baja." },
  { id: "sporting", en: "Sporting", es: "Deportivo", match: /^deportiv|^sporting/i, tier: 3, hidden: { Amb: [1, 10], Pro: [8, 20], Spo: [18, 20] }, note: "Muy deportivo; ambición baja." },
  { id: "fairly-sporting", en: "Fairly Sporting", es: "Bastante deportivo", match: /bastante deportiv|fairly sporting/i, tier: 3, hidden: { Amb: [1, 14], Det: [1, 14], Loy: [1, 14], Pro: [1, 14], Spo: [15, 20] }, note: "Todo ≤14 salvo deportividad." },
  { id: "unambitious", en: "Unambitious", es: "Poco ambicioso", match: /poco ambicios|sin ambici|unambitious/i, tier: 2, hidden: { Amb: [1, 5], Det: [1, 17], Loy: [11, 20] }, note: "Se conforma; difícil que dé el salto de nivel." },
  { id: "easily-discouraged", en: "Easily Discouraged", es: "Se desanima fácilmente", match: /desanima|easily discouraged/i, tier: 1, hidden: { Amb: [1, 10], Det: [1, 1], Pro: [5, 20], Spo: [1, 17] }, note: "Determinación 1: se hunde con cualquier revés. Aprendiz prioritario con mentores decididos." },
  { id: "low-determination", en: "Low Determination", es: "Poca determinación", match: /poca determinaci|low determination/i, tier: 1, hidden: { Amb: [1, 10], Det: [1, 5], Pro: [5, 20], Spo: [1, 17] }, note: "Determinación ≤5: tutoría con mentores de determinación alta." },
  { id: "spineless", en: "Spineless", es: "Sin agallas", match: /sin agallas|cobarde|spineless/i, tier: 1, hidden: { Det: [1, 10], Pre: [1, 1], Pro: [5, 20], Spo: [1, 17] }, note: "Presión 1: desaparece en partidos importantes." },
  { id: "low-self-belief", en: "Low Self-Belief", es: "Poca confianza", match: /poca confianza|poca autoestima|low self/i, tier: 1, hidden: { Det: [1, 10], Pre: [1, 3], Pro: [5, 20], Spo: [1, 17] }, note: "No aguanta la presión ni las críticas: elogia, no critiques." },
  { id: "slack", en: "Slack", es: "Vago", match: /vago|slack/i, tier: 0, hidden: { Det: [1, 9], Pro: [1, 1], Tem: [5, 20] }, note: "Profesionalidad 1: no entrena. Contagia al vestuario; vende o tutela con urgencia." },
  { id: "casual", en: "Casual", es: "Informal", match: /informal|relajad|casual/i, tier: 0, hidden: { Det: [1, 9], Pro: [1, 4], Tem: [5, 20] }, note: "Profesionalidad ≤4: desarrollo casi nulo." },
  { id: "temperamental", en: "Temperamental", es: "Temperamental", match: /temperamental/i, tier: 0, hidden: { Pro: [1, 10], Tem: [1, 4] }, note: "Explota con críticas y suplencias; profesionalidad baja." },
  { id: "fickle", en: "Fickle", es: "Voluble", match: /voluble|inconstante|fickle/i, tier: 0, hidden: { Amb: [15, 20], Det: [1, 14], Loy: [1, 14], Pro: [1, 14] }, note: "Ambicioso sin determinación ni lealtad: pedirá irse en cuanto pueda." },
  { id: "mercenary", en: "Mercenary", es: "Mercenario", match: /mercenari/i, tier: 0, hidden: { Amb: [16, 20], Det: [1, 17], Loy: [1, 3] }, note: "Lealtad ≤3: solo mira el contrato. Nunca como mentor." },
];

export function findPersonality(label: string | null): PersonalityDef | null {
  if (!label) return null;
  const t = label.trim();
  // Las etiquetas compuestas ("Bastante decidido") deben ganar a las simples
  // ("Decidido"): las simples van ancladas con ^ y el resto se prueba en orden.
  return PERSONALITIES.find((p) => p.match.test(t)) ?? null;
}

export function personalityTierLevel(label: string | null): PersonalityTierLevel {
  return findPersonality(label)?.tier ?? 3;
}

/** Texto corto con los atributos ocultos que fija la etiqueta. */
export function hiddenSummary(hidden: Partial<Record<HiddenKey, [number, number]>>): string {
  return (Object.entries(hidden) as [HiddenKey, [number, number]][])
    .map(([k, [lo, hi]]) => `${HIDDEN_LABEL[k]} ${lo === hi ? lo : `${lo}-${hi}`}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Trato con la prensa: también revela atributos ocultos
// ---------------------------------------------------------------------------

export interface MediaStyleDef {
  id: string;
  en: string;
  es: string;
  match: RegExp;
  hidden: Partial<Record<HiddenKey, [number, number]>>;
  note: string;
}

export const MEDIA_STYLES: MediaStyleDef[] = [
  { id: "confrontational", en: "Confrontational", es: "Le gusta provocar", match: /provocar|confrontational/i, hidden: { Ctr: [15, 20], Tem: [1, 4] }, note: "Polémico y de temperamento bajo: reacciona mal a críticas públicas." },
  { id: "outspoken", en: "Outspoken", es: "Franco", match: /^franco|outspoken/i, hidden: { Ctr: [15, 20] }, note: "Dice lo que piensa a la prensa; cuidado con las charlas y los rumores." },
  { id: "short-tempered", en: "Short-Tempered", es: "Irascible", match: /irascible|short.?tempered/i, hidden: { Tem: [1, 4] }, note: "Temperamento ≤4: salta con críticas y suplencias." },
  { id: "volatile", en: "Volatile", es: "Volátil", match: /vol[aá]til|volatile/i, hidden: { Tem: [1, 6] }, note: "Temperamento bajo: elogia en privado, no critiques en público." },
  { id: "reserved", en: "Reserved", es: "Reservado", match: /reservad|reserved/i, hidden: { Ctr: [1, 5], Pro: [15, 20], Tem: [7, 20] }, note: "Profesionalidad ≥15 oculta: mejor de lo que dice su personalidad." },
  { id: "level-headed", en: "Level-Headed", es: "Mente equilibrada", match: /mente equilibrada|level.?headed/i, hidden: { Ctr: [1, 14], Tem: [7, 20], Loy: [11, 20] }, note: "Lealtad ≥11 y temperamento estable." },
  { id: "media-friendly", en: "Media-Friendly", es: "Respetuoso con la prensa", match: /respetuos|media.?friendly/i, hidden: {}, note: "Sin polémica; neutro." },
  { id: "evasive", en: "Evasive", es: "Evasivo", match: /evasiv/i, hidden: { Ctr: [6, 14], Pre: [15, 20], Pro: [15, 20], Tem: [7, 14] }, note: "Profesionalidad y presión ≥15 ocultas: gran señal aunque la personalidad sea neutra." },
  { id: "unflappable", en: "Unflappable", es: "Imperturbable", match: /imperturbable|unflappable/i, hidden: { Pre: [15, 20], Tem: [15, 20] }, note: "Aguanta presión y no pierde los nervios." },
];

/** El juego puede listar varios estilos separados por coma. */
export function findMediaStyles(label: string | null): MediaStyleDef[] {
  if (!label) return [];
  return label
    .split(",")
    .map((x) => x.trim())
    .map((x) => MEDIA_STYLES.find((m) => m.match.test(x)))
    .filter((m): m is MediaStyleDef => !!m);
}

/**
 * Rango combinado de un atributo oculto, cruzando personalidad y trato con la
 * prensa (ambos acotan el mismo valor). null si nada lo acota.
 */
export function hiddenRange(p: { personality: string | null; mediaHandling: string | null }, key: HiddenKey): [number, number] | null {
  const ranges: [number, number][] = [];
  const per = findPersonality(p.personality)?.hidden[key];
  if (per) ranges.push(per);
  for (const m of findMediaStyles(p.mediaHandling)) {
    const r = m.hidden[key];
    if (r) ranges.push(r);
  }
  if (!ranges.length) return null;
  const lo = Math.max(...ranges.map((r) => r[0]));
  const hi = Math.min(...ranges.map((r) => r[1]));
  // Etiquetas incompatibles entre sí (pasa con estilos de prensa combinados): se devuelve la más amplia.
  return lo <= hi ? [lo, hi] : [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))];
}

/** Perfil completo para la interfaz. */
export function hiddenProfile(p: { personality: string | null; mediaHandling: string | null }): Partial<Record<HiddenKey, [number, number]>> {
  const out: Partial<Record<HiddenKey, [number, number]>> = {};
  for (const k of Object.keys(HIDDEN_LABEL) as HiddenKey[]) {
    const r = hiddenRange(p, k);
    if (r) out[k] = r;
  }
  return out;
}
