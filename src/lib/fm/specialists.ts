/**
 * Especialistas de la plantilla: los 36 índices ponderados de la hoja
 * «Funciones» del Excel PandaFM v4.0, en escala 0-20.
 *
 * Cada índice es una media ponderada de atributos (pesos en % del autor del
 * Excel: son su criterio, no datos del motor). Erratas corregidas al pasarlos:
 * - «Aéreo en el área» y «De espaldas» sumaban 15 fijos (+15 en vez de ×15).
 * - «Marcaje» suma 105, «Saque de puerta» dividía por 110 y «Juego aéreo» del
 *   portero no cuadraba: aquí siempre se divide por la suma de los pesos.
 * - «Juego aéreo» sumaba Equilibrio y Fuerza sin peso: se quitan.
 * Los atributos que falten (jugador ojeado a medias) no cuentan; si falta más
 * del 30 % del peso, el índice no se calcula.
 */

import type { AttrKey } from "./attributes";
import type { Player } from "./types";

export type SpecialistGroup = "balon-parado" | "con-balon" | "sin-balon" | "portero" | "instrucciones";

export const SPECIALIST_GROUP_LABEL: Record<SpecialistGroup, string> = {
  "balon-parado": "Balón parado",
  "con-balon": "Con balón",
  "sin-balon": "Sin balón",
  portero: "Portero",
  instrucciones: "Idoneidad para instrucciones",
};

/** Altura (en puntos 1-20) y la tendencia a despejar de puños invertida (20 − Puños). */
type WeightKey = AttrKey | "height" | "punInv";

export interface SpecialistDef {
  id: string;
  es: string;
  group: SpecialistGroup;
  weights: [WeightKey, number][];
  /** Solo porteros (true) o solo jugadores de campo (false). */
  gk: boolean;
  /** Instrucción individual (playerInstructions) o de equipo (instructions) que mide. */
  pi?: string;
  ti?: string[];
}

const d = (id: string, es: string, group: SpecialistGroup, weights: [WeightKey, number][], extra: Partial<SpecialistDef> = {}): SpecialistDef => ({ id, es, group, weights, gk: group === "portero", ...extra });

