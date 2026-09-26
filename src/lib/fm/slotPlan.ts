/**
 * Plan por hueco: para cada titular, qué pide el hueco, si el jugador puede
 * hacerlo y qué hacer si no.
 *
 * 1. Qué pide: las funciones de su rol (balance.ts), lo que esperan los
 *    compañeros (los avisos del detector de equilibrio: nadie abre esa banda,
 *    el medio no genera…) y los atributos que el estilo pide a su línea.
 * 2. Puede hacerlo: umbrales de los índices de especialista (specialists.ts) y
 *    de atributos. «Cerca» = le faltan como mucho 2 puntos.
 * 3. Acción, por este orden: instrucción individual que lo consigue (nunca una
 *    de serie ni una bloqueada), rasgo que lo haría natural y que puede
 *    aprender, foco de entrenamiento si está cerca, otro jugador de la
 *    plantilla que sí puede, otro rol, o fichar el perfil (pasa a Ojeados).
 *
 * Los rasgos por rol de los documentos (roleTraits.ts) completan la ficha: qué
 * enseñar y qué rasgo estorba.
 */

import { ATTR_BY_KEY, type AttrKey } from "./attributes";
import { roleFunctions, tacticBalance, type BalanceEntry, type BalanceReport, type RoleFunction } from "./balance";
import { STYLE_BY_ID } from "./instructions";
import { PI_BY_ID } from "./playerInstructions";
import { roleDefaults } from "./roleInstructions";
import { roleTraits } from "./roleTraits";
import { DUTY_LABEL, POSITION_LABEL, rolesForPosition, type RoleDef } from "./roles";
import { SPECIALIST_BY_ID, specialistIndex } from "./specialists";
import { recommendedRoleIds } from "./styleRoles";
import { unitOfSlot } from "./styles";
import { familiarity, type LineupResult, type Tactic } from "./tactics";
import { FOCUS_AREAS, UNTRAINABLE } from "./trainingData";
import { TRAIT_BY_ID, assessTrait, type TraitDef } from "./traits";
import type { Player, PositionSlot } from "./types";

// ---------------------------------------------------------------------------
// Qué exige cada función
// ---------------------------------------------------------------------------

export interface PlanReq {
  /** Índice de especialista o atributo. */
  index?: string;
  attr?: AttrKey;
  min: number;
}

interface FnSpec {
  label: string;
  reqs: PlanReq[];
  /** Instrucciones individuales que la consiguen, por preferencia. */
  pis: string[];
  /** Rasgos que la hacen natural («SIDE» = lado del hueco). */
  traits: string[];
  /** Rasgos que van en contra. */
  against: string[];
}

const FN_SPEC: Record<RoleFunction, FnSpec> = {
  amplitud: { label: "Dar amplitud", reqs: [{ index: "crosser", min: 13 }, { attr: "Sta", min: 12 }], pis: ["stay-wider"], traits: ["hugs-line"], against: ["cuts-inside-SIDE", "cuts-inside-both"] },
  pasillo: { label: "Ocupar el pasillo interior", reqs: [{ index: "dribbler", min: 12 }, { attr: "Dec", min: 12 }], pis: ["cut-inside", "sit-narrower"], traits: ["cuts-inside-SIDE"], against: ["hugs-line", "runs-ball-SIDE"] },
  llega: { label: "Llegar al área", reqs: [{ index: "pi-forward", min: 13 }, { attr: "Sta", min: 12 }], pis: ["get-further-forward"], traits: ["gets-into-box", "arrives-late", "gets-forward"], against: ["stays-back", "comes-deep"] },
  crea: { label: "Crear", reqs: [{ index: "pi-risky", min: 14 }, { index: "passer", min: 13 }], pis: ["more-risky-passes"], traits: ["killer-balls", "dictates-tempo"], against: ["plays-short-simple"] },
  destruye: { label: "Robar y cortar", reqs: [{ index: "tackling", min: 13 }, { index: "positioning", min: 12 }], pis: ["tackle-harder"], traits: ["dives-into-tackles"], against: ["stays-on-feet"] },
  conduce: { label: "Progresar con el balón", reqs: [{ index: "dribbler", min: 13 }], pis: ["dribble-more"], traits: ["runs-ball-often"], against: ["runs-ball-rarely"] },
  fija: { label: "Fijar a los centrales", reqs: [{ index: "finisher", min: 13 }, { attr: "Acc", min: 13 }], pis: [], traits: ["beats-offside"], against: ["comes-deep"] },
  descarga: { label: "Descargar de espaldas", reqs: [{ index: "back-to-goal", min: 13 }, { attr: "Str", min: 13 }], pis: ["hold-up-ball"], traits: ["plays-with-back"], against: [] },
  huecos: { label: "Buscar huecos", reqs: [{ index: "pi-channels", min: 13 }], pis: ["move-into-channels", "roam"], traits: ["moves-channels"], against: ["stays-inside-area"] },
  sostiene: { label: "Sostener detrás del balón", reqs: [{ index: "positioning", min: 13 }, { index: "concentration", min: 12 }], pis: ["hold-position"], traits: ["stays-back"], against: ["gets-forward"] },
  presiona: { label: "Presionar", reqs: [{ index: "ti-counterpress", min: 13 }, { attr: "Sta", min: 13 }], pis: ["close-down-more"], traits: ["dives-into-tackles"], against: [] },
};

