"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ATTRIBUTES, GK_KEYS, OUTFIELD_KEYS, type AttrGroup, type AttrKey } from "@/lib/fm/attributes";
import { ROLE_BY_ID, roleLabel } from "@/lib/fm/roles";
import { scoreAllRoles } from "@/lib/fm/scoring";
import { TIER_LABEL, personalityTierLevel } from "@/lib/fm/personalities";
import { fmtMoney } from "@/lib/fm/scouting";
import type { Player } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";
import { attrColor, ScoreBadge } from "@/components/AttrCell";

const GROUP_LABEL: Record<AttrGroup, string> = { tecnico: "Técnicos", mental: "Mentales", fisico: "Físicos", portero: "Portero" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const players = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const hydrated = useAppStore((s) => s.hydrated);
  // ?a=uid&b=uid&c=uid desde otras páginas
  const sp = useSearchParams();
  const [uids, setUids] = useState<string[]>(() => ["a", "b", "c"].map((k) => sp.get(k) ?? ""));
  const [filter, setFilter] = useState("");

  // Todos los jugadores de todas las fuentes, con su equipo
  const all = useMemo(() => {
    const out: { player: Player; source: string }[] = [];
    const seen = new Set<string>();
    for (const q of squads) for (const p of players[q.id] ?? []) {
      if (seen.has(p.uid)) continue;
      seen.add(p.uid);
      out.push({ player: p, source: q.name });
    }
    return out.sort((a, b) => a.player.name.localeCompare(b.player.name));
  }, [players, squads]);
  const byUid = useMemo(() => new Map(all.map((x) => [x.player.uid, x])), [all]);

  const chosen = uids.map((u) => byUid.get(u) ?? null);
  const active = chosen.filter((x): x is { player: Player; source: string } => !!x);
  const base = active[0]?.player ?? null;
  const anyGk = active.some((x) => x.player.isGoalkeeper);

  const roleRows = useMemo(() => {
    if (!active.length) return [];
    const scores = active.map((x) => new Map(scoreAllRoles(x.player).map((r) => [r.roleId, r])));
    // Unión de los 6 mejores roles de cada uno
    const ids = new Set<string>();
    for (const m of scores) [...m.values()].sort((a, b) => b.score - a.score).slice(0, 6).forEach((r) => ids.add(r.roleId));
    return [...ids].map((id) => ({ id, scores: scores.map((m) => m.get(id) ?? null) })).sort((a, b) => (b.scores[0]?.score ?? 0) - (a.scores[0]?.score ?? 0));
  }, [active]);

  if (hydrated && all.length === 0) {
    return <div className="text-sm text-muted">No hay jugadores importados. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.</div>;
  }

  const options = filter ? all.filter((x) => x.player.name.toLowerCase().includes(filter.toLowerCase())) : all;
  const groups: AttrGroup[] = anyGk ? ["portero", "tecnico", "mental", "fisico"] : ["tecnico", "mental", "fisico"];

  const info: { label: string; get: (p: Player) => string }[] = [
    { label: "Equipo", get: (p) => byUid.get(p.uid)?.source ?? "" },
    { label: "Club", get: (p) => p.club ?? "—" },
    { label: "Edad", get: (p) => String(p.age ?? "—") },
    { label: "Posición", get: (p) => p.position.raw },
    { label: "Pie", get: (p) => `I ${p.leftFoot ?? "?"} · D ${p.rightFoot ?? "?"}` },
    { label: "Altura", get: (p) => (p.height ? `${p.height} cm` : "—") },
    { label: "Personalidad", get: (p) => `${p.personality ?? "—"} (${TIER_LABEL[personalityTierLevel(p.personality)]})` },
    { label: "Sueldo", get: (p) => p.wageRaw ?? (p.wage != null ? fmtMoney(p.wage) : "—") },
    { label: "Valor", get: (p) => (p.value != null ? fmtMoney(p.value) : "—") },
    { label: "Contrato", get: (p) => `${p.contractExpiry ?? "—"}${p.contractType ? ` · ${p.contractType}` : ""}` },
    { label: "Minutos", get: (p) => p.playingTime ?? "—" },
    { label: "Media", get: (p) => (p.avgRating != null ? p.avgRating.toFixed(2) : "—") },
    { label: "Conocimiento", get: (p) => { const v = Object.values(p.attrs); return v.length ? `${Math.round((v.filter((a) => !a.isRange).length / v.length) * 100)} %` : "—"; } },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Comparar</h1>
        <input className="bg-surface border border-border rounded px-2 py-1 text-sm w-48" placeholder="filtrar nombres…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {uids.map((u, i) => (
          <select key={i} className="bg-surface border border-border rounded px-2 py-1 text-sm max-w-[220px]" value={u} onChange={(e) => setUids(uids.map((x, j) => (j === i ? e.target.value : x)))}>
            <option value="">{i === 0 ? "Jugador base…" : `Jugador ${i + 1}…`}</option>
            {options.map((x) => <option key={x.player.uid} value={x.player.uid}>{x.player.name} · {x.source}</option>)}
          </select>
        ))}
      </div>

      {active.length === 0 && <p className="text-sm text-muted">Elige dos o tres jugadores de cualquier fuente (plantilla, filiales, ojeados, liga). Las diferencias se colorean respecto al primero.</p>}

      {active.length > 0 && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Atributo</th>
                  {active.map((x) => <th key={x.player.uid} className="num">{x.player.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {info.map((row) => (
                  <tr key={row.label}>
                    <td className="text-muted">{row.label}</td>
                    {active.map((x) => <td key={x.player.uid} className="num text-xs">{row.get(x.player)}</td>)}
                  </tr>
                ))}
                {groups.map((g) => (
                  <GroupRows key={g} group={g} players={active.map((x) => x.player)} base={base} />
                ))}
              </tbody>
            </table>
          </div>

          <aside className="bg-surface border border-border rounded-lg p-3 self-start">
            <h2 className="font-semibold text-sm mb-1">Roles</h2>
            <table className="tbl w-full">
              <thead><tr><th>Rol</th>{active.map((x) => <th key={x.player.uid} className="num">{x.player.name.split(" ").slice(-1)[0]}</th>)}</tr></thead>
              <tbody>
                {roleRows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">{roleLabel(ROLE_BY_ID[r.id])}</td>
                    {r.scores.map((s, i) => <td key={i} className="num">{s ? <ScoreBadge score={s.score} min={s.min} max={s.max} /> : "–"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted mt-1">Unión de los seis mejores roles de cada uno. Los ojeados con atributos en rango muestran su intervalo.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

function GroupRows({ group, players, base }: { group: AttrGroup; players: Player[]; base: Player | null }) {
  const keys = ATTRIBUTES.filter((a) => a.group === group).map((a) => a.key);
  const relevant = (p: Player, k: AttrKey) => (p.isGoalkeeper ? GK_KEYS.includes(k) || ATTRIBUTES.find((a) => a.key === k)?.group !== "tecnico" : OUTFIELD_KEYS.includes(k));
  return (
    <>
      <tr><td colSpan={players.length + 1} className="bg-surface-2 font-medium text-xs">{GROUP_LABEL[group]}</td></tr>
      {keys.map((k) => {
        const def = ATTRIBUTES.find((a) => a.key === k)!;
        const bv = base?.attrs[k]?.value ?? null;
        return (
          <tr key={k}>
            <td title={def.desc}>{def.es} <span className="text-muted text-[10px]">{k}</span></td>
            {players.map((p, i) => {
              const v = p.attrs[k];
              if (!v) return <td key={p.uid} className="num text-muted">–</td>;
              const diff = i > 0 && bv != null ? v.value - bv : 0;
              const dim = !relevant(p, k);
              return (
                <td key={p.uid} className={`num ${dim ? "opacity-40" : ""}`}>
                  <span style={{ color: attrColor(v.value) }} className="font-medium">{v.isRange ? `${v.min}-${v.max}` : v.value}</span>
                  {i > 0 && diff !== 0 && <span className={`text-[10px] ml-1 ${diff > 0 ? "text-attr-good" : "text-attr-low"}`}>{diff > 0 ? "+" : ""}{diff}</span>}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
