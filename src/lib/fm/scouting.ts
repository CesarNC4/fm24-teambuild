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
import { buildLineup, familiarity, type LineupResult, type SlotResult, type Tactic } from "./tactics";
import { personalityTierLevel } from "./personalities";
import type { AttrKey } from "./attributes";
import type { Player, PositionSlot } from "./types";

export type NeedLevel = "urgente" | "mejorable" | "sucesion" | "cubierto";
export const NEED_LABEL: Record<NeedLevel, string> = { urgente: "Urgente", mejorable: "Mejorable", sucesion: "Sucesión", cubierto: "Cubierto" };

export interface SquadNeed {
  slotId: string;
  slot: PositionSlot;
  role: RoleDef;
  starter: SlotResult["starter"];
  depth: SlotResult["depth"];
  level: NeedLevel;
  reasons: string[];
  /** Puntuación mínima para ser útil (rotación real). */
  targetScore: number;
  /** Puntuación a partir de la cual mejora al titular. */
  upgradeScore: number;
  /** Perfil de edad que pide el hueco. */
  ageBand: "inmediato" | "futuro" | "ambos";
}

/** Necesidades del primer equipo por hueco de la táctica. */
export function squadNeeds(tactic: Tactic, firstTeam: Player[], gameYear: number | null): { lineup: LineupResult; needs: SquadNeed[] } {
  const lineup = buildLineup(tactic, firstTeam);
  const needs: SquadNeed[] = lineup.slots.map((s) => {
    const st = s.starter?.effective ?? 0;
    const backup = s.depth[0];
    const reasons: string[] = [];
    let level: NeedLevel = "cubierto";
    let ageBand: SquadNeed["ageBand"] = "ambos";
    const exp = /(\d{4})/.exec(s.starter?.player.contractExpiry ?? "")?.[1];
    const starterAge = s.starter?.player.age ?? 0;

    if (!s.starter) { level = "urgente"; reasons.push("Sin nadie para el hueco."); }
    else if (!backup || backup.effective < st - 12) {
      level = "urgente";
      reasons.push(backup ? `El suplente (${backup.player.name}, ${Math.round(backup.effective)}) está a ${Math.round(st - backup.effective)} puntos del titular.` : "Sin suplente.");
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
    return {
      slotId: s.slot.id, slot: s.slot.slot, role: s.role, starter: s.starter, depth: s.depth, level, reasons,
      targetScore: Math.max(st - 8, backup?.effective ?? 0),
      upgradeScore: st + 3,
      ageBand,
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
  return scouted
    .filter((p) => !own.has(p.uid))
    .map((p) => evaluateCandidate(p, needs, firstTeam, budget, gameYear))
    .sort((a, b) => b.score - a.score);
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
];
