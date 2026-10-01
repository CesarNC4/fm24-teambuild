/**
 * Contratación: ADN del club, focos de contratación listos para copiar en el
 * juego (campo a campo, en el orden de la pantalla «Foco de contratación»),
 * reparto de ojeadores y analistas según sus atributos y su carga, objetivos
 * propuestos y lo que falta para evolucionar al siguiente estilo.
 */

import { MIN_LEAGUE_SAMPLE, PROFILE_LABEL, profileOfRole, searchFilters, type LeagueStatCuts } from "./stats";
import { ATTR_BY_KEY, type AttrKey } from "./attributes";
import { roleFunctions } from "./balance";
import { STYLE_BY_ID, profileOf, styleChildren, styleTraits, type StylePreset } from "./instructions";
import { personalityTierLevel, TIER_LABEL, type PersonalityTierLevel } from "./personalities";
import { FORMATION_BY_ID } from "./formations";
import { POSITION_LABEL, ROLE_BY_ID, type RoleDef } from "./roles";
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
  /** Cortes de la liga de la vista Moneyball, para los filtros de «Análisis y estadísticas». */
  statsLeague?: LeagueStatCuts | null;
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
    const statProfile = profileOfRole(role, n.slot);
    const fromLeague = (ctx.statsLeague?.count[statProfile] ?? 0) >= MIN_LEAGUE_SAMPLE;
    details.push({
      label: "Análisis y estadísticas",
      value: searchFilters(statProfile, ctx.statsLeague ?? null).join(" · "),
      hint: `${PROFILE_LABEL[statProfile]}: ${fromLeague ? "el verde de tu liga" : "umbrales del Excel, de otra liga (orientativos) hasta que importes estadísticas de tu liga"}`,
    });
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
  // Encargos permanentes (Indefinido): los dos de siempre y, después, uno para cada ojeador que se quede sin nada
  const needLines = new Set(open.map((n) => lineOf(n.slot)));
  const emitPerm = (spec: PermSpec, pool: StaffMember[]) => {
    const created = ctx.created[spec.key] ?? null;
    const alerts: string[] = [];
    const createdScout = created?.scout ? ctx.staff.find((m) => m.name === created.scout) ?? null : null;
    let scout: StaffMember | null = createdScout && !createdScout.gone ? createdScout : null;
    let analyst: StaffMember | null = created?.analyst ? ctx.staff.find((m) => m.name === created.analyst && !m.gone) ?? null : null;
    let why = scout ? "el que asignaste al crearlo" : "";
    if (!scout) {
      if (created?.scout) alerts.push(`${created.scout} ya no está en el club: reasigna el foco en el juego.`);
      const s = spec.scout ? { who: spec.scout, why: spec.scoutWhy ?? "" } : pick(pool, spec.horizon, load);
      scout = s.who; why = s.why;
      bump(scout?.name);
      // Analista solo si alguno está libre: los permanentes no deben cargarle
      const a = pick(analysts.filter((m) => !load.get(m.name)), spec.horizon, load);
      analyst = a.who;
      bump(analyst?.name);
    }
    out.push({
      key: spec.key, title: spec.title, need: null, horizon: spec.horizon, priority: "Indefinido", created, alerts, scout, analyst, scoutWhy: why, note: spec.note,
      fields: [
        { label: "Posición", value: spec.position },
        ...(spec.role ? [{ label: "Rol y mínima competencia", value: spec.role, hint: "competencia mínima: la eliges tú" }] : []),
        { label: "Nombre", value: spec.name.slice(0, 25) },
        { label: "Tipo de fichaje", value: spec.transfer ?? "Traspaso" },
        { label: "Calidad actual y potencial mínimas", value: `${stars(spec.q.cur)} · ${stars(spec.q.pot)}` },
        { label: "Intervalo de edad", value: spec.ages },
        { label: "Áreas", value: spec.area ?? areas(scout) },
        { label: "Prioridad", value: "Indefinido" },
        { label: "Ojeador y analista asignado", value: `${scout?.name ?? "importa tus empleados"}${analyst ? ` · ${analyst.name}` : ""}`, hint: why || undefined },
        { label: "Incluir resultados de otras políticas", value: "Marcada" },
      ],
      details: [...(spec.details ?? []), ...(wageCap != null ? [{ label: "Sueldo", value: `≤ ${fmtMoney(wageCap)}` }] : [])],
    });
  };
  const specs = permSpecs(ctx, clampAge, needLines);
  emitPerm(specs.cantera, scouts);
  emitPerm(specs.contratos, scouts);
  // Ya creados en el juego en otra sesión (promesas, cobertura, mercados): siguen con su ojeador
  const done = new Set(out.map((f) => f.key));
  for (const key of Object.keys(ctx.created)) {
    const spec = !done.has(key) ? specFromKey(key, specs, ctx, clampAge) : null;
    if (spec) { emitPerm(spec, scouts); done.add(key); }
  }
  // Nadie sin nada: mientras quede un ojeador libre, otro encargo permanente
  const idle = () => scouts.filter((m) => !m.gone && !load.get(m.name));
  for (const spec of [specs.promesas, ...specs.lines]) {
    if (!idle().length) break;
    if (!done.has(spec.key)) { emitPerm(spec, idle()); done.add(spec.key); }
  }
  // El resto, cada uno a un mercado: el suyo si nadie lo cubre; si ya está cubierto y puede viajar, uno que no cubra nadie
  const covered = new Map<string, number>();
  for (const k of done) { const m = /^perm:mercado:([A-Z]+):/.exec(k); if (m) covered.set(m[1], (covered.get(m[1]) ?? 0) + 1); }
  const byQuality = (a: StaffMember, b: StaffMember) => (b.judgeAbility ?? 0) + (b.judgePotential ?? 0) - (a.judgeAbility ?? 0) - (a.judgePotential ?? 0);
  const homeOf = (m: StaffMember) => m.nationality?.toUpperCase() ?? null;
  // Primero cada país para el mejor de sus ojeadores libres; luego los demás, fuera si pueden viajar
  const firstPass = idle().sort(byQuality).filter((m, i, arr) => homeOf(m) && !covered.has(homeOf(m)!) && arr.findIndex((x) => homeOf(x) === homeOf(m)) === i);
  for (const scout of [...firstPass, ...idle().filter((m) => !firstPass.includes(m)).sort(byQuality)]) {
    const home = homeOf(scout);
    const ada = scout.adaptability ?? 0;
    const far = ada >= 15 ? KEY_MARKETS.find((c) => !covered.has(c)) ?? null : null;
    const code = home && !covered.has(home) ? home : far ?? home;
    if (!code) continue;
    let i = covered.get(code) ?? 0;
    const keyAt = (j: number) => marketKey(code, marketKind(j, scout), Math.floor(j / MARKET_KINDS.length) + 1);
    while (done.has(keyAt(i))) i++;
    const spec = marketSpec(code, marketKind(i, scout), Math.floor(i / MARKET_KINDS.length) + 1, scout, clampAge);
    covered.set(code, i + 1);
    emitPerm(spec, [scout]);
    done.add(spec.key);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Encargos permanentes
// ---------------------------------------------------------------------------

/** Encargo Indefinido listo para pintar como foco. */
interface PermSpec {
  key: string;
  title: string;
  name: string;
  horizon: FocusHorizon;
  position: string;
  role?: string;
  transfer?: string;
  q: { cur: number; pot: number };
  ages: string;
  area?: string;
  details?: FocusField[];
  note: string;
  /** Ojeador fijo (los de mercado van al ojeador que lo conoce). */
  scout?: StaffMember;
  scoutWhy?: string;
}

/** Líneas de la táctica para los focos de cobertura. */
const LINES: { id: string; label: string; abbr: string; slots: PositionSlot[] }[] = [
  { id: "por", label: "Porteros", abbr: "POR", slots: ["GK"] },
  { id: "dfc", label: "Centrales", abbr: "DFC", slots: ["DC"] },
  { id: "lat", label: "Laterales", abbr: "LAT", slots: ["DL", "DR", "WBL", "WBR"] },
  { id: "mc", label: "Mediocentros", abbr: "MC", slots: ["DM", "MC"] },
  { id: "ban", label: "Bandas", abbr: "BANDAS", slots: ["ML", "MR", "AML", "AMR"] },
  { id: "mp", label: "Mediapuntas", abbr: "MP", slots: ["AMC"] },
  { id: "dl", label: "Delanteros", abbr: "DL", slots: ["ST"] },
];

const lineOf = (slot: PositionSlot) => LINES.find((l) => l.slots.includes(slot))?.id ?? "";

/** Mercados con más talento por descubrir, para los ojeadores que pueden viajar (Adaptabilidad ≥ 15). */
const KEY_MARKETS = ["BRA", "ARG", "FRA", "POR", "NED", "ESP", "BEL", "URU", "COL", "CRO", "SRB", "DEN", "NOR", "SWE", "AUT", "SUI", "NGA", "GHA", "SEN", "CIV", "MAR", "ITA", "GER", "ENG", "SCO", "USA", "JPN", "KOR", "TUR", "POL", "CZE", "UKR"];

/** Tipos de encargo de mercado: si dos ojeadores cubren el mismo país, uno busca talento, otro jugadores hechos y otro gangas. */
const MARKET_KINDS = [
  { id: "talento", label: "talento", horizon: "futuro" as FocusHorizon, q: { cur: 2, pot: 4 }, ages: [17, 21] as const, note: "Jóvenes con potencial de primer equipo antes de que suba su precio." },
  { id: "listos", label: "listos", horizon: "inmediato" as FocusHorizon, q: { cur: 3, pot: 3.5 }, ages: [21, 27] as const, note: "Jugadores hechos del nivel de tu plantilla, para tener alternativas cuando se abra un hueco." },
  { id: "gangas", label: "gangas", horizon: "inmediato" as FocusHorizon, q: { cur: 3, pot: 3 }, ages: [23, 30] as const, note: "Buen nivel a buen precio: transferibles, con cláusula baja o en ligas pequeñas." },
];

/** Tipo del encargo número `i` de un país: el primero, lo que mejor juzga su ojeador. */
function marketKind(i: number, scout: StaffMember | undefined): number {
  const first = scout && (scout.judgePotential ?? 0) > (scout.judgeAbility ?? 0) ? 0 : 1;
  return i === 0 ? first : i === 1 ? 1 - first : i % MARKET_KINDS.length;
}

const marketKey = (code: string, kind: number, rep: number) => `perm:mercado:${code}:${MARKET_KINDS[kind].id}${rep > 1 ? `:${rep}` : ""}`;

type ClampAge = (lo: number, hi: number) => string;

function marketSpec(code: string, k: number, rep: number, scout: StaffMember | undefined, clampAge: ClampAge): PermSpec {
  const kind = MARKET_KINDS[k];
  const nation = nationName(code) ?? code;
  const home = scout?.nationality?.toUpperCase() === code;
  const ada = scout?.adaptability ?? 0;
  const n = rep > 1 ? ` ${rep}` : "";
  return {
    key: marketKey(code, k, rep),
    title: `Mercado: ${nation} (${kind.label})${n}`,
    name: `${nation.toUpperCase()} ${kind.label.toUpperCase()}${n}`,
    horizon: kind.horizon,
    position: "Cualquier posición de la táctica",
    q: kind.q,
    ages: clampAge(kind.ages[0], kind.ages[1]),
    area: home ? `${nation} (su país: lo conoce desde el primer día)` : `${nation} (nadie de tu red lo cubre; Adaptabilidad ${ada}: se le puede mandar)`,
    note: `${kind.note}${scout ? ` Para ${scout.name}, que se quedaba sin foco.` : ""}`,
    scout,
    scoutWhy: scout ? `${home ? "es su país" : "puede viajar"}, Juz. ${kind.horizon === "futuro" ? `Pot ${scout.judgePotential ?? "?"}` : `Cal ${scout.judgeAbility ?? "?"}`}, sin otro foco` : undefined,
  };
}

function permSpecs(ctx: FocusContext, clampAge: ClampAge, needLines: Set<string>) {
  const fslots = FORMATION_BY_ID[ctx.tactic.formationId]?.slots ?? [];
  const lines: PermSpec[] = [];
  for (const l of LINES) {
    const here = fslots.filter((fs) => l.slots.includes(fs.slot));
    if (!here.length || needLines.has(l.id)) continue;
    const roles = [...new Set(here.map((fs) => ROLE_BY_ID[ctx.tactic.roles[fs.id] ?? fs.defaultRole]?.es).filter(Boolean))];
    lines.push({
      key: `perm:linea:${l.id}`,
      title: `Cobertura: ${l.label.toLowerCase()}`,
      name: `COBERTURA ${l.abbr}`,
      horizon: "inmediato",
      position: [...new Set(here.map((fs) => focusPosition(fs.slot)))].join(", "),
      role: roles.join(" / "),
      q: { cur: 3, pot: 3.5 },
      ages: clampAge(21, 28),
      note: `Ninguna urgencia en ${l.label.toLowerCase()}, pero conviene tener alternativas ojeadas antes de que surja una lesión o una venta.`,
    });
  }
  return {
    cantera: { key: "perm:cantera", title: "Cantera (15-17)", name: "CANTERA 15-17", horizon: "futuro", position: "Cualquier posición de la táctica", q: { cur: 1, pot: 4 }, ages: "15-17", note: "Fichajes baratos para el Sub-18 antes de su primer contrato profesional." } as PermSpec,
    contratos: { key: "perm:contratos", title: "Contratos que vencen", name: "CONTRATOS 12M", horizon: "inmediato", position: "Cualquier posición de la táctica", q: { cur: 3, pot: 3 }, ages: clampAge(22, 30), note: "Jugadores del nivel del primer equipo a los que les queda un año o menos: marca «Estado del contrato» en el juego." } as PermSpec,
    promesas: { key: "perm:promesas", title: "Promesas (17-20)", name: "PROMESAS 17-20", horizon: "futuro", position: "Cualquier posición de la táctica", q: { cur: 2, pot: 4.5 }, ages: "17-20", note: "Las joyas de cualquier liga: potencial de estrella para el primer equipo en dos o tres temporadas." } as PermSpec,
    lines,
  };
}

/** Encargo permanente ya creado en el juego, a partir de su clave. */
function specFromKey(key: string, specs: ReturnType<typeof permSpecs>, ctx: FocusContext, clampAge: ClampAge): PermSpec | null {
  if (key === specs.promesas.key) return specs.promesas;
  const line = specs.lines.find((l) => l.key === key);
  if (line) return line;
  const m = /^perm:mercado:([A-Z]+):(\w+)(?::(\d+))?$/.exec(key);
  if (!m) return null;
  const k = MARKET_KINDS.findIndex((x) => x.id === m[2]);
  if (k < 0) return null;
  // Sin ojeador fijo: emitPerm le deja el que asignaste al crearlo
  const scout = ctx.staff.find((x) => x.name === ctx.created[key]?.scout && !x.gone);
  return marketSpec(m[1], k, Number(m[3] ?? 1), scout, clampAge);
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
