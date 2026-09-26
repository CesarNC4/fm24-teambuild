import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { buildLeaguePool } from "../src/lib/fm/league";
import type { Player, Squad } from "../src/lib/fm/types";

const load = (f: string) => parseFmHtml(readFileSync(f, "utf8"), {}).players;
// 27 + 20 + 14 jugadores de las muestras, con UID distintos
const base = [...load("samples/plantilla-es-v2.html"), ...load("samples/sub21-es.html"), ...load("samples/sub18-es.html")];
const at = (club: string, ps: Player[]) => ps.map((p) => ({ ...p, club }));
let ok = true;
const expect = (label: string, cond: boolean) => { console.log(cond ? "  ✓" : "  ✗", label); if (!cond) ok = false; };

// Tres clubes inventados: nosotros (12), A (12), B (12) y un extranjero (11)
const us = at("Nosotros", base.slice(0, 12));
const a = at("Club A", base.slice(12, 24));
const b = at("Club B", base.slice(24, 36));
const mover = a[0]; // se va de A a B
const squads: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "liga", name: "Liga", kind: "liga", maxAge: null, competitive: true },
  { id: "rival-b", name: "B", kind: "rival", maxAge: null, competitive: true, competition: "liga" },
  { id: "rival-x", name: "X", kind: "rival", maxAge: null, competitive: true, competition: "internacional" },
];
const pool = buildLeaguePool({
  squads,
  clubName: "Nosotros",
  players: {
    plantilla: us,
    liga: [...us, ...a, ...b], // búsqueda vieja: mover todavía en A
    "rival-b": [...b.slice(1), { ...mover, club: "Club B" }], // B nuevo: ficha a mover y se le va b[0]
    "rival-x": at("Extranjero", base.slice(36, 47)),
  },
  imports: {
    plantilla: { importedAt: "2026-09-02" },
    liga: { importedAt: "2026-09-01" },
    "rival-b": { importedAt: "2026-09-03" },
    "rival-x": { importedAt: "2026-09-04" },
  },
});
const byUid = new Map(pool.players.map((p) => [p.uid, p]));
console.log("== Liga calculada:", pool.players.length, "jugadores,", pool.clubs.length, "clubes, bajas", pool.dropped);
for (const c of pool.clubs) console.log("  ", c.club.padEnd(10), c.players, c.from);
expect("sin duplicados por UID", byUid.size === pool.players.length);
expect("el fichaje cuenta para su nuevo club", byUid.get(mover.uid)?.club === "Club B");
expect("la baja de B desaparece", !byUid.has(b[0].uid));
expect("el rival internacional no cuenta", !pool.players.some((p) => p.club === "Extranjero"));
expect("36 − 1 baja = 35 jugadores", pool.players.length === 35);
expect("A pierde al que se fue: 11", pool.clubs.find((c) => c.club === "Club A")?.players === 11);
expect("B viene de su exportación de rival", pool.clubs.find((c) => c.club === "Club B")?.from === "rival");
expect("A solo de la búsqueda", pool.clubs.find((c) => c.club === "Club A")?.from === "busqueda");

// Un rival sin columna de club toma el nombre del rival
const noClub = buildLeaguePool({ squads: [squads[2]], clubName: null, players: { "rival-b": b.map((p) => ({ ...p, club: null })) }, imports: { "rival-b": { importedAt: "2026-09-03" } } });
expect("sin columna Club usa el nombre del rival", noClub.players.every((p) => p.club === "B"));
process.exit(ok ? 0 : 1);
