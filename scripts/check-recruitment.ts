import { readFileSync } from "node:fs";
import { STYLE_BY_ID } from "../src/lib/fm/instructions";
import { parseFmHtml } from "../src/lib/fm/parser";
import { DEFAULT_DNA, buildFocuses, dnaCheck, evolutionNeeds, focusName, proposedTargets, styleDnaRules } from "../src/lib/fm/recruitment";
import { ROLE_BY_ID } from "../src/lib/fm/roles";
import { NEED_LABEL, evaluateAll, squadNeeds } from "../src/lib/fm/scouting";
import { isStaffExport, mergeStaff, parseStaffHtml } from "../src/lib/fm/staff";
import { newTactic, withLocks } from "../src/lib/fm/tactics";
import type { Player } from "../src/lib/fm/types";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const staffHtml = readFileSync("samples/empleados-es.html", "utf8");
const squadHtml = readFileSync("samples/plantilla-es-v2.html", "utf8");
const players = parseFmHtml(squadHtml, {}).players;
const youth = [...parseFmHtml(readFileSync("samples/sub21-es.html", "utf8"), {}).players, ...parseFmHtml(readFileSync("samples/sub18-es.html", "utf8"), {}).players];

console.log("== Empleados");
expect("se reconoce la exportación de empleados y no la de jugadores", isStaffExport(staffHtml) && !isStaffExport(squadHtml));
const staff = parseStaffHtml(staffHtml, "2026-09-26T00:00:00Z");
for (const m of staff) console.log(`  ${m.name.padEnd(20)} ${m.job.padEnd(28)} ${m.kind.padEnd(10)} ${m.nationality ?? "—"} Ada ${m.adaptability} Cal ${m.judgeAbility} Pot ${m.judgePotential}`);
const count = (k: string) => staff.filter((m) => m.kind === k).length;
expect("13 empleados: 7 ojeadores, 3 analistas y 3 de dirección", staff.length === 13 && count("ojeador") === 7 && count("analista") === 3 && count("direccion") === 3, `${staff.length} ${count("ojeador")} ${count("analista")} ${count("direccion")}`);
expect("con tildes y atributos: Gerardo Guzmán, Ada 15, Juz. Cal 18, Juz. Pot 19", staff.some((m) => m.name === "Gerardo Guzmán" && m.adaptability === 15 && m.judgeAbility === 18 && m.judgePotential === 19));
const merged = mergeStaff([...staff, { ...staff[2], name: "Ojeador Antiguo" }], staff.filter((m) => m.name !== "Tony Coulter"));
expect("fusión por nombre: el que falta queda «ya no está» y los demás siguen", merged.find((m) => m.name === "Tony Coulter")?.gone === true && merged.find((m) => m.name === "Ojeador Antiguo")?.gone === true && merged.filter((m) => !m.gone).length === 12);

