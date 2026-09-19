"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FORMATIONS } from "@/lib/fm/formations";
import { INSTRUCTION_BY_ID } from "@/lib/fm/instructions";
import { buildLeagueStats } from "@/lib/fm/league";
import { POSITION_LABEL, roleLabel } from "@/lib/fm/roles";
import {
  THREAT_LABEL, oppositionInstructions, rankStylesVsRival, rivalLeagueLevels, rivalLineup, rivalThreats, rivalWeaknesses, unitDuels, type Tweak,
} from "@/lib/fm/rival";
import { buildLineup, poolPlayers, type Tactic } from "@/lib/fm/tactics";
import { useAppStore } from "@/lib/store";
import { ScoreBadge } from "@/components/AttrCell";

function edgeTone(e: number | null): string {
  if (e == null) return "text-muted";
  if (e >= 1.5) return "text-attr-elite";
  if (e >= 0.5) return "text-attr-good";
  if (e <= -1.5) return "text-attr-low";
  if (e <= -0.5) return "text-attr-mid";
  return "";
}

export default function RivalPage() {
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const updateTactic = useAppStore((s) => s.updateTactic);
  const addTactic = useAppStore((s) => s.addTactic);

  const rivals = useMemo(() => squads.filter((q) => q.kind === "rival"), [squads]);
  const [rivalId, setRivalId] = useState<string>("");
  const [formationId, setFormationId] = useState<string>("");
  const [tacticId, setTacticId] = useState<string>("");
  const rival = rivals.find((q) => q.id === rivalId) ?? rivals[0] ?? null;
  const rivalPlayers = useMemo(() => (rival ? allPlayers[rival.id] ?? [] : []), [rival, allPlayers]);
  const tactic: Tactic | null = tactics.find((t) => t.id === (tacticId || activeTacticId)) ?? tactics[0] ?? null;

  const ours = useMemo(() => {
    if (!tactic) return null;
    const pool = poolPlayers(tactic, allPlayers, squads.filter((q) => q.kind === "filial").map((q) => q.id));
    return pool.players.length ? buildLineup(tactic, pool.players, { exclude: pool.exclude }) : null;
  }, [tactic, allPlayers, squads]);
  const league = useMemo(() => ((allPlayers.liga ?? []).length >= 50 ? buildLeagueStats(allPlayers.liga) : null), [allPlayers.liga]);

  const rl = useMemo(() => (rivalPlayers.length >= 11 ? rivalLineup(rivalPlayers, formationId || null) : null), [rivalPlayers, formationId]);
  const threats = useMemo(() => (rl ? rivalThreats(rl) : []), [rl]);
  const ois = useMemo(() => (rl ? oppositionInstructions(rl) : []), [rl]);
  const weaknesses = useMemo(() => (rl ? rivalWeaknesses(rl, ours) : []), [rl, ours]);
  const styles = useMemo(() => (rl ? rankStylesVsRival(rl, ours) : []), [rl, ours]);
  const duels = useMemo(() => (rl ? unitDuels(ours, rl) : []), [rl, ours]);
  const levels = useMemo(() => (rl ? rivalLeagueLevels(rl, league) : []), [rl, league]);

  if (hydrated && rivals.length === 0) {
    return (
      <div className="text-sm text-muted space-y-2">
        <p>No hay ningún rival importado.</p>
        <p>En el juego abre la plantilla del próximo rival con la misma vista que usas para la tuya, expórtala (Ctrl+P → Página web) y en <Link href="/" className="text-accent underline">Importar</Link> crea el equipo con «+ rival» antes de subir el archivo.</p>
      </div>
    );
  }
  if (rival && rivalPlayers.length < 11) {
    return <div className="text-sm text-muted">«{rival.name}» tiene {rivalPlayers.length} jugadores; hacen falta al menos 11. <Link href="/" className="text-accent underline">Importa su plantilla</Link>.</div>;
  }
  if (!rl || !rival) return null;

  const applyTweak = (tw: Tweak) => {
    if (!tactic || !tw.instructionId) return;
    const id = tw.instructionId;
    updateTactic(tactic.id, (t) => {
      const instr = INSTRUCTION_BY_ID[id];
      let next = t.instructions.filter((x) => x !== id && !tw.remove?.includes(x));
      if (instr.group) next = next.filter((x) => INSTRUCTION_BY_ID[x].group !== instr.group);
      return { ...t, instructions: [...next, id], styleId: null };
    });
  };
  const isActive = (tw: Tweak) => !!tw.instructionId && !!tactic?.instructions.includes(tw.instructionId);
  const keyTweaks = weaknesses.flatMap((w) => w.tweaks).filter((t) => t.level === "clave" && t.instructionId);
  const createVariant = () => {
    if (!tactic) return;
    let instructions = [...tactic.instructions];
    for (const tw of keyTweaks) {
      const id = tw.instructionId!;
      const instr = INSTRUCTION_BY_ID[id];
      instructions = instructions.filter((x) => x !== id && !tw.remove?.includes(x));
      if (instr.group) instructions = instructions.filter((x) => INSTRUCTION_BY_ID[x].group !== instr.group);
      instructions.push(id);
    }
    const t: Tactic = { ...tactic, id: `t-${Date.now().toString(36)}`, name: `${tactic.name} vs ${rival.name}`, instructions, styleId: null, locks: { ...tactic.locks } };
    addTactic(t);
    setTacticId(t.id);
  };

  const ourAvg = ours?.average ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Análisis del rival</h1>
        <select className="bg-surface border border-border rounded px-2 py-1 text-sm" value={rival.id} onChange={(e) => { setRivalId(e.target.value); setFormationId(""); }}>
          {rivals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <label className="text-xs text-muted flex items-center gap-1">
          su formación
          <select className="bg-surface border border-border rounded px-2 py-1 text-sm" value={formationId} onChange={(e) => setFormationId(e.target.value)}>
            <option value="">automática ({rl.formation.name})</option>
            {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted flex items-center gap-1">
          nuestra táctica
          <select className="bg-surface border border-border rounded px-2 py-1 text-sm" value={tactic?.id ?? ""} onChange={(e) => setTacticId(e.target.value)}>
            {tactics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted">
          XI rival {Math.round(rl.average)}{ourAvg != null ? ` · nuestro XI ${Math.round(ourAvg)}` : ""}
          {league ? ` · liga importada` : ""}
        </span>
      </div>

      {rl.unavailable.length > 0 && (
        <p className="text-xs text-muted">Descartados por lesión o sanción (columna Inf): {rl.unavailable.map((p) => p.name).join(", ")}.</p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <section className="space-y-2">
          <h2 className="font-semibold text-sm">XI probable ({rl.formation.name})</h2>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead><tr><th>Pos</th><th>Jugador</th><th className="num">Edad</th><th>Mejor rol aquí</th><th className="num">Nivel</th>{league && <th className="num">Liga %</th>}<th className="num">Vel</th><th className="num">Cab</th><th className="num">Reg</th><th className="num">Ser</th><th>Pie</th></tr></thead>
              <tbody>
                {rl.lineup.slots.map((s, i) => {
                  const p = s.starter?.player;
                  if (!p) return <tr key={s.slot.id}><td>{POSITION_LABEL[s.slot.slot]}</td><td colSpan={9} className="text-muted">—</td></tr>;
                  const lv = levels[i];
                  return (
                    <tr key={s.slot.id}>
                      <td className="whitespace-nowrap">{POSITION_LABEL[s.slot.slot]}</td>
                      <td className="whitespace-nowrap">{p.name}</td>
                      <td className="num">{p.age ?? "–"}</td>
                      <td className="text-xs">{roleLabel(s.role)}</td>
                      <td className="num"><ScoreBadge score={s.starter!.role.score} /></td>
                      {league && <td className={`num ${lv?.percentile != null && lv.percentile >= 85 ? "text-attr-elite" : lv?.percentile != null && lv.percentile < 40 ? "text-attr-low" : ""}`}>{lv?.percentile ?? "–"}</td>}
                      <td className="num">{p.isGoalkeeper ? "–" : Math.round(((p.attrs.Pac?.value ?? 0) + (p.attrs.Acc?.value ?? 0)) / 2)}</td>
                      <td className="num">{p.attrs.Hea?.value ?? "–"}</td>
                      <td className="num">{p.attrs.Dri?.value ?? "–"}</td>
                      <td className="num">{p.attrs.Cmp?.value ?? "–"}</td>
                      <td className="text-xs whitespace-nowrap">{p.leftFoot ? `I ${p.leftFoot.slice(0, 5)}` : ""}{p.rightFoot ? ` · D ${p.rightFoot.slice(0, 5)}` : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Formación estimada por la que mejor encaja su plantilla; cámbiala arriba si el juego te muestra otra. Sus lesionados y sancionados se descartan si la columna Inf viene en la exportación.</p>
        </section>

        <aside className="bg-surface border border-border rounded-lg p-3 space-y-2 self-start">
          <h2 className="font-semibold text-sm">Nosotros contra ellos</h2>
          {!ours && <p className="text-xs text-muted">Crea una táctica para ver los cruces con tu XI.</p>}
          {ours && ["Tu ataque vs su defensa", "Tu medio vs su medio", "Tu defensa vs su ataque"].map((label) => (
            <div key={label} className="text-xs">
              <div className="font-medium">{label}</div>
              {duels.filter((d) => d.label === label).map((d) => (
                <div key={d.cluster} className="flex justify-between">
                  <span className="text-muted">{d.cluster}</span>
                  <span>{d.ours?.toFixed(1) ?? "–"} <span className="text-muted">vs</span> {d.theirs?.toFixed(1) ?? "–"} <span className={edgeTone(d.edge)}>{d.edge != null ? `${d.edge > 0 ? "+" : ""}${d.edge.toFixed(1)}` : ""}</span></span>
                </div>
              ))}
            </div>
          ))}
          <p className="text-[10px] text-muted">Medias 1-20 de los titulares de cada unidad. Verde: ventaja tuya; rojo: suya.</p>
        </aside>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Amenazas</h2>
        {threats.length === 0 && <p className="text-xs text-muted">Nada que destaque en su XI.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {threats.map((t) => (
            <div key={`${t.player.uid}-${t.kind}`} className="bg-surface border border-border rounded-md p-3 text-xs">
              <div className="flex justify-between gap-2"><span className="font-medium text-sm">{t.player.name}</span><span className="text-muted">{POSITION_LABEL[t.slot]}</span></div>
              <div className="text-attr-mid">{THREAT_LABEL[t.kind]} <span className="text-muted">· {t.detail}</span></div>
              <div className="text-muted mt-1 whitespace-normal">{t.answer}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-sm">Debilidades y ajustes a {tactic?.name ?? "tu táctica"}</h2>
          {tactic && keyTweaks.length > 0 && (
            <button className="text-xs px-2 py-0.5 rounded border border-border hover:bg-surface-2" onClick={createVariant}>Duplicar táctica con los ajustes clave</button>
          )}
        </div>
        {weaknesses.length === 0 && <p className="text-xs text-muted">No hay un punto flaco claro: juega tu partido.</p>}
        <div className="grid lg:grid-cols-2 gap-2">
          {weaknesses.map((w, i) => (
            <div key={i} className="bg-surface border border-border rounded-md p-3 text-xs space-y-1">
              <div className="font-medium text-sm whitespace-normal">{w.text}</div>
              {w.tweaks.map((tw, j) => (
                <div key={j} className="flex items-start justify-between gap-2">
                  <div className="whitespace-normal">
                    <span className={tw.level === "clave" ? "font-medium" : ""}>{tw.label}</span>
                    <span className="text-muted"> · {tw.reason}</span>
                    {tw.remove && tw.remove.some((r) => tactic?.instructions.includes(r)) && <span className="text-attr-mid"> (quita {tw.remove.filter((r) => tactic?.instructions.includes(r)).map((r) => INSTRUCTION_BY_ID[r]?.name ?? r).join(", ")})</span>}
                  </div>
                  {tw.instructionId && tactic && (
                    isActive(tw)
                      ? <span className="text-attr-good whitespace-nowrap">✓ activa</span>
                      : <button className="text-accent hover:underline whitespace-nowrap" onClick={() => applyTweak(tw)}>aplicar</button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">«Aplicar» cambia la táctica elegida (y desvincula su estilo). Para no tocar la base, duplica la táctica con los ajustes clave y usa la copia solo en este partido.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Instrucciones de oposición</h2>
        <div className="overflow-auto border border-border rounded-md">
          <table className="tbl w-full">
            <thead><tr><th>Pos</th><th>Jugador</th><th>Presionar</th><th>Marcaje estricto</th><th>Entradas</th><th>Conducir al pie</th><th>Por qué</th></tr></thead>
            <tbody>
              {ois.map((o) => (
                <tr key={o.player.uid}>
                  <td className="whitespace-nowrap">{POSITION_LABEL[o.slot]}</td>
                  <td className="whitespace-nowrap">{o.player.name}</td>
                  <td className={o.closingDown === "siempre" ? "text-attr-good" : o.closingDown === "nunca" ? "text-attr-low" : "text-muted"}>{o.closingDown ?? "—"}</td>
                  <td className={o.tightMarking === "si" ? "text-attr-good" : o.tightMarking === "no" ? "text-attr-low" : "text-muted"}>{o.tightMarking === "si" ? "sí" : o.tightMarking === "no" ? "no" : "—"}</td>
                  <td className={o.tackling === "duras" ? "text-attr-good" : o.tackling === "suaves" ? "text-attr-low" : "text-muted"}>{o.tackling ?? "—"}</td>
                  <td className={o.showFoot ? "" : "text-muted"}>{o.showFoot ?? "—"}</td>
                  <td className="text-xs text-muted whitespace-normal">{o.reasons.join("; ")}</td>
                </tr>
              ))}
              {ois.length === 0 && <tr><td colSpan={7} className="text-muted">Sin instrucciones especiales: defiende en bloque.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Solo los que merecen instrucción; al resto no le pongas nada (demasiadas instrucciones descolocan a tu defensa). «Nunca» presionar al rápido con balón, «siempre» al que se atasca; marcaje estricto al desmarcador flojo, nunca al referencia fuerte; entradas duras al blando, suaves al ágil que saca faltas.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Nuestros estilos contra este rival</h2>
        <div className="overflow-auto border border-border rounded-md">
          <table className="tbl w-full">
            <thead><tr><th>Estilo</th><th className="num">Encaje</th><th className="num">Rival</th><th className="num">Total</th><th>Por qué</th></tr></thead>
            <tbody>
              {styles.map((s, i) => (
                <tr key={s.style.id} className={i === 0 ? "font-medium" : ""}>
                  <td className="whitespace-nowrap">{s.style.name}{tactic?.styleId === s.style.id ? <span className="text-muted text-xs"> (actual)</span> : ""}</td>
                  <td className="num">{s.fit?.toFixed(1) ?? "–"}</td>
                  <td className={`num ${edgeTone(s.matchup)}`}>{s.matchup > 0 ? "+" : ""}{s.matchup.toFixed(1)}</td>
                  <td className="num">{s.total.toFixed(1)}</td>
                  <td className="text-xs text-muted whitespace-normal">{s.reasons.join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Encaje: media de los atributos clave del estilo en tu XI (como en Táctica). Rival: puntos que suma o resta lo que el rival hace bien o mal contra ese estilo.</p>
      </section>
    </div>
  );
}
