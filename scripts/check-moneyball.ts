import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { DEFAULT_DNA, buildFocuses } from "../src/lib/fm/recruitment";
import { ROLE_BY_ID } from "../src/lib/fm/roles";
import { squadNeeds } from "../src/lib/fm/scouting";
import {
  MIN_LEAGUE_SAMPLE, PROFILE_METRICS, attrVsPerf, bandOf, buildLeagueCuts, buildStatsContext, evaluatePerf, findBargains, functionChecks,
  isStatsExport, mergeStats, pastSeasons, profileOfRole, profileOfSlot, readStatsExport, removeStatsSource, sampleOf, searchFilters,
  slotPerformance, statNumber, type StatRecord,
} from "../src/lib/fm/stats";
import { newTactic } from "../src/lib/fm/tactics";
import { buildLeagueStats } from "../src/lib/fm/league";
import type { Squad } from "../src/lib/fm/types";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const read = (f: string) => readFileSync(`samples/${f}.html`, "utf8");
const players = parseFmHtml(read("plantilla-es-v2"), {}).players;

console.log("== Lector");
expect("reconoce la vista de estadísticas y no la de atributos ni la de empleados", isStatsExport(read("moneyball-mu-es")) && isStatsExport(read("moneyball-zona-es")) && isStatsExport(read("moneyball-ojeados-es")) && !isStatsExport(read("plantilla-es-v2")) && !isStatsExport(read("empleados-es")));
const nums: [string, number | null][] = [["3.151", 3151], ["1.217", 1217], ["7.05", 7.05], ["11,05", 11.05], ["-5,05", -5.05], ["89%", 89], ["12,9 km", 12.9], ["452,7 km", 452.7], ["-", null], ["", null], ["0,32", 0.32]];
const bad = nums.filter(([s, v]) => statNumber(s) !== v);
expect("números: miles con punto, decimales con coma, la Media con punto, %, km y «-»", bad.length === 0, bad.map(([s]) => `${s}→${statNumber(s)}`).join(" "));
const oj = readStatsExport(read("moneyball-ojeados-es"), { season: "2028/29", source: "ojeados", importedAt: "2026-09-26" });
console.log(`  ojeados: ${oj.records.length} jugadores, ${oj.withMinutes} con minutos, ${oj.recognized} estadísticas reconocidas`);
expect("ojeados: 53 jugadores y 8 con minutos", oj.records.length === 53 && oj.withMinutes === 8);
const first = oj.records.find((r) => r.uid === "2000053239")!;
expect("«3.151» minutos, 39 titularidades, Media 7,05, sobrerendimiento −5,05, 12,9 km/90", first.minutes === 3151 && first.starts === 39 && first.values.avgRating === 7.05 && first.values.xgOver === -5.05 && first.values.distance90 === 12.9, JSON.stringify({ m: first.minutes, s: first.starts, r: first.values.avgRating, o: first.values.xgOver, d: first.values.distance90 }));
expect("columnas comprobadas: Ent P 89 %, Rcg % 37 %, Cen.C/I 10 % (juego abierto), Cen-Ab % 13 % (todos)", first.values.tacklePct === 89 && first.values.headerPct === 37 && first.values.crossPctOpen === 10 && first.values.crossPct === 13);
expect("«29 (2)» son 31 partidos", oj.records.find((r) => r.uid === "95078306")?.apps === 31);
expect("sueldo con parseMoney: 291.000 € p/m", first.wage === 291000);
expect("nombres «- -» se guardan tal cual (se completan por UID)", first.name === "- -");

console.log("\n== Temporadas y nombres");
let store = mergeStats({}, [{ ...first, name: "Jugador Conocido", season: "2027/28", minutes: 2000, source: "plantilla" }]);
store = mergeStats(store, oj.records);
expect("una temporada nueva no borra la anterior", Object.keys(store[first.uid]).sort().join() === "2027/28,2028/29");
expect("«- -» toma el nombre ya conocido por UID", store[first.uid]["2028/29"].name === "Jugador Conocido");
const empty = mergeStats(store, [{ ...first, minutes: 0, values: {} }]);
expect("una exportación sin minutos no pisa una temporada que ya los tenía", empty[first.uid]["2028/29"].minutes === 3151);
expect("temporadas anteriores del jugador", pastSeasons(store, first.uid, "2028/29").map((r) => r.season).join() === "2027/28");
expect("borrar una fuente quita solo lo suyo", Object.keys(removeStatsSource(store, "ojeados")[first.uid] ?? {}).join() === "2027/28");

