"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATTR_BY_KEY } from "@/lib/fm/attributes";
import { ROLES, ROLE_BY_ID, roleLabel, type RoleDef } from "@/lib/fm/roles";
import { bestRoles } from "@/lib/fm/scoring";
import { buildLineup } from "@/lib/fm/tactics";
import { TRAIT_BY_ID, TRAIT_CATEGORY_LABEL, assessTrait, hasPoorWeakerFoot, reviewCurrentTraits, suggestTraits, traitsAvailableFor, traitsConflict, type TraitCategory, type TraitDef } from "@/lib/fm/traits";
import { normalizeHeader } from "@/lib/fm/attributes";
import type { Player } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";

const VERDICT_CLASS = {
  recomendado: "border-attr-good/60 text-attr-good",
  neutro: "border-border text-foreground",
  perjudicial: "border-attr-low/60 text-attr-low",
} as const;

const CATEGORIES: TraitCategory[] = ["movimiento", "pase", "tiro", "defensa", "tecnica", "portero", "personalidad"];

/** Busca el rasgo por nombre en español (para "rasgo en aprendizaje" del export). */
function findTraitByName(name: string | null): TraitDef | null {
  if (!name) return null;
  const n = normalizeHeader(name);
  return Object.values(TRAIT_BY_ID).find((t) => normalizeHeader(t.es) === n || normalizeHeader(t.en) === n) ?? null;
}

