/**
 * Contratación: ADN del club, focos de contratación listos para copiar en el
 * juego (campo a campo, en el orden de la pantalla «Foco de contratación»),
 * reparto de ojeadores y analistas según sus atributos y su carga, objetivos
 * propuestos y lo que falta para evolucionar al siguiente estilo.
 */

import { ATTR_BY_KEY, type AttrKey } from "./attributes";
import { roleFunctions } from "./balance";
import { STYLE_BY_ID, profileOf, styleChildren, styleTraits, type StylePreset } from "./instructions";
import { personalityTierLevel, TIER_LABEL, type PersonalityTierLevel } from "./personalities";
import { POSITION_LABEL, type RoleDef } from "./roles";
import type { CandidateEval, SquadNeed } from "./scouting";
import { fmtMoney } from "./scouting";
import { profileText } from "./slotPlan";
import { nationName, type StaffMember } from "./staff";
import { styleGaps, type GapResult } from "./styles";
import type { LineupResult, Tactic } from "./tactics";
import type { Player, PositionSlot } from "./types";

// ---------------------------------------------------------------------------
// ADN del club
// ---------------------------------------------------------------------------

export type WeakFootMin = "cualquiera" | "razonable" | "buena";

export interface ClubDna {
  ageMin: number | null;
  ageMax: number | null;
  /** Personalidad mínima (nivel de TIER_LABEL). */
  minPersonality: PersonalityTierLevel | null;
  /** Sueldo máximo en % del sueldo más alto de la plantilla. */
  maxWagePct: number | null;
  weakFoot: WeakFootMin;
  minHeight: number | null;
  /** Solo jugadores con cláusula de rescisión o transferibles. */
  onlyClauseOrListed: boolean;
  /** Aplicar los umbrales por línea que salen del estilo. */
  styleAuto: boolean;
}

export const DEFAULT_DNA: ClubDna = { ageMin: null, ageMax: null, minPersonality: null, maxWagePct: null, weakFoot: "cualquiera", minHeight: null, onlyClauseOrListed: false, styleAuto: true };

/** Umbral por línea que sale del estilo. */
export interface DnaRule {
  slots: PositionSlot[];
  attr: AttrKey;
  min: number;
  why: string;
}

const PIVOTS: PositionSlot[] = ["DM", "MC"];
const CBS: PositionSlot[] = ["DC"];
const PRESSERS: PositionSlot[] = ["DM", "MC", "ML", "MR", "AML", "AMC", "AMR", "ST", "WBL", "WBR"];
const RUNNERS: PositionSlot[] = ["AML", "AMR", "ST", "ML", "MR"];

/** Umbrales automáticos del estilo: Serenidad en los pivotes si es de posesión, Velocidad en los centrales si la línea es alta… */
export function styleDnaRules(tactic: Tactic | null): DnaRule[] {
  const style = STYLE_BY_ID[tactic?.styleId ?? ""];
  if (!tactic || !style) return [];
  const tr = styleTraits(style.id);
  const prof = profileOf(tactic.instructions.length ? tactic.instructions : style.instructions);
  const out: DnaRule[] = [];
  if (tr.possession) out.push({ slots: PIVOTS, attr: "Cmp", min: 13, why: `${style.name}: los pivotes reciben presionados` });
  if (prof.lineaDef >= 1 || prof.bloque === "alto") out.push({ slots: CBS, attr: "Pac", min: 13, why: `${style.name}: línea alta, mucho espacio a la espalda` });
  if (tr.pressing) out.push({ slots: PRESSERS, attr: "Sta", min: 13, why: `${style.name}: presión durante 90 minutos` });
  if (tr.counter) out.push({ slots: RUNNERS, attr: "Acc", min: 13, why: `${style.name}: correr al espacio al recuperar` });
  return out;
}

const FOOT_RANK = (s: string | null): number => {
  const t = (s ?? "").toLowerCase();
  if (/muy fuerte|very strong/.test(t)) return 5;
  if (/bastante fuerte|fairly strong/.test(t)) return 3;
  if (/fuerte|strong/.test(t)) return 4;
  if (/razonable|reasonable/.test(t)) return 2;
  if (/muy d[ée]bil|very weak/.test(t)) return 0;
  if (/d[ée]bil|weak/.test(t)) return 1;
  return -1;
};

