/**
 * Scouting: necesidades de la plantilla por hueco de la táctica y evaluación
 * de los ojeados frente al primer equipo.
 *
 * Reglas de las guías de scouting y fichajes de Passion4FM:
 * - primero personalidad y atributos "fijos" (Determinación <10 = descartar;
 *   Sacrificio también se hereda), después el encaje táctico;
 * - 16-21: potencial; 22-29: rendimiento inmediato; 30+: contrato corto;
 * - lesiones sin buena forma física natural = bandera roja;
 * - un informe solo es fiable con conocimiento alto: si los atributos vienen
 *   en rango, ojear a fondo antes de ofertar;
 * - contrato que vence: precontrato seis meses antes; transferibles y
 *   cláusulas abaratan; sueldo dentro de la estructura de la plantilla.
 */

import type { RoleDef } from "./roles";
import { scoreRole } from "./scoring";
import { buildLineup, depthMap, familiarity, type LineupResult, type SlotResult, type Tactic } from "./tactics";
import { personalityTierLevel } from "./personalities";
import type { AttrKey } from "./attributes";
import type { Player, PositionSlot } from "./types";
import { meetsProfile, profileText, tacticPlan, type SignProfile } from "./slotPlan";

export type NeedLevel = "urgente" | "mejorable" | "sucesion" | "cubierto";
export const NEED_LABEL: Record<NeedLevel, string> = { urgente: "Urgente", mejorable: "Mejorable", sucesion: "Sucesión", cubierto: "Cubierto" };

export interface SquadNeed {
  slotId: string;
  slot: PositionSlot;
  role: RoleDef;
  starter: SlotResult["starter"];
  depth: SlotResult["depth"];
  /** Suplente real (segundo XI). */
  backup: SlotResult["starter"];
  level: NeedLevel;
  reasons: string[];
  /** Puntuación mínima para ser útil (rotación real). */
  targetScore: number;
  /** Puntuación a partir de la cual mejora al titular. */
  upgradeScore: number;
  /** Perfil de edad que pide el hueco. */
  ageBand: "inmediato" | "futuro" | "ambos";
  /** Perfil del plan por hueco: lo que nadie de la plantilla puede hacer en ese hueco. */
  profile?: SignProfile;
}

/** Necesidades del primer equipo por hueco de la táctica. */
export function squadNeeds(tactic: Tactic, firstTeam: Player[], gameYear: number | null, traits: Record<string, string[]> = {}): { lineup: LineupResult; needs: SquadNeed[] } {
  const lineup = buildLineup(tactic, firstTeam);
  const signs = new Map(tacticPlan(tactic, lineup, firstTeam, traits).signs.map((x) => [x.slotId, x]));
  // Suplente real: quien juega ese hueco en el segundo XI (cada jugador cuenta una vez)
  const depth = depthMap(tactic, firstTeam);
  const needs: SquadNeed[] = lineup.slots.map((s, i) => {
    const st = s.starter?.effective ?? 0;
    const real = depth[i];
    const backup = real?.backup ?? null;
    const reasons: string[] = [];
    let level: NeedLevel = "cubierto";
    let ageBand: SquadNeed["ageBand"] = "ambos";
    const exp = /(\d{4})/.exec(s.starter?.player.contractExpiry ?? "")?.[1];
    const starterAge = s.starter?.player.age ?? 0;

    if (!s.starter) { level = "urgente"; reasons.push("Sin nadie para el hueco."); }
    else if (!backup || real.tone === "poor") {
      level = "urgente";
      reasons.push(!backup ? "Sin suplente: en el segundo XI no queda nadie para el puesto."
        : backup.familiarity < 0.85 ? `El suplente real (${backup.player.name}) juega fuera de su puesto.`
        : `El suplente real (${backup.player.name}, ${Math.round(backup.effective)}) está a ${Math.round(st - backup.effective)} puntos del titular.`);
      ageBand = "inmediato";
    } else if (st < lineup.average - 6) {
      level = "mejorable";
      reasons.push(`El titular (${Math.round(st)}) está ${Math.round(lineup.average - st)} puntos por debajo de la media del XI (${Math.round(lineup.average)}).`);
      ageBand = "inmediato";
    }
    const youngCover = s.depth.some((d) => (d.player.age ?? 99) <= 26 && d.effective >= st - 8);
    if (starterAge >= 30 && !youngCover) {
      if (level === "cubierto") level = "sucesion";
      reasons.push(`Titular de ${starterAge} años sin relevo joven (≤26 a menos de 8 puntos).`);
      ageBand = level === "sucesion" ? "futuro" : "ambos";
    }
    if (gameYear != null && exp != null && Number(exp) <= gameYear) {
      if (level === "cubierto") level = "sucesion";
      reasons.push(`Contrato del titular vence en ${exp}.`);
    }
    const profile = signs.get(s.slot.id);
    if (profile) {
      if (level === "cubierto" || level === "sucesion") level = "mejorable";
      reasons.push(`Plan por hueco: nadie de la plantilla puede ${profile.needs.map((x) => x.toLowerCase()).join(" y ")} (${profileText(profile)}).`);
    }
    return {
      slotId: s.slot.id, slot: s.slot.slot, role: s.role, starter: s.starter, depth: s.depth, backup, level, reasons,
      targetScore: Math.max(st - 8, backup?.effective ?? 0),
      upgradeScore: st + 3,
      ageBand,
      ...(profile ? { profile } : {}),
    };
  });
  return { lineup, needs };
}

