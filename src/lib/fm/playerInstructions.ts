/**
 * Instrucciones individuales de jugador de FM24 y sugerencias por titular.
 *
 * Catálogo según la guía de Passion4FM
 * (https://www.passion4fm.com/football-manager-player-instructions/) con los
 * nombres reales del panel de FM24 en español: cada instrucción con los
 * atributos de los que depende y su grupo de exclusión.
 * Las sugerencias combinan rol, estilo de la táctica, atributos del jugador,
 * pie fuerte y rasgos (si un rasgo ya cubre la instrucción, es redundante; si
 * la contradice, se avisa).
 */

import type { AttrKey } from "./attributes";
import type { RoleDef } from "./roles";
import { TRAIT_BY_ID, type TraitDef } from "./traits";
import type { Player, PositionSlot } from "./types";
import { STYLE_BY_ID, styleTraits } from "./instructions";
import { roleDefaults } from "./roleInstructions";

export type PIGroup =
  | "movimiento" | "anchura" | "canales" | "libertad" | "aguantar"
  | "tiro" | "regate" | "conduccion" | "longitud-pase" | "riesgo-pase"
  | "centro-cuando" | "centro-desde" | "centro-donde" | "presion" | "entradas" | "marcaje" | "gk-distribucion";

export interface PlayerInstruction {
  id: string;
  es: string;
  en: string;
  group: PIGroup;
  attrs: AttrKey[];
  gk?: boolean;
}