console.log("\n== Focos de contratación");
const tactic = { ...newTactic("4-2-3-1-dm", "prueba"), styleId: "posesion" };
const res = squadNeeds(tactic, players, 2025, { youth });
for (const n of res.needs) console.log(`  ${n.slotId.padEnd(4)} ${NEED_LABEL[n.level].padEnd(10)} ${n.reasons.join(" ")}`);
const created = { [`${tactic.id}:XX`]: { name: "viejo", scout: "Ojeador Antiguo", analyst: null, createdAt: "" } };
const focuses = buildFocuses(res.needs, { tactic, staff: merged, dna: DEFAULT_DNA, budget: { transfer: null, wage: null }, firstTeam: players, created });
for (const f of focuses) console.log(`  [${f.priority}] ${f.title.padEnd(34)} ${f.scout?.name ?? "—"}${f.analyst ? ` + ${f.analyst.name}` : ""} (${f.scoutWhy}) ${f.alerts.join(" ")}`);
const GAME_ORDER = ["Posición", "Rol y mínima competencia", "Recambio para", "Nombre", "Tipo de fichaje", "Calidad actual y potencial mínimas", "Intervalo de edad", "Áreas", "Prioridad", "Ojeador y analista asignado", "Incluir resultados de otras políticas"];
const needFocus = focuses.filter((f) => f.need);
expect("cada foco de necesidad tiene los campos del juego en su orden", needFocus.every((f) => f.fields.map((x) => x.label).join("|") === GAME_ORDER.join("|")));
expect("prioridades del juego: Máxima para lo urgente, Estándar para el resto, Indefinido para los permanentes", needFocus.every((f) => f.priority === (f.need!.level === "urgente" ? "Máxima" : "Estándar")) && focuses.filter((f) => f.key.startsWith("perm:")).every((f) => f.priority === "Indefinido"));
expect("nunca se asigna al director deportivo, al secretario técnico ni al mánager de cesiones", focuses.every((f) => !f.scout || f.scout.kind === "ojeador") && focuses.every((f) => !f.analyst || f.analyst.kind === "analista"));
expect("nunca se asigna a un ojeador que ya no está", focuses.every((f) => !f.scout?.gone));
const loads = new Map<string, number>();
for (const f of focuses) if (f.scout) loads.set(f.scout.name, (loads.get(f.scout.name) ?? 0) + 1);
expect("la carga se reparte: nadie lleva más de dos focos más que otro", Math.max(...loads.values()) - Math.min(...[...loads.values()]) <= 2 || loads.size >= Math.min(needFocus.length, 6), JSON.stringify([...loads]));
const many = buildFocuses(res.needs.map((n) => ({ ...n, level: "mejorable" as const })), { tactic, staff, dna: DEFAULT_DNA, budget: { transfer: null, wage: null }, firstTeam: players, created: {} });
const manyLoad = new Map<string, number>();
for (const f of many) if (f.scout) manyLoad.set(f.scout.name, (manyLoad.get(f.scout.name) ?? 0) + 1);
console.log("  con 11 focos a la vez:", [...manyLoad].map(([k, v]) => `${k} ${v}`).join(" · "));
expect("con 11 focos a la vez, ningún ojeador lleva más de 3 y se usan al menos 5", Math.max(...manyLoad.values()) <= 3 && manyLoad.size >= 5);
const cantera = focuses.find((f) => f.key === "perm:cantera");
expect("el foco de cantera va al de mayor Juz. Pot (Christopher Vivell, 20)", cantera?.scout?.name === "Christopher Vivell", cantera?.scout?.name);
expect("un foco creado con un ojeador que se fue pide reasignar", focuses.some((f) => f.alerts.some((a) => a.includes("Ojeador Antiguo ya no está"))));
expect("nombre en tu formato y con 25 caracteres como mucho: «DL (C)-DLA», «MP (D)-EXT»", focusName("ST", ROLE_BY_ID["AF-A"]) === "DL (C)-DLA" && focusName("AMR", ROLE_BY_ID["W-S"]) === "MP (D)-EXT" && focuses.every((f) => (f.fields.find((x) => x.label === "Nombre")?.value.length ?? 0) <= 25));
const keptScout = buildFocuses(res.needs, { tactic, staff: merged, dna: DEFAULT_DNA, budget: { transfer: null, wage: null }, firstTeam: players, created: needFocus[0] ? { [needFocus[0].key]: { name: "x", scout: "John Thorburn", analyst: null, createdAt: "" } } : {} });
expect("un foco ya creado conserva su ojeador", !needFocus[0] || keptScout.find((f) => f.key === needFocus[0].key)?.scout?.name === "John Thorburn");

console.log("\n== ADN del club");
const rules = styleDnaRules(tactic);
console.log("  umbrales del estilo:", rules.map((r) => `${r.attr} ≥ ${r.min} en ${r.slots.join("/")}`).join(" · "));
expect("posesión: Serenidad en los pivotes", rules.some((r) => r.attr === "Cmp" && r.slots.includes("DM")));
const gp = styleDnaRules({ ...tactic, styleId: "gegenpress", instructions: STYLE_BY_ID.gegenpress.instructions });
expect("gegenpress: Resistencia al presionar y Velocidad en los centrales con línea alta", gp.some((r) => r.attr === "Sta") && gp.some((r) => r.attr === "Pac" && r.slots.includes("DC")), gp.map((r) => r.attr).join());
const someone = players.find((p) => (p.age ?? 0) >= 28)!;
const dna = { ...DEFAULT_DNA, ageMax: 26, minPersonality: 8 as const };
const chk = dnaCheck(someone, dna, rules, "DM", 400000);
expect("la edad y la personalidad fuera del ADN se explican", !chk.ok && chk.misses.some((m) => m.startsWith("edad")), chk.misses.join(", "));
expect("un juvenil propio no se filtra por edad ni sueldo", !dnaCheck(someone, dna, [], null, 1, true).misses.some((m) => m.startsWith("edad") || m.startsWith("sueldo")));

