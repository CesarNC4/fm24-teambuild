"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { ROLE_BY_ID, roleLabel, type RoleDef } from "@/lib/fm/roles";
import { bestRoles } from "@/lib/fm/scoring";
import { buildLineup } from "@/lib/fm/tactics";
import { STYLE_BY_ID } from "@/lib/fm/instructions";
import {
  DAY_LABEL, EFFECT_LABEL, FAMILIARITY_LABEL, GROUP_LABEL, RIVAL_LEVEL_LABEL, SESSION_BY_ID, SESSION_CAT_LABEL, UNIT_LABEL, WEEK_GOAL_LABEL, YOUTH_THEME_LABEL,
  buildWeek, buildYouthWeek, clearFocus, needSessions, personalityTier, recommendIntensity, recommendLoad, suggestMentoring, tacticSessions, unitOf, unitOfSlot, youthWeekWarnings,
  type DayPlan, type Effect, type MatchInfo, type RivalLevel, type SessionCat, type Unit, type WeekGoal, type YouthTheme,
} from "@/lib/fm/training";
import { assessAllYouth, assessYouth, estimateGameYear } from "@/lib/fm/youth";
import { HIDDEN_LABEL, TIER_LABEL, findMediaStyles, findPersonality, hiddenProfile, personalityTierLevel, type HiddenKey } from "@/lib/fm/personalities";
import { useAppStore } from "@/lib/store";

const CAT_CLASS: Record<SessionCat | "match", string> = {
  general: "bg-surface-2",
  ofensiva: "bg-attr-good/15",
  defensiva: "bg-attr-mid/15",
  tecnica: "bg-accent/15",
  tactica: "bg-attr-elite/15",
  porteria: "bg-attr-mid/10",
  fisico: "bg-attr-low/15",
  "balon-parado": "bg-surface-2",
  preparacion: "bg-attr-elite/10",
  extracurricular: "bg-surface-2",
  partido: "bg-surface-2 italic",
  match: "bg-accent text-accent-fg font-semibold",
};

const EFFECT_WORD = (v: number) => (v >= 2 ? "enorme aumento" : v === 1 ? "aumento" : v === -1 ? "reducción" : "enorme reducción");

function sessionTitle(id: string): string {
  const s = SESSION_BY_ID[id];
  const lines = [`${SESSION_CAT_LABEL[s.cat]} · ${s.mode === "unidades" ? "por unidades" : "equipo"}`];
  for (const p of s.parts) {
    if (!p.pct) continue;
    lines.push(`${GROUP_LABEL[p.group]} ${p.pct} %: ${p.attrs === "roles" ? "roles individuales" : p.attrs.length ? p.attrs.map((k) => ATTR_BY_KEY[k].es).join(", ") : "—"}`);
  }
  if (s.familiarity.length) lines.push(`Familiaridad: ${s.familiarity.map((f) => FAMILIARITY_LABEL[f]).join(", ")}`);
  const eff = Object.entries(s.effects) as [Effect, number][];
  if (eff.length) lines.push(eff.map(([k, v]) => `${EFFECT_LABEL[k]}: ${EFFECT_WORD(v)}`).join(" · "));
  if (s.note) lines.push(s.note);
  return lines.join("\n");
}

