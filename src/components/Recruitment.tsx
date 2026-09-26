"use client";

import { useState } from "react";
import { TIER_LABEL, type PersonalityTierLevel } from "@/lib/fm/personalities";
import { dnaSummary, type ClubDna, type CreatedFocus, type DnaRule, type RecruitmentFocus, type WeakFootMin } from "@/lib/fm/recruitment";
import { STAFF_KIND_LABEL, nationName, type StaffMember } from "@/lib/fm/staff";

const PRIORITY_CLASS = { Máxima: "text-attr-low", Estándar: "text-attr-mid", Indefinido: "text-muted" } as const;

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

/** ADN del club: lo que eliges tú y los umbrales que salen del estilo. */
export function DnaPanel({ dna, rules, onChange }: { dna: ClubDna; rules: DnaRule[]; onChange: (d: ClubDna) => void }) {
  const summary = dnaSummary(dna, rules);
  const input = "bg-surface border border-border rounded px-1 w-14";
  return (
    <div className="bg-surface border border-border rounded-md p-3 text-xs space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-medium text-sm">ADN del club</h3>
        <span className="text-muted">Filtra los candidatos, los objetivos propuestos y los juveniles, y ajusta la edad y el sueldo de los focos.</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <label>Edad de fichaje <input className={input} placeholder="mín." value={dna.ageMin ?? ""} onChange={(e) => onChange({ ...dna, ageMin: numOrNull(e.target.value) })} /> – <input className={input} placeholder="máx." value={dna.ageMax ?? ""} onChange={(e) => onChange({ ...dna, ageMax: numOrNull(e.target.value) })} /></label>
        <label>Personalidad mínima{" "}
          <select className="bg-surface border border-border rounded px-1" value={dna.minPersonality ?? ""} onChange={(e) => onChange({ ...dna, minPersonality: e.target.value === "" ? null : (Number(e.target.value) as PersonalityTierLevel) })}>
            <option value="">cualquiera</option>
            {([8, 7, 6, 5, 4, 3] as PersonalityTierLevel[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </select>
        </label>
        <label title="En % del sueldo más alto de tu plantilla">Sueldo máx. <input className={input} placeholder="%" value={dna.maxWagePct ?? ""} onChange={(e) => onChange({ ...dna, maxWagePct: numOrNull(e.target.value) })} /> % del máximo</label>
        <label>Pierna mala{" "}
          <select className="bg-surface border border-border rounded px-1" value={dna.weakFoot} onChange={(e) => onChange({ ...dna, weakFoot: e.target.value as WeakFootMin })}>
            <option value="cualquiera">cualquiera</option>
            <option value="razonable">al menos Razonable</option>
            <option value="buena">al menos Bastante fuerte</option>
          </select>
        </label>
        <label>Altura mín. <input className={input} placeholder="cm" value={dna.minHeight ?? ""} onChange={(e) => onChange({ ...dna, minHeight: numOrNull(e.target.value) })} /></label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={dna.onlyClauseOrListed} onChange={(e) => onChange({ ...dna, onlyClauseOrListed: e.target.checked })} /> solo con cláusula o transferibles</label>
        <label className="flex items-center gap-1" title="Umbrales por línea según el estilo de la táctica activa"><input type="checkbox" checked={dna.styleAuto} onChange={(e) => onChange({ ...dna, styleAuto: e.target.checked })} /> umbrales del estilo</label>
      </div>
      <p className="text-muted">{summary.length ? `Ahora: ${summary.join(" · ")}.` : "Sin filtros: todos los candidatos pasan."}</p>
      {dna.styleAuto && rules.length > 0 && <ul className="text-muted list-disc pl-4">{rules.map((r, i) => <li key={i}>{r.why}</li>)}</ul>}
      <p className="text-muted">El cupo de formados en el club o de nacionales no se puede comprobar: la exportación no dice dónde se formó cada jugador.</p>
    </div>
  );
}

/** Ficha de un foco de contratación, con los campos en el orden de la pantalla del juego. */
export function FocusCard({ f, onCreated, onRemove }: { f: RecruitmentFocus; onCreated: (c: CreatedFocus) => void; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = [...f.fields, ...f.details].map((x) => `${x.label}: ${x.value}`).join("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sin portapapeles */ }
  };
  return (
    <div className={`bg-surface border rounded-md p-3 text-xs space-y-1.5 ${f.alerts.length ? "border-attr-low/60" : f.created ? "border-attr-good/50" : "border-border"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-sm">{f.title}</span>
        <span className={PRIORITY_CLASS[f.priority]}>{f.priority}{f.created ? " · creado en el juego" : ""}</span>
      </div>
      {f.alerts.map((a, i) => <p key={i} className="text-attr-low">⚠ {a}</p>)}
      {f.note && <p className="text-muted">{f.note}</p>}
      {f.fields.length > 1 && (
        <table className="w-full">
          <tbody>
            {f.fields.map((x) => (
              <tr key={x.label}><td className="text-muted pr-2 align-top whitespace-nowrap">{x.label}</td><td>{x.value}{x.hint && <span className="text-muted"> — {x.hint}</span>}</td></tr>
            ))}
            {f.details.length > 0 && <tr><td colSpan={2} className="pt-1 font-medium">Detalles adicionales</td></tr>}
            {f.details.map((x) => (
              <tr key={x.label}><td className="text-muted pr-2 align-top whitespace-nowrap">{x.label}</td><td>{x.value}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {f.fields.length > 1 && <button className="px-1.5 rounded border border-border hover:bg-surface-2" onClick={copy}>{copied ? "copiado ✓" : "copiar campos"}</button>}
        {!f.created && (
          <button className="px-1.5 rounded border border-border hover:bg-surface-2" title="Guarda el ojeador asignado: cuenta para su carga y avisa si se va del club"
            onClick={() => onCreated({ name: f.fields.find((x) => x.label === "Nombre")?.value ?? f.title, scout: f.scout?.name ?? null, analyst: f.analyst?.name ?? null, createdAt: new Date().toISOString() })}>
            lo he creado en el juego
          </button>
        )}
        {f.created && <button className="px-1.5 rounded border border-border hover:bg-surface-2 text-muted" onClick={onRemove}>ya no está en el juego</button>}
      </div>
    </div>
  );
}

/** Red de ojeadores importada, con la carga de focos de cada uno. */
export function StaffNetwork({ staff, load }: { staff: StaffMember[]; load: Map<string, { created: number; proposed: number }> }) {
  const shown = staff.filter((m) => m.kind === "ojeador" || m.kind === "analista" || m.gone);
  return (
    <div className="bg-surface border border-border rounded-md p-3 text-xs space-y-1.5">
      <h3 className="font-medium text-sm">Red de ojeadores</h3>
      {staff.length === 0 && <p className="text-muted">Importa la exportación de empleados (vista con Ada, Juz. Cal y Juz. Pot) en Importar: se detecta sola. Sin ella, los focos no llevan ojeador concreto.</p>}
      {shown.length > 0 && (
        <table className="w-full">
          <thead><tr className="text-muted"><th className="text-left">Nombre</th><th className="text-left">Nac</th><th className="text-right">Ada</th><th className="text-right">Cal</th><th className="text-right">Pot</th><th className="text-right" title="focos creados en el juego + propuestos">Focos</th></tr></thead>
          <tbody>
            {shown.map((m) => {
              const l = load.get(m.name);
              return (
                <tr key={m.name} className={m.gone ? "text-attr-low" : ""} title={`${STAFF_KIND_LABEL[m.kind]}${m.nationality ? ` · ${nationName(m.nationality)}` : ""}`}>
                  <td>{m.name}{m.kind === "analista" && <span className="text-muted"> (analista)</span>}{m.gone && " · ya no está"}</td>
                  <td>{m.nationality ?? "—"}</td>
                  <td className="text-right">{m.adaptability ?? "–"}</td>
                  <td className="text-right">{m.judgeAbility ?? "–"}</td>
                  <td className="text-right">{m.judgePotential ?? "–"}</td>
                  <td className="text-right">{l ? `${l.created}${l.proposed ? ` + ${l.proposed}` : ""}` : "0"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-muted">Reparto: para jugadores listos ya, el de mayor Juz. Cal; para futuro, el de mayor Juz. Pot; cada foco que lleva resta para que nadie acumule demasiados. Adaptabilidad ≥ 15 para mercados lejanos. El director deportivo, el secretario técnico y el mánager de cesiones no se asignan.</p>
    </div>
  );
}