export interface DnaResult {
  ok: boolean;
  misses: string[];
}

/**
 * Comprueba un jugador contra el ADN. `slot` activa los umbrales del estilo de
 * ese hueco; `maxWage` es el sueldo más alto de la plantilla; `youth` quita
 * los filtros de mercado (edad, sueldo, cláusula) para los juveniles propios.
 */
export function dnaCheck(p: Player, dna: ClubDna, rules: DnaRule[], slot: PositionSlot | null, maxWage: number | null, youth = false): DnaResult {
  const misses: string[] = [];
  const age = p.age;
  if (!youth) {
    if (dna.ageMin != null && age != null && age < dna.ageMin) misses.push(`edad ${age} < ${dna.ageMin}`);
    if (dna.ageMax != null && age != null && age > dna.ageMax) misses.push(`edad ${age} > ${dna.ageMax}`);
    if (dna.maxWagePct != null && maxWage != null && p.wage != null && p.wage > (maxWage * dna.maxWagePct) / 100) misses.push(`sueldo ${fmtMoney(p.wage)} > ${dna.maxWagePct} % del máximo (${fmtMoney((maxWage * dna.maxWagePct) / 100)})`);
    if (dna.onlyClauseOrListed && p.releaseClause == null && !/listado|listed|transferible/i.test(p.transferStatus ?? "")) misses.push("sin cláusula ni transferible");
  }
  if (dna.minPersonality != null && personalityTierLevel(p.personality) < dna.minPersonality) misses.push(`personalidad ${p.personality ?? "?"} (< ${TIER_LABEL[dna.minPersonality]})`);
  if (dna.minHeight != null && p.height != null && p.height < dna.minHeight) misses.push(`altura ${p.height} < ${dna.minHeight}`);
  if (dna.weakFoot !== "cualquiera" && !p.isGoalkeeper) {
    const left = FOOT_RANK(p.leftFoot);
    const right = FOOT_RANK(p.rightFoot);
    const need = dna.weakFoot === "razonable" ? 2 : 3;
    if (left >= 0 && right >= 0 && Math.min(left, right) < need) misses.push(`pierna mala: ${left <= right ? `izquierda ${p.leftFoot}` : `derecha ${p.rightFoot}`}`);
  }
  if (dna.styleAuto && slot) {
    for (const r of rules.filter((x) => x.slots.includes(slot))) {
      const v = p.attrs[r.attr]?.value;
      if (v != null && v < r.min) misses.push(`${ATTR_BY_KEY[r.attr]?.es} ${v} < ${r.min} (${r.why})`);
    }
  }
  return { ok: misses.length === 0, misses };
}

export function dnaSummary(dna: ClubDna, rules: DnaRule[]): string[] {
  const out: string[] = [];
  if (dna.ageMin != null || dna.ageMax != null) out.push(`edad ${dna.ageMin ?? 15}-${dna.ageMax ?? 40}`);
  if (dna.minPersonality != null) out.push(`personalidad ≥ ${TIER_LABEL[dna.minPersonality]}`);
  if (dna.maxWagePct != null) out.push(`sueldo ≤ ${dna.maxWagePct} % del máximo de la plantilla`);
  if (dna.weakFoot !== "cualquiera") out.push(`pierna mala ≥ ${dna.weakFoot === "razonable" ? "Razonable" : "Bastante fuerte"}`);
  if (dna.minHeight != null) out.push(`altura ≥ ${dna.minHeight} cm`);
  if (dna.onlyClauseOrListed) out.push("solo con cláusula o transferibles");
  if (dna.styleAuto) for (const r of rules) out.push(`${ATTR_BY_KEY[r.attr]?.es} ≥ ${r.min} en ${[...new Set(r.slots.map((s) => POSITION_LABEL[s]))].join("/")}`);
  return out;
}

// ---------------------------------------------------------------------------
// Focos de contratación
// ---------------------------------------------------------------------------

export type FocusPriority = "Máxima" | "Estándar" | "Indefinido";
export type FocusHorizon = "inmediato" | "rotacion" | "futuro";

/** Foco que ya creaste en el juego (se guarda para contar la carga y detectar ojeadores que se van). */
export interface CreatedFocus {
  name: string;
  scout: string | null;
  analyst: string | null;
  createdAt: string;
}