export const PLAYER_INSTRUCTIONS: PlayerInstruction[] = [
  // Movimiento
  { id: "get-further-forward", es: "Subir más", en: "Get Further Forward", group: "movimiento", attrs: ["OtB", "Sta", "Wor"] },
  { id: "hold-position", es: "Mantener posición", en: "Hold Position", group: "movimiento", attrs: ["Pos", "Cnt"] },
  { id: "stay-wider", es: "Abrirse a banda", en: "Stay Wider", group: "anchura", attrs: ["Cro", "OtB"] },
  { id: "sit-narrower", es: "Situarse más cerrado", en: "Sit Narrower", group: "anchura", attrs: ["OtB", "Tea"] },
  { id: "move-into-channels", es: "Moverse entre líneas", en: "Move Into Channels", group: "canales", attrs: ["OtB", "Acc", "Ant", "Dec"] },
  { id: "roam", es: "Variar la posición", en: "Roam From Position", group: "libertad", attrs: ["Fla", "Pos", "Dec"] },
  // Posesión
  { id: "hold-up-ball", es: "Aguantar el balón", en: "Hold Up Ball", group: "aguantar", attrs: ["Str", "Fir", "Ant"] },
  { id: "shoot-more", es: "Disparar más a menudo", en: "Shoot More Often", group: "tiro", attrs: ["Lon", "Tec", "Dec"] },
  { id: "shoot-less", es: "Disparar menos a menudo", en: "Shoot Less Often", group: "tiro", attrs: ["Dec", "Ant", "Vis"] },
  { id: "dribble-more", es: "Regatear más", en: "Dribble More", group: "regate", attrs: ["Dri", "Bal", "Fla", "Agi"] },
  { id: "dribble-less", es: "Regatear menos", en: "Dribble Less", group: "regate", attrs: ["Pas", "Tec", "Ant"] },
  { id: "run-wide", es: "Abrirse con el balón", en: "Run Wide With Ball", group: "conduccion", attrs: ["Dri", "Fla"] },
  { id: "cut-inside", es: "Recortar hacia dentro", en: "Cut Inside With Ball", group: "conduccion", attrs: ["Dri", "Dec", "Fla"] },
  // Distribución
  { id: "pass-shorter", es: "Pases más cortos", en: "Pass It Shorter", group: "longitud-pase", attrs: ["Pas", "Ant"] },
  { id: "more-direct-passes", es: "Pases más directos", en: "More Direct Passes", group: "longitud-pase", attrs: ["Pas", "Tec", "Dec"] },
  { id: "more-risky-passes", es: "Tomar más riesgos", en: "More Risky Passes", group: "riesgo-pase", attrs: ["Dec", "Vis", "Pas", "Tec"] },
  { id: "fewer-risky-passes", es: "Tomar menos riesgos", en: "Fewer Risky Passes", group: "riesgo-pase", attrs: ["Dec", "Pas"] },
  { id: "cross-more", es: "Centrar más a menudo", en: "Cross More Often", group: "centro-cuando", attrs: ["Cro", "Tec", "Ant"] },
  { id: "cross-less", es: "Centrar menos a menudo", en: "Cross Less Often", group: "centro-cuando", attrs: ["Pas", "Dec"] },
  { id: "cross-from-deep", es: "Centrar desde atrás", en: "Cross From Deep", group: "centro-desde", attrs: ["Cro", "Vis"] },
  { id: "cross-from-byline", es: "Centrar desde la cal", en: "Cross From Byline", group: "centro-desde", attrs: ["Cro", "Dri", "Acc"] },
  { id: "cross-aim-target", es: "Centrar hacia el delantero objetivo", en: "Cross Aim Target Man", group: "centro-donde", attrs: ["Cro"] },
  { id: "cross-aim-far", es: "Centrar al segundo palo", en: "Cross Aim Far Post", group: "centro-donde", attrs: ["Cro"] },
  { id: "cross-aim-near", es: "Centrar al primer palo", en: "Cross Aim Near Post", group: "centro-donde", attrs: ["Cro"] },
  { id: "cross-aim-centre", es: "Centrar al centro", en: "Cross Aim Centre", group: "centro-donde", attrs: ["Cro"] },
  // Defensa
  { id: "close-down-more", es: "Activar presión: más", en: "Close Down More", group: "presion", attrs: ["Agg", "Dec", "Tck", "Sta", "Wor"] },
  { id: "close-down-less", es: "Activar presión: menos", en: "Close Down Less", group: "presion", attrs: ["Pos", "Cnt", "Cmp", "Ant"] },
  { id: "tackle-harder", es: "Entrar más duro", en: "Tackle Harder", group: "entradas", attrs: ["Tck", "Agg", "Bra", "Dec"] },
  { id: "ease-off-tackles", es: "Suavizar entradas", en: "Ease Off Tackles", group: "entradas", attrs: ["Ant", "Cnt", "Tck"] },
  { id: "tight-marking", es: "Marcajes más férreos", en: "Tight Marking", group: "marcaje", attrs: ["Mar", "Str", "Cnt"] },
  // Portero
  { id: "gk-quick-throws", es: "Saques de mano rápidos", en: "Take Quick Throws", group: "gk-distribucion", attrs: ["Thr", "Ant"], gk: true },
  { id: "gk-long-kicks", es: "Saques largos", en: "Take Long Kicks", group: "gk-distribucion", attrs: ["Kic", "Tec", "Dec"], gk: true },
  { id: "gk-distribute-defenders", es: "Distribuir a los defensas", en: "Distribute To Defenders", group: "gk-distribucion", attrs: ["Ant", "Dec", "Kic", "Pas"], gk: true },
];

export const PI_BY_ID: Record<string, PlayerInstruction> = Object.fromEntries(PLAYER_INSTRUCTIONS.map((i) => [i.id, i]));

// ---------------------------------------------------------------------------
// Sugerencias
// ---------------------------------------------------------------------------

export interface PISuggestion {
  pi: PlayerInstruction;
  why: string;
  /** 1 (opcional) … 3 (muy recomendable). */
  strength: 1 | 2 | 3;
  /** Rasgo del jugador que ya hace lo mismo: la instrucción sobra. */
  coveredBy?: TraitDef;
  /** Rasgo del jugador que la contradice. */
  contradictedBy?: TraitDef;
}

export interface PIContext {
  slot: PositionSlot;
  role: RoleDef;
  styleId: string | null;
  traitIds: string[];
  /** Roles del resto del XI (para saber si hay referencia o rematadores aéreos). */
  teamRoles: RoleDef[];
  /** Mejor cabeceador entre los delanteros (Hea+Jum media). */
  strikerAerial: number;
  /** Mejor cabeceador entre los jugadores de banda contraria (para centrar al segundo palo). */
  farPostAerial?: number;
}

const COUNTER_STYLES = { has: (s: string) => styleTraits(s).counter && !styleTraits(s).possession };
const PRESS_STYLES = { has: (s: string) => styleTraits(s).pressing };
const POSSESSION_STYLES = { has: (s: string) => styleTraits(s).possession };
const DEEP_STYLES = { has: (s: string) => styleTraits(s).deep };