console.log("\n== Perfiles");
const pr = (id: string, slot: Parameters<typeof profileOfRole>[1]) => profileOfRole(ROLE_BY_ID[id], slot);
expect("roles → perfil: Delantero objetivo de área, Trequartista arriba delantero, Recuperador posicional, Mezzala vertical, Carrilero inverso lateral, Organizador adelantado creativo",
  pr("TF-A", "ST") === "area" && pr("TQ-A", "ST") === "delantero" && pr("BWM-D", "DM") === "posicional" && pr("MEZ-A", "MC") === "vertical" && pr("IWB-S", "WBL") === "lateral" && pr("AP-S", "AMC") === "creativo",
  [pr("TF-A", "ST"), pr("TQ-A", "ST"), pr("BWM-D", "DM"), pr("MEZ-A", "MC"), pr("IWB-S", "WBL"), pr("AP-S", "AMC")].join());
expect("posición natural → perfil", profileOfSlot("GK") === "portero" && profileOfSlot("DC") === "central" && profileOfSlot("WBR") === "lateral" && profileOfSlot("AMR") === "banda" && profileOfSlot("ST") === "delantero");
expect("los nueve perfiles tienen métricas que puntúan", Object.values(PROFILE_METRICS).every((ms) => ms.some((m) => m.weight >= 1)));

console.log("\n== Muestra");
const mk = (minutes: number, starts: number | null, values: StatRecord["values"] = {}, extra: Partial<StatRecord> = {}): StatRecord =>
  ({ uid: `x${minutes}-${starts}-${Math.random()}`, name: "X", club: null, position: "ME (D), MP (D)", age: 25, wage: null, value: null, season: "2028/29", importedAt: "", source: "liga", minutes, starts, apps: null, values, ...extra });
expect("449 insuficiente, 450 provisional, 900 firme, 10 titularidades firme", sampleOf(mk(449, 3)) === "insuficiente" && sampleOf(mk(450, 3)) === "provisional" && sampleOf(mk(900, 3)) === "firme" && sampleOf(mk(800, 10)) === "firme");
expect("con muestra insuficiente no hay veredicto", evaluatePerf(mk(300, 3, { xa90: 0.5 }), "banda", null).verdict === null);

console.log("\n== Umbrales del Excel (sin liga)");
expect("lateral: 91 % de pases es celeste; 83 % naranja", bandOf(91, PROFILE_METRICS.lateral[0].excel!, false) === 4 && bandOf(83, PROFILE_METRICS.lateral[0].excel!, false) === 1);
const lost = PROFILE_METRICS.lateral.find((m) => m.key === "possLost90")!.excel!;
expect("posesiones perdidas: menos es mejor (8,5 celeste, 11 rojo)", bandOf(8.5, lost, true) === 4 && bandOf(11, lost, true) === 0);
const exEval = evaluatePerf(first, "banda", buildLeagueCuts([], null));
console.log(`  extremo ojeado con umbrales del Excel: ${exEval.verdict} (${exEval.score?.toFixed(2)})`);
expect("sin liga el veredicto avisa de que son los umbrales del Excel", !!exEval.verdict?.includes("Excel") && !exEval.fromLeague);
const bug = evaluatePerf(mk(2000, 20, { crossPctOpen: 140, xa90: 0.3 }), "lateral", null);
expect("un % de centros imposible (140 %) se descarta y ese % nunca puntúa", bug.metrics.find((m) => m.key === "crossPctOpen")!.value === null && PROFILE_METRICS.lateral.find((m) => m.key === "crossPctOpen")!.weight === 0);