export interface FocusField {
  label: string;
  value: string;
  hint?: string;
}

export interface RecruitmentFocus {
  key: string;
  title: string;
  need: SquadNeed | null;
  horizon: FocusHorizon;
  priority: FocusPriority;
  /** Campos de la pantalla del juego, en su orden. */
  fields: FocusField[];
  /** Detalles adicionales (Estilo de jugador, Cualidad de jugador, Pierna buena, Altura, Sueldo). */
  details: FocusField[];
  scout: StaffMember | null;
  analyst: StaffMember | null;
  scoutWhy: string;
  /** Ya creado en el juego (y con qué ojeador). */
  created: CreatedFocus | null;
  /** Avisos: ojeador que ya no está, foco creado sin necesidad… */
  alerts: string[];
  note: string;
}

/** Abreviatura de rol para el nombre del foco (formato «DL (C)-DLA»). */
const ROLE_ABBR: Record<string, string> = {
  GK: "POR", SK: "PCI", CD: "DFC", BPD: "DCT", NCB: "CPR", L: "LIB", WCB: "CLT",
  FB: "LAT", NFB: "LPR", IFB: "LIN", WB: "CAR", CWB: "CCO", IWB: "CIN",
  A: "PDF", DM: "MCN", HB: "MCI", DLP: "PVO", REG: "REG", BWM: "REC", RPM: "OIT", SV: "SVO",
  CM: "CEN", B2B: "TOD", CAR: "IMX", MEZ: "MEZ", AP: "OAD",
  W: "EXT", IW: "EXI", WP: "OBA", WM: "CBA", DW: "EXD", IF: "DIN", RMD: "BES", WTF: "DOE", TQ: "TRE",
  AM: "MPU", EG: "ENG", SS: "DSO", AF: "DLA", P: "ARI", CF: "DCO", DLF: "SDL", PF: "DPR", TF: "DOB", F9: "FN9",
};

const focusPosition = (slot: PositionSlot) => (slot === "ST" ? "DL (C)" : POSITION_LABEL[slot]);

export function focusName(slot: PositionSlot, role: RoleDef): string {
  return `${focusPosition(slot)}-${ROLE_ABBR[role.code] ?? role.code}`.slice(0, 25);
}

/** «Estilo de jugador» del foco (8 valores del juego) según lo que hace el hueco. */
function playerStyle(role: RoleDef, slot: PositionSlot): string | null {
  if (slot === "GK") return role.code === "SK" ? "Distribuidor (POR)" : "Guardameta (POR)";
  const fns = roleFunctions(role, slot).fns;
  if (fns.includes("crea")) return "Creativo";
  if (fns.includes("fija") || fns.includes("descarga")) return "Físico";
  if (fns.includes("conduce")) return "Técnico";
  if (fns.includes("destruye")) return "Físico";
  if (fns.includes("sostiene") || fns.includes("huecos")) return "Inteligente";
  return null;
}

function goodFoot(role: RoleDef, slot: PositionSlot): string | null {
  const side = slot.endsWith("L") ? "L" : slot.endsWith("R") ? "R" : null;
  if (!side || slot === "GK") return null;
  const fns = roleFunctions(role, slot).fns;
  if (fns.includes("pasillo") && !fns.includes("amplitud")) return side === "L" ? "Derecha (a pierna cambiada)" : "Izquierda (a pierna cambiada)";
  if (fns.includes("amplitud")) return side === "L" ? "Izquierda" : "Derecha";
  return null;
}

function aerialHeight(role: RoleDef, slot: PositionSlot): number | null {
  if (slot === "GK") return 188;
  if (slot === "DC" || role.code === "TF" || role.code === "WTF") return 186;
  return null;
}

const stars = (n: number) => `${n.toString().replace(".", ",")} ★`;

export interface FocusContext {
  tactic: Tactic;
  staff: StaffMember[];
  dna: ClubDna;
  budget: { transfer: number | null; wage: number | null };
  firstTeam: Player[];
  created: Record<string, CreatedFocus>;
}

function horizonOf(n: SquadNeed): FocusHorizon {
  if (n.level === "sucesion" || n.ageBand === "futuro") return "futuro";
  if (n.level === "urgente" && n.starter && !n.weakLink && !n.profile && n.reasons.some((r) => /suplente/i.test(r))) return "rotacion";
  return "inmediato";
}

