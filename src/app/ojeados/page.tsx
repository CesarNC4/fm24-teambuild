"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { POSITION_LABEL } from "@/lib/fm/roles";
import { TIER_LABEL, type PersonalityTierLevel } from "@/lib/fm/personalities";
import { NEED_LABEL, SCOUTING_TIPS, VERDICT_LABEL, evaluateAll, fmtMoney, squadNeeds, suggestAssignments, type CandidateEval, type NeedLevel, type Verdict } from "@/lib/fm/scouting";
import { estimateGameYear } from "@/lib/fm/youth";
import { useAppStore } from "@/lib/store";
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
  const [slotFilter, setSlotFilter] = useState<string>("todos");
  const [hideDiscarded, setHideDiscarded] = useState(true);
  const [maxAge, setMaxAge] = useState<number | "">("");
  const [open, setOpen] = useState<string | null>(null);

  const firstTeam = useMemo(() => players.plantilla ?? [], [players.plantilla]);
  const scouted = useMemo(() => players.ojeados ?? [], [players.ojeados]);
  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const gameYear = useMemo(() => estimateGameYear(firstTeam), [firstTeam]);
  const needsRes = useMemo(() => (tactic && firstTeam.length ? squadNeeds(tactic, firstTeam, gameYear) : null), [tactic, firstTeam, gameYear]);
  const evals = useMemo(() => (needsRes ? evaluateAll(scouted, needsRes.needs, firstTeam, budget, gameYear) : []), [needsRes, scouted, firstTeam, budget, gameYear]);
  const assignments = useMemo(() => (needsRes ? suggestAssignments(needsRes.needs, firstTeam, budget) : []), [needsRes, firstTeam, budget]);
  const [showAssignments, setShowAssignments] = useState(true);

  const list = evals.filter((e) => (!hideDiscarded || e.verdict !== "descartar") && (slotFilter === "todos" || e.fit?.need.slotId === slotFilter) && (maxAge === "" || (e.player.age ?? 0) <= maxAge));

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
                  {n.depth[0] ? ` · sup. ${n.depth[0].player.name} (${Math.round(n.depth[0].effective)})` : " · sin suplente"}
                </div>
                <div className="text-muted">Busca ≥{Math.round(n.targetScore)} rotación · ≥{Math.round(n.upgradeScore)} mejora · {n.ageBand === "futuro" ? "joven" : n.ageBand === "inmediato" ? "inmediato" : "cualquier edad"}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Urgente: sin suplente a menos de 12 puntos. Mejorable: titular 6 puntos por debajo de la media del XI. Sucesión: titular de 30+ sin relevo ≤26 o con contrato que vence. Clic en un hueco para filtrar candidatos.</p>
        </section>
      )}

      {assignments.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm">Encargos para los ojeadores</h2>
            <button className="text-xs underline text-muted" onClick={() => setShowAssignments(!showAssignments)}>{showAssignments ? "ocultar" : "mostrar"}</button>
          </div>
          {showAssignments && (
            <div className="grid lg:grid-cols-[1fr_300px] gap-3">
              <div className="grid md:grid-cols-2 gap-2">
                {assignments.map((a) => (
                  <div key={a.need.slotId} className="bg-surface border border-border rounded-md p-3 text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{POSITION_LABEL[a.need.slot]} · {a.need.role.es}</span>
                      <span className={a.priority === "maxima" ? "text-attr-low" : "text-muted"}>prioridad {a.priority === "maxima" ? "máxima" : "normal"} · {NEED_LABEL[a.need.level]}</span>
                    </div>
                    <p className="text-muted">{a.note}</p>
                    <table className="w-full">
                      <tbody>
                        {a.filters.map((f) => (
                          <tr key={f.label}><td className="text-muted pr-2 align-top whitespace-nowrap">{f.label}</td><td>{f.value}</td></tr>
                        ))}
                        <tr><td className="text-muted pr-2 align-top whitespace-nowrap">Ojeador</td><td>{a.scoutProfile}</td></tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <aside className="bg-surface border border-border rounded-md p-3 text-xs space-y-1.5 self-start">
                <h3 className="font-medium text-sm">Cómo montar el ojeo</h3>
                {SCOUTING_TIPS.map((t, i) => <p key={i}>· {t}</p>)}
                <p className="text-muted">En el juego: Ojeo → Encargos → Nuevo foco de reclutamiento, y copia estos filtros. El «Nivel en la app» es para comprobar aquí lo que traiga el informe.</p>
              </aside>
            </div>
          )}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <h2 className="font-semibold">Candidatos ({list.length}{scouted.length !== list.length ? ` de ${scouted.length}` : ""})</h2>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={hideDiscarded} onChange={(e) => setHideDiscarded(e.target.checked)} /> ocultar descartados</label>
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
                  <th>Personalidad</th><th className="num">Det</th><th className="num">Sueldo</th><th className="num">Valor</th><th>Contrato</th><th className="num">Conoc.</th><th>Veredicto</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => <Row key={e.player.uid} e={e} isOpen={open === e.player.uid} toggle={() => setOpen(open === e.player.uid ? null : e.player.uid)} />)}
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

function Row({ e, isOpen, toggle }: { e: CandidateEval; isOpen: boolean; toggle: () => void }) {
  const p = e.player;
  const tier = e.personalityTier as PersonalityTierLevel;
  const det = p.attrs.Det?.value ?? null;
  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-2" onClick={toggle}>
        <td className="font-medium whitespace-nowrap">{p.name}{e.red.length > 0 && <span className="text-attr-low" title={e.red.join("\n")}> ✕</span>}{e.warnings.length > 0 && e.red.length === 0 && <span className="text-attr-mid" title={e.warnings.join("\n")}> ⚠</span>}</td>
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
        <td className="text-xs whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded ${VERDICT_CLASS[e.verdict]}`}>{VERDICT_LABEL[e.verdict]}</span></td>
      </tr>
      {isOpen && (
        <tr className="bg-surface-2/50">
          <td colSpan={13} className="text-xs p-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <div className="font-medium mb-1">A favor</div>
                {e.pluses.length === 0 && <p className="text-muted">Nada destacable.</p>}
                {e.pluses.map((r, i) => <p key={i} className="text-attr-good">+ {r}</p>)}
              </div>
              <div>
                <div className="font-medium mb-1">En contra</div>
                {e.red.map((r, i) => <p key={"r" + i} className="text-attr-low">✕ {r}</p>)}
                {e.warnings.map((r, i) => <p key={"w" + i} className="text-attr-mid">⚠ {r}</p>)}
                {e.red.length + e.warnings.length === 0 && <p className="text-muted">Nada.</p>}
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
