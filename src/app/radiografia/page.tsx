"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FAMILY_LABEL, buildLeagueStats } from "@/lib/fm/league";
import { UNIT_LABEL, ageProfile, contractTimeline, leagueComparison, radiographyWarnings, unitProfiles, wageSummary } from "@/lib/fm/radiography";
import { fmtMoney, overpaidPlayers } from "@/lib/fm/scouting";
import { buildLineup } from "@/lib/fm/tactics";
import { estimateGameYear } from "@/lib/fm/youth";
import { useAppStore } from "@/lib/store";

function tone(v: number | null): string {
  if (v == null) return "text-muted";
  if (v >= 15) return "text-attr-elite";
  if (v >= 13.5) return "text-attr-good";
  if (v >= 12) return "";
  return "text-attr-low";
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className="h-1.5 rounded bg-surface-2 overflow-hidden">
      <div className={`h-full ${className ?? "bg-accent"}`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

export default function RadiographyPage() {
  const players = useAppStore((s) => s.players);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);

  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const leaguePlayers = useMemo(() => players.liga ?? [], [players.liga]);
  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const lineup = useMemo(() => (tactic && firstTeam.length ? buildLineup(tactic, firstTeam) : null), [tactic, firstTeam]);
  const league = useMemo(() => (leaguePlayers.length >= 50 ? buildLeagueStats(leaguePlayers) : null), [leaguePlayers]);
  const gameYear = useMemo(() => estimateGameYear(firstTeam), [firstTeam]);

  const units = useMemo(() => unitProfiles(firstTeam, lineup, league), [firstTeam, lineup, league]);
  const ages = useMemo(() => ageProfile(firstTeam, lineup), [firstTeam, lineup]);
  const contracts = useMemo(() => contractTimeline(firstTeam, lineup), [firstTeam, lineup]);
  const wages = useMemo(() => wageSummary(firstTeam), [firstTeam]);
  const overpaid = useMemo(() => (lineup ? overpaidPlayers(firstTeam, lineup) : []), [firstTeam, lineup]);
  const leagueCmp = useMemo(() => (league ? leagueComparison(firstTeam, league) : null), [firstTeam, league]);
  const warnings = useMemo(() => radiographyWarnings(units, ages, contracts, gameYear, leagueCmp), [units, ages, contracts, gameYear, leagueCmp]);

  if (hydrated && firstTeam.length === 0) {
    return <div className="text-sm text-muted">No hay plantilla importada. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> primero.</div>;
  }

  const maxWage = wages.byUnit.reduce((m, u) => Math.max(m, u.total), 0);
  const maxContracts = contracts.reduce((m, c) => Math.max(m, c.players.length), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Radiografía</h1>
        <span className="text-xs text-muted">
          XI de {tactic?.name ?? "—"}{gameYear ? ` · temporada ${gameYear - 1}/${String(gameYear).slice(2)}` : ""}
          {league ? ` · liga importada (${league.count} jugadores)` : " · sin liga importada: compara contra ti mismo"}
        </span>
      </div>

      {warnings.length > 0 && (
        <section className="bg-surface border border-border rounded-lg p-3 space-y-1">
          <h2 className="font-semibold text-sm">Avisos</h2>
          {warnings.map((w, i) => <p key={i} className="text-xs">⚠ {w}</p>)}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Unidades: medias de atributos (XI titular / plantilla{league ? " / liga" : ""})</h2>
        <div className="overflow-auto border border-border rounded-md">
          <table className="tbl w-full">
            <thead>
              <tr><th>Unidad</th>{units[0]?.clusters.map((c) => <th key={c.id} className="num">{c.label}</th>)}<th>Más floja</th></tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.unit}>
                  <td className="font-medium whitespace-nowrap" title={u.starters.map((p) => p.name).join(", ")}>{UNIT_LABEL[u.unit]} <span className="text-muted">({u.starters.length})</span></td>
                  {u.clusters.map((c) => (
                    <td key={c.id} className="num whitespace-nowrap">
                      <span className={tone(c.xi)}>{c.xi?.toFixed(1) ?? "–"}</span>
                      <span className="text-muted text-[10px]"> / {c.squad?.toFixed(1) ?? "–"}{c.league != null ? ` / ${c.league.toFixed(1)}` : ""}</span>
                    </td>
                  ))}
                  <td className="text-xs text-attr-mid">{u.weakest ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Primer número: titulares del XI; segundo: toda la plantilla de esa unidad{league ? "; tercero: media de la liga en las familias de esa unidad" : ""}. Verde ≥13,5, rojo &lt;12.</p>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
          <h2 className="font-semibold text-sm">Perfil de edades</h2>
          {ages.map((b) => (
            <div key={b.label} className="text-xs">
              <div className="flex justify-between"><span>{b.label}</span><span className="text-muted">{b.players.length} · {b.players.filter((x) => x.starter).length} titulares</span></div>
              <Bar value={b.players.length} max={Math.max(1, ...ages.map((x) => x.players.length))} />
              <div className="text-muted mt-0.5">{b.players.map((x) => (x.starter ? <b key={x.player.uid}>{x.player.name}, </b> : <span key={x.player.uid}>{x.player.name}, </span>))}</div>
            </div>
          ))}
        </section>

        <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
          <h2 className="font-semibold text-sm">Vencimientos de contrato</h2>
          {contracts.map((c) => (
            <div key={c.year} className="text-xs">
              <div className="flex justify-between">
                <span className={gameYear != null && c.year <= gameYear ? "text-attr-low font-medium" : gameYear != null && c.year === gameYear + 1 ? "text-attr-mid" : ""}>{c.year}</span>
                <span className="text-muted">{c.players.length} jugadores · {fmtMoney(c.wage)} en sueldos</span>
              </div>
              <Bar value={c.players.length} max={maxContracts} className={gameYear != null && c.year <= gameYear ? "bg-attr-low" : "bg-accent"} />
              <div className="text-muted mt-0.5">{c.players.map((x) => (x.starter ? <b key={x.player.uid}>{x.player.name}, </b> : <span key={x.player.uid}>{x.player.name}, </span>))}</div>
            </div>
          ))}
        </section>

        <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
          <h2 className="font-semibold text-sm">Masa salarial <span className="text-muted font-normal">total {fmtMoney(wages.total)}</span></h2>
          {wages.byUnit.map((u) => (
            <div key={u.unit} className="text-xs">
              <div className="flex justify-between"><span>{u.label} <span className="text-muted">({u.count})</span></span><span className="text-muted">{fmtMoney(u.total)} · {wages.total ? Math.round((u.total / wages.total) * 100) : 0} %</span></div>
              <Bar value={u.total} max={maxWage} />
            </div>
          ))}
          <div className="text-xs text-muted pt-1">Los 5 más caros: {wages.top.map((p) => `${p.name} ${fmtMoney(p.wage ?? 0)}`).join(" · ")}</div>
          {overpaid.length > 0 && (
            <div className="text-xs pt-1">
              <div className="font-medium">Cobran por encima de lo que aportan</div>
              {overpaid.map((o) => <div key={o.player.uid} className="text-muted">{o.player.name}: {o.wageRank}º sueldo, {o.levelRank}º nivel</div>)}
            </div>
          )}
        </section>

        <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
          <h2 className="font-semibold text-sm">Frente a la liga</h2>
          {!leagueCmp && (
            <p className="text-xs text-muted">
              Exporta una búsqueda de jugadores con todos los de tu liga (mínimo 50) e <Link href="/" className="underline">impórtala como «Liga»</Link>. Entonces verás en qué percentil de la liga está cada puesto, y en Ojeados el percentil de liga de cada candidato.
            </p>
          )}
          {leagueCmp?.map((f) => (
            <div key={f.family} className="text-xs">
              <div className="flex justify-between">
                <span>{FAMILY_LABEL[f.family]}</span>
                <span className={f.meanPercentile == null ? "text-muted" : f.meanPercentile >= 80 ? "text-attr-elite" : f.meanPercentile >= 60 ? "text-attr-good" : f.meanPercentile < 45 ? "text-attr-low" : ""}>percentil medio {f.meanPercentile ?? "–"}</span>
              </div>
              <Bar value={f.meanPercentile ?? 0} max={100} />
              <div className="text-muted mt-0.5">{f.players.map((x) => `${x.player.name} ${x.percentile ?? "–"}`).join(" · ")}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
