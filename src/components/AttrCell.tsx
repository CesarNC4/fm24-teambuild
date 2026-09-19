import type { AttrValue } from "@/lib/fm/types";

export function attrColor(v: number): string {
  if (v >= 16) return "text-attr-elite font-semibold";
  if (v >= 13) return "text-attr-good";
  if (v >= 9) return "text-attr-mid";
  return "text-attr-low";
}

export function AttrCell({ v }: { v: AttrValue | undefined }) {
  if (!v) return <td className="num text-muted">–</td>;
  return (
    <td className={`num ${attrColor(v.value)}`} title={v.isRange ? `${v.min}-${v.max}` : undefined}>
      {v.isRange ? `${v.min}-${v.max}` : v.value}
    </td>
  );
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-attr-elite font-semibold";
  if (score >= 62) return "text-attr-good";
  if (score >= 50) return "text-attr-mid";
  return "text-attr-low";
}

export function ScoreBadge({ score, min, max }: { score: number; min?: number; max?: number }) {
  const uncertain = min !== undefined && max !== undefined && max - min > 0.5;
  return (
    <span className={`font-mono ${scoreColor(score)}`} title={uncertain ? `${min!.toFixed(0)}–${max!.toFixed(0)}` : undefined}>
      {score.toFixed(0)}
      {uncertain ? "±" : ""}
    </span>
  );
}