console.log("\n== Semáforo con tu liga");
// Liga sintética: 40 extremos con xA/90 de 0,05 a 0,44 y posesiones perdidas de 8 a 27,5
const league: StatRecord[] = Array.from({ length: 40 }, (_, i) => mk(1500, 17, { xa90: 0.05 + i * 0.01, possLost90: 8 + i * 0.5, keyPassesOpen90: 0.5 + i * 0.05, dribbles90: 1 + i * 0.1, xg90: 0.1 + i * 0.01 }, { uid: `l${i}` }));
const cuts = buildLeagueCuts(league, "2028/29");
expect(`con ${MIN_LEAGUE_SAMPLE} o más extremos con muestra firme se usan los cortes de la liga`, cuts.count.banda === 40);
const top = evaluatePerf(mk(1800, 20, { xa90: 0.44, possLost90: 8, keyPassesOpen90: 2.45, dribbles90: 4.9, xg90: 0.49 }), "banda", cuts);
const mid = evaluatePerf(mk(1800, 20, { xa90: 0.25, possLost90: 18, keyPassesOpen90: 1.5, dribbles90: 3, xg90: 0.3 }), "banda", cuts);
const low = evaluatePerf(mk(1800, 20, { xa90: 0.06, possLost90: 27, keyPassesOpen90: 0.55, dribbles90: 1.1, xg90: 0.11 }), "banda", cuts);
console.log(`  el mejor: ${top.verdict} (P${top.pct}) · el mediano: ${mid.verdict} (P${mid.pct}) · el peor: ${low.verdict} (P${low.pct})`);
expect("el mejor de la liga sale Estrella, el mediano Bueno y el peor Común", top.band === 4 && mid.band === 2 && low.band === 0 && !!top.verdict?.includes("en tu liga"));
expect("celeste es el 5 % mejor: xA/90 0,44 celeste, 0,41 verde, 0,25 amarillo", top.metrics.find((m) => m.key === "xa90")!.band === 4
  && evaluatePerf(mk(1800, 20, { xa90: 0.41 }), "banda", cuts).metrics.find((m) => m.key === "xa90")!.band === 3 && mid.metrics.find((m) => m.key === "xa90")!.band === 2);
expect("en «menos es mejor» el percentil también sube al perder menos", top.metrics.find((m) => m.key === "possLost90")!.pct! > 90 && low.metrics.find((m) => m.key === "possLost90")!.pct! < 10);
expect("filtros de búsqueda con el verde de tu liga y titularidades ≥ 10", searchFilters("banda", cuts).some((f) => f.startsWith("xA/90 ≥ 0,4")) && searchFilters("banda", cuts).includes("Titularidades ≥ 10"), searchFilters("banda", cuts).join(" | "));

console.log("\n== Contexto: qué cuenta como liga");
const squads: Squad[] = [
  { id: "plantilla", name: "MU", kind: "primer", maxAge: null, competitive: true },
  { id: "ojeados", name: "Ojeados", kind: "ojeados", maxAge: null, competitive: false },
  { id: "liga", name: "Liga", kind: "liga", maxAge: null, competitive: true },
  { id: "rival-a", name: "Chelsea", kind: "rival", maxAge: null, competitive: true, competition: "liga" },
  { id: "rival-b", name: "Bayern", kind: "rival", maxAge: null, competitive: true, competition: "internacional" },
];
const srcStore = mergeStats({}, (["plantilla", "ojeados", "liga", "rival-a", "rival-b"] as const).map((src, i) => mk(1000, 12, { xa90: 0.2 }, { uid: `s${i}`, source: src })));
const ctx = buildStatsContext(srcStore, squads);
expect("cuentan tu plantilla, la búsqueda de liga y los rivales de liga; no los ojeados ni los rivales internacionales", ctx.leagueRecords.map((r) => r.source).sort().join() === "liga,plantilla,rival-a");