const WIDE_SLOTS: PositionSlot[] = ["ML", "MR", "AML", "AMR", "WBL", "WBR", "DL", "DR"];
const HOLDER_ROLES = new Set(["A-D", "DM-D", "HB-D", "DLP-D", "CM-D", "BWM-D", "DM-S"]);
/** Roles que por definición no deben subir más ni centrar (organizan o recortan). */
const NO_FORWARD_ROLES = new Set(["DLP", "REG", "HB", "A", "DM", "CAR"]);
const NO_CROSS_ROLES = new Set(["IF", "RMD", "AP", "WP", "TQ", "IWB", "IFB"]);
const TARGET_ROLES = new Set(["TF", "WTF"]);

function a(p: Player, k: AttrKey): number {
  return p.attrs[k]?.value ?? 0;
}

/** "Muy fuerte", "Fuerte", "Bastante fuerte" → fuerte. */
function footStrong(s: string | null): boolean {
  return !!s && /muy fuerte|^fuerte|bastante fuerte|very strong|^strong|fairly strong/i.test(s.trim());
}
function footWeak(s: string | null): boolean {
  return !!s && /d[ée]bil|weak|very poor/i.test(s);
}

export function suggestPlayerInstructions(p: Player, ctx: PIContext): PISuggestion[] {
  const out: PISuggestion[] = [];
  const add = (id: string, why: string, strength: 1 | 2 | 3) => out.push({ pi: PI_BY_ID[id], why, strength });
  const { slot, role, styleId } = ctx;
  const style = styleId ?? "";
  const rid = role.id;
  const code = role.code;
  const duty = role.duty;
  const isWide = WIDE_SLOTS.includes(slot);
  const isAtt = slot === "ST" || slot.startsWith("AM");
  const isMid = slot === "DM" || slot === "MC" || slot === "ML" || slot === "MR";
  const isDef = slot === "DC" || slot === "DL" || slot === "DR" || slot === "WBL" || slot === "WBR";
  const side: "L" | "R" | null = slot.endsWith("L") ? "L" : slot.endsWith("R") ? "R" : null;

  if (p.isGoalkeeper || slot === "GK") {
    if (COUNTER_STYLES.has(style) && a(p, "Thr") >= 13) add("gk-quick-throws", `Saques de mano ${a(p, "Thr")}: lanza el contragolpe rápido`, 3);
    if (POSSESSION_STYLES.has(style) || style === "gegenpress") {
      if (a(p, "Kic") >= 12 || a(p, "Pas") >= 12) add("gk-distribute-defenders", "estilo de salida de balón; el portero inicia corto", 2);
      else add("gk-distribute-defenders", `salida de balón, pero Saque de puerta ${a(p, "Kic")}: vigila los errores`, 1);
    }
    if (DEEP_STYLES.has(style) && a(p, "Kic") >= 13) add("gk-long-kicks", "bloque bajo/directo: saltar líneas con saque largo", 2);
    if (ctx.teamRoles.some((r) => TARGET_ROLES.has(r.code)) && a(p, "Kic") >= 12) add("gk-long-kicks", "hay un delantero referencia al que buscar", 2);
    return finalize(out, ctx);
  }

  // ---- Movimiento
  if (!HOLDER_ROLES.has(rid) && !NO_FORWARD_ROLES.has(code) && (isMid || slot === "DL" || slot === "DR") && duty !== "D" && a(p, "OtB") >= 13 && a(p, "Sta") >= 13 && a(p, "Wor") >= 12) {
    add("get-further-forward", `Desmarques ${a(p, "OtB")}, Resistencia ${a(p, "Sta")}: llega al área sin cansarse`, 2);
  }
  if (isWide && (code === "W" || code === "WM" || code === "DW") && COUNTER_STYLES.has(style)) {
    add("stay-wider", "extremo puro en estilo de contragolpe: estira el campo", 2);
  }
  if (isWide && (code === "IF" || code === "IW") && (POSSESSION_STYLES.has(style) || style === "gegenpress")) {
    add("sit-narrower", "extremo interior en estilo de presión/posesión: cierra el bloque y aparece entre líneas", 1);
  }
  if (isAtt && !TARGET_ROLES.has(code) && code !== "P" && a(p, "OtB") >= 13 && a(p, "Acc") >= 13 && a(p, "Ant") >= 12) {
    add("move-into-channels", `Desmarques ${a(p, "OtB")}, Aceleración ${a(p, "Acc")}: ataca el espacio entre central y lateral`, 3);
  }
  if (["AP", "AM", "F9", "CF", "MEZ", "RPM", "SS"].includes(code) && a(p, "Fla") >= 14 && a(p, "Dec") >= 13 && a(p, "OtB") >= 13) {
    add("roam", `Talento ${a(p, "Fla")}, Decisiones ${a(p, "Dec")}: aparece donde hay espacio`, 2);
  }

  // ---- Posesión
  if (["TF", "DLF", "CF", "WTF"].includes(code) && a(p, "Str") >= 13 && a(p, "Fir") >= 13 && !COUNTER_STYLES.has(style)) {
    add("hold-up-ball", `Fuerza ${a(p, "Str")}, Primer toque ${a(p, "Fir")}: aguanta para que suba el equipo`, 2);
  }
  if ((isAtt || slot === "MC" || slot === "DM") && a(p, "Lon") >= 15 && a(p, "Tec") >= 13 && !POSSESSION_STYLES.has(style)) {
    add("shoot-more", `Tiros lejanos ${a(p, "Lon")}: amenaza desde fuera`, 2);
  }
  if ((isAtt || isWide) && a(p, "Fin") <= 11 && a(p, "Lon") <= 11 && a(p, "Dec") >= 12 && !isDef) {
    add("shoot-less", `Remate ${a(p, "Fin")} y Tiros lejanos ${a(p, "Lon")} bajos: que busque el pase`, 2);
  }
  if ((isWide || isAtt) && a(p, "Dri") >= 14 && a(p, "Acc") >= 13 && a(p, "Agi") >= 13) {
    add("dribble-more", `Regate ${a(p, "Dri")}, Aceleración ${a(p, "Acc")}: rompe líneas en el uno contra uno`, COUNTER_STYLES.has(style) ? 3 : 2);
  }
  if ((isWide || isAtt || slot === "MC") && a(p, "Dri") <= 10 && a(p, "Pas") >= 12) {
    add("dribble-less", `Regate ${a(p, "Dri")}: que suelte el balón`, 2);
  }
  if (isWide && side && (slot.startsWith("AM") || slot.startsWith("M"))) {
    const opposite = side === "R" ? p.leftFoot : p.rightFoot;
    const same = side === "R" ? p.rightFoot : p.leftFoot;
    if (footStrong(opposite) && (code === "IF" || code === "IW" || code === "AP" || code === "WP") ) {
      add("cut-inside", `pie ${side === "R" ? "izquierdo" : "derecho"} fuerte en banda ${side === "R" ? "derecha" : "izquierda"}: recorta hacia dentro con naturalidad`, 2);
    } else if (footWeak(opposite) && (code === "IF" || code === "IW")) {
      add("run-wide", `pie ${side === "R" ? "izquierdo" : "derecho"} débil: recortar hacia dentro le lleva a su pierna mala`, 2);
    } else if (footStrong(same) && (code === "W" || code === "WM")) {
      add("run-wide", "extremo a pierna natural: desborda por fuera", 1);
    }
  }

  // ---- Distribución
  if ((isDef || isMid) && (POSSESSION_STYLES.has(style)) && a(p, "Pas") >= 12) {
    add("pass-shorter", "estilo de posesión: mantener el balón desde atrás", 1);
  }
  if ((isDef || slot === "DM" || slot === "MC") && COUNTER_STYLES.has(style) && a(p, "Pas") >= 13 && a(p, "Vis") >= 12 && !POSSESSION_STYLES.has(style)) {
    add("more-direct-passes", `Pases ${a(p, "Pas")}, Visión ${a(p, "Vis")}: puede lanzar la transición desde atrás`, 2);
  }
  if (["AP", "DLP", "AM", "MEZ", "IW", "TQ", "REG", "RPM", "EG", "WP", "DLF", "F9"].includes(code) && a(p, "Vis") >= 15 && a(p, "Pas") >= 14 && a(p, "Dec") >= 12) {
    add("more-risky-passes", `Visión ${a(p, "Vis")}, Pases ${a(p, "Pas")}: que intente el pase que rompe`, 3);
  }
  if ((HOLDER_ROLES.has(rid) || slot === "DC") && (a(p, "Vis") <= 11 || a(p, "Dec") <= 11) && a(p, "Pas") <= 13) {
    add("fewer-risky-passes", `Visión ${a(p, "Vis")}, Decisiones ${a(p, "Dec")}: pase seguro y a otra cosa`, 2);
  }
  if (isWide && !NO_CROSS_ROLES.has(code) && a(p, "Cro") >= 14 && ctx.strikerAerial >= 14) {
    add("cross-more", `Centros ${a(p, "Cro")} y delantera con juego aéreo (${ctx.strikerAerial.toFixed(0)})`, 3);
  }
  if (isWide && !NO_CROSS_ROLES.has(code) && a(p, "Cro") <= 10 && (a(p, "Pas") >= 12 || a(p, "Dri") >= 13)) {
    add("cross-less", `Centros ${a(p, "Cro")}: que combine o conduzca en vez de centrar`, 2);
  }
  if (isWide && !NO_CROSS_ROLES.has(code) && ctx.teamRoles.some((r) => TARGET_ROLES.has(r.code)) && a(p, "Cro") >= 12) {
    add("cross-aim-target", "hay un delantero referencia en el XI", 2);
  } else if (isWide && !NO_CROSS_ROLES.has(code) && ctx.strikerAerial >= 15 && a(p, "Cro") >= 13) {
    add("cross-aim-centre", `delantero con gran juego aéreo (${ctx.strikerAerial.toFixed(0)}): balón al centro del área`, 1);
  } else if (isWide && !NO_CROSS_ROLES.has(code) && (ctx.farPostAerial ?? 0) >= 14 && a(p, "Cro") >= 13) {
    add("cross-aim-far", `el extremo contrario cabecea bien (${ctx.farPostAerial!.toFixed(0)}): balón al segundo palo`, 1);
  }

  // ---- Defensa
  if ((isMid || isAtt) && PRESS_STYLES.has(style) && a(p, "Wor") >= 13 && a(p, "Sta") >= 13 && a(p, "Agg") >= 11) {
    add("close-down-more", `Sacrificio ${a(p, "Wor")}, Resistencia ${a(p, "Sta")}: puede presionar todo el partido`, 2);
  }
  if ((isMid || isAtt) && (a(p, "Wor") <= 10 || a(p, "Sta") <= 10)) {
    add("close-down-less", `Sacrificio ${a(p, "Wor")}, Resistencia ${a(p, "Sta")}: mejor que mantenga la posición que que corra en vano`, 2);
  } else if (DEEP_STYLES.has(style) && (isDef || slot === "DM") && a(p, "Pos") >= 13) {
    add("close-down-less", "bloque bajo: no romper la línea para presionar", 2);
  }
  if ((isDef || isMid) && a(p, "Tck") >= 14 && a(p, "Agg") >= 13 && a(p, "Bra") >= 13 && a(p, "Dec") >= 11 && ["BWM", "DM", "CD", "NCB", "PF"].includes(code)) {
    add("tackle-harder", `Entradas ${a(p, "Tck")}, Agresividad ${a(p, "Agg")}: gana los duelos`, 1);
  }
  if ((isDef || isMid) && (a(p, "Tck") <= 10 || (a(p, "Agg") >= 15 && a(p, "Dec") <= 11))) {
    add("ease-off-tackles", a(p, "Tck") <= 10 ? `Entradas ${a(p, "Tck")}: que no se tire al suelo` : `Agresividad ${a(p, "Agg")} con Decisiones ${a(p, "Dec")}: riesgo de tarjetas`, 2);
  }
  if ((slot === "DC" || slot === "DL" || slot === "DR") && a(p, "Mar") >= 14 && a(p, "Str") >= 13 && a(p, "Cnt") >= 12 && (DEEP_STYLES.has(style) || code === "CD" || code === "NCB")) {
    add("tight-marking", `Marcaje ${a(p, "Mar")}, Fuerza ${a(p, "Str")}: anula a su par`, 1);
  }

  // ---- Lo que pide el estilo (roles-firma, estáticos/móviles, hombre a hombre)
  const preset = STYLE_BY_ID[style];
  if (preset) {
    for (const spi of preset.pis ?? []) {
      if (!spi.roles.includes(code) || !PI_BY_ID[spi.pi]) continue;
      if (spi.pi === "cut-inside" && isWide && side && footWeak(side === "R" ? p.leftFoot : p.rightFoot)) continue;
      add(spi.pi, `${preset.name}: ${spi.why}`, 2);
    }
    if (preset.staticRoles?.includes(code) && !isDef && duty !== "A") add("hold-position", `${preset.name}: área de cooperación, sostiene la estructura`, 1);
    if (preset.mobileRoles?.includes(code) && a(p, "Dec") >= 12) add("roam", `${preset.name}: área de ayuda mutua, se acerca al balón`, 2);
    if (preset.manMarking && (isDef || slot === "DM" || slot === "MC")) {
      if (a(p, "Mar") >= 13) add("tight-marking", `${preset.name}: marcaje al hombre (Mar ${a(p, "Mar")})`, 2);
      else add("close-down-less", `Marcaje ${a(p, "Mar")}: en un estilo de marcaje al hombre, mejor que espere colocado que pegado a su par`, 1);
    }
  }

  return finalize(out, ctx);
}

