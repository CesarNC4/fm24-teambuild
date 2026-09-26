/**
 * Detector de equilibrio por funciones.
 *
 * Cada rol, en su posición, recibe las funciones que cumple en el campo (crea,
 * destruye, da amplitud…). No son una opinión: salen de sus instrucciones de
 * serie (roleInstructions.ts). «Abrirse a banda» → da amplitud; «Recortar
 * hacia dentro» o «Situarse más cerrado» → pasillo interior; «Subir más» →
 * llega; «Mantener posición» con mentalidad Cauta → sostiene; «Tomar más
 * riesgos» → crea; «Regatear más» → conduce; «Aguantar el balón» → descarga;
 * «Moverse entre líneas» o «Variar la posición» → busca huecos; presión «Más
 * insistente», barra llena o «Entrar más duro» → presiona. Lo que las
 * instrucciones no dicen lo completan los documentos de Conocimiento. En los
 * roles libres (sin instrucciones de serie) mandan los rasgos del jugador.
 *
 * Con esas funciones se juzgan las unidades (pivote, bandas, delanteros), el
 * conjunto, la estructura de los documentos (3 De · 4 Ap · 3 At, cobertura,
 * bandas asimétricas, uno o dos roles de enfoque) y las parejas concretas de
 * los documentos. El estilo puede marcar un desequilibrio como intencionado.
 */

import { FORMATION_BY_ID } from "./formations";
import { MENTALITY_BY_ID, STYLE_BY_ID, styleTraits } from "./instructions";
import { PI_BY_ID, roleTraitClashes } from "./playerInstructions";
import { MENTALITIES, roleDefaults } from "./roleInstructions";
import { DUTY_LABEL, DUTY_SHORT, ROLE_BY_ID, rolesForPosition, type RoleDef } from "./roles";
import { TRAIT_BY_ID } from "./traits";
import type { LineupResult, Tactic } from "./tactics";
import type { Player, PositionSlot } from "./types";

// ---------------------------------------------------------------------------
// Funciones de cada rol
// ---------------------------------------------------------------------------

export type RoleFunction = "crea" | "destruye" | "conduce" | "llega" | "amplitud" | "pasillo" | "fija" | "descarga" | "huecos" | "sostiene" | "presiona";

export const FUNCTION_ORDER: RoleFunction[] = ["crea", "destruye", "conduce", "llega", "amplitud", "pasillo", "fija", "descarga", "huecos", "sostiene", "presiona"];

export const FUNCTION_LABEL: Record<RoleFunction, string> = {
  crea: "Crea",
  destruye: "Destruye",
  conduce: "Conduce",
  llega: "Llega",
  amplitud: "Da amplitud",
  pasillo: "Pasillo interior",
  fija: "Fija centrales",
  descarga: "Descarga",
  huecos: "Busca huecos",
  sostiene: "Sostiene",
  presiona: "Presiona",
};

export const FUNCTION_HINT: Record<RoleFunction, string> = {
  crea: "Recibe y reparte: «Tomar más riesgos» (sobre todo con «Disparar menos a menudo») o no le dejan «Tomar menos riesgos».",
  destruye: "Roba y corta: «Entrar más duro», o «Mantener posición» y «Regatear menos» sin licencia para arriesgar el pase.",
  conduce: "Progresa con el balón: «Regatear más».",
  llega: "Pisa el área desde segunda línea: «Subir más».",
  amplitud: "Juega abierto: «Abrirse a banda», «Centrar desde la cal», «Centrar más a menudo» o jugador de banda que no recorta.",
  pasillo: "Ocupa el pasillo interior: «Situarse más cerrado», «Recortar hacia dentro», o «Abrirse a banda» desde el medio.",
  fija: "Delantero que juega al espacio y no puede «Aguantar el balón»: fija a los centrales.",
  descarga: "Juega de espaldas: «Aguantar el balón».",
  huecos: "Aparece donde hay espacio: «Moverse entre líneas» o «Variar la posición».",
  sostiene: "Defensa preventiva: «Mantener posición» y mentalidad Cauta, o central que no sube.",
  presiona: "Presión de serie «Más insistente» o barra llena, o «Entrar más duro».",
};

type Zone = "gk" | "cb" | "back" | "dm" | "mc" | "wide" | "amc" | "st";
type Side = "L" | "C" | "R";

function zoneOf(slot: PositionSlot): Zone {
  switch (slot) {
    case "GK": return "gk";
    case "DC": return "cb";
    case "DL": case "DR": case "WBL": case "WBR": return "back";
    case "DM": return "dm";
    case "MC": return "mc";
    case "ML": case "MR": case "AML": case "AMR": return "wide";
    case "AMC": return "amc";
    default: return "st";
  }
}

/** Lo que las instrucciones de serie no dicen y sí los documentos de Conocimiento. */
const DOC_EXTRA: Record<string, [RoleFunction, string][]> = {
  "B2B-S": [["llega", "todoterreno: va de área a área (documentos)"]],
  "SV-S": [["llega", "segundo volante: llega desde atrás al área (documentos)"]],
};

/** Rasgos que dan una función a un rol libre (sin instrucciones de serie). */
const TRAIT_FUNCTIONS: Record<string, { fn: RoleFunction; zones: Zone[] }> = {
  "hugs-line": { fn: "amplitud", zones: ["back", "wide"] },
  "cuts-inside-left": { fn: "pasillo", zones: ["back", "wide"] },
  "cuts-inside-right": { fn: "pasillo", zones: ["back", "wide"] },
  "cuts-inside-both": { fn: "pasillo", zones: ["back", "wide"] },
  "gets-forward": { fn: "llega", zones: ["back", "dm", "mc", "wide", "amc"] },
  "gets-into-box": { fn: "llega", zones: ["dm", "mc", "wide", "amc"] },
  "arrives-late": { fn: "llega", zones: ["dm", "mc", "wide", "amc"] },
  "stays-back": { fn: "sostiene", zones: ["cb", "back", "dm", "mc"] },
  "killer-balls": { fn: "crea", zones: ["dm", "mc", "wide", "amc", "st"] },
  "dictates-tempo": { fn: "crea", zones: ["dm", "mc", "wide", "amc", "st"] },
  "runs-ball-often": { fn: "conduce", zones: ["cb", "back", "dm", "mc", "wide", "amc", "st"] },
  "plays-with-back": { fn: "descarga", zones: ["amc", "st"] },
  "comes-deep": { fn: "descarga", zones: ["amc", "st"] },
  "moves-channels": { fn: "huecos", zones: ["mc", "wide", "amc", "st"] },
};

export interface RoleFunctions {
  fns: RoleFunction[];
  /** De dónde sale cada función: instrucción de serie, documento o rasgo. */
  why: Partial<Record<RoleFunction, string>>;
  /** Rol libre: no trae instrucciones de serie; mandan los rasgos del jugador. */
  free: boolean;
  /** Mentalidad del rol (índice de MENTALITIES) con el equipo en Positiva, como en las capturas. */
  mentality: number | null;
}

