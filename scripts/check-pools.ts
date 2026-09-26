import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { depthMap, lineupForPool, migrateTactic, newTactic, tacticLocks, withLocks, type Tactic } from "../src/lib/fm/tactics";
import type { Squad } from "../src/lib/fm/types";

const load = (f: string) => parseFmHtml(readFileSync(f, "utf8"), {}).players;
const players = { plantilla: load("samples/plantilla-es-v2.html"), sub21: load("samples/sub21-es.html"), sub18: load("samples/sub18-es.html") };
const squads: Squad[] = [
  { id: "plantilla", name: "Primer equipo", kind: "primer", maxAge: null, competitive: true },
  { id: "sub21", name: "Sub-21", kind: "filial", maxAge: 21, competitive: false },
  { id: "sub18", name: "Sub-18", kind: "filial", maxAge: 18, competitive: false },
];
let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const uids = (t: Tactic) => lineupForPool(t, players, squads).lineup!.slots.map((s) => s.starter?.player.uid).filter(Boolean) as string[];
const show = (title: string, t: Tactic) => {
  const r = lineupForPool(t, players, squads);
  console.log(`\n== ${title} (media ${r.lineup!.average.toFixed(1)})`);
  for (const s of r.lineup!.slots) console.log(`  ${s.slot.id.padEnd(5)} ${(s.starter?.player.name ?? "—").padEnd(24)} ${s.starter ? Math.round(s.starter.effective) : ""}${r.youth.has(s.starter?.player.uid ?? "") ? " 🎓" : ""}`);
  for (const g of r.gaps) console.log("   ⚠", g.slotId, g.text);
  if (r.cup) console.log(`   copa: ${r.cup.count}/${r.cup.min}, coste ${r.cup.cost.toFixed(1)}`, r.cup.swaps.map((w) => `${w.player.name}→${w.slotId} (−${w.cost.toFixed(1)})`).join(", "));
  return r;
};

const base = newTactic("4-2-3-1-dm", "prueba");
const first = show("Primer equipo", base);
const firstUids = new Set(uids(base));

// Fijar en el primer equipo al suplente de un hueco
const slot = first.lineup!.slots.find((s) => s.slot.slot === "MC" || s.slot.slot === "DM")!;
const sub = slot.depth[0].player;
const locked = withLocks(base, "plantilla", { [slot.slot.id]: sub.uid });
expect("un fijado en el primer equipo entra en el primer XI", uids(locked).includes(sub.uid));
expect("ese fijado no afecta al segundo equipo", !tacticLocks({ ...locked, pool: "segundo" })[slot.slot.id]);

const second = show("Segundo equipo (con el fijado del primero)", { ...locked, pool: "segundo" });
const secondUids = uids({ ...locked, pool: "segundo" });
expect("el segundo equipo no repite a ningún titular del primero, fijados incluidos", !secondUids.some((u) => uids(locked).includes(u)) && !secondUids.includes(sub.uid));
expect("el segundo equipo solo usa el primer equipo", secondUids.every((u) => players.plantilla.some((p) => p.uid === u)));
expect("hueco sin nadie → falta de profundidad con el nombre del que repetiría", second.lineup!.slots.filter((s) => !s.starter).every((s) => second.gaps.some((g) => g.slotId === s.slot.id && !!g.repeat)));

const youth = show("Juveniles", { ...base, pool: "juveniles" });
expect("juveniles: solo jugadores de los filiales juveniles", youth.lineup!.slots.every((s) => !s.starter || youth.youth.has(s.starter.player.uid)));

const cup = show("Equipo de copa, mínimo 5", { ...base, pool: "copa" });
const cupYouth = cup.lineup!.slots.filter((s) => s.starter && cup.youth.has(s.starter.player.uid)).length;
expect("copa: al menos 5 juveniles en el XI", cupYouth >= 5, String(cupYouth));
expect("copa: los juveniles forzados cuestan puntos y se enseñan", cup.cup!.swaps.every((w) => w.cost >= -0.01) && cup.cup!.count === cupYouth);
const cup0 = lineupForPool({ ...base, pool: "copa", cupYouthMin: 0 }, players, squads);
expect("copa con mínimo 0: sin cambios forzados", cup0.cup!.swaps.length === 0);
expect("copa: forzar juveniles no mejora la media", cup.lineup!.average <= cup0.lineup!.average + 0.01);
expect("copa sin mínimo: el mejor XI entre primer equipo y juveniles", cup0.lineup!.average >= first.lineup!.average - 0.01);

console.log("\n== Profundidad real");
const depth = depthMap(base, players.plantilla);
for (const d of depth) console.log(`  ${d.slot.slot.id.padEnd(5)} ${(d.slot.starter?.player.name ?? "—").padEnd(22)} → ${(d.backup?.player.name ?? "nadie").padEnd(22)} ${d.gap == null ? "" : (-d.gap).toFixed(0).padStart(4)} ${d.tone}`);
const backups = depth.map((d) => d.backup?.player.uid).filter(Boolean) as string[];
expect("cada suplente real cuenta una vez y no es titular", new Set(backups).size === backups.length && !backups.some((u) => firstUids.has(u)));

console.log("\n== Migración");
const old = { ...base, locks: { [slot.slot.id]: sub.uid } as unknown as Tactic["locks"], pool: "todos" };
const mig = migrateTactic(old);
expect("los fijados antiguos pasan al primer equipo", tacticLocks(mig, "plantilla")[slot.slot.id] === sub.uid);
expect("«Titulares + filiales» pasa a Equipo de copa", mig.pool === "copa");
expect("una táctica ya migrada no cambia", JSON.stringify(migrateTactic(mig).locks) === JSON.stringify(mig.locks));

process.exit(ok ? 0 : 1);
