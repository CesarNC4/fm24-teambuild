/**
 * Radiografía de plantilla: medias por unidad y cluster de atributos, perfil
 * de edades, vencimientos, masa salarial y avisos. Inspirado en el "gap
 * analysis" de FM24-Player-Analyzer; se compara contra la liga si está importada.
 */

import type { AttrKey } from "./attributes";
import { FAMILIES, familyOf, familyOfSlot, leagueLevelPercentile, mean, percentile, type Family, type LeagueStats } from "./league";
import { bestRoles } from "./scoring";
import type { LineupResult } from "./tactics";
import type { Player, PositionSlot } from "./types";

export type Unit = "def" | "mid" | "att";
export const UNIT_LABEL: Record<Unit, string> = { def: "Defensa", mid: "Medio campo", att: "Ataque" };

export const CLUSTERS: { id: string; label: string; keys: AttrKey[] }[] = [
  { id: "vel", label: "Velocidad", keys: ["Pac", "Acc"] },
  { id: "aer", label: "Juego aéreo", keys: ["Hea", "Jum"] },
  { id: "tec", label: "Técnica", keys: ["Fir", "Tec", "Pas"] },
  { id: "men", label: "Mentales", keys: ["Ant", "Dec", "Pos", "Cmp"] },
  { id: "fis", label: "Físico", keys: ["Sta", "Str", "Wor"] },
  { id: "def", label: "Defensa", keys: ["Mar", "Tck", "Pos"] },
  { id: "cre", label: "Creación", keys: ["Vis", "Pas", "Dri"] },
  { id: "gol", label: "Gol", keys: ["Fin", "OtB", "Cmp"] },
];

export function unitOfSlot(s: PositionSlot): Unit | null {
  if (s === "GK") return null;
  if (s.startsWith("D") && !s.startsWith("DM")) return "def";
  if (s.startsWith("WB")) return "def";
  if (s.startsWith("DM") || s.startsWith("M")) return "mid";
  return "att";
}

function meanAttrs(players: Player[], keys: AttrKey[]): number | null {
  const vals: number[] = [];
  for (const p of players) for (const k of keys) { const v = p.attrs[k]?.value; if (v != null) vals.push(v); }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export interface UnitProfile {
  unit: Unit;
  starters: Player[];
  clusters: { id: string; label: string; xi: number | null; squad: number | null; league: number | null }[];
  weakest: string | null;
}

/** Familias de la liga que corresponden a cada unidad. */
const UNIT_FAMILIES: Record<Unit, Family[]> = { def: ["DFC", "LAT"], mid: ["MC"], att: ["EXT", "MP", "DL"] };

export function unitProfiles(firstTeam: Player[], lineup: LineupResult | null, league: LeagueStats | null): UnitProfile[] {
  const units: Unit[] = ["def", "mid", "att"];
  return units.map((unit) => {
    const starters = lineup ? lineup.slots.filter((s) => s.starter && unitOfSlot(s.slot.slot) === unit).map((s) => s.starter!.player) : [];
    const squad = firstTeam.filter((p) => !p.isGoalkeeper && unitOfPlayer(p) === unit);
    const clusters = CLUSTERS.map((c) => {
      let leagueMean: number | null = null;
      if (league) {
        const vals: number[] = [];
        for (const f of UNIT_FAMILIES[unit]) for (const k of c.keys) { const m = mean(league.byFamily[f].attrs[k] ?? []); if (m != null) vals.push(m); }
        leagueMean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
      return { id: c.id, label: c.label, xi: meanAttrs(starters, c.keys), squad: meanAttrs(squad, c.keys), league: leagueMean };
    });
    // Cluster más flojo respecto a los demás de la misma unidad (solo los generales)
    const general = clusters.filter((c) => ["vel", "aer", "tec", "men", "fis"].includes(c.id) && c.xi != null);
    const weakest = general.length ? general.reduce((w, c) => (c.xi! < w.xi! ? c : w)).label : null;
    return { unit, starters, clusters, weakest };
  });
}

export function unitOfPlayer(p: Player): Unit | null {
  const s = p.position.slots[0];
  return s ? unitOfSlot(s) : null;
}

export interface AgeBucket {
  label: string;
  min: number;
  max: number;
  players: { player: Player; starter: boolean }[];
}

export function ageProfile(firstTeam: Player[], lineup: LineupResult | null): AgeBucket[] {
  const xi = new Set(lineup ? lineup.slots.filter((s) => s.starter).map((s) => s.starter!.player.uid) : []);
  const buckets: AgeBucket[] = [
    { label: "≤21 (desarrollo)", min: 0, max: 21, players: [] },
    { label: "22-25 (subiendo)", min: 22, max: 25, players: [] },
    { label: "26-29 (pico)", min: 26, max: 29, players: [] },
    { label: "30-32 (declive físico)", min: 30, max: 32, players: [] },
    { label: "33+ (final)", min: 33, max: 99, players: [] },
  ];
  for (const p of firstTeam) {
    const age = p.age ?? 25;
    const b = buckets.find((x) => age >= x.min && age <= x.max)!;
    b.players.push({ player: p, starter: xi.has(p.uid) });
  }
  for (const b of buckets) b.players.sort((x, y) => Number(y.starter) - Number(x.starter) || (x.player.age ?? 0) - (y.player.age ?? 0));
  return buckets;
}

export interface ExpiryYear {
  year: number;
  players: { player: Player; starter: boolean }[];
  wage: number;
}

export function contractTimeline(firstTeam: Player[], lineup: LineupResult | null): ExpiryYear[] {
  const xi = new Set(lineup ? lineup.slots.filter((s) => s.starter).map((s) => s.starter!.player.uid) : []);
  const m = new Map<number, ExpiryYear>();
  for (const p of firstTeam) {
    const y = /(\d{4})/.exec(p.contractExpiry ?? "")?.[1];
    if (!y) continue;
    const e = m.get(Number(y)) ?? { year: Number(y), players: [], wage: 0 };
    e.players.push({ player: p, starter: xi.has(p.uid) });
    e.wage += p.wage ?? 0;
    m.set(Number(y), e);
  }
  return [...m.values()].sort((a, b) => a.year - b.year);
}

export interface WageSummary {
  total: number;
  byUnit: { unit: Unit | "gk"; label: string; total: number; count: number }[];
  top: Player[];
}

export function wageSummary(firstTeam: Player[]): WageSummary {
  const withWage = firstTeam.filter((p) => p.wage != null);
  const total = withWage.reduce((s, p) => s + (p.wage ?? 0), 0);
  const groups: { unit: Unit | "gk"; label: string }[] = [{ unit: "gk", label: "Porteros" }, { unit: "def", label: "Defensa" }, { unit: "mid", label: "Medio campo" }, { unit: "att", label: "Ataque" }];
  const byUnit = groups.map((g) => {
    const ps = withWage.filter((p) => (p.isGoalkeeper ? g.unit === "gk" : unitOfPlayer(p) === g.unit));
    return { ...g, total: ps.reduce((s, p) => s + (p.wage ?? 0), 0), count: ps.length };
  });
  return { total, byUnit, top: [...withWage].sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0)).slice(0, 5) };
}

