"use client";

import { useCallback, useMemo, useState } from "react";
import { ATTRIBUTES, ATTR_BY_KEY } from "@/lib/fm/attributes";
import { parseFmHtml } from "@/lib/fm/parser";
import type { ImportResult, ImportSource } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";
import { coverageText, useLeague } from "@/lib/useLeague";
import { STAFF_KIND_LABEL, isStaffExport, parseStaffHtml, type StaffKind } from "@/lib/fm/staff";

const FIELD_OPTIONS: { value: string; label: string }[] = [
  ["name", "Nombre"], ["age", "Edad"], ["wage", "Sueldo"], ["value", "Valor de traspaso"],
  ["nationality", "Nacionalidad"], ["position", "Posición"], ["personality", "Personalidad"],
  ["mediaHandling", "Trato con los medios"], ["avgRating", "Nota media"], ["leftFoot", "Pie izquierdo"],
  ["rightFoot", "Pie derecho"], ["height", "Altura"], ["uid", "UID"], ["club", "Club"],
  ["contractExpiry", "Fin de contrato"], ["preferredFoot", "Pie preferido"],
].map(([v, l]) => ({ value: `field:${v}`, label: l }));

const ATTR_OPTIONS = ATTRIBUTES.map((a) => ({ value: `attr:${a.key}`, label: `${a.es} (${a.key})` }));

function labelFor(key: string | null): string {
  if (!key) return "— ignorar —";
  const [kind, k] = key.split(":");
  if (kind === "attr") return `${ATTR_BY_KEY[k as keyof typeof ATTR_BY_KEY]?.es ?? k} (${k})`;
  return FIELD_OPTIONS.find((o) => o.value === key)?.label ?? k;
}

