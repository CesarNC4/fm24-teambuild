"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ScoreBadge } from "@/components/AttrCell";
import { FAMILY_LABEL, buildLeagueStats } from "@/lib/fm/league";
import {
  ACTION_LABEL, DEFAULT_HORIZON_OPTIONS, HORIZONS, HORIZON_LABEL, expiryYear, leagueComparison, squadActions, squadState, styleReadiness, wageSummary,
  type Horizon, type HorizonOptions, type SlotState, type SquadAction,
} from "@/lib/fm/radiography";
import { DUTY_LABEL, POSITION_LABEL } from "@/lib/fm/roles";
import { NEED_LABEL, VERDICT_LABEL, evaluateAll, fmtMoney, overpaidPlayers } from "@/lib/fm/scouting";
import { youthSquadIds, type DepthTone } from "@/lib/fm/tactics";
import { estimateGameYear } from "@/lib/fm/youth";
import { useAppStore } from "@/lib/store";
import { coverageText, useLeague } from "@/lib/useLeague";
import { BAND_BORDER, BAND_TEXT, MetricChip, PerfBadge } from "@/components/Perf";
import { roleFunctions } from "@/lib/fm/balance";
import { VERDICT_WORD, evaluatePerf, functionChecks, profileOfRole, type FunctionCheck, type PerfEval } from "@/lib/fm/stats";
import { statsCoverageText, useStats } from "@/lib/useStats";

type Mode = "profundidad" | "estilo" | "liga" | "rendimiento" | "sueldos";
const MODE_LABEL: Record<Mode, string> = { profundidad: "Profundidad", estilo: "Estilo", liga: "Frente a la liga", rendimiento: "Rendimiento", sueldos: "Sueldos" };
const TONE_TEXT: Record<DepthTone, string> = { good: "text-attr-good", ok: "text-attr-mid", poor: "text-attr-low" };
const TONE_BORDER: Record<DepthTone, string> = { good: "border-attr-good", ok: "border-attr-mid", poor: "border-attr-low ring-2 ring-attr-low/40" };
const TONE_BG: Record<DepthTone, string> = { good: "bg-attr-good", ok: "bg-attr-mid", poor: "bg-attr-low" };
const ACTION_TONE: Record<SquadAction["kind"], string> = { renovar: "text-attr-elite", salida: "text-attr-mid", subir: "text-attr-good", fichar: "text-attr-low", planificar: "text-attr-mid", estilo: "text-muted" };

