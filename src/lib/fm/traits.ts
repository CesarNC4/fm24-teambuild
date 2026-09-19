/**
 * Rasgos de jugador de Football Manager 2024 (61 rasgos).
 *
 * Para cada rasgo: atributos orientativos para que valga la pena enseñarlo
 * (los principales según el juego), rasgos incompatibles (el juego no permite
 * tenerlos a la vez) y en qué roles ayuda o estorba. La compatibilidad por rol
 * se expresa con patrones sobre el id del rol: "CD-*" = cualquier deber del
 * central; "*-A" = cualquier rol en ataque; "*-*" = todos.
 *
 * Fuente de nombres, incompatibilidades y atributos: guía de Passion4FM
 * (https://www.passion4fm.com/football-manager-player-traits/) y el juego.
 */

import type { AttrKey } from "./attributes";
import type { RoleDef } from "./roles";

export type TraitCategory = "movimiento" | "pase" | "tiro" | "defensa" | "tecnica" | "portero" | "personalidad";

export interface TraitDef {
  id: string;
  es: string;
  en: string;
  category: TraitCategory;
  /** Atributos mínimos orientativos. */
  needs: Partial<Record<AttrKey, number>>;
  /** Solo tiene sentido si el atributo es BAJO (p.ej. "Evita tiros lejanos" con Tiros lejanos ≤ 11). */
  needsBelow?: Partial<Record<AttrKey, number>>;
  /** Instrucciones individuales que el rasgo ya cubre (darlas es redundante). */
  similarPI?: string[];
  /** Instrucciones individuales que el rasgo contradice. */
  contrastPI?: string[];
  conflicts: string[];
  good: string[];
  bad: string[];
  /** Disponible para porteros. */
  gk?: boolean;
  /** Solo porteros. */
  gkOnly?: boolean;
  /** No se puede enseñar (solo por tutoría / personalidad). */
  mentoringOnly?: boolean;
}

type In = Pick<TraitDef, "id" | "es" | "en" | "category"> & Partial<TraitDef>;
const T = (t: In): TraitDef => ({ needs: {}, conflicts: [], good: [], bad: [], ...t });

// Grupos de roles reutilizados en los patrones
const CENTRALES = ["CD-*", "BPD-*", "NCB-*", "WCB-D"];
const CONTENCION = ["A-D", "DM-D", "HB-D", "DLP-D", "CM-D", "BWM-D"];
const LATERALES_DEF = ["FB-D", "NFB-D", "IFB-D", "WB-D", "IWB-D"];
const LATERALES_ATQ = ["FB-A", "WB-A", "CWB-*", "IWB-A", "WCB-A"];
const EXTREMOS_ANCHOS = ["W-*", "WM-*", "DW-*", "WTF-*"];
const EXTREMOS_INTERIORES = ["IF-*", "IW-*", "RMD-A"];
const ORGANIZADORES = ["DLP-*", "AP-*", "RPM-S", "REG-S", "WP-*", "EG-S"];
const REMATADORES = ["P-A", "AF-A", "PF-A", "CF-A", "TF-A", "SS-A", "IF-A", "RMD-A"];
const REFERENCIAS = ["TF-*", "WTF-*", "DLF-*", "CF-S"];

