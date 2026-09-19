/**
 * Evolución entre exportaciones: cada importación guarda una foto de los
 * atributos por UID para ver quién progresa y quién se estanca (idea de la
 * "Progression" de fm-dash y los gráficos de desarrollo de FM24-Player-Analyzer).
 */

import { ATTRIBUTES, type AttrKey } from "./attributes";
import type { Player } from "./types";

export interface Snapshot {
  /** Fecha de importación (ISO). */
  at: string;
  age: number | null;
  attrs: Partial<Record<AttrKey, number>>;
}

export type History = Record<string, Snapshot[]>;

const MAX_SNAPSHOTS = 24;

/** Devuelve el historial actualizado con una foto nueva de cada jugador (si cambió algo). */
export function appendSnapshots(history: History, players: Player[], at: string): History {
  const out: History = { ...history };
  for (const p of players) {
    const attrs: Snapshot["attrs"] = {};
    for (const a of ATTRIBUTES) {
      const v = p.attrs[a.key];
      if (v && !v.isRange) attrs[a.key] = v.value;
    }
    if (!Object.keys(attrs).length) continue;
    const prev = out[p.uid] ?? [];
    const last = prev[prev.length - 1];
    if (last && sameAttrs(last.attrs, attrs) && last.age === p.age) continue;
    out[p.uid] = [...prev, { at, age: p.age, attrs }].slice(-MAX_SNAPSHOTS);
  }
  return out;
}

function sameAttrs(a: Snapshot["attrs"], b: Snapshot["attrs"]): boolean {
  const ka = Object.keys(a) as AttrKey[];
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

export interface Delta {
  key: AttrKey;
  from: number;
  to: number;
}

export interface Progress {
  from: Snapshot;
  to: Snapshot;
  deltas: Delta[];
  /** Suma neta de puntos de atributo. */
  net: number;
  gained: number;
  lost: number;
  /** Días entre las dos fotos. */
  days: number;
}

/** Cambios entre la foto anterior y la última. null si hay menos de dos fotos. */
export function progressSince(history: History, uid: string, back = 1): Progress | null {
  const h = history[uid];
  if (!h || h.length < 2) return null;
  const to = h[h.length - 1];
  const from = h[Math.max(0, h.length - 1 - back)];
  const deltas: Delta[] = [];
  for (const k of Object.keys(to.attrs) as AttrKey[]) {
    const a = from.attrs[k];
    const b = to.attrs[k];
    if (a != null && b != null && a !== b) deltas.push({ key: k, from: a, to: b });
  }
  deltas.sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from));
  const gained = deltas.filter((d) => d.to > d.from).reduce((s, d) => s + d.to - d.from, 0);
  const lost = deltas.filter((d) => d.to < d.from).reduce((s, d) => s + d.from - d.to, 0);
  const days = Math.round((new Date(to.at).getTime() - new Date(from.at).getTime()) / 86_400_000);
  return { from, to, deltas, net: gained - lost, gained, lost, days };
}

/** Texto corto "+3 Ace, +2 Pas, −1 Sal". */
export function formatDeltas(deltas: Delta[], max = 6): string {
  return deltas.slice(0, max).map((d) => `${d.to > d.from ? "+" : "−"}${Math.abs(d.to - d.from)} ${d.key}`).join(", ") + (deltas.length > max ? ` (+${deltas.length - max})` : "");
}

/** Veredicto de desarrollo para jóvenes (guía: revisar cada 3 meses; sin cambios = intervenir). */
export function developmentVerdict(p: Progress | null, age: number | null): { label: string; tone: "good" | "mid" | "low" | "na" } {
  if (!p) return { label: "sin historial", tone: "na" };
  if (p.days < 30) return { label: `${p.net >= 0 ? "+" : ""}${p.net} en ${p.days} días`, tone: "na" };
  const young = (age ?? 30) <= 23;
  if (p.net >= (young ? 4 : 2)) return { label: `mejora (+${p.net} en ${p.days} d)`, tone: "good" };
  if (p.net <= -3) return { label: `cae (${p.net} en ${p.days} d)`, tone: "low" };
  if (young && p.days >= 75) return { label: `estancado (${p.net >= 0 ? "+" : ""}${p.net} en ${p.days} d): revisa minutos y entrenamiento`, tone: "mid" };
  return { label: `${p.net >= 0 ? "+" : ""}${p.net} en ${p.days} d`, tone: "na" };
}

// ---------------------------------------------------------------------------
// Proyección de objetivos de desarrollo
// ---------------------------------------------------------------------------

export interface AttrProjection {
  key: AttrKey;
  have: number;
  target: number;
  /** Puntos por trimestre observados (null si no hay historial suficiente). */
  ratePerQuarter: number | null;
  /** Meses estimados hasta el objetivo (null si no hay ritmo o ya está). */
  monthsToTarget: number | null;
}

/**
 * Ritmo de mejora de un atributo entre la primera y la última foto (mínimo 30
 * días entre ambas) y meses que faltan para llegar al objetivo a ese ritmo.
 */
export function projectAttr(history: History, uid: string, key: AttrKey, target: number): AttrProjection | null {
  const h = history[uid];
  if (!h?.length) return null;
  const last = h[h.length - 1];
  const have = last.attrs[key];
  if (have == null) return null;
  const first = h.find((s) => s.attrs[key] != null) ?? last;
  const days = (new Date(last.at).getTime() - new Date(first.at).getTime()) / 86_400_000;
  let ratePerQuarter: number | null = null;
  if (days >= 30 && first !== last) ratePerQuarter = ((have - (first.attrs[key] ?? have)) / days) * 90;
  const remaining = target - have;
  let monthsToTarget: number | null = null;
  if (remaining <= 0) monthsToTarget = 0;
  else if (ratePerQuarter != null && ratePerQuarter > 0) monthsToTarget = Math.round((remaining / ratePerQuarter) * 3);
  return { key, have, target, ratePerQuarter, monthsToTarget };
}

/** Meses hasta que el jugador supere la edad máxima de su filial (null si no aplica). */
export function monthsUntilAgeLimit(birthDate: string | null, age: number | null, maxAge: number | null, gameYear: number | null): number | null {
  if (maxAge == null || age == null) return null;
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(birthDate ?? "");
  if (!m || gameYear == null) return Math.max(0, (maxAge + 1 - age) * 12);
  // Cumple maxAge+1 el día de su cumpleaños de ese año; la temporada actual termina el 30/6 de gameYear.
  const limit = new Date(Number(m[3]) + maxAge + 1, Number(m[2]) - 1, Number(m[1]));
  const now = new Date(gameYear, 0, 1);
  return Math.max(0, Math.round((limit.getTime() - now.getTime()) / (30.4 * 86_400_000)));
}
