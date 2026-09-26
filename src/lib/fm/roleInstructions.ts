/**
 * Instrucciones de serie de cada rol en FM24, sacadas de las capturas del panel
 * de instrucciones del juego (docs/Captura de todos los roles).
 *
 * - `part`: instrucciones que el rol ya trae («parte del rol», verde lima).
 * - `blocked`: instrucciones que el juego no deja poner con ese rol (rojo).
 * - `mentality`: índice en MENTALITIES con la mentalidad de equipo con la que
 *   se hicieron las capturas; sube o baja con la del equipo.
 * - `press`: la barra de presión que ya trae el rol.
 *
 * Algunos roles cambian según la posición: la clave lleva entonces «@» y el
 * grupo de posición (M, MC, MCD, MPB = mediapunta de banda, MPC, DL).
 * Generado con scratchpad/gen_role_instr.py a partir de roles/instr.md.
 */

import type { PositionSlot } from "./types";

export const MENTALITIES = ["Muy defensiva", "Defensiva", "Cauta", "Equilibrada", "Positiva", "Ofensiva", "Muy ofensiva"] as const;

/** Presión que trae el rol: «Más insistente», barra llena, por debajo o a la mitad. */
export type RolePress = "mas" | "llena" | "baja" | "mitad";

export interface RoleDefaults {
  mentality: number;
  press?: RolePress;
  part: string[];
  blocked: string[];
  note?: string;
}

type Row = [mentality: number, part: string, blocked: string, press?: RolePress | null, note?: string];