export const TRAITS: TraitDef[] = [
  // ============================================================= Movimiento
  T({ id: "gets-forward", es: "Se incorpora al ataque siempre que puede", en: "Gets Forward Whenever Possible", category: "movimiento",
    needs: { OtB: 12, Dec: 11, Sta: 12 },
    conflicts: ["comes-deep", "stays-back"], similarPI: ["get-further-forward"], contrastPI: ["hold-position"],
    good: [...LATERALES_ATQ, "B2B-S", "MEZ-*", "CM-A", "SV-*", "RPM-S", "AP-A", "WM-A", "L-S"],
    bad: [...CENTRALES, ...CONTENCION, ...LATERALES_DEF] }),
  T({ id: "stays-back", es: "Se queda atrás en todo momento", en: "Stays Back At All Times", category: "movimiento",
    needs: { Pos: 12, Ant: 11 },
    conflicts: ["gets-forward", "gets-into-box", "moves-channels", "arrives-late"], similarPI: ["hold-position"], contrastPI: ["get-further-forward", "roam"],
    good: [...CONTENCION, ...CENTRALES, ...LATERALES_DEF],
    bad: ["*-A", "B2B-S", "MEZ-*", "SV-*", "RPM-S", "CWB-*", "L-S", "WB-S", "FB-S"] }),
  T({ id: "comes-deep", es: "Retrocede para recibir el balón", en: "Comes Deep To Get Ball", category: "movimiento",
    needs: { Tea: 11, Fir: 12, OtB: 11 },
    conflicts: ["gets-forward", "gets-into-box", "moves-channels", "arrives-late", "beats-offside"],
    good: ["DLF-*", "F9-S", "CF-S", "TQ-A", "DLP-*", "REG-S", "EG-S", "AP-S", "WP-S", "HB-D"],
    bad: [...REMATADORES, "W-A", "IW-A"], contrastPI: ["get-further-forward"] }),
  T({ id: "runs-ball-left", es: "Conduce el balón por la banda izquierda", en: "Runs With Ball Down Left", category: "movimiento",
    needs: { Acc: 12, Pac: 12, Agi: 12, Dri: 12 },
    conflicts: ["runs-ball-rarely", "runs-ball-centre", "runs-ball-right"], similarPI: ["dribble-more", "run-wide"], contrastPI: ["dribble-less", "cut-inside"],
    good: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, ...LATERALES_ATQ],
    bad: [...CENTRALES, ...CONTENCION, ...REFERENCIAS, "P-A"] }),
  T({ id: "runs-ball-right", es: "Conduce el balón por la banda derecha", en: "Runs With Ball Down Right", category: "movimiento",
    needs: { Acc: 12, Pac: 12, Agi: 12, Dri: 12 },
    conflicts: ["runs-ball-rarely", "runs-ball-centre", "runs-ball-left"], similarPI: ["dribble-more", "run-wide"], contrastPI: ["dribble-less", "cut-inside"],
    good: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, ...LATERALES_ATQ],
    bad: [...CENTRALES, ...CONTENCION, ...REFERENCIAS, "P-A"] }),
  T({ id: "runs-ball-centre", es: "Conduce el balón por el centro", en: "Runs With Ball Through Centre", category: "movimiento",
    needs: { Dri: 13, Bal: 12, Tec: 12 },
    conflicts: ["runs-ball-rarely", "runs-ball-left", "runs-ball-right"], similarPI: ["dribble-more"], contrastPI: ["dribble-less", "run-wide"],
    good: ["AM-A", "SS-A", "MEZ-A", "AP-A", "TQ-A", "IF-A", "RPM-S", "B2B-S", "CM-A", "F9-S"],
    bad: [...CENTRALES, ...CONTENCION, ...REFERENCIAS, "P-A", ...EXTREMOS_ANCHOS] }),
  T({ id: "runs-ball-often", es: "Conduce el balón con frecuencia", en: "Runs With Ball Often", category: "movimiento",
    needs: { Dri: 13, Agi: 12, Bal: 11 },
    conflicts: ["runs-ball-rarely"], similarPI: ["dribble-more"], contrastPI: ["dribble-less"],
    good: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, ...LATERALES_ATQ, "MEZ-A", "AM-A", "SS-A", "AF-A", "CF-*", "TQ-A", "RPM-S"],
    bad: [...CENTRALES, ...CONTENCION, ...REFERENCIAS, "P-A", "NFB-D"] }),
  T({ id: "runs-ball-rarely", es: "Conduce el balón pocas veces", en: "Runs With Ball Rarely", category: "movimiento",
    needs: { Pas: 12 }, needsBelow: { Dri: 12 },
    conflicts: ["runs-ball-often", "runs-ball-left", "runs-ball-right", "runs-ball-centre", "plays-way-out"], similarPI: ["dribble-less"], contrastPI: ["dribble-more", "run-wide", "cut-inside"],
    good: [...CENTRALES, ...CONTENCION, "DLP-*", "REG-S", "EG-S", "TF-*", "P-A", "NFB-D"],
    bad: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, ...LATERALES_ATQ, "MEZ-A", "TQ-A", "AF-A"] }),
  T({ id: "hugs-line", es: "Se pega a la banda", en: "Hugs Line", category: "movimiento",
    needs: { Dri: 11, OtB: 12, Pac: 12 },
    conflicts: ["gets-into-box"], similarPI: ["stay-wider"], contrastPI: ["sit-narrower", "cut-inside"],
    good: [...EXTREMOS_ANCHOS, "CWB-*", "WB-A", "WB-S"],
    bad: [...EXTREMOS_INTERIORES, "AP-*", "WP-*", "TQ-A", "IWB-*"] }),
  T({ id: "cuts-inside-right", es: "Se mete hacia dentro desde la derecha", en: "Cuts Inside From Right Wing", category: "movimiento",
    needs: { Acc: 12, Agi: 12, Dri: 12 },
    conflicts: ["cuts-inside-both", "cuts-inside-left"], similarPI: ["cut-inside"], contrastPI: ["run-wide"],
    good: [...EXTREMOS_INTERIORES, "IWB-*"],
    bad: [...EXTREMOS_ANCHOS, "CWB-*", "WB-*", "FB-*"] }),
  T({ id: "cuts-inside-left", es: "Se mete hacia dentro desde la izquierda", en: "Cuts Inside From Left Wing", category: "movimiento",
    needs: { Acc: 12, Agi: 12, Dri: 12 },
    conflicts: ["cuts-inside-both", "cuts-inside-right"], similarPI: ["cut-inside"], contrastPI: ["run-wide"],
    good: [...EXTREMOS_INTERIORES, "IWB-*"],
    bad: [...EXTREMOS_ANCHOS, "CWB-*", "WB-*", "FB-*"] }),
  T({ id: "cuts-inside-both", es: "Se mete hacia dentro desde ambas bandas", en: "Cuts Inside From Both Wings", category: "movimiento",
    needs: { Acc: 12, Agi: 12, Dri: 12 },
    conflicts: ["cuts-inside-left", "cuts-inside-right", "avoids-weaker-foot"],
    good: [...EXTREMOS_INTERIORES, "IWB-*", "AP-A", "WP-*", "TQ-A"],
    bad: [...EXTREMOS_ANCHOS, "CWB-*", "WB-*", "FB-*"], similarPI: ["cut-inside"], contrastPI: ["run-wide"] }),
  T({ id: "gets-into-box", es: "Se mete en el área rival siempre que puede", en: "Gets Into Opposition Area", category: "movimiento",
    needs: { Acc: 12, Fin: 12, OtB: 12 },
    conflicts: ["hugs-line", "stays-back", "arrives-late", "comes-deep"], similarPI: ["get-further-forward"], contrastPI: ["hold-position"],
    good: ["SS-A", "AM-A", "IF-A", "RMD-A", "MEZ-A", "CM-A", "W-A", "IW-A", "CWB-A", "WB-A", "SV-A"],
    bad: ["*-D", ...ORGANIZADORES, "DLF-*", "F9-S", ...CENTRALES] }),
  T({ id: "arrives-late", es: "Llega tarde al área rival", en: "Arrives Late In Opponent's Area", category: "movimiento",
    needs: { OtB: 12, Cmp: 12, Vis: 11 },
    conflicts: ["gets-into-box", "stays-back", "comes-deep"],
    good: ["B2B-S", "CM-A", "MEZ-A", "SV-A", "AM-A", "AP-*", "RPM-S", "CM-S", "DLP-S", "DLF-S", "F9-S"],
    bad: ["*-D", ...REMATADORES, "TF-*", "WTF-*"], contrastPI: ["get-further-forward"] }),
  T({ id: "beats-offside", es: "Intenta romper el fuera de juego", en: "Likes To Try To Beat Offside Trap", category: "movimiento",
    needs: { Ant: 12, Agi: 11, Acc: 13, OtB: 12 },
    conflicts: ["plays-with-back", "comes-deep", "stays-inside-area"], similarPI: ["get-further-forward"],
    good: ["AF-A", "P-A", "PF-A", "SS-A", "IF-A", "RMD-A", "CF-A"],
    bad: ["DLF-*", "F9-S", "TF-*", "CF-S", "TQ-A", "*-D"] }),
  T({ id: "plays-with-back", es: "Juega de espaldas a la portería", en: "Plays With Back To Goal", category: "movimiento",
    needs: { Fir: 12, Ant: 11, Str: 13, Bal: 11 },
    conflicts: ["beats-offside"], similarPI: ["hold-up-ball"], contrastPI: ["get-further-forward"],
    good: [...REFERENCIAS],
    bad: ["AF-A", "P-A", "PF-A", "SS-A", ...EXTREMOS_INTERIORES, "F9-S"] }),
  T({ id: "stays-inside-area", es: "Se queda dentro del área (no busca los espacios)", en: "Does Not Move Into Channels", category: "movimiento",
    needs: { Hea: 12, Jum: 12, Pos: 11 },
    conflicts: ["beats-offside", "moves-channels"], contrastPI: ["move-into-channels", "roam"],
    good: ["P-A", "TF-*", "WTF-*"],
    bad: ["AF-A", "PF-*", "CF-*", "DLF-*", "F9-S", "TQ-A", ...EXTREMOS_INTERIORES] }),
  T({ id: "moves-channels", es: "Busca los espacios entre líneas", en: "Moves Into Channels", category: "movimiento",
    needs: { OtB: 12, Fla: 11, Vis: 11, Acc: 12 },
    conflicts: ["stays-back", "stays-inside-area", "comes-deep"],
    good: ["AF-A", "PF-*", "CF-*", "DLF-*", "SS-A", "IF-*", "F9-S", "MEZ-A", "TQ-A", "P-A", "AM-*", "RMD-A"],
    bad: ["TF-*", "WTF-*", ...EXTREMOS_ANCHOS, "*-D"], similarPI: ["move-into-channels"], contrastPI: ["hold-position"] }),
  T({ id: "plays-one-twos", es: "Hace paredes", en: "Plays One-Twos", category: "movimiento",
    needs: { Fir: 12, Pas: 12, Tec: 12, Vis: 11, OtB: 11 },
    good: ["AP-*", "AM-*", "SS-A", "DLF-*", "F9-S", "CF-*", "MEZ-*", ...EXTREMOS_INTERIORES, "CWB-*", "WB-A", "B2B-S", "CM-*", "IWB-A"],
    bad: ["TF-*", "NCB-*", "NFB-D", "A-D"], similarPI: ["pass-shorter"], contrastPI: ["more-direct-passes"] }),
  T({ id: "knocks-ball-past", es: "Lanza el balón por delante del rival", en: "Knocks Ball Past Opponent", category: "movimiento",
    needs: { Acc: 14, Pac: 14, Agi: 12 },
    good: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, "AF-A", "PF-A", "CWB-*", "WB-A"],
    bad: [...REFERENCIAS, ...ORGANIZADORES, ...CENTRALES, ...CONTENCION], similarPI: ["dribble-more"], contrastPI: ["dribble-less"] }),

  // ============================================================= Pase
  T({ id: "killer-balls", es: "Intenta pases en profundidad a menudo", en: "Tries Killer Balls Often", category: "pase",
    needs: { Pas: 13, Vis: 13, Ant: 11 },
    conflicts: ["plays-short-simple", "no-through-balls"], similarPI: ["more-risky-passes"], contrastPI: ["fewer-risky-passes"],
    good: [...ORGANIZADORES, "TQ-A", "AM-*", "MEZ-*", "IW-*", "DLF-*", "F9-S", "IWB-A", "CM-A"],
    bad: ["BWM-*", "A-D", "HB-D", ...CENTRALES, "NFB-D", "TF-*", "P-A", ...EXTREMOS_ANCHOS] }),
  T({ id: "no-through-balls", es: "No intenta pases en profundidad", en: "Plays No Through Balls", category: "pase",
    needs: { Pas: 10, Tea: 11 }, needsBelow: { Vis: 12 },
    conflicts: ["killer-balls"], similarPI: ["fewer-risky-passes"], contrastPI: ["more-risky-passes"],
    good: [...CENTRALES, "A-D", "HB-D", "BWM-*", "NFB-D", "CM-D"],
    bad: [...ORGANIZADORES, "TQ-A", "AM-*", "MEZ-*", "DLF-*", "F9-S"] }),
  T({ id: "long-range-passes", es: "Intenta pases largos", en: "Tries Long Range Passes", category: "pase",
    needs: { Pas: 14, Tec: 12, Vis: 12 },
    conflicts: ["plays-short-simple"], similarPI: ["more-direct-passes"], contrastPI: ["pass-shorter"],
    good: ["DLP-*", "REG-S", "BPD-*", "L-*", "HB-D", "WP-*", "RPM-S", "IWB-*"],
    bad: ["BWM-*", "NCB-*", "P-A", "AF-A", "CAR-S", ...EXTREMOS_ANCHOS] }),
  T({ id: "plays-short-simple", es: "Da pases cortos y sencillos", en: "Plays Short Simple Passes", category: "pase",
    needs: { Pas: 11, Tea: 12, Cmp: 11 },
    conflicts: ["long-range-passes", "killer-balls", "switches-play"], similarPI: ["pass-shorter", "fewer-risky-passes"], contrastPI: ["more-direct-passes", "more-risky-passes"],
    good: ["A-D", "DM-*", "CM-D", "CAR-S", "BWM-*", "HB-D", "NCB-*", "FB-D", "WB-D", "NFB-D"],
    bad: [...ORGANIZADORES, "TQ-A", "AM-*"] }),
  T({ id: "stops-play", es: "Ralentiza el juego de vez en cuando", en: "Stops Play", category: "pase",
    needs: { Ant: 12, Fir: 12, Str: 11, Cmp: 12 },
    good: ["DLP-*", "REG-S", "EG-S", "AP-S", "TQ-A", "DLF-S", "TF-S", "CF-S"],
    bad: [...EXTREMOS_ANCHOS, ...EXTREMOS_INTERIORES, "AF-A", "PF-*", "BWM-*", "B2B-S", "CWB-*", "SS-A"], similarPI: ["hold-up-ball"] }),
  T({ id: "dwells", es: "Se entretiene con el balón", en: "Dwells On Ball", category: "pase", mentoringOnly: true,
    needs: { Ant: 12, Cmp: 12 }, contrastPI: ["hold-up-ball"],
    good: [],
    bad: ["*-*"] }),
  T({ id: "looks-for-pass", es: "Prefiere pasar antes que tirar", en: "Looks For Pass Rather Than Attempting To Score", category: "pase",
    needs: { Pas: 12, Dec: 12, Vis: 12 },
    needsBelow: { Fin: 12 },
    conflicts: ["shoots-from-distance", "first-time-shots"],
    good: [...ORGANIZADORES, "DLF-S", "F9-S", "TQ-A", "CF-S", "CM-S", "B2B-S", "IF-S", "IW-S", "AM-S"],
    bad: [...REMATADORES, "AM-A", "MEZ-A", "SV-A", "W-A", "IW-A"], similarPI: ["shoot-less"], contrastPI: ["shoot-more"] }),
  T({ id: "dictates-tempo", es: "Marca el ritmo", en: "Dictates Tempo", category: "pase",
    needs: { Tea: 12, Pas: 13, Vis: 12, Dec: 12 },
    good: ["DLP-*", "REG-S", "AP-S", "RPM-S", "CM-S", "DM-S", "HB-D", "CAR-S"],
    bad: ["BWM-*", "A-D", "P-A", "AF-A", "PF-*", ...EXTREMOS_ANCHOS, "SS-A", "B2B-S"] }),
  T({ id: "switches-play", es: "Cambia el juego de banda", en: "Likes To Switch Ball To Other Flank", category: "pase",
    needs: { Pas: 13, Vis: 13, Tec: 11 },
    conflicts: ["plays-short-simple"], similarPI: ["more-direct-passes"],
    good: ["DLP-*", "REG-S", "AP-*", "WP-*", "RPM-S", "BPD-*", "L-*", "IWB-*", "WM-*"],
    bad: ["BWM-*", "NCB-*", "P-A", "TF-*", "AF-A"] }),
  T({ id: "ball-into-feet", es: "Le gusta recibir el balón al pie", en: "Likes Ball Played Into Feet", category: "pase",
    needs: { Fir: 13, Tec: 12 }, needsBelow: { Acc: 13 },
    good: ["DLF-*", "F9-S", "TQ-A", "CF-S", "AP-*", "EG-S", "AM-S", "TF-S", "IF-S", "W-S"],
    bad: ["AF-A", "P-A", "PF-A", "RMD-A", "SS-A", "IF-A", ...EXTREMOS_ANCHOS] }),

  // ============================================================= Tiro
  T({ id: "shoots-from-distance", es: "Tira desde lejos", en: "Shoots From Distance", category: "tiro",
    needs: { Lon: 14, Fin: 11, Tec: 12 },
    conflicts: ["looks-for-pass", "refrains-long-shots"],
    good: ["AM-A", "SS-A", "AP-*", "MEZ-A", "CM-A", "SV-A", "IF-*", "IW-*", "B2B-S", "REG-S", "DLP-S", "RPM-S", "TQ-A", "DM-S"],
    bad: ["P-A", ...REFERENCIAS, "F9-S", ...CENTRALES, ...LATERALES_DEF, "WB-*", ...CONTENCION], similarPI: ["shoot-more"], contrastPI: ["shoot-less"] }),
  T({ id: "refrains-long-shots", es: "Evita los tiros lejanos", en: "Refrains From Taking Long Shots", category: "tiro",
    needs: { Tea: 11, Pas: 11 }, needsBelow: { Lon: 12 },
    conflicts: ["shoots-from-distance", "long-range-free-kicks", "free-kicks-power"], similarPI: ["shoot-less"], contrastPI: ["shoot-more"],
    good: ["P-A", ...REFERENCIAS, "F9-S", "AP-S", "EG-S", "DLP-*", "CM-D", "CAR-S", "BWM-*", "FB-*", "WB-*", ...CENTRALES],
    bad: ["AM-A", "SS-A", "MEZ-A", "SV-A", "CM-A", "IW-A"] }),
  T({ id: "lobs-keeper", es: "Le gusta hacer vaselinas", en: "Tries To Lob The Keeper", category: "tiro",
    needs: { Fin: 13, Tec: 13, Vis: 12, Cmp: 12 },
    good: ["AF-A", "P-A", "SS-A", "IF-A", "CF-*", "F9-S", "TQ-A", "PF-A"],
    bad: ["TF-*", ...CENTRALES, ...CONTENCION] }),
  T({ id: "rounds-keeper", es: "Le gusta regatear al portero", en: "Likes To Round Keeper", category: "tiro",
    needs: { Dri: 13, Tec: 12, Dec: 12, Fla: 11 },
    good: ["AF-A", "SS-A", "IF-A", "CF-A", "F9-S", "TQ-A", "PF-A"],
    bad: ["TF-*", "P-A", ...CENTRALES, ...CONTENCION] }),
  T({ id: "shoots-with-power", es: "Tira con potencia", en: "Shoots With Power", category: "tiro",
    needs: { Fin: 12, Lon: 13, Tec: 11, Str: 12 },
    conflicts: ["places-shots"],
    good: ["TF-A", "AF-A", "PF-A", "SV-A", "B2B-S", "MEZ-A", "AM-A", "CF-A"],
    bad: ["P-A", "F9-S", "DLF-S", "AP-*", "EG-S"] }),
  T({ id: "places-shots", es: "Coloca el tiro", en: "Places Shots", category: "tiro",
    needs: { Fin: 13, Tec: 12, Cmp: 13 },
    conflicts: ["shoots-with-power"],
    good: ["P-A", "AF-A", "CF-*", "IF-*", "SS-A", "AM-A", "F9-S", "DLF-A", "PF-A", "RMD-A", "TQ-A", "IW-A"],
    bad: ["TF-*", ...CENTRALES, "A-D"] }),
  T({ id: "first-time-shots", es: "Tira a la primera", en: "Attempts First Time Shots", category: "tiro",
    needs: { Fin: 13, Cmp: 12, Tec: 12, Ant: 12 },
    conflicts: ["looks-for-pass"], similarPI: ["shoot-more"], contrastPI: ["shoot-less"],
    good: ["P-A", "AF-A", "SS-A", "RMD-A", "IF-A", "PF-A", "CF-A", "TF-A"],
    bad: ["DLF-*", "F9-S", "TQ-A", ...ORGANIZADORES, "TF-S", ...CENTRALES] }),
  T({ id: "overhead-kicks", es: "Intenta chilenas", en: "Attempts Overhead Kicks", category: "tiro",
    needs: { Fla: 14, Agi: 13, Fin: 12, Tec: 12 },
    good: ["P-A", "AF-A", "CF-*", "TF-A", "RMD-A"],
    bad: [...CENTRALES, ...CONTENCION, ...ORGANIZADORES] }),
  T({ id: "free-kicks-power", es: "Tira las faltas con potencia", en: "Hits Free Kicks With Power", category: "tiro",
    needs: { Fre: 13, Str: 12, Lon: 12 },
    conflicts: ["refrains-long-shots"], good: [], bad: [] }),
  T({ id: "long-range-free-kicks", es: "Intenta faltas desde lejos", en: "Tries Long Range Free Kicks", category: "tiro", gk: true,
    needs: { Fre: 14, Lon: 13 },
    conflicts: ["refrains-long-shots"], good: [], bad: [] }),

  // ============================================================= Defensa
  T({ id: "dives-into-tackles", es: "Se lanza a las entradas", en: "Dives Into Tackles", category: "defensa",
    needs: { Tck: 13, Str: 11, Agg: 12, Bra: 12 },
    conflicts: ["stays-on-feet"],
    good: ["BWM-*", "PF-*", "DW-*"],
    bad: [...CENTRALES, "L-*", "A-D", "HB-D", "DLP-*", "IWB-*", "FB-D"], similarPI: ["tackle-harder"], contrastPI: ["ease-off-tackles"] }),
  T({ id: "stays-on-feet", es: "No se lanza a las entradas", en: "Does Not Dive Into Tackles", category: "defensa",
    needs: { Ant: 12, Pos: 13, Cnt: 11 },
    conflicts: ["dives-into-tackles"],
    similarPI: ["ease-off-tackles"], contrastPI: ["tackle-harder"],
    good: ["CD-Co", "CD-D", "BPD-*", "L-*", "A-D", "HB-D", "DLP-*", "DM-*", "FB-*", "IWB-*", "WB-D", "NCB-Co"],
    bad: ["BWM-*", "CD-St", "NCB-St", "PF-*"] }),
  T({ id: "marks-tightly", es: "Marca de cerca a los rivales", en: "Marks Opponent Tightly", category: "defensa",
    needs: { Mar: 13, Ant: 12, Str: 11, Cnt: 11 },
    good: ["CD-D", "CD-St", "NCB-*", "BPD-D", "BPD-St", "A-D", "DM-D", "FB-D", "NFB-D", "WB-D", "BWM-*", "HB-D"],
    bad: ["CD-Co", "BPD-Co", "NCB-Co", "L-*", "DLP-*", "REG-S", "IWB-*"], similarPI: ["tight-marking"] }),

  // ============================================================= Técnica
  T({ id: "brings-ball-out", es: "Sube con el balón desde la defensa", en: "Brings Ball Out Of Defence", category: "tecnica",
    needs: { Dri: 12, Ant: 11, Tec: 12, Cmp: 12 },
    good: ["BPD-*", "L-*", "WCB-S", "WCB-A", "IWB-*", "HB-D", "DLP-D"],
    bad: ["NCB-*", "NFB-D", "CD-St"] }),
  T({ id: "plays-way-out", es: "Intenta salir jugando de situaciones comprometidas", en: "Tries To Play Way Out Of Trouble", category: "tecnica", mentoringOnly: true,
    needs: { Tec: 13, Dri: 12, Pas: 12, Cmp: 13, Dec: 12 },
    conflicts: ["runs-ball-rarely"],
    good: ["BPD-*", "L-*", "DLP-*", "REG-S", "AP-*", "RPM-S", "IWB-*", "WCB-*"],
    bad: ["NCB-*", "NFB-D", "CD-St", "BWM-*", "TF-*"] }),
  T({ id: "tricks", es: "Intenta trucos", en: "Tries Tricks", category: "tecnica",
    needs: { Fla: 14, Tec: 13, Dri: 13 },
    good: ["W-A", "IW-A", "IF-A", "TQ-A", "AM-A", "AP-A", "F9-S", "CF-*", "RMD-A"],
    bad: [...CENTRALES, ...CONTENCION, "DM-*", "BWM-*", "FB-D", "NFB-D", "TF-*", "P-A"] }),
  T({ id: "curls-ball", es: "Da efecto al balón", en: "Curls Ball", category: "tecnica", mentoringOnly: true,
    needs: { Tec: 14 },
    good: [...EXTREMOS_INTERIORES, "AM-*", "SS-A", "AF-A", "W-*", "TQ-A", "WP-*", "AP-*"],
    bad: ["TF-*", "NCB-*", ...CONTENCION] }),
  T({ id: "outside-foot", es: "Usa el exterior del pie", en: "Uses Outside Of Foot", category: "tecnica",
    needs: { Tec: 14, Fla: 13 },
    good: [...ORGANIZADORES, "TQ-A", ...EXTREMOS_INTERIORES, "MEZ-*", "AM-*", "F9-S"],
    bad: ["NCB-*", "NFB-D", "BWM-*"] }),
  T({ id: "beats-man-repeatedly", es: "Le gusta regatear repetidamente", en: "Likes To Beat Man Repeatedly", category: "tecnica",
    needs: { Dri: 14, Agi: 13, Tec: 12, Bal: 12 },
    good: ["W-A", "IW-A"],
    bad: [...CENTRALES, ...CONTENCION, ...ORGANIZADORES, ...REFERENCIAS, "P-A", "*-D", "AP-*"] }),
  T({ id: "ball-to-right-foot", es: "Se pasa el balón a la pierna derecha antes de regatear", en: "Moves Ball To Right Foot Before Dribble Attempt", category: "tecnica",
    needs: { Dri: 12, Agi: 12 },
    conflicts: ["ball-to-left-foot"],
    good: ["IW-*", "IF-*"], bad: [] }),
  T({ id: "ball-to-left-foot", es: "Se pasa el balón a la pierna izquierda antes de regatear", en: "Moves Ball To Left Foot Before Dribble Attempt", category: "tecnica",
    needs: { Dri: 12, Agi: 12 },
    conflicts: ["ball-to-right-foot"],
    good: ["IW-*", "IF-*"], bad: [] }),
  T({ id: "develop-weaker-foot", es: "Intenta mejorar la pierna mala", en: "Attempts To Develop Weaker Foot", category: "tecnica", gk: true,
    conflicts: ["avoids-weaker-foot"], good: ["*-*"], bad: [] }),
  T({ id: "avoids-weaker-foot", es: "Evita usar la pierna mala", en: "Avoids Using Weaker Foot", category: "tecnica", gk: true,
    conflicts: ["develop-weaker-foot", "cuts-inside-both"], good: [], bad: [] }),
  T({ id: "long-flat-throw", es: "Saque de banda largo y raso", en: "Possesses Long Flat Throw", category: "tecnica",
    needs: { "L Th": 14, Str: 12 },
    good: ["FB-*", "WB-*", "CWB-*", "IWB-*", "NFB-D", "IFB-D"], bad: [] }),

  // ============================================================= Portero
  T({ id: "gk-long-throws", es: "Usa saques de mano largos para iniciar contraataques", en: "Uses Long Throws To Start Counter Attacks", category: "portero", gk: true, gkOnly: true,
    needs: { Thr: 13, Str: 11 },
    good: ["SK-*", "GK-D"], bad: [] }),

  // ============================================================= Personalidad (solo por tutoría)
  T({ id: "gets-crowd", es: "Anima al público", en: "Gets Crowd Going", category: "personalidad", gk: true, mentoringOnly: true, good: [], bad: [] }),
  T({ id: "argues", es: "Discute con los árbitros", en: "Argues With Officials", category: "personalidad", gk: true, mentoringOnly: true, good: [], bad: ["*-*"] }),
  T({ id: "winds-up", es: "Provoca a los rivales", en: "Winds Up Opponents", category: "personalidad", gk: true, mentoringOnly: true, good: [], bad: ["*-*"] }),
];

