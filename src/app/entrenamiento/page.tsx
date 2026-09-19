"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { ROLE_BY_ID, roleLabel, type RoleDef } from "@/lib/fm/roles";
import { bestRoles } from "@/lib/fm/scoring";
import { buildLineup } from "@/lib/fm/tactics";
import { STYLE_BY_ID } from "@/lib/fm/instructions";
import { DAY_LABEL, SESSION_BY_ID, UNIT_LABEL, buildWeek, personalityTier, recommendFocus, recommendIntensity, suggestMentoring, type SessionCategory } from "@/lib/fm/training";
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

type Tab = "individual" | "semana" | "tutoria";

export default function TrainingPage() {
  const players = useAppStore((s) => s.players.plantilla);
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
          return { p, role, focus, intensity: recommendIntensity(p), starter: tacticRole.has(p.uid) };
        })
        .sort((a, b) => (a.p.age ?? 99) - (b.p.age ?? 99)),
    [players, tacticRole],
  );

  const plan = useMemo(() => buildWeek({ styleId: tactic?.styleId ?? null, matchDays: week.matchDays, preseason: week.preseason }), [tactic?.styleId, week]);
  const mentoring = useMemo(() => suggestMentoring(players), [players]);

  if (hydrated && players.length === 0) {
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
        <div className="flex gap-1 text-sm">
          {(["individual", "semana", "tutoria"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded border ${tab === t ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
              {t === "individual" ? "Individual" : t === "semana" ? "Semana de equipo" : "Tutorías"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">Táctica activa: {tactic?.name ?? "—"}{tactic?.styleId ? ` · ${STYLE_BY_ID[tactic.styleId].name}` : ""}</span>
      </div>

      {tab === "individual" && (
        <section className="space-y-2">
          <p className="text-xs text-muted">
            <b>Rol a entrenar</b>: el de la táctica activa (o su mejor rol si no es titular). <b>Foco adicional</b>: el área con más déficit respecto a lo que el rol exige (clave → objetivo 15, preferible → 13);
            lo físico pesa más en jóvenes y casi nada a partir de los 30.
          </p>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr><th>Jugador</th><th className="num">Edad</th><th>Rol a entrenar</th><th>Foco adicional</th><th>Alternativa</th><th>Intensidad</th></tr>
              </thead>
              <tbody>
                {individual.map(({ p, role, focus, intensity, starter }) => (
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
                    <td className="text-xs" title={intensity.why}>
                      <span className={intensity.level === "doble" ? "text-attr-good" : intensity.level === "media" ? "text-attr-mid" : ""}>{intensity.level}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">* nota sobre la edad en el tooltip. Intensidad: doble para ≤23 con buena forma física natural; media para ≥31 o forma física natural baja.</p>
        </section>
      )}

      {tab === "semana" && (
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
            <p>Reglas: previa el día antes del partido; recuperación + análisis el día después; máximo dos sesiones físicas y nunca la víspera; con dos partidos se aligera; en pretemporada se carga físico y cohesión.</p>
            <p>Las sesiones de ataque/defensa/físico son las del estilo de la táctica activa{tactic?.styleId ? ` (${STYLE_BY_ID[tactic.styleId].name})` : " (sin estilo: genéricas)"}. Los nombres en inglés (tooltip) son los del juego.</p>
          </div>
        </section>
      )}

      {tab === "tutoria" && (
        <section className="space-y-3">
          <p className="text-xs text-muted">
            Mentores: ≥24 años, personalidad buena y Determinación o Liderazgo ≥14. Aprendices: ≤23 años con personalidad mejorable o Determinación &lt;12.
            Agrupados por unidad; en el juego crea un grupo por unidad con 1-2 mentores y 2-4 aprendices.
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
                      <div key={p.uid}>{p.name} <span className="text-muted">{p.age} · {p.personality} · Det {p.attrs.Det?.value} Lid {p.attrs.Ldr?.value}</span></div>
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
