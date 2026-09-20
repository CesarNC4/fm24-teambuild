/**
 * Encaje de los estilos de juego con la plantilla: atributos clave por
 * unidad, formaciones recomendadas, roles que le sientan bien o mal a cada
 * estilo, y qué falta para «evolucionar» a él (roles-firma, atributos por
 * línea, polivalencia).
 */

import { STYLE_PRESETS, type EvolutionReq, type StylePreset } from "./stylePresets";
import type { LineupResult } from "./tactics";
import type { Player, PositionSlot } from "./types";

type Unit = "def" | "mid" | "att";

function unitOfSlot(slot: PositionSlot): Unit | null {
  if (slot === "GK") return null;
  if (slot.startsWith("D") && !slot.startsWith("DM")) return "def";
  if (slot.startsWith("WB")) return "def";
  if (slot.startsWith("DM") || slot.startsWith("M")) return "mid";
  return "att";
}

function meanAttrs(players: Player[], keys: readonly string[]): number | null {
  const vals: number[] = [];
  for (const p of players) for (const k of keys) {
    const v = p.attrs[k as keyof typeof p.attrs]?.value;
    if (v != null) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export interface StyleFit {
  style: StylePreset;
  /** Media 1-20 de los atributos clave en el XI, por unidad y global. */
  units: Record<Unit, number | null>;
  mean: number | null;
  formationOk: boolean;
  /** Roles del XI que el estilo desaconseja / pide, con el jugador. */
  avoided: { role: string; player: string }[];
  favored: number;
  /** Requisitos de evolución y cuáles fallan. */
  gaps: GapResult[];
  missing: number;
}

export interface GapResult {
  req: EvolutionReq;
  ok: boolean;
  detail: string;
}

/** Comprueba los requisitos de evolución de un estilo contra el XI. */
export function styleGaps(style: StylePreset, lineup: LineupResult): GapResult[] {
  const starters = lineup.slots.filter((s) => s.starter);
  return style.evolution.map((req): GapResult => {
    if (req.kind === "role") {
      const have = starters.filter((s) => req.codes.includes(s.role.code));
      const min = req.min ?? 1;
      return { req, ok: have.length >= min, detail: have.length ? `tienes ${have.length}: ${have.map((s) => `${s.role.es} (${s.starter!.player.name})`).join(", ")}` : "nadie en el XI con ese rol" };
    }
    if (req.kind === "versatile") {
      const poly = starters.filter((s) => s.slot.slot !== "GK" && s.starter!.player.position.slots.length >= 2);
      return { req, ok: poly.length >= req.min, detail: `${poly.length} con dos o más posiciones${poly.length ? `: ${poly.map((s) => s.starter!.player.name).join(", ")}` : ""}` };
    }
    const pool = starters.filter((s) => req.positions === "xi" ? true : req.positions === "campo" ? s.slot.slot !== "GK" : req.positions.includes(s.slot.slot));
    if (pool.length === 0) return { req, ok: false, detail: "ningún titular en esas posiciones" };
    const each = pool.map((s) => ({ name: s.starter!.player.name, mean: meanAttrs([s.starter!.player], req.attrs) ?? 0 })).sort((a, b) => a.mean - b.mean);
    if (req.count) {
      const okOnes = each.filter((e) => e.mean >= req.min);
      return { req, ok: okOnes.length >= req.count, detail: okOnes.length ? `${okOnes.map((e) => `${e.name} ${e.mean.toFixed(1)}`).join(", ")}` : `el mejor es ${each[each.length - 1].name} con ${each[each.length - 1].mean.toFixed(1)}` };
    }
    const mean = each.reduce((a, e) => a + e.mean, 0) / each.length;
    return { req, ok: mean >= req.min, detail: `media ${mean.toFixed(1)}${mean < req.min ? ` (peor: ${each.slice(0, 2).map((e) => `${e.name} ${e.mean.toFixed(1)}`).join(", ")})` : ""}` };
  });
}

export function styleFit(style: StylePreset, lineup: LineupResult): StyleFit {
  const byUnit: Record<Unit, Player[]> = { def: [], mid: [], att: [] };
  const avoided: StyleFit["avoided"] = [];
  let favored = 0;
  for (const s of lineup.slots) {
    if (!s.starter) continue;
    const u = unitOfSlot(s.slot.slot);
    if (u) byUnit[u].push(s.starter.player);
    if (style.roles.avoid.includes(s.role.code)) avoided.push({ role: s.role.es, player: s.starter.player.name });
    if (style.roles.favor.includes(s.role.code)) favored++;
  }
  const units: StyleFit["units"] = {
    def: meanAttrs(byUnit.def, style.attrs.def),
    mid: meanAttrs(byUnit.mid, style.attrs.mid),
    att: meanAttrs(byUnit.att, style.attrs.att),
  };
  const present = Object.values(units).filter((v): v is number => v != null);
  const gaps = styleGaps(style, lineup);
  return {
    style,
    units,
    mean: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null,
    formationOk: style.formations.includes(lineup.formation.id),
    avoided,
    favored,
    gaps,
    missing: gaps.filter((g) => !g.ok).length,
  };
}

/** Todos los estilos ordenados por encaje de atributos con el XI actual. */
export function rankStyles(lineup: LineupResult): StyleFit[] {
  return STYLE_PRESETS.map((s) => styleFit(s, lineup)).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
}

export const UNIT_SHORT: Record<Unit, string> = { def: "Def", mid: "Med", att: "Ata" };
