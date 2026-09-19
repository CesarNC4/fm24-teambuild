import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { STYLE_PRESETS, INSTRUCTION_BY_ID } from "../src/lib/fm/instructions";
import { FORMATION_BY_ID } from "../src/lib/fm/formations";
import { buildLineup, newTactic, tacticWarnings } from "../src/lib/fm/tactics";
import { rankStyles } from "../src/lib/fm/styles";
const { players } = parseFmHtml(readFileSync("samples/plantilla-es.html", "utf8"), {});
for (const s of STYLE_PRESETS) {
  const bad = s.instructions.filter((i) => !INSTRUCTION_BY_ID[i]);
  const badF = s.formations.filter((f) => !FORMATION_BY_ID[f]);
  const groups = new Map<string, string[]>();
  for (const i of s.instructions) { const g = INSTRUCTION_BY_ID[i]?.group; if (g) groups.set(g, [...(groups.get(g) ?? []), i]); }
  const dup = [...groups.entries()].filter(([, v]) => v.length > 1);
  if (bad.length || badF.length || dup.length) console.log("PROBLEMA", s.id, bad, badF, dup);
}
const t = newTactic("4-2-3-1-dm", "test"); t.styleId = "transiciones";
const lineup = buildLineup(t, players);
for (const f of rankStyles(lineup)) console.log(f.style.name.padEnd(26), f.mean?.toFixed(1), "def", f.units.def?.toFixed(1), "mid", f.units.mid?.toFixed(1), "att", f.units.att?.toFixed(1), f.formationOk ? "" : "form✗", f.avoided.map((a) => a.role).join("|"));
for (const id of ["autobus", "catenaccio", "route-one"]) { t.styleId = id; console.log(id, tacticWarnings(t).map((w) => w.text.slice(0, 60))); }