export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export const TRAIT_CATEGORY_LABEL: Record<TraitCategory, string> = {
  movimiento: "Movimiento",
  pase: "Pase",
  tiro: "Tiro",
  defensa: "Defensa",
  tecnica: "Técnica",
  portero: "Portero",
  personalidad: "Personalidad",
};

export function traitsAvailableFor(isGk: boolean): TraitDef[] {
  return TRAITS.filter((t) => (isGk ? !!t.gk : !t.gkOnly));
}

// ---------------------------------------------------------------------------
// Evaluación
// ---------------------------------------------------------------------------

function matches(pattern: string, role: RoleDef): boolean {
  const [code, duty] = pattern.split("-");
  return (code === "*" || code === role.code) && (duty === "*" || duty === role.duty);
}

export type TraitVerdict = "recomendado" | "neutro" | "perjudicial";

export function traitVerdict(trait: TraitDef, role: RoleDef): TraitVerdict {
  if (trait.bad.some((p) => matches(p, role))) return "perjudicial";
  if (trait.good.some((p) => matches(p, role))) return "recomendado";
  return "neutro";
}

/** Incompatibilidad simétrica: basta con que uno de los dos la declare. */
export function traitsConflict(a: string, b: string): boolean {
  if (a === b) return false;
  return !!(TRAIT_BY_ID[a]?.conflicts.includes(b) || TRAIT_BY_ID[b]?.conflicts.includes(a));
}