/** Umbrales de la función para ese rol (Variar la posición usa su propio índice). */
function reqsFor(fn: RoleFunction, role: RoleDef, slot: PositionSlot): PlanReq[] {
  if (fn === "huecos" && roleDefaults(role.id, slot)?.part.includes("roam")) return [{ index: "pi-roam", min: 13 }];
  return FN_SPEC[fn].reqs;
}

const sideOf = (slot: PositionSlot) => (slot.endsWith("L") ? "left" : slot.endsWith("R") ? "right" : null);
function sideTrait(id: string, slot: PositionSlot): string | null {
  if (!id.includes("SIDE")) return id;
  const side = sideOf(slot);
  if (id === "cuts-inside-SIDE") return side ? `cuts-inside-${side}` : "cuts-inside-both";
  return side ? id.replace("SIDE", side) : null;
}

export function reqLabel(r: PlanReq): string {
  return r.index ? SPECIALIST_BY_ID[r.index]?.es ?? r.index : ATTR_BY_KEY[r.attr!]?.es ?? r.attr!;
}

function reqValue(p: Player, r: PlanReq): number | null {
  return r.index ? specialistIndex(p, r.index) : p.attrs[r.attr!]?.value ?? null;
}

// ---------------------------------------------------------------------------
// Tipos del plan
// ---------------------------------------------------------------------------

export type Capability = "si" | "cerca" | "no";
export const CAPABILITY_LABEL: Record<Capability, string> = { si: "puede", cerca: "cerca", no: "no llega" };

export interface PlanCheck {
  req: PlanReq;
  label: string;
  value: number | null;
  ok: boolean;
}

export type PlanActionKind = "pi" | "rasgo" | "entrenar" | "alternativa" | "rol" | "fichar";

export interface PlanAction {
  kind: PlanActionKind;
  text: string;
  piId?: string;
  traitId?: string;
  roleId?: string;
}

export interface SlotNeed {
  key: string;
  fn: RoleFunction | "estilo";
  label: string;
  why: string;
  /** De dónde sale: el rol, los compañeros o el estilo. */
  source: "rol" | "companeros" | "estilo";
  /** El rol ya lo trae de serie: no hace falta instrucción. */
  byRole: boolean;
  checks: PlanCheck[];
  can: Capability;
  /** Cumplido: el rol lo trae (o no hace falta) y el jugador puede. */
  done: boolean;
  actions: PlanAction[];
}

export interface TraitNote {
  trait: TraitDef;
  kind: "tiene" | "ensenar" | "choca";
  why: string;
}

export interface SignProfile {
  slotId: string;
  slot: PositionSlot;
  role: RoleDef;
  /** Lo que nadie de la plantilla puede hacer en ese hueco. */
  needs: string[];
  thresholds: { label: string; req: PlanReq }[];
  /** Cualidad de jugador: Tiene / No tiene (foco de contratación). */
  traitsHave: TraitDef[];
  traitsAvoid: TraitDef[];
}

export interface SlotPlan {
  slotId: string;
  slot: PositionSlot;
  role: RoleDef;
  player: Player | null;
  needs: SlotNeed[];
  traits: TraitNote[];
  /** Rasgo que más quiere el hueco (para la lista de rasgos de la táctica). */
  wanted: { trait: TraitDef; has: boolean; why: string } | null;
  sign: SignProfile | null;
}

