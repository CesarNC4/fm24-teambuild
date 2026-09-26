import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { DEFAULT_HORIZON_OPTIONS, HORIZONS, departures, projectPlayer, squadActions, squadState, styleReadiness, wageSummary, type SquadState } from "../src/lib/fm/radiography";
import { newTactic } from "../src/lib/fm/tactics";
import { estimateGameYear } from "../src/lib/fm/youth";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const players = parseFmHtml(readFileSync("samples/plantilla-es-v2.html", "utf8"), {}).players;
const sub21 = parseFmHtml(readFileSync("samples/sub21-es.html", "utf8"), {}).players;
const sub18 = parseFmHtml(readFileSync("samples/sub18-es.html", "utf8"), {}).players;
const youth = [...sub21, ...sub18];
const gameYear = estimateGameYear(players);
const tactic = { ...newTactic("4-2-3-1-dm", "prueba"), styleId: "posesion" };
const TONE = { good: "verde", ok: "ámbar", poor: "rojo" } as const;

console.log("== Horizonte: edad y contratos");
const bruno = players.find((p) => p.name === "Bruno Fernandes")!;
const b2 = projectPlayer(bruno, 2);
console.log("  Bruno Fernandes en dos temporadas:", b2.changes.map((c) => `${c.key} ${c.from}→${c.to}`).join(", "));
expect("un jugador de 35 pierde físico cada temporada y no técnica", b2.player.age === 37 && b2.changes.some((c) => c.key === "Pac" && c.to <= c.from - 3) && !b2.changes.some((c) => c.key === "Pas"));
const yoro = players.find((p) => p.name === "Leny Yoro")!;
expect("uno de 24 no cambia (no se proyecta el crecimiento)", projectPlayer(yoro, 2).changes.length === 0);
const onana = players.find((p) => p.name === "André Onana")!;
const kostas = players.find((p) => p.name === "Kostas Tzolakis")!;
expect("los porteros caen tres años más tarde: Onana (34) pierde menos que un jugador de campo de 34", projectPlayer(onana, 1).changes.reduce((a, c) => a + c.from - c.to, 0) < projectPlayer({ ...onana, isGoalkeeper: false }, 1).changes.reduce((a, c) => a + c.from - c.to, 0) && projectPlayer(kostas, 2).changes.length === 0);
const gone1 = departures(players, gameYear, 1);
console.log(`  salidas en la próxima temporada (${gameYear}): ${gone1.map((d) => `${d.player.name} (${d.text})`).join(", ")}`);
expect("en la próxima temporada se van los que acaban contrato este año y los transferibles", gone1.some((d) => d.player.name === "Bruno Fernandes" && d.why === "contrato") && gone1.some((d) => d.player.name === "Pedro Porro" && d.why === "transferible"));
expect("hoy no se va nadie", departures(players, gameYear, 0).length === 0);
expect("sin contar contratos ni transferibles, nadie se va", departures(players, gameYear, 2, { contractsLeave: false, listedLeave: false }).length === 0);

const ctx = { gameYear, youth, league: null, options: DEFAULT_HORIZON_OPTIONS };
const states: SquadState[] = HORIZONS.map((h) => squadState(tactic, players, h, ctx));
for (const st of states) {
  console.log(`\n== ${st.season}: ${st.counts.poor} rojos, ${st.counts.ok} ámbar, ${st.counts.good} verdes · media ${st.lineup.average.toFixed(1)}`);
  for (const s of st.slots) console.log(`  ${s.slotId.padEnd(4)} ${TONE[s.tone].padEnd(6)} ${(s.starter?.player.name ?? "—").padEnd(20)} ${(s.backup?.player.name ?? "—").padEnd(20)} 🎓 ${(s.youth?.player.name ?? "—").padEnd(20)}${s.lost ? ` ✗ ${s.lost.player.name} ${s.lost.text}` : ""}${s.decline ? ` ↓${s.decline.toFixed(1)}` : ""}${s.expiring ? " ⌛" : ""}`);
}
const [s0, s1, s2] = states;
expect("hoy el XI y el segundo XI tienen titular y suplente en cada hueco o salen en rojo", s0.slots.every((s) => (s.starter && s.backup) || s.tone === "poor"));
expect("en la próxima temporada algún hueco pierde a su titular de hoy", s1.slots.some((s) => s.lost));
expect("ningún jugador que se va juega en el horizonte", states.every((st) => st.slots.every((s) => !st.departures.some((d) => d.player.uid === s.starter?.player.uid || d.player.uid === s.backup?.player.uid))));
expect("el horizonte cambia colores: hay más rojos dentro de dos temporadas que hoy", s2.counts.poor > s0.counts.poor, `${s0.counts.poor} → ${s2.counts.poor}`);
expect("la edad cuenta: algún titular pierde puntos en dos temporadas", s2.slots.some((s) => s.decline));
expect("cada hueco lleva el mejor juvenil que domina el puesto", s0.slots.filter((s) => s.youth).length >= 6);