/** Ojeador o analista para el foco: por el atributo que importa y la carga que ya lleva. */
function pick(people: StaffMember[], horizon: FocusHorizon, load: Map<string, number>): { who: StaffMember | null; why: string } {
  const key = (m: StaffMember) => (horizon === "futuro" ? m.judgePotential ?? 0 : m.judgeAbility ?? 0);
  const score = (m: StaffMember) => key(m) - 1.5 * (load.get(m.name) ?? 0) + (m.adaptability ?? 0) * 0.05;
  const who = people.filter((m) => !m.gone).sort((a, b) => score(b) - score(a))[0] ?? null;
  if (!who) return { who: null, why: "" };
  const attr = horizon === "futuro" ? `Juz. Pot ${who.judgePotential ?? "?"}` : `Juz. Cal ${who.judgeAbility ?? "?"}`;
  const l = load.get(who.name) ?? 0;
  return { who, why: `${attr}${l ? `, ya lleva ${l} foco${l === 1 ? "" : "s"}` : ", sin focos"}` };
}

function areas(scout: StaffMember | null): string {
  if (!scout) return "Donde conozca el mercado tu ojeador";
  const home = nationName(scout.nationality) ?? "su país";
  const ada = scout.adaptability ?? 0;
  if (ada >= 15) return `${home} o cualquier mercado (Adaptabilidad ${ada}: se le puede mandar lejos)`;
  if (ada <= 9) return `${home} y alrededores (Adaptabilidad ${ada}: no mandarle lejos)`;
  return `${home} y mercados cercanos (Adaptabilidad ${ada})`;
}

/**
 * Focos para las necesidades de la táctica (Máxima para lo urgente, Estándar
 * para lo mejorable y la sucesión) y los encargos permanentes (Indefinido),
 * con ojeador y analista concretos repartidos por carga.
 */
