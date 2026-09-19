import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { buildWeek, DAY_LABEL, SESSION_BY_ID, suggestMentoring, suggestTalks, recommendLoad, type WeekGoal } from "../src/lib/fm/training";
import { findPersonality, findMediaStyles, hiddenSummary, TIER_LABEL, hiddenProfile } from "../src/lib/fm/personalities";

const html = readFileSync(process.argv[2] ?? "samples/plantilla-es.html", "utf8");
const { players } = parseFmHtml(html, {});

console.log("== Personalidades");
for (const p of players) {
  const d = findPersonality(p.personality);
  const m = findMediaStyles(p.mediaHandling);
  console.log(`${p.name.padEnd(22)} ${(p.personality ?? "-").padEnd(22)} ${d ? TIER_LABEL[d.tier].padEnd(10) : "??        "} ${m.map((x) => x.id).join(",").padEnd(30)} ${hiddenSummary(hiddenProfile(p))}`);
}
console.log("\n== Carga");
for (const p of players) console.log(`${p.name.padEnd(22)} ${p.age} Nat ${p.attrs.Nat?.value}  extras=${recommendLoad(p).extras}  ${recommendLoad(p).why}`);
console.log("\n== Charlas");
for (const t of suggestTalks(players)) console.log(t.kind, t.player.name, t.rating, t.caution ?? "");
console.log("\n== Tutorías");
for (const g of suggestMentoring(players)) console.log(g.unit, "mentores:", g.mentors.map((p) => p.name).join(", "), "| aprendices:", g.mentees.map((p) => p.name).join(", "), g.notes);

const show = (title: string, o: Parameters<typeof buildWeek>[0]) => {
  console.log(`\n== ${title}`);
  for (const d of buildWeek(o)) console.log(DAY_LABEL[d.day].padEnd(4), d.sessions.map((s) => (s ? (s === "match" ? "PARTIDO" : SESSION_BY_ID[s].es) : "·")).join(" | "));
};
show("1 partido sábado, transiciones, semana 1", { styleId: "transiciones", matchDays: [5], preseason: false, weekIndex: 0 });
show("1 partido sábado, transiciones, semana 2", { styleId: "transiciones", matchDays: [5], preseason: false, weekIndex: 1 });
show("2 partidos (mié+sáb)", { styleId: "transiciones", matchDays: [2, 5], preseason: false });
show("cerrar portería, partido domingo", { styleId: "transiciones", matchDays: [6], preseason: false, goal: "defensa" as WeekGoal });
show("pretemporada sin partidos", { styleId: "transiciones", matchDays: [], preseason: true });
show("pretemporada con amistoso sábado", { styleId: "transiciones", matchDays: [5], preseason: true });
show("parón sin partidos", { styleId: "transiciones", matchDays: [], preseason: false });