/**
 * Quita lo que el juego no deja poner con el rol o que ya trae de serie,
 * elimina duplicados por grupo (se queda la más fuerte) y cruza con los rasgos.
 */
function finalize(list: PISuggestion[], ctx: Pick<PIContext, "role" | "slot" | "traitIds">): PISuggestion[] {
  const traitIds = ctx.traitIds;
  const def = roleDefaults(ctx.role.id, ctx.slot);
  const byGroup = new Map<PIGroup, PISuggestion>();
  for (const s of list.sort((x, y) => y.strength - x.strength)) {
    if (def && (def.blocked.includes(s.pi.id) || def.part.includes(s.pi.id))) continue;
    const cur = byGroup.get(s.pi.group);
    if (!cur) byGroup.set(s.pi.group, s);
  }
  const traits = traitIds.map((id) => TRAIT_BY_ID[id]).filter(Boolean);
  return [...byGroup.values()].slice(0, 5).map((s) => ({
    ...s,
    coveredBy: traits.find((t) => t.similarPI?.includes(s.pi.id)),
    contradictedBy: traits.find((t) => t.contrastPI?.includes(s.pi.id)),
  }));
}

/** Media de cabeceo y salto del mejor delantero del XI. */
export function strikerAerial(starters: { player: Player; slot: PositionSlot }[]): number {
  const fw = starters.filter((s) => s.slot === "ST");
  if (fw.length === 0) return 0;
  return Math.max(...fw.map((s) => ((s.player.attrs.Hea?.value ?? 0) + (s.player.attrs.Jum?.value ?? 0)) / 2));
}

