/**
 * Medias y percentiles de la liga por familia de posición, a partir de una
 * exportación de "todos los jugadores" de la competición (fuente "liga").
 * Sirven para medir la plantilla y a los ojeados contra el nivel real de la
 * liga en vez de contra uno mismo (consejo de scouting de Passion4FM).
 */

import { ATTRIBUTES, type AttrKey } from "./attributes";
import { bestRoles } from "./scoring";
import type { Player, PositionSlot } from "./types";

export type Family = "POR" | "DFC" | "LAT" | "MC" | "EXT" | "MP" | "DL";
export const FAMILY_LABEL: Record<Family, string> = { POR: "Porteros", DFC: "Centrales", LAT: "Laterales", MC: "Mediocentros", EXT: "Extremos", MP: "Mediapuntas", DL: "Delanteros" };
export const FAMILIES: Family[] = ["POR", "DFC", "LAT", "MC", "EXT", "MP", "DL"];

export function familyOfSlot(s: PositionSlot): Family {
  if (s === "GK") return "POR";
  if (s === "DC") return "DFC";
  if (s === "DR" || s === "DL" || s === "WBR" || s === "WBL") return "LAT";
  if (s === "DM" || s === "MC") return "MC";
  if (s === "MR" || s === "ML" || s === "AMR" || s === "AML") return "EXT";
  if (s === "AMC") return "MP";
  return "DL";
}

/** Familia principal de un jugador (primera posición que lista el juego). */
export function familyOf(p: Player): Family {
  if (p.isGoalkeeper) return "POR";
  const s = p.position.slots[0];
  return s ? familyOfSlot(s) : "MC";
}

export interface LeagueStats {
  count: number;
  /** Por familia: valores ordenados de cada atributo y de la mejor puntuación de rol. */
  byFamily: Record<Family, { n: number; attrs: Partial<Record<AttrKey, number[]>>; level: number[] }>;
}

export function buildLeagueStats(players: Player[]): LeagueStats {
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, { n: 0, attrs: {}, level: [] as number[] }])) as LeagueStats["byFamily"];
  for (const p of players) {
    const f = byFamily[familyOf(p)];
    f.n++;
    for (const a of ATTRIBUTES) {
      const v = p.attrs[a.key]?.value;
      if (v == null) continue;
      (f.attrs[a.key] ??= []).push(v);
    }
    const best = bestRoles(p, 1)[0];
    if (best) f.level.push(best.score);
  }
  for (const f of FAMILIES) {
    for (const k of Object.keys(byFamily[f].attrs) as AttrKey[]) byFamily[f].attrs[k]!.sort((a, b) => a - b);
    byFamily[f].level.sort((a, b) => a - b);
  }
  return { count: players.length, byFamily };
}

/** Percentil (0-100) de un valor dentro de una lista ordenada. */
export function percentile(sorted: number[], v: number): number | null {
  if (!sorted.length) return null;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= v) lo = mid + 1; else hi = mid; }
  return Math.round((lo / sorted.length) * 100);
}

export function mean(sorted: number[]): number | null {
  return sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null;
}

/** Percentil del nivel (mejor rol) de un jugador dentro de su familia en la liga. */
export function leagueLevelPercentile(stats: LeagueStats, p: Player): number | null {
  const best = bestRoles(p, 1)[0];
  if (!best) return null;
  return percentile(stats.byFamily[familyOf(p)].level, best.score);
}

/** Percentil de un atributo dentro de la familia. */
export function leagueAttrPercentile(stats: LeagueStats, family: Family, key: AttrKey, v: number): number | null {
  return percentile(stats.byFamily[family].attrs[key] ?? [], v);
}

// ---------------------------------------------------------------------------
// Comparación de equipos (la pantalla "Comparación" del juego, que no exporta)
// ---------------------------------------------------------------------------

export type ClubUnit = "todos" | "gk" | "def" | "mid" | "att";
export const CLUB_UNIT_LABEL: Record<ClubUnit, string> = { todos: "Todas las posiciones", gk: "Porteros", def: "Defensa", mid: "Medio campo", att: "Ataque" };

function clubUnitOf(p: Player): ClubUnit {
  const f = familyOf(p);
  if (f === "POR") return "gk";
  if (f === "DFC" || f === "LAT") return "def";
  if (f === "MC") return "mid";
  return "att";
}

export interface ClubAttrRow {
  key: AttrKey;
  /** Media de nuestro club en ese atributo y unidad. */
  ours: number | null;
  /** Puesto (1 = mejor) entre los clubes con datos y número de clubes. */
  rank: number | null;
  clubs: number;
  best: { club: string; value: number } | null;
  worst: { club: string; value: number } | null;
  /** Media de todos los clubes. */
  leagueMean: number | null;
}

/**
 * Media por club de cada atributo en una unidad, con nuestro puesto. Replica
 * la pantalla de comparación de equipos del juego. Solo cuenta clubes con al
 * menos `minPlayers` jugadores en esa unidad.
 */
export function clubComparison(league: Player[], ourClub: string | null, ourPlayers: Player[], unit: ClubUnit, minPlayers = 3): ClubAttrRow[] {
  const byClub = new Map<string, Player[]>();
  for (const p of league) {
    if (!p.club) continue;
    if (unit !== "todos" && clubUnitOf(p) !== unit) continue;
    if (!byClub.has(p.club)) byClub.set(p.club, []);
    byClub.get(p.club)!.push(p);
  }
  // Si nuestro club no viene (o viene incompleto) en la liga, usamos nuestra plantilla
  const ourName = ourClub ?? "Nuestro club";
  const oursInLeague = ourClub ? byClub.get(ourClub) ?? [] : [];
  const ours = ourPlayers.filter((p) => unit === "todos" || clubUnitOf(p) === unit);
  if (ours.length > oursInLeague.length) byClub.set(ourName, ours);
  const clubs = [...byClub.entries()].filter(([, ps]) => ps.length >= minPlayers);
  const keys = ATTRIBUTES.filter((a) => (unit === "gk" ? a.group !== "tecnico" : a.group !== "portero")).map((a) => a.key);
  return keys.map((key) => {
    const means = clubs.map(([club, ps]) => {
      const v = ps.map((p) => p.attrs[key]?.value).filter((x): x is number => x != null);
      return { club, value: v.length ? v.reduce((s, x) => s + x, 0) / v.length : null };
    }).filter((m): m is { club: string; value: number } => m.value != null).sort((a, b) => b.value - a.value);
    const idx = means.findIndex((m) => m.club === ourName);
    return {
      key,
      ours: idx >= 0 ? means[idx].value : null,
      rank: idx >= 0 ? idx + 1 : null,
      clubs: means.length,
      best: means[0] ?? null,
      worst: means[means.length - 1] ?? null,
      leagueMean: means.length ? means.reduce((s, m) => s + m.value, 0) / means.length : null,
    };
  });
}

/** Clubes con datos suficientes en la liga importada. */
export function leagueClubs(league: Player[], minPlayers = 11): string[] {
  const n = new Map<string, number>();
  for (const p of league) if (p.club) n.set(p.club, (n.get(p.club) ?? 0) + 1);
  return [...n.entries()].filter(([, c]) => c >= minPlayers).map(([c]) => c).sort();
}
