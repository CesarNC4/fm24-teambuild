import { readFileSync } from "node:fs";
import { FUNCTION_LABEL, roleFunctions, tacticBalance, type RoleFunction } from "../src/lib/fm/balance";
import { parseFmHtml } from "../src/lib/fm/parser";
import { ROLES, ROLE_BY_ID } from "../src/lib/fm/roles";
import { bestGroupRoles, recommendRoleGroups, recommendRoles } from "../src/lib/fm/styleRoles";
import { buildLineup, newTactic, type Tactic } from "../src/lib/fm/tactics";
import type { PositionSlot } from "../src/lib/fm/types";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const fns = (id: string, slot: PositionSlot) => roleFunctions(ROLE_BY_ID[id], slot).fns;
const hasFn = (id: string, slot: PositionSlot, fn: RoleFunction) => fns(id, slot).includes(fn);

console.log("== Funciones de cada rol (primera posición)");
for (const r of ROLES) {
  const slot = r.positions[0];
  const rf = roleFunctions(r, slot);
  console.log(`  ${r.id.padEnd(7)} ${slot.padEnd(4)} ${rf.free ? "[libre] " : ""}${rf.fns.map((f) => FUNCTION_LABEL[f]).join(", ") || "—"}`);
}

console.log("\n== Funciones de la hoja de ruta");
expect("Centrocampista recuperador destruye y presiona", hasFn("BWM-D", "MC", "destruye") && hasFn("BWM-D", "MC", "presiona"));
expect("Pivote defensivo, Mediocentro (De) y Medio cierre destruyen", ["A-D", "DM-D", "HB-D"].every((id) => hasFn(id, "DM", "destruye")));
expect("Pivote organizador (De) crea y no destruye", hasFn("DLP-D", "DM", "crea") && !hasFn("DLP-D", "DM", "destruye"));
expect("organizadores crean (Organizador adelantado, Regista, Enganche, Organizador en banda, Trequartista, Falso nueve)", [["AP-S", "AMC"], ["REG-S", "DM"], ["EG-S", "AMC"], ["WP-S", "ML"], ["TQ-A", "AMC"], ["F9-S", "ST"]].every(([id, s]) => hasFn(id, s as PositionSlot, "crea")));
expect("Extremo y Carrilero completo dan amplitud", hasFn("W-S", "ML", "amplitud") && hasFn("CWB-S", "WBL", "amplitud") && hasFn("FB-A", "DL", "amplitud"));
expect("Delantero interior, Extremo inverso, Lateral inverso y Carrilero inverso ocupan el pasillo", [["IF-A", "AML"], ["IW-S", "AMR"], ["IFB-D", "DL"], ["IWB-S", "WBL"]].every(([id, s]) => hasFn(id, s as PositionSlot, "pasillo") && !hasFn(id, s as PositionSlot, "amplitud")));
expect("Delantero avanzado y Ariete fijan; Segundo delantero y Objetivo descargan", hasFn("AF-A", "ST", "fija") && hasFn("P-A", "ST", "fija") && hasFn("DLF-S", "ST", "descarga") && hasFn("TF-S", "ST", "descarga") && !hasFn("DLF-S", "ST", "fija"));
expect("Todoterreno, Segundo volante y Mediapunta (At) llegan", hasFn("B2B-S", "MC", "llega") && hasFn("SV-S", "DM", "llega") && hasFn("AM-A", "AMC", "llega"));
expect("Centrales, Lateral (De) y Lateral inverso sostienen", hasFn("CD-D", "DC", "sostiene") && hasFn("FB-D", "DL", "sostiene") && hasFn("IFB-D", "DR", "sostiene") && !hasFn("L-S", "DC", "sostiene"));
expect("roles libres sin instrucciones de serie", ["FB-S", "CM-S", "DM-S", "SV-S", "WM-S", "AM-S", "L-S"].every((id) => roleFunctions(ROLE_BY_ID[id], ROLE_BY_ID[id].positions[0]).free));
expect("un rasgo da función a un rol libre", roleFunctions(ROLE_BY_ID["CM-S"], "MC", ["gets-into-box"]).fns.includes("llega") && !roleFunctions(ROLE_BY_ID["CM-A"], "MC", ["dictates-tempo"]).fns.includes("crea"));

