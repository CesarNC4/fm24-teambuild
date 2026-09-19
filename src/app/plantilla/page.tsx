"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTRIBUTES, GK_KEYS, OUTFIELD_KEYS, type AttrGroup, type AttrKey } from "@/lib/fm/attributes";
import { ROLE_BY_ID, roleLabel } from "@/lib/fm/roles";
import { bestRoles } from "@/lib/fm/scoring";
import type { Player } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";
import { AttrCell, ScoreBadge } from "@/components/AttrCell";

type SortKey = "name" | "age" | "pos" | "best" | "wage" | "value" | AttrKey;

const GROUPS: { id: AttrGroup; label: string }[] = [
  { id: "tecnico", label: "Técnicos" },
  { id: "mental", label: "Mentales" },
  { id: "fisico", label: "Físicos" },
  { id: "portero", label: "Portero" },
];

function fmtMoney(n: number | null): string {
  if (n == null) return "–";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function SquadPage() {
  const players = useAppStore((s) => s.players.plantilla);
  const hydrated = useAppStore((s) => s.hydrated);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "best", dir: -1 });
  const [groups, setGroups] = useState<Set<AttrGroup>>(new Set(["tecnico", "mental", "fisico"]));
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    return players.map((p) => {
      const best = bestRoles(p, 3);
      return { p, best };
    });
  }, [players]);

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = f
      ? rows.filter(({ p }) => p.name.toLowerCase().includes(f) || p.position.raw.toLowerCase().includes(f))
      : rows;
    const val = (r: { p: Player; best: ReturnType<typeof bestRoles> }): number | string => {
      switch (sort.key) {
        case "name": return r.p.name;
        case "age": return r.p.age ?? -1;
        case "pos": return r.p.position.raw;
        case "best": return r.best[0]?.score ?? -1;
        case "wage": return r.p.wage ?? -1;
        case "value": return r.p.value ?? -1;
        default: return r.p.attrs[sort.key]?.value ?? -1;
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sort.dir;
      return ((va as number) - (vb as number)) * sort.dir;
    });
  }, [rows, sort, filter]);

  const visibleAttrs = ATTRIBUTES.filter((a) => groups.has(a.group));

  const th = (key: SortKey, label: string, extra = "") => (
    <th
      key={key}
      className={`cursor-pointer hover:text-accent ${extra}`}
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "pos" ? 1 : -1 }))}
    >
      {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  if (hydrated && players.length === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Plantilla</h1>
        <input
          placeholder="Filtrar por nombre o posición…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface border border-border rounded px-2 py-1 text-sm w-64"
        />
        <div className="flex items-center gap-2 text-xs">
          {GROUPS.map((g) => (
            <label key={g.id} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={groups.has(g.id)}
                onChange={(e) => {
                  const next = new Set(groups);
                  if (e.target.checked) next.add(g.id); else next.delete(g.id);
                  setGroups(next);
                }}
              />
              {g.label}
            </label>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted">{sorted.length} jugadores</div>
      </div>

      <div className="overflow-auto border border-border rounded-md max-h-[calc(100vh-180px)]">
        <table className="tbl w-full">
          <thead>
            <tr>
              {th("name", "Nombre", "sticky left-0 z-2")}
              {th("age", "Edad", "num")}
              {th("pos", "Posición")}
              {th("best", "Mejor rol", "num")}
              <th>Top 3 roles</th>
              {th("wage", "Sueldo", "num")}
              {th("value", "Valor", "num")}
              <th>Minutos</th>
              <th>Contrato</th>
              <th>Personalidad</th>
              {visibleAttrs.map((a) => (
                <th key={a.key} title={a.es} className="cursor-pointer hover:text-accent num" onClick={() => setSort((s) => ({ key: a.key, dir: s.key === a.key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
                  {a.key}{sort.key === a.key ? (sort.dir === 1 ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ p, best }) => (
              <tr key={p.uid}>
                <td className="sticky left-0 bg-surface font-medium">{p.name}</td>
                <td className="num">{p.age ?? "–"}</td>
                <td className="text-muted">{p.position.raw}</td>
                <td className="num">{best[0] ? <ScoreBadge score={best[0].score} min={best[0].min} max={best[0].max} /> : "–"}</td>
                <td className="text-xs text-muted">
                  {best.map((b) => `${roleLabel(ROLE_BY_ID[b.roleId])} ${b.score.toFixed(0)}`).join(" · ")}
                </td>
                <td className="num" title={p.wageRaw ?? undefined}>{p.wageRaw ?? fmtMoney(p.wage)}</td>
                <td className="num">{fmtMoney(p.value)}</td>
                <td className="text-xs">{p.playingTime ?? "–"}</td>
                <td className="text-xs">{p.contractExpiry ?? "–"}</td>
                <td className="text-xs">{p.personality ?? "–"}</td>
                {visibleAttrs.map((a) => {
                  const relevant = p.isGoalkeeper ? GK_KEYS.includes(a.key) || a.group !== "tecnico" : OUTFIELD_KEYS.includes(a.key);
                  return relevant ? <AttrCell key={a.key} v={p.attrs[a.key]} /> : <td key={a.key} className="num text-muted/40">{p.attrs[a.key]?.value ?? "–"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
