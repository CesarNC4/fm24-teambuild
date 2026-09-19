/**
 * Desarrollo de juveniles: dónde debe estar cada joven (primer equipo,
 * rotación, filial, cesión o salida), qué entrenar y qué alertas tiene.
 *
 * Reglas tomadas de las guías de desarrollo juvenil de Passion4FM y FM Scout:
 * - solo sube de equipo quien va a tener minutos de verdad; el banquillo del
 *   primer equipo (20-45 min sueltos) desarrolla menos que una cesión;
 * - Sub-18: prioridad al entrenamiento; 18-23 en un filial sin liga
 *   competitiva necesita cesión a un club que garantice titularidad;
 * - cesiones a primera división como titular para los de potencial alto;
 * - físicos hasta ~24, técnicos a cualquier edad, mentales tarde; rasgos a
 *   partir de los 20; intensidad doble para ≤23 con determinación alta,
 *   buena profesionalidad y pocos minutos, vigilando la fatiga;
 * - tutorías: aprendices ≤23-24 con mentores ≥25 del mismo equipo.
 */

import { FORMATION_BY_ID } from "./formations";
import { ROLE_BY_ID, type RoleDef } from "./roles";
import { bestRoles, scoreRole, type RoleScore } from "./scoring";
import { familiarity, type Tactic } from "./tactics";
import { personalityTierLevel } from "./personalities";
import { recommendFocus, type FocusRecommendation } from "./training";
import type { Player, PositionSlot, Squad } from "./types";

export type Destination = "primer-equipo" | "rotacion" | "cesion" | "filial" | "salida";

export const DESTINATION_LABEL: Record<Destination, string> = {
  "primer-equipo": "Primer equipo",
  rotacion: "Primer equipo (rotación)",
  cesion: "Cesión",
  filial: "Filial",
  salida: "Salida",
};

export type LoanLevel = "primera" | "segunda" | "tercera";
export const LOAN_LABEL: Record<LoanLevel, string> = {
  primera: "primera división, titular",
  segunda: "segunda división o liga menor fuerte, titular",
  tercera: "tercera división / liga menor, titular",
};

export interface SlotFit {
  slot: PositionSlot;
  role: RoleDef;
  /** Puntuación efectiva del joven en ese hueco (rol × familiaridad). */
  effective: number;
  /** 1 = sería el mejor del primer equipo en ese hueco. */
  rank: number;
  /** Efectiva del titular actual y del siguiente del primer equipo. */
  starter: number | null;
  second: number | null;
}

export interface YouthAssessment {
  player: Player;
  squad: Squad | null;
  bestRole: RoleScore | null;
  fit: SlotFit | null;
  /** Valoración del cuerpo técnico 1-5 (máximo del rango). */
  potential: number | null;
  personalityTier: number;
  destination: Destination;
  /** Filial donde debería estar si el destino es "filial". */
  targetSquad: Squad | null;
  loanLevel: LoanLevel | null;
  onLoan: boolean;
  reasons: string[];
  alerts: string[];
  training: {
    role: RoleDef;
    focus: FocusRecommendation[];
    intensity: "doble" | "normal" | "media";
    intensityWhy: string;
    traitsPhase: boolean;
  };
  /** Proyección para ordenar: nivel actual + potencial + margen de edad. */
  projection: number;
}

function parseDate(s: string | null): Date | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s ?? "");
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

/**
 * Año en que termina la temporada actual del juego. La fecha actual está
 * acotada por el último cumpleaños (nacimiento + edad) y el último inicio de
 * contrato; la temporada termina el 30 de junio siguiente.
 */
export function estimateGameYear(players: Player[]): number | null {
  let latest: Date | null = null;
  for (const p of players) {
    const b = parseDate(p.birthDate);
    if (b && p.age != null) {
      const last = new Date(b.getFullYear() + p.age, b.getMonth(), b.getDate());
      if (!latest || last > latest) latest = last;
    }
    const c = parseDate(p.contractStart);
    if (c && (!latest || c > latest)) latest = c;
  }
  // Ningún contrato vigente puede haber vencido ya: el vencimiento más
  // cercano acota la temporada por abajo (resuelve el hueco de julio sin cumpleaños).
  const expiries = players.map(expiryYear).filter((y): y is number => y != null);
  const minExpiry = expiries.length ? Math.min(...expiries) : null;
  if (!latest) return minExpiry;
  const fromDates = latest.getMonth() >= 6 ? latest.getFullYear() + 1 : latest.getFullYear();
  return minExpiry != null ? Math.max(fromDates, minExpiry) : fromDates;
}

