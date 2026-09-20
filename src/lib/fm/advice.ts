/**
 * Consejos contextuales sobre instrucciones de equipo.
 *
 * Reglas tomadas de la guía de instrucciones (anchura según el sistema,
 * líneas + presión, contrapresión según formación, compromiso con los
 * centros, tipo de centro y distribución del portero…), de la guía de
 * pressing (roles con presión cableada, coste físico del gatillo), de la
 * matriz de interdependencias de DarkHorse (ritmo × físico, línea × velocidad,
 * distribución larga × referencia, mentalidad × directividad) y de la defensa
 * preventiva (jugadores por detrás del balón y la «cuña»), aplicadas a la
 * formación, los roles, las instrucciones activas y el XI.
 */

import { INSTRUCTION_BY_ID, MENTALITY_BY_ID, STYLE_BY_ID, profileOf, styleTraits } from "./instructions";
import type { LineupResult, SlotResult, Tactic } from "./tactics";
import type { AttrKey } from "./attributes";
import type { PositionSlot } from "./types";

export interface Advice {
  level: "warn" | "info" | "tip";
  text: string;
  /** Instrucción que resolvería el consejo (para el botón "aplicar"). */
  apply?: string;
  /** Instrucción a quitar. */
  remove?: string;
}

const FLANK_SLOTS: Record<"L" | "R", PositionSlot[]> = {
  L: ["DL", "WBL", "ML", "AML"],
  R: ["DR", "WBR", "MR", "AMR"],
};
const AGGRESSIVE_FORMATIONS = new Set(["4-2-3-1-dm", "4-2-3-1-mc", "4-3-3-dm", "4-3-3-flat", "4-2-4", "3-4-3", "4-2-2-2", "3-4-2-1"]);
const DEFENSIVE_FORMATIONS = new Set(["4-1-4-1", "4-4-2", "5-3-2", "5-2-3", "4-1-2-1-2", "3-5-2", "4-4-1-1"]);
/** Roles con la presión cableada (no se puede quitar): en bloque bajo rompen la línea. */
const HARDWIRED_PRESS: Record<string, string> = { PF: "Delantero presionante", DW: "Extremo defensivo", BWM: "Recuperador" };

