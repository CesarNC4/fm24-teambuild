"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { ROLE_BY_ID, roleLabel, type RoleDef } from "@/lib/fm/roles";
import { bestRoles } from "@/lib/fm/scoring";
import { buildLineup } from "@/lib/fm/tactics";
import { STYLE_BY_ID } from "@/lib/fm/instructions";
import { DAY_LABEL, SESSION_BY_ID, UNIT_LABEL, WEEK_GOAL_LABEL, YOUTH_THEME_LABEL, buildWeek, buildYouthWeek, personalityTier, recommendFocus, recommendLoad, suggestMentoring, suggestTalks, youthWeekWarnings, type SessionCategory, type WeekGoal, type YouthTheme } from "@/lib/fm/training";
import { assessYouth, estimateGameYear } from "@/lib/fm/youth";
import { HIDDEN_LABEL, TIER_LABEL, findMediaStyles, findPersonality, hiddenProfile, personalityTierLevel, type HiddenKey } from "@/lib/fm/personalities";
import { useAppStore } from "@/lib/store";

const CAT_CLASS: Record<SessionCategory | "match", string> = {
  general: "bg-surface-2",
  tactica: "bg-attr-elite/15",
  ataque: "bg-attr-good/15",
  defensa: "bg-attr-mid/15",
  fisico: "bg-attr-low/15",
  tecnica: "bg-accent/15",
  extra: "bg-surface-2",
  match: "bg-accent text-accent-fg font-semibold",
};

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

  const tacticRole = useMemo(() => {
    const m = new Map<string, RoleDef>();
    if (!tactic || !players.length) return m;
    for (const s of buildLineup(tactic, players).slots) if (s.starter) m.set(s.starter.player.uid, s.role);
    return m;
  }, [tactic, players]);

  const individual = useMemo(
    () =>
      players
        .map((p) => {
          const role = tacticRole.get(p.uid) ?? (bestRoles(p, 1)[0] ? ROLE_BY_ID[bestRoles(p, 1)[0].roleId] : null);
          const focus = role ? recommendFocus(p, role) : [];
          return { p, role, focus, load: recommendLoad(p), starter: tacticRole.has(p.uid) };
        })
        .sort((a, b) => (a.p.age ?? 99) - (b.p.age ?? 99)),
    [players, tacticRole],
  );
  const youthIndividual = useMemo(() => {
    if (!isYouth) return [];
    const ctx = { firstTeam, tactic, squads, gameYear: estimateGameYear(firstTeam) };
    return players.map((p) => assessYouth(p, squad, ctx)).sort((a, b) => b.projection - a.projection);
  }, [isYouth, players, firstTeam, tactic, squads, squad]);
  const youthPlan = useMemo(
    () => (isYouth ? buildYouthWeek({ matchDays: week.matchDays, theme: (week.youthTheme as YouthTheme) ?? "general", competitive: !!squad?.competitive || (squad?.maxAge ?? 0) > 18 }) : []),
    [isYouth, week.matchDays, week.youthTheme, squad],
  );
  const youthWarnings = useMemo(
    () => (isYouth ? youthWeekWarnings({ matchDays: week.matchDays, theme: (week.youthTheme as YouthTheme) ?? "general", competitive: !!squad?.competitive || (squad?.maxAge ?? 0) > 18 }) : []),
    [isYouth, week.matchDays, week.youthTheme, squad],
  );

  const plan = useMemo(
    () => buildWeek({ styleId: tactic?.styleId ?? null, matchDays: week.matchDays, preseason: week.preseason, goal: (week.goal as WeekGoal) ?? "normal", weekIndex: week.weekIndex ?? 0 }),
    [tactic?.styleId, week],
  );
  const mentoring = useMemo(() => suggestMentoring(players, { youth: isYouth }), [players, isYouth]);
  const talks = useMemo(() => suggestTalks(players), [players]);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Entrenamiento</h1>
        <select className="bg-surface border border-border rounded px-2 py-1 text-sm" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
          {squads.filter((q) => q.kind !== "ojeados").map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <div className="flex gap-1 text-sm">
          {(["individual", "semana", "tutoria", "personalidad"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded border ${tab === t ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
              {t === "individual" ? "Individual" : t === "semana" ? "Semana de equipo" : t === "tutoria" ? "Tutorías" : "Personalidad y charlas"}
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
            <b>Rol a entrenar</b>: el de la táctica activa (o su mejor rol si no es titular). <b>Foco adicional</b>: el área con más déficit respecto a lo que el rol exige (clave → objetivo 15, preferible → 13);
            lo físico pesa más en jóvenes y casi nada a partir de los 30.
          </p>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr><th>Jugador</th><th className="num">Edad</th><th>Rol a entrenar</th><th>Foco adicional</th><th>Alternativa</th><th>Extras</th></tr>
              </thead>
              <tbody>
                {individual.map(({ p, role, focus, load, starter }) => (
                  <tr key={p.uid} className={starter ? "" : "opacity-75"}>
                    <td className="font-medium">{p.name}</td>
                    <td className="num">{p.age ?? "–"}</td>
                    <td className="text-xs">{role ? roleLabel(role) : "—"}</td>
                    {[0, 1].map((i) => {
                      const f = focus[i];
                      return (
                        <td key={i} className="text-xs">
                          {f ? (
                            <span title={f.detail.map((d) => `${ATTR_BY_KEY[d.key].es}: ${d.have ?? "?"} → ${d.target}`).join("\n") + (f.note ? `\n${f.note}` : "")}>
                              <b>{f.area.es}</b>{" "}
                              <span className="text-muted">
                                ({f.detail.filter((d) => d.have != null && d.have < d.target).map((d) => `${d.key} ${d.have}`).join(", ")})
                              </span>
                              {f.note && <span className="text-attr-mid"> *</span>}
                            </span>
                          ) : (
                            <span className="text-muted">{i === 0 ? "sin déficit claro" : "—"}</span>
                          )}
                        </td>
                      );
                    })}
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
            * nota sobre la edad en el tooltip. <b>Extras</b>: cuántas cosas además del rol (foco adicional, rasgo, pie débil) aguanta sin que la intensidad total pase de <i>Media</i>.
            Deja la intensidad individual en <i>Automática</i>; si el juego marca <i>Alta</i>, quita un extra. En el juego asigna a cada jugador rol y deber concretos, no «posición de juego».
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
          <div className="grid grid-cols-7 gap-1.5">
            {youthPlan.map((d) => (
              <div key={d.day} className="border border-border rounded-md overflow-hidden">
                <div className={`text-xs font-medium px-2 py-1 ${d.isMatch ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>{DAY_LABEL[d.day]}</div>
                <div className="p-1 space-y-1 min-h-[96px]">
                  {d.sessions.map((sid, i) => {
                    if (!sid) return <div key={i} className="h-6 rounded border border-dashed border-border/60" />;
                    if (sid === "match") return <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS.match}`}>Partido</div>;
                    const s = SESSION_BY_ID[sid];
                    return <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS[s.category]}`} title={s.en}>{s.es}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted space-y-1">
            {youthWarnings.map((w, i) => <p key={i} className="text-attr-mid">⚠ {w}</p>)}
            <p>
              Los filiales entrenan por temas (modelo del Ajax en Passion4FM): 3 meses de general al empezar, luego 3 de técnica y 3 de inteligencia; velocidad solo en semanas sin partido; físico y cohesión cuando hagan falta.
              {squad?.competitive || (squad?.maxAge ?? 0) > 18 ? " Este equipo prepara partidos (previa y análisis)." : " Sub-18: cada día es de una categoría, sin previa ni análisis (jonasmorais)."}
            </p>
          </div>
        </section>
      )}

      {tab === "semana" && !isYouth && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted">Días con partido:</span>
            {DAY_LABEL.map((d, i) => (
              <label key={d} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={week.matchDays.includes(i)} onChange={() => toggleDay(i)} /> {d}
              </label>
            ))}
            <label className="flex items-center gap-1 cursor-pointer ml-4">
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
          <div className="grid grid-cols-7 gap-1.5">
            {plan.map((d) => (
              <div key={d.day} className="border border-border rounded-md overflow-hidden">
                <div className={`text-xs font-medium px-2 py-1 ${d.isMatch ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>{DAY_LABEL[d.day]}</div>
                <div className="p-1 space-y-1 min-h-[96px]">
                  {d.sessions.map((sid, i) => {
                    if (!sid) return <div key={i} className="h-6 rounded border border-dashed border-border/60" />;
                    if (sid === "match") return <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS.match}`}>Partido</div>;
                    const s = SESSION_BY_ID[sid];
                    return (
                      <div key={i} className={`text-xs rounded px-1.5 py-1 ${CAT_CLASS[s.category]}`} title={s.en}>
                        {s.es}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted space-y-1">
            <p>
              Reglas (guías de jonasmorais y Passion4FM): recuperación + análisis el día después del partido; la carga sube dos días después y baja hacia el siguiente, alternando días fuertes y ligeros;
              físico nunca la víspera ni entre dos partidos; previa el día anterior. La sesión ofensiva de mitad de semana y la defensiva del final rotan al cambiar el número de semana.
              Con dos partidos, si usaste a los 22 jugadores cambia el «Descanso» del día siguiente por otra «Recuperación». Pretemporada sin partidos marcados = semanas 1-2 (solo físico y cohesión).
            </p>
            <p>Las sesiones de ataque/defensa/físico son las del estilo de la táctica activa{tactic?.styleId ? ` (${STYLE_BY_ID[tactic.styleId].name})` : " (sin estilo: genéricas)"}. Los nombres en inglés (tooltip) son los del juego.</p>
          </div>
        </section>
      )}

      {tab === "personalidad" && (
        <section className="space-y-4">
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted">
                Cada personalidad fija rangos de atributos ocultos (guía de FM Scout). El trato con la prensa acota otros: <i>Evasivo</i> o <i>Reservado</i> esconden profesionalidad ≥15 aunque la personalidad sea neutra.
                Los menores de 24 años absorben la personalidad del vestuario y de sus mentores.
              </p>
              <div className="overflow-auto border border-border rounded-md">
                <table className="tbl w-full">
                  <thead>
                    <tr><th>Jugador</th><th className="num">Edad</th><th>Personalidad</th><th>Nivel</th><th>Prensa</th><th>Ocultos (rango)</th></tr>
                  </thead>
                  <tbody>
                    {personalities.map(({ p, def, media, hidden, tier }) => (
                      <tr key={p.uid}>
                        <td className="font-medium">{p.name}</td>
                        <td className="num">{p.age ?? "–"}</td>
                        <td className="text-xs" title={def?.note}>{p.personality ?? "—"}{!def && p.personality && <span className="text-attr-mid" title="No está en el catálogo; avísame para añadirla"> ?</span>}</td>
                        <td className={`text-xs ${tier >= 6 ? "text-attr-elite" : tier === 5 ? "text-attr-good" : tier <= 1 ? "text-attr-low" : tier === 2 ? "text-attr-mid" : "text-muted"}`}>{TIER_LABEL[tier]}</td>
                        <td className="text-xs" title={media.map((m) => `${m.es}: ${m.note}`).join("\n")}>{media.length ? media.map((m) => m.es).join(", ") : p.mediaHandling ?? "—"}</td>
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
            </div>
            <div className="bg-surface border border-border rounded-lg p-3 text-sm space-y-2 self-start">
              <h3 className="font-medium">Charlas del mes</h3>
              <p className="text-xs text-muted">Una vez al mes: elogia la media ≥7,5 y critica la ≤6,5 (guía de jonasmorais). Se usa la media de la exportación.</p>
              {talks.length === 0 && <p className="text-xs text-muted">Sin medias en la exportación o todas entre 6,5 y 7,5.</p>}
              {talks.map((t) => (
                <div key={t.player.uid} className="text-xs flex items-start gap-2">
                  <span className={t.kind === "elogio" ? "text-attr-good" : "text-attr-low"}>{t.kind === "elogio" ? "▲" : "▼"}</span>
                  <span className="flex-1">
                    {t.player.name} <span className="text-muted">{t.rating.toFixed(2)}</span>
                    {t.caution && <div className="text-attr-mid">{t.caution}</div>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "tutoria" && (
        <section className="space-y-3">
          <p className="text-xs text-muted">
            {isYouth
              ? "En un filial no hay veteranos: mentores ≥19 años con personalidad buena y Determinación ≥13 o Liderazgo ≥10; aprendices los demás ≤23 con personalidad mejorable. Si un canterano con potencial alto tiene mala personalidad, súbelo al primer equipo para tutorizarlo allí."
              : "Mentores: ≥24 años, personalidad buena o mejor y Determinación o Liderazgo ≥14 (hasta tres por unidad, ordenados por personalidad). Aprendices: ≤23 años con personalidad por debajo de buena o Determinación <12. La guía recomienda tres mentores en el primer equipo (uno por línea); aquí van agrupados por unidad para que compartan sesiones. Los ambiciosos quedan fuera: contagian lealtad baja."}
          </p>
          {mentoring.length === 0 && <p className="text-sm text-muted">No hay aprendices que necesiten tutoría.</p>}
          <div className="grid md:grid-cols-2 gap-3">
            {mentoring.map((g) => (
              <div key={g.unit} className="bg-surface border border-border rounded-lg p-3 text-sm">
                <h3 className="font-medium mb-2">{UNIT_LABEL[g.unit]}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted mb-1">Mentores</div>
                    {g.mentors.length === 0 && <div className="text-attr-mid">Ninguno válido en esta unidad: usa uno de otra unidad o ficha un veterano con buena personalidad.</div>}
                    {g.mentors.map((p) => (
                      <div key={p.uid}>{p.name} <span className="text-muted">{p.age} · {p.personality} ({TIER_LABEL[personalityTierLevel(p.personality)]}) · Det {p.attrs.Det?.value} Lid {p.attrs.Ldr?.value}</span></div>
                    ))}
                  </div>
                  <div>
                    <div className="text-muted mb-1">Aprendices</div>
                    {g.mentees.map((p) => (
                      <div key={p.uid}>
                        {p.name} <span className={personalityTier(p.personality) === "mala" ? "text-attr-low" : "text-muted"}>{p.age} · {p.personality} · Det {p.attrs.Det?.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {g.notes.length > 0 && <div className="mt-2 text-xs text-attr-mid space-y-0.5">{g.notes.map((n, i) => <div key={i}>{n}</div>)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
