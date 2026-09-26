import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { roleDefaults } from "../src/lib/fm/roleInstructions";
import { ROLE_TRAIT_CODES, roleTraits } from "../src/lib/fm/roleTraits";
import { ROLES, ROLE_BY_ID } from "../src/lib/fm/roles";
import { CAPABILITY_LABEL, checkText, meetsProfile, profileText, tacticPlan, type TacticPlan } from "../src/lib/fm/slotPlan";
import { buildLineup, newTactic, type Tactic } from "../src/lib/fm/tactics";
import { NEED_LABEL, evaluateAll, squadNeeds, suggestAssignments } from "../src/lib/fm/scouting";
import { TRAIT_BY_ID } from "../src/lib/fm/traits";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const players = parseFmHtml(readFileSync("samples/plantilla-es-v2.html", "utf8"), {}).players;
const mk = (formationId: string, roles: Record<string, string>, styleId: string | null = null): Tactic => {
  const t = newTactic(formationId, "prueba");
  return { ...t, styleId, roles: { ...t.roles, ...roles } };
};
const show = (title: string, tp: TacticPlan) => {
  console.log(`\n== ${title}`);
  for (const p of tp.plans) {
    if (p.slot === "GK") continue;
    console.log(`  ${p.slotId.padEnd(4)} ${p.role.id.padEnd(6)} ${p.player?.name ?? "—"}`);
    for (const n of p.needs) {
      console.log(`     ${n.done ? "✓" : n.can === "si" ? "○" : n.can === "cerca" ? "◐" : "✗"} [${n.source}] ${n.label} — ${CAPABILITY_LABEL[n.can]} (${n.checks.map(checkText).join(", ")})`);
      for (const a of n.actions) console.log(`         → ${a.kind}: ${a.text}`);
    }
    for (const t of p.traits) console.log(`     ${t.kind === "tiene" ? "✓" : t.kind === "ensenar" ? "+" : "✗"} rasgo «${t.trait.es}»: ${t.why}`);
    if (p.sign) console.log(`     FICHAR: ${p.sign.needs.join(", ")} · ${profileText(p.sign)} · tiene ${p.sign.traitsHave.map((t) => t.es).join(", ")} · no tiene ${p.sign.traitsAvoid.map((t) => t.es).join(", ")}`);
  }
  console.log("  rasgos de la táctica:", tp.wantedTraits.map((w) => `${w.role.es} → «${w.trait.es}»${w.has ? " ✓" : ""}`).join(" · "));
};

console.log("== Rasgos por rol de los documentos");
expect("35 roles", ROLE_TRAIT_CODES.length === 35, String(ROLE_TRAIT_CODES.length));
const unknown = ROLES.flatMap((r) => r.positions.flatMap((slot) => { const x = roleTraits(r, slot); return [...x.good, ...x.bad].filter((t) => !TRAIT_BY_ID[t.id]).map((t) => `${r.id}@${slot}:${t.id}`); }));
expect("todos los rasgos existen con su nombre del juego (también los de lado)", unknown.length === 0, unknown.slice(0, 5).join(", "));
expect("Extremo inverso por la izquierda: recorta desde la izquierda y no conduce por la izquierda", roleTraits(ROLE_BY_ID["IW-S"], "AML").good.some((t) => t.id === "cuts-inside-left") && roleTraits(ROLE_BY_ID["IW-S"], "AML").bad.some((t) => t.id === "runs-ball-left"));
expect("Mediocentro: «Lanzamientos desde lejos» solo en Apoyo", roleTraits(ROLE_BY_ID["DM-S"], "DM").good.some((t) => t.id === "shoots-from-distance") && !roleTraits(ROLE_BY_ID["DM-D"], "DM").good.some((t) => t.id === "shoots-from-distance"));

// Ejemplo de la hoja de ruta: extremo izquierdo en posesión con Carrilero inverso detrás
const t1 = mk("4-3-3-dm", { DL: "IWB-S", AML: "W-S" }, "posesion");
const lu1 = buildLineup(t1, players);
const winger = lu1.slots.find((s) => s.slot.id === "AML")!.starter!.player;
const tp1 = tacticPlan(t1, lu1, players, { [winger.uid]: ["cuts-inside-left"] });
show("4-3-3 posesión, Carrilero inverso + Extremo por la izquierda", tp1);
const aml = tp1.plans.find((p) => p.slotId === "AML")!;
const width = aml.needs.find((n) => n.fn === "amplitud");
expect("el extremo izquierdo tiene que dar la amplitud y es el único de su banda", !!width && /único/.test(width.why) && /Carrilero inverso se mete por dentro/.test(width.why), width?.why);
expect("«Recorta hacia dentro desde la banda izquierda» choca con el hueco", aml.traits.some((t) => t.kind === "choca" && t.trait.id === "cuts-inside-left"));
const allPi = tp1.plans.flatMap((p) => p.needs.flatMap((n) => n.actions.filter((a) => a.kind === "pi").map((a) => ({ p, a }))));
expect("ninguna instrucción propuesta es de serie ni está bloqueada", allPi.every(({ p, a }) => { const d = roleDefaults(p.role.id, p.slot); return !d?.part.includes(a.piId!) && !d?.blocked.includes(a.piId!); }));

