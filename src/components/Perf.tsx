"use client";

import { BAND_LABEL, PROFILE_LABEL, fmtStat, type Band, type MetricResult, type PerfEval } from "@/lib/fm/stats";

export const BAND_TEXT: Record<Band, string> = { 4: "text-band-4", 3: "text-band-3", 2: "text-band-2", 1: "text-band-1", 0: "text-band-0" };
export const BAND_BORDER: Record<Band, string> = { 4: "border-band-4", 3: "border-band-3", 2: "border-band-2", 1: "border-band-1", 0: "border-band-0" };
export const BAND_BG: Record<Band, string> = { 4: "bg-band-4", 3: "bg-band-3", 2: "bg-band-2", 1: "bg-band-1", 0: "bg-band-0" };

/** Veredicto de rendimiento con su color; atenuado si la muestra es provisional. */
export function PerfBadge({ perf, short = false }: { perf: PerfEval | null | undefined; short?: boolean }) {
  if (!perf) return <span className="text-muted">–</span>;
  if (perf.sample === "insuficiente" || perf.band == null) return <span className="text-muted" title={`${perf.rec.minutes} minutos: hacen falta 450 para juzgar`}>{short ? "muestra corta" : `muestra insuficiente (${perf.rec.minutes}')`}</span>;
  const title = `${PROFILE_LABEL[perf.profile]} · ${perf.rec.minutes} minutos (${perf.sample})${perf.pct != null ? ` · percentil ${perf.pct} de la liga` : ""}${perf.fromLeague ? "" : " · umbrales del Excel"}`;
  return (
    <span className={`${BAND_TEXT[perf.band]} font-medium ${perf.sample === "provisional" ? "opacity-60" : ""}`} title={title}>
      {short ? perf.verdict?.split(" ")[0] : perf.verdict}
      {perf.sample === "provisional" && <span className="font-normal text-[10px]"> · provisional</span>}
    </span>
  );
}

/** Una estadística con su valor, coloreada por su franja. */
export function MetricChip({ m, dim = false }: { m: MetricResult; dim?: boolean }) {
  const cls = m.band != null ? BAND_TEXT[m.band] : "text-muted";
  const title = [
    m.band != null ? `${BAND_LABEL[m.band]}${m.pct != null ? ` · percentil ${m.pct}` : ""}` : "sin dato",
    m.cuts ? `cortes (${m.source === "liga" ? "tu liga" : "Excel"}): ${m.cuts.map((c) => fmtStat(m.key, c)).join(" / ")}` : null,
    m.note ?? null,
    m.weight === 0 ? "informativa: no puntúa" : null,
  ].filter(Boolean).join("\n");
  return (
    <span className={`whitespace-nowrap ${dim ? "opacity-60" : ""}`} title={title}>
      <span className="text-muted">{m.label}</span> <span className={`font-mono ${cls}`}>{fmtStat(m.key, m.value)}</span>
    </span>
  );
}