export interface TacticPlan {
  plans: SlotPlan[];
  report: BalanceReport;
  /** Rasgos que pide la táctica, hueco a hueco. */
  wantedTraits: { slotId: string; slot: PositionSlot; role: RoleDef; player: Player | null; trait: TraitDef; has: boolean }[];
  signs: SignProfile[];
}

// ---------------------------------------------------------------------------
// Necesidades por compañeros (desde los avisos del detector)
// ---------------------------------------------------------------------------

interface TeamRule {
  fn: RoleFunction;
  /** Quiénes pueden cubrirla. */
  eligible: (e: BalanceEntry, issueSlots: string[], report: BalanceReport) => boolean;
  rankBy: string;
  count: (report: BalanceReport) => number;
  why: (issueText: string) => string;
}

const MIDS = (e: BalanceEntry) => e.zone === "dm" || e.zone === "mc";
const ATTACK_MIDS = (e: BalanceEntry) => e.zone === "mc" || e.zone === "amc" || e.zone === "wide";
const TEAM_RULES: Record<string, TeamRule> = {
  "banda-sin-amplitud": { fn: "amplitud", eligible: (e, s) => s.includes(e.slotId), rankBy: "crosser", count: () => 1, why: (t) => t },
  "banda-doble-amplitud": { fn: "pasillo", eligible: (e, s) => s.includes(e.slotId), rankBy: "dribbler", count: () => 1, why: (t) => t },
  "medio-no-genera": { fn: "crea", eligible: (e, s) => s.includes(e.slotId), rankBy: "passer", count: () => 1, why: (t) => t },
  "medio-sin-corte": { fn: "destruye", eligible: (e, s) => s.includes(e.slotId), rankBy: "tackling", count: () => 1, why: (t) => t },
  "cobertura": { fn: "sostiene", eligible: (e) => MIDS(e), rankBy: "positioning", count: () => 1, why: (t) => t },
  "pocos-sostienen": { fn: "sostiene", eligible: (e) => (MIDS(e) || e.zone === "back") && !e.fns.includes("sostiene"), rankBy: "positioning", count: (r) => Math.max(1, 3 - r.counts.sostiene), why: (t) => t },
  "poca-llegada": { fn: "llega", eligible: (e) => ATTACK_MIDS(e) && !e.fns.includes("llega"), rankBy: "pi-forward", count: (r) => Math.max(1, 2 - r.counts.llega), why: (t) => t },
  "delantero-unico": { fn: "llega", eligible: (e) => (e.zone === "amc" || e.zone === "wide") && !e.fns.includes("llega"), rankBy: "pi-forward", count: () => 1, why: (t) => t },
  "falso-nueve": { fn: "llega", eligible: (e) => (e.zone === "amc" || e.zone === "wide") && !e.fns.includes("llega"), rankBy: "pi-forward", count: () => 1, why: (t) => t },
  "organizador-rupturas": { fn: "llega", eligible: (e) => ATTACK_MIDS(e) && !e.fns.includes("llega") && !e.fns.includes("crea"), rankBy: "pi-forward", count: () => 1, why: (t) => t },
  "sin-creador": { fn: "crea", eligible: (e) => MIDS(e) || e.zone === "amc", rankBy: "pi-risky", count: () => 1, why: (t) => t },
};

/** Instrucciones de serie que van en contra de la función (pedirle pasillo a quien trae «Abrirse a banda»). */
const OPPOSED_PIS: Partial<Record<RoleFunction, string[]>> = {
  pasillo: ["stay-wider", "cross-from-byline", "cross-more"],
  amplitud: ["sit-narrower", "cut-inside"],
  llega: ["hold-position"],
  sostiene: ["get-further-forward"],
};
function contradicts(fn: RoleFunction, e: BalanceEntry): boolean {
  const part = roleDefaults(e.role.id, e.slot)?.part ?? [];
  return (OPPOSED_PIS[fn] ?? []).some((pi) => part.includes(pi));
}