function expiryYear(p: Player): number | null {
  const m = /(\d{4})/.exec(p.contractExpiry ?? "");
  return m ? Number(m[1]) : null;
}

/** Mejor hueco del joven en la formación de la táctica, comparado con el primer equipo. */
export function slotFitVsFirstTeam(p: Player, tactic: Tactic | null, firstTeam: Player[]): SlotFit | null {
  const formation = FORMATION_BY_ID[tactic?.formationId ?? "4-2-3-1-dm"];
  if (!formation) return null;
  const others = firstTeam.filter((x) => x.uid !== p.uid);
  let best: SlotFit | null = null;
  for (const s of formation.slots) {
    const roleId = tactic?.roles[s.id] ?? s.defaultRole;
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    const fam = familiarity(p, s.slot);
    if (fam < 0.85 && !p.position.slots.includes(s.slot)) continue;
    const effective = scoreRole(p, role).score * fam;
    const ft = others
      .map((x) => scoreRole(x, role).score * familiarity(x, s.slot))
      .filter((v) => v > 0)
      .sort((a, b) => b - a);
    const rank = 1 + ft.filter((v) => v > effective).length;
    const fit: SlotFit = { slot: s.slot, role, effective, rank, starter: ft[0] ?? null, second: ft[1] ?? null };
    if (!best || fit.rank < best.rank || (fit.rank === best.rank && fit.effective > best.effective)) best = fit;
  }
  return best;
}

/** Filial más ajustado a la edad (el de menor edad máxima que aún la admite). */
function squadForAge(age: number, squads: Squad[]): Squad | null {
  const fil = squads.filter((q) => q.kind === "filial");
  const fits = fil.filter((q) => q.maxAge == null || age <= q.maxAge).sort((a, b) => (a.maxAge ?? 99) - (b.maxAge ?? 99));
  return fits[0] ?? null;
}

export interface YouthContext {
  firstTeam: Player[];
  tactic: Tactic | null;
  squads: Squad[];
  gameYear: number | null;
}