export interface LeagueComparison {
  family: Family;
  /** Percentil medio de tus jugadores de esa familia dentro de la liga. */
  meanPercentile: number | null;
  players: { player: Player; percentile: number | null }[];
}

/**
 * Familia de cada jugador para compararlo con la liga: los titulares, por el
 * hueco que ocupan en la táctica (un MC que juega de mediapunta se compara con
 * los mediapuntas); el resto, por su primera posición.
 */
export function leagueComparison(firstTeam: Player[], league: LeagueStats, lineup: LineupResult | null = null): LeagueComparison[] {
  const slotOf = new Map<string, PositionSlot>();
  if (lineup) for (const s of lineup.slots) if (s.starter) slotOf.set(s.starter.player.uid, s.slot.slot);
  const famOf = (p: Player) => { const s = slotOf.get(p.uid); return s ? familyOfSlot(s) : familyOf(p); };
  return FAMILIES.map((family) => {
    const players = firstTeam.filter((p) => famOf(p) === family).map((p) => {
      const best = bestRoles(p, 1)[0];
      // Percentil del nivel dentro de la familia donde juega, no de la suya natural
      const pct = best ? percentile(league.byFamily[family].level, best.score) : leagueLevelPercentile(league, p);
      return { player: p, percentile: pct };
    }).sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0));
    const vals = players.map((x) => x.percentile).filter((v): v is number => v != null);
    return { family, meanPercentile: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, players };
  });
}

export function radiographyWarnings(units: UnitProfile[], ages: AgeBucket[], contracts: ExpiryYear[], gameYear: number | null, league: LeagueComparison[] | null): string[] {
  const out: string[] = [];
  for (const u of units) {
    const vel = u.clusters.find((c) => c.id === "vel");
    const aer = u.clusters.find((c) => c.id === "aer");
    if (vel?.xi != null && vel.xi < 12) out.push(`${UNIT_LABEL[u.unit]} lenta (velocidad media ${vel.xi.toFixed(1)}): evita líneas altas y trampa del fuera de juego.`);
    if (u.unit === "def" && aer?.xi != null && aer.xi < 12) out.push(`Defensa floja por arriba (${aer.xi.toFixed(1)}): defiende los córners con más gente y anchura defensiva estrecha.`);
    if (u.unit === "att" && aer?.xi != null && aer.xi < 11) out.push(`Ataque sin juego aéreo (${aer.xi.toFixed(1)}): centros rasos o de rosca, no colgados.`);
    if (vel?.xi != null && vel.league != null && vel.xi < vel.league - 1) out.push(`${UNIT_LABEL[u.unit]}: velocidad ${vel.xi.toFixed(1)} frente a ${vel.league.toFixed(1)} de media en la liga.`);
  }
  const old = ages.filter((b) => b.min >= 30).flatMap((b) => b.players).filter((x) => x.starter);
  if (old.length >= 3) out.push(`${old.length} titulares de 30 o más (${old.map((x) => x.player.name).join(", ")}): planifica relevos antes de que caigan a la vez.`);
  const young = ages.filter((b) => b.max <= 25).flatMap((b) => b.players).filter((x) => x.starter);
  if (young.length === 0) out.push("Ningún titular de 25 o menos: la plantilla no se revaloriza.");
  if (gameYear != null) {
    const thisYear = contracts.find((c) => c.year <= gameYear);
    if (thisYear) {
      const st = thisYear.players.filter((x) => x.starter);
      if (st.length) out.push(`Titulares con contrato que vence esta temporada: ${st.map((x) => x.player.name).join(", ")}. Renueva o vende en enero.`);
    }
    const next = contracts.find((c) => c.year === gameYear + 1);
    if (next && next.players.length >= 6) out.push(`${next.players.length} contratos vencen en ${next.year}: escalona las renovaciones para no negociar todo a la vez.`);
  }
  if (league) {
    for (const f of league) if (f.meanPercentile != null && f.meanPercentile < 50 && f.players.length) out.push(`${f.family}: tus jugadores están por debajo de la mediana de la liga (percentil ${f.meanPercentile}).`);
  }
  return out;
}
