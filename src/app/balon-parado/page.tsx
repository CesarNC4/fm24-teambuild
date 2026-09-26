"use client";

import Link from "next/link";
import { useMemo } from "react";
import { captainCandidates, setPiecePlan, type Taker } from "@/lib/fm/setpieces";
import { lineupForPool, POOL_LABEL } from "@/lib/fm/tactics";
import { useAppStore } from "@/lib/store";
import { SpecialistsPanel } from "@/components/Specialists";
import type { SpecialistGroup } from "@/lib/fm/specialists";

const SET_PIECE_GROUPS: SpecialistGroup[] = ["balon-parado"];

function TakerList({ title, takers, hint }: { title: string; takers: Taker[]; hint?: string }) {
  return (
    <div className="bg-surface border border-border rounded-md p-3 text-xs">
      <div className="font-medium text-sm mb-1">{title}</div>
      {hint && <p className="text-muted mb-1">{hint}</p>}
      {takers.length === 0 && <p className="text-muted">—</p>}
      {takers.map((t, i) => (
        <div key={t.player.uid} className="flex justify-between gap-2">
          <span>{i + 1}. {t.player.name}{t.note && <span className="text-attr-mid" title={t.note}> ⚠</span>}</span>
          <span className="text-muted">{t.score.toFixed(1)}</span>
        </div>
      ))}
      {takers.some((t) => t.note) && <p className="text-attr-mid mt-1">{takers.find((t) => t.note)?.note}</p>}
    </div>
  );
}

