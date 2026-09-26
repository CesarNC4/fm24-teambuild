import { readFileSync } from "node:fs";
import { INSTRUCTION_BY_ID, instructionFit } from "../src/lib/fm/instructions";
import { parseFmHtml } from "../src/lib/fm/parser";
import { suggestPlayerInstructions } from "../src/lib/fm/playerInstructions";
import { setPiecePlan } from "../src/lib/fm/setpieces";
import { SPECIALISTS, SPECIALIST_GROUP_LABEL, heightPoints, rankSpecialists, specialistIndex } from "../src/lib/fm/specialists";
import { buildLineup, newTactic } from "../src/lib/fm/tactics";
import type { Player } from "../src/lib/fm/types";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const players = parseFmHtml(readFileSync("samples/plantilla-es-v2.html", "utf8"), {}).players;

console.log("== Catálogo");
expect("36 índices", SPECIALISTS.length === 36, String(SPECIALISTS.length));
expect("ids únicos", new Set(SPECIALISTS.map((s) => s.id)).size === 36);
const count = (g: string) => SPECIALISTS.filter((s) => s.group === g).length;
expect("9 de balón parado, 8 con balón, 5 sin balón, 4 de portero y 10 de instrucciones", [count("balon-parado"), count("con-balon"), count("sin-balon"), count("portero"), count("instrucciones")].join() === "9,8,5,4,10");
expect("erratas: «Aéreo en el área» pondera Desmarques y «De espaldas» Visión", SPECIALISTS.find((s) => s.id === "aerial-box")!.weights.some(([k, w]) => k === "OtB" && w === 15) && SPECIALISTS.find((s) => s.id === "back-to-goal")!.weights.some(([k, w]) => k === "Vis" && w === 15));
expect("«Juego aéreo» del portero sin Equilibrio ni Fuerza", !SPECIALISTS.find((s) => s.id === "gk-aerial")!.weights.some(([k]) => k === "Bal" || k === "Str"));

console.log("\n== Altura a puntos");
expect("160 cm = 1, 180 = 10, 190 = 16, 197 = 20", heightPoints(160) === 1 && heightPoints(180) === 10 && heightPoints(190) === 16 && heightPoints(197) === 20 && heightPoints(205) === 20 && heightPoints(150) === 1);
expect("entre medias, lineal (185 cm = 13)", heightPoints(185) === 13);

console.log("\n== Escala y tipo de jugador");
const all20 = { uid: "x", name: "x", isGoalkeeper: false, height: 197, attrs: Object.fromEntries(["Cor", "Cro", "Dri", "Fin", "Fir", "Fre", "Hea", "Lon", "L Th", "Mar", "Pas", "Pen", "Tck", "Tec", "Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "Det", "Fla", "Ldr", "OtB", "Pos", "Tea", "Vis", "Wor", "Acc", "Agi", "Bal", "Jum", "Nat", "Pac", "Sta", "Str"].map((k) => [k, { value: 20, min: 20, max: 20 }])) } as unknown as Player;
expect("un jugador con todo a 20 da 20 en todos los índices de campo", SPECIALISTS.filter((s) => !s.gk).every((s) => Math.abs((specialistIndex(all20, s.id) ?? 0) - 20) < 1e-9));
expect("los índices de portero no se calculan para un jugador de campo", SPECIALISTS.filter((s) => s.gk).every((s) => specialistIndex(all20, s.id) === null));
const gk = players.find((p) => p.isGoalkeeper)!;
expect("y al revés: el portero no sale en los de campo", specialistIndex(gk, "finisher") === null && specialistIndex(gk, "gk-1v1") != null);
const partial = { ...all20, attrs: { Cor: { value: 15, min: 15, max: 15 } } } as unknown as Player;
expect("si falta más del 30 % del peso, no se calcula", specialistIndex(partial, "corner") === null);

console.log("\n== Especialistas de la plantilla de muestra");
for (const r of rankSpecialists(players, 3)) console.log(`  ${SPECIALIST_GROUP_LABEL[r.def.group].padEnd(28)} ${r.def.es.padEnd(30)} ${r.top.map((t) => `${t.player.name} ${t.value.toFixed(1)}`).join(" · ")}`);

console.log("\n== Balón parado con los índices");
const t = newTactic("4-2-3-1-dm", "x");
const lu = buildLineup(t, players);
const plan = setPiecePlan(lu);
const xi = lu.slots.map((s) => s.starter?.player).filter((p): p is Player => !!p && !p.isGoalkeeper);
const bestPen = xi.slice().sort((a, b) => (specialistIndex(b, "penalties") ?? 0) - (specialistIndex(a, "penalties") ?? 0))[0];
expect("el primer lanzador de penaltis es el mejor del XI en el índice", plan.penalties[0].player.uid === bestPen.uid, `${plan.penalties[0].player.name} vs ${bestPen.name}`);
expect("la puntuación de faltas directas es el índice", Math.abs(plan.freeKicksDirect[0].score - (specialistIndex(plan.freeKicksDirect[0].player, "fk-direct") ?? 0)) < 1e-9);
console.log("  penaltis:", plan.penalties.map((x) => `${x.player.name} ${x.score.toFixed(1)}`).join(", "));
console.log("  rematadores:", plan.aerialTargets.map((x) => `${x.player.name} ${x.score.toFixed(1)}`).join(", "));

console.log("\n== Instrucciones");
const fit = instructionFit(INSTRUCTION_BY_ID["contrapresionar"], lu);
const affected = lu.slots.filter((s) => s.starter && ["DM", "MC", "ML", "MR", "AMC", "AML", "AMR", "ST"].includes(s.slot.slot));
const mean = affected.reduce((sum, s) => sum + (specialistIndex(s.starter!.player, "ti-counterpress") ?? 0), 0) / affected.length;
expect("«Contrapresión» se mide con su índice", Math.abs((fit.mean ?? 0) - mean) < 1e-9, `${fit.mean} vs ${mean}`);
const highLine = instructionFit(INSTRUCTION_BY_ID["linea-def-mucho-mas-alta"], lu);
expect("«Línea defensiva mucho más alta» usa el índice en los defensas y mantiene al portero", highLine.reqs[0].req.index === "ti-high-line" && highLine.reqs.length === 2);
const withRisky = lu.slots.filter((s) => s.starter).flatMap((s) => suggestPlayerInstructions(s.starter!.player, { slot: s.slot.slot, role: s.role, styleId: "posesion", traitIds: [], teamRoles: lu.slots.map((x) => x.role), strikerAerial: 12 }).filter((x) => ["more-risky-passes", "move-into-channels", "roam", "get-further-forward"].includes(x.pi.id)).map((x) => `${s.starter!.player.name}: ${x.pi.es} — ${x.why}`));
for (const line of withRisky) console.log("  " + line);
expect("las sugerencias con índice lo citan", withRisky.every((l) => l.includes("índice «")));

process.exit(ok ? 0 : 1);