export default function TraitsPage() {
  const players = useAppStore((s) => s.players.plantilla);
  const hydrated = useAppStore((s) => s.hydrated);
  const tactics = useAppStore((s) => s.tactics);
  const activeTacticId = useAppStore((s) => s.activeTacticId);
  const playerTraits = useAppStore((s) => s.playerTraits);
  const setPlayerTraits = useAppStore((s) => s.setPlayerTraits);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const tactic = tactics.find((t) => t.id === activeTacticId) ?? tactics[0] ?? null;

  /** uid → rol en la táctica activa (titular) */
  const tacticRole = useMemo(() => {
    const m = new Map<string, RoleDef>();
    if (!tactic || !players.length) return m;
    const l = buildLineup(tactic, players);
    for (const s of l.slots) if (s.starter) m.set(s.starter.player.uid, s.role);
    return m;
  }, [tactic, players]);

  const roleFor = (uid: string): RoleDef | null => {
    const ov = roleOverride[uid];
    if (ov) return ROLE_BY_ID[ov];
    const t = tacticRole.get(uid);
    if (t) return t;
    const p = players.find((x) => x.uid === uid);
    if (!p) return null;
    const b = bestRoles(p, 1)[0];
    return b ? ROLE_BY_ID[b.roleId] : null;
  };

  const rows = useMemo(
    () =>
      players.map((p) => {
        const role = roleFor(p.uid);
        const ids = playerTraits[p.uid] ?? [];
        const review = role ? reviewCurrentTraits(role, p.attrs, ids) : [];
        const bad = review.filter((r) => r.verdict === "perjudicial").length;
        const sug = role ? suggestTraits(role, p.attrs, ids, p.isGoalkeeper, { weakerFootPoor: hasPoorWeakerFoot(p.leftFoot, p.rightFoot) }) : [];
        return { p, role, ids, bad, sug, inTactic: tacticRole.has(p.uid) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, playerTraits, tacticRole, roleOverride],
  );

  if (hydrated && players.length === 0) {
    return (
      <div className="text-sm text-muted">
        No hay plantilla importada. <Link href="/" className="text-accent underline">Importa una exportación</Link> primero.
      </div>
    );
  }

  const sel = rows.find((r) => r.p.uid === selectedUid) ?? null;
  const learning = sel ? findTraitByName(sel.p.learningTrait) : null;

  const addTrait = (uid: string, id: string) => {
    const cur = playerTraits[uid] ?? [];
    if (cur.includes(id)) return;
    setPlayerTraits(uid, [...cur, id]);
  };
  const removeTrait = (uid: string, id: string) => setPlayerTraits(uid, (playerTraits[uid] ?? []).filter((x) => x !== id));

  const available = sel ? traitsAvailableFor(sel.p.isGoalkeeper) : [];
  const q = normalizeHeader(query);
  const filtered = available.filter((t) => !sel?.ids.includes(t.id) && (!q || normalizeHeader(t.es).includes(q) || normalizeHeader(t.en).includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">Rasgos</h1>
        <p className="text-xs text-muted">
          El juego no exporta los rasgos: introdúcelos una vez por jugador (quedan guardados). Las recomendaciones usan el rol que tiene en la táctica activa
          {tactic ? ` (${tactic.name})` : ""}, o su mejor rol si no es titular.
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
        {/* Lista */}
        <div className="overflow-auto border border-border rounded-md max-h-[calc(100vh-160px)]">
          <table className="tbl w-full">
            <thead><tr><th>Jugador</th><th>Rol</th><th className="num">Rasgos</th><th className="num">Sugerencias</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.uid} className={`cursor-pointer ${selectedUid === r.p.uid ? "bg-accent/15" : ""}`} onClick={() => { setSelectedUid(r.p.uid); setQuery(""); }}>
                  <td className="font-medium">{r.p.name} <span className="text-muted text-[10px]">{r.p.age}</span></td>
                  <td className="text-xs text-muted">{r.role ? `${r.role.code}-${r.role.duty}` : "—"}{r.inTactic ? "" : " ·"}</td>
                  <td className="num">
                    {r.ids.length}{r.bad > 0 && <span className="text-attr-low" title={`${r.bad} rasgo(s) perjudiciales para el rol`}> ⚠{r.bad}</span>}
                  </td>
                  <td className="num text-attr-good">{r.sug.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalle */}
        {!sel ? (
          <div className="text-sm text-muted">Selecciona un jugador.</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{sel.p.name}</h2>
              <span className="text-muted text-xs">{sel.p.position.raw} · {sel.p.age} años · {sel.p.personality ?? "—"}</span>
              <label className="ml-auto text-xs flex items-center gap-1">
                Evaluar para el rol:
                <select
                  className="bg-surface border border-border rounded px-1 py-0.5 text-xs"
                  value={sel.role?.id ?? ""}
                  onChange={(e) => setRoleOverride({ ...roleOverride, [sel.p.uid]: e.target.value })}
                >
                  {ROLES.filter((r) => r.positions.includes("GK") === sel.p.isGoalkeeper).map((r) => (
                    <option key={r.id} value={r.id}>{roleLabel(r)}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Rasgos actuales */}
            <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <h3 className="font-medium">Rasgos actuales</h3>
              {sel.ids.length === 0 && <p className="text-xs text-muted">Ninguno registrado. Añádelos abajo tal como aparecen en el perfil del jugador en el juego.</p>}
              <div className="flex flex-wrap gap-1.5">
                {sel.role && reviewCurrentTraits(sel.role, sel.p.attrs, sel.ids).map((a) => (
                  <span key={a.trait.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${VERDICT_CLASS[a.verdict]}`} title={`${a.trait.en}\n${a.verdict} para ${roleLabel(sel.role!)}`}>
                    {a.trait.es}
                    {a.conflictsWith.length > 0 && <span title={`Incompatible con: ${a.conflictsWith.map((c) => c.es).join(", ")}`}>⚡</span>}
                    <button className="text-muted hover:text-attr-low" onClick={() => removeTrait(sel.p.uid, a.trait.id)} aria-label="quitar">×</button>
                  </span>
                ))}
              </div>
              {learning && !sel.ids.includes(learning.id) && (
                <p className="text-xs text-muted">
                  Según la exportación está aprendiendo <b>{learning.es}</b>.{" "}
                  <button className="text-accent underline" onClick={() => addTrait(sel.p.uid, learning.id)}>Añadir como actual</button>
                </p>
              )}
              <div className="pt-1">
                <input
                  className="bg-surface border border-border rounded px-2 py-1 text-xs w-full"
                  placeholder="Buscar rasgo para añadir… (escribe parte del nombre en español o inglés)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <div className="mt-1 max-h-48 overflow-auto border border-border rounded-md">
                    {filtered.slice(0, 20).map((t) => {
                      const conflict = sel.ids.some((id) => traitsConflict(id, t.id));
                      return (
                        <button
                          key={t.id}
                          className="w-full text-left text-xs px-2 py-1 hover:bg-surface-2 flex justify-between gap-2"
                          onClick={() => { addTrait(sel.p.uid, t.id); setQuery(""); }}
                        >
                          <span>{t.es} <span className="text-muted">· {t.en}</span></span>
                          {conflict && <span className="text-attr-low">incompatible con uno actual</span>}
                        </button>
                      );
                    })}
                    {filtered.length === 0 && <div className="text-xs text-muted px-2 py-1">Sin resultados.</div>}
                  </div>
                )}
              </div>
            </section>

            {/* Recomendaciones */}
            <div className="grid md:grid-cols-2 gap-3">
              <section className="bg-surface border border-border rounded-lg p-3">
                <h3 className="font-medium mb-1">Enseñar (para {sel.role ? roleLabel(sel.role) : "—"})</h3>
                {sel.sug.length === 0 && <p className="text-xs text-muted">Nada recomendable que cumpla los mínimos de atributos y no choque con sus rasgos actuales.</p>}
                <ol className="space-y-1 text-xs">
                  {sel.sug.slice(0, 8).map(({ assessment: a, margin }) => (
                    <li key={a.trait.id} className="flex items-start gap-2">
                      <span className="text-attr-good">＋</span>
                      <div className="flex-1">
                        <div className="font-medium">{a.trait.es} <span className="text-muted font-normal">· {a.trait.en}</span></div>
                        <div className="text-muted">
                          {TRAIT_CATEGORY_LABEL[a.trait.category]}
                          {Object.keys(a.trait.needs).length > 0 && ` · margen +${margin.toFixed(1)} sobre ${Object.entries(a.trait.needs).map(([k, v]) => `${ATTR_BY_KEY[k as keyof typeof ATTR_BY_KEY].es} ${v}`).join(", ")}`}
                        </div>
                      </div>
                      <button className="text-[10px] px-1 rounded border border-border hover:bg-surface-2" onClick={() => addTrait(sel.p.uid, a.trait.id)}>ya lo tiene</button>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <h3 className="font-medium">Revisar</h3>
                {sel.role && (() => {
                  const review = reviewCurrentTraits(sel.role, sel.p.attrs, sel.ids);
                  const bad = review.filter((a) => a.verdict === "perjudicial");
                  const conflicts = review.filter((a) => a.conflictsWith.length > 0);
                  const nearMiss = suggestNearMisses(sel.role, sel.p, sel.ids);
                  return (
                    <>
                      {bad.length === 0 && conflicts.length === 0 && <p className="text-xs text-attr-good">Ningún rasgo actual estorba en este rol.</p>}
                      {bad.map((a) => (
                        <p key={a.trait.id} className="text-xs"><span className="text-attr-low">− {a.trait.es}</span> <span className="text-muted">perjudica a {roleLabel(sel.role!)}; considera desaprenderlo o cambiarle el rol.</span></p>
                      ))}
                      {conflicts.map((a) => (
                        <p key={`c-${a.trait.id}`} className="text-xs"><span className="text-attr-mid">⚡ {a.trait.es}</span> <span className="text-muted">es incompatible con {a.conflictsWith.map((c) => c.es).join(", ")}: el juego no permite ambos, revisa la entrada.</span></p>
                      ))}
                      {nearMiss.length > 0 && (
                        <div className="pt-1">
                          <div className="text-xs font-medium text-muted mb-0.5">Recomendados pero con atributos justos</div>
                          {nearMiss.map((a) => (
                            <p key={a.trait.id} className="text-xs text-muted">
                              {a.trait.es}: falta {a.missing.map((m) => `${ATTR_BY_KEY[m.key].es} ${m.have ?? "?"}/${m.need}`).join(", ")}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            </div>

            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Catálogo completo por categoría</summary>
              <div className="grid md:grid-cols-2 gap-x-6 mt-2">
                {CATEGORIES.map((c) => (
                  <div key={c} className="mb-2">
                    <div className="font-medium text-foreground">{TRAIT_CATEGORY_LABEL[c]}</div>
                    {available.filter((t) => t.category === c).map((t) => <div key={t.id}>{t.es} <span className="opacity-60">· {t.en}</span></div>)}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

/** Recomendados para el rol que fallan por poco en atributos (≤ 2 puntos). */
function suggestNearMisses(role: RoleDef, p: Player, ids: string[]) {
  return traitsAvailableFor(p.isGoalkeeper)
    .filter((t) => !t.mentoringOnly && !ids.includes(t.id))
    .map((t) => assessTrait(t, role, p.attrs, ids))
    .filter((a) => a.verdict === "recomendado" && a.conflictsWith.length === 0 && a.missing.length > 0 && a.missing.every((m) => m.have != null && m.need - m.have <= 2))
    .slice(0, 5);
}
