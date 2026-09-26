"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { POSITION_LABEL } from "@/lib/fm/roles";
import { TIER_LABEL, type PersonalityTierLevel } from "@/lib/fm/personalities";
import { NEED_LABEL, SCOUTING_TIPS, VERDICT_LABEL, evaluateAll, fmtMoney, overpaidPlayers, squadNeeds, type CandidateEval, type NeedLevel, type Verdict } from "@/lib/fm/scouting";
import { buildFocuses, dnaCheck, evolutionNeeds, proposedTargets, staffLoad, styleDnaRules, type DnaResult } from "@/lib/fm/recruitment";
import { youthSquadIds } from "@/lib/fm/tactics";
import { DnaPanel, FocusCard, StaffNetwork } from "@/components/Recruitment";
import { estimateGameYear } from "@/lib/fm/youth";
import { buildLeagueStats, leagueLevelPercentile } from "@/lib/fm/league";
import { MetricChip, PerfBadge } from "@/components/Perf";
import { attrVsPerf, evaluatePerf, profileOfRole, profileOfSlot, sampleOf, type AttrVsPerf, type PerfEval } from "@/lib/fm/stats";
import { useStats } from "@/lib/useStats";
import type { ReactNode } from "react";
import { useAppStore, type TargetEntry } from "@/lib/store";
import { useLeague } from "@/lib/useLeague";
import { profileText } from "@/lib/fm/slotPlan";
import { ScoreBadge } from "@/components/AttrCell";

const NEED_CLASS: Record<NeedLevel, string> = {
  urgente: "border-attr-low text-attr-low",
  mejorable: "border-attr-mid text-attr-mid",
  sucesion: "border-accent text-accent",
  cubierto: "border-border text-muted",
};
const VERDICT_CLASS: Record<Verdict, string> = {
  titular: "bg-attr-elite/15 text-attr-elite",
  rotacion: "bg-attr-good/15 text-attr-good",
  futuro: "bg-accent/15",
  descartar: "bg-attr-low/15 text-attr-low",
};

