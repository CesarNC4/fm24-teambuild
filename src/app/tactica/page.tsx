"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FORMATIONS } from "@/lib/fm/formations";
import { INSTRUCTIONS, INSTRUCTION_BY_ID, PHASE_LABEL, STYLE_BY_ID, STYLE_PRESETS, fitTone, instructionFit, type InstructionPhase } from "@/lib/fm/instructions";
import { DUTY_LABEL, POSITION_LABEL, rolesForPosition } from "@/lib/fm/roles";
import { buildLineup, newTactic, tacticWarnings, type LineupResult, type SlotResult } from "@/lib/fm/tactics";
import { useAppStore } from "@/lib/store";
import { ScoreBadge } from "@/components/AttrCell";

const TONE_CLASS = {
  elite: "text-attr-elite",
  good: "text-attr-good",
  ok: "text-attr-mid",
  poor: "text-attr-low",
  na: "text-muted",
} as const;

export default function TacticPage() {
  const players = useAppStore((s) => s.players.plantilla);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeId = useAppStore((s) => s.activeTacticId);
  const addTactic = useAppStore((s) => s.addTactic);
  const updateTactic = useAppStore((s) => s.updateTactic);
  const removeTactic = useAppStore((s) => s.removeTactic);
  const setActiveTactic = useAppStore((s) => s.setActiveTactic);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Táctica por defecto la primera vez
  useEffect(() => {
    if (hydrated && tactics.length === 0) {
      const t = newTactic("4-2-3-1-dm", "4-2-3-1 transiciones");
      t.styleId = "transiciones";
      t.instructions = [...STYLE_BY_ID.transiciones.instructions];
      addTactic(t);
    }
  }, [hydrated, tactics.length, addTactic]);

  const tactic = tactics.find((t) => t.id === activeId) ?? tactics[0] ?? null;

  const lineup: LineupResult | null = useMemo(() => (tactic && players.length ? buildLineup(tactic, players) : null), [tactic, players]);
  const warnings = useMemo(() => (tactic ? tacticWarnings(tactic) : []), [tactic]);
  const fits = useMemo(() => (lineup ? INSTRUCTIONS.map((i) => instructionFit(i, lineup)) : []), [lineup]);

  if (!hydrated) return null;
  if (players.length === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.
      </div>
    );
  }
  if (!tactic) return null;

  const selected: SlotResult | null = lineup?.slots.find((s) => s.slot.id === selectedSlot) ?? null;

  const setRole = (slotId: string, roleId: string) => updateTactic(tactic.id, (t) => ({ ...t, roles: { ...t.roles, [slotId]: roleId } }));
  const toggleLock = (slotId: string, uid: string | null) =>
    updateTactic(tactic.id, (t) => {
      const locks = { ...t.locks };
      if (uid === null || locks[slotId] === uid) delete locks[slotId];
      else locks[slotId] = uid;
      return { ...t, locks };
    });
  const changeFormation = (formationId: string) => {
    const fresh = newTactic(formationId, tactic.name);
    updateTactic(tactic.id, { formationId, roles: fresh.roles, locks: {} });
    setSelectedSlot(null);
  };
  const applyStyle = (styleId: string) => {
    const st = STYLE_BY_ID[styleId];
    updateTactic(tactic.id, { styleId, instructions: st ? [...st.instructions] : [] });
  };
  const toggleInstruction = (id: string) =>
    updateTactic(tactic.id, (t) => {
      const instr = INSTRUCTION_BY_ID[id];
      const active = t.instructions.includes(id);
      let next = t.instructions.filter((x) => x !== id);
      if (!active) {
        if (instr.group) next = next.filter((x) => INSTRUCTION_BY_ID[x].group !== instr.group);
        next.push(id);
      }
      return { ...t, instructions: next, styleId: null };
    });

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <h1 className="text-2xl font-semibold mr-2">Táctica</h1>
        <select className="bg-surface border border-border rounded px-2 py-1" value={tactic.id} onChange={(e) => setActiveTactic(e.target.value)}>
          {tactics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input
          className="bg-surface border border-border rounded px-2 py-1 w-48"
          value={tactic.name}
          onChange={(e) => updateTactic(tactic.id, { name: e.target.value })}
        />
        <select className="bg-surface border border-border rounded px-2 py-1" value={tactic.formationId} onChange={(e) => changeFormation(e.target.value)}>
          {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="bg-surface border border-border rounded px-2 py-1" value={tactic.styleId ?? ""} onChange={(e) => e.target.value && applyStyle(e.target.value)}>
          <option value="">Estilo: personalizado</option>
          {STYLE_PRESETS.map((s) => <option key={s.id} value={s.id}>Estilo: {s.name}</option>)}
        </select>
        <button className="px-2 py-1 rounded border border-border hover:bg-surface-2" onClick={() => addTactic(newTactic(tactic.formationId, `${tactic.name} (copia)`))}>
          Nueva
        </button>
        <button className="px-2 py-1 rounded border border-border hover:bg-surface-2 text-attr-low" onClick={() => removeTactic(tactic.id)} disabled={tactics.length <= 1}>
          Eliminar
        </button>
        {lineup && (
          <div className="ml-auto text-xs text-muted">
            Media del XI: <ScoreBadge score={lineup.average} /> · {tactic.styleId ? STYLE_BY_ID[tactic.styleId].description : "instrucciones personalizadas"}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* Campo */}
        <div className="relative w-full aspect-[3/4] max-h-[720px] rounded-lg border border-border overflow-hidden"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, var(--surface)) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface)) 100%)" }}>
          {/* líneas */}
          <div className="absolute inset-x-[8%] top-1/2 border-t border-border/60" />
          <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60" />
          <div className="absolute left-1/2 bottom-0 w-[55%] h-[16%] -translate-x-1/2 border border-b-0 border-border/60" />
          <div className="absolute left-1/2 top-0 w-[55%] h-[16%] -translate-x-1/2 border border-t-0 border-border/60" />
          {lineup?.slots.map((s) => {
            const roleOptions = rolesForPosition(s.slot.slot);
            const isSel = selectedSlot === s.slot.id;
            return (
              <div
                key={s.slot.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[120px] rounded-md border bg-surface/95 shadow-sm text-[11px] cursor-pointer ${isSel ? "border-accent ring-2 ring-accent/40" : "border-border"}`}
                style={{ left: `${s.slot.x}%`, top: `${100 - s.slot.y}%` }}
                onClick={() => setSelectedSlot(s.slot.id)}
              >
                <div className="flex items-center justify-between px-1.5 pt-1">
                  <span className="text-muted">{POSITION_LABEL[s.slot.slot]}</span>
                  {s.starter && <ScoreBadge score={s.starter.effective} />}
                </div>
                <div className="px-1.5 font-medium truncate" title={s.starter?.player.name}>
                  {s.locked && <span title="Fijado">📌 </span>}
                  {s.starter?.player.name ?? "—"}
                  {s.starter && s.starter.familiarity < 1 && <span className="text-attr-mid" title="No domina la posición"> *</span>}
                </div>
                <select
                  className="w-full bg-transparent border-t border-border px-1 py-0.5 text-[11px]"
                  value={s.role.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRole(s.slot.id, e.target.value)}
                >
                  {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.es} ({DUTY_LABEL[r.duty]})</option>)}
                </select>
              </div>
            );
          })}
        </div>

        {/* Panel lateral */}
        <aside className="space-y-3 text-sm">
          <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
            <h2 className="font-semibold">{selected ? `${POSITION_LABEL[selected.slot.slot]} · ${selected.role.es} (${DUTY_LABEL[selected.role.duty]})` : "Profundidad"}</h2>
            {!selected && <p className="text-xs text-muted">Haz clic en un hueco del campo para ver candidatos y fijar un jugador.</p>}
            {selected && (
              <table className="tbl w-full">
                <thead><tr><th>Jugador</th><th className="num">Rol</th><th className="num">Pos.</th><th className="num">Efect.</th><th></th></tr></thead>
                <tbody>
                  {[selected.starter, ...selected.depth].filter(Boolean).map((c) => (
                    <tr key={c!.player.uid} className={c === selected.starter ? "font-medium" : ""}>
                      <td>{c!.player.name} <span className="text-muted text-[10px]">{c!.player.age}</span></td>
                      <td className="num"><ScoreBadge score={c!.role.score} /></td>
                      <td className={`num ${c!.familiarity < 1 ? "text-attr-mid" : ""}`}>{Math.round(c!.familiarity * 100)}%</td>
                      <td className="num"><ScoreBadge score={c!.effective} /></td>
                      <td>
                        <button className="text-[10px] px-1 rounded border border-border hover:bg-surface-2" onClick={() => toggleLock(selected.slot.id, c!.player.uid)}>
                          {tactic.locks[selected.slot.id] === c!.player.uid ? "soltar" : "fijar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-surface border border-border rounded-lg p-3 space-y-1.5">
            <h2 className="font-semibold">Equilibrio de roles</h2>
            {warnings.length === 0 && <p className="text-xs text-attr-good">Sin avisos: la combinación de roles es coherente.</p>}
            {warnings.map((w, i) => (
              <p key={i} className={`text-xs ${w.level === "warn" ? "text-attr-mid" : "text-muted"}`}>{w.level === "warn" ? "⚠ " : "ℹ "}{w.text}</p>
            ))}
          </section>

          {lineup && (
            <section className="bg-surface border border-border rounded-lg p-3">
              <h2 className="font-semibold mb-1">Banquillo</h2>
              <div className="text-xs space-y-0.5 max-h-56 overflow-auto">
                {lineup.bench.map((b) => (
                  <div key={b.player.uid} className="flex justify-between gap-2">
                    <span className="truncate">{b.player.name} <span className="text-muted">{b.player.age}</span></span>
                    <span className="text-muted whitespace-nowrap">{b.bestSlot ? `${POSITION_LABEL[b.bestSlot.slot.slot]} ${b.bestSlot.role.code}` : "—"} <ScoreBadge score={b.effective} /></span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Instrucciones */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Instrucciones de equipo</h2>
        <p className="text-xs text-muted">
          El número es la media (1-20) de los atributos que la instrucción exige a los titulares afectados; manda el requisito más débil.
          Elige un estilo arriba para cargar un conjunto coherente y ajústalo aquí.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {(["posesion", "transicion", "sin-balon"] as InstructionPhase[]).map((phase) => (
            <div key={phase} className="bg-surface border border-border rounded-lg p-3">
              <h3 className="font-medium mb-2">{PHASE_LABEL[phase]}</h3>
              <div className="space-y-1">
                {fits.filter((f) => f.instruction.phase === phase).map((f) => {
                  const active = tactic.instructions.includes(f.instruction.id);
                  const tone = fitTone(f.mean);
                  const tip = f.reqs
                    .map((r) => `${r.req.why}: ${r.mean?.toFixed(1) ?? "—"}` + (r.players.length ? ` (peor: ${r.players.slice(0, 2).map((p) => `${p.name} ${p.mean.toFixed(1)}`).join(", ")})` : ""))
                    .join("\n");
                  return (
                    <label key={f.instruction.id} className={`flex items-center gap-2 text-xs px-1.5 py-1 rounded cursor-pointer ${active ? "bg-accent/15" : "hover:bg-surface-2"}`} title={tip || "No depende de atributos"}>
                      <input type="checkbox" checked={active} onChange={() => toggleInstruction(f.instruction.id)} />
                      <span className="flex-1">{f.instruction.name}</span>
                      <span className={`font-mono ${TONE_CLASS[tone]}`}>{f.mean != null ? f.mean.toFixed(1) : "·"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {tactic.instructions.length > 0 && lineup && (
          <div className="text-xs text-muted">
            Puntos débiles de las instrucciones activas:{" "}
            {fits
              .filter((f) => tactic.instructions.includes(f.instruction.id) && f.mean != null && f.mean < 12)
              .map((f) => `${f.instruction.name} (${f.mean!.toFixed(1)})`)
              .join(", ") || "ninguno"}
          </div>
        )}
      </section>
    </div>
  );
}
