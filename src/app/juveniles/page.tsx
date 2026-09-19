"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { POSITION_LABEL, ROLE_BY_ID, roleLabel } from "@/lib/fm/roles";
import { TIER_LABEL, type PersonalityTierLevel } from "@/lib/fm/personalities";
import { DESTINATION_LABEL, LOAN_LABEL, assessAllYouth, positionCoverage, type Destination, type YouthAssessment } from "@/lib/fm/youth";
import { useAppStore } from "@/lib/store";
import { ScoreBadge } from "@/components/AttrCell";

const DEST_CLASS: Record<Destination, string> = {
  "primer-equipo": "bg-attr-elite/15 text-attr-elite",
  rotacion: "bg-attr-good/15 text-attr-good",
  cesion: "bg-accent/15",
  filial: "bg-surface-2 text-muted",
  salida: "bg-attr-low/15 text-attr-low",
};

export default function YouthPage() {
  const players = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const [filter, setFilter] = useState<string>("todos");
  const [open, setOpen] = useState<string | null>(null);

  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const filiales = squads.filter((q) => q.kind === "filial");
  const all = useMemo(() => assessAllYouth(players, squads, tactic), [players, squads, tactic]);
  const list = filter === "todos" ? all : all.filter((a) => (filter === "alertas" ? a.alerts.length > 0 : a.squad?.id === filter));
  const coverage = useMemo(() => positionCoverage(all), [all]);

  if (hydrated && (players.plantilla?.length ?? 0) === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> y después los filiales.
      </div>
    );
  }

  const counts = (["primer-equipo", "rotacion", "cesion", "filial", "salida"] as Destination[]).map((d) => ({ d, n: all.filter((a) => a.destination === d).length }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Juveniles</h1>
        <div className="flex gap-1 text-sm flex-wrap">
          {[{ id: "todos", name: "Todos" }, ...squads.filter((q) => q.kind !== "ojeados").map((q) => ({ id: q.id, name: q.name })), { id: "alertas", name: "Con alertas" }].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1 rounded border ${filter === f.id ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}>
              {f.name}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">Comparado con el primer equipo en {tactic ? tactic.name : "4-2-3-1 por defecto"}</span>
      </div>

      {filiales.length === 0 && (
        <p className="text-sm text-attr-mid">
          No hay filiales importados: solo se evalúan los ≤23 del primer equipo. <Link href="/" className="underline">Añade Sub-21 / Sub-18 / equipo B en Importar</Link> con la misma vista.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {counts.map(({ d, n }) => (
              <span key={d} className={`px-2 py-0.5 rounded ${DEST_CLASS[d]}`}>{DESTINATION_LABEL[d]}: {n}</span>
            ))}
          </div>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Jugador</th><th className="num">Edad</th><th>Equipo</th><th>Mejor hueco</th><th className="num">Nivel</th><th className="num">vs 1º eq.</th>
                  <th className="num">Informe</th><th>Personalidad</th><th>Destino</th><th>Entrenar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const p = a.player;
                  const isOpen = open === p.uid;
                  return (
                    <Row key={p.uid} a={a} isOpen={isOpen} toggle={() => setOpen(isOpen ? null : p.uid)} />
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            <b>Nivel</b>: puntuación en su mejor hueco de la táctica activa. <b>vs 1º eq.</b>: puesto que ocuparía entre los del primer equipo en ese hueco y puntos que le faltan al titular.
            <b> Informe</b>: valoración del cuerpo técnico (columna Idoneidad/Potencial), 1-5. Clic en una fila para ver motivos, alertas y foco de entrenamiento.
          </p>
        </div>

        <aside className="space-y-3 text-sm">
          <section className="bg-surface border border-border rounded-lg p-3">
            <h2 className="font-semibold mb-1">Cobertura por posición</h2>
            <p className="text-xs text-muted mb-2">Jóvenes por familia de posición (primer equipo ≤23 + filiales). La guía recomienda no pasar de 2-3 por puesto entre todos los equipos: más de eso, compiten por los mismos minutos.</p>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {coverage.map((c) => (
                <div key={c.family} className={`rounded px-2 py-1 border ${c.count >= 5 ? "border-attr-mid" : c.count === 0 ? "border-attr-low" : "border-border"}`} title={c.names.join("\n")}>
                  <div className="text-muted">{c.family}</div>
                  <div className="font-medium">{c.count}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5">
            <h2 className="font-semibold text-sm">Reglas aplicadas</h2>
            <p>Sube de equipo solo quien va a jugar: 20-45 minutos sueltos en el primer equipo desarrollan menos que una cesión como titular.</p>
            <p>Sub-18: entrenar; 18-23 en un filial sin liga competitiva: cesión a un club que garantice titularidad (primera división para los de potencial alto).</p>
            <p>Físicos hasta ~24, técnicos a cualquier edad, mentales tarde. Rasgos desde los 20. Intensidad doble para ≤23 con determinación ≥15, profesionales o sin minutos; revisa fatiga cada 2 semanas.</p>
            <p>Tutorías solo dentro del mismo equipo: para tutorizar a un juvenil con mala personalidad hay que subirlo al primer equipo.</p>
            <p>Contrato juvenil a partir de los 17: ofrece el profesional. Mes a mes: fírmalo o déjalo ir.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ a, isOpen, toggle }: { a: YouthAssessment; isOpen: boolean; toggle: () => void }) {
  const p = a.player;
  const tier = a.personalityTier as PersonalityTierLevel;
  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-2" onClick={toggle}>
        <td className="font-medium whitespace-nowrap">
          {p.name}
          {a.alerts.length > 0 && <span className="text-attr-mid" title={a.alerts.join("\n")}> ⚠</span>}
          {a.onLoan && <span className="text-muted text-[10px]"> cedido</span>}
        </td>
        <td className="num">{p.age ?? "–"}</td>
        <td className="text-xs whitespace-nowrap">{a.squad?.name ?? "—"}</td>
        <td className="text-xs whitespace-nowrap">{a.fit ? `${POSITION_LABEL[a.fit.slot]} · ${a.fit.role.es}` : a.bestRole ? roleLabel(ROLE_BY_ID[a.bestRole.roleId]) : "—"}</td>
        <td className="num">{a.fit ? <ScoreBadge score={a.fit.effective} /> : a.bestRole ? <ScoreBadge score={a.bestRole.score} /> : "–"}</td>
        <td className="num text-xs whitespace-nowrap">
          {a.fit && a.fit.starter != null ? (
            <span className={a.fit.rank <= 2 ? "text-attr-good" : a.fit.rank <= 4 ? "" : "text-muted"}>{a.fit.rank}º · −{Math.max(0, Math.round(a.fit.starter - a.fit.effective))}</span>
          ) : "–"}
        </td>
        <td className="num text-xs" title={p.coachRating?.raw}>{a.potential != null ? a.potential.toFixed(1) : "–"}</td>
        <td className={`text-xs whitespace-nowrap ${tier >= 5 ? "text-attr-good" : tier <= 1 ? "text-attr-low" : ""}`} title={TIER_LABEL[tier]}>{p.personality ?? "—"}</td>
        <td className="text-xs whitespace-nowrap">
          <span className={`px-1.5 py-0.5 rounded ${DEST_CLASS[a.destination]}`}>
            {a.destination === "filial" && a.targetSquad ? a.targetSquad.name : DESTINATION_LABEL[a.destination]}
          </span>
          {a.loanLevel && <div className="text-[10px] text-muted mt-0.5">{LOAN_LABEL[a.loanLevel]}</div>}
        </td>
        <td className="text-xs whitespace-nowrap">
          {a.training.role.es} · {a.training.focus[0]?.area.es ?? "sin foco"} ·{" "}
          <span className={a.training.intensity === "doble" ? "text-attr-good" : a.training.intensity === "media" ? "text-attr-mid" : ""} title={a.training.intensityWhy}>{a.training.intensity}</span>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-surface-2/50">
          <td colSpan={10} className="text-xs p-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <div className="font-medium mb-1">Motivos</div>
                {a.reasons.map((r, i) => <p key={i}>· {r}</p>)}
                {a.fit && <p className="text-muted mt-1">Titular actual {Math.round(a.fit.starter ?? 0)}, siguiente {Math.round(a.fit.second ?? 0)}; él {Math.round(a.fit.effective)}.</p>}
              </div>
              <div>
                <div className="font-medium mb-1">Alertas</div>
                {a.alerts.length === 0 && <p className="text-muted">Ninguna.</p>}
                {a.alerts.map((r, i) => <p key={i} className="text-attr-mid">⚠ {r}</p>)}
                <div className="text-muted mt-1">
                  {p.contractType ?? ""}{p.contractKind && p.contractKind !== "Contrato tiempo completo" ? ` · ${p.contractKind}` : ""}{p.contractExpiry ? ` · hasta ${p.contractExpiry}` : ""}
                  {p.wageRaw ? ` · ${p.wageRaw}` : ""}{p.playingTime ? ` · ${p.playingTime}` : ""}
                  {p.apps != null ? ` · ${p.apps} PJ / ${p.minutes ?? "?"} min` : ""}{p.avgRating != null ? ` · media ${p.avgRating.toFixed(2)}` : ""}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Entrenamiento</div>
                <p>Rol: <b>{roleLabel(a.training.role)}</b></p>
                {a.training.focus.slice(0, 2).map((f, i) => (
                  <p key={i} title={f.detail.map((d) => `${ATTR_BY_KEY[d.key].es}: ${d.have ?? "?"} → ${d.target}`).join("\n")}>
                    Foco {i === 0 ? "" : "alternativo "}: <b>{f.area.es}</b> <span className="text-muted">({f.detail.filter((d) => d.have != null && d.have < d.target).map((d) => `${d.key} ${d.have}`).join(", ")})</span>
                  </p>
                ))}
                <p>Intensidad: <b>{a.training.intensity}</b> <span className="text-muted">({a.training.intensityWhy})</span></p>
                <p className="text-muted">{a.training.traitsPhase ? "≥20 años: ya puede aprender rasgos (ver Rasgos)." : "Menor de 20: primero atributos, rasgos más adelante."}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
