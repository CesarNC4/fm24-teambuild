"use client";

import { useMemo } from "react";
import { buildStatsContext, type StatsContext } from "./fm/stats";
import { useAppStore } from "./store";

/** Estadísticas de la temporada (la última importada si no se elige) y los cortes de la liga. */
export function useStats(season: string | null = null): StatsContext {
  const stats = useAppStore((s) => s.stats);
  const squads = useAppStore((s) => s.squads);
  return useMemo(() => buildStatsContext(stats, squads, season), [stats, squads, season]);
}

/** «liga: 64 jugadores con muestra firme» o por qué se usan los umbrales del Excel. */
export function statsCoverageText(ctx: StatsContext): string {
  const firm = Object.values(ctx.league.count).reduce((a, b) => a + b, 0) - ctx.league.count.area;
  if (!ctx.season) return "sin estadísticas importadas";
  return firm ? `temporada ${ctx.season} · liga: ${firm} jugadores con muestra firme` : `temporada ${ctx.season} · sin muestra de liga todavía: umbrales del Excel`;
}
