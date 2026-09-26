import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { FORMATIONS } from "../src/lib/fm/formations";
import { PI_BY_ID, roleTraitClashes, suggestPlayerInstructions } from "../src/lib/fm/playerInstructions";
import { roleDefaults } from "../src/lib/fm/roleInstructions";
import { DUTY_LABEL, ROLES, ROLE_BY_ID, rolesForPosition } from "../src/lib/fm/roles";
import { migrateTacticRoles, newTactic } from "../src/lib/fm/tactics";
import { TRAITS, findTrait } from "../src/lib/fm/traits";

let ok = true;
const expect = (label: string, cond: boolean, extra = "") => { console.log(cond ? "  ✓" : "  ✗", label, cond ? "" : extra); if (!cond) ok = false; };
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

console.log("== Roles con los datos del juego");
expect("85 roles con deber", ROLES.length === 85, String(ROLES.length));
expect("Shadow Striker = «Delantero sorpresa» y Deep-Lying Forward = «Segundo delantero»", ROLE_BY_ID["SS-A"].es === "Delantero sorpresa" && ROLE_BY_ID["DLF-S"].es === "Segundo delantero");
expect("Poacher = «Ariete», Anchor = «Pivote defensivo», Half-Back = «Medio cierre»", ROLE_BY_ID["P-A"].es === "Ariete" && ROLE_BY_ID["A-D"].es === "Pivote defensivo" && ROLE_BY_ID["HB-D"].es === "Medio cierre");
expect("deberes Tapón y Cubrir", DUTY_LABEL.St === "Tapón" && DUTY_LABEL.Co === "Cubrir");
expect("nombres del juego únicos por familia", new Set(ROLES.map((r) => r.es)).size === new Set(ROLES.map((r) => r.code)).size);
expect("Organizador en banda solo en M banda", same(ROLE_BY_ID["WP-S"].positions, ["MR", "ML"]));
expect("Delantero presionante (At): Remate y Decisiones bajan a preferibles", !ROLE_BY_ID["PF-A"].key.includes("Fin") && ROLE_BY_ID["PF-A"].pref.includes("Fin") && ROLE_BY_ID["PF-A"].pref.includes("Dec"));
expect("Portero cierre (De): Salidas preferible y Comunicación preferible", ROLE_BY_ID["SK-D"].pref.includes("TRO") && ROLE_BY_ID["SK-D"].pref.includes("Com"));
expect("Extremo (Ap): Velocidad baja a preferible", !ROLE_BY_ID["W-S"].key.includes("Pac") && ROLE_BY_ID["W-S"].pref.includes("Pac"));
expect("Lateral: Cabeceo va aparte («además vigilamos»)", ["FB-D", "FB-S", "FB-A", "WB-D"].every((id) => ROLE_BY_ID[id].watch.includes("Hea") && !ROLE_BY_ID[id].pref.includes("Hea")));
expect("ningún atributo repetido entre clave y preferible", ROLES.every((r) => !r.key.some((k) => r.pref.includes(k) || r.watch.includes(k))));

console.log("\n== Instrucciones de serie");
const missing: string[] = [];
for (const r of ROLES) for (const s of r.positions) if (!roleDefaults(r.id, s)) missing.push(`${r.id}@${s}`);
expect("todos los roles tienen instrucciones de serie en cada posición", missing.length === 0, missing.join(", "));
const unknown = ROLES.flatMap((r) => r.positions.flatMap((s) => { const d = roleDefaults(r.id, s)!; return d ? [...d.part, ...d.blocked].filter((id) => !PI_BY_ID[id]) : []; }));
expect("todas las instrucciones existen en el catálogo", unknown.length === 0, [...new Set(unknown)].join(", "));
expect("ninguna instrucción es a la vez de serie y bloqueada", ROLES.every((r) => r.positions.every((s) => { const d = roleDefaults(r.id, s)!; return !d.part.some((x) => d.blocked.includes(x)); })));
expect("Extremo (At): en MP banda «Aguantar el balón» bloqueado, en M banda no", roleDefaults("W-A", "AML")!.blocked.includes("hold-up-ball") && !roleDefaults("W-A", "ML")!.blocked.includes("hold-up-ball"));
expect("Delantero avanzado trae «Moverse entre líneas»", roleDefaults("AF-A", "ST")!.part.includes("move-into-channels"));
expect("Central práctico: pases más directos de serie", roleDefaults("NCB-D", "DC")!.part.includes("more-direct-passes"));

console.log("\n== Formaciones");
const badDefault = FORMATIONS.flatMap((f) => f.slots.filter((s) => !ROLE_BY_ID[s.defaultRole]?.positions.includes(s.slot)).map((s) => `${f.id}/${s.id}=${s.defaultRole}`));
expect("los roles por defecto de las formaciones caben en su hueco", badDefault.length === 0, badDefault.join(", "));
const withAm = FORMATIONS.find((f) => f.slots.some((s) => s.slot === "AML"))!;
const amSlot = withAm.slots.find((s) => s.slot === "AML")!;
const old = { ...newTactic(withAm.id, "vieja"), roles: { ...newTactic(withAm.id, "vieja").roles, [amSlot.id]: "WP-A" } };
expect("táctica guardada con Organizador en banda en MP banda → Extremo inverso (At)", migrateTacticRoles(old).roles[amSlot.id] === "IW-A");
expect("MP banda ya no ofrece el Organizador en banda", !rolesForPosition("AML").some((r) => r.code === "WP"));

console.log("\n== Rasgos");
expect("59 rasgos (58 del foco de contratación + «Intenta mejorar la pierna mala»)", TRAITS.length === 59, String(TRAITS.length));
expect("nombres únicos", new Set(TRAITS.map((t) => t.es)).size === TRAITS.length);
expect("«Centra primero» existe", findTrait("Centra primero")?.id === "crosses-early");
expect("nombre anterior sigue encontrando el rasgo", findTrait("Se incorpora al ataque siempre que puede")?.id === "gets-forward");
expect("Dwells On Ball acepta los dos nombres", findTrait("Ralentiza el juego")?.id === "dwells" && findTrait("Juega el balón con el pie")?.id === "dwells");
expect("«Se mueve entre líneas» = Moves Into Channels", findTrait("Se mueve entre líneas")?.id === "moves-channels");
expect("«Llega desde segunda línea» = Arrives Late", findTrait("Llega desde segunda línea")?.id === "arrives-late");
expect("sin tildes ni mayúsculas", findTrait("se queda siempre atras")?.id === "stays-back");
const clash = roleTraitClashes(ROLE_BY_ID["IW-S"], "AMR", ["hugs-line"]);
expect("«Se pega a la banda» choca con Extremo inverso («Recortar hacia dentro» de serie)", clash.length === 1 && clash[0].pi.id === "cut-inside");

console.log("\n== Instrucciones sugeridas");
const players = parseFmHtml(readFileSync("samples/plantilla-es.html", "utf8"), {}).players;
let bad = 0, total = 0;
for (const p of players) for (const slot of p.position.slots) for (const role of rolesForPosition(slot)) {
  const d = roleDefaults(role.id, slot)!;
  for (const s of suggestPlayerInstructions(p, { slot, role, styleId: "gegenpress", traitIds: [], teamRoles: [role], strikerAerial: 15 })) {
    total++;
    if (d.part.includes(s.pi.id) || d.blocked.includes(s.pi.id)) { bad++; console.log("   ", p.name, role.id, slot, s.pi.es); }
  }
}
expect(`ninguna sugerencia de serie o bloqueada (${total} sugerencias)`, bad === 0);

process.exit(ok ? 0 : 1);