function pctTone(v: number | null): DepthTone | null {
  if (v == null) return null;
  return v >= 60 ? "good" : v >= 40 ? "ok" : "poor";
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
  const squads = useAppStore((s) => s.squads);
  const playerTraits = useAppStore((s) => s.playerTraits);
  const budget = useAppStore((s) => s.scoutingBudget);

  const [horizon, setHorizon] = useState<Horizon>(0);
  const [mode, setMode] = useState<Mode>("profundidad");
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions] = useState<HorizonOptions>(DEFAULT_HORIZON_OPTIONS);
  const [styleId, setStyleId] = useState<string | null>(null);

  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const scouted = useMemo(() => players.ojeados ?? [], [players.ojeados]);
  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const leaguePool = useLeague();
  const league = useMemo(() => (leaguePool.players.length >= 50 ? buildLeagueStats(leaguePool.players) : null), [leaguePool.players]);
  const gameYear = useMemo(() => estimateGameYear(firstTeam), [firstTeam]);
  const youthSquad = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of youthSquadIds(squads)) for (const p of players[id] ?? []) m.set(p.uid, squads.find((q) => q.id === id)?.name ?? id);
    return m;
  }, [squads, players]);
  const youth = useMemo(() => youthSquadIds(squads).flatMap((id) => players[id] ?? []), [squads, players]);

  const states = useMemo(
    () => (tactic && firstTeam.length ? HORIZONS.map((h) => squadState(tactic, firstTeam, h, { gameYear, youth, league, traits: playerTraits, options })) : []),
    [tactic, firstTeam, gameYear, youth, league, playerTraits, options],
  );
  const state = states[horizon] ?? null;
  const today = states[0] ?? null;
  const readiness = useMemo(() => (tactic && state ? styleReadiness(tactic, state.lineup) : []), [tactic, state]);
  const readinessToday = useMemo(() => (tactic && today ? styleReadiness(tactic, today.lineup) : []), [tactic, today]);
  const style = readiness.find((r) => r.style.id === styleId) ?? readiness[0] ?? null;
  const actions = useMemo(() => squadActions(states, { firstTeam, gameYear, youthSquad, style: readinessToday[0] ?? null }), [states, firstTeam, gameYear, youthSquad, readinessToday]);
  const staying = useMemo(() => (state ? firstTeam.filter((p) => !state.departures.some((d) => d.player.uid === p.uid)) : firstTeam), [firstTeam, state]);
  const wages = useMemo(() => wageSummary(staying, state), [staying, state]);
  const overpaid = useMemo(() => (today ? overpaidPlayers(firstTeam, today.lineup) : []), [firstTeam, today]);
  const leagueCmp = useMemo(() => (league && today ? leagueComparison(firstTeam, league, today.lineup) : null), [league, firstTeam, today]);
  // Rendimiento real (Moneyball) del titular de cada hueco, con el perfil de su rol
  const statsCtx = useStats();
  const perfBySlot = useMemo(() => {
    const m = new Map<string, { perf: PerfEval; fns: FunctionCheck[] }>();
    for (const s of state?.slots ?? []) {
      const uid = s.starter?.player.uid;
      const rec = uid ? statsCtx.records.get(uid) : undefined;
      if (!rec) continue;
      const profile = profileOfRole(s.role, s.slot.slot);
      m.set(s.slotId, { perf: evaluatePerf(rec, profile, statsCtx.league), fns: functionChecks(roleFunctions(s.role, s.slot.slot, playerTraits[uid!] ?? []).fns, rec, profile, statsCtx.league) });
    }
    return m;
  }, [state, statsCtx, playerTraits]);
  const evals = useMemo(() => (today && scouted.length ? evaluateAll(scouted, today.needs, firstTeam, budget, gameYear) : []), [today, scouted, firstTeam, budget, gameYear]);

  if (hydrated && firstTeam.length === 0) {
    return <div className="text-sm text-muted">No hay plantilla importada. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> primero.</div>;
  }
  if (!tactic) {
    return <div className="text-sm text-muted">Crea una táctica en <Link href="/tactica" className="text-accent underline">Táctica</Link>: el estado de la plantilla se mide hueco a hueco sobre ella.</div>;
  }
  if (!state || !today) return null;

  const sel = state.slots.find((s) => s.slotId === selected) ?? null;
  const failing = new Map<string, string[]>();
  const involved = new Set<string>();
  if (style) for (const g of style.gaps) {
    if (g.req.kind === "attr") for (const s of state.slots) if (g.req.positions === "xi" || (g.req.positions === "campo" ? s.slot.slot !== "GK" : g.req.positions.includes(s.slot.slot))) involved.add(s.slotId);
    for (const id of g.slotIds) failing.set(id, [...(failing.get(id) ?? []), g.req.label]);
  }
  const overpaidUid = new Set(overpaid.map((o) => o.player.uid));

  const cardTone = (s: SlotState): string => {
    if (mode === "profundidad") return TONE_BORDER[s.tone];
    if (mode === "estilo") return failing.has(s.slotId) ? TONE_BORDER.poor : involved.has(s.slotId) ? TONE_BORDER.good : "border-border";
    if (mode === "liga") { const t = pctTone(s.leaguePct); return t ? TONE_BORDER[t] : "border-border"; }
    if (mode === "rendimiento") { const b = perfBySlot.get(s.slotId)?.perf.band; return b != null ? BAND_BORDER[b] : "border-border"; }
    return s.starter && overpaidUid.has(s.starter.player.uid) ? TONE_BORDER.ok : "border-border";
  };
  const cardBadge = (s: SlotState) => {
    if (mode === "liga") return s.leaguePct != null ? <span className={`font-mono ${TONE_TEXT[pctTone(s.leaguePct)!]}`}>P{s.leaguePct}</span> : <span className="text-muted">–</span>;
    if (mode === "sueldos") return <span className="font-mono text-muted">{s.starter?.player.wage != null ? fmtMoney(s.starter.player.wage) : "–"}</span>;
    if (mode === "estilo") return failing.has(s.slotId) ? <span className="text-attr-low">✗</span> : involved.has(s.slotId) ? <span className="text-attr-good">✓</span> : null;
    if (mode === "rendimiento") {
      const x = perfBySlot.get(s.slotId);
      if (!x) return <span className="text-muted">–</span>;
      return x.perf.band != null ? <span className={`${BAND_TEXT[x.perf.band]} ${x.perf.sample === "provisional" ? "opacity-60" : ""}`}>{VERDICT_WORD[x.perf.band]}{x.fns.some((f) => !f.ok) ? " ✗" : ""}</span> : <span className="text-muted">{x.perf.rec.minutes}&apos;</span>;
    }
    return s.starter ? <ScoreBadge score={s.starter.effective} /> : null;
  };
  const byHorizon = HORIZONS.map((h) => ({ h, list: actions.filter((a) => a.horizon === h) })).filter((x) => x.list.length);
  const slotCands = sel ? evals.filter((e) => e.fit?.need.slotId === sel.slotId && e.verdict !== "descartar").slice(0, 5) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Radiografía</h1>
        <span className="text-xs text-muted">
          Estado de la plantilla con {tactic.name}{league ? ` · ${coverageText(leaguePool)}` : " · sin liga"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {HORIZONS.map((h) => (
          <button key={h} onClick={() => setHorizon(h)} className={`text-sm px-3 py-1 rounded border ${horizon === h ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
            {HORIZON_LABEL[h]}{states[h]?.season ? <span className="opacity-75 text-xs"> · {states[h].season}</span> : ""}
            <span className="ml-2 text-xs">
              <span className={horizon === h ? "" : "text-attr-low"}>{states[h]?.counts.poor}</span>/<span className={horizon === h ? "" : "text-attr-mid"}>{states[h]?.counts.ok}</span>/<span className={horizon === h ? "" : "text-attr-good"}>{states[h]?.counts.good}</span>
            </span>
          </button>
        ))}
        <label className="text-xs flex items-center gap-1 ml-2"><input type="checkbox" checked={options.contractsLeave} onChange={(e) => setOptions({ ...options, contractsLeave: e.target.checked })} /> se van los que acaban contrato</label>
        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={options.listedLeave} onChange={(e) => setOptions({ ...options, listedLeave: e.target.checked })} /> se van los transferibles</label>
      </div>
      <p className="text-xs text-muted">
        {horizon === 0
          ? "Hoy: el XI de la táctica, el suplente real (segundo XI) y el mejor juvenil de los filiales en cada hueco."
          : `En ${state.season ?? HORIZON_LABEL[horizon].toLowerCase()}: si no renuevas ni fichas. Todos ${horizon} ${horizon === 1 ? "año" : "años"} mayores, los de 30 o más con menos físico (porteros desde los 33), y sin ${state.departures.length} ${state.departures.length === 1 ? "jugador" : "jugadores"}. No se proyecta el crecimiento de los jóvenes.`}
        {" "}Media del XI {state.lineup.average.toFixed(1)}{horizon > 0 ? ` (hoy ${today.lineup.average.toFixed(1)})` : ""}.
      </p>

      <div className="flex flex-wrap gap-1">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`text-xs px-2 py-0.5 rounded border ${mode === m ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>{MODE_LABEL[m]}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* Campo */}
        <div className="relative w-full aspect-[3/4] max-h-[700px] rounded-lg border border-border overflow-hidden"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, var(--surface)) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface)) 100%)" }}>
          <div className="absolute inset-x-[8%] top-1/2 border-t border-border/60" />
          <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60" />
          <div className="absolute left-1/2 bottom-0 w-[55%] h-[16%] -translate-x-1/2 border border-b-0 border-border/60" />
          <div className="absolute left-1/2 top-0 w-[55%] h-[16%] -translate-x-1/2 border border-t-0 border-border/60" />
          {state.slots.map((s) => (
            <button
              key={s.slotId}
              onClick={() => setSelected(selected === s.slotId ? null : s.slotId)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[124px] rounded-md border-2 bg-surface/95 shadow-sm text-[11px] text-left px-1.5 py-1 ${cardTone(s)} ${selected === s.slotId ? "outline outline-2 outline-accent" : ""}`}
              style={{ left: `${s.slot.x}%`, top: `${100 - s.slot.y}%` }}
              title={s.need.reasons.join("\n") || undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted">{POSITION_LABEL[s.slot.slot]}</span>
                <span className="flex items-center gap-1">
                  {s.lost && <span className="text-attr-low" title={`${s.lost.player.name} ${s.lost.text}`}>✗</span>}
                  {s.expiring && <span title="Su contrato vence al acabar esta temporada">⌛</span>}
                  {s.decline != null && s.decline >= 1 && <span className="text-attr-mid" title={`Pierde ${s.decline.toFixed(1)} puntos por la edad`}>↓{s.decline.toFixed(0)}</span>}
                  {cardBadge(s)}
                </span>
              </div>
              <div className="font-medium truncate">{s.starter?.player.name ?? <span className="text-attr-low">nadie</span>}</div>
              <div className="truncate text-muted">
                {mode === "sueldos"
                  ? <>sup. {s.backup ? `${s.backup.player.name.split(" ").slice(-1)[0]} ${s.backup.player.wage != null ? fmtMoney(s.backup.player.wage) : ""}` : "—"}</>
                  : <>sup. {s.backup ? <>{s.backup.player.name.split(" ").slice(-1)[0]} <span className={s.backup.familiarity < 0.85 ? "text-attr-low" : ""}>{Math.round(s.backup.effective)}{s.backup.familiarity < 0.85 ? "*" : ""}</span></> : <span className="text-attr-low">—</span>}</>}
              </div>
              {s.youth && <div className="truncate text-muted">🎓 {s.youth.player.name.split(" ").slice(-1)[0]} {Math.round(s.youth.effective)}</div>}
            </button>
          ))}
        </div>

        {/* Panel lateral */}
        <aside className="space-y-3 text-sm">
          {sel ? (
            <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{POSITION_LABEL[sel.slot.slot]} · {sel.role.es} ({DUTY_LABEL[sel.role.duty]})</h2>
                <button className="text-xs text-muted hover:text-foreground" onClick={() => setSelected(null)}>cerrar</button>
              </div>
              <div className={`text-xs font-medium ${TONE_TEXT[sel.tone]}`}>{NEED_LABEL[sel.need.level]}{sel.gap != null ? ` · suplente a ${Math.round(sel.gap)} puntos` : ""}</div>
              <table className="tbl w-full text-xs">
                <tbody>
                  <tr><td className="text-muted">Titular</td><td>{sel.starter ? `${sel.starter.player.name} (${sel.starter.player.age ?? "?"})` : "—"}</td><td className="num">{sel.starter && <ScoreBadge score={sel.starter.effective} />}</td></tr>
                  <tr><td className="text-muted">Suplente real</td><td>{sel.backup ? `${sel.backup.player.name} (${sel.backup.player.age ?? "?"})${sel.backup.familiarity < 0.85 ? " · fuera de su puesto" : ""}` : "—"}</td><td className="num">{sel.backup && <ScoreBadge score={sel.backup.effective} />}</td></tr>
                  <tr><td className="text-muted">Juvenil</td><td>{sel.youth ? `${sel.youth.player.name} (${sel.youth.player.age ?? "?"}${youthSquad.get(sel.youth.player.uid) ? `, ${youthSquad.get(sel.youth.player.uid)}` : ""})` : "ninguno domina el puesto"}</td><td className="num">{sel.youth && <ScoreBadge score={sel.youth.effective} />}</td></tr>
                </tbody>
              </table>
              <div className="text-xs space-y-0.5">
                {sel.lost && <p className="text-attr-low">El titular de hoy, {sel.lost.player.name}, {sel.lost.text}.</p>}
                {sel.decline != null && <p className="text-attr-mid">{sel.starter?.player.name} pierde {sel.decline.toFixed(1)} puntos por la edad respecto a hoy.</p>}
                {sel.starter && <p className="text-muted">Contrato hasta {expiryYear(sel.starter.player) ?? "?"}{sel.starter.player.wage != null ? ` · ${fmtMoney(sel.starter.player.wage)}` : ""}{sel.leaguePct != null ? ` · percentil ${sel.leaguePct} de la liga` : ""}. Sueldo del hueco (titular y suplente): {fmtMoney(sel.wage)}.</p>}
                {sel.need.reasons.map((r, i) => <p key={i}>• {r}</p>)}
                {perfBySlot.has(sel.slotId) && (() => {
                  const x = perfBySlot.get(sel.slotId)!;
                  return (
                    <div className="border-t border-border pt-1 mt-1 space-y-0.5">
                      <div>Rendimiento {statsCtx.season}: <PerfBadge perf={x.perf} /></div>
                      <div className="flex flex-wrap gap-x-3">{[...x.perf.strengths, ...x.perf.weaknesses].map((m) => <MetricChip key={m.key} m={m} />)}</div>
                      {x.fns.map((f) => <p key={f.fn} className={f.ok ? "text-attr-good" : "text-attr-low"}>{f.ok ? "✓" : "✗"} {f.text}</p>)}
                      {horizon > 0 && <p className="text-[10px] text-muted">Estadísticas de la temporada importada, no proyectadas.</p>}
                    </div>
                  );
                })()}
                {failing.has(sel.slotId) && style && <p className="text-attr-low">• {style.style.name}: {failing.get(sel.slotId)!.join("; ")}.</p>}
              </div>
              <div className="text-xs space-y-1 border-t border-border pt-2">
                <div className="font-medium">Candidatos de Ojeados</div>
                {scouted.length === 0 && <p className="text-muted">No hay ojeados importados.</p>}
                {scouted.length > 0 && slotCands.length === 0 && <p className="text-muted">Ningún ojeado encaja en este hueco.</p>}
                {slotCands.map((e) => (
                  <div key={e.player.uid} className="flex justify-between gap-2">
                    <span className="truncate">{e.player.name} <span className="text-muted">({e.player.age ?? "?"}{e.player.club ? `, ${e.player.club}` : ""})</span></span>
                    <span className="whitespace-nowrap">{e.fit && <ScoreBadge score={e.fit.effective} />} <span className="text-muted">{VERDICT_LABEL[e.verdict]}</span></span>
                  </div>
                ))}
                {slotCands.length > 0 && <Link href="/ojeados" className="text-accent underline">Ver en Ojeados</Link>}
                {horizon > 0 && <p className="text-[10px] text-muted">Los candidatos se miden contra la plantilla de hoy.</p>}
              </div>
            </section>
          ) : (
            <section className="bg-surface border border-border rounded-lg p-3 space-y-2 text-xs">
              {mode === "profundidad" && (
                <>
                  <h2 className="font-semibold text-sm">Profundidad</h2>
                  <p className="text-muted">Pulsa un hueco para ver por qué tiene ese color y los candidatos de Ojeados.</p>
                  <div className="flex flex-wrap gap-3">
                    {(["poor", "ok", "good"] as DepthTone[]).map((t) => <span key={t} className="flex items-center gap-1"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${TONE_BG[t]}`} />{t === "poor" ? "urgente: sin suplente, suplente a más de 15 o eslabón débil" : t === "ok" ? "mejorable, sucesión o suplente a 8-15" : "cubierto"}</span>)}
                  </div>
                  <p className="text-muted">⌛ contrato que vence al acabar la temporada · ↓ puntos que pierde por la edad · ✗ el titular de hoy ya no está · * suplente fuera de su puesto · 🎓 mejor juvenil.</p>
                  {state.departures.length > 0 && (
                    <div>
                      <div className="font-medium">Ya no están ({state.departures.length})</div>
                      {state.departures.map((d) => <div key={d.player.uid} className="text-muted">{d.player.name} ({d.player.age}): {d.text}</div>)}
                    </div>
                  )}
                  {state.declines.length > 0 && (
                    <div>
                      <div className="font-medium">Pierden físico</div>
                      {state.declines.map((d) => <div key={d.player.uid} className="text-muted">{d.player.name} ({d.player.age}): {d.changes.map((c) => `${c.key} ${Math.round(c.from)}→${Math.round(c.to)}`).join(", ")}</div>)}
                    </div>
                  )}
                </>
              )}
              {mode === "estilo" && (
                <>
                  <h2 className="font-semibold text-sm">Preparación para el estilo</h2>
                  <div className="flex flex-wrap gap-1">
                    {readiness.map((r) => (
                      <button key={r.style.id} onClick={() => setStyleId(r.style.id)} className={`px-2 py-0.5 rounded border ${style?.style.id === r.style.id ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
                        {r.style.name}{r.current ? " (actual)" : ""} <span className={style?.style.id === r.style.id ? "" : r.missing === 0 ? "text-attr-good" : r.missing === 1 ? "text-attr-mid" : "text-attr-low"}>{r.missing}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-muted">{tactic.styleId ? "El estilo de la táctica y los que salen de él" : "Sin estilo en la táctica: los más cercanos"}. En rojo, los huecos que no llegan a lo que pide; en verde, los que sí.</p>
                  {style && (style.missing === 0
                    ? <p className="text-attr-good">Cumples todos los requisitos de {style.style.name}.</p>
                    : style.gaps.map((g, i) => (
                      <div key={i} className={g.ok ? "text-muted" : ""}>
                        <span className={g.ok ? "text-attr-good" : "text-attr-low"}>{g.ok ? "✓" : "✗"}</span> {g.req.label}
                        <div className="text-muted pl-3">{g.detail}{!g.ok && g.req.kind === "role" ? " — se arregla en Táctica." : ""}</div>
                      </div>
                    )))}
                </>
              )}
              {mode === "rendimiento" && (
                <>
                  <h2 className="font-semibold text-sm">Rendimiento real</h2>
                  <p className="text-muted">{statsCoverageText(statsCtx)}. En el campo, el veredicto del titular con las estadísticas del perfil de su rol; ✗ si no cumple alguna función del rol (crear, dar amplitud, recuperar…). Todo el detalle está en <Link href="/moneyball" className="underline">Moneyball</Link>.</p>
                  {perfBySlot.size === 0 && <p className="text-muted">Sin estadísticas de tus titulares: importa tu plantilla con la vista Moneyball.</p>}
                  {state.slots.filter((s) => perfBySlot.has(s.slotId)).map((s) => {
                    const x = perfBySlot.get(s.slotId)!;
                    return (
                      <div key={s.slotId}>
                        <div className="flex justify-between gap-2"><span>{POSITION_LABEL[s.slot.slot]} · {s.starter?.player.name}</span><PerfBadge perf={x.perf} short /></div>
                        {x.fns.filter((f) => !f.ok).map((f) => <div key={f.fn} className="text-attr-low pl-2">✗ {f.text}</div>)}
                      </div>
                    );
                  })}
                </>
              )}
              {mode === "liga" && (
                <>
                  <h2 className="font-semibold text-sm">Frente a la liga</h2>
                  {!leagueCmp && <p className="text-muted">La liga se construye con tu plantilla y los rivales que importes marcados como «Liga»; hacen falta al menos 50 jugadores. Para completarla antes, <Link href="/" className="underline">importa una búsqueda de tu liga</Link>.</p>}
                  {leagueCmp && <p className="text-muted">En el campo, el percentil de cada titular entre los de la familia de su hueco. Verde ≥60, rojo &lt;40. Abajo, la media por familia hoy.</p>}
                  {leagueCmp?.filter((f) => f.players.length).map((f) => (
                    <div key={f.family}>
                      <div className="flex justify-between"><span>{FAMILY_LABEL[f.family]}</span><span className={f.meanPercentile == null ? "text-muted" : TONE_TEXT[pctTone(f.meanPercentile)!]}>percentil medio {f.meanPercentile ?? "–"}</span></div>
                      <Bar value={f.meanPercentile ?? 0} max={100} />
                      <div className="text-muted mt-0.5">{f.players.map((x) => `${x.player.name} ${x.percentile ?? "–"}`).join(" · ")}</div>
                    </div>
                  ))}
                </>
              )}
              {mode === "sueldos" && (
                <>
                  <h2 className="font-semibold text-sm">Sueldos <span className="text-muted font-normal">total {fmtMoney(wages.total)}</span></h2>
                  {wages.byUnit.map((u) => (
                    <div key={u.unit}>
                      <div className="flex justify-between"><span>{u.label} <span className="text-muted">({u.count})</span></span><span className="text-muted">{fmtMoney(u.total)} · {wages.total ? Math.round((u.total / wages.total) * 100) : 0} %</span></div>
                      <Bar value={u.total} max={Math.max(...wages.byUnit.map((x) => x.total))} />
                    </div>
                  ))}
                  {wages.outside.length > 0 && (
                    <div className="pt-1">
                      <div className="font-medium">Fuera de los dos XI: {fmtMoney(wages.outsideTotal)} ({wages.total ? Math.round((wages.outsideTotal / wages.total) * 100) : 0} %)</div>
                      <div className="text-muted">{wages.outside.map((p) => `${p.name} ${fmtMoney(p.wage ?? 0)}`).join(" · ")}</div>
                    </div>
                  )}
                  {overpaid.length > 0 && (
                    <div className="pt-1">
                      <div className="font-medium">Cobran por encima de lo que aportan <span className="text-muted font-normal">(borde ámbar en el campo)</span></div>
                      {overpaid.map((o) => <div key={o.player.uid} className="text-muted">{o.player.name}: {o.wageRank}º sueldo, {o.levelRank}º nivel</div>)}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </aside>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Acciones antes de la ventana</h2>
        {byHorizon.length === 0 && <p className="text-xs text-muted">Nada que hacer: la plantilla aguanta las dos próximas temporadas.</p>}
        {byHorizon.map(({ h, list }) => (
          <div key={h} className="space-y-1">
            <div className="text-xs font-medium text-muted">{HORIZON_LABEL[h]}{states[h]?.season ? ` · ${states[h].season}` : ""}</div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-1">
              {list.map((a, i) => (
                <div key={i} className="text-xs flex items-baseline gap-2 min-w-0">
                  <span className={`whitespace-nowrap font-medium w-24 shrink-0 ${ACTION_TONE[a.kind]}`}>{ACTION_LABEL[a.kind]}</span>
                  <span className="min-w-0">
                    <Link href={a.href} className="font-medium hover:underline">{a.title}</Link>
                    {a.slotId && <button className="ml-1 text-muted hover:text-foreground" title="Ver el hueco en el campo" onClick={() => { setHorizon(h); setSelected(a.slotId!); }}>◎</button>}
                    <span className="text-muted"> — {a.why}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[10px] text-muted">Renovar y salidas enlazan con Plantilla; subir del filial, con Juveniles; fichar y planificar, con Ojeados (allí están los focos de contratación); lo que falta de rol, con Táctica. La comparación de equipos de la liga está ahora en Rival.</p>
      </section>
    </div>
  );
}