export function buildFocuses(needs: SquadNeed[], ctx: FocusContext): RecruitmentFocus[] {
  const scouts = ctx.staff.filter((m) => m.kind === "ojeador");
  const analysts = ctx.staff.filter((m) => m.kind === "analista");
  const load = new Map<string, number>();
  const bump = (name: string | null | undefined) => { if (name) load.set(name, (load.get(name) ?? 0) + 1); };
  for (const c of Object.values(ctx.created)) { bump(c.scout); bump(c.analyst); }
  const wages = ctx.firstTeam.map((p) => p.wage).filter((w): w is number => w != null).sort((a, b) => a - b);
  const maxWage = wages.length ? wages[wages.length - 1] : null;
  const dnaWage = ctx.dna.maxWagePct != null && maxWage != null ? (maxWage * ctx.dna.maxWagePct) / 100 : null;
  const wageCap = [ctx.budget.wage, dnaWage].filter((x): x is number => x != null).sort((a, b) => a - b)[0] ?? null;
  const clampAge = (lo: number, hi: number) => `${Math.max(lo, ctx.dna.ageMin ?? lo)}-${Math.min(hi, ctx.dna.ageMax ?? hi)}`;

  const out: RecruitmentFocus[] = [];
  const order = { urgente: 0, mejorable: 1, sucesion: 2, cubierto: 3 } as const;
  const open = needs.filter((n) => n.level !== "cubierto").sort((a, b) => order[a.level] - order[b.level]);
  for (const n of open) {
    const key = `${ctx.tactic.id}:${n.slotId}`;
    const horizon = horizonOf(n);
    const priority: FocusPriority = n.level === "urgente" ? "Máxima" : "Estándar";
    const created = ctx.created[key] ?? null;
    const alerts: string[] = [];
    let scout: StaffMember | null;
    let analyst: StaffMember | null;
    let scoutWhy: string;
    const createdScout = created?.scout ? ctx.staff.find((m) => m.name === created.scout) ?? null : null;
    if (created && createdScout && !createdScout.gone) {
      scout = createdScout;
      analyst = ctx.staff.find((m) => m.name === created.analyst) ?? null;
      scoutWhy = "el que asignaste al crearlo";
    } else {
      if (created?.scout) alerts.push(`${created.scout} ya no está en el club: reasigna el foco en el juego.`);
      const s = pick(scouts, horizon, load);
      const a = pick(analysts, horizon, load);
      scout = s.who; analyst = a.who; scoutWhy = s.why;
      bump(scout?.name); bump(analyst?.name);
    }
    const role = n.role;
    const q = horizon === "futuro" ? { cur: 2, pot: 4 } : horizon === "rotacion" ? { cur: 3, pot: 3 } : { cur: 3.5, pot: 3.5 };
    const transferType = horizon === "rotacion" ? "Fichaje y cesión" : "Traspaso";
    const fields: FocusField[] = [
      { label: "Posición", value: `${focusPosition(n.slot)} (hueco ${n.slotId} de la táctica)` },
      { label: "Rol y mínima competencia", value: role.es, hint: "competencia mínima: la eliges tú" },
      { label: "Recambio para", value: n.level === "sucesion" && n.starter ? n.starter.player.name : "—" },
      { label: "Nombre", value: focusName(n.slot, role) },
      { label: "Tipo de fichaje", value: transferType, hint: horizon === "rotacion" ? "o Cesión si solo hay que cubrir esta temporada" : undefined },
      { label: "Calidad actual y potencial mínimas", value: `${stars(q.cur)} · ${stars(q.pot)}`, hint: "relativas a tu plantilla: las estrellas las da tu cuerpo técnico" },
      { label: "Intervalo de edad", value: horizon === "futuro" ? clampAge(17, 21) : horizon === "rotacion" ? clampAge(20, 27) : clampAge(22, 29) },
      { label: "Áreas", value: areas(scout) },
      { label: "Prioridad", value: priority },
      { label: "Ojeador y analista asignado", value: `${scout?.name ?? "importa tus empleados"}${analyst ? ` · ${analyst.name}` : ""}`, hint: scoutWhy || undefined },
      { label: "Incluir resultados de otras políticas", value: "Marcada" },
    ];
    const details: FocusField[] = [];
    const ps = playerStyle(role, n.slot);
    if (ps) details.push({ label: "Estilo de jugador", value: `Es: ${ps}` });
    const quality = [...(n.profile?.traitsHave ?? []).map((t) => `Tiene «${t.es}»`), ...(n.profile?.traitsAvoid ?? []).map((t) => `No tiene «${t.es}»`)];
    if (quality.length) details.push({ label: "Cualidad de jugador", value: quality.join(" · ") });
    const foot = goodFoot(role, n.slot);
    if (foot) details.push({ label: "Pierna buena", value: foot });
    const h = Math.max(aerialHeight(role, n.slot) ?? 0, ctx.dna.minHeight ?? 0);
    if (h) details.push({ label: "Altura", value: `≥ ${h} cm` });
    if (wageCap != null) details.push({ label: "Sueldo", value: `≤ ${fmtMoney(wageCap)}${ctx.budget.wage == null ? " (ADN)" : ""}` });
    details.push({ label: "Análisis y estadísticas", value: "sin filtro hasta que la temporada tenga minutos (prioridad 10)" });
    const note = [...n.reasons, ...(n.profile ? [`Umbrales del plan: ${profileText(n.profile)}.`] : [])].join(" ");
    out.push({ key, title: `${POSITION_LABEL[n.slot]} · ${role.es}`, need: n, horizon, priority, fields, details, scout, analyst, scoutWhy, created, alerts, note });
  }
  // Focos creados cuyo hueco ya no tiene necesidad
  for (const [key, c] of Object.entries(ctx.created)) {
    if (key.startsWith(`${ctx.tactic.id}:`) && !out.some((f) => f.key === key)) {
      const who = ctx.staff.find((m) => m.name === c.scout) ?? null;
      const alerts = ["Ese hueco ya no tiene necesidad: borra el foco en el juego y libera al ojeador."];
      if (c.scout && (!who || who.gone)) alerts.push(`${c.scout} ya no está en el club.`);
      out.push({ key, title: c.name, need: null, horizon: "inmediato", priority: "Estándar", fields: [{ label: "Nombre", value: c.name }], details: [], scout: who && !who.gone ? who : null, analyst: null, scoutWhy: "", created: c, alerts, note: "" });
    }
  }
  // Encargos permanentes (Indefinido)
  const permanent: { key: string; title: string; horizon: FocusHorizon; ages: string; q: { cur: number; pot: number }; note: string }[] = [
    { key: "perm:cantera", title: "Cantera (15-17)", horizon: "futuro", ages: "15-17", q: { cur: 1, pot: 4 }, note: "Fichajes baratos para el Sub-18 antes de su primer contrato profesional." },
    { key: "perm:contratos", title: "Contratos que vencen", horizon: "inmediato", ages: clampAge(22, 30), q: { cur: 3, pot: 3 }, note: "Jugadores del nivel del primer equipo a los que les queda un año o menos: marca «Estado del contrato» en el juego." },
  ];
  for (const p of permanent) {
    const created = ctx.created[p.key] ?? null;
    const alerts: string[] = [];
    const createdScout = created?.scout ? ctx.staff.find((m) => m.name === created.scout) ?? null : null;
    let scout: StaffMember | null = createdScout && !createdScout.gone ? createdScout : null;
    let why = scout ? "el que asignaste al crearlo" : "";
    if (!scout) {
      if (created?.scout) alerts.push(`${created.scout} ya no está en el club: reasigna el foco en el juego.`);
      const s = pick(scouts, p.horizon, load);
      scout = s.who; why = s.why;
      bump(scout?.name);
    }
    out.push({
      key: p.key, title: p.title, need: null, horizon: p.horizon, priority: "Indefinido", created, alerts, scout, analyst: null, scoutWhy: why, note: p.note,
      fields: [
        { label: "Posición", value: "Cualquier posición de la táctica" },
        { label: "Nombre", value: p.key === "perm:cantera" ? "CANTERA 15-17" : "CONTRATOS 12M" },
        { label: "Tipo de fichaje", value: "Traspaso" },
        { label: "Calidad actual y potencial mínimas", value: `${stars(p.q.cur)} · ${stars(p.q.pot)}` },
        { label: "Intervalo de edad", value: p.ages },
        { label: "Áreas", value: areas(scout) },
        { label: "Prioridad", value: "Indefinido" },
        { label: "Ojeador y analista asignado", value: scout?.name ?? "importa tus empleados", hint: why || undefined },
        { label: "Incluir resultados de otras políticas", value: "Marcada" },
      ],
      details: wageCap != null ? [{ label: "Sueldo", value: `≤ ${fmtMoney(wageCap)}` }] : [],
    });
  }
  return out;
}

