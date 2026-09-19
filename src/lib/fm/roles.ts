/**
 * Roles y deberes de Football Manager 2024.
 *
 * `key` son los atributos que el juego resalta en verde para el rol (clave) y
 * `pref` los que resalta en azul (preferibles). Las posiciones indican dónde
 * puede seleccionarse ese rol en el creador de tácticas.
 */

import type { AttrKey } from "./attributes";
import type { PositionSlot } from "./types";

export type Duty = "D" | "S" | "A" | "St" | "Co" | "Au";

export const DUTY_LABEL: Record<Duty, string> = {
  D: "Defender",
  S: "Apoyo",
  A: "Ataque",
  St: "Stopper",
  Co: "Cobertura",
  Au: "Automático",
};

export interface RoleDef {
  /** Identificador estable, p.ej. "CD-D". */
  id: string;
  /** Código corto del rol sin deber, p.ej. "CD". */
  code: string;
  en: string;
  es: string;
  duty: Duty;
  positions: PositionSlot[];
  key: AttrKey[];
  pref: AttrKey[];
}

type A = AttrKey[];

interface Family {
  code: string;
  en: string;
  es: string;
  positions: PositionSlot[];
  duties: Partial<Record<Duty, { key: A; pref: A }>>;
}

const GK: PositionSlot[] = ["GK"];
const DC: PositionSlot[] = ["DC"];
const DRL: PositionSlot[] = ["DR", "DL"];
const WB: PositionSlot[] = ["DR", "DL", "WBR", "WBL"];
const DM: PositionSlot[] = ["DM"];
const MC: PositionSlot[] = ["MC"];
const DM_MC: PositionSlot[] = ["DM", "MC"];
const MRL: PositionSlot[] = ["MR", "ML"];
const AMRL: PositionSlot[] = ["AMR", "AML"];
const WIDE: PositionSlot[] = ["MR", "ML", "AMR", "AML"];
const AMC: PositionSlot[] = ["AMC"];
const MC_AMC: PositionSlot[] = ["MC", "AMC"];
const ST: PositionSlot[] = ["ST"];

