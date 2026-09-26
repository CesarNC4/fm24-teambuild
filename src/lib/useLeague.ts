"use client";

import { useMemo } from "react";
import { buildLeaguePool, type LeaguePool } from "./fm/league";
import { useAppStore } from "./store";

/** Liga calculada: primer equipo + rivales marcados como Liga + búsqueda de liga, sin duplicados. */
export function useLeague(): LeaguePool & { size: number } {
  const squads = useAppStore((s) => s.squads);
  const players = useAppStore((s) => s.players);
  const imports = useAppStore((s) => s.imports);
  const clubName = useAppStore((s) => s.clubName);
  const size = useAppStore((s) => s.leagueSize);
  const pool = useMemo(() => buildLeaguePool({ squads, players, imports, clubName }), [squads, players, imports, clubName]);
  return { ...pool, size };
}

/** Texto corto de cobertura: «liga construida con 14 de 20 clubes». */
export function coverageText(pool: LeaguePool & { size: number }): string {
  const own = pool.clubs.filter((c) => c.from !== "busqueda").length;
  const search = pool.clubs.length - own;
  return `liga construida con ${pool.clubs.length} de ${pool.size} clubes (${own} con su propia exportación${search ? `, ${search} solo de la búsqueda` : ""}; ${pool.players.length} jugadores)`;
}
