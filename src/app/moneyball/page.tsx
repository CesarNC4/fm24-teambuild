"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { BAND_TEXT, MetricChip, PerfBadge } from "@/components/Perf";
import { roleFunctions } from "@/lib/fm/balance";
import { buildLeagueStats } from "@/lib/fm/league";
import { DUTY_LABEL } from "@/lib/fm/roles";
import { fmtMoney } from "@/lib/fm/scouting";
import {
  BAND_LABEL, LEAGUE_CUTS, MIN_LEAGUE_SAMPLE, PROFILES, PROFILE_LABEL, attrVsPerf, evaluatePerf, findBargains, functionChecks,
  pastSeasons, profileForPlayer, searchFilters, seasons, statName, type Band, type StatProfile,
} from "@/lib/fm/stats";
import { buildLineup } from "@/lib/fm/tactics";
import { useAppStore } from "@/lib/store";
import { useLeague } from "@/lib/useLeague";
import { statsCoverageText, useStats } from "@/lib/useStats";

export default function MoneyballPage() {
  const players = useAppStore((s) => s.players);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const squads = useAppStore((s) => s.squads);
  const store = useAppStore((s) => s.stats);
  const playerTraits = useAppStore((s) => s.playerTraits);
  const targets = useAppStore((s) => s.targets);
  const setTarget = useAppStore((s) => s.setTarget);

  const allSeasons = useMemo(() => seasons(store), [store]);
  const [season, setSeason] = useState<string | null>(null);
  const ctx = useStats(season);
  const [open, setOpen] = useState<string | null>(null);
  const [profileFilter, setProfileFilter] = useState<StatProfile | "todos">("todos");
  const [maxValue, setMaxValue] = useState<number | "">("");
  const [maxAge, setMaxAge] = useState<number | "">("");
  const [minBand, setMinBand] = useState<Band>(3);

  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const lineup = useMemo(() => (tactic && firstTeam.length ? buildLineup(tactic, firstTeam) : null), [tactic, firstTeam]);
  const byUid = useMemo(() => new Map(Object.values(players).flat().map((p) => [p.uid, p])), [players]);
  const leaguePool = useLeague();
  const attrLeague = useMemo(() => (leaguePool.players.length >= 50 ? buildLeagueStats(leaguePool.players) : null), [leaguePool.players]);

  const own = useMemo(() => new Set(firstTeam.map((p) => p.uid)), [firstTeam]);
  const squadRows = useMemo(() => firstTeam.map((p) => {
    const rec = ctx.records.get(p.uid);
    const slot = lineup?.slots.find((s) => s.starter?.player.uid === p.uid) ?? null;
    const profile = profileForPlayer(p.uid, p, rec, lineup);
    const perf = rec ? evaluatePerf(rec, profile, ctx.league) : null;
    const fns = slot && rec ? functionChecks(roleFunctions(slot.role, slot.slot.slot, playerTraits[p.uid] ?? []).fns, rec, profile, ctx.league) : [];
    return { p, rec, slot, profile, perf, fns, vs: perf ? attrVsPerf(perf, p, attrLeague) : null, past: pastSeasons(store, p.uid, ctx.season) };
  }).sort((a, b) => Number(!!b.slot) - Number(!!a.slot) || (b.rec?.minutes ?? 0) - (a.rec?.minutes ?? 0)), [firstTeam, ctx, lineup, playerTraits, attrLeague, store]);

  const bargains = useMemo(() => findBargains(ctx, squads, own, byUid, minBand)
    .filter((b) => (profileFilter === "todos" || b.perf.profile === profileFilter)
      && (maxValue === "" || (b.value ?? 0) <= maxValue)
      && (maxAge === "" || (b.rec.age ?? byUid.get(b.rec.uid)?.age ?? 99) <= maxAge)), [ctx, squads, own, byUid, minBand, profileFilter, maxValue, maxAge]);

  if (hydrated && firstTeam.length === 0 && allSeasons.length === 0) {
    return <div className="text-sm text-muted">No hay nada importado. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> y después su vista de estadísticas.</div>;
  }

  const withStats = squadRows.filter((r) => r.rec);
  const judged = withStats.filter((r) => r.perf && r.perf.sample !== "insuficiente");
  const track = (uid: string) => {
    const r = ctx.records.get(uid)!;
    const p = byUid.get(uid);
    setTarget(uid, { status: "seguir", note: "Moneyball", addedAt: new Date().toISOString(), snapshot: { name: statName(r, byUid), club: r.club, value: r.value ?? p?.value ?? null, wage: r.wage ?? p?.wage ?? null, contractExpiry: p?.contractExpiry ?? null, age: r.age } });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Moneyball</h1>
        <span className="text-xs text-muted">{statsCoverageText(ctx)}</span>
        {allSeasons.length > 1 && (
          <label className="text-xs flex items-center gap-1 ml-auto">
            temporada
            <select className="bg-surface border border-border rounded px-1 py-0.5" value={ctx.season ?? ""} onChange={(e) => setSeason(e.target.value)}>
              {allSeasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-muted max-w-4xl">
        Los atributos dicen lo que un jugador debería hacer; las estadísticas, lo que hace. Cada jugador se juzga por 90 minutos con las estadísticas de su perfil (el de su rol si es titular).
        Colores relativos a tu liga: <span className={BAND_TEXT[4]}>celeste</span> el {100 - LEAGUE_CUTS[0]} % mejor, <span className={BAND_TEXT[3]}>verde</span> el {100 - LEAGUE_CUTS[1]} %, <span className={BAND_TEXT[2]}>amarillo</span> lo normal, <span className={BAND_TEXT[1]}>naranja</span> lo bajo y <span className={BAND_TEXT[0]}>rojo</span> lo crítico.
        Con menos de {MIN_LEAGUE_SAMPLE} jugadores del perfil con muestra firme en la liga, se usan los umbrales del Excel (son de otra liga: tómalos con cuidado).
        Muestra provisional desde 450 minutos; firme desde 900 o 10 titularidades.
      </p>

      {allSeasons.length === 0 && (
        <section className="bg-surface border border-border rounded-lg p-3 text-sm space-y-1">
          <h2 className="font-semibold">Sin estadísticas todavía</h2>
          <p className="text-muted">En el juego, abre tu plantilla con la vista Moneyball, expórtala (Ctrl+P → Página web) e impórtala en <Link href="/" className="underline">Importar</Link> como «Primer equipo»: se reconoce sola y no toca los atributos. Haz lo mismo con los ojeados y con cada rival de liga, para que la liga tenga con quién compararse. Hasta mitad de temporada casi todo sale «muestra insuficiente».</p>
        </section>
      )}

      {allSeasons.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-sm">Tu plantilla <span className="text-muted font-normal">· {judged.length} con muestra de {firstTeam.length}{tactic ? ` · perfiles por el XI de ${tactic.name}` : ""}</span></h2>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead><tr><th>Jugador</th><th>Perfil</th><th className="num">Min</th><th>Rendimiento</th><th>Lo mejor</th><th>Lo peor</th><th>¿Cumple su rol?</th><th>Frente a sus atributos</th><th>Temporadas anteriores</th></tr></thead>
              <tbody>
                {squadRows.map((r) => (
                  <Fragment key={r.p.uid}>
                    <tr className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(open === r.p.uid ? null : r.p.uid)}>
                      <td className="whitespace-nowrap">{r.p.name}{r.slot && <span className="text-muted text-[10px]"> · {r.slot.slot.id}</span>}</td>
                      <td className="text-xs whitespace-nowrap">{r.slot ? `${r.slot.role.es} (${DUTY_LABEL[r.slot.role.duty]})` : PROFILE_LABEL[r.profile]}{r.slot && <div className="text-muted text-[10px]">{PROFILE_LABEL[r.profile]}</div>}</td>
                      <td className="num">{r.rec?.minutes ?? "–"}</td>
                      <td className="text-xs">{r.rec ? <PerfBadge perf={r.perf} /> : <span className="text-muted">sin estadísticas</span>}</td>
                      <td className="text-xs">{r.perf?.strengths.map((m) => <div key={m.key}><MetricChip m={m} /></div>)}</td>
                      <td className="text-xs">{r.perf?.weaknesses.map((m) => <div key={m.key}><MetricChip m={m} /></div>)}</td>
                      <td className="text-xs">{r.fns.length ? (r.fns.every((f) => f.ok) ? <span className="text-attr-good">sí</span> : <span className="text-attr-low">{r.fns.filter((f) => !f.ok).length} de {r.fns.length} funciones no</span>) : <span className="text-muted">–</span>}</td>
                      <td className="text-xs">{r.vs ? <span className={r.vs.diff >= 25 ? "text-attr-good" : r.vs.diff <= -25 ? "text-attr-low" : "text-muted"}>{r.vs.diff >= 25 ? "por encima" : r.vs.diff <= -25 ? "por debajo" : "acorde"} ({r.vs.diff > 0 ? "+" : ""}{r.vs.diff})</span> : <span className="text-muted">–</span>}</td>
                      <td className="text-xs">{r.past.length ? r.past.map((x) => { const e = evaluatePerf(x, r.profile, null); return <div key={x.season}>{x.season}: {x.minutes}&apos; {e.band != null ? <span className={BAND_TEXT[e.band]}>{BAND_LABEL[e.band]}</span> : "–"}</div>; }) : <span className="text-muted">–</span>}</td>
                    </tr>
                    {open === r.p.uid && r.perf && (
                      <tr>
                        <td colSpan={9} className="bg-surface-2/50">
                          <div className="p-2 space-y-2 text-xs">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">{r.perf.metrics.map((m) => <MetricChip key={m.key} m={m} dim={m.weight === 0} />)}</div>
                            {r.fns.map((f) => <p key={f.fn} className={f.ok ? "text-attr-good" : "text-attr-low"}>{f.ok ? "✓" : "✗"} {f.text}</p>)}
                            {r.vs && <p className="text-muted">{r.vs.text}</p>}
                            {r.perf.metrics.filter((m) => m.note && m.weight > 0).map((m) => <p key={m.key} className="text-muted">{m.label}: {m.note}</p>)}
                            {r.past.length > 0 && (
                              <table className="tbl">
                                <thead><tr><th>Temporada</th><th className="num">Min</th>{r.perf.metrics.filter((m) => m.weight >= 1).map((m) => <th key={m.key} className="num">{m.label}</th>)}</tr></thead>
                                <tbody>
                                  {[r.rec!, ...r.past].map((x) => (
                                    <tr key={x.season}><td>{x.season}</td><td className="num">{x.minutes}</td>{r.perf!.metrics.filter((m) => m.weight >= 1).map((m) => <td key={m.key} className="num">{x.values[m.key] ?? "–"}</td>)}</tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted">Pulsa un jugador para ver todas sus estadísticas. «¿Cumple su rol?» cruza las funciones del rol (crear, dar amplitud, conducir, recuperar…) con las estadísticas que las prueban. «Frente a sus atributos» compara el percentil de rendimiento con el de nivel por atributos en la liga: por encima, atributos ocultos o el motor le favorece (un Söyüncü, un Maeda); por debajo, mira las repeticiones antes de condenarle.</p>
        </section>
      )}

      {allSeasons.length > 0 && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-sm">Cazador de gangas <span className="text-muted font-normal">· {bargains.length}</span></h2>
            <select className="text-xs bg-surface border border-border rounded px-1 py-0.5" value={profileFilter} onChange={(e) => setProfileFilter(e.target.value as StatProfile | "todos")}>
              <option value="todos">Todos los perfiles</option>
              {PROFILES.map((p) => <option key={p} value={p}>{PROFILE_LABEL[p]}</option>)}
            </select>
            <select className="text-xs bg-surface border border-border rounded px-1 py-0.5" value={minBand} onChange={(e) => setMinBand(Number(e.target.value) as Band)}>
              <option value={4}>solo celeste</option>
              <option value={3}>verde o mejor</option>
              <option value={2}>amarillo o mejor</option>
            </select>
            <label className="text-xs">valor máx. <input className="bg-surface border border-border rounded px-1 w-24" value={maxValue} onChange={(e) => setMaxValue(e.target.value ? Number(e.target.value) : "")} placeholder="—" /></label>
            <label className="text-xs">edad máx. <input className="bg-surface border border-border rounded px-1 w-12" value={maxAge} onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : "")} placeholder="—" /></label>
          </div>
          {bargains.length === 0 && <p className="text-xs text-muted">Nadie de fuera rinde a ese nivel con muestra suficiente. Importa la vista de estadísticas de los ojeados y de los rivales de liga; a mitad de temporada ya hay datos.</p>}
          {bargains.length > 0 && (
            <div className="overflow-auto border border-border rounded-md">
              <table className="tbl w-full">
                <thead><tr><th>Jugador</th><th>Club</th><th className="num">Edad</th><th>Perfil</th><th className="num">Min</th><th>Rendimiento</th><th>Lo mejor</th><th className="num">Valor</th><th className="num">Sueldo</th><th>Liga</th><th></th></tr></thead>
                <tbody>
                  {bargains.slice(0, 60).map((b) => (
                    <tr key={b.rec.uid}>
                      <td className="whitespace-nowrap">{statName(b.rec, byUid)}</td>
                      <td className="text-xs">{b.rec.club ?? byUid.get(b.rec.uid)?.club ?? "–"}</td>
                      <td className="num">{b.rec.age ?? "–"}</td>
                      <td className="text-xs">{PROFILE_LABEL[b.perf.profile]}</td>
                      <td className="num">{b.rec.minutes}</td>
                      <td className="text-xs"><PerfBadge perf={b.perf} /></td>
                      <td className="text-xs">{b.perf.strengths.map((m) => <div key={m.key}><MetricChip m={m} /></div>)}</td>
                      <td className="num">{b.value != null ? fmtMoney(b.value) : "–"}</td>
                      <td className="num">{b.wage != null ? fmtMoney(b.wage) : "–"}</td>
                      <td className="text-xs">{b.sameLeague ? <span className="text-attr-good">tu liga</span> : <span className="text-attr-mid" title="Las estadísticas de una liga mucho más baja engañan: busca la misma liga o un escalón arriba o abajo.">comprueba su liga</span>}</td>
                      <td className="text-xs">{targets[b.rec.uid] ? <span className="text-muted">en seguimiento</span> : <button className="text-accent hover:underline" onClick={() => track(b.rec.uid)}>seguir</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-muted">Rinden en verde o celeste en su perfil, del más barato al más caro. Antes de ofertar, valida con el informe del ojeador (atributos, personalidad, precio) y fíjate en que venga de tu liga o de una parecida. «Seguir» lo pasa al seguimiento de Ojeados.</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Filtros para la búsqueda del juego</h2>
        <p className="text-xs text-muted">Para la pantalla de búsqueda (o los detalles de un foco de contratación): reputación mundial «Buena» o «Aceptable» para quitar ligas amateurs, sin filtro de interés de traspaso al principio, y las estadísticas clave del perfil en verde de tu liga{Object.values(ctx.league.count).some((n) => n >= MIN_LEAGUE_SAMPLE) ? "" : " (ahora, umbrales del Excel)"}. Guarda la vista con estas columnas para cada ventana.</p>
        <div className="grid md:grid-cols-3 gap-2">
          {PROFILES.map((p) => (
            <div key={p} className="bg-surface border border-border rounded-md p-2 text-xs">
              <div className="font-medium">{PROFILE_LABEL[p]} <span className="text-muted font-normal">· {ctx.league.count[p]} en la liga</span></div>
              <ul className="list-disc pl-4 text-muted">{searchFilters(p, ctx.league).map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted">Del informe: delantero con sobrerendimiento de xG de 5 o más (10 es la élite mundial); delantero de área con 2-4 cabezazos ganados por 90; extremo desde 0,3 xA/90 (0,2 para ampliar); organizador con 2 pases clave por 90; calificación media por encima de 7,5 con precio bajo.</p>
      </section>
    </div>
  );
}
