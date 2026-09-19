"use client";

import { useCallback, useMemo, useState } from "react";
import { ATTRIBUTES, ATTR_BY_KEY } from "@/lib/fm/attributes";
import { parseFmHtml } from "@/lib/fm/parser";
import type { ImportResult, ImportSource } from "@/lib/fm/types";
import { useAppStore } from "@/lib/store";

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
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const exportBackup = () => {
    const s = useAppStore.getState();
    const data = { version: 1, exportedAt: new Date().toISOString(), players: s.players, imports: s.imports, squads: s.squads, headerOverrides: s.headerOverrides, clubName: s.clubName, tactics: s.tactics, activeTacticId: s.activeTacticId, playerTraits: s.playerTraits, trainingWeek: s.trainingWeek, scoutingBudget: s.scoutingBudget, history: s.history, targets: s.targets };
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
  const savedOverrides = useAppStore((s) => s.headerOverrides);
  const setHeaderOverrides = useAppStore((s) => s.setHeaderOverrides);

  const [source, setSource] = useState<ImportSource>("plantilla");
  const [html, setHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string | null>>(savedOverrides);
  const [saved, setSaved] = useState(false);

  const { result, error } = useMemo<{ result: ImportResult | null; error: string | null }>(() => {
    if (!html) return { result: null, error: null };
    try {
      return { result: parseFmHtml(html, overrides), error: null };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [html, overrides]);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setSaved(false);
    setFileName(file.name);
    setHtml(await readFileText(file));
  }, []);

  const save = () => {
    if (!result) return;
    setPlayers(source, result.players, { fileName, importedAt: new Date().toISOString(), count: result.players.length });
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
                const id = addSquad({ name, kind: "rival", maxAge: null, competitive: true });
                setSource(id);
                setNewRival("");
              }}
            >
              <input className="bg-surface border border-border rounded px-2 py-0.5 w-32" placeholder="Próximo rival…" value={newRival} onChange={(e) => setNewRival(e.target.value)} />
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

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div><b>{result.players.length}</b> jugadores leídos</div>
            <div><b>{result.headers.length}</b> columnas</div>
            <div className={result.missingAttrs.length ? "text-attr-mid" : "text-attr-good"}>
              {result.missingAttrs.length ? `${result.missingAttrs.length} atributos sin columna` : "47/47 atributos detectados"}
            </div>
            {result.droppedRows > 0 && <div className="text-attr-low">{result.droppedRows} filas descartadas</div>}
            <button
              onClick={save}
              disabled={result.players.length === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-fg font-medium disabled:opacity-50"
            >
              Guardar como {squads.find((q) => q.id === source)?.name ?? source}
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
