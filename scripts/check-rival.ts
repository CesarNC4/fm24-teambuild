import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { buildLineup, newTactic } from "../src/lib/fm/tactics";
import { POSITION_LABEL } from "../src/lib/fm/roles";
import { THREAT_LABEL, oppositionInstructions, rankStylesVsRival, rivalLineup, rivalThreats, rivalWeaknesses, unitDuels } from "../src/lib/fm/rival";

const load = (f: string) => parseFmHtml(readFileSync(f, "utf8"), {}).players;
const ours = load("samples/plantilla-es-v2.html");
// El Sub-21 hace de rival (misma vista); un par de lesionados simulados
const rival = load("samples/sub21-es.html").map((p, i) => (i === 0 ? { ...p, info: "Les" } : p));
const ourLineup = buildLineup(newTactic("4-2-3-1-dm", "t"), ours);
const rl = rivalLineup(rival, null);
console.log("== XI rival", rl.formation.name, "media", Math.round(rl.average), "| descartados:", rl.unavailable.map((p) => p.name).join(", ") || "-");
for (const s of rl.lineup.slots) console.log("  ", POSITION_LABEL[s.slot.slot].padEnd(5), (s.starter?.player.name ?? "-").padEnd(24), s.role.code.padEnd(5), Math.round(s.starter?.role.score ?? 0));
console.log("\n== Duelos");
for (const d of unitDuels(ourLineup, rl)) console.log("  ", d.label.padEnd(26), d.cluster.padEnd(12), d.ours?.toFixed(1), "vs", d.theirs?.toFixed(1), d.edge != null ? (d.edge > 0 ? "+" : "") + d.edge.toFixed(1) : "");
console.log("\n== Amenazas");
for (const t of rivalThreats(rl)) console.log("  ", t.player.name.padEnd(24), THREAT_LABEL[t.kind].padEnd(22), t.detail, "→", t.answer);
console.log("\n== Debilidades");
for (const w of rivalWeaknesses(rl, ourLineup)) { console.log("  ", w.text); for (const t of w.tweaks) console.log("      ", t.level === "clave" ? "★" : "·", t.label, "—", t.reason, t.remove?.length ? `(quita ${t.remove.join(", ")})` : ""); }
console.log("\n== Oposición");
for (const o of oppositionInstructions(rl)) console.log("  ", POSITION_LABEL[o.slot].padEnd(5), o.player.name.padEnd(24), `presión ${o.closingDown ?? "-"} | marcaje ${o.tightMarking ?? "-"} | entradas ${o.tackling ?? "-"} | pie ${o.showFoot ?? "-"}`, "\n        ", o.reasons.join("; "));
console.log("\n== Estilos");
for (const s of rankStylesVsRival(rl, ourLineup)) console.log("  ", s.style.name.padEnd(24), `encaje ${s.fit?.toFixed(1)} rival ${s.matchup >= 0 ? "+" : ""}${s.matchup.toFixed(1)} total ${s.total.toFixed(1)}`, s.reasons.join("; "));
