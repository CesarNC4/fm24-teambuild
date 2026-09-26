"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { DUTY_LABEL, POSITION_LABEL, POSITION_ORDER, rolesForPosition, type RoleDef } from "@/lib/fm/roles";
import { scoreRole } from "@/lib/fm/scoring";
import { roleDefaultNames } from "@/lib/fm/playerInstructions";
import { MENTALITIES, PRESS_LABEL, roleDefaults } from "@/lib/fm/roleInstructions";
import { FUNCTION_LABEL, roleFunctions } from "@/lib/fm/balance";
import type { PositionSlot } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";
import { ScoreBadge } from "@/components/AttrCell";

export default function RolesPage() {
  const players = useAppStore((s) => s.players.plantilla);
  const hydrated = useAppStore((s) => s.hydrated);
  const [slot, setSlot] = useState<PositionSlot>("MC");
  const [onlyFamiliar, setOnlyFamiliar] = useState(true);
  const [sortRole, setSortRole] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoleDef | null>(null);

  const roles = useMemo(() => rolesForPosition(slot), [slot]);

  const rows = useMemo(() => {
    const isGkSlot = slot === "GK";
    const pool = players.filter((p) => p.isGoalkeeper === isGkSlot);
    const list = pool.map((p) => {
      const scores = roles.map((r) => scoreRole(p, r));
      const familiar = p.position.slots.includes(slot);
      const best = Math.max(...scores.map((s) => s.score));
      return { p, scores, familiar, best };
    });
    const filtered = onlyFamiliar ? list.filter((r) => r.familiar) : list;
    const idx = sortRole ? roles.findIndex((r) => r.id === sortRole) : -1;
    return filtered.sort((a, b) => (idx >= 0 ? b.scores[idx].score - a.scores[idx].score : b.best - a.best));
  }, [players, roles, slot, onlyFamiliar, sortRole]);

  if (hydrated && players.length === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Roles por posición</h1>
        <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={onlyFamiliar} onChange={(e) => setOnlyFamiliar(e.target.checked)} />
          Solo jugadores que dominan la posición
        </label>
      </div>

      <div className="flex flex-wrap gap-1">
        {POSITION_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => { setSlot(s); setSortRole(null); setDetail(null); }}
            className={`px-2.5 py-1 rounded text-xs border ${slot === s ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`}
          >
            {POSITION_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="overflow-auto border border-border rounded-md max-h-[calc(100vh-220px)]">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-2">Jugador</th>
                <th className="num">Edad</th>
                <th>Pos.</th>
                {roles.map((r) => (
                  <th
                    key={r.id}
                    className={`num cursor-pointer hover:text-accent ${sortRole === r.id ? "text-accent" : ""}`}
                    title={`${r.es} (${DUTY_LABEL[r.duty]}) — clic para ordenar; doble clic para ver atributos`}
                    onClick={() => setSortRole(r.id)}
                    onDoubleClick={() => setDetail(r)}
                  >
                    {r.code}-{r.duty}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, scores, familiar }) => (
                <tr key={p.uid} className={familiar ? "" : "opacity-60"}>
                  <td className="sticky left-0 bg-surface font-medium">{p.name}</td>
                  <td className="num">{p.age ?? "–"}</td>
                  <td className="text-muted text-xs">{p.position.raw}</td>
                  {scores.map((s) => (
                    <td key={s.roleId} className="num"><ScoreBadge score={s.score} min={s.min} max={s.max} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="bg-surface border border-border rounded-lg p-4 text-sm space-y-3 h-fit">
          {detail ? (
            <>
              <div>
                <div className="font-semibold">{detail.es} ({DUTY_LABEL[detail.duty]})</div>
                <div className="text-xs text-muted">{detail.en} · {detail.id}{detail.old ? ` · antes «${detail.old}»` : ""}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-attr-good mb-1">Clave</div>
                <div className="flex flex-wrap gap-1">
                  {detail.key.map((k) => <span key={k} className="px-1.5 py-0.5 rounded bg-surface-2 text-xs" title={ATTR_BY_KEY[k].es}>{ATTR_BY_KEY[k].es}</span>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-attr-elite mb-1">Preferibles</div>
                <div className="flex flex-wrap gap-1">
                  {detail.pref.map((k) => <span key={k} className="px-1.5 py-0.5 rounded bg-surface-2 text-xs">{ATTR_BY_KEY[k].es}</span>)}
                </div>
              </div>
              {detail.watch.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1">Además vigilamos</div>
                  <div className="flex flex-wrap gap-1">
                    {detail.watch.map((k) => <span key={k} className="px-1.5 py-0.5 rounded border border-border text-xs">{ATTR_BY_KEY[k].es}</span>)}
                  </div>
                  <div className="text-xs text-muted mt-1">El juego no lo resalta, pero lo tenemos en cuenta (cuenta como preferible).</div>
                </div>
              )}
              <RoleDefaultsBox role={detail} slot={slot} />
            </>
          ) : (
            <div className="text-xs text-muted space-y-2">
              <p><b>Cómo leerlo:</b> cada celda es la puntuación 0-100 del jugador en ese rol. Un 100 equivale a tener 20 en todos los atributos que importan para el rol.</p>
              <p>Clic en la cabecera de un rol para ordenar por él; doble clic para ver sus atributos clave y preferibles.</p>
              <p>Los jugadores en gris no dominan la posición: rendirían por debajo de su puntuación.</p>
              <p>Un <b>±</b> indica atributos en rango (jugador ojeado sin conocimiento completo).</p>
              <div className="pt-2 space-y-0.5">
                {roles.map((r) => <div key={r.id}><span className="font-mono">{r.code}-{r.duty}</span> · {r.es} ({DUTY_LABEL[r.duty]})</div>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function RoleDefaultsBox({ role, slot }: { role: RoleDef; slot: PositionSlot }) {
  const def = roleDefaults(role.id, slot);
  if (!def) return null;
  const names = roleDefaultNames(role, slot);
  const rf = roleFunctions(role, slot);
  return (
    <div className="text-xs space-y-1 border-t border-border pt-2">
      <div className="font-medium">De serie en el juego</div>
      <div><span className="text-muted">Mentalidad:</span> {MENTALITIES[def.mentality]} <span className="text-muted">(con la del equipo de las capturas; sube o baja con ella)</span></div>
      {def.press && <div className="text-muted">{PRESS_LABEL[def.press]}</div>}
      <div><span className="text-muted">Parte del rol:</span> {names.part.length ? names.part.join(", ") : "ninguna"}</div>
      <div><span className="text-muted">No se pueden poner:</span> {names.blocked.length ? names.blocked.join(", ") : "ninguna"}</div>
      {def.note && <div className="text-muted">{def.note}</div>}
      <div className="font-medium pt-1">Funciones en el campo</div>
      {rf.free && <div className="text-muted">Rol libre: sin instrucciones de serie, lo que hace depende de los rasgos del jugador.</div>}
      {rf.fns.length > 0 ? (
        <ul className="space-y-0.5">
          {rf.fns.map((fn) => <li key={fn}><b>{FUNCTION_LABEL[fn]}</b> <span className="text-muted">— {rf.why[fn]}</span></li>)}
        </ul>
      ) : !rf.free && <div className="text-muted">Ninguna destacada.</div>}
      <div className="text-muted">El detector de equilibrio de Táctica usa estas funciones para juzgar parejas y bandas.</div>
    </div>
  );
}