/** Carga de cada ojeador y analista: focos creados y propuestos. */
export function staffLoad(focuses: RecruitmentFocus[]): Map<string, { created: number; proposed: number }> {
  const m = new Map<string, { created: number; proposed: number }>();
  for (const f of focuses) {
    for (const who of [f.scout, f.analyst]) {
      if (!who) continue;
      const cur = m.get(who.name) ?? { created: 0, proposed: 0 };
      if (f.created) cur.created++; else cur.proposed++;
      m.set(who.name, cur);
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// Objetivos propuestos y evolución
// ---------------------------------------------------------------------------

/**
 * Ojeados que mejoran al titular en un hueco urgente y cumplen el ADN: entran
 * en la bandeja de propuestos (pasan a Seguimiento con un clic).
 */
export function proposedTargets(evals: CandidateEval[], dna: ClubDna, rules: DnaRule[], maxWage: number | null, tracked: Set<string>): { e: CandidateEval; dna: DnaResult }[] {
  return evals
    .filter((e) => e.verdict === "titular" && e.fit && e.fit.need.level === "urgente" && !tracked.has(e.player.uid))
    .map((e) => ({ e, dna: dnaCheck(e.player, dna, rules, e.fit!.need.slot, maxWage) }))
    .filter((x) => x.dna.ok)
    .sort((a, b) => (b.e.fit!.effective - (b.e.fit!.need.starter?.effective ?? 0)) - (a.e.fit!.effective - (a.e.fit!.need.starter?.effective ?? 0)));
}

/** Lo que falta para evolucionar a cada estilo hijo del actual (árbol de estilos). */
export function evolutionNeeds(tactic: Tactic | null, lineup: LineupResult | null): { style: StylePreset; missing: GapResult[] }[] {
  if (!tactic?.styleId || !lineup) return [];
  return styleChildren(tactic.styleId)
    .map((style) => ({ style, missing: styleGaps(style, lineup).filter((g) => !g.ok) }))
    .filter((x) => x.missing.length > 0);
}
