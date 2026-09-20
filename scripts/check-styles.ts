import { readFileSync } from "node:fs";
import { parseFmHtml } from "../src/lib/fm/parser";
import { STYLE_PRESETS, STYLE_BY_ID, INSTRUCTION_BY_ID, MENTALITY_BY_ID, migrateInstructions, styleTraits, profileOf } from "../src/lib/fm/instructions";
import { PI_BY_ID, strikerAerial, suggestPlayerInstructions } from "../src/lib/fm/playerInstructions";
import { FORMATION_BY_ID } from "../src/lib/fm/formations";
import { ROLE_BY_ID } from "../src/lib/fm/roles";
import { buildLineup, newTactic, tacticWarnings } from "../src/lib/fm/tactics";
import { rankStyles } from "../src/lib/fm/styles";
import { tacticAdvice, restDefence } from "../src/lib/fm/advice";
const { players } = parseFmHtml(readFileSync("samples/plantilla-es.html", "utf8"), {});
const roleCodes = new Set(Object.values(ROLE_BY_ID).map((r) => r.code));
for (const s of STYLE_PRESETS) {
  const bad = s.instructions.filter((i) => !INSTRUCTION_BY_ID[i]);
  const badF = s.formations.filter((f) => !FORMATION_BY_ID[f]);
  const groups = new Map<string, string[]>();
  for (const i of s.instructions) { const g = INSTRUCTION_BY_ID[i]?.group; if (g) groups.set(g, [...(groups.get(g) ?? []), i]); }
  const dup = [...groups.entries()].filter(([, v]) => v.length > 1);
  const badRoles = [...s.roles.favor, ...s.roles.avoid, ...s.signature.flatMap((x) => x.codes), ...(s.staticRoles ?? []), ...(s.mobileRoles ?? []), ...(s.pis ?? []).flatMap((x) => x.roles)].filter((c) => !roleCodes.has(c));
  const badPis = (s.pis ?? []).filter((x) => !PI_BY_ID[x.pi]).map((x) => x.pi);
  const badLever = s.levers.filter((l) => (l.instruction && !INSTRUCTION_BY_ID[l.instruction]) || (l.remove ?? []).some((r) => !INSTRUCTION_BY_ID[r]));
  const badParent = s.parent && !STYLE_BY_ID[s.parent];
  const badMent = !MENTALITY_BY_ID[s.mentalityId] || MENTALITY_BY_ID[s.mentalityId].name !== s.mentality;
  if (bad.length || badF.length || dup.length || badRoles.length || badPis.length || badLever.length || badParent || badMent) console.log("PROBLEMA", s.id, { bad, badF, dup, badRoles, badPis, badLever: badLever.map((l) => l.symptom), badParent, badMent });
}
console.log("migración:", migrateInstructions(["fuera-de-juego", "marcaje-estricto", "anchura-def-amplia", "pases-cortos", "pases-cortos", "no-existe"]));
for (const s of STYLE_PRESETS) { const t = styleTraits(s.id); const p = profileOf(s.instructions); console.log(s.id.padEnd(24), `pos${s.posesion}`, t.possession ? "P" : "-", t.pressing ? "R" : "-", t.counter ? "C" : "-", t.deep ? "D" : "-", `bloque ${p.bloque} gatillo ${p.gatillo} línea ${p.lineaDef}`, p.estiloPresion ?? "", p.lineaAjuste ?? "", p.centros ?? ""); }
const t = newTactic("4-2-3-1-dm", "test"); t.styleId = "transiciones";
const lineup = buildLineup(t, players);
for (const f of rankStyles(lineup)) console.log(f.style.name.padEnd(40), f.mean?.toFixed(1), f.formationOk ? "" : "form✗", `faltan ${f.missing}/${f.gaps.length}`, f.gaps.filter((g) => !g.ok).map((g) => `${g.req.label} → ${g.detail}`).join(" | "));
for (const id of ["autobus", "catenaccio", "route-one"]) { t.styleId = id; console.log(id, tacticWarnings(t).map((w) => w.text.slice(0, 60))); }
for (const id of ["juego-posicion", "contra-directo", "presion-hombre"]) {
  const tt = newTactic(STYLE_BY_ID[id].formations[0], id); tt.styleId = id; tt.instructions = [...STYLE_BY_ID[id].instructions]; tt.mentality = STYLE_BY_ID[id].mentalityId;
  const lu = buildLineup(tt, players);
  console.log("\n==", id, lu.formation.name, "defensa preventiva:", JSON.stringify(restDefence(lu)));
  for (const a of tacticAdvice(tt, lu)) console.log(" ", a.level, a.text.slice(0, 150), a.apply ? `[+${a.apply}]` : "", a.remove ? `[-${a.remove}]` : "");
  const starters = lu.slots.filter((s) => s.starter).map((s) => ({ player: s.starter!.player, slot: s.slot.slot }));
  for (const s of lu.slots.slice(0, 11)) if (s.starter) console.log("   PI", s.slot.slot, s.role.code, suggestPlayerInstructions(s.starter.player, { slot: s.slot.slot, role: s.role, styleId: id, traitIds: [], teamRoles: lu.slots.map((x) => x.role), strikerAerial: strikerAerial(starters) }).map((x) => `${x.pi.es}(${x.strength})`).join(", "));
}

// ---- Roles recomendados por estilo
import { ROLE_BY_ID as RBI, ROLES } from "../src/lib/fm/roles";
import { recommendRoles, roleOptionsFor } from "../src/lib/fm/styleRoles";
for (const s of STYLE_PRESETS) {
  for (const grp of roleOptionsFor(s)) for (const op of grp.options) {
    const ok = RBI[op.role] ? grp.slots.every((sl) => RBI[op.role].positions.includes(sl)) : ROLES.some((r) => r.code === op.role);
    if (!ok) console.log("ROL INVÁLIDO", s.id, grp.slots.join("/"), op.role);
  }
}
{
  const tt = newTactic("4-3-3-dm", "jp"); tt.styleId = "juego-posicion";
  const lu = buildLineup(tt, players);
  console.log("\n== roles para juego-posicion (4-3-3 MCD)");
  for (const r of recommendRoles("juego-posicion", lu, players)) console.log(" ", r.slot.padEnd(4), (r.currentOk ? "✓ " : "⚠ ") + r.current.id.padEnd(7), r.options.map((o) => `${o.role.id} ${o.starter?.toFixed(0) ?? "-"}${o.best ? `/${o.best.player.name.split(" ").slice(-1)[0]} ${o.best.score.toFixed(0)}` : ""}`).join(" | "));
}
