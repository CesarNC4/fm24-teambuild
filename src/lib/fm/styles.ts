/**
 * Encaje de los estilos de juego con la plantilla (guía de estilos tácticos de
 * Passion4FM): atributos clave por unidad, formaciones recomendadas y roles
 * que le sientan bien o mal a cada estilo.
 */

import { STYLE_PRESETS, type StylePreset } from "./instructions";
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
  return {
    style,
    units,
    mean: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null,
    formationOk: style.formations.includes(lineup.formation.id),
    avoided,
    favored,
  };
}

/** Todos los estilos ordenados por encaje de atributos con el XI actual. */
export function rankStyles(lineup: LineupResult): StyleFit[] {
  return STYLE_PRESETS.map((s) => styleFit(s, lineup)).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
}

export const UNIT_SHORT: Record<Unit, string> = { def: "Def", mid: "Med", att: "Ata" };
