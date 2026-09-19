import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { newTactic } from "../src/lib/fm/tactics";
import { assessAllYouth, positionCoverage, DESTINATION_LABEL, LOAN_LABEL, estimateGameYear } from "../src/lib/fm/youth";
import type { Squad } from "../src/lib/fm/types";

const load = (f: string) => parseFmHtml(readFileSync(f, "utf8"), {}).players;
const players = { plantilla: load("samples/plantilla-es-v2.html"), sub21: load("samples/sub21-es.html"), sub18: load("samples/sub18-es.html") };
const squads: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "sub21", name: "Sub-21", kind: "filial", maxAge: 21, competitive: false },
  { id: "sub18", name: "Sub-18", kind: "filial", maxAge: 18, competitive: false },
];
const t = newTactic("4-2-3-1-dm", "t"); t.styleId = "transiciones";
console.log("año del juego ≈", estimateGameYear([...players.plantilla, ...players.sub21]));
const all = assessAllYouth(players, squads, t);
for (const a of all) {
  console.log(
    `${a.player.name.padEnd(22)} ${String(a.player.age).padStart(2)} ${(a.squad?.name ?? "").padEnd(13)} pot ${a.potential ?? "-"}  ` +
    `${a.fit ? `${a.fit.slot.padEnd(3)} ${a.fit.role.code.padEnd(4)} ${Math.round(a.fit.effective)} rk${a.fit.rank} (tit ${Math.round(a.fit.starter ?? 0)})` : "sin hueco"}  ` +
    `→ ${DESTINATION_LABEL[a.destination]}${a.targetSquad ? ` (${a.targetSquad.name})` : ""}${a.loanLevel ? ` (${LOAN_LABEL[a.loanLevel]})` : ""}  ` +
    `ent: ${a.training.role.code} ${a.training.focus[0]?.area.es ?? "-"} ${a.training.intensity}`,
  );
  for (const r of a.reasons) console.log("     · " + r);
  for (const r of a.alerts) console.log("     ⚠ " + r);
}
console.log(positionCoverage(all).map((c) => `${c.family}:${c.count}`).join("  "));
