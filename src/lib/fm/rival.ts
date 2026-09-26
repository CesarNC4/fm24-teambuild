/**
 * Análisis del rival: a partir de la exportación de la plantilla de otro club
 * (misma vista que la nuestra) estima su XI probable, señala amenazas y
 * debilidades, propone instrucciones de oposición por jugador y ajustes a
 * nuestra táctica, y ordena nuestros estilos según lo que le hace daño.
 *
 * Reglas de oposición habituales en las guías (FM Scout / Passion4FM):
 * - Presionar siempre al que se atasca con el balón (serenidad, primer toque,
 *   decisiones bajos) y nunca al regateador rápido (le regalas el espacio).
 * - Marcaje estricto al desmarcador que necesita espacio; nunca al referencia
 *   fuerte por arriba (gana el duelo y arrastra al central).
 * - Entradas duras al blando (valentía / equilibrio bajos); nunca al ágil que
 *   saca faltas.
 * - Conducir al pie malo cuando la diferencia entre pies es grande.
 */

import type { AttrKey } from "./attributes";
import { FORMATION_BY_ID, FORMATIONS, type Formation } from "./formations";
import { INSTRUCTION_BY_ID, STYLE_PRESETS, styleTraits, type StylePreset } from "./instructions";
import { familyOf, leagueLevelPercentile, type LeagueStats } from "./league";
import { CLUSTERS, unitOfSlot, type Unit, UNIT_LABEL } from "./radiography";
import { bestRoles } from "./scoring";
import { styleFit } from "./styles";
import { buildLineup, newTactic, rankFormations, type LineupResult } from "./tactics";
import type { Player, PositionSlot } from "./types";

