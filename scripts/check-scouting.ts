import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { newTactic } from "../src/lib/fm/tactics";
import { evaluateAll, squadNeeds, NEED_LABEL, VERDICT_LABEL } from "../src/lib/fm/scouting";
import { estimateGameYear } from "../src/lib/fm/youth";

const load = (f: string) => parseFmHtml(readFileSync(f, "utf8"), {}).players;
const first = load("samples/plantilla-es-v2.html");
// Simula ojeados: el Sub-21 con atributos en rango ±2 para la mitad de ellos
const scouted = load("samples/sub21-es.html").map((p, i) => {
  if (i % 2) return p;
  const attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, a]) => [k, { ...a, min: Math.max(1, a.value - 2), max: Math.min(20, a.value + 2), isRange: true }]));
  return { ...p, attrs, club: "Otro club" };
});
const t = newTactic("4-2-3-1-dm", "t");
const gy = estimateGameYear(first);
const { needs } = squadNeeds(t, first, gy);
console.log("== Necesidades");
for (const n of needs) console.log(n.slot.padEnd(4), n.role.code.padEnd(4), NEED_LABEL[n.level].padEnd(10), `tit ${n.starter?.player.name ?? "-"} ${Math.round(n.starter?.effective ?? 0)}`, `sup ${n.depth[0]?.player.name ?? "-"} ${Math.round(n.depth[0]?.effective ?? 0)}`, `busca ≥${Math.round(n.targetScore)}/${Math.round(n.upgradeScore)}`, n.reasons.join(" | "));
console.log("\n== Candidatos");
for (const e of evaluateAll(scouted, needs, first, { transfer: 30_000_000, wage: 300_000 }, gy)) {
  console.log(e.player.name.padEnd(22), e.player.age, e.fit ? `${e.fit.need.slot} ${e.fit.need.role.code} ${Math.round(e.fit.effective)} [${Math.round(e.fit.min)}-${Math.round(e.fit.max)}] rk${e.fit.rank}` : "sin hueco", `conoc ${Math.round(e.knowledge * 100)}%`, "→", VERDICT_LABEL[e.verdict]);
  for (const r of e.red) console.log("     ✕", r);
  for (const r of e.warnings) console.log("     ⚠", r);
  for (const r of e.pluses) console.log("     +", r);
}
