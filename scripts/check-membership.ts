import { readFileSync } from "node:fs";
import { applyMoves, dedupeClubSquads, isLoanedOut, movesOnImport } from "../src/lib/fm/membership";
import { parseFmHtml } from "../src/lib/fm/parser";
import type { Player, Squad } from "../src/lib/fm/types";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const read = (f: string) => parseFmHtml(readFileSync(`samples/${f}.html`, "utf8"), {}).players;
const first = read("plantilla-es-v2");
const sub21 = read("sub21-es");
const sub18 = read("sub18-es");
const squads: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "ojeados", name: "Ojeados", kind: "ojeados", maxAge: null, competitive: false },
  { id: "liga", name: "Liga", kind: "liga", maxAge: null, competitive: true },
  { id: "filial-21", name: "Sub-21", kind: "filial", maxAge: 21, competitive: false },
  { id: "filial-18", name: "Sub-18", kind: "filial", maxAge: 18, competitive: false },
  { id: "rival-a", name: "Chelsea", kind: "rival", maxAge: null, competitive: true, competition: "liga" },
  { id: "rival-b", name: "Everton", kind: "rival", maxAge: null, competitive: true, competition: "liga" },
];
const store: Record<string, Player[]> = { plantilla: first, "filial-21": sub21, "filial-18": sub18, ojeados: [], liga: [], "rival-a": [], "rival-b": [] };

console.log("== Ascenso de dos juveniles");
const promoted = sub21.filter((p) => !isLoanedOut(p)).slice(0, 2);
const newFirst = [...first, ...promoted];
const moves = movesOnImport(store, squads, "plantilla", newFirst);
console.log("  ", moves.map((m) => `${m.name} sale de ${m.from}`).join(" · "));
expect("al reimportar el primer equipo con dos juveniles, salen de la Sub-21", moves.length === 2 && moves.every((m) => m.from === "filial-21"));
const after: Record<string, Player[]> = { ...applyMoves(store, moves), plantilla: newFirst };
const all = ["plantilla", "filial-21", "filial-18"].flatMap((id) => after[id].map((p) => p.uid));
expect("ya no hay dos Juanitos: cada UID en una sola plantilla", new Set(all).size === all.length);
expect("la Sub-21 conserva a los demás", after["filial-21"].length === sub21.length - 2);

console.log("\n== Cedidos");
const loaned = sub21.filter(isLoanedOut);
console.log(`   ${loaned.length} cedidos en la Sub-21: ${loaned.map((p) => p.name).join(", ")}`);
const rivalWithLoan = [...first.slice(0, 3).map((p) => ({ ...p, uid: `r-${p.uid}` })), ...loaned.slice(0, 1).map((p) => ({ ...p, playingTime: "Titular habitual", info: null }))];
const loanMoves = movesOnImport(store, squads, "rival-a", rivalWithLoan);
expect("un cedido de tu Sub-21 que sale en la plantilla del club que lo tiene cedido sigue siendo tuyo", loaned.length > 0 && loanMoves.length === 0, JSON.stringify(loanMoves));

console.log("\n== Fichajes entre rivales y desde un rival");
const star = { ...first[0], uid: "rival-star", name: "Estrella Rival" };
const s2: Record<string, Player[]> = { ...store, "rival-a": [star] };
const transfer = movesOnImport(s2, squads, "rival-b", [star]);
expect("un jugador que pasa del Chelsea al Everton sale del Chelsea al importar el Everton", transfer.length === 1 && transfer[0].from === "rival-a");
const bought = movesOnImport(s2, squads, "plantilla", [...first, star]);
expect("si lo fichas tú, sale del rival al importar tu primer equipo", bought.length === 1 && bought[0].from === "rival-a");

console.log("\n== Listas que no mueven a nadie");
expect("importar ojeados o la búsqueda de liga no quita a nadie de sus plantillas", movesOnImport(store, squads, "ojeados", first).length === 0 && movesOnImport(store, squads, "liga", [...first, ...sub21]).length === 0);
expect("y un jugador de un rival puede estar a la vez en ojeados", movesOnImport({ ...s2, ojeados: [star] }, squads, "rival-b", [star]).every((m) => m.from !== "ojeados"));

console.log("\n== Limpieza de lo ya guardado");
const dup: Record<string, Player[]> = { ...store, plantilla: newFirst };
const imports = { plantilla: { importedAt: "2026-09-29T10:00:00Z" }, "filial-21": { importedAt: "2026-09-20T10:00:00Z" }, "filial-18": { importedAt: "2026-09-20T10:00:00Z" } };
const clean = dedupeClubSquads(dup, squads, imports);
expect("los duplicados guardados se quedan en la plantilla importada más recientemente", clean.moves.length === 2 && clean.moves.every((m) => m.from === "filial-21") && clean.players.plantilla.length === newFirst.length);
const older = dedupeClubSquads(dup, squads, { ...imports, "filial-21": { importedAt: "2026-09-30T10:00:00Z" } });
expect("si la Sub-21 es la más reciente, se quedan en la Sub-21", older.moves.every((m) => m.from === "plantilla") && older.moves.length === 2);
expect("sin duplicados no cambia nada", dedupeClubSquads(store, squads, imports).moves.length === 0);

process.exit(ok ? 0 : 1);
