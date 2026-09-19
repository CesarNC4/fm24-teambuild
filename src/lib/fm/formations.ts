/**
 * Formaciones de Football Manager 2024.
 *
 * Cada hueco tiene una posición (estrato + lado), coordenadas para dibujarlo
 * (x: 0 izquierda … 100 derecha; y: 0 portería propia … 100 delantera) y un
 * rol por defecto razonable. El usuario puede cambiar cualquier rol.
 */

import type { PositionSlot } from "./types";

export interface FormationSlot {
  /** Identificador estable dentro de la formación, p.ej. "DCL". */
  id: string;
  slot: PositionSlot;
  x: number;
  y: number;
  defaultRole: string;
}

export interface Formation {
  id: string;
  name: string;
  slots: FormationSlot[];
}

// Coordenadas por estrato (y) y carril (x)
const Y = { GK: 4, D: 20, WB: 32, DM: 40, M: 55, AM: 71, ST: 88 } as const;
const X = { L: 12, LC: 32, C: 50, RC: 68, R: 88, LL: 20, RR: 80 } as const;

const gk = (role = "SK-S"): FormationSlot => ({ id: "GK", slot: "GK", x: X.C, y: Y.GK, defaultRole: role });
const back4 = (dl = "WB-S", dcl = "BPD-D", dcr = "CD-D", dr = "WB-S"): FormationSlot[] => [
  { id: "DL", slot: "DL", x: X.L, y: Y.D, defaultRole: dl },
  { id: "DCL", slot: "DC", x: X.LC, y: Y.D, defaultRole: dcl },
  { id: "DCR", slot: "DC", x: X.RC, y: Y.D, defaultRole: dcr },
  { id: "DR", slot: "DR", x: X.R, y: Y.D, defaultRole: dr },
];
const back3 = (l = "BPD-D", c = "CD-D", r = "CD-D"): FormationSlot[] => [
  { id: "DCL", slot: "DC", x: X.LL, y: Y.D, defaultRole: l },
  { id: "DC", slot: "DC", x: X.C, y: Y.D, defaultRole: c },
  { id: "DCR", slot: "DC", x: X.RR, y: Y.D, defaultRole: r },
];
const wingbacks = (l = "WB-S", r = "WB-S"): FormationSlot[] => [
  { id: "WBL", slot: "WBL", x: X.L, y: Y.WB, defaultRole: l },
  { id: "WBR", slot: "WBR", x: X.R, y: Y.WB, defaultRole: r },
];
const st = (role = "AF-A"): FormationSlot => ({ id: "ST", slot: "ST", x: X.C, y: Y.ST, defaultRole: role });
const st2 = (l = "DLF-S", r = "AF-A"): FormationSlot[] => [
  { id: "STL", slot: "ST", x: X.LC, y: Y.ST, defaultRole: l },
  { id: "STR", slot: "ST", x: X.RC, y: Y.ST, defaultRole: r },
];