export type Verdict = "titular" | "rotacion" | "futuro" | "descartar";
export const VERDICT_LABEL: Record<Verdict, string> = { titular: "Mejora al titular", rotacion: "Rotación", futuro: "Futuro", descartar: "Descartar" };

export interface CandidateFit {
  need: SquadNeed;
  effective: number;
  min: number;
  max: number;
  rank: number;
}

export interface CandidateEval {
  player: Player;
  fit: CandidateFit | null;
  /** Fracción de atributos conocidos con exactitud (sin rango). */
  knowledge: number;
  personalityTier: number;
  verdict: Verdict;
  /** Bandera roja que fuerza el descarte. */
  red: string[];
  warnings: string[];
  pluses: string[];
  /** Comparación con el titular en los atributos clave del rol. */
  comparison: { key: AttrKey; mine: number | null; starter: number | null }[];
  score: number;
}

export interface Budget {
  transfer: number | null;
  wage: number | null;
}

export function evaluateCandidate(p: Player, needs: SquadNeed[], firstTeam: Player[], budget: Budget, gameYear: number | null): CandidateEval {
  const age = p.age ?? 25;
  const tier = personalityTierLevel(p.personality);
  const det = p.attrs.Det?.value ?? null;
  const nat = p.attrs.Nat?.value ?? null;
  const attrs = Object.values(p.attrs);
  const knowledge = attrs.length ? attrs.filter((a) => !a.isRange).length / attrs.length : 0;
  const red: string[] = [];
  const warnings: string[] = [];
  const pluses: string[] = [];

  // --- Mejor hueco entre las necesidades
  let fit: CandidateFit | null = null;
  for (const n of needs) {
    const fam = familiarity(p, n.slot);
    if (fam < 0.85 && !p.position.slots.includes(n.slot)) continue;
    const rs = scoreRole(p, n.role);
    const effective = rs.score * fam;
    const ft = firstTeam.map((x) => scoreRole(x, n.role).score * familiarity(x, n.slot)).filter((v) => v > 0);
    const rank = 1 + ft.filter((v) => v > effective).length;
    const cand: CandidateFit = { need: n, effective, min: rs.min * fam, max: rs.max * fam, rank };
    // Prioriza huecos con necesidad; a igual necesidad, mejor efectiva.
    const weight = (c: CandidateFit) => c.effective + (c.need.level === "urgente" ? 6 : c.need.level === "mejorable" ? 4 : c.need.level === "sucesion" ? 2 : 0);
    if (!fit || weight(cand) > weight(fit)) fit = cand;
  }

  // --- Perfil del plan por hueco
  if (fit?.need.profile) {
    const m = meetsProfile(p, fit.need.profile);
    if (m.ok) pluses.push(`Cumple el perfil del plan (${profileText(fit.need.profile)}).`);
    else warnings.push(`No cumple el perfil del plan: ${m.misses.join(", ")}.`);
  }

  // --- Personalidad y atributos fijos
  if (det != null && det < 10) red.push(`Determinación ${det} (<10): no va a mejorar ni rendir con regularidad.`);
  if (tier <= 1) red.push(`Personalidad ${p.personality}: vestuario y desarrollo en riesgo.`);
  else if (tier <= 2) warnings.push(`Personalidad ${p.personality}: floja.`);
  else if (tier >= 6) pluses.push(`Personalidad ${p.personality}.`);
  if (nat != null && nat <= 9) warnings.push(`Forma física natural ${nat}: si es propenso a lesiones, tardará en volver.`);
  if (/provocar|irascible|vol[aá]til|confrontational|short|volatile/i.test(p.mediaHandling ?? "")) warnings.push("Trato con la prensa conflictivo.");
  const wor = p.attrs.Wor?.value;
  if (wor != null && wor >= 15) pluses.push(`Sacrificio ${wor}.`);

  // --- Edad
  if (age >= 31) warnings.push(`${age} años: solo contrato corto (1-2 años) y rendimiento inmediato.`);
  if (age <= 21) pluses.push("Edad de desarrollo: cuenta el potencial más que el nivel actual.");

  // --- Dinero
  const starterWage = fit?.need.starter?.player.wage ?? null;
  const wages = firstTeam.map((x) => x.wage).filter((w): w is number => w != null).sort((a, b) => a - b);
  const maxWage = wages.length ? wages[wages.length - 1] : null;
  const medianWage = wages.length ? wages[Math.floor(wages.length / 2)] : null;
  if (p.wage != null) {
    if (budget.wage != null && p.wage > budget.wage) warnings.push(`Sueldo ${fmtMoney(p.wage)} por encima del tope que pusiste (${fmtMoney(budget.wage)}).`);
    if (maxWage != null && p.wage > maxWage * 1.25) warnings.push(`Sueldo ${fmtMoney(p.wage)}: rompe la estructura (el máximo de la plantilla es ${fmtMoney(maxWage)}).`);
    else if (starterWage != null && p.wage > starterWage * 1.5 && medianWage != null && p.wage > medianWage) warnings.push(`Cobraría un 50 % más que el titular del puesto (${fmtMoney(starterWage)}).`);
  }
  if (p.value != null && budget.transfer != null && p.value > budget.transfer) {
    if (p.releaseClause != null && p.releaseClause <= budget.transfer) pluses.push(`Cláusula ${fmtMoney(p.releaseClause)} dentro del presupuesto.`);
    else warnings.push(`Valor ${fmtMoney(p.value)} por encima del presupuesto (${fmtMoney(budget.transfer)}).`);
  } else if (p.releaseClause != null) pluses.push(`Cláusula de ${fmtMoney(p.releaseClause)}.`);
  const exp = /(\d{4})/.exec(p.contractExpiry ?? "")?.[1];
  if (gameYear != null && exp != null) {
    if (Number(exp) <= gameYear) pluses.push("Contrato vence esta temporada: precontrato en enero o gratis en verano.");
    else if (Number(exp) === gameYear + 1) pluses.push("Le queda un año: el club vende barato.");
  }
  if (/listado|listed/i.test(p.transferStatus ?? "")) pluses.push("Transferible: fichaje rebajado.");
  if (/listado|listed/i.test(p.loanStatus ?? "")) pluses.push("Cedible.");

  // --- Conocimiento
  if (knowledge < 0.5) warnings.push(`Conocimiento ${Math.round(knowledge * 100)} %: ojear a fondo antes de ofertar; el nivel es un rango.`);

  // --- Veredicto
  let verdict: Verdict;
  if (red.length) verdict = "descartar";
  else if (!fit) verdict = "descartar";
  else if (fit.effective >= fit.need.upgradeScore || fit.rank === 1) verdict = "titular";
  else if (fit.effective >= fit.need.targetScore && fit.rank <= 3) verdict = "rotacion";
  else if (age <= 21 && fit.effective >= (fit.need.starter?.effective ?? 60) - 18) verdict = "futuro";
  else verdict = "descartar";
  if (verdict === "rotacion" && fit && fit.need.level === "cubierto") warnings.push("El hueco ya está cubierto: solo si sale alguien.");
  if (verdict === "titular" && fit) pluses.push(`Sería el ${fit.rank}º del primer equipo como ${fit.need.role.es}${fit.need.starter ? ` (titular actual ${fit.need.starter.player.name}, ${Math.round(fit.need.starter.effective)})` : ""}.`);
  if (verdict === "rotacion" && fit) pluses.push(`Rotación real como ${fit.need.role.es} (${fit.rank}º del primer equipo).`);
  if (verdict === "futuro" && fit) pluses.push(`Con ${age} años y ${Math.round(fit.effective)} en ${fit.need.role.es}, proyecto de futuro; hoy no jugaría.`);
  if (verdict === "descartar" && !red.length) warnings.push(fit ? `No mejora lo que hay: ${Math.round(fit.effective)} como ${fit.need.role.es} frente a ${Math.round(fit.need.targetScore)} necesarios.` : "No encaja en ningún hueco de la táctica.");

  const comparison = (fit?.need.role.key ?? []).map((k) => ({ key: k, mine: p.attrs[k]?.value ?? null, starter: fit?.need.starter?.player.attrs[k]?.value ?? null }));
  const score = (fit?.effective ?? 0) + (verdict === "titular" ? 20 : verdict === "rotacion" ? 10 : verdict === "futuro" ? 5 : -30) + (fit ? (fit.need.level === "urgente" ? 6 : fit.need.level === "mejorable" ? 4 : 0) : 0);

  return { player: p, fit, knowledge, personalityTier: tier, verdict, red, warnings, pluses, comparison, score };
}