/** Huecos a los que los compañeros les piden una función que su rol no trae. */
function teamNeeds(report: BalanceReport): Map<string, { fn: RoleFunction; why: string; issue: string }[]> {
  const out = new Map<string, { fn: RoleFunction; why: string; issue: string }[]>();
  for (const issue of report.issues) {
    if (issue.intended || issue.level === "ok" || issue.level === "tip") continue;
    const rule = TEAM_RULES[issue.id];
    if (!rule) continue;
    const cands = report.entries
      .filter((e) => e.zone !== "gk" && rule.eligible(e, issue.slots, report) && !e.fns.includes(rule.fn))
      .filter((e) => FN_SPEC[rule.fn].pis.some((pi) => !roleDefaults(e.role.id, e.slot)?.blocked.includes(pi)) || FN_SPEC[rule.fn].pis.length === 0)
      .map((e) => ({ e, v: (e.player ? specialistIndex(e.player, rule.rankBy) ?? 0 : 0) - (contradicts(rule.fn, e) ? 10 : 0) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, rule.count(report));
    for (const { e } of cands) {
      const list = out.get(e.slotId) ?? [];
      if (!list.some((x) => x.fn === rule.fn)) list.push({ fn: rule.fn, why: rule.why(issue.text), issue: issue.id });
      out.set(e.slotId, list);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function checksFor(p: Player | null, reqs: PlanReq[]): { checks: PlanCheck[]; can: Capability } {
  const checks = reqs.map((req) => {
    const value = p ? reqValue(p, req) : null;
    return { req, label: reqLabel(req), value, ok: value != null && value >= req.min };
  });
  const failing = checks.filter((c) => !c.ok);
  const can: Capability = !p ? "no" : failing.length === 0 ? "si" : failing.every((c) => c.value != null && c.req.min - c.value <= 2) ? "cerca" : "no";
  return { checks, can };
}

/** Foco individual que entrena lo que le falta (el atributo más débil de los que pesan). */
function focusFor(p: Player, failing: PlanCheck[]): { focus: string; attr: AttrKey } | null {
  // Cuánto aporta subir cada atributo a lo que falta (peso en el índice × margen hasta el umbral)
  const gain = new Map<AttrKey, number>();
  const bump = (k: AttrKey, v: number) => { if (!UNTRAINABLE.includes(k) && v > 0) gain.set(k, (gain.get(k) ?? 0) + v); };
  for (const c of failing) {
    if (c.req.attr) bump(c.req.attr, (c.req.min - (c.value ?? 0)) * 100);
    else if (c.req.index) {
      for (const [k, w] of SPECIALIST_BY_ID[c.req.index]?.weights ?? []) {
        if (k === "height" || k === "punInv") continue;
        const v = p.attrs[k as AttrKey]?.value;
        if (v != null) bump(k as AttrKey, w * Math.max(0.5, 20 - v) / 10);
      }
    }
  }
  let best: { focus: string; attr: AttrKey; score: number } | null = null;
  for (const area of FOCUS_AREAS.filter((a) => a.group === "campo")) {
    const score = area.attrs.reduce((sum, k) => sum + (gain.get(k) ?? 0), 0) / Math.sqrt(area.attrs.length);
    if (score <= 0) continue;
    const attr = area.attrs.filter((k) => gain.has(k)).sort((a, b) => (gain.get(b) ?? 0) - (gain.get(a) ?? 0))[0];
    if (!best || score > best.score) best = { focus: area.es, attr, score };
  }
  return best && { focus: best.focus, attr: best.attr };
}

const fmt = (v: number | null) => (v == null ? "?" : Number.isInteger(v) ? String(v) : v.toFixed(1));
export function checkText(c: PlanCheck): string {
  return `${c.label} ${fmt(c.value)} ${c.ok ? "≥" : "<"} ${c.req.min}`;
}

/**
 * Plan de todos los huecos de la táctica. `squad` es la plantilla con la que
 * se busca un sustituto antes de proponer fichar; `traits` son los rasgos
 * registrados de cada jugador.
 */
export function tacticPlan(tactic: Tactic, lineup: LineupResult, squad: Player[], traits: Record<string, string[]> = {}): TacticPlan {
  const report = tacticBalance(tactic, { lineup, traits });
  const byTeam = teamNeeds(report);
  const style = STYLE_BY_ID[tactic.styleId ?? ""];
  const starterSlot = new Map(lineup.slots.filter((x) => x.starter).map((x) => [x.starter!.player.uid, POSITION_LABEL[x.slot.slot]]));
  const plans: SlotPlan[] = lineup.slots.map((s) => {
    const entry = report.entries.find((e) => e.slotId === s.slot.id)!;
    const player = s.starter?.player ?? null;
    const slot = s.slot.slot;
    const role = s.role;
    const mine = player ? traits[player.uid] ?? [] : [];
    const def = roleDefaults(role.id, slot);
    const rf = roleFunctions(role, slot, mine);
    const needs: SlotNeed[] = [];

    const build = (fn: RoleFunction, source: SlotNeed["source"], why: string): SlotNeed => {
      const spec = FN_SPEC[fn];
      const byRole = source === "rol";
      const { checks, can } = checksFor(player, reqsFor(fn, role, slot));
      const actions: PlanAction[] = [];
      const done = byRole && can === "si";
      if (!done && player) {
        // 1. Instrucción individual
        if (!byRole) {
          const pi = spec.pis.find((id) => !def?.part.includes(id) && !def?.blocked.includes(id));
          if (pi && can !== "no") actions.push({ kind: "pi", piId: pi, text: `Instrucción «${PI_BY_ID[pi]?.es ?? pi}»` });
          else if (!pi && spec.pis.length) actions.push({ kind: "rol", text: `Su rol no deja poner ${spec.pis.map((id) => `«${PI_BY_ID[id]?.es ?? id}»`).join(" ni ")}` });
        }
        // 2. Rasgo que lo haría natural
        const has = spec.traits.map((t) => sideTrait(t, slot)).filter((t): t is string => !!t).find((t) => mine.includes(t));
        if (has) actions.push({ kind: "rasgo", traitId: has, text: `Ya lo hace por el rasgo «${TRAIT_BY_ID[has]?.es}»` });
        else {
          for (const t of spec.traits.map((x) => sideTrait(x, slot)).filter((x): x is string => !!x)) {
            const tr = TRAIT_BY_ID[t];
            if (!tr || tr.mentoringOnly) continue;
            const a = assessTrait(tr, role, player.attrs, mine);
            if (a.missing.length === 0 && a.conflictsWith.length === 0 && a.tooGood.length === 0) {
              actions.push({ kind: "rasgo", traitId: t, text: `Enseñarle «${tr.es}»` });
              break;
            }
          }
        }
        // 3. Foco de entrenamiento si está cerca
        if (can === "cerca") {
          const f = focusFor(player, checks.filter((c) => !c.ok));
          if (f) actions.push({ kind: "entrenar", text: `Foco individual «${f.focus}» (${ATTR_BY_KEY[f.attr]?.es} ${player.attrs[f.attr]?.value ?? "?"}): le faltan 1-2 puntos` });
        }
        // 4. Otro jugador de la plantilla, otro rol o fichar
        if (can === "no") {
          const reqs = reqsFor(fn, role, slot);
          const alt = squad
            .filter((p) => p.uid !== player.uid && p.isGoalkeeper === (slot === "GK") && familiarity(p, slot) >= 0.85)
            .map((p) => ({ p, c: checksFor(p, reqs), elsewhere: starterSlot.get(p.uid) }))
            .filter((x) => x.c.can === "si")
            .sort((a, b) => Number(!!a.elsewhere) - Number(!!b.elsewhere) || (reqValue(b.p, reqs[0]) ?? 0) - (reqValue(a.p, reqs[0]) ?? 0))[0];
          if (alt) actions.push({ kind: "alternativa", text: `En la plantilla sí puede ${alt.p.name} (${alt.c.checks.map(checkText).join(", ")})${alt.elsewhere ? `, aunque ahora es titular en ${alt.elsewhere}` : ""}` });
          else if (source === "companeros") {
            const recommended = recommendedRoleIds(tactic.styleId, slot);
            const roles = rolesForPosition(slot)
              .filter((r) => r.id !== role.id && roleFunctions(r, slot).fns.includes(fn))
              .sort((a, b) => Number(recommended.has(b.id)) - Number(recommended.has(a.id)))
              .slice(0, 2);
            for (const r of roles) actions.push({ kind: "rol", roleId: r.id, text: `Cambiar a ${r.es} (${DUTY_LABEL[r.duty]}), que lo trae de serie` });
            actions.push({ kind: "fichar", text: "Nadie de la plantilla llega: fichar este perfil" });
          } else actions.push({ kind: "fichar", text: "Nadie de la plantilla llega: fichar este perfil" });
        }
      }
      return { key: `${source}-${fn}`, fn, label: spec.label, why, source, byRole, checks, can, done, actions };
    };

    // Funciones del rol
    for (const fn of rf.fns) {
      const flankFn = fn === "amplitud" || fn === "pasillo";
      const midFn = (fn === "destruye" || fn === "crea") && MIDS(entry);
      const unit = flankFn
        ? report.entries.filter((e) => (e.zone === "back" || e.zone === "wide") && e.side === entry.side && entry.side !== "C")
        : midFn ? report.entries.filter(MIDS) : report.entries.filter((e) => e.zone !== "gk");
      const sole = unit.filter((e) => e.fns.includes(fn)).length === 1 && unit.length > 1;
      const where = flankFn ? `en la banda ${entry.side === "L" ? "izquierda" : "derecha"}` : midFn ? "en el medio" : "en el equipo";
      const ctx = sole && flankFn ? report.entries.filter((e) => e !== entry && unit.includes(e)).map((e) => `${e.role.es}${e.fns.includes("pasillo") ? " se mete por dentro" : e.fns.includes("amplitud") ? " también abre" : ""}`).join(", ") : "";
      needs.push(build(fn, "rol", `${rf.why[fn]}.${sole ? ` Es el único que lo hace ${where}${ctx ? ` (${ctx})` : ""}.` : ""}`));
    }
    // Lo que piden los compañeros
    for (const t of byTeam.get(s.slot.id) ?? []) {
      if (rf.fns.includes(t.fn)) continue;
      needs.push(build(t.fn, "companeros", t.why));
    }
    // Lo que el estilo pide a su línea
    const unit = unitOfSlot(slot);
    if (style && unit && player) {
      const attrs = style.attrs[unit];
      const checks = attrs.map((k) => ({ req: { attr: k, min: 12 } as PlanReq, label: ATTR_BY_KEY[k]?.es ?? k, value: player.attrs[k]?.value ?? null, ok: (player.attrs[k]?.value ?? 0) >= 12 }));
      const vals = checks.map((c) => c.value).filter((v): v is number => v != null);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      if (mean != null && mean < 12) {
        const failing = checks.filter((c) => !c.ok);
        const can: Capability = failing.every((c) => c.value != null && 12 - c.value <= 2) ? "cerca" : "no";
        const actions: PlanAction[] = [];
        const f = focusFor(player, failing);
        if (f) actions.push({ kind: "entrenar", text: `Foco individual «${f.focus}» (${ATTR_BY_KEY[f.attr]?.es} ${player.attrs[f.attr]?.value ?? "?"})` });
        const better = squad
          .filter((p) => p.uid !== player.uid && p.isGoalkeeper === (slot === "GK") && familiarity(p, slot) >= 0.85)
          .map((p) => ({ p, m: attrs.reduce((a, k) => a + (p.attrs[k]?.value ?? 0), 0) / attrs.length }))
          .filter((x) => x.m >= 12)
          .sort((a, b) => b.m - a.m)[0];
        if (better) actions.push({ kind: "alternativa", text: `${better.p.name} encaja mejor en el estilo (media ${better.m.toFixed(1)})` });
        else if (can === "no") actions.push({ kind: "fichar", text: "Nadie de la plantilla llega: fichar este perfil" });
        needs.push({ key: "estilo", fn: "estilo", label: `Encajar en ${style.name}`, why: `El estilo pide a su línea ${attrs.map((k) => ATTR_BY_KEY[k]?.es ?? k).join(", ")}; su media es ${mean.toFixed(1)}: es el eslabón débil.`, source: "estilo", byRole: false, checks, can, done: false, actions });
      }
    }
    needs.sort((a, b) => Number(a.done) - Number(b.done) || (a.source === "companeros" ? -1 : 0) - (b.source === "companeros" ? -1 : 0));

    // Rasgos
    const notes: TraitNote[] = [];
    const addNote = (n: TraitNote) => { if (!notes.some((x) => x.trait.id === n.trait.id && x.kind === n.kind)) notes.push(n); };
    const docs = roleTraits(role, slot);
    for (const need of needs) {
      if (need.fn === "estilo") continue;
      for (const t of FN_SPEC[need.fn].against.map((x) => sideTrait(x, slot)).filter((x): x is string => !!x)) {
        if (mine.includes(t) && TRAIT_BY_ID[t]) addNote({ trait: TRAIT_BY_ID[t], kind: "choca", why: `va contra «${need.label.toLowerCase()}», que pide el hueco` });
      }
    }
    for (const r of docs.bad) if (mine.includes(r.id) && TRAIT_BY_ID[r.id]) addNote({ trait: TRAIT_BY_ID[r.id], kind: "choca", why: `desaconsejado para ${role.es} (documentos${r.doubtful ? ", probable" : ""})` });
    const partPis = def?.part ?? [];
    for (const id of mine) {
      const t = TRAIT_BY_ID[id];
      const hit = t?.contrastPI?.find((pi) => partPis.includes(pi));
      if (t && hit) addNote({ trait: t, kind: "choca", why: `va contra «${PI_BY_ID[hit]?.es}», que el rol trae de serie` });
    }
    for (const r of docs.good) {
      const t = TRAIT_BY_ID[r.id];
      if (!t) continue;
      if (mine.includes(r.id)) addNote({ trait: t, kind: "tiene", why: `recomendado para ${role.es}` });
      else if (player && !t.mentoringOnly) {
        const a = assessTrait(t, role, player.attrs, mine);
        if (a.missing.length === 0 && a.conflictsWith.length === 0 && a.tooGood.length === 0) addNote({ trait: t, kind: "ensenar", why: `recomendado para ${role.es}${r.example ? " (ejemplo de los documentos)" : ""}${r.doubtful ? " (discutible)" : ""}` });
      }
    }

    // Rasgo que más quiere el hueco: el de lo que piden los compañeros o el primero de los documentos
    const teamNeed = needs.find((n) => n.source === "companeros" && n.fn !== "estilo");
    const wantedId = teamNeed ? sideTrait(FN_SPEC[teamNeed.fn as RoleFunction].traits[0], slot) : docs.good.find((r) => !r.example)?.id ?? null;
    const wantedTrait = wantedId ? TRAIT_BY_ID[wantedId] : null;
    const wanted = wantedTrait ? { trait: wantedTrait, has: mine.includes(wantedTrait.id), why: teamNeed ? teamNeed.label.toLowerCase() : `recomendado para ${role.es}` } : null;

    // Fichar este perfil
    const unmet = needs.filter((n) => n.actions.some((a) => a.kind === "fichar"));
    const sign: SignProfile | null = unmet.length ? {
      slotId: s.slot.id, slot, role,
      needs: unmet.map((n) => n.label),
      thresholds: unmet.flatMap((n) => n.checks.map((c) => ({ label: c.label, req: c.req }))).filter((x, i, arr) => arr.findIndex((y) => y.label === x.label) === i),
      traitsHave: unmet.map((n) => (n.fn === "estilo" ? null : sideTrait(FN_SPEC[n.fn].traits[0], slot))).filter((x): x is string => !!x).map((id) => TRAIT_BY_ID[id]).filter(Boolean),
      traitsAvoid: [...unmet.flatMap((n) => (n.fn === "estilo" ? [] : FN_SPEC[n.fn].against.map((x) => sideTrait(x, slot)))), ...docs.bad.filter((r) => !r.doubtful).map((r) => r.id)]
        .filter((x): x is string => !!x).filter((x, i, arr) => arr.indexOf(x) === i).map((id) => TRAIT_BY_ID[id]).filter(Boolean).slice(0, 3),
    } : null;

    return { slotId: s.slot.id, slot, role, player, needs, traits: notes, wanted, sign };
  });
  const wantedTraits = plans.filter((p) => p.wanted && p.slot !== "GK").map((p) => ({ slotId: p.slotId, slot: p.slot, role: p.role, player: p.player, trait: p.wanted!.trait, has: p.wanted!.has }));
  return { plans, report, wantedTraits, signs: plans.map((p) => p.sign).filter((x): x is SignProfile => !!x) };
}

/** ¿Cumple un jugador los umbrales del perfil? */
export function meetsProfile(p: Player, profile: SignProfile): { ok: boolean; misses: string[] } {
  const misses = profile.thresholds
    .map((t) => ({ t, v: reqValue(p, t.req) }))
    .filter((x) => x.v == null || x.v < x.t.req.min)
    .map((x) => `${x.t.label} ${fmt(x.v)} < ${x.t.req.min}`);
  return { ok: misses.length === 0, misses };
}

export function profileText(profile: SignProfile): string {
  return profile.thresholds.map((t) => `${t.label} ≥ ${t.req.min}`).join(", ");
}

