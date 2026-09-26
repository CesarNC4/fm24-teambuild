"use client";

import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { CLUB_UNIT_LABEL, clubComparison, leagueClubs, type ClubUnit } from "@/lib/fm/league";
import { useAppStore } from "@/lib/store";
import { useLeague } from "@/lib/useLeague";

/** Media por club de cada atributo en una unidad, con tu puesto en la liga (pantalla «Comparación» del juego). */
export function ClubComparison() {
  const players = useAppStore((s) => s.players);
  const clubName = useAppStore((s) => s.clubName);
  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const leaguePlayers = useLeague().players;
  const clubs = useMemo(() => leagueClubs(leaguePlayers), [leaguePlayers]);
  const [unit, setUnit] = useState<ClubUnit>("todos");
  const enough = leaguePlayers.length >= 50 && clubs.length >= 6;
  const rows = useMemo(() => (enough ? clubComparison(leaguePlayers, clubName, firstTeam, unit) : []), [enough, leaguePlayers, clubName, firstTeam, unit]);

  if (leaguePlayers.length < 50) return null;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-sm">Comparación de equipos <span className="text-muted font-normal">({clubs.length} clubes con ≥11 jugadores)</span></h2>
        {(Object.keys(CLUB_UNIT_LABEL) as ClubUnit[]).map((u) => (
          <button key={u} className={`text-xs px-2 py-0.5 rounded border ${unit === u ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`} onClick={() => setUnit(u)}>{CLUB_UNIT_LABEL[u]}</button>
        ))}
      </div>
      {!enough && <p className="text-xs text-muted">Hacen falta al menos 6 clubes con 11 o más jugadores en la liga. Ahora mismo: {clubs.length}. Cada rival que importes como «Liga» suma su club; la búsqueda de liga completa el resto.</p>}
      {rows.length > 0 && (
        <div className="overflow-auto border border-border rounded-md">
          <table className="tbl w-full">
            <thead><tr><th>Atributo</th><th className="num">{clubName ?? "Nosotros"}</th><th className="num">Puesto</th><th className="num">Media liga</th><th>Mejor</th><th>Peor</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{ATTR_BY_KEY[r.key].es} <span className="text-muted text-[10px]">{r.key}</span></td>
                  <td className="num font-medium">{r.ours?.toFixed(2) ?? "–"}</td>
                  <td className={`num ${r.rank == null ? "text-muted" : r.rank <= 3 ? "text-attr-elite" : r.rank <= Math.ceil(r.clubs / 3) ? "text-attr-good" : r.rank > r.clubs - Math.ceil(r.clubs / 4) ? "text-attr-low" : ""}`}>{r.rank != null ? `${r.rank}º / ${r.clubs}` : "–"}</td>
                  <td className="num text-muted">{r.leagueMean?.toFixed(2) ?? "–"}</td>
                  <td className="text-xs whitespace-nowrap">{r.best ? `${r.best.value.toFixed(2)} ${r.best.club}` : "–"}</td>
                  <td className="text-xs whitespace-nowrap text-muted">{r.worst ? `${r.worst.value.toFixed(2)} ${r.worst.club}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">Misma idea que la pantalla «Comparación» del juego (media por club de cada atributo en la unidad), pero con puesto exacto y quién es el mejor y el peor. Si tu club no viene completo en la liga, se usa tu plantilla importada.</p>
    </section>
  );
}