const FAMILIES: Family[] = [
  // ------------------------------------------------------------- Porteros
  {
    code: "GK", en: "Goalkeeper", es: "Portero", positions: GK,
    duties: {
      D: { key: ["Aer", "Cmd", "Com", "Han", "Kic", "Ref", "Cnt", "Pos", "Agi"], pref: ["1v1", "Thr", "Ant", "Dec"] },
    },
  },
  {
    code: "SK", en: "Sweeper Keeper", es: "Portero líbero", positions: GK,
    duties: {
      D: { key: ["Cmd", "Kic", "1v1", "Ref", "TRO", "Ant", "Cnt", "Pos", "Agi"], pref: ["Aer", "Fir", "Han", "Pas", "Thr", "Cmp", "Dec", "Vis", "Acc"] },
      S: { key: ["Cmd", "Kic", "1v1", "Ref", "TRO", "Ant", "Cnt", "Pos", "Agi"], pref: ["Aer", "Fir", "Han", "Pas", "Thr", "Cmp", "Dec", "Vis", "Acc"] },
      A: { key: ["Cmd", "Kic", "1v1", "Ref", "TRO", "Ant", "Cnt", "Pos", "Agi"], pref: ["Aer", "Fir", "Han", "Pas", "Thr", "Cmp", "Dec", "Vis", "Acc"] },
    },
  },

  // ------------------------------------------------------------- Centrales
  {
    code: "CD", en: "Central Defender", es: "Defensa central", positions: DC,
    duties: {
      D: { key: ["Hea", "Mar", "Tck", "Pos", "Jum", "Str"], pref: ["Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "Pac"] },
      St: { key: ["Hea", "Tck", "Agg", "Bra", "Dec", "Pos", "Jum", "Str"], pref: ["Mar", "Ant", "Cmp", "Cnt"] },
      Co: { key: ["Mar", "Tck", "Ant", "Cnt", "Dec", "Pos", "Pac"], pref: ["Hea", "Bra", "Cmp", "Jum", "Str"] },
    },
  },
  {
    code: "BPD", en: "Ball Playing Defender", es: "Central con salida de balón", positions: DC,
    duties: {
      D: { key: ["Hea", "Mar", "Pas", "Tck", "Cmp", "Pos", "Jum", "Str"], pref: ["Fir", "Tec", "Agg", "Ant", "Bra", "Cnt", "Dec", "Vis", "Pac"] },
      St: { key: ["Hea", "Pas", "Tck", "Agg", "Bra", "Cmp", "Dec", "Pos", "Jum", "Str"], pref: ["Fir", "Mar", "Tec", "Ant", "Cnt", "Vis"] },
      Co: { key: ["Mar", "Pas", "Tck", "Ant", "Cmp", "Cnt", "Dec", "Pos", "Pac"], pref: ["Fir", "Hea", "Tec", "Bra", "Vis", "Jum", "Str"] },
    },
  },
  {
    code: "NCB", en: "No-Nonsense Centre-Back", es: "Central sin florituras", positions: DC,
    duties: {
      D: { key: ["Hea", "Mar", "Tck", "Pos", "Jum", "Str"], pref: ["Agg", "Ant", "Bra", "Cnt", "Pac"] },
      St: { key: ["Hea", "Tck", "Agg", "Bra", "Pos", "Jum", "Str"], pref: ["Mar", "Ant", "Cnt", "Dec"] },
      Co: { key: ["Mar", "Tck", "Ant", "Cnt", "Pos", "Pac"], pref: ["Hea", "Bra", "Dec", "Jum", "Str"] },
    },
  },
  {
    code: "L", en: "Libero", es: "Líbero", positions: DC,
    duties: {
      D: { key: ["Fir", "Hea", "Mar", "Pas", "Tck", "Tec", "Cmp", "Dec", "Pos", "Tea", "Jum", "Str"], pref: ["Ant", "Bra", "Cnt", "Pac", "Sta"] },
      S: { key: ["Fir", "Hea", "Mar", "Pas", "Tck", "Tec", "Cmp", "Dec", "Pos", "Tea", "Jum", "Str"], pref: ["Dri", "Ant", "Bra", "Cnt", "Vis", "Acc", "Pac", "Sta"] },
    },
  },
  {
    code: "WCB", en: "Wide Centre-Back", es: "Central abierto", positions: DC,
    duties: {
      D: { key: ["Hea", "Mar", "Tck", "Pos", "Jum", "Str"], pref: ["Dri", "Fir", "Pas", "Tec", "Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "Wor", "Agi", "Pac"] },
      S: { key: ["Dri", "Hea", "Mar", "Tck", "Pos", "Jum", "Str"], pref: ["Cro", "Fir", "Pas", "Tec", "Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "OtB", "Wor", "Agi", "Pac", "Sta"] },
      A: { key: ["Cro", "Dri", "Hea", "Mar", "Tck", "OtB", "Jum", "Str"], pref: ["Fir", "Pas", "Tec", "Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "Pos", "Wor", "Agi", "Pac", "Sta"] },
    },
  },

  // ------------------------------------------------------------- Laterales / carrileros
  {
    code: "FB", en: "Full-Back", es: "Lateral", positions: DRL,
    duties: {
      // Cabeceo no lo resalta el juego pero importa en laterales (guía Magicomonta)
      D: { key: ["Mar", "Tck", "Ant", "Cnt", "Pos"], pref: ["Cro", "Hea", "Pas", "Dec", "Tea", "Wor", "Pac", "Sta"] },
      S: { key: ["Mar", "Tck", "Ant", "Cnt", "Pos", "Tea"], pref: ["Cro", "Dri", "Hea", "Pas", "Tec", "Dec", "Wor", "Pac", "Sta"] },
      A: { key: ["Cro", "Mar", "Tck", "Ant", "Pos", "Tea"], pref: ["Dri", "Fir", "Hea", "Pas", "Tec", "Cnt", "Dec", "OtB", "Wor", "Agi", "Pac", "Sta"] },
    },
  },
  {
    code: "NFB", en: "No-Nonsense Full-Back", es: "Lateral sin florituras", positions: DRL,
    duties: {
      D: { key: ["Mar", "Tck", "Ant", "Pos", "Str"], pref: ["Hea", "Agg", "Bra", "Cnt", "Tea", "Pac"] },
    },
  },
  {
    code: "IFB", en: "Inverted Full-Back", es: "Lateral invertido", positions: DRL,
    duties: {
      D: { key: ["Hea", "Mar", "Tck", "Pos", "Str"], pref: ["Dri", "Fir", "Pas", "Tec", "Agg", "Ant", "Bra", "Cmp", "Cnt", "Dec", "Wor", "Agi", "Jum", "Pac"] },
    },
  },
  {
    code: "WB", en: "Wing-Back", es: "Carrilero", positions: WB,
    duties: {
      D: { key: ["Mar", "Tck", "Ant", "Pos", "Tea", "Wor", "Acc", "Sta"], pref: ["Cro", "Dri", "Fir", "Hea", "Pas", "Tec", "Cnt", "Dec", "OtB", "Agi", "Bal", "Pac"] },
      S: { key: ["Cro", "Dri", "Mar", "Tck", "OtB", "Tea", "Wor", "Acc", "Sta"], pref: ["Fir", "Pas", "Tec", "Ant", "Cnt", "Dec", "Pos", "Agi", "Bal", "Pac"] },
      A: { key: ["Cro", "Dri", "Tck", "OtB", "Tea", "Wor", "Acc", "Sta"], pref: ["Fir", "Mar", "Pas", "Tec", "Ant", "Cnt", "Dec", "Fla", "Pos", "Agi", "Bal", "Pac"] },
    },
  },
  {
    code: "CWB", en: "Complete Wing-Back", es: "Carrilero completo", positions: WB,
    duties: {
      S: { key: ["Cro", "Dri", "Tec", "OtB", "Tea", "Wor", "Acc", "Sta"], pref: ["Fir", "Mar", "Pas", "Tck", "Ant", "Dec", "Fla", "Pos", "Agi", "Bal", "Pac"] },
      A: { key: ["Cro", "Dri", "Tec", "Fla", "OtB", "Tea", "Wor", "Acc", "Sta"], pref: ["Fir", "Mar", "Pas", "Tck", "Ant", "Dec", "Pos", "Agi", "Bal", "Pac"] },
    },
  },
  {
    code: "IWB", en: "Inverted Wing-Back", es: "Carrilero invertido", positions: WB,
    duties: {
      D: { key: ["Pas", "Tck", "Ant", "Dec", "Pos", "Tea"], pref: ["Fir", "Mar", "Tec", "Cmp", "Cnt", "OtB", "Wor", "Acc", "Agi", "Sta"] },
      S: { key: ["Fir", "Pas", "Tck", "Cmp", "Dec", "Tea"], pref: ["Mar", "Tec", "Ant", "OtB", "Vis", "Wor", "Acc", "Agi", "Sta"] },
      A: { key: ["Fir", "Pas", "Tck", "Cmp", "Dec", "OtB", "Tea", "Vis"], pref: ["Cro", "Dri", "Lon", "Mar", "Tec", "Ant", "Fla", "Wor", "Acc", "Agi", "Pac", "Sta"] },
    },
  },

  // ------------------------------------------------------------- Mediocentro defensivo
  {
    code: "A", en: "Anchor", es: "Ancla", positions: DM,
    duties: {
      D: { key: ["Mar", "Tck", "Ant", "Cnt", "Dec", "Pos"], pref: ["Cmp", "Tea", "Str"] },
    },
  },
  {
    code: "DM", en: "Defensive Midfielder", es: "Mediocentro defensivo", positions: DM,
    duties: {
      D: { key: ["Tck", "Ant", "Cnt", "Pos", "Tea"], pref: ["Mar", "Pas", "Agg", "Cmp", "Dec", "Wor", "Sta", "Str"] },
      S: { key: ["Tck", "Ant", "Cnt", "Pos", "Tea"], pref: ["Fir", "Mar", "Pas", "Agg", "Cmp", "Dec", "Wor", "Sta", "Str"] },
    },
  },
  {
    code: "HB", en: "Half-Back", es: "Mediocentro retrasado", positions: DM,
    duties: {
      D: { key: ["Mar", "Tck", "Ant", "Cmp", "Cnt", "Dec", "Pos", "Tea"], pref: ["Fir", "Pas", "Agg", "Bra", "Wor", "Jum", "Str"] },
    },
  },
  {
    code: "DLP", en: "Deep-Lying Playmaker", es: "Organizador retrasado", positions: DM_MC,
    duties: {
      D: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "Tea", "Vis"], pref: ["Tck", "Ant", "Pos", "Bal"] },
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "Tea", "Vis"], pref: ["Ant", "OtB", "Pos", "Bal"] },
    },
  },
  {
    code: "REG", en: "Regista", es: "Regista", positions: DM,
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "Fla", "OtB", "Tea", "Vis"], pref: ["Dri", "Lon", "Ant", "Bal"] },
    },
  },
  {
    code: "BWM", en: "Ball Winning Midfielder", es: "Recuperador", positions: DM_MC,
    duties: {
      D: { key: ["Tck", "Agg", "Ant", "Tea", "Wor", "Sta"], pref: ["Mar", "Bra", "Cnt", "Pos", "Agi", "Pac", "Str"] },
      S: { key: ["Tck", "Agg", "Ant", "Tea", "Wor", "Sta"], pref: ["Mar", "Bra", "Cnt", "Agi", "Pac", "Str"] },
    },
  },
  {
    code: "RPM", en: "Roaming Playmaker", es: "Organizador itinerante", positions: DM_MC,
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Ant", "Dec", "OtB", "Tea", "Vis", "Wor", "Acc", "Sta"], pref: ["Dri", "Lon", "Cmp", "Cnt", "Pos", "Agi", "Bal", "Pac", "Str"] },
    },
  },
  {
    code: "SV", en: "Segundo Volante", es: "Segundo volante", positions: DM,
    duties: {
      S: { key: ["Mar", "Pas", "Tck", "OtB", "Pos", "Wor", "Pac", "Sta"], pref: ["Fin", "Fir", "Lon", "Ant", "Cmp", "Cnt", "Dec", "Acc", "Bal", "Str"] },
      A: { key: ["Fin", "Lon", "Pas", "Tck", "Ant", "OtB", "Pos", "Wor", "Acc", "Pac", "Sta"], pref: ["Fir", "Mar", "Cmp", "Cnt", "Dec", "Bal", "Str"] },
    },
  },

  // ------------------------------------------------------------- Mediocentro
  {
    code: "CM", en: "Central Midfielder", es: "Centrocampista", positions: MC,
    duties: {
      D: { key: ["Tck", "Cnt", "Dec", "Pos", "Tea"], pref: ["Fir", "Mar", "Pas", "Tec", "Agg", "Ant", "Cmp", "Wor", "Sta"] },
      S: { key: ["Fir", "Pas", "Tck", "Dec", "Tea"], pref: ["Tec", "Ant", "Cmp", "Cnt", "OtB", "Vis", "Wor", "Sta"] },
      A: { key: ["Fir", "Pas", "Dec", "OtB"], pref: ["Lon", "Tck", "Tec", "Ant", "Cmp", "Tea", "Vis", "Wor", "Acc", "Sta"] },
    },
  },
  {
    code: "B2B", en: "Box-to-Box Midfielder", es: "Centrocampista box-to-box", positions: MC,
    duties: {
      S: { key: ["Pas", "Tck", "OtB", "Tea", "Wor", "Sta"], pref: ["Dri", "Fin", "Fir", "Lon", "Tec", "Agg", "Ant", "Cmp", "Dec", "Pos", "Acc", "Bal", "Pac", "Str"] },
    },
  },
  {
    code: "CAR", en: "Carrilero", es: "Carrilero interior", positions: MC,
    duties: {
      S: { key: ["Fir", "Pas", "Tck", "Dec", "Pos", "Tea", "Sta"], pref: ["Tec", "Ant", "Cmp", "Cnt", "OtB", "Vis", "Wor"] },
    },
  },
  {
    code: "MEZ", en: "Mezzala", es: "Mezzala", positions: MC,
    duties: {
      S: { key: ["Pas", "Tec", "Dec", "OtB", "Wor", "Acc"], pref: ["Dri", "Fir", "Lon", "Tck", "Ant", "Cmp", "Vis", "Bal", "Sta"] },
      A: { key: ["Dri", "Pas", "Tec", "Dec", "OtB", "Vis", "Wor", "Acc"], pref: ["Fin", "Fir", "Lon", "Ant", "Cmp", "Fla", "Bal", "Sta"] },
    },
  },
  {
    code: "AP", en: "Advanced Playmaker", es: "Organizador avanzado", positions: [...MC_AMC, ...AMRL],
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Tea", "Vis"], pref: ["Dri", "Ant", "Fla", "Agi"] },
      A: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Tea", "Vis"], pref: ["Dri", "Ant", "Fla", "Agi", "Acc"] },
    },
  },

  // ------------------------------------------------------------- Banda
  {
    code: "W", en: "Winger", es: "Extremo", positions: WIDE,
    duties: {
      S: { key: ["Cro", "Dri", "Tec", "Acc", "Agi", "Pac"], pref: ["Fir", "Pas", "OtB", "Wor", "Bal", "Sta"] },
      A: { key: ["Cro", "Dri", "Tec", "Acc", "Agi", "Pac"], pref: ["Fir", "Pas", "Ant", "Fla", "OtB", "Bal"] },
    },
  },
  {
    code: "IW", en: "Inverted Winger", es: "Extremo invertido", positions: WIDE,
    duties: {
      S: { key: ["Cro", "Dri", "Pas", "Tec", "Acc", "Agi"], pref: ["Fir", "Lon", "Cmp", "Dec", "OtB", "Vis", "Wor", "Bal", "Pac", "Sta"] },
      A: { key: ["Cro", "Dri", "Pas", "Tec", "Acc", "Agi"], pref: ["Fir", "Lon", "Ant", "Cmp", "Dec", "Fla", "OtB", "Vis", "Bal", "Pac"] },
    },
  },
  {
    code: "WP", en: "Wide Playmaker", es: "Organizador de banda", positions: WIDE,
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "Tea", "Vis"], pref: ["Dri", "OtB", "Agi"] },
      A: { key: ["Dri", "Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Tea", "Vis"], pref: ["Ant", "Fla", "Acc", "Agi"] },
    },
  },
  {
    code: "WM", en: "Wide Midfielder", es: "Interior", positions: MRL,
    duties: {
      D: { key: ["Pas", "Tck", "Cnt", "Dec", "Pos", "Tea", "Wor"], pref: ["Cro", "Fir", "Mar", "Tec", "Ant", "Cmp", "Sta"] },
      S: { key: ["Pas", "Tck", "Dec", "Tea", "Wor", "Sta"], pref: ["Cro", "Fir", "Tec", "Ant", "Cmp", "Cnt", "OtB", "Pos", "Vis"] },
      A: { key: ["Cro", "Fir", "Pas", "Dec", "Tea", "Wor", "Sta"], pref: ["Tck", "Tec", "Ant", "Cmp", "OtB", "Vis", "Acc"] },
    },
  },
  {
    code: "DW", en: "Defensive Winger", es: "Extremo defensivo", positions: MRL,
    duties: {
      D: { key: ["Tec", "Ant", "OtB", "Pos", "Tea", "Wor", "Sta"], pref: ["Cro", "Dri", "Fir", "Mar", "Tck", "Agg", "Cnt", "Dec", "Acc"] },
      S: { key: ["Cro", "Tec", "OtB", "Tea", "Wor", "Sta"], pref: ["Dri", "Fir", "Mar", "Pas", "Tck", "Agg", "Ant", "Cnt", "Dec", "Pos", "Acc"] },
    },
  },
  {
    code: "IF", en: "Inside Forward", es: "Delantero interior", positions: AMRL,
    duties: {
      S: { key: ["Dri", "Fin", "Fir", "Tec", "OtB", "Acc", "Agi"], pref: ["Lon", "Pas", "Ant", "Cmp", "Fla", "Vis", "Wor", "Bal", "Pac", "Sta"] },
      A: { key: ["Dri", "Fin", "Fir", "Tec", "Ant", "OtB", "Acc", "Agi"], pref: ["Lon", "Pas", "Cmp", "Fla", "Bal", "Pac", "Sta"] },
    },
  },
  {
    code: "RMD", en: "Raumdeuter", es: "Raumdeuter", positions: AMRL,
    duties: {
      A: { key: ["Fin", "Ant", "Cmp", "Cnt", "Dec", "OtB", "Bal"], pref: ["Fir", "Tec", "Wor", "Acc", "Sta"] },
    },
  },
  {
    code: "WTF", en: "Wide Target Forward", es: "Delantero referencia de banda", positions: AMRL,
    duties: {
      S: { key: ["Hea", "Bra", "Tea", "Jum", "Str"], pref: ["Cro", "Fir", "Ant", "OtB", "Wor", "Bal"] },
      A: { key: ["Hea", "Bra", "OtB", "Jum", "Str"], pref: ["Cro", "Fin", "Fir", "Ant", "Tea", "Wor", "Bal"] },
    },
  },
  {
    code: "TQ", en: "Trequartista", es: "Trequartista", positions: [...AMRL, ...AMC, ...ST],
    duties: {
      A: { key: ["Dri", "Fir", "Pas", "Tec", "Cmp", "Dec", "Fla", "OtB", "Vis", "Acc", "Agi"], pref: ["Fin", "Ant", "Bal"] },
    },
  },

  // ------------------------------------------------------------- Mediapunta
  {
    code: "AM", en: "Attacking Midfielder", es: "Mediapunta", positions: AMC,
    duties: {
      S: { key: ["Fir", "Lon", "Pas", "Tec", "Ant", "Dec", "Fla", "OtB"], pref: ["Dri", "Cmp", "Vis", "Agi"] },
      A: { key: ["Dri", "Fir", "Lon", "Pas", "Tec", "Ant", "Dec", "Fla", "OtB"], pref: ["Fin", "Cmp", "Vis", "Agi"] },
    },
  },
  {
    code: "EG", en: "Enganche", es: "Enganche", positions: AMC,
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "Vis"], pref: ["Dri", "Ant", "Fla", "OtB", "Tea", "Agi"] },
    },
  },
  {
    code: "SS", en: "Shadow Striker", es: "Segundo delantero", positions: AMC,
    duties: {
      A: { key: ["Dri", "Fin", "Fir", "Ant", "Cmp", "OtB", "Acc"], pref: ["Pas", "Tec", "Cnt", "Dec", "Wor", "Agi", "Bal", "Pac", "Sta"] },
    },
  },

  // ------------------------------------------------------------- Delanteros
  {
    code: "AF", en: "Advanced Forward", es: "Delantero avanzado", positions: ST,
    duties: {
      A: { key: ["Dri", "Fin", "Fir", "Tec", "Cmp", "OtB", "Acc"], pref: ["Pas", "Ant", "Dec", "Wor", "Agi", "Bal", "Pac", "Sta"] },
    },
  },
  {
    code: "P", en: "Poacher", es: "Cazagoles", positions: ST,
    duties: {
      A: { key: ["Fin", "Ant", "Cmp", "OtB"], pref: ["Fir", "Hea", "Tec", "Dec", "Acc"] },
    },
  },
  {
    code: "CF", en: "Complete Forward", es: "Delantero completo", positions: ST,
    duties: {
      S: { key: ["Dri", "Fir", "Hea", "Lon", "Pas", "Tec", "Ant", "Cmp", "Dec", "OtB", "Vis", "Acc", "Agi", "Str"], pref: ["Fin", "Tea", "Wor", "Bal", "Jum", "Pac", "Sta"] },
      A: { key: ["Dri", "Fin", "Fir", "Hea", "Tec", "Ant", "Cmp", "OtB", "Acc", "Agi", "Str"], pref: ["Lon", "Pas", "Dec", "Tea", "Vis", "Wor", "Bal", "Jum", "Pac", "Sta"] },
    },
  },
  {
    code: "DLF", en: "Deep-Lying Forward", es: "Delantero retrasado", positions: ST,
    duties: {
      S: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Tea"], pref: ["Fin", "Ant", "Fla", "Vis", "Bal", "Str"] },
      A: { key: ["Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Tea"], pref: ["Dri", "Fin", "Ant", "Fla", "Vis", "Bal", "Str"] },
    },
  },
  {
    code: "PF", en: "Pressing Forward", es: "Delantero presionante", positions: ST,
    duties: {
      D: { key: ["Agg", "Ant", "Bra", "Dec", "Tea", "Wor", "Acc", "Pac", "Sta"], pref: ["Fir", "Cmp", "Cnt", "Agi", "Bal", "Str"] },
      S: { key: ["Agg", "Ant", "Bra", "Dec", "Tea", "Wor", "Acc", "Pac", "Sta"], pref: ["Fir", "Pas", "Cmp", "Cnt", "OtB", "Agi", "Bal", "Str"] },
      A: { key: ["Fin", "Agg", "Ant", "Bra", "Dec", "OtB", "Tea", "Wor", "Acc", "Pac", "Sta"], pref: ["Fir", "Cmp", "Cnt", "Agi", "Bal", "Str"] },
    },
  },
  {
    code: "TF", en: "Target Forward", es: "Delantero referencia", positions: ST,
    duties: {
      S: { key: ["Hea", "Bra", "Tea", "Bal", "Jum", "Str"], pref: ["Fin", "Fir", "Agg", "Ant", "Cmp", "Dec", "OtB"] },
      A: { key: ["Fin", "Hea", "Bra", "Cmp", "OtB", "Bal", "Jum", "Str"], pref: ["Fir", "Agg", "Ant", "Dec", "Tea"] },
    },
  },
  {
    code: "F9", en: "False Nine", es: "Falso nueve", positions: ST,
    duties: {
      S: { key: ["Dri", "Fir", "Pas", "Tec", "Cmp", "Dec", "OtB", "Vis", "Acc", "Agi"], pref: ["Fin", "Ant", "Fla", "Tea", "Bal"] },
    },
  },
];

