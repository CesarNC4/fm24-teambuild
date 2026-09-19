/**
 * Consejos contextuales sobre instrucciones de equipo.
 *
 * Reglas tomadas de la guía de instrucciones (anchura según el sistema,
 * líneas + presión, contrapresión según formación, trampa del fuera de
 * juego, anchura defensiva, tipo de centro y distribución del portero…)
 * aplicadas a la formación, los roles, las instrucciones activas y el XI.
 */

import { INSTRUCTION_BY_ID, MENTALITY_BY_ID, STYLE_BY_ID } from "./instructions";
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

export function tacticAdvice(tactic: Tactic, lineup: LineupResult): Advice[] {
  const out: Advice[] = [];
  const on = (id: string) => tactic.instructions.includes(id);
  const slots = lineup.slots;
  const byPos = (p: PositionSlot) => slots.filter((s) => s.slot.slot === p);
  const role = (s: SlotResult) => s.role;
  const style = tactic.styleId ?? "";
  const name = (id: string) => INSTRUCTION_BY_ID[id]?.name ?? id;

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
  if (wideVotes.length > narrowVotes.length && !on("amplitud-amplia")) {
    out.push({ level: "tip", text: `Juego más amplio: ${wideVotes.join("; ")}.`, apply: "amplitud-amplia" });
  } else if (narrowVotes.length > wideVotes.length && !on("amplitud-estrecha")) {
    out.push({ level: "tip", text: `Juego más estrecho: ${narrowVotes.join("; ")}.`, apply: "amplitud-estrecha" });
  }
  if (on("amplitud-amplia") && narrowVotes.length > wideVotes.length) out.push({ level: "info", text: `Tienes juego amplio, pero ${narrowVotes[0]}.`, remove: "amplitud-amplia" });
  if (on("amplitud-estrecha") && wideVotes.length > narrowVotes.length) out.push({ level: "info", text: `Tienes juego estrecho, pero ${wideVotes[0]}.`, remove: "amplitud-estrecha" });

  // ---- Desmarques por fuera / por dentro
  for (const side of ["L", "R"] as const) {
    const back = slots.find((s) => s.slot.slot === (`D${side}` as PositionSlot) || s.slot.slot === (`WB${side}` as PositionSlot));
    const wide = slots.find((s) => s.slot.slot === (`M${side}` as PositionSlot) || s.slot.slot === (`AM${side}` as PositionSlot));
    if (!back || !wide) continue;
    const label = side === "L" ? "izquierda" : "derecha";
    const outer = `desmarque-fuera-${side === "L" ? "izq" : "der"}`;
    const inner = `desmarque-dentro-${side === "L" ? "izq" : "der"}`;
    if (role(back).duty === "A" && role(wide).duty !== "A" && !["IWB", "IFB"].includes(role(back).code) && !on(outer)) {
      out.push({ level: "tip", text: `Banda ${label}: lateral en ataque con extremo en apoyo → desmarque por fuera (el lateral dobla y recibe al espacio).`, apply: outer });
    }
    if (role(back).code === "IWB" && role(back).duty !== "D" && ["IF", "IW", "W"].includes(role(wide).code) && !on(inner)) {
      out.push({ level: "tip", text: `Banda ${label}: carrilero invertido con extremo → desmarque por dentro (pases al pasillo interior).`, apply: inner });
    }
  }

  // ---- Transiciones
  const lowBlock = on("linea-def-baja") || on("linea-presion-baja");
  if (on("contrapresionar") && lowBlock) {
    out.push({ level: "warn", text: "Contrapresionar con línea baja o presión baja se contradice: la contrapresión es para fijar al rival en su campo. Reagruparse encaja con un bloque bajo.", apply: "reagruparse" });
  }
  if (!on("contrapresionar") && !on("reagruparse") && AGGRESSIVE_FORMATIONS.has(tactic.formationId) && !lowBlock) {
    out.push({ level: "tip", text: "Formación agresiva sin instrucción de transición defensiva: la contrapresión encaja (4-2-3-1, 4-3-3, 4-2-4, 3-4-3). Exige sacrificio y trabajo en equipo.", apply: "contrapresionar" });
  }
  if (on("reagruparse") && on("linea-presion-alta")) {
    out.push({ level: "info", text: "Reagruparse con línea de presión alta: el bloque vuelve atrás y luego sube a presionar; funciona mejor con presión media o baja." });
  }
  const attackDuties = slots.filter((s) => role(s).duty === "A").length;
  const supportDuties = slots.filter((s) => role(s).duty === "S").length;
  if (on("contraatacar") && attackDuties + supportDuties < 6) {
    out.push({ level: "info", text: `Contraatacar con solo ${attackDuties} ataque y ${supportDuties} apoyo: pocos jugadores transitan rápido. Más deberes de ataque/apoyo o "Mantener la forma".` });
  }
  if (on("mantener-forma") && on("pases-directos") && on("ritmo-alto")) {
    out.push({ level: "info", text: "Mantener la forma con pases directos y ritmo alto: el balón sale rápido pero nadie corre al espacio. Suele ir con Contraatacar." });
  }

  // ---- Líneas y presión
  const loeHigh = on("linea-presion-alta"), loeLow = on("linea-presion-baja");
  const dlHigh = on("linea-def-alta"), dlLow = on("linea-def-baja");
  const centralMids = dm.length + byPos("MC").length;
  if (loeHigh && dlHigh) {
    if (on("presionar-menos")) out.push({ level: "warn", text: "Líneas altas con poca presión: regalas espacio a la espalda sin disputar el balón. Con líneas altas la presión debe ser estándar o alta.", remove: "presionar-menos" });
    const cbPace = mean(cbs, ["Pac", "Acc"]);
    if (cbPace != null && cbPace < 12) out.push({ level: "warn", text: `Líneas altas con centrales lentos (Vel/Ace media ${cbPace.toFixed(1)}): cualquier pase largo a un delantero rápido es ocasión.` });
  }
  if (loeLow && dlLow) {
    if (on("presionar-mas")) out.push({ level: "info", text: "Bloque bajo con presión alta: la idea del bloque es mantener gente detrás del balón. Presión estándar o baja, salvo que el rival no tenga peligro en el área.", remove: "presionar-mas" });
    out.push({ level: "info", text: "Bloque bajo: tendrás poca posesión; la organización y la concentración de la zaga lo son todo." });
  }
  if (loeHigh && dlLow) {
    if (centralMids < 3) out.push({ level: "warn", text: `Presión alta con línea baja parte el equipo en dos y exige mucha cobertura en el medio; solo tienes ${centralMids} centrocampistas centrales.` });
    else out.push({ level: "info", text: "Presión alta con línea baja: juego de dos mitades. Funciona contra rivales que salen jugando despacio; puedes usar un bloque partido (delanteros presionan más por instrucción individual)." });
  }
  if (loeLow && dlHigh) {
    out.push({ level: "info", text: "Presión baja con línea alta: niegas todo el espacio en el medio y dejas al rival salir jugando. La presión debe ser uniforme (todos igual) y vigila el balón largo a la espalda." });
  }
  if (on("presionar-mas") && DEFENSIVE_FORMATIONS.has(tactic.formationId) && !style.includes("gegen")) {
    out.push({ level: "info", text: "Formación defensiva con mucha presión: si puedes defender largos periodos, ¿para qué presionar? Vale si buscas el balón, no si buscas negar espacio." });
  }
  if (on("presionar-menos") && AGGRESSIVE_FORMATIONS.has(tactic.formationId)) {
    out.push({ level: "info", text: "Formación agresiva con poca presión: con pocos jugadores atrás no puedes defender mucho tiempo; conviene ir a por el balón." });
  }

  // ---- Trampa del fuera de juego
  if (on("fuera-de-juego")) {
    const weak = cbs.filter((s) => (["Ant", "Dec", "Pos", "Cnt"] as AttrKey[]).some((k) => attr(s, k) <= 10));
    if (weak.length) out.push({ level: "warn", text: `Trampa del fuera de juego con ${weak.map((s) => s.starter!.player.name).join(", ")} por debajo de 11 en Anticipación/Decisiones/Colocación/Concentración: un fallo es gol. Mejor sin trampa.`, remove: "fuera-de-juego" });
  }

  // ---- Anchura defensiva
  const cbAerial = mean(cbs, ["Hea", "Jum"]);
  const backAerial = mean(backs, ["Hea", "Jum"]);
  if (cbAerial != null) {
    const back5 = cbs.length + backs.length >= 5;
    if (!back5 && cbAerial >= 14 && (backAerial ?? 14) >= 12 && !on("anchura-def-estrecha")) {
      out.push({ level: "tip", text: `Defensa de cuatro con buen juego aéreo (centrales ${cbAerial.toFixed(1)}): anchura defensiva estrecha; los centros que lleguen los ganáis.`, apply: "anchura-def-estrecha" });
    } else if (!back5 && cbAerial <= 11 && !on("anchura-def-amplia")) {
      out.push({ level: "tip", text: `Defensa de cuatro floja por arriba (centrales ${cbAerial.toFixed(1)}): anchura defensiva amplia para que no lleguen centros; exige movilidad y lectura.`, apply: "anchura-def-amplia" });
    } else if (back5 && !on("anchura-def-amplia") && !on("anchura-def-estrecha")) {
      out.push({ level: "tip", text: "Defensa de cinco: anchura defensiva amplia; con superioridad numérica el área está cubierta.", apply: "anchura-def-amplia" });
    }
  }
  if (on("anchura-def-estrecha") && cbAerial != null && cbAerial <= 11) out.push({ level: "warn", text: "Anchura defensiva estrecha con centrales flojos por arriba: te van a llover centros que no ganas.", remove: "anchura-def-estrecha" });

  // ---- Portero: tipo y destino
  const gk = byPos("GK")[0];
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
    const hasTarget = slots.some((s) => role(s).code === "TF");
    const deepPlaymaker = dm.find((s) => ["DLP", "REG", "HB"].includes(role(s).code));
    const fastStrikers = strikers.some((s) => attr(s, "Acc") >= 15 && attr(s, "Pac") >= 15);
    const possession = style === "posesion" || style === "tiki-vertical";
    const hasDest = tactic.instructions.some((i) => INSTRUCTION_BY_ID[i]?.group === "gk-destino");
    if (!hasDest) {
      if (hasTarget && (kic >= 12 || thr >= 12)) out.push({ level: "tip", text: "Tienes un Delantero referencia: distribuir al referencia salta el medio campo y llega al último tercio rápido. Si el rival pone otro cabeceador, deja de funcionar.", apply: "gk-al-referencia" });
      else if (fastStrikers && kic >= 15 && ["transiciones", "bloque-bajo", "directo"].includes(style)) out.push({ level: "tip", text: `Delantero muy rápido y ${gkName} con Saque de puerta ${kic}: distribuir por encima de la defensa castiga líneas altas.`, apply: "gk-por-encima" });
      else if (possession && mean(cbs, ["Pas", "Fir", "Cmp"])! >= 12) out.push({ level: "tip", text: "Estilo de posesión con centrales que saben jugar: distribuir a los defensas.", apply: "gk-a-defensas" });
      else if (deepPlaymaker && attr(deepPlaymaker, "Fir") >= 13 && attr(deepPlaymaker, "Cmp") >= 13) out.push({ level: "tip", text: `${deepPlaymaker.starter!.player.name} es el organizador más retrasado: distribuir al organizador da una salida menos arriesgada (cuidado si le marcan al hombre).`, apply: "gk-al-organizador" });
    }
  }

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
    else out.push({ level: "tip", text: "Sin un perfil claro en delantera ni centradores excelentes: centros mixtos; el jugador elige y el rival no puede prepararse.", apply: "centros-mixtos" });
  }

  // ---- Riesgo de pase: directo/ritmo/pasar al espacio
  if (on("pases-cortos") && on("ritmo-bajo") && on("pasar-espacio")) {
    out.push({ level: "info", text: "Pasar al espacio solo amplifica el riesgo que ya hay: con pases cortos y ritmo bajo apenas tendrá efecto. Sube el ritmo si quieres verticalidad." });
  }
  if (on("pases-directos") && on("ritmo-alto") && on("pasar-espacio") && on("mas-creatividad")) {
    out.push({ level: "info", text: "Directo + ritmo alto + pasar al espacio + creatividad: riesgo de pase máximo. Perderás muchos balones; asegúrate de que la transición defensiva está cubierta." });
  }
  if (on("salir-jugando")) out.push({ level: "info", text: "Salir jugando desde atrás: el medio campo baja a ayudar en la salida; el equipo tarda más en llegar arriba." });
  if (on("trabajar-area") && on("centros-tempranos")) out.push({ level: "warn", text: "Trabajar el balón hasta el área y centros tempranos se contradicen (paciencia vs. centrar cuanto antes).", remove: "centros-tempranos" });
  if (on("tirar-minima") && on("trabajar-area")) out.push({ level: "warn", text: "Tirar a la mínima y trabajar el balón hasta el área se contradicen.", remove: "tirar-minima" });

  // ---- Mentalidad
  const ment = MENTALITY_BY_ID[tactic.mentality ?? "equilibrada"];
  const preset = style ? STYLE_BY_ID[style] : null;
  if (preset && ment && preset.mentalityId !== ment.id) {
    const want = MENTALITY_BY_ID[preset.mentalityId];
    out.push({ level: "info", text: `El estilo ${preset.name} suele jugarse con mentalidad ${want.name.toLowerCase()} (${want.idea}); tienes ${ment.name.toLowerCase()}.` });
  }
  if (ment && ment.level >= 2 && (dlLow || loeLow)) out.push({ level: "info", text: "Mentalidad atacante con líneas bajas: la mentalidad sube líneas, presión y riesgo; las instrucciones tiran en dirección contraria. No es un error, pero que sea a propósito." });
  if (ment && ment.level <= -2 && (dlHigh || loeHigh || on("contrapresionar"))) out.push({ level: "info", text: "Mentalidad defensiva con líneas altas o contrapresión: la mentalidad baja la intensidad y las líneas; el resultado será un término medio." });

  return out;
}
