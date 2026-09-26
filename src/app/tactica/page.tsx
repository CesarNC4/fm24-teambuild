"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FORMATIONS } from "@/lib/fm/formations";
import { AXIS_GROUPS, CHOICE_GROUPS, FAMILY_LABEL, INSTRUCTIONS, INSTRUCTION_BY_ID, MENTALITIES, MENTALITY_BY_ID, MOTOR_LABEL, PHASE_LABEL, STYLES_BY_FAMILY, STYLE_BY_ID, fitTone, instructionFit, styleChildren, styleLevers, type InstructionFit, type InstructionPhase, type StyleFamily } from "@/lib/fm/instructions";
import { tacticAdvice } from "@/lib/fm/advice";
import { rankStyles, UNIT_SHORT } from "@/lib/fm/styles";
import { DUTY_LABEL, POSITION_LABEL, rolesForPosition } from "@/lib/fm/roles";
import { DEFAULT_CUP_YOUTH, POOL_LABEL, depthMap, lineupForPool, newTactic, poolPlayers, rankFormations, tacticLocks, withLocks, youthSquadIds, type DepthTone, type LineupResult, type SlotResult } from "@/lib/fm/tactics";
import { roleDefaultNames, roleTraitClashes, strikerAerial, suggestPlayerInstructions, type PISuggestion } from "@/lib/fm/playerInstructions";
import { bestGroupRoles, recommendRoleGroups, recommendRoles, recommendedRoleIds } from "@/lib/fm/styleRoles";
import { AREA_LABEL, FUNCTION_HINT, FUNCTION_LABEL, FUNCTION_ORDER, tacticBalance, type BalanceIssue } from "@/lib/fm/balance";
import { useAppStore } from "@/lib/store";
import { ScoreBadge } from "@/components/AttrCell";

const TONE_CLASS = {
  elite: "text-attr-elite",
  good: "text-attr-good",
  ok: "text-attr-mid",
  poor: "text-attr-low",
  na: "text-muted",
} as const;

const DEPTH_CLASS: Record<DepthTone, string> = { good: "text-attr-good", ok: "text-attr-mid", poor: "text-attr-low" };

const ISSUE_ICON: Record<BalanceIssue["level"], string> = { warn: "⚠", info: "ℹ", tip: "→", ok: "✓" };
const ISSUE_CLASS: Record<BalanceIssue["level"], string> = { warn: "text-attr-mid", info: "text-muted", tip: "text-attr-good", ok: "text-attr-good" };

const MOTOR_CLASS = { alto: "text-attr-good", medio: "text-attr-mid", "medio-cond": "text-attr-mid", bajo: "text-attr-low" } as const;

interface InstrGroup { key: string; label: string; kind: "axis" | "choice" | "single"; items: InstructionFit[] }