export interface TraitAssessment {
  trait: TraitDef;
  verdict: TraitVerdict;
  /** Atributos por debajo del mínimo orientativo. */
  missing: { key: AttrKey; have: number | null; need: number }[];
  /** Atributos demasiado altos para un rasgo conservador (need = máximo permitido). */
  tooGood: { key: AttrKey; have: number | null; need: number }[];
  /** Rasgos actuales del jugador con los que es incompatible. */
  conflictsWith: TraitDef[];
}

type Attrs = Partial<Record<AttrKey, { value: number }>>;

export function assessTrait(trait: TraitDef, role: RoleDef, attrs: Attrs, currentTraitIds: string[]): TraitAssessment {
  const missing = (Object.entries(trait.needs) as [AttrKey, number][])
    .map(([key, need]) => ({ key, have: attrs[key]?.value ?? null, need }))
    .filter((m) => m.have === null || m.have < m.need);
  // Rasgos "conservadores": solo si el atributo que compensan es bajo.
  const tooGood = (Object.entries(trait.needsBelow ?? {}) as [AttrKey, number][])
    .filter(([key, max]) => (attrs[key]?.value ?? 0) > max)
    .map(([key, max]) => ({ key, have: attrs[key]?.value ?? null, need: max }));
  const conflictsWith = currentTraitIds
    .filter((id) => traitsConflict(id, trait.id))
    .map((id) => TRAIT_BY_ID[id])
    .filter(Boolean);
  return { trait, verdict: traitVerdict(trait, role), missing, tooGood, conflictsWith };
}