console.log("\n== Estilo");
const ready = styleReadiness(tactic, s0.lineup);
for (const r of ready) console.log(`  ${r.current ? "*" : " "} ${r.style.name}: faltan ${r.missing} — ${r.gaps.filter((g) => !g.ok).map((g) => `${g.req.label}${g.slotIds.length ? ` [${g.slotIds.join(",")}]` : ""}`).join("; ")}`);
expect("primero el estilo de la táctica y después los que salen de él", ready[0].current && ready[0].style.id === "posesion" && ready.length > 1);
expect("los requisitos de atributos que fallan señalan huecos del campo", ready.flatMap((r) => r.gaps).filter((g) => !g.ok && g.req.kind === "attr").every((g) => g.slotIds.length > 0));
const noStyle = styleReadiness({ ...tactic, styleId: null }, s0.lineup);
expect("sin estilo, los más cercanos ordenados por lo que falta", noStyle.length === 6 && noStyle.every((r, i) => i === 0 || noStyle[i - 1].missing <= r.missing));

console.log("\n== Economía");
const w = wageSummary(players, s0);
console.log(`  fuera de los dos XI: ${w.outside.map((p) => p.name).join(", ")} (${w.outsideTotal})`);
expect("los que no son titulares ni suplentes reales se cuentan aparte", w.outside.length === players.length - s0.slots.flatMap((s) => [s.starter, s.backup]).filter(Boolean).length);

console.log("\n== Acciones");
const youthSquad = new Map([...sub21.map((p) => [p.uid, "Sub-21"] as const), ...sub18.map((p) => [p.uid, "Sub-18"] as const)]);
const actions = squadActions(states, { firstTeam: players, gameYear, youthSquad, style: ready[0] });
for (const a of actions) console.log(`  [${a.horizon}] ${a.kind.padEnd(10)} ${a.title} — ${a.why}`);
const kinds = new Set(actions.map((a) => a.kind));
expect("hay renovaciones, salidas, subidas del filial y planificación", ["renovar", "salida", "subir", "planificar"].every((k) => kinds.has(k as never)), [...kinds].join());
expect("los transferibles no se renuevan: Onana y Porro, «vender ya»", ["André Onana", "Pedro Porro"].every((n) => actions.some((a) => a.title === `Vender ya a ${n}`) && !actions.some((a) => a.kind === "renovar" && a.title.includes(n))));
expect("el tercer portero no se toca", !actions.some((a) => a.title.includes("Cameron Byrne-Hughes")));
expect("no se sube a un juvenil a más de 15 puntos del titular salvo que sea su relevo", actions.filter((a) => a.kind === "subir").every((a) => { const st = states[a.horizon].slots.find((s) => s.slotId === a.slotId)!; return a.why.includes("relevo de") || (st.youth?.effective ?? 0) >= (st.starter?.effective ?? 0) - 15; }));
const planned = actions.filter((a) => a.kind === "planificar" || a.kind === "subir" || a.kind === "fichar");
expect("cada hueco que se pone en rojo más adelante tiene su acción en ese horizonte o antes", states.slice(1).every((st) => st.slots.filter((s) => s.tone === "poor" && s0.slots.find((x) => x.slotId === s.slotId)!.tone !== "poor").every((s) => planned.some((a) => a.slotId === s.slotId && a.horizon <= st.horizon))));
// Solo los titulares: nadie detrás, todo urgente
const starters = s0.slots.map((s) => s.starter!.player);
const thin = HORIZONS.map((h) => squadState(tactic, starters, h, { ...ctx, youth: [] }));
const thinActions = squadActions(thin, { firstTeam: starters, gameYear, youthSquad: new Map(), style: null });
expect("con solo los titulares, se propone fichar en los huecos urgentes", thinActions.filter((a) => a.kind === "fichar").length >= 8, String(thinActions.filter((a) => a.kind === "fichar").length));
expect("Bruno Fernandes (35) se renueva solo por un año o se deja salir, nunca «renovar» a secas", actions.some((a) => a.title === "Renovar a Bruno Fernandes solo por un año" || a.title === "Dejar salir a Bruno Fernandes") && !actions.some((a) => a.title === "Renovar a Bruno Fernandes"));
expect("cada jugador sale en una sola acción", (() => { const names = actions.filter((a) => a.kind !== "fichar" && a.kind !== "planificar" && a.kind !== "estilo").map((a) => a.title.replace(/^(Renovar a|Dejar salir a|Vender a|Ceder a|Subir a) /, "").replace(/ solo por un año| \(.*\)$/g, "")); return new Set(names).size === names.length; })());
expect("cada acción enlaza con su pestaña", actions.every((a) => /^\/(plantilla|juveniles|ojeados|tactica)$/.test(a.href)));
expect("las acciones van ordenadas por horizonte", actions.every((a, i) => i === 0 || actions[i - 1].horizon <= a.horizon));

process.exit(ok ? 0 : 1);