export const ROLES: RoleDef[] = FAMILIES.flatMap((f) =>
  (Object.entries(f.duties) as [Duty, { key: A; pref: A }][]).map(([duty, d]) => ({
    id: `${f.code}-${duty}`,
    code: f.code,
    en: f.en,
    es: f.es,
    duty,
    positions: f.positions,
    key: d.key,
    pref: d.pref,
  })),
);

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.id, r]));

export function roleLabel(r: RoleDef, lang: "es" | "en" = "es"): string {
  return `${lang === "es" ? r.es : r.en} (${DUTY_LABEL[r.duty]})`;
}

export function rolesForPosition(slot: PositionSlot): RoleDef[] {
  return ROLES.filter((r) => r.positions.includes(slot));
}

export const POSITION_LABEL: Record<PositionSlot, string> = {
  GK: "POR",
  DR: "DF (D)", DC: "DF (C)", DL: "DF (I)",
  WBR: "CAR (D)", WBL: "CAR (I)",
  DM: "MCD",
  MR: "M (D)", MC: "MC", ML: "M (I)",
  AMR: "MP (D)", AMC: "MP (C)", AML: "MP (I)",
  ST: "DL",
};

export const POSITION_ORDER: PositionSlot[] = ["GK", "DR", "DC", "DL", "WBR", "WBL", "DM", "MR", "MC", "ML", "AMR", "AMC", "AML", "ST"];