export interface TraitSuggestion {
  assessment: TraitAssessment;
  /** Margen medio sobre los mínimos (cuanto más, más fácil de aprender y más útil). */
  margin: number;
}

/**
 * Rasgos a enseñar: recomendados para el rol, que el jugador no tiene, sin
 * atributos por debajo del mínimo, sin conflictos con los actuales y que se
 * puedan enseñar (no de tutoría).
 */
export function suggestTraits(
  role: RoleDef,
  attrs: Attrs,
  currentTraitIds: string[],
  isGk: boolean,
  opts: { weakerFootPoor?: boolean } = {},
): TraitSuggestion[] {
  return traitsAvailableFor(isGk)
    .filter((t) => !t.mentoringOnly && !currentTraitIds.includes(t.id))
    .filter((t) => t.id !== "develop-weaker-foot" || opts.weakerFootPoor)
    .map((t) => assessTrait(t, role, attrs, currentTraitIds))
    .filter((a) => a.verdict === "recomendado" && a.missing.length === 0 && a.tooGood.length === 0 && a.conflictsWith.length === 0)
    .map((a) => {
      const needs = Object.entries(a.trait.needs) as [AttrKey, number][];
      const margin = needs.length ? needs.reduce((s, [k, n]) => s + ((attrs[k]?.value ?? 0) - n), 0) / needs.length : 0;
      return { assessment: a, margin };
    })
    .sort((x, y) => y.margin - x.margin);
}

/** Rasgos actuales evaluados contra el rol (para detectar los que estorban). */
/** ¿Tiene una pierna claramente floja? ("Débil", "Muy débil", "Weak"…). */
export function hasPoorWeakerFoot(leftFoot: string | null, rightFoot: string | null): boolean {
  const poor = (s: string | null) => !!s && /d[ée]bil|flojo|weak|very poor/i.test(s);
  return poor(leftFoot) || poor(rightFoot);
}

export function reviewCurrentTraits(role: RoleDef, attrs: Attrs, currentTraitIds: string[]): TraitAssessment[] {
  return currentTraitIds
    .map((id) => TRAIT_BY_ID[id])
    .filter(Boolean)
    .map((t) => assessTrait(t, role, attrs, currentTraitIds.filter((x) => x !== t.id)));
}