// Banda sin amplitud: lo piden los compañeros
const t2 = mk("4-2-3-1-dm", { DL: "IFB-D", AML: "IF-A" }, "transiciones");
const lu2 = buildLineup(t2, players);
const tp2 = tacticPlan(t2, lu2, players);
show("4-2-3-1: Lateral inverso + Delantero interior por la izquierda", tp2);
const teamWidth = tp2.plans.filter((p) => p.slotId === "DL" || p.slotId === "AML").flatMap((p) => p.needs).find((n) => n.source === "companeros" && n.fn === "amplitud");
expect("nadie abre la banda: los compañeros piden amplitud a uno de los dos", !!teamWidth);
expect("con una acción concreta (instrucción, rasgo, rol o fichar)", !!teamWidth && teamWidth.actions.length > 0, JSON.stringify(teamWidth?.actions));

// Fichar: sin plantilla de reserva nadie llega a un umbral alto
const t3 = mk("4-2-3-1-dm", { DML: "BWM-D", DMR: "BWM-S" }, "posesion");
const lu3 = buildLineup(t3, players);
const starters = lu3.slots.map((s) => s.starter?.player).filter((p): p is NonNullable<typeof p> => !!p);
const tp3 = tacticPlan(t3, lu3, starters);
show("Dos recuperadores en posesión, solo con los titulares", tp3);
const crea = tp3.plans.flatMap((p) => p.needs).find((n) => n.source === "companeros" && n.fn === "crea");
expect("el medio no genera: los compañeros piden crear a uno de los pivotes", !!crea);
expect("sin nadie más que llegue, se propone fichar y queda un perfil", tp3.signs.length > 0 || tp3.plans.every((p) => p.needs.every((n) => n.can !== "no")), String(tp3.signs.length));
if (tp3.signs.length) {
  const sp = tp3.signs[0];
  const starter = tp3.plans.find((p) => p.slotId === sp.slotId)!.player!;
  expect("el titular no cumple el perfil que se busca", !meetsProfile(starter, sp).ok);
  expect("el perfil lleva Tiene / No tiene para el foco de contratación", sp.traitsHave.length > 0);
}
expect("la táctica lista los rasgos que quiere hueco a hueco", tp1.wantedTraits.length >= 8);

console.log("\n== Ojeados");
// Copia de la plantilla sin centradores: nadie da amplitud y hay que fichar
const noCrossers = players.map((p) => ({ ...p, attrs: { ...p.attrs, Cro: { value: 5, min: 5, max: 5, isRange: false } } }));
const tpNo = tacticPlan(t1, buildLineup(t1, noCrossers), noCrossers);
expect("sin centradores en la plantilla, el plan propone fichar a quien dé amplitud", tpNo.signs.some((sg) => sg.needs.includes("Dar amplitud") && sg.traitsHave.some((t) => t.id === "hugs-line")), tpNo.signs.map((x) => x.slotId + ":" + x.needs.join("/")).join(" "));
for (const [title, tac, squad] of [["dos recuperadores, solo titulares", t3, starters], ["4-3-3 posesión, plantilla entera", t1, players], ["4-3-3 posesión, sin centradores", t1, noCrossers]] as const) {
  const res = squadNeeds(tac, [...squad], null);
  const signSlots = tacticPlan(tac, res.lineup, [...squad]).signs.map((x) => x.slotId).sort().join();
  const withProfile = res.needs.filter((n) => n.profile);
  console.log(`  ${title}: ${withProfile.map((n) => `${n.slotId} ${NEED_LABEL[n.level]} (${n.reasons.at(-1)})`).join(" | ") || "ningún perfil para fichar"}`);
  expect(`${title}: cada perfil del plan es una necesidad de Ojeados`, withProfile.map((n) => n.slotId).sort().join() === signSlots);
  expect(`${title}: un hueco con perfil nunca queda «cubierto»`, withProfile.every((n) => n.level !== "cubierto"));
  const asg = suggestAssignments(res.needs, [...squad], { transfer: null, wage: null });
  if (title.includes("sin centradores")) {
    expect(`${title}: hay necesidades con perfil`, withProfile.length > 0);
    const crosser = players.find((p) => (p.attrs.Cro?.value ?? 0) >= 14 && p.position.slots.includes("DR"))!;
    const cand = evaluateAll([{ ...crosser, uid: `ojeado-${crosser.uid}` }], res.needs, [...squad], { transfer: null, wage: null }, null)[0];
    const note = cand ? [...cand.pluses, ...cand.warnings].find((x) => x.includes("perfil del plan")) : undefined;
    console.log("  candidato:", cand?.player.name, cand?.fit?.need.slotId, note);
    expect(`${title}: un ojeado que cumple el perfil lo ve en su evaluación`, !!cand?.fit?.need.profile && !!note?.startsWith("Cumple"), `${cand?.fit?.need.slotId} ${note}`);
  }
  expect(`${title}: el encargo lleva los umbrales del plan`, withProfile.every((n) => asg.find((a) => a.need.slotId === n.slotId)?.filters.some((f) => f.label === "Perfil del plan")));
}

process.exit(ok ? 0 : 1);