export const FORMATIONS: Formation[] = [
  {
    id: "4-2-3-1-dm",
    name: "4-2-3-1 (doble pivote MCD)",
    slots: [
      gk(),
      ...back4(),
      { id: "DML", slot: "DM", x: X.LC, y: Y.DM, defaultRole: "DLP-S" },
      { id: "DMR", slot: "DM", x: X.RC, y: Y.DM, defaultRole: "DM-D" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-A" },
      { id: "AMC", slot: "AMC", x: X.C, y: Y.AM, defaultRole: "AM-S" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "IW-S" },
      st(),
    ],
  },
  {
    id: "4-2-3-1-mc",
    name: "4-2-3-1 (doble pivote MC)",
    slots: [
      gk(),
      ...back4(),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "BWM-D" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-A" },
      { id: "AMC", slot: "AMC", x: X.C, y: Y.AM, defaultRole: "AM-S" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "IW-S" },
      st(),
    ],
  },
  {
    id: "4-3-3-dm",
    name: "4-3-3 (MCD)",
    slots: [
      gk(),
      ...back4("FB-S", "BPD-D", "CD-D", "FB-S"),
      { id: "DM", slot: "DM", x: X.C, y: Y.DM, defaultRole: "DLP-D" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "MEZ-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "B2B-S" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-A" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "W-S" },
      st("PF-A"),
    ],
  },
  {
    id: "4-3-3-flat",
    name: "4-3-3 (tres MC)",
    slots: [
      gk(),
      ...back4("FB-S", "BPD-D", "CD-D", "FB-S"),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CM-S" },
      { id: "MC", slot: "MC", x: X.C, y: Y.M, defaultRole: "DLP-D" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "CM-A" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-A" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "W-S" },
      st(),
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: [
      gk("GK-D"),
      ...back4("FB-S", "CD-D", "CD-D", "FB-S"),
      { id: "ML", slot: "ML", x: X.L, y: Y.M, defaultRole: "W-S" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CM-D" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "B2B-S" },
      { id: "MR", slot: "MR", x: X.R, y: Y.M, defaultRole: "W-A" },
      ...st2("TF-S", "PF-A"),
    ],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    slots: [
      gk(),
      ...back4("FB-S", "CD-D", "BPD-D", "FB-S"),
      { id: "DM", slot: "DM", x: X.C, y: Y.DM, defaultRole: "DM-D" },
      { id: "ML", slot: "ML", x: X.L, y: Y.M, defaultRole: "IW-S" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CM-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "MEZ-A" },
      { id: "MR", slot: "MR", x: X.R, y: Y.M, defaultRole: "W-S" },
      st("PF-A"),
    ],
  },
  {
    id: "4-4-1-1",
    name: "4-4-1-1",
    slots: [
      gk(),
      ...back4("FB-S", "CD-D", "CD-D", "FB-S"),
      { id: "ML", slot: "ML", x: X.L, y: Y.M, defaultRole: "W-S" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "BWM-D" },
      { id: "MR", slot: "MR", x: X.R, y: Y.M, defaultRole: "W-A" },
      { id: "AMC", slot: "AMC", x: X.C, y: Y.AM, defaultRole: "SS-A" },
      st("DLF-S"),
    ],
  },
  {
    id: "4-1-2-1-2",
    name: "4-1-2-1-2 (rombo)",
    slots: [
      gk(),
      ...back4("FB-A", "CD-D", "CD-D", "FB-A"),
      { id: "DM", slot: "DM", x: X.C, y: Y.DM, defaultRole: "DM-D" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CAR-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "B2B-S" },
      { id: "AMC", slot: "AMC", x: X.C, y: Y.AM, defaultRole: "AP-S" },
      ...st2("DLF-S", "AF-A"),
    ],
  },
  {
    id: "4-2-2-2",
    name: "4-2-2-2",
    slots: [
      gk(),
      ...back4(),
      { id: "DML", slot: "DM", x: X.LC, y: Y.DM, defaultRole: "DLP-S" },
      { id: "DMR", slot: "DM", x: X.RC, y: Y.DM, defaultRole: "BWM-D" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-S" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "IW-S" },
      ...st2("DLF-S", "AF-A"),
    ],
  },
  {
    id: "4-3-1-2",
    name: "4-3-1-2",
    slots: [
      gk(),
      ...back4("FB-A", "CD-D", "BPD-D", "FB-A"),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CM-S" },
      { id: "MC", slot: "MC", x: X.C, y: Y.M, defaultRole: "DLP-D" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "B2B-S" },
      { id: "AMC", slot: "AMC", x: X.C, y: Y.AM, defaultRole: "AM-A" },
      ...st2("DLF-S", "AF-A"),
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2 (carrileros)",
    slots: [
      gk(),
      ...back3(),
      ...wingbacks(),
      { id: "DM", slot: "DM", x: X.C, y: Y.DM, defaultRole: "DM-D" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "MEZ-A" },
      ...st2("DLF-S", "AF-A"),
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    slots: [
      gk(),
      ...back3(),
      ...wingbacks("WB-A", "WB-A"),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "BWM-D" },
      { id: "AML", slot: "AML", x: X.LC, y: Y.AM, defaultRole: "IF-S" },
      { id: "AMR", slot: "AMR", x: X.RC, y: Y.AM, defaultRole: "IF-A" },
      st("PF-A"),
    ],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    slots: [
      gk(),
      ...back3(),
      ...wingbacks("WB-S", "WB-A"),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "CM-S" },
      { id: "AMCL", slot: "AMC", x: X.LC, y: Y.AM, defaultRole: "SS-A" },
      { id: "AMCR", slot: "AMC", x: X.RC, y: Y.AM, defaultRole: "AP-S" },
      st("PF-A"),
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    slots: [
      gk("GK-D"),
      { id: "DL", slot: "DL", x: X.L, y: Y.D, defaultRole: "WB-S" },
      ...back3("CD-D", "CD-D", "CD-D"),
      { id: "DR", slot: "DR", x: X.R, y: Y.D, defaultRole: "WB-S" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "CM-S" },
      { id: "MC", slot: "MC", x: X.C, y: Y.M, defaultRole: "DLP-D" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "B2B-S" },
      ...st2("DLF-S", "PF-A"),
    ],
  },
  {
    id: "5-2-3",
    name: "5-2-3",
    slots: [
      gk(),
      { id: "DL", slot: "DL", x: X.L, y: Y.D, defaultRole: "CWB-S" },
      ...back3("CD-D", "CD-D", "CD-D"),
      { id: "DR", slot: "DR", x: X.R, y: Y.D, defaultRole: "CWB-S" },
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "BWM-D" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "IF-A" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "IW-S" },
      st("PF-A"),
    ],
  },
  {
    id: "4-2-4",
    name: "4-2-4",
    slots: [
      gk(),
      ...back4("FB-S", "CD-D", "CD-D", "FB-S"),
      { id: "MCL", slot: "MC", x: X.LC, y: Y.M, defaultRole: "DLP-S" },
      { id: "MCR", slot: "MC", x: X.RC, y: Y.M, defaultRole: "BWM-D" },
      { id: "AML", slot: "AML", x: X.L, y: Y.AM, defaultRole: "W-S" },
      { id: "AMR", slot: "AMR", x: X.R, y: Y.AM, defaultRole: "IW-A" },
      ...st2("DLF-S", "AF-A"),
    ],
  },
];

export const FORMATION_BY_ID: Record<string, Formation> = Object.fromEntries(FORMATIONS.map((f) => [f.id, f]));