async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export default function ImportPage() {
  const setPlayers = useAppStore((s) => s.setPlayers);
  const imports = useAppStore((s) => s.imports);
  const clearSource = useAppStore((s) => s.clearSource);
  const squads = useAppStore((s) => s.squads);
  const addSquad = useAppStore((s) => s.addSquad);
  const updateSquad = useAppStore((s) => s.updateSquad);
  const removeSquad = useAppStore((s) => s.removeSquad);
  const [newSquad, setNewSquad] = useState("");
  const [newRival, setNewRival] = useState("");
  const [newRivalComp, setNewRivalComp] = useState<"liga" | "internacional">("liga");
  const leagueSize = useAppStore((s) => s.leagueSize);
  const setLeagueSize = useAppStore((s) => s.setLeagueSize);
  const league = useLeague();
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const exportBackup = () => {
    const s = useAppStore.getState();
    const data = { version: 1, exportedAt: new Date().toISOString(), players: s.players, imports: s.imports, squads: s.squads, headerOverrides: s.headerOverrides, clubName: s.clubName, tactics: s.tactics, activeTacticId: s.activeTacticId, playerTraits: s.playerTraits, trainingWeek: s.trainingWeek, scoutingBudget: s.scoutingBudget, history: s.history, targets: s.targets, leagueSize: s.leagueSize, staff: s.staff, staffImport: s.staffImport, clubDna: s.clubDna, createdFocuses: s.createdFocuses };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fm24-asistente-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !data.players) throw new Error("no es una copia de FM24 Asistente");
      restoreBackup(data);
      setBackupMsg(`Copia restaurada (${Object.values(data.players as Record<string, unknown[]>).reduce((n, l) => n + l.length, 0)} jugadores, ${(data.tactics ?? []).length} tácticas).`);
    } catch (e) {
      setBackupMsg(`No se pudo restaurar: ${(e as Error).message}`);
    }
  };
  const staff = useAppStore((s) => s.staff);
  const staffImport = useAppStore((s) => s.staffImport);
  const importStaff = useAppStore((s) => s.importStaff);
  const clearStaff = useAppStore((s) => s.clearStaff);
  const savedOverrides = useAppStore((s) => s.headerOverrides);
  const setHeaderOverrides = useAppStore((s) => s.setHeaderOverrides);

  const [source, setSource] = useState<ImportSource>("plantilla");
  const [html, setHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string | null>>(savedOverrides);
  const [saved, setSaved] = useState(false);
  /** Liga / ojeados: fusionar con lo ya guardado (el juego exporta la búsqueda por trozos). */
  const [append, setAppend] = useState(false);
  const existing = useAppStore((s) => s.players[source] ?? []);
  const existingMeta = imports[source];
  const canAppend = source === "liga" || source === "ojeados";

  const staffPreview = useMemo(() => (html && isStaffExport(html) ? parseStaffHtml(html) : null), [html]);
  const { result, error } = useMemo<{ result: ImportResult | null; error: string | null }>(() => {
    if (!html || staffPreview) return { result: null, error: null };
    try {
      return { result: parseFmHtml(html, overrides), error: null };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [html, overrides, staffPreview]);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setSaved(false);
    setFileName(file.name);
    setHtml(await readFileText(file));
  }, []);

  const save = () => {
    if (!result) return;
    let players = result.players;
    let name = fileName;
    if (append && canAppend && existing.length) {
      const fresh = new Set(players.map((p) => p.uid));
      players = [...existing.filter((p) => !fresh.has(p.uid)), ...players];
      const prev = existingMeta?.fileName ?? "";
      const n = (prev.match(/\+ (\d+) más/)?.[1] ?? "0");
      name = prev.includes(" + ") ? prev.replace(/\+ \d+ más/, `+ ${Number(n) + 1} más`) : `${prev} + 1 más`;
    }
    setPlayers(source, players, { fileName: name, importedAt: new Date().toISOString(), count: players.length });
    setHeaderOverrides(overrides);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <section className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Importar exportación de FM24</h1>
          <ol className="text-sm text-muted list-decimal pl-5 space-y-1">
            <li>En el juego, abre la vista de <b>Plantilla</b> (o la lista de ojeados, una búsqueda de toda la liga, o la plantilla del próximo rival) con una vista que muestre <b>todos los atributos</b>, posición, edad, personalidad, sueldo, valor y fin de contrato.</li>
            <li>Pulsa <kbd className="px-1 rounded bg-surface-2 border border-border">Ctrl</kbd>+<kbd className="px-1 rounded bg-surface-2 border border-border">P</kbd> → <i>Página web</i> y guarda el archivo.</li>
            <li>Súbelo aquí. Revisa las columnas detectadas y guarda.</li>
          </ol>

          <label
            className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          >
            <input type="file" accept=".html,.htm,text/html" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <div className="text-sm">{fileName ? <b>{fileName}</b> : "Arrastra el archivo .html aquí o haz clic para elegirlo"}</div>
          </label>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted">Importar como:</span>
            {squads.map((q) => (
              <label key={q.id} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="source" checked={source === q.id} onChange={() => setSource(q.id)} />
                {q.name}
              </label>
            ))}
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newSquad.trim();
                if (!name) return;
                const m = /(\d{2})/.exec(name);
                const id = addSquad({ name, kind: "filial", maxAge: m ? Number(m[1]) : null, competitive: /\bB\b|filial|reserv/i.test(name) && !m });
                setSource(id);
                setNewSquad("");
              }}
            >
              <input className="bg-surface border border-border rounded px-2 py-0.5 w-32" placeholder="Sub-21, Sub-18, Equipo B…" value={newSquad} onChange={(e) => setNewSquad(e.target.value)} />
              <button className="px-2 py-0.5 rounded border border-border hover:bg-surface-2" type="submit">+ filial</button>
            </form>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newRival.trim();
                if (!name) return;
                const id = addSquad({ name, kind: "rival", maxAge: null, competitive: true, competition: newRivalComp });
                setSource(id);
                setNewRival("");
              }}
            >
              <input className="bg-surface border border-border rounded px-2 py-0.5 w-32" placeholder="Próximo rival…" value={newRival} onChange={(e) => setNewRival(e.target.value)} />
              <select className="bg-surface border border-border rounded px-1 py-0.5" value={newRivalComp} onChange={(e) => setNewRivalComp(e.target.value as "liga" | "internacional")} title="Los rivales de liga se suman solos a la liga calculada">
                <option value="liga">Liga</option>
                <option value="internacional">Internacional</option>
              </select>
              <button className="px-2 py-0.5 rounded border border-border hover:bg-surface-2" type="submit">+ rival</button>
            </form>
          </div>

          {error && <div className="text-sm text-attr-low">{error}</div>}
        </div>

        <aside className="bg-surface border border-border rounded-lg p-4 text-sm space-y-3 h-fit">
          <h2 className="font-semibold">Datos guardados</h2>
          {squads.map((q) => {
            const m = imports[q.id];
            return (
              <div key={q.id} className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{q.name}</div>
                  <div className="text-muted text-xs">
                    {m ? `${m.count} jugadores · ${m.fileName} · ${new Date(m.importedAt).toLocaleString("es")}` : "vacío"}
                  </div>
                  {q.kind === "rival" && (
                    <label className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      competición
                      <select className="bg-surface border border-border rounded px-1" value={q.competition ?? "liga"} onChange={(e) => updateSquad(q.id, { competition: e.target.value as "liga" | "internacional" })}>
                        <option value="liga">Liga (cuenta para la liga)</option>
                        <option value="internacional">Internacional (no cuenta)</option>
                      </select>
                    </label>
                  )}
                  {q.kind === "liga" && (
                    <div className="text-xs text-muted mt-0.5">Opcional: completa los clubes que aún no has importado como rival.</div>
                  )}
                  {q.kind === "filial" && (
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <label>
                        edad máx.{" "}
                        <input
                          className="bg-surface border border-border rounded px-1 w-12"
                          value={q.maxAge ?? ""}
                          placeholder="—"
                          onChange={(e) => updateSquad(q.id, { maxAge: e.target.value ? Number(e.target.value) : null })}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={q.competitive} onChange={(e) => updateSquad(q.id, { competitive: e.target.checked })} /> liga competitiva
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {m && (
                    <button className="text-xs text-attr-low hover:underline" onClick={() => clearSource(q.id)}>
                      borrar
                    </button>
                  )}
                  {(q.kind === "filial" || q.kind === "rival") && (
                    <button className="text-xs text-muted hover:underline" onClick={() => { if (source === q.id) setSource("plantilla"); removeSquad(q.id); }}>
                      quitar {q.kind}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="border-t border-border pt-2 space-y-1 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">Empleados (red de ojeo)</div>
                <div className="text-muted">
                  {staffImport ? `${staff.filter((m) => !m.gone).length} en el club · ${staffImport.fileName} · ${new Date(staffImport.importedAt).toLocaleString("es")}` : "vacío: exporta la vista de empleados con Juz. Cal, Juz. Pot y Ada"}
                  {staff.some((m) => m.gone) && ` · ${staff.filter((m) => m.gone).length} ya no están`}
                </div>
              </div>
              {staffImport && <button className="text-xs text-attr-low hover:underline" onClick={clearStaff}>borrar</button>}
            </div>
          </div>
          <div className="border-t border-border pt-2 space-y-1 text-xs">
            <div className="font-medium">Liga calculada</div>
            <p className="text-muted">Tu primer equipo + los rivales marcados como Liga + la búsqueda de liga, sin duplicados: por jugador gana la importación más reciente, y quien ya no sale en la exportación nueva de su club deja de contar para él.</p>
            <p>{league.players.length ? coverageText(league) : "Todavía vacía."}{league.dropped > 0 ? ` · ${league.dropped} bajas detectadas` : ""}</p>
            <label className="flex items-center gap-1 text-muted">
              clubes en tu liga
              <input className="bg-surface border border-border rounded px-1 w-12" type="number" min={2} max={40} value={leagueSize} onChange={(e) => setLeagueSize(Math.max(2, Number(e.target.value) || 20))} />
            </label>
            {league.clubs.length > 0 && (
              <details>
                <summary className="cursor-pointer text-muted">clubes con datos ({league.clubs.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {league.clubs.map((c) => (
                    <li key={c.club} className="flex justify-between gap-2">
                      <span>{c.club}</span>
                      <span className="text-muted">{c.players} · {c.from === "primer" ? "tu plantilla" : c.from === "rival" ? "rival" : "búsqueda"}{c.importedAt ? ` · ${new Date(c.importedAt).toLocaleDateString("es")}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <p className="text-xs text-muted">Todo se guarda solo en este navegador; nada se sube a ningún servidor.</p>
          <div className="border-t border-border pt-2 space-y-1">
            <div className="font-medium text-xs">Copia de seguridad</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button className="px-2 py-0.5 rounded border border-border hover:bg-surface-2" onClick={exportBackup}>Exportar todo (.json)</button>
              <label className="px-2 py-0.5 rounded border border-border hover:bg-surface-2 cursor-pointer">
                Restaurar copia…
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => importBackup(e.target.files?.[0])} />
              </label>
            </div>
            <p className="text-xs text-muted">Incluye plantillas, filiales, tácticas, rasgos, historial y objetivos. Restaurar sustituye lo que haya en este navegador.</p>
            {backupMsg && <p className="text-xs">{backupMsg}</p>}
          </div>
        </aside>
      </section>

      {staffPreview && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>Exportación de <b>empleados</b>: <b>{staffPreview.length}</b> leídos ({(["ojeador", "analista", "direccion", "entrenador"] as StaffKind[]).map((k) => `${staffPreview.filter((m) => m.kind === k).length} ${k === "ojeador" ? "ojeadores" : k === "analista" ? "analistas" : k === "direccion" ? "de dirección" : "del cuerpo técnico"}`).join(", ")})</div>
            <button
              onClick={() => { importStaff(parseStaffHtml(html!), { fileName, importedAt: new Date().toISOString(), count: staffPreview.length }); setSaved(true); }}
              className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-fg font-medium"
            >
              Guardar empleados
            </button>
            {saved && <span className="text-attr-good">Guardado ✓</span>}
          </div>
          <p className="text-xs text-muted">Sustituye a la red guardada: los nuevos entran y los que ya no aparecen quedan como «ya no está» (sus focos se marcan para reasignar). El director deportivo, el secretario técnico y el mánager de cesiones no se asignan a focos.</p>
          <div className="overflow-auto border border-border rounded-md">
            <table className="tbl w-full">
              <thead><tr><th>Nombre</th><th>Empleo</th><th>Uso en la app</th><th>Nac</th><th className="num">Ada</th><th className="num">Juz. Cal</th><th className="num">Juz. Pot</th></tr></thead>
              <tbody>
                {staffPreview.map((m) => (
                  <tr key={m.name}>
                    <td>{m.name}{staff.length > 0 && !staff.some((x) => x.name === m.name) && <span className="text-attr-good"> · nuevo</span>}</td>
                    <td>{m.job}</td>
                    <td className="text-muted">{STAFF_KIND_LABEL[m.kind]}</td>
                    <td>{m.nationality ?? "—"}</td>
                    <td className="num">{m.adaptability ?? "–"}</td>
                    <td className="num">{m.judgeAbility ?? "–"}</td>
                    <td className="num">{m.judgePotential ?? "–"}</td>
                  </tr>
                ))}
                {staff.filter((x) => !x.gone && !staffPreview.some((m) => m.name === x.name)).map((x) => (
                  <tr key={"gone-" + x.name} className="text-attr-low"><td>{x.name}</td><td>{x.job}</td><td colSpan={5}>no está en esta exportación: quedará como «ya no está»</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div><b>{result.players.length}</b> jugadores leídos</div>
            <div><b>{result.headers.length}</b> columnas</div>
            <div className={result.missingAttrs.length ? "text-attr-mid" : "text-attr-good"}>
              {result.missingAttrs.length ? `${result.missingAttrs.length} atributos sin columna` : "47/47 atributos detectados"}
            </div>
            {result.droppedRows > 0 && <div className="text-attr-low">{result.droppedRows} filas descartadas</div>}
            {canAppend && existing.length > 0 && (
              <label className="ml-auto flex items-center gap-1 text-xs cursor-pointer" title="El juego solo exporta las filas que ha cargado en pantalla. Exporta la búsqueda por trozos (por posición o por club) y añádelos aquí uno a uno; los jugadores repetidos se sustituyen por UID.">
                <input type="checkbox" checked={append} onChange={(e) => setAppend(e.target.checked)} />
                añadir a los {existing.length} ya guardados (fusiona por UID)
              </label>
            )}
            <button
              onClick={save}
              disabled={result.players.length === 0}
              className={`${canAppend && existing.length > 0 ? "" : "ml-auto "}px-4 py-1.5 rounded-md bg-accent text-accent-fg font-medium disabled:opacity-50`}
            >
              {append && canAppend && existing.length ? "Añadir a" : "Guardar como"} {squads.find((q) => q.id === source)?.name ?? source}
            </button>
            {saved && <span className="text-attr-good">Guardado ✓</span>}
          </div>

          {result.missingAttrs.length > 0 && (
            <div className="text-xs text-muted">
              Sin columna: {result.missingAttrs.map((k) => `${ATTR_BY_KEY[k].es} (${k})`).join(", ")}.
              Si alguna cabecera de abajo debería corresponder, asígnala manualmente.
            </div>
          )}

          <details open={result.unmappedHeaders.length > 0 || result.missingAttrs.length > 0}>
            <summary className="cursor-pointer text-sm font-medium">
              Columnas detectadas {result.unmappedHeaders.length > 0 && <span className="text-attr-mid">({result.unmappedHeaders.length} sin asignar)</span>}
            </summary>
            <div className="mt-2 overflow-auto max-h-[420px] border border-border rounded-md">
              <table className="tbl w-full">
                <thead>
                  <tr><th>#</th><th>Cabecera</th><th>Ejemplo</th><th>Asignación</th></tr>
                </thead>
                <tbody>
                  {result.headers.map((h, i) => {
                    const current = result.mapping[h];
                    const sample = result.sampleRow[i] ?? "";
                    return (
                      <tr key={`${h}-${i}`} className={current ? "" : "bg-attr-mid/10"}>
                        <td className="num text-muted">{i + 1}</td>
                        <td className="font-mono">{h}</td>
                        <td className="text-muted">{sample}</td>
                        <td>
                          <select
                            className="bg-surface border border-border rounded px-1 py-0.5 text-xs"
                            value={current ?? ""}
                            onChange={(e) => setOverrides({ ...overrides, [h]: e.target.value || null })}
                          >
                            <option value="">{labelFor(null)}</option>
                            <optgroup label="Campos">
                              {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </optgroup>
                            <optgroup label="Atributos">
                              {ATTR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </optgroup>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-medium">Vista previa ({Math.min(10, result.players.length)} primeros)</summary>
            <div className="mt-2 overflow-auto border border-border rounded-md">
              <table className="tbl w-full">
                <thead>
                  <tr><th>Nombre</th><th>Edad</th><th>Posición</th><th>Club</th><th>Personalidad</th><th>Atributos</th></tr>
                </thead>
                <tbody>
                  {result.players.slice(0, 10).map((p) => (
                    <tr key={p.uid}>
                      <td>{p.name}</td>
                      <td className="num">{p.age ?? "–"}</td>
                      <td>{p.position.raw} <span className="text-muted">→ {p.position.slots.join(", ") || "?"}</span></td>
                      <td>{p.club ?? "–"}</td>
                      <td>{p.personality ?? "–"}</td>
                      <td className="num">{Object.keys(p.attrs).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