export const SPECIALISTS: SpecialistDef[] = [
  // Balón parado
  d("corner", "Lanzador de córner", "balon-parado", [["Cor", 35], ["Tec", 20], ["Cro", 20], ["Vis", 15], ["Dec", 10]]),
  d("aerial-threat", "Amenaza aérea", "balon-parado", [["Jum", 18], ["Str", 17], ["Hea", 16], ["height", 14], ["Bra", 13], ["Ant", 12], ["Agg", 10]]),
  d("aerial-box", "Aéreo en el área", "balon-parado", [["height", 15], ["Jum", 15], ["Hea", 15], ["OtB", 15], ["Ant", 15], ["Bra", 10], ["Fin", 5], ["Det", 5], ["Agg", 5]]),
  d("low-box", "Por bajo en el área", "balon-parado", [["Fin", 24], ["OtB", 23], ["Ant", 23], ["Det", 10], ["Agg", 10], ["Bra", 10]]),
  d("def-header", "Cabezazo defensivo", "balon-parado", [["height", 25], ["Jum", 25], ["Ant", 15], ["Hea", 15], ["Pos", 10], ["Str", 10]]),
  d("fk-direct", "Tiro libre directo", "balon-parado", [["Fre", 35], ["Lon", 15], ["Tec", 15], ["Dec", 15], ["Cmp", 15], ["Fin", 5]]),
  d("fk-wide", "Faltas escoradas", "balon-parado", [["Fre", 35], ["Tec", 20], ["Cro", 20], ["Vis", 15], ["Dec", 10]]),
  d("penalties", "Penaltis", "balon-parado", [["Pen", 40], ["Cmp", 30], ["Fin", 15], ["Cnt", 10], ["Tec", 5]]),
  d("long-throw", "Saque de banda largo", "balon-parado", [["L Th", 60], ["Tec", 20], ["Vis", 20]]),
  // Con balón
  d("crosser", "Centrador", "con-balon", [["Cro", 48], ["Tec", 17], ["Ant", 13.5], ["Dec", 11.5], ["Vis", 10]]),
  d("dribbler", "Regateador", "con-balon", [["Dri", 27], ["Agi", 20], ["Acc", 15], ["Tec", 10], ["Bal", 10], ["Dec", 5], ["Fla", 5], ["Pac", 5], ["Ant", 3]]),
  d("finisher", "Definidor", "con-balon", [["Fin", 30], ["Cmp", 20], ["Ant", 20], ["Tec", 15], ["Dec", 10], ["Cnt", 5]]),
  d("press-resistant", "Antipresión", "con-balon", [["Fir", 25], ["Tec", 18], ["Cmp", 18], ["Str", 13], ["Bal", 10], ["Dec", 10], ["Agi", 6]]),
  d("back-to-goal", "De espaldas", "con-balon", [["Str", 15], ["Cmp", 15], ["Dec", 15], ["Vis", 15], ["Pas", 15], ["Ant", 15], ["Tec", 10], ["Bal", 5], ["Fir", 5], ["Tea", 5]]),
  d("passer", "Pases", "con-balon", [["Pas", 33], ["Vis", 23], ["Dec", 13], ["Tec", 13], ["Cmp", 9], ["Ant", 9]]),
  d("long-shots", "Tiros lejanos", "con-balon", [["Lon", 70], ["Tec", 30]]),
  d("creativity", "Creatividad", "con-balon", [["Fla", 36], ["Dec", 16], ["Ant", 16], ["Cmp", 16], ["Vis", 16]]),
  // Sin balón
  d("marking", "Marcaje", "sin-balon", [["Mar", 42], ["Ant", 12], ["Cnt", 10], ["Pos", 9], ["Agi", 8], ["Str", 7], ["Dec", 6], ["Bal", 6], ["Cmp", 5]]),
  d("tackling", "Entradas", "sin-balon", [["Tck", 37], ["Agg", 14], ["Ant", 11], ["Dec", 9], ["Str", 9], ["Bra", 9], ["Bal", 7], ["Cmp", 4]]),
  d("positioning", "Colocación", "sin-balon", [["Tea", 35], ["Pos", 35], ["Ant", 15], ["Dec", 15]]),
  d("concentration", "Concentración", "sin-balon", [["Dec", 30], ["Ant", 30], ["Cnt", 20], ["Cmp", 20]]),
  d("commitment", "Compromiso", "sin-balon", [["Det", 21], ["Wor", 21], ["Bra", 21], ["Agg", 21], ["Tea", 16]]),
  // Portero
  d("gk-aerial", "Juego aéreo", "portero", [["Aer", 25], ["Cmd", 20], ["Han", 15], ["Ant", 10], ["Bra", 10], ["TRO", 10], ["punInv", 7], ["Cnt", 5], ["Pos", 3], ["Agi", 2]]),
  d("gk-kicking", "Saque de puerta", "portero", [["Kic", 50], ["Pas", 15], ["Tec", 13], ["Dec", 12], ["Ant", 10]]),
  d("gk-1v1", "Uno contra uno", "portero", [["1v1", 30], ["Ref", 20], ["Bra", 10], ["Ant", 10], ["Dec", 10], ["TRO", 8], ["Acc", 5], ["Agi", 5], ["Bal", 2]]),
  d("gk-throwing", "Saque con la mano", "portero", [["Thr", 60], ["Dec", 30], ["Str", 10]]),
  // Idoneidad para instrucciones
  d("pi-risky", "Tomar más riesgos", "instrucciones", [["Dec", 33], ["Vis", 28], ["Tec", 18], ["Ant", 13], ["Pas", 8]], { pi: "more-risky-passes" }),
  d("pi-roam", "Variar la posición", "instrucciones", [["Dec", 25], ["Vis", 25], ["Ant", 20], ["OtB", 15], ["Fla", 15]], { pi: "roam" }),
  d("pi-channels", "Moverse entre líneas", "instrucciones", [["Ant", 30], ["Vis", 25], ["Dec", 20], ["OtB", 15], ["Fir", 5], ["Tec", 5]], { pi: "move-into-channels" }),
  d("ti-tempo", "Ritmo alto", "instrucciones", [["Dec", 25], ["Ant", 15], ["Tec", 15], ["Sta", 15], ["Acc", 10], ["Fir", 10], ["Vis", 10]], { ti: ["ritmo-alto", "ritmo-mucho-mas-alto"] }),
  d("ti-box", "Llevar el balón hasta el área", "instrucciones", [["Dec", 35], ["Tec", 25], ["Cmp", 20], ["Pas", 10], ["Vis", 10]], { ti: ["trabajar-area"] }),
  d("ti-expressive", "Ser más expresivos", "instrucciones", [["Fla", 35], ["Tec", 25], ["Vis", 20], ["Dec", 20]], { ti: ["mas-creatividad"] }),
  d("ti-counterpress", "Contrapresión", "instrucciones", [["Agg", 30], ["Dec", 20], ["Ant", 15], ["Sta", 15], ["Acc", 10], ["Bra", 10]], { ti: ["contrapresionar"] }),
  d("ti-high-line", "Línea mucho más alta", "instrucciones", [["Pos", 35], ["Pac", 20], ["Dec", 20], ["Ant", 15], ["Cnt", 10]], { ti: ["linea-def-mucho-mas-alta"] }),
  d("pi-forward", "Subir más", "instrucciones", [["OtB", 30], ["Dec", 25], ["Ant", 20], ["Pac", 15], ["Sta", 10]], { pi: "get-further-forward" }),
  d("ti-counter", "A la contra", "instrucciones", [["Acc", 20], ["Pac", 20], ["Ant", 15], ["Vis", 15], ["Dec", 10], ["Pas", 10], ["Tec", 5], ["Fir", 5]], { ti: ["contraatacar"] }),
];