export function fmtMoney(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

export function evaluateAll(scouted: Player[], needs: SquadNeed[], firstTeam: Player[], budget: Budget, gameYear: number | null): CandidateEval[] {
  const own = new Set(firstTeam.map((p) => p.uid));
  const evals = scouted
    .filter((p) => !own.has(p.uid))
    .map((p) => evaluateCandidate(p, needs, firstTeam, budget, gameYear));
  // Gangas (idea del "bargain hunter" de fm-dash): nivel alto dentro de la lista y valor bajo.
  const withFit = evals.filter((e) => e.fit && e.player.value != null && e.player.value > 0);
  if (withFit.length >= 5) {
    const pct = (arr: number[], v: number) => arr.filter((x) => x <= v).length / arr.length;
    const levels = withFit.map((e) => e.fit!.effective);
    const values = withFit.map((e) => e.player.value as number);
    for (const e of withFit) {
      const lp = pct(levels, e.fit!.effective);
      const vp = pct(values, e.player.value as number);
      if (lp - vp >= 0.35 && e.verdict !== "descartar") e.pluses.push(`Ganga: nivel en el ${Math.round(lp * 100)} % de la lista y valor solo en el ${Math.round(vp * 100)} %.`);
    }
  }
  return evals.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Encargos de ojeo (guía de scouting de Passion4FM)
// ---------------------------------------------------------------------------

export interface ScoutAssignment {
  need: SquadNeed;
  /** "Máxima" (corto plazo, 2+ ojeadores) o "Normal" (≈1 mes, 1 ojeador). */
  priority: "maxima" | "normal";
  /** Qué ojeador: el de mejor JPA (nivel actual) o JPP (potencial). */
  scoutProfile: string;
  /** Campos del foco de reclutamiento del juego. */
  filters: { label: string; value: string }[];
  note: string;
}

export function suggestAssignments(needs: SquadNeed[], firstTeam: Player[], budget: Budget): ScoutAssignment[] {
  const wages = firstTeam.map((x) => x.wage).filter((w): w is number => w != null).sort((a, b) => a - b);
  const maxWage = wages.length ? wages[wages.length - 1] : null;
  return needs
    .filter((n) => n.level !== "cubierto")
    .map((n) => {
      const starterWage = n.starter?.player.wage ?? null;
      const wageCap = budget.wage ?? (starterWage != null ? Math.round(starterWage * 1.2) : maxWage);
      const future = n.ageBand === "futuro";
      const immediate = n.level === "urgente" || n.level === "mejorable";
      const filters: ScoutAssignment["filters"] = [
        { label: "Posición / rol", value: `${POSITION_LABEL_ES[n.slot]} · ${n.role.es} (${n.role.duty === "D" ? "defender" : n.role.duty === "S" ? "apoyo" : n.role.duty === "A" ? "atacar" : n.role.duty})` },
        { label: "Edad", value: future ? "17-23" : immediate ? "22-29" : "20-27" },
        { label: "Habilidad actual", value: immediate ? "≥ nivel del primer equipo (≈3 estrellas; mín. 2,5)" : "≥ 2 estrellas y potencial ≥ 4" },
        { label: "Nivel en la app", value: `≥ ${Math.round(n.targetScore)} para rotar, ≥ ${Math.round(n.upgradeScore)} para mejorar al titular` },
        { label: "Sueldo", value: wageCap != null ? `≤ ${fmtMoney(wageCap)}${budget.wage == null ? " (titular +20 %)" : ""}` : "según estructura" },
        { label: "Valor", value: budget.transfer != null ? `≤ ${fmtMoney(budget.transfer)}` : "según presupuesto" },
        { label: "Situación", value: immediate ? "cualquiera; marca también «contrato termina en 12 meses» y «transferibles» para abaratar" : "contrato termina en 12 meses / transferibles / cedibles" },
      ];
      if (future) filters.push({ label: "Personalidad", value: "Determinación ≥ 12; descartar ambición baja y profesionalidad baja" });
      if (n.profile) {
        filters.push({ label: "Perfil del plan", value: `${n.profile.needs.join(", ")}: ${profileText(n.profile)}` });
        const quality = [...n.profile.traitsHave.map((t) => `Tiene «${t.es}»`), ...n.profile.traitsAvoid.map((t) => `No tiene «${t.es}»`)];
        if (quality.length) filters.push({ label: "Cualidad de jugador", value: quality.join(" · ") });
      }
      return {
        need: n,
        priority: immediate ? "maxima" : "normal",
        scoutProfile: immediate ? "el de mayor Juzgar habilidad (JPA); dos ojeadores si es urgente" : "el de mayor Juzgar potencial (JPP); un ojeador, ≈1 mes",
        filters,
        note: n.reasons.join(" "),
      };
    });
}

const POSITION_LABEL_ES: Record<PositionSlot, string> = {
  GK: "POR", DL: "DF (I)", DC: "DF (C)", DR: "DF (D)", WBL: "CR (I)", WBR: "CR (D)", DM: "MC",
  ML: "ME (I)", MC: "ME (C)", MR: "ME (D)", AML: "MP (I)", AMC: "MP (C)", AMR: "MP (D)", ST: "DL",
};

/** Consejos generales de la guía, para el panel lateral. */
export const SCOUTING_TIPS: string[] = [
  "Ojeadores: Juzgar habilidad y Juzgar potencial ≥15 en un club grande (≥10 en divisiones bajas); Adaptabilidad alta para los que rotan de país.",
  "Reparte perfiles: uno itinerante (adaptabilidad) que abra conocimiento de regiones, uno de cantera (potencial), uno de rivales y uno general (habilidad + potencial).",
  "Prioridad máxima solo para necesidades a corto plazo (2 ojeadores, semanas); normal para construir conocimiento de una región, empezando meses antes del mercado.",
  "Un informe es fiable a partir de recomendación B+ y con conocimiento alto; con atributos en rango, «ojear a fondo» antes de ofertar.",
  "Truco de presupuesto: sube el alcance a Mundial sin avanzar el tiempo, haz las búsquedas y listas, y vuelve al alcance barato antes del cobro mensual.",
  "Conocimiento: segunda nacionalidad del entrenador en la región objetivo (50-80 % de conocimiento) y clubes afiliados que compartan ojeo.",
  "Antes de buscar, mira la media de atributos de tu liga por posición y filtra por encima de ella; ordena la búsqueda por valor para no pagar de más.",
  "Pide al director deportivo recomendaciones por posición y rol (pestaña Traspasos) y revisa las estadísticas de tu liga y de la división inferior: rinden y son asequibles.",
];

// ---------------------------------------------------------------------------
// Encargos permanentes (no dependen de una necesidad concreta)
// ---------------------------------------------------------------------------

export interface StandingAssignment {
  id: string;
  title: string;
  goal: string;
  scoutProfile: string;
  filters: { label: string; value: string }[];
}

/**
 * Encargos "en curso" que la guía recomienda tener siempre: oportunidades para
 * el primer equipo, jóvenes con potencial, cantera, agentes libres, cesiones y
 * conocimiento de regiones. Los umbrales salen de la plantilla actual.
 */
export function standingAssignments(needs: SquadNeed[], firstTeam: Player[], budget: Budget): StandingAssignment[] {
  const wages = firstTeam.map((x) => x.wage).filter((w): w is number => w != null).sort((a, b) => a - b);
  const medianWage = wages.length ? wages[Math.floor(wages.length / 2)] : null;
  const maxWage = wages.length ? wages[wages.length - 1] : null;
  const starters = needs.map((n) => n.starter?.effective ?? 0).filter((v) => v > 0);
  const avg = starters.length ? starters.reduce((a, b) => a + b, 0) / starters.length : 65;
  const weakest = needs.reduce<SquadNeed | null>((w, n) => (!w || (n.starter?.effective ?? 0) < (w.starter?.effective ?? 0) ? n : w), null);
  const wageCap = budget.wage ?? maxWage;
  const wageTxt = wageCap != null ? `≤ ${fmtMoney(wageCap)}` : "dentro de la estructura";
  const valueTxt = budget.transfer != null ? `≤ ${fmtMoney(budget.transfer)}` : "según presupuesto";
  const aging = needs.filter((n) => (n.starter?.player.age ?? 0) >= 28).map((n) => POSITION_LABEL_ES[n.slot]).join(", ");
  const short = needs.filter((n) => n.level === "urgente" || n.level === "mejorable").map((n) => POSITION_LABEL_ES[n.slot]).join(", ");
  return [
    {
      id: "primer-equipo",
      title: "Oportunidades para el primer equipo",
      goal: "Que aparezca cualquier jugador que mejore un hueco aunque hoy no sea una necesidad.",
      scoutProfile: "ojeador general (habilidad y potencial altos), prioridad normal, en curso",
      filters: [
        { label: "Posición", value: "cualquiera" },
        { label: "Edad", value: "22-29" },
        { label: "Habilidad actual", value: `≥ nivel del primer equipo (media de tus titulares ≈ ${Math.round(avg)} en la app; ≈3 estrellas)` },
        { label: "Situación", value: "contrato termina en 12 meses, transferibles, cláusula de rescisión" },
        { label: "Sueldo / valor", value: `${wageTxt} · ${valueTxt}` },
      ],
    },
    {
      id: "futuro",
      title: "Jóvenes con potencial (futuro)",
      goal: "Relevos a 2-3 años para los puestos con titulares de 28+ y jugadores que se revaloricen.",
      scoutProfile: "ojeador de cantera (Juzgar potencial ≥15), prioridad normal, en curso",
      filters: [
        { label: "Posición", value: aging || "cualquiera" },
        { label: "Edad", value: "17-21" },
        { label: "Potencial", value: "≥ 4 estrellas; habilidad actual ≥ 2" },
        { label: "Personalidad", value: "Determinación ≥ 12; sin ambición ni profesionalidad bajas" },
        { label: "Sueldo", value: medianWage != null ? `≤ ${fmtMoney(medianWage)} (mediana de la plantilla)` : "bajo" },
      ],
    },
    {
      id: "cantera",
      title: "Captación juvenil (15-17)",
      goal: "Fichajes baratos para el Sub-18 antes de que firmen su primer contrato profesional.",
      scoutProfile: "ojeador de cantera con conocimiento del país; prioridad normal, en curso; regiones con buena captación",
      filters: [
        { label: "Edad", value: "15-17" },
        { label: "Potencial", value: "≥ 4 estrellas" },
        { label: "Contrato", value: "juvenil o sin contrato; ojo al permiso de trabajo y a la edad mínima para fichar extranjeros" },
        { label: "Personalidad", value: "Determinación y profesionalidad altas; las estrellas de potencial engañan más a esta edad" },
      ],
    },
    {
      id: "libres",
      title: "Agentes libres y fin de contrato",
      goal: "Fichar sin traspaso: contratos que terminan en 6 meses (precontrato) o ya sin club.",
      scoutProfile: "ojeador general; búsqueda de jugadores con filtro de contrato, revisar cada mes",
      filters: [
        { label: "Situación", value: "sin club o contrato termina en 6 meses; en clubes grandes, también «queda 1 año» + sondeo para inquietarlo" },
        { label: "Edad", value: "≤ 30 (31+ solo contrato de 1 año)" },
        { label: "Nivel", value: weakest?.starter ? `≥ ${Math.round(weakest.targetScore)} (rotación en ${weakest.role.es}, tu hueco más flojo)` : "≥ rotación" },
        { label: "Sueldo", value: "es donde se lo gastan: fija tope antes de hablar con el agente" },
      ],
    },
    {
      id: "cesiones",
      title: "Mercado de cesiones",
      goal: "Cubrir huecos urgentes sin traspaso: cedibles de clubes de categoría superior o del club afiliado senior.",
      scoutProfile: "ojeador general; filtro «cedible» en clubes de divisiones superiores; pedir a la directiva un afiliado senior si no hay",
      filters: [
        { label: "Posición", value: short || "las que se queden cortas por lesiones" },
        { label: "Edad", value: "≤ 24 (el club de origen cede a los que necesitan minutos)" },
        { label: "Condiciones", value: "sin opción obligatoria; aporte de sueldo parcial; opción de compra si es joven" },
      ],
    },
    {
      id: "conocimiento",
      title: "Conocimiento de regiones",
      goal: "Abrir mercados donde el conocimiento es bajo para que las búsquedas muestren jugadores que hoy no ves.",
      scoutProfile: "ojeador itinerante (Adaptabilidad alta), un país o región por encargo, varios meses",
      filters: [
        { label: "Región", value: "donde el conocimiento sea «mínimo» o «nominal»: Sudamérica, Escandinavia y Europa del Este suelen dar buena relación calidad-precio" },
        { label: "Complemento", value: "segunda nacionalidad del entrenador en la región y clubes afiliados que compartan ojeo" },
      ],
    },
  ];
}

/**
 * Sobrepagados: sueldo muy por encima de lo que aportan (guía de finanzas:
 * reestructurar la masa salarial vendiendo a los caros que no rinden).
 */
export interface Overpaid {
  player: Player;
  wageRank: number;
  levelRank: number;
  level: number;
}

export function overpaidPlayers(firstTeam: Player[], lineup: LineupResult): Overpaid[] {
  const level = new Map<string, number>();
  for (const s of lineup.slots) if (s.starter) level.set(s.starter.player.uid, s.starter.effective);
  for (const b of lineup.bench) level.set(b.player.uid, b.effective);
  const withWage = firstTeam.filter((p) => p.wage != null);
  const byWage = [...withWage].sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0));
  const byLevel = [...withWage].sort((a, b) => (level.get(b.uid) ?? 0) - (level.get(a.uid) ?? 0));
  const wages = withWage.map((p) => p.wage as number).sort((a, b) => a - b);
  const median = wages.length ? wages[Math.floor(wages.length / 2)] : 0;
  return withWage
    .map((p) => ({ player: p, wageRank: byWage.indexOf(p) + 1, levelRank: byLevel.indexOf(p) + 1, level: level.get(p.uid) ?? 0 }))
    .filter((o) => o.levelRank - o.wageRank >= 6 && (o.player.wage ?? 0) > median)
    .sort((a, b) => (b.levelRank - b.wageRank) - (a.levelRank - a.wageRank));
}
