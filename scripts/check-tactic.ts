/** Prueba del motor táctico con una exportación real: npx tsx scripts/check-tactic.ts */
import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { buildLineup, newTactic } from "../src/lib/fm/tactics";
import { tacticBalance } from "../src/lib/fm/balance";
import { INSTRUCTIONS, STYLE_BY_ID, instructionFit } from "../src/lib/fm/instructions";
import { POSITION_LABEL, DUTY_LABEL } from "../src/lib/fm/roles";

const html = readFileSync(process.argv[2] ?? "samples/plantilla-es.html", "utf-8");
const { players } = parseFmHtml(html);
const t = newTactic("4-2-3-1-dm", "4-2-3-1 transiciones");
t.instructions = [...STYLE_BY_ID.transiciones.instructions];
const l = buildLineup(t, players);
console.log(`XI media ${l.average.toFixed(1)}`);
for (const s of l.slots) {
  const c = s.starter!;
  console.log(POSITION_LABEL[s.slot.slot].padEnd(8), `${s.role.es} (${DUTY_LABEL[s.role.duty]})`.padEnd(38), c.player.name.padEnd(20), c.role.score.toFixed(0).padStart(3), `${Math.round(c.familiarity * 100)}%`, "| banquillo:", s.depth.slice(0, 2).map((d) => `${d.player.name} ${d.effective.toFixed(0)}`).join(", "));
}
console.log("\nBanquillo:", l.bench.map((b) => `${b.player.name} (${b.bestSlot ? POSITION_LABEL[b.bestSlot.slot.slot] : "-"} ${b.effective.toFixed(0)})`).join(" · "));
console.log("\nEquilibrio:", tacticBalance(t, { lineup: l }).issues.map((w) => `${w.level} ${w.text}`));
console.log("\nEncaje instrucciones activas:");
for (const i of INSTRUCTIONS.filter((i) => t.instructions.includes(i.id))) {
  const f = instructionFit(i, l);
  console.log(" ", i.name.padEnd(36), f.mean?.toFixed(1) ?? "—", f.reqs.map((r) => `${r.req.why} → ${r.mean?.toFixed(1)} (peor ${r.players[0]?.name} ${r.players[0]?.mean.toFixed(1)})`).join(" | "));
}
