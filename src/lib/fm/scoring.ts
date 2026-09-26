/**
 * Puntuación de jugadores por rol (0-100).
 *
 * score = Σ w_i · v_i / (20 · Σ w_i) · 100
 *
 * donde w_i combina:
 *   - peso por rol: clave (verde) ×KEY_W, preferible (azul) ×PREF_W; los
 *     «además vigilamos» (watch) cuentan como preferibles
 *   - peso "meta": atributos que pesan en el motor de partidos con
 *     independencia del rol (velocidad, aceleración, agilidad, salto…),
 *     siguiendo el consenso de la comunidad.
 *
 * Los atributos ausentes no cuentan ni en numerador ni en denominador, y se
 * devuelve `coverage` para saber cuánta información había. Para jugadores con
 * atributos en rango (ojeados) se devuelve también el mínimo y el máximo.
 */

import type { AttrKey } from "./attributes";
import { ROLES, type RoleDef } from "./roles";
import type { Player, PositionSlot } from "./types";

export interface ScoringConfig {
  keyWeight: number;
  prefWeight: number;
  /** Pesos meta por atributo (se suman al peso del rol). */
  meta: Partial<Record<AttrKey, number>>;
  metaGk: Partial<Record<AttrKey, number>>;
}

export const DEFAULT_SCORING: ScoringConfig = {
  keyWeight: 3,
  prefWeight: 1.5,
  // Velocidad/aceleración dominan el motor; Anticipación, Decisiones, Serenidad,
  // Concentración y Determinación importan en todas las posiciones (Passion4FM).
  meta: {
    Pac: 1.5, Acc: 1.5,
    Ant: 0.8, Dec: 0.8, Cmp: 0.5, Cnt: 0.6, Det: 0.4,
    Agi: 0.6, Bal: 0.6, Jum: 0.6, Str: 0.4, Sta: 0.4, Wor: 0.4, Tea: 0.2,
    Dri: 0.3, Fin: 0.3, Pas: 0.3,
  },
  metaGk: {
    Agi: 1.2, Ref: 1.0, Aer: 0.6, Acc: 0.4, Pac: 0.4, Ant: 0.6, Dec: 0.5, Cnt: 0.5, Cmp: 0.4, Jum: 0.4, Det: 0.3,
  },
};

export interface RoleScore {
  roleId: string;
  score: number;
  min: number;
  max: number;
  /** Fracción de peso total que estaba disponible en los datos. */
  coverage: number;
  /** El jugador tiene la posición del rol entre sus posiciones. */
  familiar: boolean;
}

function weightsFor(role: RoleDef, cfg: ScoringConfig): Map<AttrKey, number> {
  const w = new Map<AttrKey, number>();
  const isGk = role.positions.includes("GK");
  const meta = isGk ? cfg.metaGk : cfg.meta;
  for (const [k, v] of Object.entries(meta) as [AttrKey, number][]) w.set(k, v);
  for (const k of role.key) w.set(k, (w.get(k) ?? 0) + cfg.keyWeight);
  for (const k of [...role.pref, ...role.watch]) w.set(k, (w.get(k) ?? 0) + cfg.prefWeight);
  return w;
}

const weightCache = new WeakMap<ScoringConfig, Map<string, Map<AttrKey, number>>>();

function cachedWeights(role: RoleDef, cfg: ScoringConfig): Map<AttrKey, number> {
  let byRole = weightCache.get(cfg);
  if (!byRole) {
    byRole = new Map();
    weightCache.set(cfg, byRole);
  }
  let w = byRole.get(role.id);
  if (!w) {
    w = weightsFor(role, cfg);
    byRole.set(role.id, w);
  }
  return w;
}

export function scoreRole(player: Player, role: RoleDef, cfg: ScoringConfig = DEFAULT_SCORING): RoleScore {
  const w = cachedWeights(role, cfg);
  let num = 0, numMin = 0, numMax = 0, den = 0, totalW = 0;
  for (const [k, weight] of w) {
    totalW += weight;
    const a = player.attrs[k];
    if (!a) continue;
    den += weight;
    num += weight * a.value;
    numMin += weight * a.min;
    numMax += weight * a.max;
  }
  const scale = den > 0 ? 100 / (20 * den) : 0;
  const familiar = role.positions.some((p) => player.position.slots.includes(p));
  return {
    roleId: role.id,
    score: num * scale,
    min: numMin * scale,
    max: numMax * scale,
    coverage: totalW > 0 ? den / totalW : 0,
    familiar,
  };
}

export function scoreAllRoles(player: Player, cfg: ScoringConfig = DEFAULT_SCORING): RoleScore[] {
  const gkRoles = ROLES.filter((r) => r.positions.includes("GK"));
  const outfield = ROLES.filter((r) => !r.positions.includes("GK"));
  const pool = player.isGoalkeeper ? gkRoles : outfield;
  return pool.map((r) => scoreRole(player, r, cfg)).sort((a, b) => b.score - a.score);
}

/** Mejores roles del jugador, priorizando los de posiciones que domina. */
export function bestRoles(player: Player, n = 3, cfg: ScoringConfig = DEFAULT_SCORING): RoleScore[] {
  const all = scoreAllRoles(player, cfg);
  const familiar = all.filter((s) => s.familiar);
  return (familiar.length ? familiar : all).slice(0, n);
}

/** Puntuación de un jugador en una posición: el mejor rol disponible en esa posición. */
export function bestRoleAt(player: Player, slot: PositionSlot, cfg: ScoringConfig = DEFAULT_SCORING): RoleScore | null {
  const roles = ROLES.filter((r) => r.positions.includes(slot));
  let best: RoleScore | null = null;
  for (const r of roles) {
    const s = scoreRole(player, r, cfg);
    if (!best || s.score > best.score) best = s;
  }
  return best;
}

/** Color semántico para una puntuación 0-100. */
export function scoreTone(score: number): "elite" | "good" | "ok" | "poor" {
  if (score >= 75) return "elite";
  if (score >= 62) return "good";
  if (score >= 50) return "ok";
  return "poor";
}