console.log("\n== Urgencias reales");
const withYouth = res.needs.filter((n) => n.youth);
console.log("  juveniles a tiro:", withYouth.map((n) => `${n.slotId} ${n.youth!.player.name} ${Math.round(n.youth!.effective)}`).join(" · ") || "ninguno");
expect("un juvenil a tiro está a 15 puntos o menos del titular", withYouth.every((n) => n.youth!.effective >= (n.starter?.effective ?? 0) - 15));
// Sucesión con relevo en casa: titular veterano y un juvenil casi igual
const dmStarter = res.lineup.slots.find((s) => s.slot.id === "DMR")!.starter!.player;
const old = players.map((p) => (p.uid === dmStarter.uid ? { ...p, age: 33 } : p));
const clone: Player = { ...dmStarter, uid: "juvenil-clon", name: "Juvenil Clon", age: 18 };
const succ = squadNeeds(tactic, old, 2025, { youth: [clone] }).needs.find((n) => n.slotId === "DMR")!;
expect("titular de 33 con un juvenil igual de bueno: relevo en casa, no hace falta fichar", succ.level !== "sucesion" && succ.reasons.some((r) => r.startsWith("Relevo en casa")), `${succ.level} ${succ.reasons.join(" ")}`);
// Eslabón débil del estilo: un pivote sin los atributos que pide el estilo
const midAttrs = STYLE_BY_ID.posesion.attrs.mid;
const weak = players.map((p) => (p.uid === dmStarter.uid ? { ...p, attrs: { ...p.attrs, ...Object.fromEntries(midAttrs.map((k) => [k, { value: 6, min: 6, max: 6, isRange: false }])) } } : p));
const weakRes = squadNeeds(withLocks(tactic, "plantilla", { DMR: dmStarter.uid }), weak, 2025);
const weakNeed = weakRes.needs.find((n) => n.starter?.player.uid === dmStarter.uid);
expect("el pivote que no tiene los atributos del estilo es urgente como eslabón débil", !!weakNeed?.weakLink && weakNeed.level === "urgente", `${weakNeed?.level} ${weakNeed?.reasons.join(" ")}`);

console.log("\n== Objetivos propuestos");
const urgentSlot = res.lineup.slots.find((s) => s.slot.id === "DMR")!;
const needs = res.needs.map((n) => (n.slotId === "DMR" ? { ...n, level: "urgente" as const } : n));
const star: Player = { ...urgentSlot.starter!.player, uid: "ojeado-estrella", name: "Ojeado Estrella", age: 24, club: "Otro FC", attrs: Object.fromEntries(Object.entries(urgentSlot.starter!.player.attrs).map(([k, v]) => [k, { ...v!, value: Math.min(20, v!.value + 3), min: Math.min(20, v!.min + 3), max: Math.min(20, v!.max + 3) }])) };
const evals = evaluateAll([star], needs, players, { transfer: null, wage: null }, 2025);
const prop = proposedTargets(evals, DEFAULT_DNA, [], null, new Set());
expect("un ojeado que mejora al titular en un hueco urgente se propone", prop.some((x) => x.e.player.uid === "ojeado-estrella"), `${evals[0]?.verdict} ${evals[0]?.fit?.need.slotId}`);
expect("si está fuera del ADN no se propone", !proposedTargets(evals, { ...DEFAULT_DNA, ageMax: 21 }, [], null, new Set()).length);
expect("si ya está en seguimiento no se repite", !proposedTargets(evals, DEFAULT_DNA, [], null, new Set(["ojeado-estrella"])).length);

console.log("\n== Evolución del estilo");
for (const x of evolutionNeeds(tactic, res.lineup)) console.log(`  ${x.style.name}: ${x.missing.map((g) => g.req.label).join("; ")}`);

process.exit(ok ? 0 : 1);