// Instrucciones como ids de playerInstructions.ts separados por espacios; «cross-aim-*» = todas las de «Centrar hacia».
const ROWS: Record<string, Row> = {
  "A-D": [2, "hold-position dribble-less shoot-less fewer-risky-passes", "get-further-forward dribble-more shoot-more more-risky-passes"],
  "AF-A": [6, "move-into-channels", "hold-up-ball hold-position"],
  "AM-A": [6, "get-further-forward", "hold-position"],
  "AM-S": [6, "", ""],
  "AP-A@MC": [6, "dribble-more shoot-less more-risky-passes", "dribble-less shoot-more fewer-risky-passes"],
  "AP-A@MPB": [6, "cut-inside dribble-more shoot-less more-risky-passes cross-less", "run-wide dribble-less shoot-more fewer-risky-passes cross-more"],
  "AP-A@MPC": [6, "dribble-more shoot-less more-risky-passes", "dribble-less shoot-more fewer-risky-passes"],
  "AP-S@MC": [4, "shoot-less more-risky-passes", "get-further-forward shoot-more fewer-risky-passes"],
  "AP-S@MPB": [6, "cut-inside shoot-less more-risky-passes cross-less", "get-further-forward run-wide shoot-more fewer-risky-passes cross-more"],
  "AP-S@MPC": [6, "shoot-less more-risky-passes", "get-further-forward shoot-more fewer-risky-passes"],
  "B2B-S": [4, "roam", "hold-position"],
  "BPD-Co": [2, "more-risky-passes", "fewer-risky-passes", "baja"],
  "BPD-D": [2, "hold-position more-risky-passes", "fewer-risky-passes"],
  "BPD-St": [3, "more-risky-passes", "fewer-risky-passes"],
  "BWM-D@MC": [2, "tackle-harder hold-position dribble-less shoot-less fewer-risky-passes", "ease-off-tackles get-further-forward roam dribble-more shoot-more more-risky-passes", "llena"],
  "BWM-D@MCD": [2, "tackle-harder hold-position dribble-less shoot-less fewer-risky-passes", "ease-off-tackles get-further-forward dribble-more shoot-more more-risky-passes", "llena"],
  "BWM-S@MC": [4, "tackle-harder", "ease-off-tackles get-further-forward roam", "llena"],
  "BWM-S@MCD": [4, "tackle-harder", "ease-off-tackles get-further-forward", "llena"],
  "CAR-S": [4, "stay-wider", "hold-position roam dribble-more dribble-less"],
  "CD-Co": [2, "dribble-less shoot-less", "dribble-more shoot-more", "baja"],
  "CD-D": [2, "hold-position dribble-less shoot-less", "dribble-more shoot-more"],
  "CD-St": [3, "dribble-less shoot-less", "dribble-more shoot-more", null, "se adelanta a presionar"],
  "CF-A": [6, "hold-up-ball move-into-channels roam dribble-more more-risky-passes", "hold-position dribble-less fewer-risky-passes"],
  "CF-S": [5, "hold-up-ball move-into-channels roam dribble-more more-risky-passes", "hold-position dribble-less fewer-risky-passes"],
  "CM-A": [6, "get-further-forward", "hold-position"],
  "CM-D": [2, "hold-position", "get-further-forward move-into-channels roam dribble-more", "baja"],
  "CM-S": [4, "", ""],
  "CWB-A": [5, "get-further-forward stay-wider roam cross-from-byline", "sit-narrower hold-position cross-from-deep"],
  "CWB-S": [4, "get-further-forward stay-wider roam", "sit-narrower hold-position cross-from-deep"],
  "DLF-A": [6, "hold-up-ball move-into-channels more-risky-passes", "hold-position fewer-risky-passes"],
  "DLF-S": [5, "hold-up-ball move-into-channels more-risky-passes", "fewer-risky-passes"],
  "DLP-D": [2, "hold-position dribble-less shoot-less", "get-further-forward roam dribble-more shoot-more fewer-risky-passes"],
  "DLP-D@MCD": [2, "hold-position dribble-less shoot-less", "get-further-forward dribble-more shoot-more fewer-risky-passes"],
  "DLP-S": [4, "hold-position shoot-less more-risky-passes", "get-further-forward roam shoot-more fewer-risky-passes"],
  "DLP-S@MCD": [4, "hold-position shoot-less more-risky-passes", "get-further-forward roam shoot-more fewer-risky-passes"],
  "DM-D": [2, "hold-position dribble-less shoot-less", "get-further-forward dribble-more shoot-more", "llena"],
  "DM-S": [4, "", ""],
  "DW-D": [2, "tackle-harder hold-position cross-from-deep fewer-risky-passes", "tight-marking ease-off-tackles get-further-forward roam dribble-more more-risky-passes cross-from-byline", "mas"],
  "DW-S": [6, "tackle-harder stay-wider dribble-more cross-more", "tight-marking ease-off-tackles sit-narrower dribble-less cross-less", "mas"],
  "EG-S": [6, "hold-position dribble-less more-risky-passes", "move-into-channels roam hold-up-ball dribble-more fewer-risky-passes"],
  "F9-S": [5, "dribble-more more-risky-passes", "hold-up-ball hold-position dribble-less fewer-risky-passes"],
  "FB-A": [5, "get-further-forward cross-more", "hold-position cross-from-deep cross-less"],
  "FB-D": [2, "hold-position fewer-risky-passes cross-from-deep", "get-further-forward dribble-more more-risky-passes cross-from-byline"],
  "FB-S": [4, "", ""],
  "GK-D": [2, "pass-shorter", "dribble-more dribble-less"],
  "HB-D": [2, "hold-position dribble-less", "get-further-forward dribble-more"],
  "IF-A": [6, "get-further-forward cut-inside dribble-more more-risky-passes cross-less", "hold-position run-wide dribble-less fewer-risky-passes cross-from-deep cross-from-byline cross-more"],
  "IF-S": [6, "get-further-forward cut-inside dribble-more more-risky-passes cross-less", "hold-position run-wide dribble-less fewer-risky-passes cross-from-deep cross-from-byline cross-more"],
  "IFB-D": [2, "sit-narrower hold-position", "get-further-forward stay-wider dribble-more"],
  "IW-A@M": [6, "get-further-forward cut-inside dribble-more", "hold-position run-wide dribble-less cross-from-byline"],
  "IW-A@MPB": [6, "get-further-forward cut-inside dribble-more", "hold-position run-wide dribble-less cross-from-byline"],
  "IW-S@M": [6, "cut-inside dribble-more", "run-wide dribble-less cross-from-byline"],
  "IW-S@MPB": [6, "cut-inside dribble-more", "run-wide dribble-less cross-from-byline"],
  "IWB-A": [5, "get-further-forward sit-narrower cut-inside roam dribble-more more-risky-passes cross-less", "stay-wider run-wide hold-position dribble-less fewer-risky-passes cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "IWB-D": [2, "sit-narrower cut-inside hold-position dribble-less cross-less", "get-further-forward stay-wider run-wide roam dribble-more more-risky-passes cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "IWB-S": [4, "sit-narrower cut-inside roam cross-less", "stay-wider run-wide hold-position cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "L-D": [2, "hold-position", ""],
  "L-S": [4, "", "", null, "sube al centro del campo con la posesión asegurada"],
  "MEZ-A": [6, "get-further-forward stay-wider move-into-channels roam more-risky-passes", "hold-position fewer-risky-passes"],
  "MEZ-S": [4, "get-further-forward stay-wider move-into-channels roam", "hold-position"],
  "NCB-Co": [2, "dribble-less shoot-less fewer-risky-passes more-direct-passes", "ease-off-tackles dribble-more shoot-more more-risky-passes", "baja"],
  "NCB-D": [2, "hold-position dribble-less shoot-less fewer-risky-passes more-direct-passes", "ease-off-tackles dribble-more shoot-more more-risky-passes"],
  "NCB-St": [3, "dribble-less shoot-less fewer-risky-passes more-direct-passes", "ease-off-tackles dribble-more shoot-more more-risky-passes"],
  "NFB-D": [2, "hold-position dribble-less shoot-less fewer-risky-passes cross-less more-direct-passes", "get-further-forward dribble-more shoot-more more-risky-passes cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "P-A": [6, "dribble-less fewer-risky-passes", "hold-up-ball hold-position dribble-more shoot-less more-risky-passes"],
  "PF-A": [6, "tackle-harder move-into-channels", "tight-marking ease-off-tackles hold-up-ball hold-position", "mas"],
  "PF-D": [2, "tackle-harder hold-up-ball hold-position shoot-less fewer-risky-passes", "tight-marking ease-off-tackles move-into-channels roam dribble-more shoot-more more-risky-passes", "mas"],
  "PF-S": [5, "tackle-harder hold-up-ball", "tight-marking ease-off-tackles dribble-more more-risky-passes", "mas"],
  "REG-S": [4, "roam more-risky-passes", "hold-position fewer-risky-passes"],
  "RMD-A": [6, "get-further-forward sit-narrower move-into-channels roam cross-less pass-shorter", "stay-wider run-wide cut-inside hold-position cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "RPM-S@MC": [4, "roam more-risky-passes", "get-further-forward stay-wider hold-position fewer-risky-passes"],
  "RPM-S@MCD": [4, "roam more-risky-passes", "get-further-forward stay-wider hold-position fewer-risky-passes cross-more"],
  "SK-A": [6, "more-risky-passes dribble-more pass-shorter", "fewer-risky-passes dribble-less"],
  "SK-D": [2, "pass-shorter", "dribble-more dribble-less"],
  "SK-S": [4, "more-risky-passes pass-shorter", "fewer-risky-passes dribble-more dribble-less"],
  "SS-A": [6, "get-further-forward move-into-channels dribble-more more-risky-passes", "hold-up-ball hold-position dribble-less fewer-risky-passes"],
  "SV-A": [6, "get-further-forward", "stay-wider hold-position"],
  "SV-S": [4, "", "stay-wider hold-position"],
  "TF-A": [6, "hold-up-ball dribble-less", "dribble-more hold-position"],
  "TF-S": [5, "hold-up-ball dribble-less", "dribble-more"],
  "TQ-A@DL": [6, "ease-off-tackles move-into-channels roam dribble-more more-risky-passes", "tackle-harder get-further-forward hold-position dribble-less fewer-risky-passes", "mitad"],
  "TQ-A@MPB": [6, "ease-off-tackles roam dribble-more more-risky-passes", "tackle-harder get-further-forward hold-position dribble-less fewer-risky-passes", "mitad"],
  "TQ-A@MPC": [6, "ease-off-tackles move-into-channels roam dribble-more more-risky-passes", "tackle-harder get-further-forward hold-position dribble-less fewer-risky-passes", "mitad"],
  "W-A@M": [6, "get-further-forward stay-wider dribble-more cross-from-byline cross-more", "sit-narrower hold-position dribble-less more-risky-passes cross-from-deep cross-less"],
  "W-A@MPB": [6, "get-further-forward stay-wider dribble-more cross-from-byline cross-more", "sit-narrower hold-position hold-up-ball dribble-less more-risky-passes cross-from-deep cross-less"],
  "W-S@M": [6, "stay-wider dribble-more cross-more", "sit-narrower dribble-less cross-less"],
  "W-S@MPB": [6, "stay-wider dribble-more cross-more", "sit-narrower hold-up-ball dribble-less cross-less"],
  "WB-A": [5, "get-further-forward cross-from-byline", "hold-position cross-from-deep"],
  "WB-D": [2, "hold-position cross-from-deep fewer-risky-passes", "get-further-forward dribble-more more-risky-passes cross-from-byline"],
  "WB-S": [4, "get-further-forward", "hold-position"],
  "WCB-A": [5, "stay-wider dribble-more cross-from-byline cross-more", "dribble-less cross-from-deep cross-less"],
  "WCB-D": [2, "stay-wider hold-position cross-from-deep", "dribble-more cross-from-byline"],
  "WCB-S": [4, "stay-wider", ""],
  "WM-A": [6, "get-further-forward", "hold-position"],
  "WM-D": [2, "hold-position dribble-less fewer-risky-passes cross-from-deep", "get-further-forward roam dribble-more more-risky-passes cross-from-byline"],
  "WM-S": [6, "", ""],
  "WP-A@M": [6, "sit-narrower cut-inside roam dribble-more shoot-less more-risky-passes cross-less", "stay-wider run-wide hold-position dribble-less shoot-more fewer-risky-passes cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "WP-S@M": [6, "sit-narrower cut-inside roam shoot-less more-risky-passes cross-less", "get-further-forward stay-wider run-wide hold-position shoot-more fewer-risky-passes cross-from-deep cross-from-byline cross-more cross-aim-*"],
  "WTF-A": [6, "get-further-forward hold-up-ball dribble-less", "dribble-more"],
  "WTF-S": [6, "hold-up-ball hold-position dribble-less", "roam dribble-more"],
};

const CROSS_AIM = ["cross-aim-target", "cross-aim-far", "cross-aim-near", "cross-aim-centre"];
const ids = (s: string) => s.split(" ").filter(Boolean).flatMap((x) => (x === "cross-aim-*" ? CROSS_AIM : [x]));

/** Grupo de posición con el que el juego distingue las instrucciones de un mismo rol. */
export function rolePosGroup(slot: PositionSlot): string {
  switch (slot) {
    case "MR": case "ML": return "M";
    case "AMR": case "AML": return "MPB";
    case "AMC": return "MPC";
    case "DM": return "MCD";
    case "MC": return "MC";
    case "ST": return "DL";
    default: return "";
  }
}

/** Instrucciones de serie del rol en esa posición (o las generales del rol si no cambian). */
export function roleDefaults(roleId: string, slot?: PositionSlot): RoleDefaults | null {
  const row = (slot && ROWS[`${roleId}@${rolePosGroup(slot)}`]) || ROWS[roleId] || Object.entries(ROWS).find(([k]) => k.startsWith(`${roleId}@`))?.[1];
  if (!row) return null;
  const [mentality, part, blocked, press, note] = row;
  return { mentality, part: ids(part), blocked: ids(blocked), ...(press ? { press } : {}), ...(note ? { note } : {}) };
}

export const PRESS_LABEL: Record<RolePress, string> = {
  mas: "Presión: más insistente",
  llena: "Presión: barra llena",
  baja: "Presión: por debajo de lo normal",
  mitad: "Presión: a la mitad",
};
