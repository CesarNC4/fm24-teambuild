import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { buildLineup, newTactic } from "../src/lib/fm/tactics";
import {
  DAY_LABEL, FOCUS_AREAS, SESSION_BY_ID, SESSIONS, buildWeek, buildYouthWeek, needSessions, needText, recommendLoad, suggestMentoring, tacticSessions, unitOfSlot,
  type WeekOptions, type YouthTheme,
} from "../src/lib/fm/training";
import { findPersonality, findMediaStyles, hiddenSummary, TIER_LABEL, hiddenProfile } from "../src/lib/fm/personalities";

const players = parseFmHtml(readFileSync(process.argv[2] ?? "samples/plantilla-es.html", "utf8"), {}).players;
let ok = true;
const expect = (label: string, cond: boolean) => { console.log(cond ? "  ✓" : "  ✗", label); if (!cond) ok = false; };

console.log("== Datos del juego");
expect("22 focos adicionales (12 campo, 4 balón parado, 6 portero)", FOCUS_AREAS.length === 22 && FOCUS_AREAS.filter((f) => f.group === "campo").length === 12 && FOCUS_AREAS.filter((f) => f.group === "portero").length === 6);
expect("todas las sesiones suman 100 % entre sus grupos", SESSIONS.filter((s) => s.parts.length).every((s) => s.parts.reduce((a, p) => a + p.pct, 0) === 100));
expect("unidades: MCD en la defensiva, MC en la de ataque", unitOfSlot("DM") === "defensa" && unitOfSlot("MC") === "ataque" && unitOfSlot("WBL") === "defensa");

console.log("\n== Personalidades");
for (const p of players) {
  const d = findPersonality(p.personality);
  console.log(`${p.name.padEnd(22)} ${(p.personality ?? "-").padEnd(22)} ${d ? TIER_LABEL[d.tier].padEnd(10) : "??        "} ${findMediaStyles(p.mediaHandling).map((x) => x.id).join(",").padEnd(30)} ${hiddenSummary(hiddenProfile(p))}`);
}
console.log("\n== Carga individual");
for (const p of players) console.log(`${p.name.padEnd(22)} ${p.age} Nat ${p.attrs.Nat?.value}  extras=${recommendLoad(p).extras}`);

console.log("\n== Grupos de aprendizaje");
const m = suggestMentoring(players);
for (const g of m.groups) console.log(" ", g.unit.padEnd(8), g.mentor.name.padEnd(22), "→", g.mentees.map((p) => p.name).join(", "), g.notes.join(" "));
if (m.waiting.length) console.log("  sin grupo:", m.waiting.map((p) => p.name).join(", "));
expect("ningún grupo con más de 3 jóvenes", m.groups.every((g) => g.mentees.length <= 3));

// Táctica de contrapresión y posesión con portero cierre
const t = newTactic("4-2-3-1-dm", "prueba");
t.instructions = ["contrapresionar", "pases-cortos", "linea-def-alta", "linea-presion-alta", "amplitud-amplia"];
t.roles = { ...t.roles, GK: "SK-S" };
const ts = tacticSessions(t);
console.log("\n== Sesiones de la táctica");
for (const x of [...ts.attack, ...ts.defend, ...ts.physical]) console.log(" ", SESSION_BY_ID[x.id].es.padEnd(40), x.why);
expect("contrapresión → Transición – Presionar y nunca Restringir", ts.defend.some((x) => x.id === "tec-trans-presionar") && !ts.defend.some((x) => x.id === "tec-trans-restringir"));
expect("línea alta → Defender balones rasos", ts.defend.some((x) => x.id === "def-rasos"));
expect("posesión → Retención de balón y Ataque paciente", ts.attack.some((x) => x.id === "tec-retencion") && ts.attack.some((x) => x.id === "att-paciente"));

const lineup = buildLineup(t, players);
const needs = needSessions(lineup);
console.log("\n== Sesiones por carencias");
for (const n of needs.slice(0, 6)) console.log(" ", SESSION_BY_ID[n.id].es.padEnd(40), n.score.toFixed(1), needText(n));

const base: Omit<WeekOptions, "matchDays"> = { preseason: false, tactic: ts, needs };
const show = (title: string, o: WeekOptions) => {
  const w = buildWeek(o);
  console.log(`\n== ${title}`);
  for (const d of w.days) console.log(DAY_LABEL[d.day].padEnd(4), String(d.load).padStart(2), d.sessions.map((s) => (s ? (s === "match" ? "PARTIDO" : SESSION_BY_ID[s].es) : "·")).join(" | "));
  for (const x of w.warnings) console.log("   ⚠", x);
  return w;
};
const allIds = (w: ReturnType<typeof buildWeek>) => w.days.flatMap((d) => d.sessions).filter((s): s is string => !!s && s !== "match");

const w1 = show("1 partido sábado fuera, rival superior", { ...base, matchDays: [5], matchInfo: { "5": { home: false, rival: "superior" } } });
expect("todas las sesiones existen en el catálogo", allIds(w1).every((s) => !!SESSION_BY_ID[s]));
expect("día después: Revisión + Recuperación", w1.days[6].sessions.includes("prep-revision") && w1.days[6].sessions.includes("fis-recuperacion"));
expect("víspera fuera: Tácticas de partido y Viaje", w1.days[4].sessions.includes("prep-tacticas") && w1.days[4].sessions.includes("viaje"));
expect("sin carga física la víspera", w1.warnings.every((x) => !x.includes("víspera")));

const w2 = show("2 partidos (mié + sáb) y partido el domingo anterior", { ...base, matchDays: [2, 5], prevSunday: true });
expect("dos partidos: sin sesiones físicas", !allIds(w2).some((s) => s.startsWith("fis-") && s !== "fis-recuperacion" && s !== "fis-descanso"));
expect("lunes tras el domingo anterior: recuperación", w2.days[0].sessions.includes("fis-recuperacion"));

const w3 = show("3 partidos (lun, jue, dom)", { ...base, matchDays: [0, 3, 6] });
const allowed = new Set(["prep-revision", "fis-recuperacion", "fis-descanso", "prep-tacticas", "bp-rutinas", "prep-enfoque", "viaje"]);
expect("tres partidos: solo recuperación, revisión, tácticas y balón parado", allIds(w3).every((s) => allowed.has(s)));

show("parón sin partidos", { ...base, matchDays: [] });
show("pretemporada sin partidos", { ...base, matchDays: [], preseason: true });
show("cerrar portería, partido domingo", { ...base, matchDays: [6], goal: "defensa" });

for (const theme of ["general", "velocidad"] as YouthTheme[]) {
  const y = buildYouthWeek({ matchDays: [5], theme, competitive: true });
  expect(`semana juvenil «${theme}» con sesiones del catálogo`, y.flatMap((d) => d.sessions).every((s) => !s || s === "match" || !!SESSION_BY_ID[s]));
}
process.exit(ok ? 0 : 1);