export function assessYouth(p: Player, squad: Squad | null, ctx: YouthContext): YouthAssessment {
  const age = p.age ?? 20;
  const fit = slotFitVsFirstTeam(p, ctx.tactic, ctx.firstTeam);
  const bestRole = bestRoles(p, 1)[0] ?? null;
  const potential = p.coachRating?.max ?? null;
  const tier = personalityTierLevel(p.personality);
  const onLoan = /cedido/i.test(p.playingTime ?? "");
  const reasons: string[] = [];
  const alerts: string[] = [];

  // --- Distancia al primer equipo
  const gap = fit && fit.starter != null ? fit.starter - fit.effective : 99;
  const rank = fit?.rank ?? 99;
  const pot = potential ?? 3;
  const potLabel = potential == null ? "desconocido" : String(potential);
  const ageSquad = squadForAge(age, ctx.squads);
  const tooOldForFilial = ctx.squads.some((q) => q.kind === "filial") && !ageSquad;

  let destination: Destination;
  let loanLevel: LoanLevel | null = null;
  let targetSquad: Squad | null = null;

  if (rank <= 2 || gap <= 3) {
    destination = "primer-equipo";
    reasons.push(fit ? `Sería el ${rank}º del primer equipo como ${fit.role.es} (${Math.round(fit.effective)} vs titular ${Math.round(fit.starter ?? 0)}).` : "Nivel de primer equipo.");
  } else if (gap <= 8) {
    if (age >= 20 && (p.apps ?? 0) < 10 && !squad?.competitive && squad?.kind === "filial") {
      destination = "cesion";
      loanLevel = "primera";
      reasons.push(`A ${Math.round(gap)} puntos del titular (${fit?.role.es}, ${rank}º): en el filial no compite; una cesión a primera como titular es lo que le falta.`);
    } else {
      destination = "rotacion";
      reasons.push(`A ${Math.round(gap)} puntos del titular como ${fit?.role.es} (${rank}º): que entrene con el primer equipo y juegue copas; si no pasa de 20-45 minutos sueltos, mejor cesión a primera.`);
    }
  } else if (age <= 17) {
    destination = "filial";
    targetSquad = ageSquad;
    reasons.push("Con 17 o menos la prioridad es entrenar; solo se cede si necesita competir de verdad.");
  } else if (gap <= 16 && pot >= 3) {
    if (squad?.competitive && squad.kind === "filial" && ageSquad?.id === squad.id) {
      destination = "filial";
      targetSquad = squad;
      reasons.push(`El ${squad.name} juega liga competitiva: se queda si es titular; si no, cesión.`);
    } else {
      destination = "cesion";
      loanLevel = gap <= 11 ? "primera" : "segunda";
      reasons.push(`A ${Math.round(gap)} puntos del titular${potential != null ? ` con potencial ${pot}` : ""}: necesita minutos competitivos, no liga de filiales.`);
    }
  } else if (tooOldForFilial && gap <= 20 && (potential == null || pot >= 3.5)) {
    destination = "cesion";
    loanLevel = gap <= 16 ? "segunda" : "tercera";
    reasons.push(`Sin edad de filial y a ${Math.round(gap)} puntos del titular: cesión larga como titular, y en un año se decide.`);
  } else if (tooOldForFilial || (age >= 21 && pot <= 3) || (age >= 23 && pot < 4)) {
    destination = "salida";
    reasons.push(tooOldForFilial ? "Sin edad de filial y lejos del primer equipo: vender o dejar salir." : `Con ${age} años y potencial ${potLabel} no va a llegar al nivel del primer equipo.`);
  } else if (pot >= 4 && age >= 19) {
    destination = "cesion";
    loanLevel = gap <= 20 ? "segunda" : "tercera";
    reasons.push(`Potencial alto (${pot}) pero lejos (${Math.round(gap)} puntos): que juegue titular en un nivel donde destaque.`);
  } else {
    destination = "filial";
    targetSquad = ageSquad;
    reasons.push(`Lejos del primer equipo (${Math.round(gap)} puntos): desarrollo en el filial.`);
  }

  if (onLoan) {
    reasons.unshift(`Ahora mismo cedido${p.apps != null ? ` (${p.apps} partidos, ${p.minutes ?? "?"} min${p.avgRating != null ? `, media ${p.avgRating.toFixed(2)}` : ""})` : ""}.`);
    if (p.apps != null && p.apps < 5) alerts.push("Cedido y sin jugar: revisa la cesión o cancélala.");
  }
  if (targetSquad && squad && targetSquad.id !== squad.id) reasons.push(`Debería estar en ${targetSquad.name}, no en ${squad.name}.`);
  if (squad?.maxAge != null && age > squad.maxAge) alerts.push(`Tiene ${age} años y el ${squad.name} es hasta ${squad.maxAge}.`);

  // --- Personalidad
  if (tier <= 1) alerts.push(`Personalidad ${p.personality}: ${pot >= 4 ? "vale la pena tutorizarlo en el primer equipo" : "no invertir; vender cuando tenga valor"}.`);
  else if (tier <= 3 && pot >= 4 && age <= 23) alerts.push("Personalidad mejorable con potencial alto: tutoría (súbelo al primer equipo para meterlo en un grupo).");
  if (/mercenari|voluble|fickle/i.test(p.personality ?? "") && pot >= 4) alerts.push("Pedirá irse en cuanto pueda: contrato largo y cláusula alta si te lo quedas.");

  // --- Contrato
  const exp = expiryYear(p);
  if (/juvenil|youth/i.test(p.contractType ?? "") && age >= 17 && pot >= 3) alerts.push("Contrato juvenil: ofrécele el primer contrato profesional antes de que otro club lo tiente.");
  if (/mes a mes|month/i.test(p.contractKind ?? "")) alerts.push(pot >= 3.5 ? "Contrato mes a mes: fírmalo ya." : "Contrato mes a mes: déjalo salir.");
  if (ctx.gameYear != null && exp != null) {
    if (exp <= ctx.gameYear) alerts.push("Contrato vence esta temporada: renueva o vende.");
    else if (exp === ctx.gameYear + 1 && pot >= 3.5) alerts.push("Queda un año de contrato: renueva antes del verano.");
  }
  if (/listado|listed/i.test(p.transferStatus ?? "")) alerts.push("Transferible.");
  if (/lesion|injur/i.test(p.condition ?? "")) alerts.push("Lesionado.");
  if (destination === "salida" && p.value != null && p.value > 0) reasons.push(`Valor ${Math.round(p.value / 1e6 * 10) / 10}M: mejor vender que dejar caducar.`);

  // --- Entrenamiento
  const role = fit?.role ?? (bestRole ? ROLE_BY_ID[bestRole.roleId] : null) ?? ROLE_BY_ID["CM-S"];
  const focus = recommendFocus(p, role);
  const nat = p.attrs.Nat?.value ?? 12;
  const det = p.attrs.Det?.value ?? 10;
  const fewMinutes = (p.apps ?? 0) < 10;
  let intensity: "doble" | "normal" | "media" = "normal";
  let intensityWhy = "carga normal";
  if (nat <= 8) { intensity = "media"; intensityWhy = "forma física natural baja: se lesiona con carga alta"; }
  else if (age <= 23 && nat >= 12 && (det >= 15 || tier >= 5 || fewMinutes)) {
    intensity = "doble";
    intensityWhy = det >= 15 ? "≤23 con determinación ≥15: aguanta doble intensidad" : tier >= 5 ? "≤23 y profesional: aguanta doble intensidad" : "≤23 sin minutos: doble intensidad compensa la falta de partidos";
  }

  const projection = (fit?.effective ?? bestRole?.score ?? 40) + pot * 6 + Math.max(0, 23 - age) * 1.5;

  return {
    player: p, squad, bestRole, fit, potential, personalityTier: tier, destination, targetSquad, loanLevel, onLoan, reasons, alerts,
    training: { role, focus, intensity, intensityWhy, traitsPhase: age >= 20 },
    projection,
  };
}

