/**
 * Comprobación rápida del parser contra una exportación real:
 *   npx tsx scripts/check-import.ts samples/plantilla-es.html
 */
import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { bestRoles } from "../src/lib/fm/scoring";
import { ROLE_BY_ID, roleLabel } from "../src/lib/fm/roles";

const file = process.argv[2] ?? "samples/plantilla-es.html";
const buf = readFileSync(file);
let html: string;
try {
  html = new TextDecoder("utf-8", { fatal: true }).decode(buf);
} catch {
  html = new TextDecoder("windows-1252").decode(buf);
}

const r = parseFmHtml(html);
console.log(`jugadores: ${r.players.length}  columnas: ${r.headers.length}  descartadas: ${r.droppedRows}`);
console.log("sin asignar:", r.unmappedHeaders.join(", ") || "—");
console.log("atributos sin columna:", r.missingAttrs.join(", ") || "—");
console.log(
  "mapa atributos:",
  Object.entries(r.mapping)
    .filter(([, k]) => k?.startsWith("attr:"))
    .map(([h, k]) => `${h}→${k!.slice(5)}`)
    .join(" "),
);
console.log();
for (const p of r.players) {
  const b = bestRoles(p, 2);
  console.log(
    p.name.padEnd(22),
    String(p.age ?? "").padStart(2),
    p.position.raw.padEnd(24),
    p.position.slots.join("/").padEnd(16),
    p.isGoalkeeper ? "GK" : "  ",
    String(p.wage ?? "").padStart(8),
    String(p.value ?? "").padStart(10),
    (p.contractExpiry ?? "").padEnd(10),
    (p.playingTime ?? "").padEnd(22),
    b.map((s) => `${roleLabel(ROLE_BY_ID[s.roleId])} ${s.score.toFixed(0)}`).join(" | "),
  );
}