const PLAYMAKER_CODES = new Set(["DLP", "AP", "RPM", "REG", "WP", "EG", "TQ"]);

/** Funciones del rol en esa posición; con los rasgos del jugador si el rol es libre. */
export function roleFunctions(role: RoleDef, slot: PositionSlot, traitIds: string[] = []): RoleFunctions {
  const def = roleDefaults(role.id, slot);
  const zone = zoneOf(slot);
  const why: Partial<Record<RoleFunction, string>> = {};
  if (!def || zone === "gk") return { fns: [], why, free: false, mentality: def?.mentality ?? null };
  const P = def.part;
  const B = def.blocked;
  const m = def.mentality;
  const free = P.length === 0;
  const pi = (id: string) => `«${PI_BY_ID[id]?.es ?? id}»`;
  const first = (ids: string[]) => ids.find((id) => P.includes(id));
  const set = (fn: RoleFunction, text: string) => { if (!why[fn]) why[fn] = text; };

  const narrow = first(["sit-narrower", "cut-inside"]);
  const wideInstr = first(["stay-wider", "cross-from-byline", "cross-more"]);
  // Amplitud
  if (zone === "back" && !narrow) {
    const w = wideInstr ?? first(["get-further-forward"]);
    if (w) set("amplitud", `${pi(w)} desde el lateral`);
    else if (free && m >= 4) set("amplitud", "rol libre de lateral: sube por fuera");
  }
  if (zone === "wide" && !narrow && !P.includes("roam")) set("amplitud", wideInstr ? pi(wideInstr) : "juega en la banda sin recortar hacia dentro");
  if (zone === "cb" && P.includes("stay-wider") && P.includes("cross-from-byline")) set("amplitud", "«Abrirse a banda» y «Centrar desde la cal» desde el central");
  // Pasillo interior
  if (narrow && zone !== "cb") set("pasillo", pi(narrow));
  else if (zone === "mc" && P.includes("stay-wider")) set("pasillo", "«Abrirse a banda» desde el medio: cae al pasillo interior");
  else if (zone === "wide" && P.includes("roam")) set("pasillo", "«Variar la posición» desde la banda");
  // Llega
  if (P.includes("get-further-forward") && (zone === "dm" || zone === "mc" || zone === "wide" || zone === "amc")) set("llega", pi("get-further-forward"));
  // Sostiene
  if (zone === "cb" || zone === "back" || zone === "dm" || zone === "mc") {
    if (P.includes("hold-position") && m <= 2) set("sostiene", "«Mantener posición» y mentalidad Cauta");
    else if (zone === "cb" && m <= 3) set("sostiene", "central que no sube");
    else if (P.includes("sit-narrower") && m <= 2) set("sostiene", "«Situarse más cerrado» y mentalidad Cauta");
  }
  // Destruye
  if (zone === "dm" || zone === "mc") {
    if (P.includes("tackle-harder")) set("destruye", pi("tackle-harder"));
    else if (m <= 2 && P.includes("hold-position") && P.includes("dribble-less") && !B.includes("fewer-risky-passes")) set("destruye", "«Mantener posición» y «Regatear menos», sin licencia para arriesgar el pase");
  }
  // Crea
  const creates = zone !== "cb" && zone !== "back" && (P.includes("more-risky-passes") || B.includes("fewer-risky-passes")) && !P.includes("get-further-forward") && !(zone === "st" && P.includes("hold-up-ball"));
  if (creates) set("crea", P.includes("more-risky-passes") ? (P.includes("shoot-less") ? "«Tomar más riesgos» y «Disparar menos a menudo»" : pi("more-risky-passes")) : "no le dejan «Tomar menos riesgos»");
  if (P.includes("dribble-more")) set("conduce", pi("dribble-more"));
  if (P.includes("hold-up-ball")) set("descarga", pi("hold-up-ball"));
  if (zone === "st" && B.includes("hold-up-ball") && !creates) set("fija", "no puede «Aguantar el balón»: juega al espacio");
  if (def.press === "mas" || def.press === "llena") set("presiona", def.press === "mas" ? "presión «Más insistente» de serie" : "barra de presión llena de serie");
  else if (P.includes("tackle-harder")) set("presiona", pi("tackle-harder"));
  const h = first(["move-into-channels", "roam"]);
  if (h) set("huecos", pi(h));
  for (const [fn, text] of DOC_EXTRA[role.id] ?? []) set(fn, text);
  if (free) {
    for (const id of traitIds) {
      const tf = TRAIT_FUNCTIONS[id];
      if (tf && tf.zones.includes(zone)) set(tf.fn, `rasgo «${TRAIT_BY_ID[id]?.es ?? id}» (rol libre)`);
    }
  }
  return { fns: FUNCTION_ORDER.filter((f) => why[f]), why, free, mentality: m };
}

// ---------------------------------------------------------------------------
// Informe de equilibrio
// ---------------------------------------------------------------------------

export type BalanceLevel = "warn" | "info" | "tip" | "ok";
export type BalanceArea = "estructura" | "defensa" | "medio" | "bandas" | "ataque" | "estilo" | "rasgos";

export const AREA_LABEL: Record<BalanceArea, string> = {
  estructura: "Estructura",
  defensa: "Defensa",
  medio: "Medio campo",
  bandas: "Bandas",
  ataque: "Ataque",
  estilo: "Estilo",
  rasgos: "Rasgos",
};

export interface BalanceIssue {
  /** Id de la regla (el estilo puede declararla intencionada). */
  id: string;
  level: BalanceLevel;
  area: BalanceArea;
  text: string;
  /** Huecos a los que afecta. */
  slots: string[];
  /** Si el estilo o las instrucciones la hacen intencionada: por qué. */
  intended?: string;
}

export interface BalanceEntry {
  slotId: string;
  slot: PositionSlot;
  x: number;
  zone: Zone;
  side: Side;
  role: RoleDef;
  fns: RoleFunction[];
  why: Partial<Record<RoleFunction, string>>;
  free: boolean;
  /** Mentalidad en el partido, con la del equipo (índice de MENTALITIES). */
  mentality: number | null;
  player: Player | null;
}

export interface BalanceReport {
  entries: BalanceEntry[];
  issues: BalanceIssue[];
  /** Cuántos jugadores de campo cumplen cada función. */
  counts: Record<RoleFunction, number>;
  duties: { D: number; S: number; A: number };
  /** Jugadores de campo en Muy ofensiva con la mentalidad del equipo. */
  veryAttacking: BalanceEntry[];
  teamMentality: string;
}