export interface RoleTraitClash {
  trait: TraitDef;
  /** Instrucción de serie del rol que el rasgo contradice. */
  pi: PlayerInstruction;
}

/** Rasgos del jugador que van contra lo que el rol hace de serie (p.ej. «Se pega a la banda» con «Situarse más cerrado»). */
export function roleTraitClashes(role: RoleDef, slot: PositionSlot, traitIds: string[]): RoleTraitClash[] {
  const def = roleDefaults(role.id, slot);
  if (!def) return [];
  const out: RoleTraitClash[] = [];
  for (const id of traitIds) {
    const t = TRAIT_BY_ID[id];
    const hit = t?.contrastPI?.find((pi) => def.part.includes(pi));
    if (t && hit && PI_BY_ID[hit]) out.push({ trait: t, pi: PI_BY_ID[hit] });
  }
  return out;
}

/** Nombres de las instrucciones de serie del rol en esa posición. */
export function roleDefaultNames(role: RoleDef, slot: PositionSlot): { part: string[]; blocked: string[] } {
  const def = roleDefaults(role.id, slot);
  const names = (ids: string[]) => ids.map((id) => PI_BY_ID[id]?.es ?? id);
  return def ? { part: names(def.part), blocked: names(def.blocked) } : { part: [], blocked: [] };
}