export const SPECIALIST_BY_ID: Record<string, SpecialistDef> = Object.fromEntries(SPECIALISTS.map((s) => [s.id, s]));

/**
 * Altura en puntos para los índices aéreos (Excel): 160 cm o menos = 1,
 * 180 = 10, 190 = 16, 197 o más = 20; entre medias, lineal.
 */
export function heightPoints(cm: number | null | undefined): number | null {
  if (!cm) return null;
  const pts: [number, number][] = [[160, 1], [180, 10], [190, 16], [197, 20]];
  if (cm <= pts[0][0]) return 1;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (cm <= x1) return y0 + ((cm - x0) * (y1 - y0)) / (x1 - x0);
  }
  return 20;
}

function weightValue(p: Player, k: WeightKey): number | null {
  if (k === "height") return heightPoints(p.height);
  if (k === "punInv") {
    const v = p.attrs.Pun?.value;
    return v == null ? null : 20 - v;
  }
  return p.attrs[k]?.value ?? null;
}

/** Índice 0-20 del jugador, o null si le faltan demasiados atributos o no es de su tipo (portero / campo). */
export function specialistIndex(p: Player, id: string): number | null {
  const def = SPECIALIST_BY_ID[id];
  if (!def || def.gk !== !!p.isGoalkeeper) return null;
  let sum = 0;
  let wSum = 0;
  let wAll = 0;
  for (const [k, w] of def.weights) {
    wAll += w;
    const v = weightValue(p, k);
    if (v == null) continue;
    sum += v * w;
    wSum += w;
  }
  if (!wSum || wSum < wAll * 0.7) return null;
  return sum / wSum;
}

/** Los atributos que más pesan en el índice, con su valor, para explicar la cifra. */
export function specialistBreakdown(p: Player, id: string, n = 3): { label: WeightKey; value: number | null; weight: number }[] {
  const def = SPECIALIST_BY_ID[id];
  if (!def) return [];
  return def.weights.slice().sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, w]) => ({ label: k, value: weightValue(p, k), weight: w }));
}

export interface SpecialistRank {
  def: SpecialistDef;
  top: { player: Player; value: number }[];
}

/** Los mejores de la lista en cada índice. */
export function rankSpecialists(players: Player[], n = 3, group?: SpecialistGroup): SpecialistRank[] {
  return SPECIALISTS.filter((s) => !group || s.group === group).map((def) => ({
    def,
    top: players
      .map((p) => ({ player: p, value: specialistIndex(p, def.id) }))
      .filter((x): x is { player: Player; value: number } => x.value != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, n),
  }));
}

/** Índice que mide una instrucción de equipo, si lo hay. */
export function specialistForTeamInstruction(instructionId: string): SpecialistDef | undefined {
  return SPECIALISTS.find((s) => s.ti?.includes(instructionId));
}
