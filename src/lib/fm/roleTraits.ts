/**
 * Rasgos recomendados y desaconsejados por rol, sacados de los 24 documentos
 * de Conocimiento (docs/Captura de todos los roles/Conocimiento), con los
 * nombres del juego. Van al plan por hueco (qué rasgo enseñar o qué rasgo
 * estorba) y al foco de contratación («Cualidad de jugador: Tiene / No tiene»).
 *
 * Formato de cada rasgo: «id», «id@S» (solo con ese deber), «ej:id» (sale de
 * ejemplos de jugadores, no de una recomendación explícita), «?id» (discutible
 * o traducción probable). «SIDE» se sustituye por el lado del hueco:
 * cuts-inside-SIDE en la banda izquierda es «Recorta hacia dentro desde la
 * banda izquierda».
 */

import type { RoleDef } from "./roles";
import type { PositionSlot } from "./types";

const ROWS: Record<string, { good: string[]; bad?: string[]; note?: string }> = {
  CD: { good: ["refrains-long-shots", "stays-back", "runs-ball-rarely"], bad: ["gets-forward", "runs-ball-often", "plays-way-out"] },
  BPD: { good: ["brings-ball-out", "switches-play", "long-range-passes"], bad: ["?no-through-balls", "plays-short-simple", "runs-ball-rarely"] },
  NCB: { good: ["stays-back", "switches-play", "long-range-passes"], bad: ["gets-forward", "brings-ball-out", "plays-way-out"] },
  WCB: { good: ["brings-ball-out", "dictates-tempo", "gets-forward"], bad: ["stays-back", "runs-ball-rarely", "dwells"] },
  L: { good: ["long-range-passes", "switches-play", "ej:shoots-from-distance"] },
  FB: { good: ["switches-play", "crosses-early", "plays-one-twos"] },
  NFB: { good: ["runs-ball-rarely", "stays-back", "long-range-passes"], bad: ["gets-forward", "knocks-ball-past", "tricks"] },
  IFB: { good: ["stays-back", "switches-play", "?dives-into-tackles"], bad: ["gets-forward", "?runs-ball-SIDE", "stays-on-feet"] },
  CWB: { good: ["arrives-late", "gets-forward", "tricks"] },
  IWB: { good: ["switches-play"] },
  A: { good: ["long-range-passes"], note: "con la instrucción «Pases más directos» añadida" },
  DM: { good: ["plays-one-twos", "tricks", "runs-ball-centre", "shoots-from-distance@S"] },
  HB: { good: ["comes-deep", "ball-into-feet", "stays-back", "brings-ball-out"], bad: ["gets-forward", "plays-way-out", "tricks"] },
  DLP: { good: ["comes-deep", "long-range-passes", "switches-play", "dictates-tempo"], bad: ["gets-forward", "gets-into-box", "runs-ball-often", "shoots-from-distance"] },
  REG: { good: ["killer-balls", "comes-deep", "dictates-tempo", "long-range-passes"] },
  RPM: { good: ["gets-forward", "ej:runs-ball-often"] },
  BWM: { good: ["dives-into-tackles", "plays-short-simple", "?no-through-balls"], bad: ["gets-forward", "runs-ball-centre", "gets-into-box"] },
  SV: { good: ["gets-forward"] },
  CM: { good: ["ej:shoots-with-power", "ej:places-shots", "ej:long-range-passes", "ej:killer-balls", "ej:plays-one-twos", "gets-into-box@A"], note: "rol libre: mandan los rasgos del jugador" },
  CAR: { good: ["switches-play", "long-range-passes"] },
  MEZ: { good: ["killer-balls", "ej:long-range-passes"] },
  WM: { good: ["plays-one-twos", "runs-ball-often", "tricks"], bad: ["stays-back", "dwells"] },
  DW: { good: ["dives-into-tackles", "knocks-ball-past", "runs-ball-often"], bad: ["dwells", "stays-on-feet", "runs-ball-rarely"] },
  WP: { good: ["comes-deep", "cuts-inside-SIDE", "dictates-tempo"], bad: ["hugs-line", "shoots-from-distance", "stays-back"] },
  W: { good: ["hugs-line", "knocks-ball-past", "tricks"], bad: ["dwells", "moves-channels", "runs-ball-rarely"] },
  IW: { good: ["cuts-inside-SIDE", "tricks", "looks-for-pass"], bad: ["dwells", "runs-ball-SIDE", "comes-deep"] },
  IF: { good: ["cuts-inside-SIDE", "runs-ball-often", "ej:knocks-ball-past"] },
  RMD: { good: ["gets-into-box", "gets-forward", "moves-channels"], bad: ["dwells", "hugs-line", "stays-back"] },
  WTF: { good: ["plays-one-twos", "stops-play"], bad: ["ball-into-feet", "comes-deep", "?runs-ball-often"] },
  AP: { good: ["killer-balls", "dictates-tempo", "looks-for-pass", "switches-play"], bad: ["gets-forward", "plays-short-simple", "shoots-from-distance"] },
  EG: { good: ["killer-balls", "switches-play", "stays-inside-area"], bad: ["plays-short-simple", "moves-channels", "gets-forward", "runs-ball-often"] },
  AF: { good: ["beats-offside", "moves-channels"], bad: ["comes-deep", "ball-into-feet", "stays-inside-area"] },
  P: { good: ["beats-offside", "plays-short-simple"], bad: ["plays-with-back", "looks-for-pass", "?runs-ball-often"] },
  TF: { good: ["plays-with-back", "plays-one-twos", "stops-play", "runs-ball-rarely"], bad: ["ball-into-feet", "plays-way-out"] },
  PF: { good: ["dives-into-tackles"] },
};

export interface RoleTraitRef {
  id: string;
  /** Sale de ejemplos de jugadores, no de una recomendación explícita. */
  example: boolean;
  /** Discutible o traducción probable. */
  doubtful: boolean;
}

function parse(token: string, role: RoleDef, slot: PositionSlot): RoleTraitRef | null {
  let t = token;
  const example = t.startsWith("ej:");
  if (example) t = t.slice(3);
  const doubtful = t.startsWith("?");
  if (doubtful) t = t.slice(1);
  const [id, duty] = t.split("@");
  if (duty && duty !== role.duty) return null;
  const side = slot.endsWith("L") ? "left" : slot.endsWith("R") ? "right" : null;
  if (id.includes("SIDE")) {
    if (id === "cuts-inside-SIDE") return { id: side ? `cuts-inside-${side}` : "cuts-inside-both", example, doubtful };
    if (!side) return null;
    return { id: id.replace("SIDE", side), example, doubtful };
  }
  return { id, example, doubtful };
}

/** Rasgos recomendados y desaconsejados por los documentos para el rol en ese hueco. */
export function roleTraits(role: RoleDef, slot: PositionSlot): { good: RoleTraitRef[]; bad: RoleTraitRef[]; note?: string } {
  const row = ROWS[role.code];
  if (!row) return { good: [], bad: [] };
  const map = (list: string[] = []) => list.map((t) => parse(t, role, slot)).filter((x): x is RoleTraitRef => !!x);
  return { good: map(row.good), bad: map(row.bad), note: row.note };
}

/** Códigos de rol con rasgos en los documentos (para las pruebas). */
export const ROLE_TRAIT_CODES = Object.keys(ROWS);