/** Agrupa las instrucciones de una fase: deslizadores, opciones excluyentes y casillas sueltas. */
function groupInstructions(fits: InstructionFit[], phase: InstructionPhase): InstrGroup[] {
  const list = fits.filter((f) => f.instruction.phase === phase);
  const out: InstrGroup[] = [];
  const seen = new Set<string>();
  for (const f of list) {
    const g = f.instruction.group;
    if (!g) { out.push({ key: f.instruction.id, label: f.instruction.name, kind: "single", items: [f] }); continue; }
    if (seen.has(g)) continue;
    seen.add(g);
    const items = list.filter((x) => x.instruction.group === g).sort((a, b) => (a.instruction.level ?? 0) - (b.instruction.level ?? 0));
    out.push({ key: g, label: AXIS_GROUPS[g] ?? CHOICE_GROUPS[g] ?? g, kind: g in AXIS_GROUPS ? "axis" : "choice", items });
  }
  return out;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export default function TacticPage() {
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const players = allPlayers.plantilla;
  const filiales = useMemo(() => squads.filter((q) => q.kind === "filial"), [squads]);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeId = useAppStore((s) => s.activeTacticId);
  const addTactic = useAppStore((s) => s.addTactic);
  const updateTactic = useAppStore((s) => s.updateTactic);
  const removeTactic = useAppStore((s) => s.removeTactic);
  const setActiveTactic = useAppStore((s) => s.setActiveTactic);
  const playerTraits = useAppStore((s) => s.playerTraits);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [hoverSlots, setHoverSlots] = useState<string[]>([]);

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

  const poolLineup = useMemo(() => (tactic && players.length ? lineupForPool(tactic, allPlayers, squads) : null), [tactic, players.length, allPlayers, squads]);
  const lineup: LineupResult | null = poolLineup?.lineup ?? null;
  const depth = useMemo(() => (tactic && players.length ? depthMap(tactic, players) : []), [tactic, players]);
  const hasYouth = useMemo(() => youthSquadIds(squads).length > 0, [squads]);
  const balance = useMemo(() => (tactic ? tacticBalance(tactic, { lineup, traits: playerTraits }) : null), [tactic, lineup, playerTraits]);
  const advice = useMemo(() => (tactic && lineup ? tacticAdvice(tactic, lineup) : []), [tactic, lineup]);
  const styleRank = useMemo(() => (lineup ? rankStyles(lineup) : []), [lineup]);
  const formationRank = useMemo(() => {
    if (!tactic || !players.length) return [];
    const pool = poolPlayers(tactic, allPlayers, squads);
    return pool.players.length ? rankFormations(pool.players, pool.exclude) : [];
  }, [tactic, players.length, allPlayers, squads]);
  const currentStyle = tactic?.styleId ? STYLE_BY_ID[tactic.styleId] : null;
  const roleRecs = useMemo(() => {
    if (!tactic || !lineup) return [];
    const pool = poolPlayers(tactic, allPlayers, squads);
    const players = pool.exclude ? pool.players.filter((p) => !pool.exclude!.has(p.uid)) : pool.players;
    return recommendRoles(tactic.styleId, lineup, players);
  }, [tactic, lineup, allPlayers, squads]);
  const roleGroupRecs = useMemo(() => (tactic && lineup && roleRecs.length ? recommendRoleGroups(tactic, lineup, roleRecs) : []), [tactic, lineup, roleRecs]);
  const currentFit = currentStyle ? styleRank.find((f) => f.style.id === currentStyle.id) ?? null : null;
  const fits = useMemo(() => (lineup ? INSTRUCTIONS.map((i) => instructionFit(i, lineup)) : []), [lineup]);
  const piBySlot = useMemo(() => {
    const m = new Map<string, PISuggestion[]>();
    if (!lineup || !tactic) return m;
    const starters = lineup.slots.filter((s) => s.starter).map((s) => ({ player: s.starter!.player, slot: s.slot.slot }));
    const aerial = strikerAerial(starters);
    const teamRoles = lineup.slots.map((s) => s.role);
    const wideAerial = (side: "L" | "R") => Math.max(0, ...starters.filter((x) => x.slot.endsWith(side) && x.slot !== "DL" && x.slot !== "DR").map((x) => ((x.player.attrs.Hea?.value ?? 0) + (x.player.attrs.Jum?.value ?? 0)) / 2));
    for (const s of lineup.slots) {
      if (!s.starter) continue;
      const side = s.slot.slot.endsWith("L") ? "R" : s.slot.slot.endsWith("R") ? "L" : null;
      m.set(s.slot.id, suggestPlayerInstructions(s.starter.player, {
        slot: s.slot.slot, role: s.role, styleId: tactic.styleId, traitIds: playerTraits[s.starter.player.uid] ?? [], teamRoles, strikerAerial: aerial,
        farPostAerial: side ? wideAerial(side) : undefined,
      }));
    }
    return m;
  }, [lineup, tactic, playerTraits]);

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
  const poolId = tactic.pool ?? "plantilla";
  const locks = tacticLocks(tactic);
  const toggleLock = (slotId: string, uid: string | null) =>
    updateTactic(tactic.id, (t) => {
      const next = { ...tacticLocks(t) };
      if (uid === null || next[slotId] === uid) delete next[slotId];
      else next[slotId] = uid;
      return withLocks(t, t.pool ?? "plantilla", next);
    });
  const gapBySlot = new Map((poolLineup?.gaps ?? []).map((g) => [g.slotId, g]));
  const swapBySlot = new Map((poolLineup?.cup?.swaps ?? []).map((w) => [w.slotId, w]));
  const showYouth = poolId === "copa";
  const changeFormation = (formationId: string) => {
    const fresh = newTactic(formationId, tactic.name);
    updateTactic(tactic.id, { formationId, roles: fresh.roles, locks: {} });
    setSelectedSlot(null);
  };
  const applyStyle = (styleId: string) => {
    const st = STYLE_BY_ID[styleId];
    updateTactic(tactic.id, { styleId, instructions: st ? [...st.instructions] : [], mentality: st?.mentalityId ?? tactic.mentality });
  };
  /** Activa una instrucción respetando su grupo de exclusión. */
  const applyInstruction = (id: string) =>
    updateTactic(tactic.id, (t) => {
      const instr = INSTRUCTION_BY_ID[id];
      let next = t.instructions.filter((x) => x !== id);
      if (instr.group) next = next.filter((x) => INSTRUCTION_BY_ID[x].group !== instr.group);
      return { ...t, instructions: [...next, id] };
    });
  const removeInstruction = (id: string) => updateTactic(tactic.id, (t) => ({ ...t, instructions: t.instructions.filter((x) => x !== id) }));
  const clearGroup = (group: string) => updateTactic(tactic.id, (t) => ({ ...t, instructions: t.instructions.filter((x) => INSTRUCTION_BY_ID[x]?.group !== group) }));
  const toggleInstruction = (id: string) =>
    updateTactic(tactic.id, (t) => {
      const instr = INSTRUCTION_BY_ID[id];
      const active = t.instructions.includes(id);
      let next = t.instructions.filter((x) => x !== id);
      if (!active) {
        if (instr.group) next = next.filter((x) => INSTRUCTION_BY_ID[x].group !== instr.group);
        next.push(id);
      }
      return { ...t, instructions: next };
    });
  const styleModified = !!currentStyle && !sameSet(tactic.instructions, currentStyle.instructions);
  const gapsCurrent = currentFit?.gaps ?? [];
  const children = currentStyle ? styleChildren(currentStyle.id) : [];
  const levers = currentStyle ? styleLevers(currentStyle.id) : [];

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
        <select className="bg-surface border border-border rounded px-2 py-1" value={poolId} onChange={(e) => updateTactic(tactic.id, { pool: e.target.value })} title="Con qué jugadores se arma el XI. Cada plantilla tiene sus propios fijados.">
          <option value="plantilla">{POOL_LABEL.plantilla}</option>
          <option value="segundo">{POOL_LABEL.segundo} (sin los titulares)</option>
          {hasYouth && <option value="juveniles">{POOL_LABEL.juveniles} (todos los filiales juveniles)</option>}
          {hasYouth && <option value="copa">{POOL_LABEL.copa} (primer equipo + juveniles)</option>}
          {filiales.length > 0 && (
            <optgroup label="Un filial">
              {filiales.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </optgroup>
          )}
        </select>
        {poolId === "copa" && (
          <label className="flex items-center gap-1 text-xs" title="Cuenta como juvenil quien está importado en un filial juvenil (con edad máxima), no por edad.">
            Mínimo de juveniles
            <input
              type="number" min={0} max={11}
              className="w-12 bg-surface border border-border rounded px-1 py-0.5"
              value={tactic.cupYouthMin ?? DEFAULT_CUP_YOUTH}
              onChange={(e) => updateTactic(tactic.id, { cupYouthMin: Math.max(0, Math.min(11, Number(e.target.value) || 0)) })}
            />
          </label>
        )}
        <select className="bg-surface border border-border rounded px-2 py-1" value={tactic.formationId} onChange={(e) => changeFormation(e.target.value)}>
          {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="bg-surface border border-border rounded px-2 py-1 max-w-[260px]" value={tactic.styleId ?? ""} onChange={(e) => e.target.value && applyStyle(e.target.value)} title="Cargar las instrucciones y la mentalidad del estilo (los cambios posteriores se conservan)">
          <option value="">Estilo: personalizado</option>
          {(Object.keys(STYLES_BY_FAMILY) as StyleFamily[]).map((fam) => (
            <optgroup key={fam} label={FAMILY_LABEL[fam]}>
              {STYLES_BY_FAMILY[fam].map((s) => <option key={s.id} value={s.id}>{s.parent ? "↳ " : ""}{s.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select
          className="bg-surface border border-border rounded px-2 py-1"
          value={tactic.mentality ?? "equilibrada"}
          title={MENTALITY_BY_ID[tactic.mentality ?? "equilibrada"]?.idea}
          onChange={(e) => updateTactic(tactic.id, { mentality: e.target.value })}
        >
          {MENTALITIES.map((m) => <option key={m.id} value={m.id} title={m.idea}>Mentalidad: {m.name}</option>)}
        </select>
        <button className="px-2 py-1 rounded border border-border hover:bg-surface-2" onClick={() => addTactic(newTactic(tactic.formationId, `${tactic.name} (copia)`))}>
          Nueva
        </button>
        <button className="px-2 py-1 rounded border border-border hover:bg-surface-2 text-attr-low" onClick={() => removeTactic(tactic.id)} disabled={tactics.length <= 1}>
          Eliminar
        </button>
        {lineup && (
          <div className="ml-auto text-xs text-muted">
            Media del XI: <ScoreBadge score={lineup.average} /> · {currentStyle ? `${currentStyle.name}${styleModified ? " (ajustado)" : ""}: ${currentStyle.description}` : "instrucciones personalizadas"}
          </div>
        )}
      </div>

      {poolLineup?.cup && (
        <p className={`text-xs ${poolLineup.cup.count < poolLineup.cup.min ? "text-attr-low" : "text-muted"}`}>
          🎓 Juveniles en el XI: {poolLineup.cup.count} de {poolLineup.cup.min} como mínimo.
          {poolLineup.cup.swaps.length > 0 && ` Entran ${poolLineup.cup.swaps.length} por el mínimo; el XI pierde ${poolLineup.cup.cost.toFixed(1)} puntos de media: ${poolLineup.cup.swaps.map((w) => `${w.player.name} por ${w.replaced?.name ?? "—"} (−${w.cost.toFixed(0)})`).join(", ")}.`}
          {poolLineup.cup.count < poolLineup.cup.min && " No hay juveniles suficientes importados: importa los filiales juveniles."}
        </p>
      )}
      {poolLineup && poolLineup.gaps.length > 0 && (
        <p className="text-xs text-attr-low">Falta de profundidad en el segundo equipo: {poolLineup.gaps.length} {poolLineup.gaps.length === 1 ? "hueco" : "huecos"} en rojo en el campo.</p>
      )}

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
            const recommended = recommendedRoleIds(tactic.styleId, s.slot.slot);
            const isSel = selectedSlot === s.slot.id;
            const gap = gapBySlot.get(s.slot.id);
            const swap = swapBySlot.get(s.slot.id);
            const isYouth = showYouth && !!s.starter && !!poolLineup?.youth.has(s.starter.player.uid);
            return (
              <div
                key={s.slot.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[120px] rounded-md border bg-surface/95 shadow-sm text-[11px] cursor-pointer ${isSel ? "border-accent ring-2 ring-accent/40" : hoverSlots.includes(s.slot.id) ? "border-attr-mid ring-2 ring-attr-mid/50" : gap ? "border-attr-low ring-2 ring-attr-low/40" : "border-border"}`}
                style={{ left: `${s.slot.x}%`, top: `${100 - s.slot.y}%` }}
                onClick={() => setSelectedSlot(s.slot.id)}
                title={gap?.text ?? (swap ? `Juvenil por el mínimo: entra por ${swap.replaced?.name ?? "—"}, cuesta ${swap.cost.toFixed(1)} puntos` : undefined)}
              >
                <div className="flex items-center justify-between px-1.5 pt-1">
                  <span className="text-muted">{POSITION_LABEL[s.slot.slot]}</span>
                  {s.starter && <ScoreBadge score={s.starter.effective} />}
                </div>
                <div className="px-1.5 font-medium truncate" title={s.starter?.player.name}>
                  {s.starter && locks[s.slot.id] === s.starter.player.uid && <span title="Fijado">📌 </span>}
                  {isYouth && <span title={swap ? `Juvenil por el mínimo (−${swap.cost.toFixed(0)})` : "Juvenil"}>🎓 </span>}
                  {s.starter?.player.name ?? (gap?.repeat ? <span className="text-attr-low">falta · {gap.repeat.name}</span> : "—")}
                  {s.starter && s.starter.familiarity < 1 && <span className="text-attr-mid" title="No domina la posición"> *</span>}
                </div>
                <select
                  className="w-full bg-transparent border-t border-border px-1 py-0.5 text-[11px]"
                  value={s.role.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRole(s.slot.id, e.target.value)}
                >
                  {roleOptions.map((r) => <option key={r.id} value={r.id}>{recommended.has(r.id) ? "★ " : ""}{r.es} ({DUTY_LABEL[r.duty]})</option>)}
                </select>
              </div>
            );
          })}
        </div>

        {/* Panel lateral */}
        <aside className="space-y-3 text-sm">
          <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
            <h2 className="font-semibold">{selected ? `${POSITION_LABEL[selected.slot.slot]} · ${selected.role.es} (${DUTY_LABEL[selected.role.duty]})` : "Profundidad"}</h2>
            {!selected && (
              <>
                <p className="text-xs text-muted">Haz clic en un hueco del campo para ver candidatos y fijar un jugador. Los fijados son de la plantilla elegida ({POOL_LABEL[poolId] ?? filiales.find((q) => q.id === poolId)?.name}).</p>
                {depth.length > 0 && (
                  <table className="tbl w-full text-xs" title="Titular del primer XI y suplente real: quien juega ese hueco en el segundo XI (cada jugador cuenta una vez).">
                    <thead><tr><th>Hueco</th><th>Titular</th><th>Suplente real</th><th className="num">Dif.</th></tr></thead>
                    <tbody>
                      {depth.map((d) => (
                        <tr key={d.slot.slot.id}>
                          <td className="text-muted">{POSITION_LABEL[d.slot.slot.slot]}</td>
                          <td className="truncate max-w-[110px]">{d.slot.starter?.player.name ?? "—"}</td>
                          <td className={`truncate max-w-[110px] ${DEPTH_CLASS[d.tone]}`}>{d.backup ? `${d.backup.player.name}${d.backup.familiarity < 0.85 ? " *" : ""}` : "nadie"}</td>
                          <td className={`num ${DEPTH_CLASS[d.tone]}`}>{d.gap == null ? "—" : `−${Math.max(0, d.gap).toFixed(0)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {depth.length > 0 && <p className="text-[11px] text-muted">Verde: a 8 puntos o menos. Ámbar: hasta 15. Rojo: más lejos, sin suplente o con el suplente fuera de su puesto (*).</p>}
              </>
            )}
            {selected && (() => {
              const e = balance?.entries.find((x) => x.slotId === selected.slot.id);
              if (!e || !e.fns.length) return e?.free ? <p className="text-[11px] text-muted">Rol libre: no trae instrucciones de serie; lo que hace depende de los rasgos del jugador y de lo que le añadas.</p> : null;
              return (
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-muted">Funciones{e.free ? " (rol libre, por rasgos)" : ""}:</span>
                  {e.fns.map((fn) => <span key={fn} className="px-1 rounded border border-border" title={`${FUNCTION_LABEL[fn]}: ${e.why[fn]}`}>{FUNCTION_LABEL[fn]}</span>)}
                </div>
              );
            })()}
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
                          {locks[selected.slot.id] === c!.player.uid ? "soltar" : "fijar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {balance && (() => {
            const problems = balance.issues.filter((i) => i.level !== "ok" && !i.intended);
            const intended = balance.issues.filter((i) => i.intended);
            const good = balance.issues.filter((i) => i.level === "ok");
            const issueRow = (i: BalanceIssue, k: number, cls = ISSUE_CLASS[i.level]) => (
              <p key={k} className={`text-xs ${cls}`} onMouseEnter={() => setHoverSlots(i.slots)} onMouseLeave={() => setHoverSlots([])}>
                {ISSUE_ICON[i.level]} <span className="text-muted">{AREA_LABEL[i.area]} ·</span> {i.text}
                {i.intended && <span className="text-muted"> Intencionado ({i.intended}).</span>}
              </p>
            );
            return (
              <section className="bg-surface border border-border rounded-lg p-3 space-y-1.5">
                <h2 className="font-semibold">Equilibrio por funciones</h2>
                <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px]">
                  {FUNCTION_ORDER.map((fn) => (
                    <span key={fn} title={FUNCTION_HINT[fn]} className={`cursor-help ${balance.counts[fn] ? "" : "text-muted"}`}
                      onMouseEnter={() => setHoverSlots(balance.entries.filter((e) => e.fns.includes(fn)).map((e) => e.slotId))} onMouseLeave={() => setHoverSlots([])}>
                      {FUNCTION_LABEL[fn]} <b>{balance.counts[fn]}</b>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted">
                  Deberes {balance.duties.D} De · {balance.duties.S} Ap · {balance.duties.A} At (referencia 3 · 4 · 3) ·{" "}
                  <span onMouseEnter={() => setHoverSlots(balance.veryAttacking.map((e) => e.slotId))} onMouseLeave={() => setHoverSlots([])}>{balance.veryAttacking.length} en Muy ofensiva</span> con el equipo en {balance.teamMentality}.
                  Las funciones salen de las instrucciones de serie de cada rol; pasa el ratón para verlas en el campo.
                </p>
                {problems.length === 0 && <p className="text-xs text-attr-good">Sin avisos: la combinación de roles es coherente.</p>}
                {problems.map((i, k) => issueRow(i, k))}
                {intended.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted">Intencionado por el plan ({intended.length})</summary>
                    <div className="mt-1 space-y-1">{intended.map((i, k) => issueRow(i, k, "text-muted"))}</div>
                  </details>
                )}
                {good.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-xs text-attr-good">Lo que encaja ({good.length})</summary>
                    <div className="mt-1 space-y-1">{good.map((i, k) => issueRow(i, k))}</div>
                  </details>
                )}
              </section>
            );
          })()}

          {lineup && (
            <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <h2 className="font-semibold">Estilo de juego</h2>
              {currentStyle && currentFit && (
                <div className="text-xs space-y-1">
                  <div><b>{currentStyle.name}</b> <span className="text-muted">({currentStyle.en}) · mentalidad {currentStyle.mentality}</span></div>
                  <div className="text-muted">
                    {FAMILY_LABEL[currentStyle.family]}{currentStyle.parent && STYLE_BY_ID[currentStyle.parent] ? ` · evoluciona desde ${STYLE_BY_ID[currentStyle.parent].name}` : " · estilo raíz"} · forma {currentStyle.forma} · <span className={MOTOR_CLASS[currentStyle.motor]} title={currentStyle.motorNote ?? ""}>{MOTOR_LABEL[currentStyle.motor]} en el motor</span>
                  </div>
                  <p className="text-muted">{currentStyle.origin}</p>
                  <p className="text-muted">{currentStyle.when}</p>
                  <div className="flex flex-wrap gap-x-3">
                    {(["def", "mid", "att"] as const).map((u) => (
                      <span key={u}>{UNIT_SHORT[u]} <b className={currentFit.units[u] == null ? "text-muted" : currentFit.units[u]! >= 14.5 ? "text-attr-elite" : currentFit.units[u]! >= 13 ? "text-attr-good" : currentFit.units[u]! >= 11.5 ? "text-attr-mid" : "text-attr-low"}>{currentFit.units[u]?.toFixed(1) ?? "–"}</b></span>
                    ))}
                    <span className="text-muted" title={currentStyle.attrs.def.join(" ") + " / " + currentStyle.attrs.mid.join(" ") + " / " + currentStyle.attrs.att.join(" ")}>atributos clave por unidad</span>
                  </div>
                  {!currentFit.formationOk && <p className="text-attr-mid">⚠ {lineup.formation.name} no está entre las formaciones típicas del estilo: {currentStyle.formations.map((f) => FORMATIONS.find((x) => x.id === f)?.name ?? f).join(", ")}.</p>}
                  {currentFit.avoided.map((a, i) => <p key={i} className="text-attr-mid">⚠ {a.role} ({a.player}) le sienta mal a este estilo.</p>)}
                  {gapsCurrent.length > 0 && (
                    <div>
                      <div className="font-medium">Qué te falta para jugarlo {currentFit.missing === 0 ? <span className="text-attr-good">· nada, lo tienes todo</span> : <span className="text-attr-mid">· {currentFit.missing} de {gapsCurrent.length}</span>}</div>
                      <ul className="space-y-0.5">
                        {gapsCurrent.map((g, i) => <li key={i} className={g.ok ? "text-attr-good" : "text-attr-mid"}>{g.ok ? "✓" : "✗"} {g.req.label} <span className="text-muted">— {g.detail}</span></li>)}
                      </ul>
                    </div>
                  )}
                  <details>
                    <summary className="cursor-pointer text-muted">Principios y roles-firma</summary>
                    <ul className="mt-1 space-y-0.5 list-disc pl-4">
                      {currentStyle.principles.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                    <ul className="mt-1 space-y-0.5">
                      {currentStyle.signature.map((r, i) => {
                        const have = lineup.slots.filter((s) => r.codes.includes(s.role.code));
                        return <li key={i} className={have.length ? "text-attr-good" : "text-muted"}>{have.length ? "✓" : "○"} {r.label}{have.length ? ` (${have.map((s) => s.starter?.player.name ?? "—").join(", ")})` : ""}</li>;
                      })}
                    </ul>
                    {currentStyle.motorNote && <p className="mt-1 text-muted">Motor: {currentStyle.motorNote}</p>}
                    {currentStyle.manMarking && <p className="mt-1 text-muted">Marcaje al hombre: se da por jugador («Marcajes más férreos»), ver instrucciones individuales.</p>}
                  </details>
                  <details>
                    <summary className="cursor-pointer text-muted">Fortalezas, debilidades y roles</summary>
                    <ul className="mt-1 space-y-0.5">
                      {currentStyle.strengths.map((t, i) => <li key={"s" + i} className="text-attr-good">+ {t}</li>)}
                      {currentStyle.weaknesses.map((t, i) => <li key={"w" + i} className="text-attr-low">− {t}</li>)}
                    </ul>
                    <p className="mt-1 text-muted">Pide: {currentStyle.roles.favor.join(", ")}. Evita: {currentStyle.roles.avoid.join(", ")}.</p>
                  </details>
                  <details>
                    <summary className="cursor-pointer text-muted">Palancas en partido ({levers.length})</summary>
                    <ul className="mt-1 space-y-1">
                      {levers.map((l, i) => (
                        <li key={i}>
                          <b>{l.symptom}</b> → {l.instruction ? INSTRUCTION_BY_ID[l.instruction]?.name ?? l.instruction : l.label}
                          {l.instruction && !tactic.instructions.includes(l.instruction) && <button className="ml-1 text-[10px] px-1 rounded border border-border hover:bg-surface-2" onClick={() => { for (const r of l.remove ?? []) removeInstruction(r); applyInstruction(l.instruction!); }}>aplicar</button>}
                          {!l.instruction && l.remove?.some((r) => tactic.instructions.includes(r)) && <button className="ml-1 text-[10px] px-1 rounded border border-border hover:bg-surface-2" onClick={() => { for (const r of l.remove ?? []) removeInstruction(r); }}>aplicar</button>}
                          <span className="text-muted"> — {l.effect}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[10px] text-muted">Primero los highlights, luego una sola palanca (04texag). En la pestaña Rival aparecen junto al plan de presión.</p>
                  </details>
                  {children.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-muted">Puede evolucionar a ({children.length})</summary>
                      <ul className="mt-1 space-y-0.5">
                        {children.map((c) => {
                          const f = styleRank.find((x) => x.style.id === c.id);
                          return <li key={c.id}><button className="hover:underline" onClick={() => applyStyle(c.id)}>{c.name}</button> <span className="text-muted">— faltan {f?.missing ?? "?"} de {c.evolution.length} requisitos{f && f.missing > 0 ? `: ${f.gaps.filter((g) => !g.ok).map((g) => g.req.label).join("; ")}` : ""}</span></li>;
                        })}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-xs text-muted">¿Qué formación encaja mejor con esta plantilla?</summary>
                <table className="tbl w-full mt-1">
                  <thead><tr><th>Formación</th><th className="num">Media XI</th><th className="num">Fondo</th></tr></thead>
                  <tbody>
                    {formationRank.map((f) => (
                      <tr key={f.formation.id} className={f.formation.id === tactic.formationId ? "font-medium" : ""}>
                        <td><button className="text-left hover:underline" onClick={() => changeFormation(f.formation.id)}>{f.formation.name}</button></td>
                        <td className="num text-xs">{f.average.toFixed(1)}</td>
                        <td className="num text-xs text-muted">{f.floor.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-muted mt-1">Mejor XI con los roles por defecto de cada formación. «Fondo» = media sin los tres mejores huecos (cuánto aguanta sin sus estrellas). Clic cambia la formación (los roles vuelven a los de por defecto).</p>
              </details>
              <details>
                <summary className="cursor-pointer text-xs text-muted">¿Qué estilo encaja mejor con este XI?</summary>
                <table className="tbl w-full mt-1">
                  <thead><tr><th>Estilo</th><th className="num">Def</th><th className="num">Med</th><th className="num">Ata</th><th className="num">Media</th><th className="num" title="Requisitos de evolución que faltan">Faltan</th></tr></thead>
                  <tbody>
                    {styleRank.map((f) => (
                      <tr key={f.style.id} className={f.style.id === tactic.styleId ? "font-medium" : ""}>
                        <td>
                          <button className="text-left hover:underline" title={`${f.style.description}\n${f.style.when}`} onClick={() => applyStyle(f.style.id)}>{f.style.name}</button>
                          {f.avoided.length > 0 && <span className="text-attr-mid" title={f.avoided.map((a) => `${a.role}: ${a.player}`).join("\n")}> ⚠{f.avoided.length}</span>}
                          {!f.formationOk && <span className="text-muted" title="formación no típica del estilo"> ▫</span>}
                        </td>
                        {(["def", "mid", "att"] as const).map((u) => <td key={u} className="num text-xs">{f.units[u]?.toFixed(1) ?? "–"}</td>)}
                        <td className="num text-xs font-medium">{f.mean?.toFixed(1) ?? "–"}</td>
                        <td className={`num text-xs ${f.gaps.length === 0 ? "text-muted" : f.missing === 0 ? "text-attr-good" : "text-attr-mid"}`} title={f.gaps.filter((g) => !g.ok).map((g) => `${g.req.label}: ${g.detail}`).join("\n") || "sin requisitos pendientes"}>{f.gaps.length ? `${f.missing}/${f.gaps.length}` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-muted mt-1">Media 1-20 de los atributos clave del estilo en los titulares de cada unidad (con el XI de esta formación). ⚠ roles del XI que el estilo desaconseja; ▫ formación no típica; «Faltan» = requisitos de evolución (roles-firma, atributos por línea, polivalencia) que el XI no cumple. Clic para aplicar el estilo.</p>
              </details>
            </section>
          )}

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

      {/* Roles que pide el estilo */}
      {currentStyle && lineup && roleRecs.length > 0 && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Roles para {currentStyle.name}</h2>
            <span className="text-xs text-muted">{roleRecs.filter((r) => !r.currentOk).length === 0 ? "todos los huecos usan un rol del estilo" : `${roleRecs.filter((r) => !r.currentOk).length} hueco(s) con un rol fuera de las opciones del estilo`}</span>
            {roleRecs.some((r) => !r.currentOk && r.options.length) && (
              <button className="text-xs px-2 py-0.5 rounded border border-border hover:bg-surface-2" onClick={() => {
                const roles = { ...tactic.roles };
                const grouped = new Set(roleGroupRecs.flatMap((g) => g.slotIds));
                for (const r of roleRecs) if (!grouped.has(r.slotId) && !r.currentOk && r.options.length) roles[r.slotId] = (r.options.slice().sort((a, b) => (b.starter ?? 0) - (a.starter ?? 0))[0]).role.id;
                const best = bestGroupRoles(tactic, lineup, roleRecs);
                for (const g of roleGroupRecs) if (g.slotIds.some((id) => !roleRecs.find((r) => r.slotId === id)?.currentOk)) for (const id of g.slotIds) roles[id] = best[id];
                updateTactic(tactic.id, { roles });
              }}>Poner en cada hueco (o pareja) la opción que mejor le va a los titulares</button>
            )}
          </div>
          <p className="text-xs text-muted">No es un rol fijo: cada estilo admite varias opciones por hueco. Los huecos que se juegan juntos (centrales, medios, delanteros y cada banda) se eligen por parejas: cada combinación se puntúa con los titulares y con el detector de equilibrio. ★ en los desplegables del campo = opción del estilo. Clic en una opción para ponerla.</p>
          {roleGroupRecs.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
              {roleGroupRecs.map((g) => {
                const rows = g.combos.some((c) => c.current) ? g.combos : [...g.combos, g.current];
                const names = g.slotIds.map((id) => lineup.slots.find((s) => s.slot.id === id)?.starter?.player.name.split(" ").slice(-1)[0] ?? "—");
                return (
                  <div key={g.key} className={`bg-surface border rounded-lg p-2.5 text-xs ${g.combos[0]?.current ? "border-border" : "border-attr-mid/60"}`}
                    onMouseEnter={() => setHoverSlots(g.slotIds)} onMouseLeave={() => setHoverSlots([])}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium">{g.label}</span>
                      <span className="text-muted truncate">{g.slotIds.map((id, k) => `${POSITION_LABEL[lineup.slots.find((s) => s.slot.id === id)!.slot.slot]} ${names[k]}`).join(" · ")}</span>
                    </div>
                    <ul className="space-y-1">
                      {rows.map((c, k) => (
                        <li key={k} className={c.current ? "font-medium" : ""}>
                          <div className="flex items-start gap-1.5">
                            <button className={`text-left hover:underline ${c.current ? "text-accent" : ""}`} title="Poner esta combinación" onClick={() => updateTactic(tactic.id, (t) => ({ ...t, roles: { ...t.roles, ...Object.fromEntries(g.slotIds.map((id, j) => [id, c.roles[j].id])) } }))}>
                              {c.current ? "● " : "○ "}{c.roles.map((r) => `${r.es} (${DUTY_LABEL[r.duty]})`).join(" + ")}
                            </button>
                            <span className="ml-auto whitespace-nowrap text-muted" title={`Titulares ${c.score.toFixed(0)} · equilibrio ${c.balance >= 0 ? "+" : ""}${c.balance.toFixed(0)}`}><ScoreBadge score={c.score} /></span>
                          </div>
                          {c.good.slice(0, 1).map((x, j) => <div key={"g" + j} className="text-attr-good font-normal pl-3">✓ {x}</div>)}
                          {c.bad.slice(0, 2).map((x, j) => <div key={"b" + j} className={`font-normal pl-3 ${x.level === "warn" ? "text-attr-mid" : "text-muted"}`}>{x.level === "warn" ? "⚠" : "ℹ"} {x.text}</div>)}
                          {c.current && !g.combos.includes(c) && <div className="text-muted font-normal pl-3">(tu combinación actual)</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
            {roleRecs.filter((r) => !roleGroupRecs.some((g) => g.slotIds.includes(r.slotId))).map((r) => (
              <div key={r.slotId} className={`bg-surface border rounded-lg p-2.5 text-xs ${r.currentOk ? "border-border" : "border-attr-mid/60"}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-muted">{POSITION_LABEL[r.slot]}</span>
                  <span className="font-medium truncate">{lineup.slots.find((s) => s.slot.id === r.slotId)?.starter?.player.name ?? "—"}</span>
                  <span className={`ml-auto whitespace-nowrap ${r.currentOk ? "text-attr-good" : "text-attr-mid"}`}>{r.currentOk ? "✓" : "⚠"} {r.current.es} ({DUTY_LABEL[r.current.duty]})</span>
                </div>
                {r.note && <div className="text-muted mb-1">{r.note}</div>}
                <ul className="space-y-0.5">
                  {r.options.map((op) => {
                    const active = op.role.id === r.current.id;
                    return (
                      <li key={op.role.id} className={`flex items-start gap-1.5 ${active ? "font-medium" : ""}`}>
                        <button className={`text-left hover:underline whitespace-nowrap ${active ? "text-accent" : ""}`} onClick={() => setRole(r.slotId, op.role.id)} title={op.why}>{active ? "● " : "○ "}{op.role.es} ({DUTY_LABEL[op.role.duty]})</button>
                        <span className="text-muted min-w-0 whitespace-normal">— {op.why}</span>
                        <span className="ml-auto whitespace-nowrap text-muted">
                          {op.starter != null && <ScoreBadge score={op.starter} />}
                          {op.best && op.best.player.uid !== lineup.slots.find((s) => s.slot.id === r.slotId)?.starter?.player.uid && op.best.score > (op.starter ?? 0) + 3 && <span title={`mejor para este rol: ${op.best.player.name}`}> · {op.best.player.name.split(" ").slice(-1)[0]} <ScoreBadge score={op.best.score} /></span>}
                        </span>
                      </li>
                    );
                  })}
                  {r.options.length === 0 && <li className="text-muted">El estilo no dice nada de este hueco.</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Instrucciones */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Instrucciones de equipo</h2>
        <p className="text-xs text-muted">
          Nombres y deslizadores tal como aparecen en el creador de tácticas de FM24 (en español). El número es la media (1-20) de los atributos que la instrucción exige a los titulares afectados; manda el requisito más débil.
          Elige un estilo arriba para cargar un conjunto coherente y ajústalo aquí: el estilo se conserva como base{styleModified ? " (ahora mismo, ajustado)" : ""}.
        </p>
        {advice.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-3 space-y-1.5">
            <h3 className="font-medium text-sm">Consejos para esta táctica y este XI</h3>
            {advice.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={a.level === "warn" ? "text-attr-mid" : a.level === "tip" ? "text-attr-good" : "text-muted"}>{a.level === "warn" ? "⚠" : a.level === "tip" ? "→" : "ℹ"}</span>
                <span className="flex-1">{a.text}</span>
                {a.apply && (
                  <button className="text-[10px] px-1.5 rounded border border-border hover:bg-surface-2 whitespace-nowrap" onClick={() => applyInstruction(a.apply!)}>
                    activar «{INSTRUCTION_BY_ID[a.apply].name}»
                  </button>
                )}
                {a.remove && (
                  <button className="text-[10px] px-1.5 rounded border border-border hover:bg-surface-2 whitespace-nowrap" onClick={() => removeInstruction(a.remove!)}>
                    quitar «{INSTRUCTION_BY_ID[a.remove].name}»
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-3">
          {(["posesion", "transicion", "sin-balon"] as InstructionPhase[]).map((phase) => (
            <div key={phase} className="bg-surface border border-border rounded-lg p-3">
              <h3 className="font-medium mb-2">{PHASE_LABEL[phase]}</h3>
              <div className="space-y-1.5">
                {groupInstructions(fits, phase).map((g) => {
                  const tipOf = (f: InstructionFit) => f.reqs
                    .map((r) => `${r.req.why}: ${r.mean?.toFixed(1) ?? "—"}` + (r.players.length ? ` (peor: ${r.players.slice(0, 2).map((p) => `${p.name} ${p.mean.toFixed(1)}`).join(", ")})` : ""))
                    .join("\n") || "No depende de atributos";
                  if (g.kind === "single") {
                    const f = g.items[0];
                    const active = tactic.instructions.includes(f.instruction.id);
                    return (
                      <label key={g.key} className={`flex items-center gap-2 text-xs px-1.5 py-1 rounded cursor-pointer ${active ? "bg-accent/15" : "hover:bg-surface-2"}`} title={tipOf(f)}>
                        <input type="checkbox" checked={active} onChange={() => toggleInstruction(f.instruction.id)} />
                        <span className="flex-1">{f.instruction.name}</span>
                        <span className={`font-mono ${TONE_CLASS[fitTone(f.mean)]}`}>{f.mean != null ? f.mean.toFixed(1) : "·"}</span>
                      </label>
                    );
                  }
                  const activeId = g.items.find((f) => tactic.instructions.includes(f.instruction.id))?.instruction.id ?? null;
                  const hasZero = g.items.some((f) => f.instruction.level === 0);
                  return (
                    <div key={g.key} className="text-xs px-1.5 py-1 rounded border border-border/60">
                      <div className="text-muted mb-0.5">{g.label}</div>
                      <div className="flex flex-wrap gap-1">
                        {!hasZero && (
                          <button className={`px-1.5 py-0.5 rounded border text-[11px] ${activeId == null ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`} onClick={() => clearGroup(g.key)} title="Sin instrucción: el valor estándar del juego">
                            {g.kind === "axis" ? "Estándar" : "Ninguna"}
                          </button>
                        )}
                        {g.items.map((f) => {
                          const active = activeId === f.instruction.id;
                          return (
                            <button key={f.instruction.id} className={`px-1.5 py-0.5 rounded border text-[11px] ${active ? "bg-accent text-accent-fg border-accent" : "border-border hover:bg-surface-2"}`} title={`${f.instruction.name}\n${tipOf(f)}`} onClick={() => (active && !hasZero ? clearGroup(g.key) : applyInstruction(f.instruction.id))}>
                              {f.instruction.short ?? f.instruction.name} <span className={`font-mono ${active ? "" : TONE_CLASS[fitTone(f.mean)]}`}>{f.mean != null ? f.mean.toFixed(1) : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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

      {/* Instrucciones individuales */}
      {lineup && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Instrucciones individuales sugeridas</h2>
          <p className="text-xs text-muted">
            Por titular, según rol, estilo, atributos, pie fuerte y rasgos registrados. Nunca propone una instrucción que el rol ya trae de serie ni una que el juego no deja poner. ●●● muy recomendable · ●●○ recomendable · ●○○ opcional.
            <span className="text-attr-good"> ✓ rasgo</span> = ya lo hace por un rasgo (no hace falta darla); <span className="text-attr-low">✗ rasgo</span> = un rasgo suyo la contradice.
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
            {lineup.slots.map((s) => {
              const sug = piBySlot.get(s.slot.id) ?? [];
              const def = roleDefaultNames(s.role, s.slot.slot);
              const clashes = s.starter ? roleTraitClashes(s.role, s.slot.slot, playerTraits[s.starter.player.uid] ?? []) : [];
              return (
                <div key={s.slot.id} className="bg-surface border border-border rounded-lg p-2.5 text-xs">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-muted">{POSITION_LABEL[s.slot.slot]}</span>
                    <span className="font-medium">{s.starter?.player.name ?? "—"}</span>
                    <span className="text-muted">{s.role.es} ({DUTY_LABEL[s.role.duty]})</span>
                  </div>
                  <div className="text-muted mb-1" title={def.blocked.length ? `No se pueden poner: ${def.blocked.join(", ")}` : undefined}>
                    De serie: {def.part.length ? def.part.join(", ") : "ninguna"}
                  </div>
                  {clashes.map((c) => (
                    <div key={c.trait.id} className="text-attr-low">✗ Rasgo «{c.trait.es}» va contra «{c.pi.es}», que el rol trae de serie</div>
                  ))}
                  {sug.length === 0 && <div className="text-muted">Sin sugerencias: las del rol bastan.</div>}
                  <ul className="space-y-0.5">
                    {sug.map((x) => (
                      <li key={x.pi.id} className={x.coveredBy ? "opacity-60" : ""} title={`${x.pi.en}\n${x.why}`}>
                        <span className="font-mono text-muted">{"●".repeat(x.strength)}{"○".repeat(3 - x.strength)}</span>{" "}
                        <b>{x.pi.es}</b> <span className="text-muted">— {x.why}</span>
                        {x.coveredBy && <span className="text-attr-good"> ✓ {x.coveredBy.es}</span>}
                        {x.contradictedBy && <span className="text-attr-low"> ✗ {x.contradictedBy.es}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