/** Desequilibrios que un estilo busca a propósito. */
const INTENDED: { rules: string[]; styles: string[]; why: string }[] = [
  { rules: ["medio-no-genera", "sin-creador", "poca-llegada", "deberes-ataque"], styles: ["autobus", "catenaccio", "bloque-bajo", "cholismo"], why: "el bloque bajo vive de destruir y salir rápido" },
  { rules: ["sin-creador", "medio-no-genera"], styles: ["route-one"], why: "juego directo: el balón salta el medio hacia la referencia" },
  { rules: ["banda-doble-amplitud"], styles: ["bandas", "carrileros-directos"], why: "atacar por fuera con dos por banda es el plan del estilo" },
  { rules: ["banda-sin-amplitud", "enfoque"], styles: ["relacionismo"], why: "el relacionismo junta a los jugadores cerca del balón" },
  { rules: ["deberes-ataque", "enfoque"], styles: ["futbol-total"], why: "en el fútbol total todos cambian de sitio" },
];

const PIVOT_COVER = new Set(["IWB-D", "L-D", "IFB-D"]);

/**
 * Juzga la táctica por funciones. Con `lineup` y `traits`, los roles libres
 * toman funciones de los rasgos del titular y se avisa de los rasgos que chocan
 * con las instrucciones de serie.
 */