function mean(slots: SlotResult[], keys: AttrKey[]): number | null {
  const vals: number[] = [];
  for (const s of slots) {
    if (!s.starter) continue;
    for (const k of keys) {
      const v = s.starter.player.attrs[k]?.value;
      if (v != null) vals.push(v);
    }
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function attr(s: SlotResult | undefined, k: AttrKey): number {
  return s?.starter?.player.attrs[k]?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Defensa preventiva
// ---------------------------------------------------------------------------

export interface RestDefence {
  /** Jugadores centrados que se quedan por detrás del balón cuando el equipo ataca. */
  centred: { role: string; player: string }[];
  /** Laterales que se quedan. */
  wide: { role: string; player: string }[];
  /** Forma detectada de la cuña, si la hay. */
  wedge: string | null;
  issues: string[];
}

/**
 * Quién se queda atrás cuando atacamos, según rol y deber: centrales (salvo
 * líbero en ataque), pivotes que no suben, laterales invertidos y en defender.
 */
export function restDefence(lineup: LineupResult): RestDefence {
  const s = lineup.slots;
  const name = (x: SlotResult) => x.starter?.player.name ?? "—";
  const centred: RestDefence["centred"] = [];
  const wide: RestDefence["wide"] = [];
  const issues: string[] = [];
  const cbs = s.filter((x) => x.slot.slot === "DC");
  const backs = s.filter((x) => ["DL", "DR", "WBL", "WBR"].includes(x.slot.slot));
  const dms = s.filter((x) => x.slot.slot === "DM");
  const mcs = s.filter((x) => x.slot.slot === "MC");
  for (const x of cbs) if (!(x.role.code === "L" && x.role.duty === "A")) centred.push({ role: x.role.es, player: name(x) });
  for (const x of dms) if (x.role.duty !== "A" && x.role.code !== "RPM") centred.push({ role: x.role.es, player: name(x) });
  for (const x of mcs) if (x.role.duty === "D" && ["CM", "DLP", "BWM", "DM", "A", "HB"].includes(x.role.code)) centred.push({ role: x.role.es, player: name(x) });
  for (const x of backs) {
    if (["IFB", "IWB"].includes(x.role.code) && x.role.duty !== "A") centred.push({ role: x.role.es, player: name(x) });
    else if (x.role.code === "NFB" || (["FB", "WB"].includes(x.role.code) && x.role.duty === "D")) wide.push({ role: x.role.es, player: name(x) });
  }
  const ifbs = backs.filter((x) => ["IFB", "IWB"].includes(x.role.code));
  const hasL = cbs.some((x) => x.role.code === "L");
  const attackingBacks = backs.filter((x) => x.role.duty === "A" || x.role.code === "CWB");
  let wedge: string | null = null;
  if (cbs.length >= 3) wedge = "defensa de tres: cuña 3-2 natural";
  else if (ifbs.length >= 2 && hasL) wedge = "dos laterales invertidos + líbero: el líbero sube y los invertidos cierran";
  else if (ifbs.length >= 2) wedge = "dos laterales invertidos: salida 3-2 con el pivote";
  else if (ifbs.length === 1 && attackingBacks.length === 1) wedge = "cuña asimétrica: un lateral invertido cierra y el otro sube";
  const hb = [...dms, ...mcs].find((x) => x.role.code === "HB");
  if (hb && attackingBacks.length >= 2) issues.push(`Medio escoba (${name(hb)}) con los dos laterales subiendo: al bajar entre los centrales los abre y el eje queda vacío en la transición. Funciona si un lateral cierra (invertido o en defender).`);
  const rpm = dms.find((x) => x.role.code === "RPM");
  if (rpm) issues.push(`Organizador móvil en la base (${name(rpm)}): abandona el centro y nadie cubre delante de los centrales.`);
  if (cbs.length <= 2 && attackingBacks.length >= 2 && !dms.some((x) => x.role.duty === "D")) issues.push("Los dos laterales en ataque sin tres centrales ni pivote en defender: 2 contra 3 en cada contra.");
  if (centred.length < 3) issues.push(`Solo ${centred.length} jugador${centred.length === 1 ? "" : "es"} centrado${centred.length === 1 ? "" : "s"} por detrás del balón cuando atacas (${centred.map((c) => c.role).join(", ") || "nadie"}). Pivote en defender, lateral invertido o un central más.`);
  return { centred, wide, wedge, issues };
}

// ---------------------------------------------------------------------------
// Consejos
// ---------------------------------------------------------------------------

export function tacticAdvice(tactic: Tactic, lineup: LineupResult): Advice[] {
  const out: Advice[] = [];
  const on = (id: string) => tactic.instructions.includes(id);
  const prof = profileOf(tactic.instructions);
  const slots = lineup.slots;
  const byPos = (p: PositionSlot) => slots.filter((s) => s.slot.slot === p);
  const role = (s: SlotResult) => s.role;
  const style = tactic.styleId ?? "";
  const preset = style ? STYLE_BY_ID[style] : null;
  const name = (id: string) => INSTRUCTION_BY_ID[id]?.name ?? id;
  const field = slots.filter((s) => s.slot.slot !== "GK");

  // ---- Forma del sistema
  const flankCount = { L: slots.filter((s) => FLANK_SLOTS.L.includes(s.slot.slot)).length, R: slots.filter((s) => FLANK_SLOTS.R.includes(s.slot.slot)).length };
  const wideSystem = flankCount.L >= 2 && flankCount.R >= 2;
  const cbs = byPos("DC");
  const back3 = cbs.length >= 3;
  const dm = byPos("DM");
  const dmDefend = dm.some((s) => role(s).duty === "D");
  const dmSupport = dm.length > 0 && dm.every((s) => role(s).duty !== "D");
  const strikers = byPos("ST");
  const finisherST = strikers.some((s) => ["P", "AF", "PF"].includes(role(s).code));
  const backs = slots.filter((s) => ["DL", "DR", "WBL", "WBR"].includes(s.slot.slot));
  const backsStayHome = backs.length >= 2 && backs.every((s) => role(s).code === "NFB" || (role(s).code === "FB" && role(s).duty === "D"));
  const backsOverlap = backs.some((s) => role(s).duty === "A" || role(s).code === "CWB");
  const mezCar = slots.filter((s) => role(s).code === "MEZ" || role(s).code === "CAR").length;
  const wideMids = slots.filter((s) => ["ML", "MR", "AML", "AMR"].includes(s.slot.slot)).length;

  // ---- Anchura con balón
  const wideVotes: string[] = [];
  const narrowVotes: string[] = [];
  if (!wideSystem) wideVotes.push("sistema estrecho: estira el campo para crear espacio central para tus hombres de dentro");
  if (wideSystem && (dmDefend || back3)) wideVotes.push("buena cobertura central (MCD en defender o tres centrales) para aguantar contras");
  if (wideSystem && finisherST) wideVotes.push("tus delanteros son rematadores: necesitan espacio");
  if (wideSystem && backsStayHome) wideVotes.push("los laterales no suben: protegen de las contras");
  if (wideSystem && mezCar >= 2) narrowVotes.push("dos mezzala/carrilero interior se alejan de la portería: el juego estrecho los acerca");
  if (wideSystem && dmSupport) narrowVotes.push("MCD en apoyo: poca cobertura ante contras, el juego estrecho protege");
  if (wideSystem && backsOverlap) narrowVotes.push("laterales que doblan: los extremos entran al área y dejan la banda al lateral");
  // Si el estilo fija la amplitud a propósito (juego de posición estrecho, Conte muy amplio), no se discute
  const styleSetsWidth = !!preset && preset.instructions.some((i) => i.startsWith("amplitud-") && on(i));
  if (styleSetsWidth) {
    // nada: la amplitud es parte de la identidad del estilo
  } else if (wideVotes.length > narrowVotes.length && prof.amplitud <= 0) {
    out.push({ level: "tip", text: `Amplitud del ataque más amplia: ${wideVotes.join("; ")}.`, apply: "amplitud-amplia" });
  } else if (narrowVotes.length > wideVotes.length && prof.amplitud >= 0) {
    out.push({ level: "tip", text: `Amplitud del ataque más estrecha: ${narrowVotes.join("; ")}.`, apply: "amplitud-estrecha" });
  }
  if (!styleSetsWidth && prof.amplitud > 0 && narrowVotes.length > wideVotes.length) out.push({ level: "info", text: `Tienes ataque amplio, pero ${narrowVotes[0]}.`, remove: prof.amplitud === 2 ? "amplitud-muy-amplia" : "amplitud-amplia" });
  if (!styleSetsWidth && prof.amplitud < 0 && wideVotes.length > narrowVotes.length) out.push({ level: "info", text: `Tienes ataque estrecho, pero ${wideVotes[0]}.`, remove: prof.amplitud === -2 ? "amplitud-muy-estrecha" : "amplitud-estrecha" });

  // ---- Doblar por fuera / por dentro
  for (const side of ["L", "R"] as const) {
    const back = slots.find((s) => s.slot.slot === (`D${side}` as PositionSlot) || s.slot.slot === (`WB${side}` as PositionSlot));
    const wide = slots.find((s) => s.slot.slot === (`M${side}` as PositionSlot) || s.slot.slot === (`AM${side}` as PositionSlot));
    if (!back || !wide) continue;
    const label = side === "L" ? "izquierda" : "derecha";
    const outer = `desmarque-fuera-${side === "L" ? "izq" : "der"}`;
    const inner = `desmarque-dentro-${side === "L" ? "izq" : "der"}`;
    if (role(back).duty === "A" && role(wide).duty !== "A" && !["IWB", "IFB"].includes(role(back).code) && !on(outer)) {
      out.push({ level: "tip", text: `Banda ${label}: lateral en ataque con extremo en apoyo → doblar por fuera (el lateral dobla y recibe al espacio).`, apply: outer });
    }
    if (role(back).code === "IWB" && role(back).duty !== "D" && ["IF", "IW", "W"].includes(role(wide).code) && !on(inner)) {
      out.push({ level: "tip", text: `Banda ${label}: carrilero invertido con extremo → doblar por dentro (pases al pasillo interior).`, apply: inner });
    }
  }

  // ---- Transiciones
  const lowBlock = prof.lineaDef < 0 || prof.bloque === "bajo";
  if (on("contrapresionar") && lowBlock) {
    out.push({ level: "warn", text: "Contrapresión con línea baja o bloque bajo se contradice: la contrapresión es para fijar al rival en su campo. Reagruparse encaja con un bloque bajo.", apply: "reagruparse" });
  }
  if (!on("contrapresionar") && !on("reagruparse") && AGGRESSIVE_FORMATIONS.has(tactic.formationId) && !lowBlock) {
    out.push({ level: "tip", text: "Formación agresiva sin instrucción de transición defensiva: la contrapresión encaja (4-2-3-1, 4-3-3, 4-2-4, 3-4-3). Exige sacrificio y trabajo en equipo.", apply: "contrapresionar" });
  }
  if (on("reagruparse") && prof.bloque === "alto") {
    out.push({ level: "info", text: "Reagruparse con bloque alto: el bloque vuelve atrás y luego sube a presionar; funciona mejor con bloque medio o bajo." });
  }
  const attackDuties = slots.filter((s) => role(s).duty === "A").length;
  const supportDuties = slots.filter((s) => role(s).duty === "S").length;
  if (on("contraatacar") && attackDuties + supportDuties < 6) {
    out.push({ level: "info", text: `A la contra con solo ${attackDuties} ataque y ${supportDuties} apoyo: pocos jugadores transitan rápido. Más deberes de ataque/apoyo o «Mantener dibujo».` });
  }
  if (on("mantener-forma") && prof.pases > 0 && prof.ritmo > 0) {
    out.push({ level: "info", text: "Mantener dibujo con pases directos y ritmo alto: el balón sale rápido pero nadie corre al espacio. Suele ir con A la contra." });
  }
  if (preset?.posesion === 2 && on("contraatacar") && preset.id !== "cebar-presion" && preset.id !== "relacionismo") {
    out.push({ level: "info", text: "A la contra en un estilo de posesión deshace la estructura (04texag): el balón sale antes de que el equipo esté colocado. Mantener dibujo.", apply: "mantener-forma" });
  }

  // ---- Líneas y presión
  const loeHigh = prof.bloque === "alto", loeLow = prof.bloque === "bajo";
  const dlHigh = prof.lineaDef > 0, dlLow = prof.lineaDef < 0;
  const centralMids = dm.length + byPos("MC").length;
  const cbPace = mean(cbs, ["Pac", "Acc"]);
  if (loeHigh && dlHigh) {
    if (prof.gatillo < 0) out.push({ level: "warn", text: "Líneas altas con poca presión: regalas espacio a la espalda sin disputar el balón. Con líneas altas la presión debe ser estándar o alta.", remove: prof.gatillo === -2 ? "presionar-mucho-menos" : "presionar-menos" });
    if (cbPace != null && cbPace < 12) out.push({ level: "warn", text: `Líneas altas con centrales lentos (Vel/Ace media ${cbPace.toFixed(1)}): cualquier pase largo a un delantero rápido es ocasión.` });
  }
  if (prof.lineaDef === 2 && cbPace != null && cbPace < 14) out.push({ level: "warn", text: `Línea defensiva mucho más alta exige centrales con Velocidad/Aceleración ≥ 14 (tienes ${cbPace.toFixed(1)}): la primera carrera a la espalda es gol.`, remove: "linea-def-mucho-mas-alta" });
  if (loeLow && dlLow) {
    if (prof.gatillo > 0) out.push({ level: "info", text: "Bloque bajo con presión alta: la idea del bloque es mantener gente detrás del balón. Presión estándar o baja, salvo que el rival no tenga peligro en el área.", remove: prof.gatillo === 2 ? "presionar-mucho-mas" : "presionar-mas" });
    out.push({ level: "info", text: "Bloque bajo: tendrás poca posesión; la organización y la concentración de la zaga lo son todo." });
  }
  if (loeHigh && dlLow) {
    if (centralMids < 3) out.push({ level: "warn", text: `Bloque alto con línea baja parte el equipo en dos y exige mucha cobertura en el medio; solo tienes ${centralMids} centrocampistas centrales.` });
    else out.push({ level: "info", text: "Bloque alto con línea baja: juego de dos mitades. Funciona contra rivales que salen jugando despacio; puedes usar un bloque partido (delanteros presionan más por instrucción individual)." });
  }
  if (loeLow && dlHigh) {
    out.push({ level: "info", text: "Bloque bajo con línea alta: niegas todo el espacio en el medio y dejas al rival salir jugando. La presión debe ser uniforme (todos igual) y vigila el balón largo a la espalda." });
  }
  if (prof.gatillo > 0 && DEFENSIVE_FORMATIONS.has(tactic.formationId) && !style.includes("gegen") && !style.includes("cholismo") && !style.includes("contra-directo")) {
    out.push({ level: "info", text: "Formación defensiva con mucha presión: si puedes defender largos periodos, ¿para qué presionar? Vale si buscas el balón (Cholismo, DarkHorse), no si buscas negar espacio." });
  }
  if (prof.gatillo < 0 && AGGRESSIVE_FORMATIONS.has(tactic.formationId)) {
    out.push({ level: "info", text: "Formación agresiva con poca presión: con pocos jugadores atrás no puedes defender mucho tiempo; conviene ir a por el balón." });
  }

  // ---- Gatillo × físico (guía de pressing)
  const engine = mean(field, ["Wor", "Sta"]);
  if (engine != null) {
    if (prof.gatillo === 2 && engine < 14) out.push({ level: "warn", text: `Activar presión «mucho más» con Trabajo/Resistencia media ${engine.toFixed(1)} en los de campo: el equipo se cae a la hora. Baja a «más» o rota.`, remove: "presionar-mucho-mas" });
    else if (prof.gatillo === 1 && engine < 12.5) out.push({ level: "warn", text: `Presión frecuente con Trabajo/Resistencia media ${engine.toFixed(1)}: no hay piernas para sostenerla; presión estándar y bloque medio.`, remove: "presionar-mas" });
    if (on("contrapresionar") && engine < 12.5) out.push({ level: "warn", text: `Contrapresión con Trabajo/Resistencia media ${engine.toFixed(1)}: la contrapresión sin piernas deja huecos por detrás.`, remove: "contrapresionar" });
  }

  // ---- Roles con presión cableada × bloque
  if (lowBlock || prof.gatillo < 0) {
    for (const s of slots) {
      const label = HARDWIRED_PRESS[role(s).code];
      if (label) out.push({ level: "warn", text: `${label} (${s.starter?.player.name ?? "—"}) en un bloque bajo o con poca presión: su presión viene cableada al rol y no se puede quitar; sale solo y rompe la línea. Cambia el rol o sube el bloque.` });
    }
  }

  // ---- Estilo de presión
  if (on("presionar-fuera") && wideMids === 0 && !back3) {
    out.push({ level: "info", text: "Presionar fuera empuja al rival a la banda, pero no tienes jugadores de banda por delante de los laterales que cierren allí: los laterales quedan 1v1. Presionar dentro con un centro poblado." });
  }
  if (on("presionar-dentro") && centralMids < 3 && strikers.length < 2) {
    out.push({ level: "info", text: "Presionar dentro con pocos jugadores por el centro: se empuja al rival hacia donde estás en inferioridad." });
  }

  // ---- Adelantarse / Retroceder más
  if (on("adelantarse-mas")) {
    const weak = cbs.filter((s) => (["Ant", "Dec", "Pos", "Cnt"] as AttrKey[]).some((k) => attr(s, k) <= 10));
    if (weak.length) out.push({ level: "warn", text: `Adelantarse más con ${weak.map((s) => s.starter!.player.name).join(", ")} por debajo de 11 en Anticipación/Decisiones/Colocación/Concentración: la línea no sube al unísono y un fallo es gol.`, remove: "adelantarse-mas" });
    if (dlLow) out.push({ level: "warn", text: "Adelantarse más con línea defensiva baja se contradice: la línea cede metros y luego intenta subir. Elige.", remove: "adelantarse-mas" });
    if (cbs.every((s) => role(s).duty === "D") && cbs.length === 2) out.push({ level: "info", text: "Adelantarse más solo contra un punta (04texag): contra dos, los centrales en defender y sin adelantarse. Revísalo en la pestaña Rival." });
  }
  if (on("retroceder-mas") && dlHigh && prof.lineaDef === 2) out.push({ level: "info", text: "Retroceder más con línea mucho más alta: la línea sube y luego cede; el resultado es una línea alta normal. Baja un punto la línea y quita Retroceder." });

  // ---- Compromiso con los centros
  const cbAerial = mean(cbs, ["Hea", "Jum"]);
  const backAerial = mean(backs, ["Hea", "Jum"]);
  if (cbAerial != null) {
    const back5 = cbs.length + backs.length >= 5;
    if (!back5 && cbAerial >= 14 && (backAerial ?? 14) >= 12 && !on("permitir-centros")) {
      out.push({ level: "tip", text: `Defensa de cuatro con buen juego aéreo (centrales ${cbAerial.toFixed(1)}): permitir centros; los que lleguen los ganáis y el centro queda cerrado.`, apply: "permitir-centros" });
    } else if (!back5 && cbAerial <= 11 && !on("evitar-centros")) {
      out.push({ level: "tip", text: `Defensa de cuatro floja por arriba (centrales ${cbAerial.toFixed(1)}): evitar centros, que no lleguen; exige movilidad y lectura en los laterales.`, apply: "evitar-centros" });
    } else if (back5 && !on("evitar-centros") && !on("permitir-centros")) {
      out.push({ level: "tip", text: "Defensa de cinco: evitar centros; con superioridad numérica el área sigue cubierta.", apply: "evitar-centros" });
    }
  }
  if (on("permitir-centros") && cbAerial != null && cbAerial <= 11) out.push({ level: "warn", text: "Permitir centros con centrales flojos por arriba: te van a llover centros que no ganas.", remove: "permitir-centros" });

  // ---- Portero: tipo y destino
  const gk = byPos("GK")[0];
  const hasTarget = slots.some((s) => role(s).code === "TF" || role(s).code === "WTF");
  if (gk?.starter) {
    const kic = attr(gk, "Kic"), pas = attr(gk, "Pas"), thr = attr(gk, "Thr"), vis = attr(gk, "Vis"), cnt = attr(gk, "Cnt"), ecc = attr(gk, "Ecc");
    const gkName = gk.starter.player.name;
    let type: string | null = null; let why = "";
    if (kic >= 13 && pas >= 12) { type = "gk-saque-corto"; why = `Saque de puerta ${kic} y Pases ${pas}`; }
    else if (thr >= 13 && vis >= 12) { type = "gk-mano-largo"; why = `Saque de mano ${thr} y Visión ${vis}`; }
    else if (kic >= 14 && vis >= 12) { type = "gk-saque-largo"; why = `Saque de puerta ${kic} y Visión ${vis}`; }
    else if (cnt >= 12) { type = "gk-rodar"; why = `pie y mano justos pero Concentración ${cnt}`; }
    if (type && !tactic.instructions.some((i) => INSTRUCTION_BY_ID[i]?.group === "gk-tipo")) {
      out.push({ level: "tip", text: `${gkName}: ${why} → ${name(type)}.`, apply: type });
    }
    if (ecc >= 13) out.push({ level: "info", text: `${gkName} tiene Excentricidad ${ecc}: tiende a salidas y regates arriesgados. Evita Portero líbero en ataque y la distribución rápida arriesgada.` });
    const deepPlaymaker = dm.find((s) => ["DLP", "REG", "HB"].includes(role(s).code));
    const fastStrikers = strikers.some((s) => attr(s, "Acc") >= 15 && attr(s, "Pac") >= 15);
    const possession = styleTraits(style).possession;
    const hasDest = tactic.instructions.some((i) => INSTRUCTION_BY_ID[i]?.group === "gk-destino");
    if (!hasDest) {
      if (hasTarget && (kic >= 12 || thr >= 12)) out.push({ level: "tip", text: "Tienes un Delantero referencia: distribuir al delantero objetivo salta el medio campo y llega al último tercio rápido. Si el rival pone otro cabeceador, deja de funcionar.", apply: "gk-al-referencia" });
      else if (fastStrikers && kic >= 15 && styleTraits(style).counter && !possession) out.push({ level: "tip", text: `Delantero muy rápido y ${gkName} con Saque de puerta ${kic}: distribuir por encima de la defensa castiga líneas altas.`, apply: "gk-por-encima" });
      else if (possession && mean(cbs, ["Pas", "Fir", "Cmp"])! >= 12) out.push({ level: "tip", text: "Estilo de posesión con centrales que saben jugar: distribuir a los centrales.", apply: "gk-a-defensas" });
      else if (deepPlaymaker && attr(deepPlaymaker, "Fir") >= 13 && attr(deepPlaymaker, "Cmp") >= 13) out.push({ level: "tip", text: `${deepPlaymaker.starter!.player.name} es el organizador más retrasado: distribuir al organizador da una salida menos arriesgada (cuidado si le marcan al hombre).`, apply: "gk-al-organizador" });
    }
  }
  if (on("gk-al-referencia") && !hasTarget) out.push({ level: "warn", text: "Distribuir al delantero objetivo sin Delantero referencia en el XI: el saque largo cae en tierra de nadie (matriz de DarkHorse: distribución larga exige referencia).", remove: "gk-al-referencia" });
  if (on("gk-saque-largo") && !hasTarget && strikers.every((s) => attr(s, "Hea") + attr(s, "Jum") < 26)) out.push({ level: "info", text: "Chutar en largo sin nadie que gane el duelo aéreo arriba: regalas la segunda jugada." });

  // ---- Tipo de centro
  const stAerial = strikers.length ? Math.max(...strikers.map((s) => (attr(s, "Hea") + attr(s, "Jum")) / 2)) : 0;
  const stQuick = strikers.some((s) => attr(s, "Acc") >= 14 && attr(s, "Hea") <= 11);
  const crossers = slots.filter((s) => ["DL", "DR", "WBL", "WBR", "ML", "MR", "AML", "AMR"].includes(s.slot.slot));
  const crossQ = mean(crossers, ["Cro", "Tec"]);
  const hasCross = tactic.instructions.some((i) => INSTRUCTION_BY_ID[i]?.group === "centros");
  if (!hasCross && strikers.length) {
    if (stAerial >= 15) out.push({ level: "tip", text: `Delantero dominante por arriba (${stAerial.toFixed(0)}): centros colgados, que solo puede sacar el portero. Esconde a centradores mediocres.`, apply: "centros-colgados" });
    else if (stQuick) out.push({ level: "tip", text: "Delantero rápido pero flojo por arriba: centros rasos (y recortes atrás para los llegadores).", apply: "centros-rasos" });
    else if (crossQ != null && crossQ >= 14.5) out.push({ level: "tip", text: `Centradores de calidad (Centros/Técnica ${crossQ.toFixed(1)}): centros con rosca; los defensas fallan el despeje y el remate es sencillo.`, apply: "centros-rosca" });
    else out.push({ level: "tip", text: "Sin un perfil claro en delantera ni centradores excelentes: centros variados; el jugador elige y el rival no puede prepararse.", apply: "centros-mixtos" });
  }

  // ---- Riesgo de pase: directo/ritmo/pasar al espacio
  if (prof.pases < 0 && prof.ritmo < 0 && on("pasar-espacio")) {
    out.push({ level: "info", text: "Pasar al espacio solo amplifica el riesgo que ya hay: con pases cortos y ritmo bajo apenas tendrá efecto. Sube el ritmo si quieres verticalidad." });
  }
  if (prof.pases > 0 && prof.ritmo > 0 && on("pasar-espacio") && on("mas-creatividad")) {
    out.push({ level: "info", text: "Directo + ritmo alto + pasar al espacio + expresivos: riesgo de pase máximo. Perderás muchos balones; asegúrate de que la transición defensiva está cubierta." });
  }
  const tempoBrain = mean(field, ["Dec", "Fir"]);
  if (prof.ritmo === 2 && tempoBrain != null && tempoBrain < 13) out.push({ level: "warn", text: `Ritmo mucho más alto con Decisiones/Primer toque media ${tempoBrain.toFixed(1)}: el equipo regala balones (matriz de DarkHorse: ritmo × calidad de decisión). Ritmo más alto a secas.`, remove: "ritmo-mucho-mas-alto" });
  if (on("salir-jugando")) out.push({ level: "info", text: "Salir jugando desde la defensa: el medio campo baja a ayudar en la salida; el equipo tarda más en llegar arriba. En FM puede acabar en pelotazo por frustración (04texag): Central con salida + ritmo bajo + pase corto hacen lo mismo con menos riesgo." });
  if (on("trabajar-area") && on("centros-tempranos")) out.push({ level: "warn", text: "Llevar el balón hasta el área y centros rápidos se contradicen (paciencia vs. centrar cuanto antes).", remove: "centros-tempranos" });
  if (on("tirar-minima") && on("trabajar-area")) out.push({ level: "warn", text: "Disparar cuando se pueda y llevar el balón hasta el área se contradicen.", remove: "tirar-minima" });
  if (on("perder-tiempo-mucho") && prof.ritmo > 0) out.push({ level: "info", text: "Perder tiempo con frecuencia y ritmo alto: el equipo pisa el balón y luego corre. Solo tiene sentido como cebo (De Zerbi) con ritmo bajo." });

  // ---- Mentalidad
  const ment = MENTALITY_BY_ID[tactic.mentality ?? "equilibrada"];
  if (preset && ment && preset.mentalityId !== ment.id) {
    const want = MENTALITY_BY_ID[preset.mentalityId];
    out.push({ level: "info", text: `El estilo ${preset.name} suele jugarse con mentalidad ${want.name.toLowerCase()} (${want.idea}); tienes ${ment.name.toLowerCase()}.` });
  }
  if (ment && ment.level >= 2 && (dlLow || loeLow)) out.push({ level: "info", text: "Mentalidad ofensiva con líneas bajas: la mentalidad sube líneas, presión y riesgo; las instrucciones tiran en dirección contraria. Es exactamente la receta de DarkHorse para el contraataque (bloque medio/bajo + Ofensiva), así que vale si es a propósito." });
  if (ment && ment.level <= -2 && (dlHigh || loeHigh || on("contrapresionar"))) out.push({ level: "info", text: "Mentalidad defensiva con líneas altas o contrapresión: la mentalidad baja la intensidad y las líneas; el resultado será un término medio." });
  if (ment && ment.level <= -1 && on("contraatacar") && !preset?.id.startsWith("autobus")) out.push({ level: "info", text: "Cauta/defensiva con A la contra: DarkHorse comprobó que con Cauta el equipo es demasiado pasivo para atacar el espacio al recuperar. Prueba Equilibrada o Positiva (o Ofensiva, su receta)." });
  if (ment && ment.level >= 2 && prof.pases === 2) out.push({ level: "info", text: "Mentalidad ofensiva ya sube la directividad y el ritmo; con pases mucho más directos se acumula y el equipo pega pelotazos. Con Ofensiva suele bastar «más directos»." });
  if (ment && ment.level >= 2 && preset?.posesion === 2 && preset.id !== "relacionismo") out.push({ level: "info", text: "Mentalidad ofensiva en un estilo de posesión: Ofensiva es demasiado directa y no deja que ocurran las rotaciones (PDF de relacionismo). Positiva es la mentalidad del control." });

  // ---- Defensa preventiva
  const rd = restDefence(lineup);
  for (const i of rd.issues) out.push({ level: "warn", text: `Defensa preventiva: ${i}` });
  if (rd.wedge && rd.issues.length === 0) out.push({ level: "info", text: `Defensa preventiva: ${rd.wedge} (${rd.centred.length} centrados por detrás del balón: ${rd.centred.map((c) => c.role).join(", ")}).` });
  if (preset?.posesion === 2 && !rd.wedge && rd.issues.length === 0) out.push({ level: "info", text: `Estilo de posesión sin cuña clara: ${rd.centred.length} centrados por detrás del balón (${rd.centred.map((c) => c.role).join(", ")}). Un lateral invertido o tres centrales dan la salida 3-2 que pide el juego de posición.` });

  // ---- Marcaje al hombre
  if (preset?.manMarking) {
    const weakMarkers = slots.filter((s) => ["DC", "DL", "DR", "WBL", "WBR", "DM", "MC"].includes(s.slot.slot) && attr(s, "Mar") <= 11);
    if (weakMarkers.length) out.push({ level: "info", text: `${preset.name} se defiende con «Marcajes más férreos» por jugador (en FM24 no hay marcaje estricto de equipo). ${weakMarkers.map((s) => `${s.starter?.player.name} (Mar ${attr(s, "Mar")})`).join(", ")} no deberían llevarlo: pegado a un rival con Desmarques altos, le regalas el giro.` });
    else out.push({ level: "info", text: `${preset.name} se defiende con «Marcajes más férreos» por jugador (en FM24 no hay marcaje estricto de equipo): ver instrucciones individuales.` });
  }

  return out;
}