export default function ScoutingPage() {
  const players = useAppStore((s) => s.players);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const budget = useAppStore((s) => s.scoutingBudget);
  const setBudget = useAppStore((s) => s.setScoutingBudget);
  const targets = useAppStore((s) => s.targets);
  const setTarget = useAppStore((s) => s.setTarget);
  const playerTraits = useAppStore((s) => s.playerTraits);
  const squads = useAppStore((s) => s.squads);
  const staff = useAppStore((s) => s.staff);
  const clubDna = useAppStore((s) => s.clubDna);
  const setClubDna = useAppStore((s) => s.setClubDna);
  const createdFocuses = useAppStore((s) => s.createdFocuses);
  const setCreatedFocus = useAppStore((s) => s.setCreatedFocus);
  const [onlyDna, setOnlyDna] = useState(false);
  const [showTargets, setShowTargets] = useState(true);
  const [slotFilter, setSlotFilter] = useState<string>("todos");
  const [hideDiscarded, setHideDiscarded] = useState(true);
  const [maxAge, setMaxAge] = useState<number | "">("");
  const [open, setOpen] = useState<string | null>(null);

  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const scouted = useMemo(() => players.ojeados ?? [], [players.ojeados]);
  const leaguePool = useLeague();
  const league = useMemo(() => (leaguePool.players.length >= 50 ? buildLeagueStats(leaguePool.players) : null), [leaguePool.players]);
  const scoutedByUid = useMemo(() => new Map(scouted.map((p) => [p.uid, p])), [scouted]);
  const targetList = useMemo(() => Object.entries(targets).map(([uid, t]) => ({ uid, t, current: scoutedByUid.get(uid) ?? null })).sort((a, b) => a.t.addedAt.localeCompare(b.t.addedAt)), [targets, scoutedByUid]);
  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const gameYear = useMemo(() => estimateGameYear(firstTeam), [firstTeam]);
  const youthPlayers = useMemo(() => youthSquadIds(squads).flatMap((id) => players[id] ?? []), [squads, players]);
  const needsRes = useMemo(() => (tactic && firstTeam.length ? squadNeeds(tactic, firstTeam, gameYear, { traits: playerTraits, youth: youthPlayers, league }) : null), [tactic, firstTeam, gameYear, playerTraits, youthPlayers, league]);
  const evals = useMemo(() => (needsRes ? evaluateAll(scouted, needsRes.needs, firstTeam, budget, gameYear) : []), [needsRes, scouted, firstTeam, budget, gameYear]);
  const [showAssignments, setShowAssignments] = useState(true);
  const statsCtx = useStats();
  const dnaRules = useMemo(() => styleDnaRules(tactic), [tactic]);
  const maxWage = useMemo(() => Math.max(0, ...firstTeam.map((p) => p.wage ?? 0)) || null, [firstTeam]);
  const dnaByUid = useMemo(() => new Map<string, DnaResult>(evals.map((e) => [e.player.uid, dnaCheck(e.player, clubDna, dnaRules, e.fit?.need.slot ?? null, maxWage)])), [evals, clubDna, dnaRules, maxWage]);
  const focuses = useMemo(() => (needsRes && tactic ? buildFocuses(needsRes.needs, { tactic, staff, dna: clubDna, budget, firstTeam, created: createdFocuses, statsLeague: statsCtx.league }) : []), [needsRes, tactic, staff, clubDna, budget, firstTeam, createdFocuses, statsCtx.league]);
  const load = useMemo(() => staffLoad(focuses), [focuses]);
  const proposals = useMemo(() => proposedTargets(evals, clubDna, dnaRules, maxWage, new Set(Object.keys(targets))), [evals, clubDna, dnaRules, maxWage, targets]);
  const evolution = useMemo(() => evolutionNeeds(tactic, needsRes?.lineup ?? null), [tactic, needsRes]);
  const track = (e: CandidateEval) => setTarget(e.player.uid, { status: "seguir", note: "", addedAt: new Date().toISOString(), snapshot: { name: e.player.name, club: e.player.club, value: e.player.value, wage: e.player.wage, contractExpiry: e.player.contractExpiry, age: e.player.age } });
  const overpaid = useMemo(() => (needsRes ? overpaidPlayers(firstTeam, needsRes.lineup) : []), [needsRes, firstTeam]);

  // Rendimiento real (Moneyball): confirma o pone en duda el informe
  const leagueClubs = useMemo(() => new Set(leaguePool.clubs.map((c) => c.club)), [leaguePool.clubs]);
  const perfByUid = useMemo(() => {
    const m = new Map<string, RowPerf>();
    for (const e of evals) {
      const rec = statsCtx.records.get(e.player.uid);
      if (!rec) continue;
      const profile = e.fit ? profileOfRole(e.fit.need.role, e.fit.need.slot) : e.player.isGoalkeeper ? "portero" : profileOfSlot(e.player.position.slots[0]);
      const perf = evaluatePerf(rec, profile, statsCtx.league);
      m.set(e.player.uid, { perf, vs: attrVsPerf(perf, e.player, league), sameLeague: !!e.player.club && leagueClubs.has(e.player.club) });
    }
    return m;
  }, [evals, statsCtx, league, leagueClubs]);

  const list = evals.filter((e) => (!onlyDna || dnaByUid.get(e.player.uid)?.ok) && (!hideDiscarded || e.verdict !== "descartar") && (slotFilter === "todos" || e.fit?.need.slotId === slotFilter) && (maxAge === "" || (e.player.age ?? 0) <= maxAge));

  if (hydrated && firstTeam.length === 0) {
    return <div className="text-sm text-muted">No hay plantilla importada. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> primero.</div>;
  }
  if (!tactic) {
    return <div className="text-sm text-muted">Crea una táctica en <Link href="/tactica" className="text-accent underline">Táctica</Link>: las necesidades se calculan hueco a hueco sobre ella.</div>;
  }

  const money = (v: number | null) => (v == null ? "" : String(v));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Ojeados</h1>
        <span className="text-xs text-muted">Necesidades sobre {tactic.name}{gameYear ? ` · temporada ${gameYear - 1}/${String(gameYear).slice(2)}` : ""}</span>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <label>Presupuesto traspasos <input className="bg-surface border border-border rounded px-2 py-0.5 w-28" placeholder="p. ej. 80000000" value={money(budget.transfer)} onChange={(e) => setBudget({ ...budget, transfer: e.target.value ? Number(e.target.value) : null })} /></label>
          <label>Sueldo máx. <input className="bg-surface border border-border rounded px-2 py-0.5 w-24" placeholder="mismas unidades" value={money(budget.wage)} onChange={(e) => setBudget({ ...budget, wage: e.target.value ? Number(e.target.value) : null })} /></label>
        </div>
      </div>

      {needsRes && (
        <section className="space-y-2">
          <h2 className="font-semibold text-sm">Necesidades por hueco</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {needsRes.needs.map((n) => (
              <button
                key={n.slotId}
                onClick={() => setSlotFilter(slotFilter === n.slotId ? "todos" : n.slotId)}
                className={`text-left border rounded-md p-2 text-xs bg-surface ${NEED_CLASS[n.level]} ${slotFilter === n.slotId ? "ring-2 ring-accent" : ""}`}
                title={n.reasons.join("\n")}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-fg">{POSITION_LABEL[n.slot]} · {n.role.es}</span>
                  <span>{NEED_LABEL[n.level]}</span>
                </div>
                <div className="text-muted mt-0.5">
                  {n.starter ? `${n.starter.player.name} (${Math.round(n.starter.effective)}, ${n.starter.player.age})` : "sin titular"}
                  {n.backup ? ` · sup. real ${n.backup.player.name} (${Math.round(n.backup.effective)})` : " · sin suplente"}
                </div>
                {n.profile && <div className="text-attr-low mt-0.5">Plan: {n.profile.needs.join(", ").toLowerCase()} ({profileText(n.profile)})</div>}
                {n.weakLink && <div className="text-attr-low mt-0.5">Eslabón débil del estilo</div>}
                {n.youth && <div className="text-attr-good mt-0.5">🎓 {n.youth.player.name} ({n.youth.player.age}, {Math.round(n.youth.effective)}) a tiro</div>}
                {n.leaguePct != null && <div className="text-muted">Liga: percentil {n.leaguePct}</div>}
                <div className="text-muted">Busca ≥{Math.round(n.targetScore)} rotación · ≥{Math.round(n.upgradeScore)} mejora · {n.ageBand === "futuro" ? "joven" : n.ageBand === "inmediato" ? "inmediato" : "cualquier edad"}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Urgente: sin suplente real en el segundo XI (o en rojo en el mapa de profundidad), o el titular es el eslabón débil del estilo. Mejorable: titular 6 puntos por debajo de la media del XI, por debajo del percentil 40 de la liga, o un perfil del plan por hueco que nadie de la plantilla cubre. Sucesión: titular de 30+ sin relevo o con contrato que vence; si un juvenil está a menos de 8 puntos, no hace falta fichar. Clic en un hueco para filtrar candidatos.</p>
        </section>
      )}

      {needsRes && evolution.length > 0 && (
        <section className="bg-surface border border-border rounded-md p-3 text-xs space-y-1">
          <h2 className="font-semibold text-sm">Evolución del estilo</h2>
          {evolution.map((x) => (
            <p key={x.style.id}><b>{x.style.name}</b>: te falta {x.missing.map((g) => `${g.req.label} (${g.detail})`).join("; ")}.</p>
          ))}
        </section>
      )}

      {needsRes && (
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm">Contratación: ADN, propuestos y focos</h2>
            <button className="text-xs underline text-muted" onClick={() => setShowAssignments(!showAssignments)}>{showAssignments ? "ocultar" : "mostrar"}</button>
          </div>
          {showAssignments && (
            <div className="grid lg:grid-cols-[1fr_320px] gap-3">
              <div className="space-y-3">
                <DnaPanel dna={clubDna} rules={dnaRules} onChange={setClubDna} />
                <div className="bg-surface border border-border rounded-md p-3 text-xs space-y-1">
                  <h3 className="font-medium text-sm">Objetivos propuestos ({proposals.length})</h3>
                  <p className="text-muted">Ojeados que mejoran al titular en un hueco urgente y cumplen el ADN. No entran solos en Seguimiento: pásalos con un clic.</p>
                  {proposals.length === 0 && <p className="text-muted">Ninguno ahora mismo{scouted.length === 0 ? ": no hay ojeados importados" : ""}.</p>}
                  {proposals.map(({ e }) => (
                    <div key={e.player.uid} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{e.player.name}</span>
                      <span className="text-muted">{e.player.age} · {e.player.club ?? "—"} · {POSITION_LABEL[e.fit!.need.slot]} {e.fit!.need.role.es} · {Math.round(e.fit!.effective)} frente a {Math.round(e.fit!.need.starter?.effective ?? 0)} del titular{e.player.value != null ? ` · ${fmtMoney(e.player.value)}` : ""}</span>
                      <button className="ml-auto text-[10px] px-1.5 rounded border border-border hover:bg-surface-2" onClick={() => track(e)}>pasar a seguimiento</button>
                    </div>
                  ))}
                </div>
                <h3 className="text-xs font-medium text-muted">Focos de contratación ({focuses.length}): en el juego, Ojeo → Foco de contratación → Nuevo, y copia los campos en este orden</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {focuses.map((f) => (
                    <FocusCard key={f.key} f={f} onCreated={(c) => setCreatedFocus(f.key, c)} onRemove={() => setCreatedFocus(f.key, null)} />
                  ))}
                </div>
              </div>
              <aside className="space-y-3 self-start">
                <StaffNetwork staff={staff} load={load} />
                <div className="bg-surface border border-border rounded-md p-3 text-xs space-y-1.5">
                  <h3 className="font-medium text-sm">Cómo montar el ojeo</h3>
                  {SCOUTING_TIPS.map((t, i) => <p key={i}>· {t}</p>)}
                </div>
                <div className="bg-surface border border-border rounded-md p-3 text-xs space-y-1">
                  <h3 className="font-medium text-sm">Sueldos por encima de lo que aportan</h3>
                  <p className="text-muted">Para financiar fichajes: cobran como titulares y rinden como suplentes (puesto por sueldo vs puesto por nivel).</p>
                  {overpaid.length === 0 && <p className="text-muted">Nadie destaca.</p>}
                  {overpaid.map((o) => (
                    <div key={o.player.uid} className="flex justify-between gap-2">
                      <span>{o.player.name} <span className="text-muted">{o.player.age}</span></span>
                      <span className="text-muted whitespace-nowrap">{o.player.wage != null ? fmtMoney(o.player.wage) : ""} · {o.wageRank}º sueldo / {o.levelRank}º nivel</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}
        </section>
      )}

      {targetList.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm">Seguimiento de objetivos ({targetList.length})</h2>
            <button className="text-xs underline text-muted" onClick={() => setShowTargets(!showTargets)}>{showTargets ? "ocultar" : "mostrar"}</button>
          </div>
          {showTargets && (
            <div className="overflow-auto border border-border rounded-md">
              <table className="tbl w-full">
                <thead><tr><th>Jugador</th><th>Estado</th><th>Club</th><th className="num">Valor</th><th className="num">Sueldo</th><th>Contrato</th><th>Cambios desde que lo marcaste</th><th>Nota</th><th></th></tr></thead>
                <tbody>
                  {targetList.map(({ uid, t, current }) => {
                    const changes: string[] = [];
                    if (current) {
                      if (current.club !== t.snapshot.club) changes.push(`club: ${t.snapshot.club ?? "?"} → ${current.club ?? "?"}`);
                      if (current.value != null && t.snapshot.value != null && Math.abs(current.value - t.snapshot.value) / Math.max(1, t.snapshot.value) > 0.15) changes.push(`valor: ${fmtMoney(t.snapshot.value)} → ${fmtMoney(current.value)}`);
                      if (current.wage != null && t.snapshot.wage != null && current.wage !== t.snapshot.wage) changes.push(`sueldo: ${fmtMoney(t.snapshot.wage)} → ${fmtMoney(current.wage)}`);
                      if (current.contractExpiry !== t.snapshot.contractExpiry) changes.push(`contrato: ${t.snapshot.contractExpiry ?? "?"} → ${current.contractExpiry ?? "?"}`);
                    }
                    return (
                      <tr key={uid}>
                        <td className="font-medium">{t.snapshot.name} <span className="text-muted">{current?.age ?? t.snapshot.age}</span></td>
                        <td>
                          <select className="bg-surface border border-border rounded px-1 text-xs" value={t.status} onChange={(e) => setTarget(uid, { ...t, status: e.target.value as TargetEntry["status"] })}>
                            <option value="seguir">Seguir</option><option value="ofertar">Ofertar</option><option value="rechazado">Rechazado</option><option value="fichado">Fichado</option>
                          </select>
                        </td>
                        <td className="text-xs">{current?.club ?? t.snapshot.club ?? "—"}</td>
                        <td className="num text-xs">{(current?.value ?? t.snapshot.value) != null ? fmtMoney((current?.value ?? t.snapshot.value)!) : "–"}</td>
                        <td className="num text-xs">{(current?.wage ?? t.snapshot.wage) != null ? fmtMoney((current?.wage ?? t.snapshot.wage)!) : "–"}</td>
                        <td className="text-xs">{current?.contractExpiry ?? t.snapshot.contractExpiry ?? "—"}</td>
                        <td className="text-xs whitespace-normal">{!current ? <span className="text-attr-mid">no está en la última importación de ojeados</span> : changes.length ? <span className="text-attr-mid">{changes.join(" · ")}</span> : <span className="text-muted">sin cambios</span>}</td>
                        <td><input className="bg-surface border border-border rounded px-1 text-xs w-40" value={t.note} placeholder="nota…" onChange={(e) => setTarget(uid, { ...t, note: e.target.value })} /></td>
                        <td><button className="text-xs text-attr-low hover:underline" onClick={() => setTarget(uid, null)}>quitar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <h2 className="font-semibold">Candidatos ({list.length}{scouted.length !== list.length ? ` de ${scouted.length}` : ""})</h2>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={hideDiscarded} onChange={(e) => setHideDiscarded(e.target.checked)} /> ocultar descartados</label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyDna} onChange={(e) => setOnlyDna(e.target.checked)} /> solo los que cumplen el ADN</label>
          <label className="text-xs">edad máx. <input className="bg-surface border border-border rounded px-1 w-12" value={maxAge} onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : "")} /></label>
          {slotFilter !== "todos" && <button className="text-xs underline" onClick={() => setSlotFilter("todos")}>quitar filtro de hueco</button>}
        </div>
        {scouted.length === 0 && (
          <p className="text-sm text-muted">No hay ojeados. Exporta una búsqueda de jugadores o tu lista de ojeados con la misma vista e <Link href="/" className="text-accent underline">impórtala como «Ojeados / búsqueda»</Link>.</p>
        )}
        {scouted.length > 0 && (
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Jugador</th><th className="num">Edad</th><th>Club</th><th>Hueco</th><th className="num">Nivel</th><th className="num">vs 1º eq.</th>
                  <th>Personalidad</th><th className="num">Det</th><th className="num">Sueldo</th><th className="num">Valor</th><th>Contrato</th><th className="num">Conoc.</th>{league && <th className="num" title="Percentil de su nivel dentro de su familia de posición en la liga importada">Liga %</th>}<th title="Rendimiento real (vista Moneyball) en el perfil del hueco">Rendimiento</th><th>Veredicto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <Row
                    key={e.player.uid}
                    e={e}
                    leaguePct={league ? leagueLevelPercentile(league, e.player) : undefined}
                    target={targets[e.player.uid] ?? null}
                    dna={dnaByUid.get(e.player.uid) ?? null}
                    perf={perfByUid.get(e.player.uid) ?? null}
                    onTrack={() => track(e)}
                    isOpen={open === e.player.uid}
                    toggle={() => setOpen(open === e.player.uid ? null : e.player.uid)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">
          Orden: primero lo que resuelve una necesidad. Nivel con rango cuando los atributos vienen como «10-14». Reglas: Determinación &lt;10 o personalidad mala = descartar sin mirar más;
          16-21 potencial, 22-29 inmediato, 30+ contrato corto; conocimiento &lt;50 % = ojear a fondo antes de ofertar; sueldo por encima del máximo de la plantilla rompe la estructura.
        </p>
      </section>
    </div>
  );
}

interface RowPerf {
  perf: PerfEval;
  vs: AttrVsPerf | null;
  /** Su club está en tu liga: las estadísticas son comparables. */
  sameLeague: boolean;
}

function Row({ e, leaguePct, target, dna, perf, onTrack, isOpen, toggle }: { e: CandidateEval; leaguePct?: number | null; target: TargetEntry | null; dna: DnaResult | null; perf: RowPerf | null; onTrack: () => void; isOpen: boolean; toggle: () => void }) {
  const p = e.player;
  const tier = e.personalityTier as PersonalityTierLevel;
  const det = p.attrs.Det?.value ?? null;
  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-2" onClick={toggle}>
        <td className="font-medium whitespace-nowrap">{p.name}{e.red.length > 0 && <span className="text-attr-low" title={e.red.join("\n")}> ✕</span>}{e.warnings.length > 0 && e.red.length === 0 && <span className="text-attr-mid" title={e.warnings.join("\n")}> ⚠</span>}{dna && !dna.ok && <span className="text-[10px] text-attr-mid" title={`Fuera del ADN: ${dna.misses.join(", ")}`}> ADN✗</span>}</td>
        <td className="num">{p.age ?? "–"}</td>
        <td className="text-xs whitespace-nowrap">{p.club ?? "—"}</td>
        <td className="text-xs whitespace-nowrap">{e.fit ? `${POSITION_LABEL[e.fit.need.slot]} · ${e.fit.need.role.es}` : "—"}</td>
        <td className="num whitespace-nowrap">
          {e.fit ? <ScoreBadge score={e.fit.effective} /> : "–"}
          {e.fit && e.fit.max - e.fit.min > 2 && <span className="text-[10px] text-muted"> {Math.round(e.fit.min)}–{Math.round(e.fit.max)}</span>}
        </td>
        <td className="num text-xs whitespace-nowrap">{e.fit ? <span className={e.fit.rank === 1 ? "text-attr-good" : ""}>{e.fit.rank}º{e.fit.need.starter ? ` · ${e.fit.effective >= e.fit.need.starter.effective ? "+" : "−"}${Math.abs(Math.round(e.fit.effective - e.fit.need.starter.effective))}` : ""}</span> : "–"}</td>
        <td className={`text-xs whitespace-nowrap ${tier >= 5 ? "text-attr-good" : tier <= 1 ? "text-attr-low" : ""}`} title={TIER_LABEL[tier]}>{p.personality ?? "—"}</td>
        <td className={`num ${det != null && det < 10 ? "text-attr-low" : det != null && det >= 15 ? "text-attr-good" : ""}`}>{det ?? "–"}</td>
        <td className="num text-xs whitespace-nowrap" title={p.wageRaw ?? ""}>{p.wage != null ? fmtMoney(p.wage) : "–"}</td>
        <td className="num text-xs whitespace-nowrap">{p.value != null ? fmtMoney(p.value) : "–"}{p.releaseClause != null && <span className="text-muted"> (cl. {fmtMoney(p.releaseClause)})</span>}</td>
        <td className="text-xs whitespace-nowrap">{p.contractExpiry ?? "—"}{p.transferStatus && /listado|listed/i.test(p.transferStatus) ? " · transferible" : ""}</td>
        <td className={`num text-xs ${e.knowledge < 0.5 ? "text-attr-mid" : ""}`}>{Math.round(e.knowledge * 100)} %</td>
        {leaguePct !== undefined && <td className={`num text-xs ${leaguePct != null && leaguePct >= 80 ? "text-attr-good" : ""}`}>{leaguePct ?? "–"}</td>}
        <td className="text-xs whitespace-nowrap">{perf ? <PerfBadge perf={perf.perf} short /> : <span className="text-muted">–</span>}</td>
        <td className="text-xs whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded ${VERDICT_CLASS[e.verdict]}`}>{VERDICT_LABEL[e.verdict]}</span></td>
        <td className="text-xs whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
          {target ? <span className="text-muted">★ {target.status}</span> : <button className="text-[10px] px-1.5 rounded border border-border hover:bg-surface-2" onClick={onTrack}>seguir</button>}
          {e.fit?.need.starter && <Link className="text-[10px] ml-1 underline text-muted" href={`/comparar?a=${e.player.uid}&b=${e.fit.need.starter.player.uid}`}>comparar</Link>}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-surface-2/50">
          <td colSpan={16} className="text-xs p-3 whitespace-normal">
            <div className="grid md:grid-cols-3 gap-3 [&>div]:min-w-0">
              <div>
                <div className="font-medium mb-1">A favor</div>
                {e.pluses.length === 0 && <p className="text-muted">Nada destacable.</p>}
                {e.pluses.map((r, i) => <p key={i} className="text-attr-good">+ {r}</p>)}
                {perf && perf.perf.strengths.length > 0 && <p className="text-attr-good">+ Rinde: {perf.perf.strengths.map((m) => <MetricChip key={m.key} m={m} />).reduce<ReactNode[]>((a, x, i) => (i ? [...a, " · ", x] : [x]), [])}</p>}
                {perf?.vs && perf.vs.diff >= 25 && <p className="text-attr-good">+ {perf.vs.text}</p>}
              </div>
              <div>
                <div className="font-medium mb-1">En contra</div>
                {e.red.map((r, i) => <p key={"r" + i} className="text-attr-low">✕ {r}</p>)}
                {e.warnings.map((r, i) => <p key={"w" + i} className="text-attr-mid">⚠ {r}</p>)}
                {dna && !dna.ok && <p className="text-attr-mid">✗ Fuera del ADN: {dna.misses.join(", ")}.</p>}
                {perf && perf.perf.weaknesses.length > 0 && <p className="text-attr-mid">⚠ Flojo en: {perf.perf.weaknesses.map((m) => <MetricChip key={m.key} m={m} />).reduce<ReactNode[]>((a, x, i) => (i ? [...a, " · ", x] : [x]), [])}</p>}
                {perf?.vs && perf.vs.diff <= -25 && <p className="text-attr-mid">⚠ {perf.vs.text}</p>}
                {perf && sampleOf(perf.perf.rec) !== "firme" && <p className="text-attr-mid">⚠ Muestra {sampleOf(perf.perf.rec) === "provisional" ? "corta" : "insuficiente"} ({perf.perf.rec.minutes} minutos): con pocos minutos los números salen inflados.</p>}
                {perf && !perf.sameLeague && perf.perf.sample !== "insuficiente" && <p className="text-attr-mid">⚠ Sus estadísticas son de otra liga: si es mucho más baja, engañan. Mejor tu liga o un escalón arriba o abajo.</p>}
                {e.red.length + e.warnings.length === 0 && (!dna || dna.ok) && <p className="text-muted">Nada.</p>}
              </div>
              <div>
                <div className="font-medium mb-1">Atributos clave del rol vs titular{e.fit?.need.starter ? ` (${e.fit.need.starter.player.name})` : ""}</div>
                {e.comparison.length === 0 && <p className="text-muted">Sin hueco.</p>}
                <div className="grid grid-cols-2 gap-x-3">
                  {e.comparison.map((c) => (
                    <div key={c.key} className="flex justify-between gap-2">
                      <span className="text-muted" title={ATTR_BY_KEY[c.key].es}>{ATTR_BY_KEY[c.key].es}</span>
                      <span>
                        <b className={c.mine != null && c.starter != null ? (c.mine > c.starter ? "text-attr-good" : c.mine < c.starter ? "text-attr-low" : "") : ""}>{c.mine ?? "?"}</b>
                        <span className="text-muted"> / {c.starter ?? "?"}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {p.pros && <p className="mt-1 text-muted">Pros: {p.pros}</p>}
                {p.cons && <p className="text-muted">Contras: {p.cons}</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