const t = (formationId: string, roles: Record<string, string>, extra: Partial<Tactic> = {}): Tactic => ({ ...newTactic(formationId, "prueba"), ...extra, roles: { ...newTactic(formationId, "x").roles, ...roles } });
const ids = (tac: Tactic) => tacticBalance(tac).issues;
const show = (title: string, tac: Tactic) => {
  const r = tacticBalance(tac);
  console.log(`\n== ${title}`);
  for (const i of r.issues) console.log(`  ${i.intended ? "≈" : i.level === "warn" ? "⚠" : i.level === "info" ? "ℹ" : i.level === "tip" ? "→" : "✓"} [${i.id}] ${i.text}${i.intended ? `  (intencionado: ${i.intended})` : ""}`);
  return r;
};

show("4-2-3-1 por defecto", newTactic("4-2-3-1-dm", "x"));
console.log("\n== Reglas");
const twoBwm = t("4-2-3-1-dm", { DML: "BWM-D", DMR: "BWM-S" });
expect("dos recuperadores (De + Ap): este medio no genera", ids(twoBwm).some((i) => i.id === "medio-no-genera" && i.level === "warn"), JSON.stringify(ids(twoBwm).map((i) => i.id)));
const twoBwmBus = { ...twoBwm, styleId: "autobus" };
expect("en Autobús es intencionado", ids(twoBwmBus).some((i) => i.id === "medio-no-genera" && !!i.intended));
const twoPm = t("4-2-3-1-dm", { DML: "DLP-S", DMR: "REG-S" });
expect("dos creadores sin destructor: nadie corta", ids(twoPm).some((i) => i.id === "medio-sin-corte"));
const wideWide = t("4-2-3-1-dm", { DL: "FB-A", AML: "W-S" });
expect("Extremo (Ap) + Lateral (At) en la misma banda: se pisan por fuera", ids(wideWide).some((i) => i.id === "banda-doble-amplitud" && i.slots.includes("DL") && i.slots.includes("AML")));
const wideIn = t("4-2-3-1-dm", { DL: "IWB-S", AML: "W-S" });
expect("con Carrilero inverso detrás la banda queda cubierta", !ids(wideIn).some((i) => i.id === "banda-doble-amplitud" && i.slots.includes("DL")));
const noWidth = t("4-2-3-1-dm", { DL: "IFB-D", AML: "IF-A" });
expect("Delantero interior + Lateral inverso: nadie abierto en esa banda", ids(noWidth).some((i) => i.id === "banda-sin-amplitud" && i.slots.includes("DL")));
expect("con amplitud estrecha es intencionado", ids({ ...noWidth, instructions: ["amplitud-estrecha"] }).some((i) => i.id === "banda-sin-amplitud" && !!i.intended));
const sameDutyS = t("4-2-3-1-dm", { DL: "FB-S", AML: "W-S" });
expect("mismo deber en una banda (Ap + Ap) también avisa", ids(sameDutyS).some((i) => i.id === "banda-mismo-deber" && i.level === "info"));
const twoFix = t("4-4-2", { STL: "AF-A", STR: "P-A" });
expect("dos que fijan sin creador detrás: aviso", ids(twoFix).some((i) => i.id === "dos-puntas-fijan" && i.level === "warn"));
const pair = t("4-4-2", { STL: "DLF-S", STR: "AF-A" });
expect("uno fija y otro baja: encaja", ids(pair).some((i) => i.id === "dos-puntas" && i.level === "ok"));
const threePm = t("4-2-3-1-dm", { DML: "DLP-D", DMR: "REG-S", AMC: "AP-S" });
expect("tres roles de enfoque: se estorban", ids(threePm).some((i) => i.id === "enfoque"));
const noCover = t("4-2-3-1-dm", { DML: "DLP-S", DMR: "SV-S" });
expect("sin cobertura delante de los centrales", ids(noCover).some((i) => i.id === "cobertura"));
const reg = t("4-3-3-dm", { DM: "REG-S" });
expect("Regista único pivote con cuatro atrás", ids(reg).some((i) => i.id === "regista-solo"));
const eg = t("4-3-1-2", { AMC: "EG-S", STL: "DLF-S", STR: "P-A" });
expect("Enganche con Segundo delantero (Ap): bajan a su zona", ids(eg).some((i) => i.id === "enganche-delantero"));
const svRpm = t("4-2-3-1-dm", { DML: "RPM-S", DMR: "SV-S" });
expect("Segundo volante (Ap) + Organizador itinerante sin cobertura: muy arriesgado", ids(svRpm).some((i) => i.id === "itinerante-volante"));
const aSv = t("4-2-3-1-dm", { DML: "A-D", DMR: "SV-S" });
expect("Pivote defensivo + Segundo volante: pareja equilibrada", ids(aSv).some((i) => i.id === "pareja-a-sv" && i.level === "ok"));
const hbCarMez = t("4-3-3-dm", { DM: "HB-D", MCL: "CAR-S", MCR: "MEZ-A" });
expect("Medio cierre + Interior mixto + Mezzala: centro vacío", ids(hbCarMez).some((i) => i.id === "medio-cierre-mezzala"));
const f9 = t("4-3-3-dm", { ST: "F9-S", AML: "W-S", AMR: "W-S" });
expect("Falso nueve sin nadie que ataque el hueco", ids(f9).some((i) => i.id === "falso-nueve"));
const mirror = t("4-2-3-1-dm", { DL: "FB-S", DR: "FB-S", AML: "W-A", AMR: "W-A" });
expect("bandas espejo", ids(mirror).some((i) => i.id === "bandas-espejo"));
const pos = tacticBalance(t("4-2-3-1-dm", {}, { mentality: "muy-atacante" }));
const eq = tacticBalance(t("4-2-3-1-dm", {}, { mentality: "equilibrada" }));
expect("la mentalidad del equipo mueve la de cada rol", pos.veryAttacking.length > eq.veryAttacking.length, `${pos.veryAttacking.length} vs ${eq.veryAttacking.length}`);
expect("Pivote defensivo en Defensiva con el equipo en Equilibrada", tacticBalance(t("4-3-3-dm", { DM: "A-D" }, { mentality: "equilibrada" })).entries.find((e) => e.slotId === "DM")?.mentality === 1);