export default function SetPiecesPage() {
  const allPlayers = useAppStore((s) => s.players);
  const squads = useAppStore((s) => s.squads);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);

  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;
  const firstTeam = useMemo(() => allPlayers.plantilla ?? [], [allPlayers.plantilla]);
  const lineup = useMemo(() => {
    if (!tactic || !firstTeam.length) return null;
    return lineupForPool(tactic, allPlayers, squads).lineup;
  }, [tactic, firstTeam.length, allPlayers, squads]);
  const plan = useMemo(() => (lineup ? setPiecePlan(lineup) : null), [lineup]);
  const captains = useMemo(() => captainCandidates(firstTeam, lineup).slice(0, 5), [firstTeam, lineup]);
  const xiUids = useMemo(() => new Set(lineup?.slots.map((s) => s.starter?.player.uid).filter((u): u is string => !!u) ?? []), [lineup]);

  if (hydrated && firstTeam.length === 0) {
    return <div className="text-sm text-muted">No hay plantilla importada. <Link href="/" className="text-accent underline">Importa el primer equipo</Link> primero.</div>;
  }
  if (!tactic || !plan) {
    return <div className="text-sm text-muted">Crea una táctica en <Link href="/tactica" className="text-accent underline">Táctica</Link>: los lanzadores salen del XI titular.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Balón parado y capitanes</h1>
        <span className="text-xs text-muted">XI de {tactic.name} ({POOL_LABEL[tactic.pool ?? "plantilla"] ?? squads.find((q) => q.id === tactic.pool)?.name ?? "primer equipo"})</span>
      </div>

      {plan.notes.length > 0 && (
        <section className="bg-surface border border-border rounded-lg p-3 space-y-1">
          {plan.notes.map((n, i) => <p key={i} className="text-xs">ℹ {n}</p>)}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Lanzadores</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <TakerList title="Córners desde la izquierda" takers={plan.cornersLeft} hint="Índice «Lanzador de córner» (Córners 35, Técnica 20, Centros 20…) con la rosca hacia dentro: pie derecho. El mejor rematador no debería lanzar." />
          <TakerList title="Córners desde la derecha" takers={plan.cornersRight} hint="Lo mismo con el pie izquierdo." />
          <TakerList title="Faltas directas" takers={plan.freeKicksDirect} hint="Índice «Tiro libre directo»: Faltas 35, Tiros lejanos, Técnica, Decisiones y Serenidad." />
          <TakerList title="Faltas escoradas (centros)" takers={plan.freeKicksIndirect} hint="Índice «Faltas escoradas»: Faltas 35, Técnica 20, Centros 20…" />
          <TakerList title="Penaltis" takers={plan.penalties} hint="Índice «Penaltis»: Penaltis 40, Serenidad 30, Remate…" />
          <TakerList title="Saques de banda largos" takers={plan.longThrows} hint="Índice «Saque de banda largo»: Saques largos 60, Técnica, Visión. Solo si el primero pasa de 12." />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Rutina de córner recomendada (arrastre)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <TakerList title="Primer palo" takers={plan.routine.nearPost ? [plan.routine.nearPost] : []} hint="El mejor perfil (Salto, Fuerza, Cabeceo, altura): la rutina principal va a él." />
          <TakerList title="Segundo palo (dos)" takers={plan.routine.farPost} hint="Dos buenos rematadores que arrastran marcadores y reciben la prolongación." />
          <TakerList title="Estorbar al portero" takers={plan.routine.onKeeper ? [plan.routine.onKeeper] : []} hint="Alto, fuerte y valiente, pegado al portero." />
          <TakerList title="Perfil ideal (0-20)" takers={plan.routine.ideal} hint="Salto 16-17, Fuerza 15-16, Cabeceo 15 y más de 1,90. En el creador de balón parado: varias rutinas con frecuencia (primer palo alta, segundo palo media, en corto baja); el motor la respeta." />
        </div>
        <p className="text-xs text-muted">Contra cada rival, la pestaña Rival dice a qué palo insistir según la altura y el cabeceo de sus defensas.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Córners a favor y en contra</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <TakerList title="Rematadores (a favor)" takers={plan.aerialTargets} hint="Índice «Amenaza aérea» (Salto, Fuerza, Cabeceo, altura…): al primer palo el mejor, al segundo el siguiente, y uno al punto de penalti." />
          <TakerList title="Borde del área" takers={plan.edgeOfBox} hint="Índice «Tiros lejanos» para el rechace, sin gastar rematadores." />
          <TakerList title="Se quedan atrás" takers={plan.stayBack} hint="Rápidos y sin remate: dos atrás contra el contra." />
          <TakerList title="Marcadores (en contra)" takers={plan.aerialDefenders} hint="Índices «Cabezazo defensivo» y «Marcaje»: marcan a los altos del rival." />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Especialistas de balón parado en toda la plantilla</h2>
        <p className="text-xs text-muted">Los mismos índices, con todo el primer equipo y no solo el XI: sirve para saber a quién meter en los últimos minutos para un córner o un penalti. «XI» = titular en esta táctica.</p>
        <SpecialistsPanel players={firstTeam} groups={SET_PIECE_GROUPS} highlight={xiUids} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Capitán y segundo capitán</h2>
        <div className="overflow-auto border border-border rounded-md">
          <table className="tbl w-full">
            <thead><tr><th>#</th><th>Jugador</th><th className="num">Edad</th><th className="num">Lid</th><th className="num">Det</th><th>Personalidad</th><th>A favor</th><th>En contra</th></tr></thead>
            <tbody>
              {captains.map((c, i) => (
                <tr key={c.player.uid} className={i === 0 ? "font-medium" : ""}>
                  <td>{i === 0 ? "Capitán" : i === 1 ? "Segundo" : i + 1}</td>
                  <td>{c.player.name}</td>
                  <td className="num">{c.player.age ?? "–"}</td>
                  <td className="num">{c.player.attrs.Ldr?.value ?? "–"}</td>
                  <td className="num">{c.player.attrs.Det?.value ?? "–"}</td>
                  <td className="text-xs">{c.player.personality ?? "—"}</td>
                  <td className="text-xs text-muted whitespace-normal">{c.reasons.join(", ") || "—"}</td>
                  <td className="text-xs text-attr-mid whitespace-normal">{c.warnings.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Liderazgo ×3, determinación, personalidad, edad (27+), titularidad y estatus; penaliza personalidad floja, prensa conflictiva y juventud. El segundo capitán conviene que juegue cuando el primero no.</p>
      </section>
    </div>
  );
}