console.log("\n== Cumplir el rol y ajustes del briefing");
const winger = mk(1800, 20, { keyPassesOpen90: 0.55, xa90: 0.06, crossesOpen90: 1 });
const checks = functionChecks(["crea", "amplitud"], winger, "banda", cuts);
expect("un extremo que debe crear y no da pases clave ni xA: no cumple", checks.some((c) => c.fn === "crea" && !c.ok && c.text.includes("crear ocasiones")), checks.map((c) => c.text).join(" | "));
const gk = players.find((p) => p.isGoalkeeper)!;
const lowVisGk = { ...gk, attrs: { ...gk.attrs, Vis: { value: 9, min: 9, max: 9, isRange: false } } };
const sp = slotPerformance(ROLE_BY_ID["GK-D"] ?? ROLE_BY_ID["SK-D"], "GK", lowVisGk, mk(1800, 20, { passPct: 70, savePct: 72, xgPrevented90: 0.05 }, { position: "POR" }), [], null);
expect("portero con poca Visión y mal % de pases: «Tomar menos riesgos» (caso Oblak)", sp.advice.some((a) => a.includes("Tomar menos riesgos")), sp.advice.join(" | "));
const piv = slotPerformance(ROLE_BY_ID["DM-D"], "DM", players[0], mk(1800, 20, { passPct: 88 }), [], null);
expect("pivote por debajo del 90 % de pases (caso Foto)", piv.advice.some((a) => a.includes("90 %")));

console.log("\n== Atributos frente a rendimiento");
const attrLeague = buildLeagueStats(players);
const weak = [...players].filter((p) => !p.isGoalkeeper).sort((a, b) => Object.values(a.attrs).reduce((s, v) => s + v!.value, 0) - Object.values(b.attrs).reduce((s, v) => s + v!.value, 0))[0];
const over = attrVsPerf(top, weak, attrLeague);
console.log(`  ${weak.name}: ${over?.text}`);
expect("el que rinde como el mejor de la liga con atributos flojos rinde por encima de sus atributos", !!over && over.diff >= 25 && over.text.includes("por encima"));

console.log("\n== Cazador de gangas");
const cheap = mk(2000, 22, top.rec.values, { uid: "cheap", source: "ojeados", value: 2_000_000 });
const pricey = mk(2000, 22, top.rec.values, { uid: "pricey", source: "rival-a", value: 60_000_000 });
const mine = mk(2000, 22, top.rec.values, { uid: players[0].uid, source: "plantilla" });
const bctx = { ...buildStatsContext(mergeStats({}, [cheap, pricey, mine]), squads), league: cuts };
const bargains = findBargains(bctx, squads, new Set(players.map((p) => p.uid)), new Map());
expect("rinden en verde o celeste, del más barato al más caro, sin tus jugadores", bargains.map((b) => b.rec.uid).join() === "cheap,pricey", bargains.map((b) => b.rec.uid).join());
expect("marca si juega en tu liga (rival de liga) o hay que comprobarla (ojeado)", bargains[0].sameLeague === false && bargains[1].sameLeague === true);

console.log("\n== Focos de contratación");
const tactic = { ...newTactic("4-2-3-1-dm", "prueba"), styleId: "posesion" };
const res = squadNeeds(tactic, players, 2029);
const needs = res.needs.map((n) => ({ ...n, level: "mejorable" as const }));
const withStats = buildFocuses(needs, { tactic, staff: [], dna: DEFAULT_DNA, budget: { transfer: null, wage: null }, firstTeam: players, created: {}, statsLeague: cuts });
const aml = withStats.find((f) => f.need?.slot === "AML" || f.need?.slot === "AMR")!;
const det = aml.details.find((d) => d.label === "Análisis y estadísticas")!;
console.log(`  ${aml.title}: ${det.value} (${det.hint})`);
expect("el foco lleva los filtros de «Análisis y estadísticas» del perfil, con el verde de tu liga", det.value.includes("Titularidades ≥ 10") && det.value.includes("xA/90") && !!det.hint?.includes("tu liga"));
const noStats = buildFocuses(needs, { tactic, staff: [], dna: DEFAULT_DNA, budget: { transfer: null, wage: null }, firstTeam: players, created: {} });
expect("sin estadísticas de liga, los del Excel y avisa de que son orientativos", !!noStats.find((f) => f.key === aml.key)!.details.find((d) => d.label === "Análisis y estadísticas")!.hint?.includes("Excel"));

process.exit(ok ? 0 : 1);