show("Dos recuperadores en Autobús", twoBwmBus);

console.log("\n== Roles por parejas con la plantilla de muestra");
const players = parseFmHtml(readFileSync("samples/plantilla-es-v2.html", "utf8"), {}).players;
for (const [formation, style] of [["4-2-3-1-dm", "transiciones"], ["4-3-3-dm", "juego-posicion"], ["4-4-2", "gegenpress"]] as const) {
  const tac = { ...newTactic(formation, "x"), styleId: style };
  const lu = buildLineup(tac, players);
  const recs = recommendRoles(style, lu, players);
  const groups = recommendRoleGroups(tac, lu, recs);
  console.log(`\n-- ${formation} · ${style}`);
  for (const g of groups) {
    console.log(`  ${g.label} (${g.slotIds.join(", ")})`);
    for (const c of g.combos) console.log(`    ${c.current ? "●" : "○"} ${c.roles.map((r) => r.id).join(" + ").padEnd(24)} titulares ${c.score.toFixed(0)} equilibrio ${c.balance.toFixed(0)}${c.bad.length ? "  ⚠ " + c.bad[0].text.slice(0, 70) : ""}`);
  }
  const mids = groups.find((g) => g.key === "medios");
  if (mids) expect(`${formation}: la mejor pareja de medios no repite el mismo rol`, new Set(mids.combos[0].roles.map((r) => r.id)).size === mids.combos[0].roles.length);
  expect(`${formation}: ninguna combinación sale dos veces`, groups.every((g) => new Set(g.combos.map((c) => c.roles.map((r) => r.id).sort().join("+"))).size === g.combos.length));
  expect(`${formation}: la combinación actual se puntúa siempre`, groups.every((g) => g.current && g.current.current));
  const best = tacticBalance({ ...tac, roles: bestGroupRoles(tac, lu, recs) });
  console.log("  al ponerlo todo:", best.issues.filter((i) => i.level === "warn" && !i.intended).map((i) => i.id).join(", ") || "sin avisos graves");
  expect(`${formation}: poner todas las parejas no deja las bandas en espejo`, !best.issues.some((i) => i.id === "bandas-espejo"));
}
process.exit(ok ? 0 : 1);