export function tacticBalance(tactic: Tactic, opts: { lineup?: LineupResult | null; traits?: Record<string, string[]> } = {}): BalanceReport {
  const f = FORMATION_BY_ID[tactic.formationId];
  const teamLevel = MENTALITY_BY_ID[tactic.mentality ?? "equilibrada"]?.level ?? 0;
  const teamIdx = teamLevel + 3;
  const entries: BalanceEntry[] = f.slots.map((s) => {
    const role = ROLE_BY_ID[tactic.roles[s.id]] ?? ROLE_BY_ID[s.defaultRole];
    const player = opts.lineup?.slots.find((x) => x.slot.id === s.id)?.starter?.player ?? null;
    const rf = roleFunctions(role, s.slot, player ? opts.traits?.[player.uid] ?? [] : []);
    const side: Side = s.slot.endsWith("L") ? "L" : s.slot.endsWith("R") ? "R" : s.x < 45 ? "L" : s.x > 55 ? "R" : "C";
    return {
      slotId: s.id, slot: s.slot, x: s.x, zone: zoneOf(s.slot), side, role, player,
      fns: rf.fns, why: rf.why, free: rf.free,
      mentality: rf.mentality == null ? null : Math.max(0, Math.min(6, teamIdx + rf.mentality - 4)),
    };
  });
  const field = entries.filter((e) => e.zone !== "gk");
  const counts = Object.fromEntries(FUNCTION_ORDER.map((fn) => [fn, field.filter((e) => e.fns.includes(fn)).length])) as Record<RoleFunction, number>;
  const duty = (e: BalanceEntry) => (e.role.duty === "St" || e.role.duty === "Co" ? "D" : e.role.duty === "Au" ? "S" : e.role.duty) as "D" | "S" | "A";
  const duties = { D: field.filter((e) => duty(e) === "D").length, S: field.filter((e) => duty(e) === "S").length, A: field.filter((e) => duty(e) === "A").length };
  const veryAttacking = field.filter((e) => e.mentality === 6);

  const out: BalanceIssue[] = [];
  const add = (id: string, level: BalanceLevel, area: BalanceArea, text: string, es: BalanceEntry[] = []) => out.push({ id, level, area, text, slots: es.map((e) => e.slotId) });
  const rn = (e: BalanceEntry) => `${e.role.es} (${DUTY_SHORT[e.role.duty]})`;
  const list = (es: BalanceEntry[]) => es.map(rn).join(" + ");
  const has = (e: BalanceEntry, fn: RoleFunction) => e.fns.includes(fn);
  const code = (c: string) => field.filter((e) => e.role.code === c);
  const id = (i: string) => field.filter((e) => e.role.id === i);
  const sideName = (s: Side) => (s === "L" ? "izquierda" : "derecha");

  const cbs = field.filter((e) => e.zone === "cb");
  const dms = field.filter((e) => e.zone === "dm");
  const mcs = field.filter((e) => e.zone === "mc");
  const strikers = field.filter((e) => e.zone === "st");
  const amc = field.filter((e) => e.zone === "amc");
  const centralMids = [...dms, ...mcs];
  const flank = (s: Side) => field.filter((e) => (e.zone === "back" || e.zone === "wide") && e.side === s);
  const sameSide = (a: BalanceEntry, b: BalanceEntry) => a.side !== "C" && a.side === b.side;
  const style = tactic.styleId ?? "";
  const on = (i: string) => tactic.instructions.includes(i);

  // ---- Estructura (documentos)
  if (duties.A >= 6) add("deberes-ataque", "warn", "estructura", `${duties.A} deberes de ataque: mucho riesgo en las transiciones defensivas. La referencia es 3 De · 4 Ap · 3 At.`);
  else if (duties.A <= 1) add("deberes-ataque", "info", "estructura", `${duties.A === 0 ? "Ningún" : "Un solo"} deber de ataque: poca amenaza en carrera. La referencia es 3 De · 4 Ap · 3 At.`);
  if (duties.S <= 2) add("deberes-apoyo", "info", "estructura", `Solo ${duties.S} deberes de apoyo: el equipo se estira. El apoyo es el pegamento entre líneas; la referencia es 4.`);
  else if (Math.abs(duties.D - 3) + Math.abs(duties.S - 4) + Math.abs(duties.A - 3) >= 4 && duties.A < 6 && duties.A > 1) add("deberes", "info", "estructura", `Reparto de deberes ${duties.D} De · ${duties.S} Ap · ${duties.A} At. Los documentos proponen 3 · 4 · 3, escalonados en defensa, medio y ataque.`);
  const attackers = field.filter((e) => duty(e) === "A");
  if (attackers.length >= 3 && attackers.every((e) => e.zone === "st" || e.zone === "amc" || (e.zone === "wide" && e.slot.startsWith("AM")))) add("escalonado", "info", "estructura", "Todos los deberes de ataque están arriba: el equipo se parte en dos. Un lateral, carrilero o interior en ataque conecta las líneas.", attackers);
  else if (attackers.length >= 2 && !attackers.some((e) => e.zone === "cb" || e.zone === "back" || e.zone === "dm")) add("corredor-atras", "tip", "estructura", "Sugerencia de los documentos: un deber de ataque que salga desde atrás (Carrilero inverso At, Segundo volante At, Central lateral At) es difícil de marcar.");

  const cover = [...centralMids.filter((e) => has(e, "sostiene")), ...field.filter((e) => PIVOT_COVER.has(e.role.id))];
  if (centralMids.length > 0 && cover.length === 0) add("cobertura", "warn", "estructura", "Nadie se queda delante de los centrales: un Pivote defensivo, Mediocentro (De), Centrocampista (De) o Medio cierre, o un defensor que se mete al medio (Carrilero inverso De, Líbero De, Lateral inverso).", centralMids);
  const backs = field.filter((e) => e.zone === "back");
  if (backs.length >= 2 && backs.every((e) => e.role.duty === "A" || e.role.code === "CWB") && cover.length === 0) add("laterales-sin-cobertura", "warn", "defensa", "Los dos laterales suben y nadie cubre en el medio: contragolpes por las bandas.", backs);

  const sig = (s: Side) => flank(s).map((e) => `${e.zone}:${e.role.id}`).sort().join("|");
  if (flank("L").length >= 2 && flank("R").length >= 2 && sig("L") === sig("R")) add("bandas-espejo", "info", "bandas", `Las dos bandas son un espejo (${list(flank("L"))}): los documentos las quieren asimétricas, por ejemplo Delantero interior (At) + lateral (Ap/De) por un lado y Extremo (Ap) + Carrilero inverso (At) por el otro.`, [...flank("L"), ...flank("R")]);

  const focus = field.filter((e) => PLAYMAKER_CODES.has(e.role.code) || e.role.code === "TF");
  if (focus.length > 2) add("enfoque", "warn", "estructura", `${focus.length} roles de enfoque (${focus.map((e) => e.role.es).join(", ")}): el equipo los busca a todos con el balón y se estorban. Uno o dos como mucho.`, focus);
  const creators = field.filter((e) => has(e, "crea"));
  if (creators.length === 0) add("sin-creador", "info", "estructura", "Nadie crea: ningún rol trae «Tomar más riesgos» ni es organizador. Válido en estilos directos; si no, el balón se repartirá sin foco.");
  const arrivers = field.filter((e) => has(e, "llega"));
  if (arrivers.length < 2) add("poca-llegada", "info", "estructura", `${arrivers.length === 0 ? "Nadie llega" : `Solo llega ${rn(arrivers[0])}`} desde segunda línea: los documentos piden 2-3 que pisen el área además del delantero.`, arrivers);
  else if (arrivers.length > 4) add("mucha-llegada", "warn", "estructura", `${arrivers.length} jugadores con «Subir más» (${arrivers.map((e) => e.role.es).join(", ")}): saturan el área y vacían el medio.`, arrivers);
  const holders = field.filter((e) => has(e, "sostiene"));
  if (holders.length < 3) add("pocos-sostienen", "warn", "estructura", `Solo ${holders.length} jugador${holders.length === 1 ? "" : "es"} sostiene${holders.length === 1 ? "" : "n"} cuando atacas (${holders.map((e) => e.role.es).join(", ") || "nadie"}): al menos 3. Ver también la defensa preventiva en los consejos.`, holders);
  if (veryAttacking.length >= 5) add("mentalidad", "info", "estructura", `${veryAttacking.length} jugadores quedan en Muy ofensiva con la mentalidad ${MENTALITIES[teamIdx]} del equipo (${veryAttacking.map((e) => e.role.es).join(", ")}): mucho riesgo si pierdes el balón.`, veryAttacking);

  // ---- Defensa
  if (cbs.length === 2) {
    if (cbs.every((e) => e.role.duty === "St")) add("centrales-tapon", "warn", "defensa", "Dos centrales en Tapón: saltan los dos y dejan espacio a la espalda. Tapón + Cubrir, o los dos en Defender.", cbs);
    if (cbs.every((e) => e.role.duty === "Co")) add("centrales-cubrir", "warn", "defensa", "Dos centrales en Cubrir: regalan espacio por delante. Cubrir + Tapón, o los dos en Defender.", cbs);
  }
  const bpds = code("BPD");
  if (bpds.length >= 2) add("dos-con-toque", "info", "defensa", `${bpds.length} Defensas con toque: buscan el pase arriesgado a la vez. Los documentos proponen uno junto a un Defensa central.`, bpds);
  if (code("NCB").length && bpds.length && !code("CD").length) add("practico-toque", "info", "defensa", "Central práctico + Defensa con toque solo con un Defensa central entre ellos (en línea de tres, los tres).", [...code("NCB"), ...bpds]);
  const lib = code("L")[0];
  if (lib) {
    const mates = cbs.filter((e) => e !== lib);
    if (mates.some((e) => e.role.code === "BPD")) add("libero-toque", "info", "defensa", "Líbero: a su lado, Defensas centrales, no con toque; si no, nadie se queda cuando él sube.", [lib, ...mates]);
    if (cbs.length >= 3 && mates.some((e) => e.role.duty !== "D" && e.role.code !== "BPD")) add("libero-defender", "info", "defensa", "Líbero en línea de tres: los otros dos centrales en Defender para cubrirle.", mates);
    if (!field.some((e) => e.role.code === "IFB" || e.role.id === "IWB-D")) add("libero-inverso", "tip", "defensa", "El Líbero se diseñó junto al Lateral inverso: uno cierra cuando el otro sube.", [lib]);
    else add("libero-inverso", "ok", "defensa", "Líbero con Lateral inverso: se diseñaron juntos.", [lib, ...field.filter((e) => e.role.code === "IFB" || e.role.id === "IWB-D")]);
  }
  const hb = code("HB")[0];
  if (hb && cbs.length !== 2) add("medio-cierre-centrales", "warn", "defensa", "El Medio cierre solo tiene sentido delante de una pareja de centrales: baja entre ellos al defender.", [hb]);
  for (const w of code("WCB")) {
    if (w.role.duty === "S" && field.some((e) => e.role.code === "WB" && sameSide(e, w))) add("central-lateral-dentro", "ok", "defensa", `Central lateral (Ap) + Carrilero por la ${sideName(w.side)}: desdoble por dentro.`, [w, ...field.filter((e) => e.role.code === "WB" && sameSide(e, w))]);
    if (w.role.duty === "A" && field.some((e) => e.role.code === "IF" && sameSide(e, w))) add("central-lateral-fuera", "ok", "defensa", `Central lateral (At) + Delantero interior por la ${sideName(w.side)}: desdoble por fuera.`, [w, ...field.filter((e) => e.role.code === "IF" && sameSide(e, w))]);
  }
  if (entries.some((e) => e.role.id === "SK-A") && !cbs.some((e) => e.role.duty === "Co")) add("portero-cierre-ataque", "info", "defensa", "Portero cierre en Ataque: conviene un central en Cubrir o mucha velocidad en la zaga.");

  // ---- Medio campo
  const pair = dms.length === 2 ? dms : dms.length === 0 && mcs.length === 2 ? mcs : null;
  if (pair) {
    const [a, b] = pair;
    const passive = (e: BalanceEntry) => (has(e, "destruye") || has(e, "sostiene")) && !has(e, "crea") && !has(e, "conduce") && !has(e, "huecos") && !has(e, "llega");
    if (passive(a) && passive(b)) add("medio-no-genera", "warn", "medio", `${list(pair)}: los dos destruyen o sostienen y ninguno crea ni conduce: este medio no genera juego. Uno en apoyo con salida (Pivote organizador, Segundo volante, Todoterreno).`, pair);
    if (has(a, "crea") && has(b, "crea") && !pair.some((e) => has(e, "destruye") || has(e, "sostiene"))) add("medio-sin-corte", "warn", "medio", `${list(pair)}: dos creadores y ningún destructor: nadie corta la transición.`, pair);
    const ids = pair.map((e) => e.role.code).sort().join("+");
    if (ids === "A+SV") add("pareja-a-sv", "ok", "medio", "Pivote defensivo + Segundo volante: la pareja más equilibrada de los documentos.", pair);
    if (ids === "BWM+DM") add("pareja-dm-bwm", "ok", "medio", "Mediocentro + Centrocampista recuperador: el Mediocentro cubre lo que deja el Recuperador.", pair);
    if (ids === "B2B+CM" && pair.some((e) => e.role.id === "CM-A")) add("pareja-b2b-cm", "ok", "medio", "Todoterreno + Centrocampista (At): par estable que no cae a las bandas; libera roles libres en otras zonas.", pair);
  }
  if (tactic.formationId === "4-4-2" && mcs.length === 2) {
    const b2b = mcs.find((e) => e.role.code === "B2B");
    const mate = mcs.find((e) => e !== b2b);
    if (b2b && mate) {
      if (mate.role.duty === "A") add("todoterreno-442", "warn", "medio", `Todoterreno en 4-4-2 con ${rn(mate)}: nunca con un rol de ataque. Con Centrocampista (De) o Pivote organizador (De).`, [b2b, mate]);
      else if (mate.role.id !== "CM-D" && mate.role.id !== "DLP-D") add("todoterreno-442", "info", "medio", `Todoterreno en 4-4-2: su pareja ideal es Centrocampista (De) o Pivote organizador (De), no ${rn(mate)}.`, [b2b, mate]);
    }
  }
  const trio = dms.length === 1 && mcs.length === 2 ? centralMids : mcs.length === 3 ? mcs : null;
  if (trio && (!trio.some((e) => duty(e) === "D") || !trio.some((e) => duty(e) === "A" || has(e, "llega")))) add("trio", "info", "medio", `Trío de medios ${list(trio)}: la referencia es uno en At, uno en Ap y uno en De (Centrocampista At + Todoterreno + Pivote defensivo).`, trio);
  for (const reg of code("REG")) {
    if (dms.length === 1 && cbs.length === 2) add("regista-solo", "warn", "medio", "Regista como único pivote con cuatro atrás: nunca solo. Pide al lado un Pivote defensivo o un Recuperador.", [reg]);
    const miss: string[] = [];
    if (!centralMids.some((e) => e.role.code === "A" || e.role.code === "BWM")) miss.push("un Pivote defensivo o un Recuperador al lado");
    if (!code("CD").length) miss.push("un Defensa central que le dé el balón");
    if (field.filter((e) => duty(e) === "A" && e.zone !== "cb" && e.zone !== "back" && e.zone !== "dm").length < 2) miss.push("dos deberes de ataque por delante");
    if (miss.length && !(dms.length === 1 && cbs.length === 2)) add("regista", "info", "medio", `Regista: le falta ${miss.join(", ")}.`, [reg]);
  }
  for (const dlp of code("DLP")) {
    const alone = dlp.zone === "dm" && dms.length === 1;
    if (alone && !field.some((e) => e.role.code === "IWB" || e.role.code === "L")) add("pivote-organizador-solo", "info", "medio", "Pivote organizador como único pivote: puede ir solo si un defensor sube a su lado (Carrilero inverso o Líbero).", [dlp]);
    const goalMid = field.some((e) => (e.zone === "mc" || e.zone === "amc") && (has(e, "llega") || e.role.code === "SS"));
    const goalWide = field.some((e) => e.zone === "wide" && (has(e, "llega") || e.role.code === "IF" || e.role.code === "RMD"));
    if (!goalMid || !goalWide) add("pivote-organizador-gol", "tip", "medio", `Pivote organizador: pide un rol de gol en el medio y otro en banda${!goalMid && !goalWide ? "; no hay ninguno" : !goalMid ? "; falta el del medio" : "; falta el de banda"}.`, [dlp]);
  }
  for (const rpm of code("RPM")) {
    const cmd = centralMids.filter((e) => e.role.id === "CM-D");
    if (cmd.length) add("itinerante-cm-d", "warn", "medio", "Organizador itinerante con un Centrocampista (De) al lado: le estorba. Pide Centrocampista (At), Mezzala o Delantero sorpresa delante y cobertura fija detrás.", [rpm, ...cmd]);
    else if (!field.some((e) => e.role.id === "CM-A" || e.role.code === "MEZ" || e.role.code === "SS")) add("itinerante-delante", "tip", "medio", "Organizador itinerante: pide Centrocampista (At), Mezzala o Delantero sorpresa por delante.", [rpm]);
    const sv = id("SV-S");
    if (sv.length && !field.some((e) => ["IFB-D", "IWB-D", "L-D", "A-D"].includes(e.role.id))) add("itinerante-volante", "warn", "medio", "Segundo volante (Ap) + Organizador itinerante: muy arriesgado. Obliga a tener Lateral inverso, Carrilero inverso (De), Líbero (De) o Pivote defensivo.", [rpm, ...sv]);
  }
  if (hb && code("CAR").length && code("MEZ").length) add("medio-cierre-mezzala", "warn", "medio", "Medio cierre + Interior mixto + Mezzala: el centro se queda vacío. Centrocampista (Ap) en lugar del Interior mixto.", [hb, ...code("CAR"), ...code("MEZ")]);
  const wingbacks = field.filter((e) => ["WB", "CWB", "IWB"].includes(e.role.code));
  if (hb && wingbacks.length >= 2) add("medio-cierre-carrileros", "ok", "medio", "Medio cierre con carrileros: baja entre los centrales y los carrileros pueden subir.", [hb, ...wingbacks]);
  if (field.some((e) => e.role.id === "MEZ-A") && field.some((e) => e.role.id === "CAR-S")) add("mezzala-interior", "ok", "medio", "Mezzala (At) + Interior mixto (Ap): el del lado del balón cae al pasillo y el otro se cierra.", [...id("MEZ-A"), ...id("CAR-S")]);
  if (code("MEZ").length && strikers.some((e) => e.role.code === "DLF" || e.role.id === "TF-S")) add("mezzala-delantero", "ok", "medio", "Mezzala con un delantero que baja: le deja el espacio para llegar.", [...code("MEZ"), ...strikers.filter((e) => e.role.code === "DLF" || e.role.id === "TF-S")]);
  if (field.some((e) => e.role.id === "CM-A") && field.some((e) => e.role.id === "BWM-S") && hb) {
    add("trio-presion", "ok", "medio", "Trío de presión: Centrocampista (At) + Recuperador (Ap) + Medio cierre, para bloque alto.", [...id("CM-A"), ...id("BWM-S"), hb]);
    if (creators.length === 0) add("trio-presion-creativos", "info", "medio", "El trío de presión necesita creativos alrededor: ahora nadie crea.");
  }
  const bwm = code("BWM")[0];
  const reg = code("REG")[0];
  if (bwm && reg && bwm.side !== "C" && reg.side !== "C" && bwm.side !== reg.side) {
    const bwmFlankAtt = flank(bwm.side).some((e) => duty(e) === "A");
    const regFlankAtt = flank(reg.side).some((e) => duty(e) === "A");
    if (!bwmFlankAtt && regFlankAtt) add("recuperador-regista", "info", "medio", `Recuperador por la ${sideName(bwm.side)} y Regista por la ${sideName(reg.side)}: en la banda del Recuperador van los roles de banda ofensivos y en la del Regista los contenidos. Ahora está al revés.`, [bwm, reg]);
    else if (bwmFlankAtt && !regFlankAtt) add("recuperador-regista", "ok", "medio", "Banda ofensiva del lado del Recuperador y contenida del lado del Regista.", [bwm, reg]);
  }
  if (bwm && field.some((e) => e.role.code === "REG" || e.role.code === "AP")) add("trabajador-creativo", "ok", "medio", "Trabajador junto a creativo: el Recuperador libera al organizador.", [bwm, ...field.filter((e) => e.role.code === "REG" || e.role.code === "AP")]);

  // ---- Bandas
  for (const s of ["L", "R"] as Side[]) {
    const fl = flank(s);
    if (!fl.length) continue;
    const name = sideName(s);
    const amp = fl.filter((e) => has(e, "amplitud"));
    const inside = fl.filter((e) => has(e, "pasillo"));
    if (fl.length >= 2 && amp.length >= 2 && inside.length === 0) {
      const wb = fl.find((e) => e.role.code === "WB" || e.role.code === "CWB");
      const w = fl.find((e) => e.role.code === "W");
      add("banda-doble-amplitud", "warn", "bandas", wb && w ? `Banda ${name}: Carrilero + Extremo, los dos por fuera: se pisan y nadie ocupa el pasillo interior.` : `Banda ${name}: ${list(amp)} dan amplitud los dos y nadie ocupa el pasillo interior: se pisan por fuera.`, fl);
    }
    if (amp.length === 0) add("banda-sin-amplitud", "info", "bandas", `Banda ${name}: nadie abierto (${list(fl)}). Un lateral en apoyo, un carrilero o un extremo puro lo arregla.`, fl);
    const pairFl = fl.length === 2 ? fl : null;
    if (pairFl && duty(pairFl[0]) === duty(pairFl[1])) {
      const d = duty(pairFl[0]);
      add("banda-mismo-deber", d === "A" ? "warn" : "info", "bandas", `Banda ${name}: ${list(pairFl)} con el mismo deber. ${d === "A" ? "Se pisan y dejan la banda vacía al perder el balón." : "Los documentos piden deberes distintos en cada banda."} Alterna ataque + apoyo${d === "D" ? " o apoyo + defender" : ""}.`, pairFl);
    }
    if (fl.length === 1) {
      const e = fl[0];
      if (["NFB", "IWB", "IW", "IF", "RMD", "WP", "AP", "WTF", "IFB"].includes(e.role.code)) add("banda-unica", "warn", "bandas", `Banda ${name}: ${e.role.es} como único jugador de banda no cubre las dos fases. Carrilero, Carrilero completo, Centrocampista de banda o Extremo en apoyo.`, [e]);
      else if (["WB", "DW", "WM"].includes(e.role.code) && e.role.duty === "A") add("banda-unica", "info", "bandas", `Banda ${name}: jugador único en ataque; le costará replegar. El apoyo equilibra las dos fases.`, [e]);
    }
    const iff = fl.find((e) => e.role.code === "IF");
    const wbk = fl.find((e) => e.role.code === "WB" || e.role.code === "CWB");
    if (iff && wbk && !centralMids.some((e) => (e.role.code === "CAR" || e.role.code === "MEZ") && e.side === s)) add("interior-carrilero", "info", "bandas", `Banda ${name}: Delantero interior + ${wbk.role.es}: el carrilero se queda aislado si nadie cae a la banda. Interior mixto por ese lado (cuesta un hombre de cobertura).`, [iff, wbk]);
    const iw = fl.find((e) => e.role.code === "IW");
    const fb = fl.find((e) => e.role.code === "FB");
    if (iw && fb) add("inverso-lateral", "ok", "bandas", `Banda ${name}: Extremo inverso + Lateral: se intercambian solos, por fuera y por dentro.`, [iw, fb]);
    const wm = fl.find((e) => e.role.code === "WM");
    const iwb = fl.find((e) => e.role.code === "IWB");
    if (wm && iwb) {
      add("banda-wm-iwb", "ok", "bandas", `Banda ${name}: Centrocampista de banda + Carrilero inverso: la anchura y el pasillo interior.`, [wm, iwb]);
      if (!hb) add("banda-wm-iwb-hb", "tip", "bandas", `Banda ${name}: con Centrocampista de banda + Carrilero inverso, un Medio cierre tapa el hueco entre central y lateral.`, [wm, iwb]);
    }
    const mez = centralMids.find((e) => e.role.code === "MEZ" && e.side === s);
    const w = fl.find((e) => e.role.code === "W");
    if (mez && w) add("mezzala-extremo", "tip", "bandas", `Banda ${name}: Mezzala + Extremo. Contra línea de cuatro, Mezzala (At) + Extremo (Ap); contra línea de tres, al revés (mira la pestaña Rival).`, [mez, w]);
    const apw = fl.find((e) => e.role.code === "AP" && e.zone === "wide");
    const cwbA = fl.find((e) => e.role.id === "CWB-A");
    if (apw && cwbA) add("organizador-banda-cwb", "ok", "bandas", `Banda ${name}: Organizador adelantado en banda + Carrilero completo (At)${bwm?.side === s ? ", con el Recuperador de ese lado" : ""}.`, [apw, cwbA]);
    const pf = strikers.find((e) => e.role.code === "PF");
    const dw = fl.find((e) => e.role.code === "DW");
    if (pf && dw && bwm && bwm.side === s) {
      add("trio-presion-banda", "ok", "bandas", `Banda ${name}: Delantero presionante + Extremo defensivo + Recuperador: presión automática sin tocar las instrucciones de equipo.`, [pf, dw, bwm]);
      add("trio-presion-socios", "tip", "bandas", "Tras robar, el trío de presión se queda sin pase: rodéalo de socios muy ofensivos.", [pf, dw, bwm]);
    }
  }
  const narrowAll = flank("L").length > 0 && flank("R").length > 0 && !field.some((e) => has(e, "amplitud"));
  if (narrowAll) {
    for (const i of out.filter((x) => x.id === "banda-sin-amplitud")) i.level = "warn";
  }
  if (!flank("L").length && !flank("R").length && !field.some((e) => has(e, "amplitud") || has(e, "pasillo"))) add("sistema-estrecho", "warn", "bandas", "Sistema estrecho sin nadie que dé amplitud: Mezzala o Interior mixto en el medio, o laterales en apoyo o ataque.");
  const fbA = field.filter((e) => e.role.id === "FB-A" || e.role.id === "WB-A");
  const svA = id("SV-A");
  if (fbA.length && svA.length) add("lateral-volante", "warn", "bandas", `${list([...fbA, ...svA])}: saturan el área y vacían el medio. Los dos en Apoyo.`, [...fbA, ...svA]);
  const wbA4 = field.filter((e) => e.role.id === "WB-A" && (e.slot === "DL" || e.slot === "DR"));
  if (wbA4.length === 2 && dms.length === 0) add("dos-carrileros-ataque", "info", "bandas", "Dos Carrileros (At) con cuatro atrás: pivote en ese lado o Lateral (Ap) en el otro.", wbA4);
  const leftAtt = field.filter((e) => e.side === "L" && (e.zone === "back" || e.zone === "wide") && duty(e) === "A").length;
  const rightAtt = field.filter((e) => e.side === "R" && (e.zone === "back" || e.zone === "wide") && duty(e) === "A").length;
  if ((leftAtt >= 2 && rightAtt === 0) || (rightAtt >= 2 && leftAtt === 0)) add("ataque-un-lado", "warn", "bandas", "Todos los deberes de ataque de banda en el mismo lado: el ataque es previsible y la otra banda no penetra.");

  // ---- Ataque
  const runners = field.filter((e) => has(e, "fija") || has(e, "llega"));
  const pm = field.filter((e) => ["AP", "EG", "WP", "REG"].includes(e.role.code));
  if (pm.length && runners.filter((e) => !pm.includes(e)).length < 2) add("organizador-rupturas", "warn", "ataque", `${pm.map((e) => e.role.es).join(" y ")} necesita${pm.length > 1 ? "n" : ""} al menos dos jugadores rompiendo a la espalda de la defensa; ahora ${runners.length === 0 ? "no hay ninguno" : `solo ${runners.map((e) => e.role.es).join(", ")}`}.`, pm);
  const eg = code("EG")[0];
  if (eg) {
    const drop = strikers.filter((e) => ["CF-S", "DLF-S"].includes(e.role.id) || e.role.code === "F9");
    if (drop.length) add("enganche-delantero", "warn", "ataque", `Enganche con ${list(drop)}: bajan a su zona. Su pareja es el Ariete.`, [eg, ...drop]);
    else if (strikers.some((e) => e.role.code === "P")) {
      add("enganche-ariete", "ok", "ataque", "Enganche + Ariete: la pareja de los documentos.", [eg, ...code("P")]);
      if (!field.some((e) => e.zone === "wide" && (has(e, "llega") || e.role.code === "RMD"))) add("enganche-bandas", "tip", "ataque", "Con un Enganche y un Ariete estáticos, se ataca desde las bandas: Buscador de espacios o Delantero interior (At).", [eg]);
    }
  }
  const drop9 = strikers.filter((e) => e.role.code === "DLF" || e.role.code === "F9");
  const behind = amc.filter((e) => e.role.code === "AM" || e.role.id === "AP-S");
  if (drop9.length && behind.length && strikers.length === 1) add("misma-vertical", "warn", "ataque", `${list([...drop9, ...behind])} en la misma vertical: se pisan. Detrás, mejor un Delantero sorpresa.`, [...drop9, ...behind]);
  if (strikers.length === 2) {
    const [a, b] = strikers;
    const fixes = (e: BalanceEntry) => has(e, "fija");
    const drops = (e: BalanceEntry) => has(e, "descarga") || has(e, "crea");
    const ab = strikers.map((e) => e.role.code).sort().join("+");
    if (fixes(a) && fixes(b)) {
      const diamond = ab === "AF+P" && amc.some((e) => e.role.id === "AP-S") && backs.filter((e) => has(e, "amplitud")).length >= 2;
      if (diamond) add("dos-puntas-rombo", "ok", "ataque", "Delantero avanzado + Ariete en rombo, con carrileros y Organizador adelantado (Ap) detrás: como en los documentos.", strikers);
      else if (field.some((e) => (e.zone === "amc" || e.zone === "mc") && has(e, "crea"))) add("dos-puntas-fijan", "info", "ataque", `${list(strikers)}: los dos fijan y ninguno baja; el enlace depende del creador de detrás.`, strikers);
      else add("dos-puntas-fijan", "warn", "ataque", `${list(strikers)}: los dos fijan y ninguno baja: nadie enlaza con el medio. Pareja clásica: uno que fija (Avanzado, Ariete, Presionante At) y uno que baja (Segundo delantero, Objetivo, Falso nueve, Presionante Ap).`, strikers);
    } else if (!fixes(a) && !fixes(b) && drops(a) && drops(b)) add("dos-puntas-bajan", "info", "ataque", `${list(strikers)}: los dos bajan y nadie ataca la espalda de la defensa.`, strikers);
    else if ((fixes(a) && drops(b)) || (fixes(b) && drops(a))) add("dos-puntas", "ok", "ataque", `${list(strikers)}: uno fija y otro baja.`, strikers);
    if (ab === "AF+TF") add("avanzado-objetivo", "ok", "ataque", "Delantero avanzado + Delantero objetivo: el avanzado recoge las prolongaciones. Contra línea alta, avanzado; contra bloque bajo, objetivo.", strikers);
    if (ab === "F9+P") add("falso-nueve-ariete", "ok", "ataque", "Falso nueve + Ariete: el Ariete ataca el espacio que deja.", strikers);
    const tq = strikers.find((e) => e.role.code === "TQ");
    if (tq && !strikers.some((e) => e !== tq && duty(e) === "A")) add("trequartista-rematador", "info", "ataque", "Trequartista sin rematador por delante: crea pero nadie remata.", [tq]);
  }
  if (strikers.length === 1 && !has(strikers[0], "fija")) {
    const s9 = strikers[0];
    const attackGap = field.filter((e) => (e.zone === "amc" || e.zone === "wide") && (has(e, "llega") || e.role.code === "SS"));
    if (s9.role.code === "F9" && !field.some((e) => e.role.id === "IF-A" || e.role.code === "SS")) add("falso-nueve", "info", "ataque", "Falso nueve en punta única: pide Delanteros interiores (At) o un Delantero sorpresa que ataquen el hueco que deja.", [s9]);
    else if (attackGap.length === 0) add("delantero-unico", "info", "ataque", `${rn(s9)} baja o aguanta y nadie ataca el hueco que deja: un Delantero sorpresa, un Mediapunta (At) o extremos que suban.`, [s9]);
  }
  for (const tf of code("TF")) {
    const crossers = field.filter((e) => has(e, "amplitud") && (e.role.code === "W" || ["WB", "CWB", "FB"].includes(e.role.code)));
    const box = field.filter((e) => ["MEZ-A", "CM-A"].includes(e.role.id) || (e.zone === "mc" && has(e, "llega")));
    const miss: string[] = [];
    if (crossers.length < 2) miss.push("dos que centren (Extremo, Carrilero)");
    if (!box.length) miss.push("llegadores donde cae el balón (Mezzala At, Centrocampista At)");
    if (miss.length) add("objetivo", "info", "ataque", `Delantero objetivo: le falta ${miss.join(" y ")}.`, [tf]);
    if ((on("pases-cortos") || on("pases-mucho-mas-cortos")) && (on("ritmo-bajo") || on("ritmo-mucho-mas-bajo"))) add("objetivo-pase-corto", "warn", "ataque", "Delantero objetivo con pase muy corto y ritmo bajo: el balón nunca le llega como necesita.", [tf]);
  }
  for (const p of code("P")) {
    if (!field.some((e) => ["SV-A", "CM-A", "MEZ-A"].includes(e.role.id) || ((e.zone === "mc" || e.zone === "dm") && has(e, "llega")))) add("ariete-llegadores", "info", "ataque", "El Ariete no participa en la construcción: necesita llegadores (Segundo volante At, Centrocampista At, Mezzala At).", [p]);
  }
  for (const r of code("RMD")) {
    if (!field.some((e) => e.role.code === "NFB" || e.role.code === "NCB")) add("buscador-espacios", "tip", "ataque", "Buscador de espacios: el resto defiende como un bloque de nueve; encaja con un Lateral práctico o un Central práctico que le lancen.", [r]);
  }
  if (field.some((e) => e.role.code === "PF") && field.some((e) => e.role.code === "RMD")) add("trabajador-creativo-arriba", "ok", "ataque", "Delantero presionante junto al Buscador de espacios: trabajador junto a creativo.", [...code("PF"), ...code("RMD")]);
  for (const dw of code("DW")) {
    const m = centralMids.find((e) => e.role.code === "MEZ" && e.side === dw.side);
    if (m) add("trabajador-creativo-banda", "ok", "bandas", `Extremo defensivo junto a la Mezzala por la ${sideName(dw.side)}: trabajador junto a creativo.`, [dw, m]);
  }

  // ---- Estilo (guía de Magicomonta) y rombo
  const tr = styleTraits(style);
  const transition = tr.counter && !tr.possession;
  if (style) {
    if (tr.possession && code("NCB").length) add("estilo-practico", "info", "estilo", "Central práctico en un estilo de posesión: despeja en vez de jugar; mejor Defensa central o Defensa con toque.", code("NCB"));
    if (transition && lib) add("estilo-libero", "info", "estilo", "Líbero en un estilo de transiciones: sube y deja la defensa corta justo cuando más se contraataca. Es un rol de posesión.", [lib]);
    if (tr.pressing && code("A").length) add("estilo-pivote-presion", "warn", "estilo", "Pivote defensivo en un estilo de presión: se queda protegiendo la zona y deja huecos en la presión. Mejor Mediocentro o Centrocampista recuperador.", code("A"));
    if (tr.deep && (code("B2B").length || bwm)) add("estilo-espera", "info", "estilo", "Todoterreno o Centrocampista recuperador en un estilo de espera: persiguen al rival y rompen el bloque. Mediocentro, Pivote defensivo o Segundo volante encajan mejor.", [...code("B2B"), ...code("BWM")]);
    const gk = entries.find((e) => e.zone === "gk");
    if (gk?.role.code === "SK" && (on("linea-def-baja") || on("linea-def-mucho-mas-baja") || cbs.some((e) => e.role.duty === "Co"))) add("estilo-portero", "info", "estilo", "Portero cierre con línea baja o un central en Cubrir: no tiene espacio que cubrir. Con esa defensa rinde más el Portero.", [gk]);
    if (strikers.length === 2) {
      const sc = strikers.map((e) => e.role.code);
      if (transition && !sc.includes("TF") && !sc.includes("CF")) add("estilo-dos-puntas-directo", "info", "estilo", "Estilo directo con dos puntas: combina uno alto y fuerte (Objetivo o Completo) con uno rápido (Ariete o Avanzado).", strikers);
      if (tr.possession && !sc.some((c) => ["DLF", "F9", "TQ", "CF"].includes(c))) add("estilo-dos-puntas-posesion", "info", "estilo", "Posesión con dos puntas: un creador (Segundo delantero, Falso nueve, Trequartista) y un rematador.", strikers);
    }
  }
  const wideSlots = field.filter((e) => e.zone === "wide").length + field.filter((e) => e.slot === "WBL" || e.slot === "WBR").length;
  if (wideSlots === 0 && dms.length && amc.length) {
    for (const e of backs) {
      if (e.role.code === "FB") add("rombo-lateral", "info", "bandas", "Rombo: el Lateral no llega a las dos fases; en posesión usa Carrilero y en transiciones Carrilero completo.", [e]);
      if (e.role.code === "IWB" || e.role.code === "IFB") add("rombo-inverso", "warn", "bandas", "Rombo: el lateral inverso se mete en un centro ya lleno. Carrilero o Carrilero completo.", [e]);
    }
    const am = amc[0];
    if (am && (am.role.code === "TQ" || am.role.code === "EG")) add("rombo-enganche", "info", "ataque", "Rombo: el Trequartista o el Enganche se desconecta con cuatro en el centro; mejor Mediapunta u Organizador adelantado.", [am]);
    if (!field.some((e) => e.role.code === "MEZ" || e.role.code === "CAR")) add("rombo-pasillos", "info", "medio", "Rombo: sin Mezzala ni Interior mixto nadie ocupa los pasillos exteriores del medio campo.");
  }

  // ---- Rasgos que chocan con las instrucciones de serie
  if (opts.traits) {
    for (const e of field) {
      if (!e.player) continue;
      const clashes = roleTraitClashes(e.role, e.slot, opts.traits[e.player.uid] ?? []);
      if (!clashes.length) continue;
      const freeRoles = rolesForPosition(e.slot).filter((r) => roleDefaults(r.id, e.slot)?.part.length === 0).map((r) => `${r.es} (${DUTY_LABEL[r.duty]})`);
      add("rasgo-choca", "warn", "rasgos", `${e.player.name}, ${rn(e)}: ${clashes.map((c) => `«${c.trait.es}» choca con «${c.pi.es}» de serie`).join("; ")}. El juego decide cada vez y se sale del plan.${freeRoles.length ? ` Prueba un rol libre: ${freeRoles.join(" o ")}.` : ""}`, [e]);
    }
  }

  // ---- El plan manda: desequilibrios intencionados
  const styleName = STYLE_BY_ID[style]?.name;
  for (const i of out) {
    if (i.level === "ok" || i.level === "tip") continue;
    const rule = INTENDED.find((x) => x.styles.includes(style) && x.rules.includes(i.id));
    if (rule) i.intended = `${styleName}: ${rule.why}`;
    else if (i.id === "banda-sin-amplitud" && (on("amplitud-estrecha") || on("amplitud-muy-estrecha"))) i.intended = "amplitud del ataque estrecha a propósito";
  }
  const seen = new Set<string>();
  const issues = out.filter((i) => (seen.has(i.text) ? false : (seen.add(i.text), true)));
  const rank: Record<BalanceLevel, number> = { warn: 0, info: 1, tip: 2, ok: 3 };
  issues.sort((a, b) => (a.intended ? 1 : 0) - (b.intended ? 1 : 0) || rank[a.level] - rank[b.level]);
  return { entries, issues, counts, duties, veryAttacking, teamMentality: MENTALITIES[teamIdx] };
}