/** Todos los jóvenes del club (filiales + ≤23 del primer equipo), evaluados y ordenados por proyección. */
export function assessAllYouth(players: Record<string, Player[]>, squads: Squad[], tactic: Tactic | null, maxFirstTeamAge = 23): YouthAssessment[] {
  const firstTeam = players.plantilla ?? [];
  const ctx: YouthContext = { firstTeam, tactic, squads, gameYear: estimateGameYear([...firstTeam, ...squads.flatMap((q) => players[q.id] ?? [])]) };
  const out: YouthAssessment[] = [];
  const primer = squads.find((q) => q.kind === "primer") ?? null;
  for (const p of firstTeam) if ((p.age ?? 99) <= maxFirstTeamAge) out.push(assessYouth(p, primer, ctx));
  for (const q of squads.filter((s) => s.kind === "filial")) for (const p of players[q.id] ?? []) out.push(assessYouth(p, q, ctx));
  return out.sort((a, b) => b.projection - a.projection);
}

/** Cobertura por familia de posición entre los jóvenes (máx. 2 por posición según la guía). */
export function positionCoverage(list: YouthAssessment[]): { family: string; count: number; names: string[] }[] {
  const fam = (s: PositionSlot) => (s === "GK" ? "POR" : s.startsWith("D") && !s.startsWith("DM") ? (s === "DC" ? "DFC" : "LAT") : s.startsWith("WB") ? "LAT" : s === "DM" || s === "MC" ? "MC" : s.startsWith("AM") && s !== "AMC" ? "EXT" : s === "AMC" ? "MP" : s === "ST" ? "DL" : "ME");
  const m = new Map<string, string[]>();
  for (const a of list) {
    const f = a.fit ? fam(a.fit.slot) : a.player.position.slots[0] ? fam(a.player.position.slots[0]) : "?";
    m.set(f, [...(m.get(f) ?? []), a.player.name]);
  }
  return ["POR", "DFC", "LAT", "MC", "ME", "EXT", "MP", "DL"].map((f) => ({ family: f, count: m.get(f)?.length ?? 0, names: m.get(f) ?? [] }));
}