function DayGrid({ days }: { days: DayPlan[] }) {
  const maxLoad = Math.max(4, ...days.map((d) => d.load));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => (
        <div key={d.day} className="border border-border rounded-md overflow-hidden">
          <div className={`text-xs font-medium px-2 py-1 flex justify-between ${d.isMatch ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>
            <span>{DAY_LABEL[d.day]}</span>
            {d.match && <span className="font-normal">{d.match.home ? "casa" : "fuera"}</span>}
          </div>
          <div className="p-1 space-y-1 min-h-[96px]">
            {d.sessions.map((sid, i) => {
              if (!sid) return <div key={i} className="h-6 rounded border border-dashed border-border/60" />;
              if (sid === "match") return <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS.match}`}>Partido{d.match ? ` · ${RIVAL_LEVEL_LABEL[d.match.rival].toLowerCase()}` : ""}</div>;
              const s = SESSION_BY_ID[sid];
              return <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS[s.cat]}`} title={sessionTitle(sid)}>{s.es}{s.auto ? <span className="text-muted"> (juego)</span> : null}</div>;
            })}
          </div>
          {!d.isMatch && (
            <div className="px-1 pb-1" title={`Carga física ${d.load}: suma de riesgo de lesión, fatiga y bajada de condición`}>
              <div className="h-1.5 rounded bg-surface-2 overflow-hidden">
                <div className={`h-full ${d.load >= 4 ? "bg-attr-low" : d.load >= 2 ? "bg-attr-mid" : "bg-attr-good"}`} style={{ width: `${(d.load / maxLoad) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type Tab = "individual" | "semana" | "tutoria" | "personalidad";

export default function TrainingPage() {
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const [squadId, setSquadId] = useState<string>("plantilla");
  const squad = squads.find((q) => q.id === squadId) ?? squads[0];
  const isYouth = squad?.kind === "filial";
  const firstTeam = useMemo(() => allPlayers.plantilla ?? [], [allPlayers.plantilla]);
  const players = useMemo(() => allPlayers[squadId] ?? [], [allPlayers, squadId]);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const week = useAppStore((s) => s.trainingWeek);
  const setWeek = useAppStore((s) => s.setTrainingWeek);
  const [tab, setTab] = useState<Tab>("individual");

  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const lineup = useMemo(() => (tactic && players.length ? buildLineup(tactic, players) : null), [tactic, players]);

  const tacticSlot = useMemo(() => {
    const m = new Map<string, { role: RoleDef; unit: Unit }>();
    for (const s of lineup?.slots ?? []) if (s.starter) m.set(s.starter.player.uid, { role: s.role, unit: unitOfSlot(s.slot.slot) });
    return m;
  }, [lineup]);

  const individual = useMemo(
    () =>
      players
        .map((p) => {
          const slot = tacticSlot.get(p.uid);
          const best = bestRoles(p, 1)[0];
          const role = slot?.role ?? (best ? ROLE_BY_ID[best.roleId] : null);
          return { p, role, unit: slot?.unit ?? unitOf(p), starter: !!slot, focus: role ? clearFocus(p, role) : null, load: recommendLoad(p), intensity: recommendIntensity(p) };
        })
        .sort((a, b) => ["portero", "defensa", "ataque"].indexOf(a.unit) - ["portero", "defensa", "ataque"].indexOf(b.unit) || Number(b.starter) - Number(a.starter) || (a.p.age ?? 99) - (b.p.age ?? 99)),
    [players, tacticSlot],
  );
  const youthIndividual = useMemo(() => {
    if (!isYouth) return [];
    const ctx = { firstTeam, tactic, squads, gameYear: estimateGameYear(firstTeam) };
    return players.map((p) => assessYouth(p, squad, ctx)).sort((a, b) => b.projection - a.projection);
  }, [isYouth, players, firstTeam, tactic, squads, squad]);
  const youthOpts = useMemo(() => ({ matchDays: week.matchDays, theme: (week.youthTheme as YouthTheme) ?? "general", competitive: !!squad?.competitive || (squad?.maxAge ?? 0) > 18 }), [week.matchDays, week.youthTheme, squad]);
  const youthPlan = useMemo(() => (isYouth ? buildYouthWeek(youthOpts) : []), [isYouth, youthOpts]);
  const youthWarnings = useMemo(() => (isYouth ? youthWeekWarnings(youthOpts) : []), [isYouth, youthOpts]);

  const tSessions = useMemo(() => tacticSessions(tactic), [tactic]);
  const needs = useMemo(() => needSessions(lineup), [lineup]);
  const plan = useMemo(
    () => buildWeek({ matchDays: week.matchDays, matchInfo: week.matchInfo, prevSunday: week.prevSunday, nextMonday: week.nextMonday, preseason: week.preseason, goal: (week.goal as WeekGoal) ?? "normal", weekIndex: week.weekIndex ?? 0, tactic: tSessions, needs }),
    [week, tSessions, needs],
  );
  const promote = useMemo(
    () => (isYouth ? [] : assessAllYouth(allPlayers, squads, tactic).filter((a) => a.squad?.kind === "filial" && (a.destination === "primer-equipo" || a.destination === "rotacion" || (a.fit?.rank ?? 99) <= 2))),
    [isYouth, allPlayers, squads, tactic],
  );
  const mentoring = useMemo(() => suggestMentoring(players, { youth: isYouth }), [players, isYouth]);
  const personalities = useMemo(
    () =>
      players
        .map((p) => ({ p, def: findPersonality(p.personality), media: findMediaStyles(p.mediaHandling), hidden: hiddenProfile(p), tier: personalityTierLevel(p.personality) }))
        .sort((a, b) => b.tier - a.tier || (a.p.age ?? 0) - (b.p.age ?? 0)),
    [players],
  );

  if (hydrated && firstTeam.length === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.
      </div>
    );
  }

  const toggleDay = (d: number) => {
    const set = new Set(week.matchDays);
    if (set.has(d)) set.delete(d); else set.add(d);
    setWeek({ ...week, matchDays: [...set].sort() });
  };
  const matchInfo = (d: number): MatchInfo => week.matchInfo?.[String(d)] ?? { home: true, rival: "igual" };
  const setMatchInfo = (d: number, patch: Partial<MatchInfo>) => setWeek({ ...week, matchInfo: { ...(week.matchInfo ?? {}), [String(d)]: { ...matchInfo(d), ...patch } } });
  const units: Unit[] = ["portero", "defensa", "ataque"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Entrenamiento</h1>
        <select className="bg-surface border border-border rounded px-2 py-1 text-sm" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
          {squads.filter((q) => q.kind === "primer" || q.kind === "filial").map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <div className="flex gap-1 text-sm">
          {(["individual", "semana", "tutoria", "personalidad"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded border ${tab === t ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
              {t === "individual" ? "Individual" : t === "semana" ? "Semana de equipo" : t === "tutoria" ? "Grupos de aprendizaje" : "Personalidad"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">Táctica activa: {tactic?.name ?? "—"}{tactic?.styleId ? ` · ${STYLE_BY_ID[tactic.styleId].name}` : ""}</span>
      </div>

      {tab === "individual" && isYouth && (
        <section className="space-y-2">
          <p className="text-xs text-muted">
            <b>Rol a entrenar</b>: el hueco de la táctica del primer equipo donde más cerca está de entrar (ver Juveniles). <b>Intensidad</b> según la guía de juveniles: doble para ≤23 con determinación ≥15, profesionales o sin minutos;
            revisa fatiga cada dos semanas. Hasta los 20, atributos antes que rasgos.
          </p>
          {players.length === 0 && <p className="text-sm text-muted">Este filial no tiene jugadores importados.</p>}
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr><th>Jugador</th><th className="num">Edad</th><th>Rol a entrenar</th><th>Foco adicional</th><th>Alternativa</th><th>Intensidad</th><th>Rasgos</th></tr>
              </thead>
              <tbody>
                {youthIndividual.map((a) => {
                  const p = a.player;
                  return (
                    <tr key={p.uid}>
                      <td className="font-medium">{p.name}</td>
                      <td className="num">{p.age ?? "–"}</td>
                      <td className="text-xs">{roleLabel(a.training.role)}{a.fit ? <span className="text-muted"> · {a.fit.rank}º del 1º eq.</span> : null}</td>
                      {[0, 1].map((i) => {
                        const f = a.training.focus[i];
                        return (
                          <td key={i} className="text-xs">
                            {f ? (
                              <span title={f.detail.map((d) => `${ATTR_BY_KEY[d.key].es}: ${d.have ?? "?"} → ${d.target}`).join("\n") + (f.note ? `\n${f.note}` : "")}>
                                <b>{f.area.es}</b> <span className="text-muted">({f.detail.filter((d) => d.have != null && d.have < d.target).map((d) => `${d.key} ${d.have}`).join(", ")})</span>
                              </span>
                            ) : (
                              <span className="text-muted">{i === 0 ? "sin déficit claro" : "—"}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-xs" title={a.training.intensityWhy}>
                        <span className={a.training.intensity === "doble" ? "text-attr-good" : a.training.intensity === "media" ? "text-attr-mid" : ""}>{a.training.intensity}</span>
                      </td>
                      <td className="text-xs text-muted">{a.training.traitsPhase ? "sí (≥20)" : "todavía no"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "individual" && !isYouth && (
        <section className="space-y-2">
          <p className="text-xs text-muted">
            <b>Rol a entrenar</b>: el rol y deber exactos de su hueco en la táctica activa; los suplentes, su mejor rol. En el juego pon ese rol concreto, no «Posición en que juega».
            <b> Foco adicional</b>: por defecto ninguno (los PDF coinciden en que diluye el entrenamiento del rol). Solo se propone ante una carencia clara en el rol y en menores de 30.
          </p>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr><th>Jugador</th><th className="num">Edad</th><th>Unidad</th><th>Rol a entrenar</th><th>Intensidad</th><th>Foco adicional</th><th>Extras</th></tr>
              </thead>
              <tbody>
                {individual.map(({ p, role, unit, focus, load, intensity, starter }) => (
                  <tr key={p.uid} className={starter ? "" : "opacity-75"}>
                    <td className="font-medium">{p.name}</td>
                    <td className="num">{p.age ?? "–"}</td>
                    <td className="text-xs text-muted">{UNIT_LABEL[unit].replace("Unidad ", "")}</td>
                    <td className="text-xs">{role ? roleLabel(role) : "—"}{!starter && <span className="text-muted"> · suplente</span>}</td>
                    <td className="text-xs" title={intensity.why}><span className={intensity.level === "Doble" ? "text-attr-good" : ""}>{intensity.level}</span></td>
                    <td className="text-xs">
                      {focus ? (
                        <span title={focus.detail.map((d) => `${ATTR_BY_KEY[d.key].es}: ${d.have ?? "?"} → ${d.target}`).join("\n") + `\nOpcional: el foco resta del entrenamiento del rol y suma carga.${focus.note ? `\n${focus.note}` : ""}`}>
                          <span className="text-attr-mid">opcional:</span> <b>{focus.area.es}</b>{" "}
                          <span className="text-muted">({focus.detail.filter((d) => d.have != null && d.have < d.target).map((d) => `${ATTR_BY_KEY[d.key].es} ${d.have}`).join(", ")})</span>
                        </span>
                      ) : (
                        <span className="text-muted">sin foco</span>
                      )}
                    </td>
                    <td className="text-xs" title={load.why}>
                      <span className={load.extras === 2 ? "text-attr-good" : load.extras === 0 ? "text-attr-low" : "text-attr-mid"}>
                        {load.extras === 2 ? "foco + rasgo" : load.extras === 1 ? "solo uno" : "ninguno"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            <b>Intensidad</b>: automática (el juego da descanso según el corazón) y doble para los ≤21 sanos. <b>Extras</b>: cuántas cosas además del rol (foco, rasgo, pierna mala) aguanta sin que la carga individual pase de <i>Media</i>; esa regla solo importa cuando se suman.
          </p>
        </section>
      )}

      {tab === "semana" && isYouth && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted">Días con partido:</span>
            {DAY_LABEL.map((d, i) => (
              <label key={d} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={week.matchDays.includes(i)} onChange={() => toggleDay(i)} /> {d}
              </label>
            ))}
            <select className="bg-surface border border-border rounded px-2 py-1 ml-4" value={week.youthTheme ?? "general"} onChange={(e) => setWeek({ ...week, youthTheme: e.target.value })}>
              {(Object.keys(YOUTH_THEME_LABEL) as YouthTheme[]).map((t) => <option key={t} value={t}>{YOUTH_THEME_LABEL[t]}</option>)}
            </select>
          </div>
          <DayGrid days={youthPlan} />
          <div className="text-xs text-muted space-y-1">
            {youthWarnings.map((w, i) => <p key={i} className="text-attr-mid">⚠ {w}</p>)}
            <p>
              Los filiales entrenan por temas (modelo del Ajax en Passion4FM): 3 meses de general al empezar, luego 3 de técnica y 3 de inteligencia; velocidad solo en semanas sin partido; físico y cohesión cuando hagan falta.
              {youthOpts.competitive ? " Este equipo prepara partidos (tácticas y revisión)." : " Sub-18: cada día es de una categoría, sin preparación de partido."}
            </p>
          </div>
        </section>
      )}

      {tab === "semana" && !isYouth && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted">Días con partido:</span>
            {DAY_LABEL.map((d, i) => (
              <label key={d} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={week.matchDays.includes(i)} onChange={() => toggleDay(i)} /> {d}
              </label>
            ))}
            <label className="flex items-center gap-1 cursor-pointer text-xs text-muted" title="Si jugaste el domingo anterior, el lunes es día de recuperación">
              <input type="checkbox" checked={week.prevSunday ?? week.matchDays.includes(6)} onChange={(e) => setWeek({ ...week, prevSunday: e.target.checked })} /> partido el domingo anterior
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-muted" title="Si juegas el lunes siguiente, el domingo es víspera">
              <input type="checkbox" checked={week.nextMonday ?? week.matchDays.includes(0)} onChange={(e) => setWeek({ ...week, nextMonday: e.target.checked })} /> partido el lunes siguiente
            </label>
          </div>
          {week.matchDays.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              {week.matchDays.map((d) => (
                <div key={d} className="flex items-center gap-1 border border-border rounded px-2 py-1">
                  <b>{DAY_LABEL[d]}</b>
                  <select className="bg-surface border border-border rounded px-1" value={matchInfo(d).home ? "casa" : "fuera"} onChange={(e) => setMatchInfo(d, { home: e.target.value === "casa" })}>
                    <option value="casa">en casa</option>
                    <option value="fuera">fuera</option>
                  </select>
                  <select className="bg-surface border border-border rounded px-1" value={matchInfo(d).rival} onChange={(e) => setMatchInfo(d, { rival: e.target.value as RivalLevel })}>
                    {(Object.keys(RIVAL_LEVEL_LABEL) as RivalLevel[]).map((r) => <option key={r} value={r}>{RIVAL_LEVEL_LABEL[r]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={week.preseason} onChange={(e) => setWeek({ ...week, preseason: e.target.checked })} /> Pretemporada
            </label>
            <select className="bg-surface border border-border rounded px-2 py-1" value={week.goal ?? "normal"} onChange={(e) => setWeek({ ...week, goal: e.target.value })}>
              {(Object.keys(WEEK_GOAL_LABEL) as WeekGoal[]).map((g) => <option key={g} value={g}>{WEEK_GOAL_LABEL[g]}</option>)}
            </select>
            <label className="flex items-center gap-1">
              Semana
              <button className="px-1.5 rounded border border-border hover:bg-surface-2" onClick={() => setWeek({ ...week, weekIndex: Math.max(0, (week.weekIndex ?? 0) - 1) })}>−</button>
              <span className="w-4 text-center">{(week.weekIndex ?? 0) + 1}</span>
              <button className="px-1.5 rounded border border-border hover:bg-surface-2" onClick={() => setWeek({ ...week, weekIndex: (week.weekIndex ?? 0) + 1 })}>+</button>
            </label>
          </div>
          <DayGrid days={plan.days} />
          {plan.warnings.length > 0 && <div className="text-xs space-y-0.5">{plan.warnings.map((w, i) => <p key={i} className="text-attr-mid">⚠ {w}</p>)}</div>}
          <div className="grid lg:grid-cols-2 gap-3 text-xs">
            <div className="bg-surface border border-border rounded-lg p-3 space-y-1">
              <h3 className="font-medium text-sm">Por qué estas sesiones</h3>
              {plan.reasons.filter((r) => plan.days.some((d) => d.sessions.includes(r.id))).map((r) => (
                <p key={r.id}><b title={sessionTitle(r.id)}>{SESSION_BY_ID[r.id].es}</b> <span className="text-muted">— {r.why}</span></p>
              ))}
              <p className="text-muted pt-1">
                Rutina fija: Revisión de partido + Recuperación el día después; en la víspera, Tácticas de partido, balón parado y el Enfoque del partido que pone el juego (fuera, el Viaje ocupa un hueco).
                Pasa el ratón por una sesión para ver a quién va, qué atributos trabaja cada grupo, la familiaridad que sube y sus efectos. La barra de cada día es la carga física.
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <h3 className="font-medium text-sm">Unidades (como en el juego)</h3>
              {units.map((u) => {
                const xi = (lineup?.slots ?? []).filter((s) => s.starter && unitOfSlot(s.slot.slot) === u).map((s) => s.starter!.player.name);
                const rest = players.filter((p) => !tacticSlot.has(p.uid) && unitOf(p) === u).map((p) => p.name);
                const up = promote.filter((a) => unitOf(a.player) === u);
                return (
                  <div key={u}>
                    <div className="font-medium">{UNIT_LABEL[u]}</div>
                    <div>{xi.join(", ") || "—"}{rest.length ? <span className="text-muted"> · {rest.join(", ")}</span> : null}</div>
                    {up.length > 0 && <div className="text-attr-good">Subir de filial a esta unidad: {up.map((a) => `${a.player.name} (${a.squad?.name})`).join(", ")}</div>}
                  </div>
                );
              })}
              <p className="text-muted">Defensiva hasta el MCD; de ataque desde el MC. Los juveniles marcados pueden entrenar con el primer equipo desde la pantalla de unidades sin cambiar de plantilla.</p>
            </div>
          </div>
        </section>
      )}

      {tab === "personalidad" && (
        <section className="space-y-2">
          <p className="text-xs text-muted">
            Cada personalidad fija rangos de atributos ocultos (guía de FM Scout). El trato con la prensa acota otros: <i>Evasivo</i> o <i>Reservado</i> esconden profesionalidad ≥15 aunque la personalidad sea neutra.
            Los menores de 24 años absorben la personalidad del vestuario y de sus tutores.
          </p>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr><th>Jugador</th><th className="num">Edad</th><th>Personalidad</th><th>Nivel</th><th>Prensa</th><th>Estructura</th><th>Ocultos (rango)</th></tr>
              </thead>
              <tbody>
                {personalities.map(({ p, def, media, hidden, tier }) => (
                  <tr key={p.uid}>
                    <td className="font-medium">{p.name}</td>
                    <td className="num">{p.age ?? "–"}</td>
                    <td className="text-xs" title={def?.note}>{p.personality ?? "—"}{!def && p.personality && <span className="text-attr-mid" title="No está en el catálogo; avísame para añadirla"> ?</span>}</td>
                    <td className={`text-xs ${tier >= 6 ? "text-attr-elite" : tier === 5 ? "text-attr-good" : tier <= 1 ? "text-attr-low" : tier === 2 ? "text-attr-mid" : "text-muted"}`}>{TIER_LABEL[tier]}</td>
                    <td className="text-xs" title={media.map((m) => `${m.es}: ${m.note}`).join("\n")}>{media.length ? media.map((m) => m.es).join(", ") : p.mediaHandling ?? "—"}</td>
                    <td className="text-xs text-muted">{p.hierarchy ?? "—"}{p.socialGroup ? ` · ${p.socialGroup}` : ""}</td>
                    <td className="text-xs text-muted">
                      {(Object.entries(hidden) as [HiddenKey, [number, number]][]).map(([k, [lo, hi]]) => (
                        <span key={k} className={`inline-block mr-1.5 ${lo >= 15 ? "text-attr-good" : hi <= 10 ? "text-attr-low" : ""}`} title={HIDDEN_LABEL[k]}>{k} {lo === hi ? lo : `${lo}-${hi}`}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Ocultos: Amb ambición · Det determinación · Loy lealtad · Pre presión · Pro profesionalidad · Spo deportividad · Tem temperamento · Ctr polémica. Verde ≥15, rojo ≤10.</p>
        </section>
      )}

      {tab === "tutoria" && (
        <section className="space-y-3">
          <p className="text-xs text-muted">
            Cada grupo: un tutor y como mucho 3 jóvenes de la misma unidad.{" "}
            {mentoring.usedHierarchy
              ? "Tutores: Líder del equipo o Jugador muy influyente (columna Estructura) con buena personalidad; si no hay, veteranos con Determinación o Liderazgo altos."
              : "La exportación no trae la columna Estructura: se eligen tutores de ≥24 años con buena personalidad y Determinación o Liderazgo ≥14. Añade «Estructura» a la vista de plantilla para usar la jerarquía real."}
            {" "}Aprendices: ≤23 años con personalidad por debajo de buena o Determinación &lt;12. Los ambiciosos no tutorizan: contagian lealtad baja.
          </p>
          {mentoring.groups.length === 0 && <p className="text-sm text-muted">No hay aprendices que necesiten grupo.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mentoring.groups.map((g) => (
              <div key={g.mentor.uid} className="bg-surface border border-border rounded-lg p-3 text-sm">
                <div className="text-xs text-muted">{UNIT_LABEL[g.unit]}</div>
                <h3 className="font-medium">{g.mentor.name} <span className="text-xs text-muted font-normal">{g.mentor.age} · {g.mentor.personality} ({TIER_LABEL[personalityTierLevel(g.mentor.personality)]}){g.mentor.hierarchy ? ` · ${g.mentor.hierarchy}` : ""} · Det {g.mentor.attrs.Det?.value} Lid {g.mentor.attrs.Ldr?.value}</span></h3>
                <div className="text-xs mt-1 space-y-0.5">
                  {g.mentees.map((p) => (
                    <div key={p.uid}>{p.name} <span className={personalityTier(p.personality) === "mala" ? "text-attr-low" : "text-muted"}>{p.age} · {p.personality} · Det {p.attrs.Det?.value}</span></div>
                  ))}
                </div>
                {g.notes.length > 0 && <div className="mt-2 text-xs text-attr-mid space-y-0.5">{g.notes.map((n, i) => <div key={i}>{n}</div>)}</div>}
              </div>
            ))}
          </div>
          {mentoring.waiting.length > 0 && (
            <p className="text-xs text-attr-mid">Sin grupo por falta de tutores en su unidad: {mentoring.waiting.map((p) => p.name).join(", ")}. Usa un tutor de otra unidad o ficha un veterano con buena personalidad.</p>
          )}
        </section>
      )}
    </div>
  );
}