const a = (p: Player, k: AttrKey) => p.attrs[k]?.value ?? 0;
const avg = (p: Player, keys: AttrKey[]) => {
  const v = keys.map((k) => p.attrs[k]?.value).filter((x): x is number => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
};
const meanOf = (ps: Player[], keys: AttrKey[]): number | null => {
  const v: number[] = [];
  for (const p of ps) for (const k of keys) { const x = p.attrs[k]?.value; if (x != null) v.push(x); }
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const f1 = (n: number | null) => (n == null ? "–" : n.toFixed(1));

// ---------------------------------------------------------------------------
// XI probable
// ---------------------------------------------------------------------------

/** El juego marca en la columna "Inf" a los lesionados (Les) y sancionados (San). */
export function isUnavailable(p: Player): boolean {
  return /\b(Les|San|Sus|Inj|Ban)\b/i.test(p.info ?? "");
}

export interface RivalLineup {
  formation: Formation;
  lineup: LineupResult;
  /** Jugadores descartados por lesión o sanción. */
  unavailable: Player[];
  /** Media del XI titular (misma escala que nuestras tácticas). */
  average: number;
}

/** XI probable del rival: mejor formación (o la elegida) con sus jugadores disponibles. */
export function rivalLineup(players: Player[], formationId: string | null): RivalLineup {
  let unavailable = players.filter(isUnavailable);
  let available = players.filter((p) => !isUnavailable(p));
  // Sin portero disponible: el juego pondrá a uno aunque esté tocado
  if (!available.some((p) => p.isGoalkeeper) && unavailable.some((p) => p.isGoalkeeper)) {
    const gk = unavailable.find((p) => p.isGoalkeeper)!;
    available = [...available, gk];
    unavailable = unavailable.filter((p) => p !== gk);
  }
  const pool = available.length >= 11 ? available : players;
  const fid = formationId && FORMATION_BY_ID[formationId] ? formationId : (rankFormations(pool)[0]?.formation.id ?? FORMATIONS[0].id);
  const lineup = buildLineup(newTactic(fid, "rival"), pool);
  return { formation: lineup.formation, lineup, unavailable: available.length >= 11 ? unavailable : [], average: lineup.average };
}

function starters(lineup: LineupResult): { player: Player; slot: PositionSlot }[] {
  return lineup.slots.filter((s) => s.starter).map((s) => ({ player: s.starter!.player, slot: s.slot.slot }));
}

// ---------------------------------------------------------------------------
// Amenazas
// ---------------------------------------------------------------------------

export type ThreatKind = "estrella" | "velocidad" | "aereo" | "organizador" | "regate" | "tiro-lejano" | "balon-parado" | "fisico";
export const THREAT_LABEL: Record<ThreatKind, string> = {
  estrella: "Mejor jugador",
  velocidad: "Velocidad a la espalda",
  aereo: "Peligro por arriba",
  organizador: "Organizador",
  regate: "Regateador",
  "tiro-lejano": "Tiro lejano",
  "balon-parado": "Lanzador",
  fisico: "Referencia física",
};

export interface Threat {
  player: Player;
  slot: PositionSlot;
  kind: ThreatKind;
  detail: string;
  /** Qué hacer con él. */
  answer: string;
}

export function rivalThreats(rl: RivalLineup): Threat[] {
  const out: Threat[] = [];
  const xi = starters(rl.lineup).filter((s) => !s.player.isGoalkeeper);
  const level = (p: Player) => bestRoles(p, 1)[0]?.score ?? 0;
  const stars = [...xi].sort((x, y) => level(y.player) - level(x.player)).slice(0, 2);
  for (const s of stars) out.push({ player: s.player, slot: s.slot, kind: "estrella", detail: `nivel ${Math.round(level(s.player))}`, answer: "Marcaje estricto y que no reciba cómodo: cierra sus líneas de pase, no a él." });
  for (const s of xi) {
    const p = s.player;
    const unit = unitOfSlot(s.slot);
    const vel = avg(p, ["Pac", "Acc"]);
    if (unit === "att" && vel >= 15.5) out.push({ player: p, slot: s.slot, kind: "velocidad", detail: `Vel ${a(p, "Pac")} · Ace ${a(p, "Acc")}`, answer: "Línea defensiva no muy alta y sin trampa del fuera de juego; el central en Cubrir le vigila." });
    const aer = a(p, "Hea") * 0.5 + a(p, "Jum") * 0.5;
    if (aer >= 15 && (unit === "att" || a(p, "Jum") >= 16)) out.push({ player: p, slot: s.slot, kind: "aereo", detail: `Cab ${a(p, "Hea")} · Sal ${a(p, "Jum")} · ${p.height ? `${p.height} cm` : "altura ?"}`, answer: "Asígnale tu mejor marcador aéreo en córners y faltas; anchura defensiva amplia para cortar los centros en origen." });
    if (unit !== "def" && avg(p, ["Vis", "Pas", "Tec"]) >= 15 && a(p, "Dec") >= 13) out.push({ player: p, slot: s.slot, kind: "organizador", detail: `Vis ${a(p, "Vis")} · Pas ${a(p, "Pas")} · Tec ${a(p, "Tec")}`, answer: "Presión inmediata cuando reciba: que no levante la cabeza." });
    if (unit !== "def" && a(p, "Dri") >= 15 && avg(p, ["Agi", "Acc"]) >= 14) out.push({ player: p, slot: s.slot, kind: "regate", detail: `Reg ${a(p, "Dri")} · Agi ${a(p, "Agi")}`, answer: "No entrar: mantenerse de pie y esperar el apoyo; doblar con el lateral y el extremo." });
    if (a(p, "Lon") >= 15 && a(p, "Tec") >= 13) out.push({ player: p, slot: s.slot, kind: "tiro-lejano", detail: `Tiro lejano ${a(p, "Lon")}`, answer: "Presionar siempre en la frontal para que no arme el disparo." });
    if (unit === "att" && a(p, "Str") >= 15 && a(p, "Jum") >= 14 && a(p, "Hea") >= 13) out.push({ player: p, slot: s.slot, kind: "fisico", detail: `Fue ${a(p, "Str")} · Sal ${a(p, "Jum")}`, answer: "Nada de marcaje estricto (gana el duelo): defiende el espacio detrás y el segundo balón." });
  }
  // Lanzadores de balón parado (todo el XI)
  const takers = starters(rl.lineup).map((s) => ({ ...s, sp: Math.max(a(s.player, "Cor"), a(s.player, "Fre")) })).filter((s) => s.sp >= 15).sort((x, y) => y.sp - x.sp).slice(0, 2);
  for (const t of takers) out.push({ player: t.player, slot: t.slot, kind: "balon-parado", detail: `Cór ${a(t.player, "Cor")} · Fal ${a(t.player, "Fre")}`, answer: "Evita faltas cerca del área; en córners en contra, uno en cada palo." });
  // Sin duplicar jugador+tipo
  const seen = new Set<string>();
  return out.filter((t) => { const k = `${t.player.uid}:${t.kind}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------------------
// Instrucciones de oposición
// ---------------------------------------------------------------------------

export interface OppositionInstruction {
  player: Player;
  slot: PositionSlot;
  closingDown: "siempre" | "nunca" | null;
  tightMarking: "si" | "no" | null;
  tackling: "duras" | "suaves" | null;
  /** Pie al que conducirle. */
  showFoot: "izquierdo" | "derecho" | null;
  reasons: string[];
}

const FOOT_LEVEL: [RegExp, number][] = [
  [/muy fuerte|very strong/i, 5], [/bastante fuerte|fairly strong/i, 3], [/fuerte|strong/i, 4],
  [/razonable|reasonable/i, 2], [/aceptable|fair/i, 1], [/muy d[eé]bil|very weak/i, 0], [/d[eé]bil|flojo|weak/i, 0.5],
];
export function footLevel(s: string | null): number | null {
  if (!s) return null;
  for (const [re, v] of FOOT_LEVEL) if (re.test(s)) return v;
  return null;
}

export function oppositionInstructions(rl: RivalLineup, ours: LineupResult | null = null): OppositionInstruction[] {
  const out: OppositionInstruction[] = [];
  // Nuestros marcadores: si no tienen Marcaje para aguantar pegados, el marcaje férreo regala el giro (PDF de instrucciones de jugador)
  const ourMarkers = ours ? starters(ours).filter((x) => ["DC", "DL", "DR", "WBL", "WBR", "DM"].includes(x.slot)).map((x) => x.player) : [];
  const ourMarking = ourMarkers.length ? Math.max(...ourMarkers.map((x) => a(x, "Mar"))) : null;
  for (const s of starters(rl.lineup)) {
    const p = s.player;
    if (p.isGoalkeeper) continue;
    const unit = unitOfSlot(s.slot);
    const reasons: string[] = [];
    const oi: OppositionInstruction = { player: p, slot: s.slot, closingDown: null, tightMarking: null, tackling: null, showFoot: null, reasons };

    const fastDribbler = avg(p, ["Pac", "Acc"]) >= 14.5 && a(p, "Dri") >= 13;
    const onBall = avg(p, ["Cmp", "Fir", "Dec"]);
    if (fastDribbler && unit !== "def") { oi.closingDown = "nunca"; reasons.push(`rápido con balón (Vel/Ace ${f1(avg(p, ["Pac", "Acc"]))}, Reg ${a(p, "Dri")}): si le presionas te regala el espacio a la espalda`); }
    else if (onBall <= 11.5 || (unit === "def" && avg(p, ["Cmp", "Pas", "Fir"]) <= 12)) { oi.closingDown = "siempre"; reasons.push(`se atasca con balón (Ser ${a(p, "Cmp")}, Toq ${a(p, "Fir")}, Dec ${a(p, "Dec")}): fuerza el error`); }
    else if (a(p, "Lon") >= 15 && unit !== "def") { oi.closingDown = "siempre"; reasons.push(`tiro lejano ${a(p, "Lon")}: no dejarle armar`); }
    else if (unit !== "def" && avg(p, ["Vis", "Pas"]) >= 15 && !fastDribbler) { oi.closingDown = "siempre"; reasons.push(`organizador (Vis ${a(p, "Vis")}, Pas ${a(p, "Pas")}): que no levante la cabeza`); }

    const targetMan = a(p, "Str") >= 15 && a(p, "Jum") >= 14;
    if (unit === "att" && targetMan) { oi.tightMarking = "no"; reasons.push(`gana el cuerpo a cuerpo (Fue ${a(p, "Str")}, Sal ${a(p, "Jum")}): defiende el espacio, no al hombre`); }
    else if (unit === "att" && a(p, "OtB") >= 14 && a(p, "Str") <= 12) {
      if (ourMarking != null && ourMarking <= 11 && a(p, "OtB") >= 15) { oi.tightMarking = "no"; reasons.push(`vive del desmarque (Des ${a(p, "OtB")}) pero tus marcadores tienen Marcaje ≤ ${ourMarking}: pegado le regalas el giro; defiende el espacio`); }
      else { oi.tightMarking = "si"; reasons.push(`vive del desmarque (Des ${a(p, "OtB")}) y es flojo físicamente (Fue ${a(p, "Str")}): pegado no aparece`); }
    }
    else if (unit !== "def" && avg(p, ["Vis", "Pas", "Tec"]) >= 15 && !fastDribbler) { oi.tightMarking = "si"; reasons.push("organizador: que reciba siempre con alguien encima"); }

    const soft = a(p, "Bra") <= 10 || (a(p, "Bal") <= 10 && a(p, "Str") <= 12);
    const drawsFouls = a(p, "Agi") >= 15 && a(p, "Dri") >= 14;
    if (drawsFouls) { oi.tackling = "suaves"; reasons.push(`ágil y regateador (Agi ${a(p, "Agi")}, Reg ${a(p, "Dri")}): las entradas duras son faltas y tarjetas`); }
    else if (soft && unit !== "def") { oi.tackling = "duras"; reasons.push(`blando (Val ${a(p, "Bra")}, Equ ${a(p, "Bal")}, Fue ${a(p, "Str")}): el contacto le saca del partido`); }

    const l = footLevel(p.leftFoot), r = footLevel(p.rightFoot);
    if (l != null && r != null && Math.abs(l - r) >= 3 && unit !== "def") {
      oi.showFoot = l < r ? "izquierdo" : "derecho";
      reasons.push(`pie ${oi.showFoot} flojo (${l < r ? p.leftFoot : p.rightFoot}) frente a ${l < r ? p.rightFoot : p.leftFoot}`);
    }
    if (oi.closingDown || oi.tightMarking || oi.tackling || oi.showFoot) out.push(oi);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Debilidades y ajustes a nuestra táctica
// ---------------------------------------------------------------------------

export interface Tweak {
  /** Instrucción de nuestra táctica a activar (id de INSTRUCTIONS) o consejo sin instrucción. */
  instructionId: string | null;
  label: string;
  reason: string;
  /** Instrucciones incompatibles que conviene quitar. */
  remove?: string[];
  level: "clave" | "util";
}

export interface RivalWeakness {
  text: string;
  tweaks: Tweak[];
}

function tweak(instructionId: string | null, reason: string, level: Tweak["level"] = "util", remove?: string[], label?: string): Tweak {
  return { instructionId, label: label ?? (instructionId ? INSTRUCTION_BY_ID[instructionId]?.name ?? instructionId : ""), reason, level, remove };
}

/** Perfil agregado del XI rival que usan debilidades y estilos. */
export interface RivalProfile {
  gk: Player | null;
  def: Player[];
  mid: Player[];
  att: Player[];
  /** Laterales por banda del rival (izquierda del rival = nuestra derecha). */
  leftBack: Player | null;
  rightBack: Player | null;
  defSpeed: number | null;
  defAerial: number | null;
  defOnBall: number | null;
  midOnBall: number | null;
  midWork: number | null;
  attSpeed: number | null;
  attAerial: number | null;
  attPhysical: number | null;
  dribblers: number;
  stamina: number | null;
  bravery: number | null;
}

export function rivalProfile(rl: RivalLineup): RivalProfile {
  const xi = starters(rl.lineup);
  const byUnit = (u: Unit) => xi.filter((s) => unitOfSlot(s.slot) === u).map((s) => s.player);
  const gk = xi.find((s) => s.player.isGoalkeeper)?.player ?? null;
  const def = byUnit("def"), mid = byUnit("mid"), att = byUnit("att");
  const centrals = xi.filter((s) => s.slot === "DC").map((s) => s.player);
  const out: RivalProfile = {
    gk, def, mid, att,
    leftBack: xi.find((s) => s.slot === "DL" || s.slot === "WBL")?.player ?? null,
    rightBack: xi.find((s) => s.slot === "DR" || s.slot === "WBR")?.player ?? null,
    defSpeed: meanOf(centrals.length ? centrals : def, ["Pac", "Acc"]),
    defAerial: meanOf(centrals.length ? centrals : def, ["Hea", "Jum"]),
    defOnBall: meanOf(def, ["Cmp", "Fir", "Pas"]),
    midOnBall: meanOf(mid, ["Cmp", "Fir", "Dec"]),
    midWork: meanOf(mid, ["Wor", "Sta", "Tea"]),
    attSpeed: meanOf(att, ["Pac", "Acc"]),
    attAerial: meanOf(att, ["Hea", "Jum"]),
    attPhysical: meanOf(att, ["Str", "Jum"]),
    dribblers: [...mid, ...att].filter((p) => a(p, "Dri") >= 15 && a(p, "Agi") >= 14).length,
    stamina: meanOf([...def, ...mid, ...att], ["Sta", "Wor"]),
    bravery: meanOf([...def, ...mid, ...att], ["Bra", "Cmp"]),
  };
  return out;
}

export function rivalWeaknesses(rl: RivalLineup, ours: LineupResult | null): RivalWeakness[] {
  const r = rivalProfile(rl);
  const out: RivalWeakness[] = [];
  const oursXi = ours ? starters(ours) : [];
  const ourAtt = oursXi.filter((s) => unitOfSlot(s.slot) === "att").map((s) => s.player);
  const ourDef = oursXi.filter((s) => s.slot === "DC").map((s) => s.player);
  const ourAttSpeed = meanOf(ourAtt, ["Pac", "Acc"]);
  const ourAttAerial = meanOf(ourAtt, ["Hea", "Jum"]);
  const ourDefSpeed = meanOf(ourDef, ["Pac", "Acc"]);
  const ourDefAerial = meanOf(ourDef, ["Hea", "Jum"]);

  // Defensa lenta → balones al espacio
  if (r.defSpeed != null && (r.defSpeed < 12.5 || (ourAttSpeed != null && ourAttSpeed - r.defSpeed >= 2.5))) {
    out.push({
      text: `Centrales lentos (Vel/Ace ${f1(r.defSpeed)}${ourAttSpeed != null ? ` frente a ${f1(ourAttSpeed)} de tu ataque` : ""}).`,
      tweaks: [
        tweak("pasar-espacio", "tus delanteros les ganan la carrera", "clave"),
        tweak("ritmo-alto", "no dejes que se reorganicen", "util", ["ritmo-bajo"]),
        tweak("contraatacar", "cada recuperación es una carrera ganada", "util", ["mantener-forma"]),
        tweak(null, "Delantero avanzado o Ariete en ataque, sin bajar a recibir", "util", undefined, "Rol: punta rápido"),
      ],
    });
  }
  // Defensa floja por arriba
  if (r.defAerial != null && (r.defAerial < 12.5 || (ourAttAerial != null && ourAttAerial - r.defAerial >= 2))) {
    out.push({
      text: `Defensa floja por arriba (Cab/Sal ${f1(r.defAerial)}${ourAttAerial != null ? ` frente a ${f1(ourAttAerial)} de tus atacantes` : ""}).`,
      tweaks: [
        tweak("centros-colgados", "centros al área que tus rematadores ganan", "clave", ["centros-rasos", "centros-rosca", "centros-mixtos"]),
        tweak("balon-parado", "córners y faltas laterales son ocasiones claras", "util"),
        tweak("centros-tempranos", "antes de que se asienten", "util"),
      ],
    });
  }
  // Portero flojo
  if (r.gk) {
    const g = r.gk;
    if (avg(g, ["Han", "Ref", "1v1"]) <= 12) out.push({ text: `Portero flojo bajo palos (Blo ${a(g, "Han")}, Ref ${a(g, "Ref")}, 1v1 ${a(g, "1v1")}).`, tweaks: [tweak("tirar-minima", "cada disparo es una posibilidad; prueba también desde lejos", "clave", ["trabajar-area"])] });
    if (a(g, "Aer") <= 12 || a(g, "Cmd") <= 11) out.push({ text: `Portero que no sale (Alc. aéreo ${a(g, "Aer")}, Mando ${a(g, "Cmd")}).`, tweaks: [tweak("centros-colgados", "el área es tierra de nadie", "util"), tweak("balon-parado", "córners cerrados al primer palo", "util")] });
    if (avg(g, ["Kic", "Thr"]) <= 11 || a(g, "Cmp") <= 10) out.push({ text: `Portero que se atasca con el balón (Pat ${a(g, "Kic")}, Ser ${a(g, "Cmp")}).`, tweaks: [tweak("impedir-saque-corto", "oblígale a pegar largo, sin salida limpia", "clave"), tweak("linea-presion-alta", "presión en su área", "util", ["linea-presion-baja", "linea-presion-media"])] });
  }
  // Salida de balón floja → presión alta
  if (r.defOnBall != null && r.midOnBall != null && (r.defOnBall + r.midOnBall) / 2 <= 12.5) {
    out.push({
      text: `Salida de balón floja (defensa ${f1(r.defOnBall)}, medio ${f1(r.midOnBall)} en serenidad/toque/pase).`,
      tweaks: [
        tweak("linea-presion-alta", "roban arriba y encuentras la portería cerca", "clave", ["linea-presion-baja", "linea-presion-media"]),
        tweak("presionar-mas", "el error llega con la presión", "clave", ["presionar-menos", "presionar-mucho-menos"]),
        tweak("contrapresionar", "al perderla, encima otra vez", "util", ["reagruparse"]),
        tweak("impedir-saque-corto", "sin salida corta se tiran al largo", "util"),
      ],
    });
  } else if (r.midOnBall != null && r.midOnBall >= 15 && r.dribblers >= 2) {
    out.push({
      text: `Medio campo técnico y con ${r.dribblers} regateadores: presionarles arriba es regalar espacio.`,
      tweaks: [
        tweak("linea-presion-media", "bloque compacto y esperar", "clave", ["linea-presion-alta"]),
        tweak("reagruparse", "al perderla, forma antes que presión", "util", ["contrapresionar"]),
        tweak("mantenerse-pie", "los regateadores buscan la falta y la tarjeta", "util", ["entradas-duras"]),
      ],
    });
  }
  // Ataque rápido → sin línea alta
  if (r.attSpeed != null && (r.attSpeed >= 15 || (ourDefSpeed != null && r.attSpeed - ourDefSpeed >= 2))) {
    out.push({
      text: `Ataque rápido (Vel/Ace ${f1(r.attSpeed)}${ourDefSpeed != null ? ` frente a ${f1(ourDefSpeed)} de tus centrales` : ""}).`,
      tweaks: [
        tweak("linea-def-baja", "sin espacio a la espalda no hay carrera", "clave", ["linea-def-alta", "linea-def-mucho-mas-alta", "adelantarse-mas"]),
        tweak("retroceder-mas", "la línea cede metros antes de que arranquen", "util", ["adelantarse-mas"]),
        tweak(null, "un central en Cubrir y el lateral del lado de su extremo rápido en defender", "util", undefined, "Rol: central en Cubrir"),
      ],
    });
  } else if (r.attSpeed != null && r.attSpeed <= 12.5 && ourDefSpeed != null && ourDefSpeed >= 13) {
    out.push({ text: `Ataque lento (Vel/Ace ${f1(r.attSpeed)}): puedes subir la línea sin miedo.`, tweaks: [tweak("linea-def-alta", "acorta el campo y ahoga su salida", "util", ["linea-def-baja", "linea-def-mucho-mas-baja"]), ...(r.att.length <= 1 ? [tweak("adelantarse-mas", "no tienen quien gane la carrera y juegan con un solo punta (04texag: nunca contra dos)", "util", ["retroceder-mas"])] : [])] });
  }
  // Ataque aéreo → anchura amplia y marcadores
  if (r.attAerial != null && (r.attAerial >= 14.5 || (ourDefAerial != null && r.attAerial - ourDefAerial >= 1.5))) {
    out.push({
      text: `Peligro por arriba (Cab/Sal ${f1(r.attAerial)}${ourDefAerial != null ? ` frente a ${f1(ourDefAerial)} de tus centrales` : ""}).`,
      tweaks: [
        tweak("evitar-centros", "corta los centros en origen", "clave", ["permitir-centros"]),
        tweak(null, "en córners en contra, tus mejores marcadores aéreos sobre sus rematadores (ver Balón parado)", "clave", undefined, "Balón parado: marcajes"),
      ],
    });
  } else if (r.attAerial != null && r.attAerial <= 12) {
    out.push({ text: `Ataque sin juego aéreo (Cab/Sal ${f1(r.attAerial)}).`, tweaks: [tweak("permitir-centros", "invítales a centrar: no lo van a rematar", "util", ["evitar-centros"])] });
  }
  // Laterales flojos → explotar banda (su izquierda es tu derecha)
  const backLevel = (p: Player | null) => (p ? (bestRoles(p, 1)[0]?.score ?? 0) : null);
  const lb = backLevel(r.leftBack), rb = backLevel(r.rightBack);
  if (lb != null && rb != null && Math.abs(lb - rb) >= 8) {
    const weakIsLeft = lb < rb;
    const weak = weakIsLeft ? r.leftBack! : r.rightBack!;
    out.push({
      text: `Lateral ${weakIsLeft ? "izquierdo" : "derecho"} flojo (${weak.name}, nivel ${Math.round(weakIsLeft ? lb : rb)} frente a ${Math.round(weakIsLeft ? rb : lb)} del otro).`,
      tweaks: [tweak(weakIsLeft ? "explotar-der" : "explotar-izq", `tu banda ${weakIsLeft ? "derecha" : "izquierda"} ataca su lado débil`, "clave", [weakIsLeft ? "explotar-izq" : "explotar-der"])],
    });
  }
  for (const [side, p] of [["izquierdo", r.leftBack], ["derecho", r.rightBack]] as const) {
    if (p && avg(p, ["Pac", "Acc"]) <= 12) out.push({ text: `Lateral ${side} lento (${p.name}, Vel/Ace ${f1(avg(p, ["Pac", "Acc"]))}).`, tweaks: [tweak(side === "izquierdo" ? "explotar-der" : "explotar-izq", "extremo rápido contra él, desmarque por fuera", "util")] });
  }
  // Físico / mental
  if (r.stamina != null && r.stamina <= 12.5) out.push({ text: `Poca resistencia y trabajo (${f1(r.stamina)}): se caen en la segunda parte.`, tweaks: [tweak("ritmo-alto", "hazles correr", "util", ["ritmo-bajo"]), tweak("presionar-mas", "no les dejes respirar", "util", ["presionar-menos"])] });
  if (r.bravery != null && r.bravery <= 11.5) out.push({ text: `Equipo blando (valentía/serenidad ${f1(r.bravery)}).`, tweaks: [tweak("entradas-duras", "el contacto les saca del partido; vigila las tarjetas", "util", ["mantenerse-pie"])] });
  if (r.midWork != null && r.midWork <= 12) out.push({ text: `Medio campo que no trabaja sin balón (${f1(r.midWork)}).`, tweaks: [tweak("pases-cortos", "la posesión será tuya: muévela y espera el hueco", "util", ["pases-directos"]), tweak("trabajar-area", "no hay prisa: no van a robar", "util", ["tirar-minima"])] });
  return out;
}

// ---------------------------------------------------------------------------
// Nuestros estilos contra este rival
// ---------------------------------------------------------------------------

export interface StyleMatchup {
  style: StylePreset;
  /** Encaje con nuestro XI (media 1-20 de los atributos clave). */
  fit: number | null;
  /** Bonificación/penalización por el rival (puntos en la misma escala). */
  matchup: number;
  reasons: string[];
  total: number;
}

export function rankStylesVsRival(rl: RivalLineup, ours: LineupResult | null): StyleMatchup[] {
  const r = rivalProfile(rl);
  return STYLE_PRESETS.map((style) => {
    const fit = ours ? styleFit(style, ours).mean : null;
    let m = 0;
    const reasons: string[] = [];
    const t = styleTraits(style.id);
    const buildup = r.defOnBall != null && r.midOnBall != null ? (r.defOnBall + r.midOnBall) / 2 : null;
    if (t.pressing) {
      if (buildup != null && buildup <= 12.5) { m += 1.5; reasons.push("su salida de balón es floja: la presión roba arriba"); }
      if (buildup != null && buildup >= 15) { m -= 1; reasons.push("salen jugando bien: la presión se salta con un pase"); }
      if (r.dribblers >= 2) { m -= 0.75; reasons.push(`${r.dribblers} regateadores: te ganan el uno contra uno al saltar`); }
      if (r.attSpeed != null && r.attSpeed >= 15) { m -= 0.75; reasons.push("ataque rápido: la línea alta que exige la presión sufre"); }
    }
    if (t.counter) {
      if (r.defSpeed != null && r.defSpeed <= 12.5) { m += 1.5; reasons.push("centrales lentos: el contragolpe les gana la carrera"); }
      if (r.midWork != null && r.midWork >= 15) { m -= 0.5; reasons.push("medio que repliega rápido: hay poco espacio para correr"); }
    }
    if (t.deep) {
      if (r.attSpeed != null && r.attSpeed >= 15) { m += 1; reasons.push("ataque rápido: el bloque bajo le niega el espacio"); }
      if (r.attAerial != null && r.attAerial >= 14.5) { m -= 0.75; reasons.push("rematadores altos: te van a colgar balones al área"); }
      if (r.midOnBall != null && r.midOnBall <= 12) { m -= 0.5; reasons.push("se atascan con el balón: replegarse desperdicia sus errores"); }
    }
    if (t.possession) {
      if (r.midWork != null && r.midWork <= 12.5) { m += 1; reasons.push("no trabajan sin balón: la posesión será cómoda"); }
      if (r.stamina != null && r.stamina <= 12.5) { m += 0.5; reasons.push("poca resistencia: la posesión les desgasta"); }
      if (r.midWork != null && r.midWork >= 15 && r.midOnBall != null && r.midOnBall >= 14) { m -= 0.75; reasons.push("medio campo trabajador y técnico: te presionarán la salida"); }
    }
    if (!t.possession && !t.pressing && r.attAerial != null && r.defAerial != null && r.defAerial <= 12.5) { m += 0.5; reasons.push("floja por arriba: el juego directo encuentra rematadores"); }
    return { style, fit, matchup: m, reasons, total: (fit ?? 12) + m };
  }).sort((x, y) => y.total - x.total);
}

// ---------------------------------------------------------------------------
// Comparativa de unidades: nosotros contra ellos
// ---------------------------------------------------------------------------

export interface UnitDuel {
  label: string;
  cluster: string;
  ours: number | null;
  theirs: number | null;
  /** Positivo = ventaja nuestra. */
  edge: number | null;
}

/** Cruces que importan: tu ataque contra su defensa, tu defensa contra su ataque, medio contra medio. */
export function unitDuels(ours: LineupResult | null, rl: RivalLineup): UnitDuel[] {
  const ourXi = ours ? starters(ours) : [];
  const theirXi = starters(rl.lineup);
  const unit = (xi: { player: Player; slot: PositionSlot }[], u: Unit) => xi.filter((s) => unitOfSlot(s.slot) === u).map((s) => s.player);
  const c = (id: string) => CLUSTERS.find((x) => x.id === id)!;
  const duels: [string, Unit, Unit, string][] = [
    ["Tu ataque vs su defensa", "att", "def", "vel"], ["Tu ataque vs su defensa", "att", "def", "aer"], ["Tu ataque vs su defensa", "att", "def", "tec"],
    ["Tu medio vs su medio", "mid", "mid", "tec"], ["Tu medio vs su medio", "mid", "mid", "men"], ["Tu medio vs su medio", "mid", "mid", "fis"],
    ["Tu defensa vs su ataque", "def", "att", "vel"], ["Tu defensa vs su ataque", "def", "att", "aer"], ["Tu defensa vs su ataque", "def", "att", "fis"],
  ];
  return duels.map(([label, ou, tu, cid]) => {
    const cl = c(cid);
    const o = ourXi.length ? meanOf(unit(ourXi, ou), cl.keys) : null;
    const t = meanOf(unit(theirXi, tu), cl.keys);
    return { label, cluster: cl.label, ours: o, theirs: t, edge: o != null && t != null ? o - t : null };
  });
}

/** Percentil en la liga de cada titular rival (si hay liga importada). */
export function rivalLeagueLevels(rl: RivalLineup, league: LeagueStats | null): { player: Player; slot: PositionSlot; percentile: number | null; family: string }[] {
  return starters(rl.lineup).map((s) => ({ player: s.player, slot: s.slot, family: familyOf(s.player), percentile: league ? leagueLevelPercentile(league, s.player) : null }));
}

export { UNIT_LABEL };

// ---------------------------------------------------------------------------
// Bloque y gatillo según su serenidad (matriz de DarkHorse: gatillo × Ser/Dec)
// ---------------------------------------------------------------------------

export interface PressPlan {
  /** Serenidad/Decisiones media de su salida (portero, defensa y medio). */
  composure: number | null;
  bloque: string;
  gatillo: string;
  reason: string;
  instructions: string[];
  remove: string[];
}

export function rivalPressPlan(rl: RivalLineup): PressPlan {
  const r = rivalProfile(rl);
  const pool = [...(r.gk ? [r.gk] : []), ...r.def, ...r.mid];
  const composure = meanOf(pool, ["Cmp", "Dec"]);
  if (composure == null) return { composure, bloque: "medio", gatillo: "estándar", reason: "sin datos suficientes", instructions: [], remove: [] };
  if (composure <= 12.5) return {
    composure, bloque: "alto", gatillo: "mucho más",
    reason: `su salida tiene Serenidad/Decisiones ${f1(composure)}: el gatillo alto fuerza el error. Con Contrapresión y Evitar pases en corto del portero.`,
    instructions: ["linea-presion-alta", "presionar-mucho-mas", "contrapresionar", "impedir-saque-corto"],
    remove: ["linea-presion-baja", "linea-presion-media", "presionar-menos", "presionar-mucho-menos", "presionar-mas", "reagruparse"],
  };
  if (composure >= 15) return {
    composure, bloque: "medio", gatillo: "menos",
    reason: `su salida tiene Serenidad/Decisiones ${f1(composure)}: no se equivocan bajo presión; saltar solo abre espacio. Bloque medio compacto y esperar el pase largo.`,
    instructions: ["linea-presion-media", "presionar-menos"],
    remove: ["linea-presion-alta", "presionar-mas", "presionar-mucho-mas"],
  };
  return {
    composure, bloque: "medio o alto", gatillo: "más",
    reason: `su salida tiene Serenidad/Decisiones ${f1(composure)}: presión frecuente sin exagerar; sube el bloque si su portero se atasca.`,
    instructions: ["presionar-mas"],
    remove: ["presionar-menos", "presionar-mucho-menos"],
  };
}

// ---------------------------------------------------------------------------
// Córners contra su defensa (PDF de balón parado)
// ---------------------------------------------------------------------------

export interface CornerPlan {
  /** Sus defensores aéreos, del mejor al peor. */
  defenders: { player: Player; aerial: number; height: number | null }[];
  weakest: { player: Player; aerial: number; height: number | null } | null;
  /** A qué palo insistir y por qué. */
  post: "primer palo" | "segundo palo" | "centro";
  reason: string;
}

export function rivalCornerPlan(rl: RivalLineup): CornerPlan {
  const xi = starters(rl.lineup).map((s) => s.player).filter((p) => !p.isGoalkeeper);
  const defenders = xi.map((p) => ({ player: p, aerial: (a(p, "Hea") + a(p, "Jum")) / 2, height: p.height })).sort((x, y) => y.aerial - x.aerial);
  const tall = defenders.filter((d) => (d.height ?? 0) >= 188 || d.aerial >= 15);
  const weakest = defenders.length ? defenders[defenders.length - 1] : null;
  const gkAer = rl.lineup.slots.find((s) => s.starter?.player.isGoalkeeper)?.starter?.player.attrs.Aer?.value ?? null;
  if (gkAer != null && gkAer <= 11) return { defenders, weakest, post: "primer palo", reason: `su portero no sale (Alcance aéreo ${gkAer}): córners cerrados al primer palo con el mejor rematador y un jugador alto estorbándole.` };
  if (tall.length >= 3) return { defenders, weakest, post: "primer palo", reason: `${tall.length} defensores altos o buenos por arriba: insistir con balones altos al segundo palo es inútil. Arrastre: mejor rematador al primer palo, dos al segundo para llevarse marcadores.` };
  if (tall.length <= 1) return { defenders, weakest, post: "segundo palo", reason: `solo ${tall.length} defensor de verdad por arriba: balón colgado al segundo palo con dos rematadores; el más flojo (${weakest?.player.name ?? "—"}, Cab/Sal ${weakest ? f1(weakest.aerial) : "–"}) no lo gana.` };
  return { defenders, weakest, post: "centro", reason: "defensa aérea normal: rutina de arrastre (mejor rematador al primer palo, dos al segundo) y variar." };
}
