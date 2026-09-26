/**
 * Moneyball: rendimiento real a partir de la vista de estadísticas del juego
 * (metodología PandaFM: briefing de análisis estadístico e informe de
 * estrategia Moneyball, y hojas Estadísticas y Pegar+Stats del Excel).
 *
 * - Las estadísticas se guardan aparte, por UID y temporada: importar la
 *   vista Moneyball nunca pisa a los jugadores con atributos, y FM borra las
 *   temporadas pasadas pero la app no.
 * - Cada jugador se juzga con el perfil de su puesto (ocho perfiles del
 *   Excel más el delantero de área), por 90 minutos.
 * - Semáforo relativo a la liga: celeste el 5 % mejor del perfil, verde el
 *   10 %, amarillo lo normal, naranja lo bajo, rojo lo crítico. Sin datos de
 *   liga, con los umbrales del Excel.
 * - Muestra: provisional desde 450 minutos; firme desde 900 o 10 titularidades.
 * - Sesgos del motor: el % de pases y las posesiones perdidas del central
 *   pesan menos (despejes contados como pase fallido), el % de centros en
 *   juego abierto no puntúa (fallo del juego, puede pasar del 100 %) y el
 *   delantero se juzga antes por xG que por el % de tiros a puerta.
 */

import { normalizeHeader } from "./attributes";
import { leagueLevelPercentile, type LeagueStats } from "./league";
import { extractTable, parseMoney, parsePosition } from "./parser";
import type { RoleDef } from "./roles";
import type { LineupResult } from "./tactics";
import type { Player, PositionSlot, Squad } from "./types";

// ---------------------------------------------------------------------------
// Columnas de la vista
// ---------------------------------------------------------------------------

export type StatKey =
  | "avgRating" | "goals" | "assists" | "xg" | "npxg" | "xgOver" | "xg90" | "npxg90" | "goals90" | "assists90"
  | "xa" | "xa90" | "keyPasses90" | "keyPassesOpen90" | "chances90" | "passPct" | "passesCompleted90" | "progPasses90"
  | "dribbles90" | "crossPctOpen" | "crossPct" | "crossesOpen90" | "crossesCompleted90" | "shots90" | "shotsOnTargetPct"
  | "convPct" | "xgPerShot" | "tacklePct" | "tackles90" | "keyTackles90" | "interceptions90" | "possWon90" | "possLost90"
  | "headerPct" | "headersWon90" | "headersLost90" | "keyHeaders90" | "aerials90" | "clearances90" | "blocks90"
  | "pressuresAtt90" | "pressuresComp90" | "sprints90" | "distance90" | "errorsGoal" | "savePct" | "saves90"
  | "xgPrevented" | "xgPrevented90" | "cleanSheets" | "conceded90";

export interface StatDef {
  key: StatKey;
  es: string;
  /** Cabeceras de la vista (ES y EN). */
  headers: string[];
  /** Menos es mejor (posesiones perdidas, errores, goles encajados). */
  low?: boolean;
  pct?: boolean;
}

export const STATS: StatDef[] = [
  { key: "avgRating", es: "Calificación media", headers: ["Media", "Av Rat"] },
  { key: "goals", es: "Goles", headers: ["Gol", "Gls", "Goals"] },
  { key: "assists", es: "Asistencias", headers: ["Asis", "Ast", "Assists"] },
  { key: "xg", es: "xG", headers: ["xG"] },
  { key: "npxg", es: "xG sin penaltis", headers: ["xG- SP", "NP-xG"] },
  { key: "xgOver", es: "Sobrerendimiento de xG", headers: ["xG- HR", "xG-OP"] },
  { key: "xg90", es: "xG/90", headers: ["xG/90"] },
  { key: "npxg90", es: "xG sin penaltis/90", headers: ["XG -SP/90", "NP-xG/90"] },
  { key: "goals90", es: "Goles/90", headers: ["Gol/90", "Gls/90"] },
  { key: "assists90", es: "Asistencias/90", headers: ["Asis/90", "Asts/90"] },
  { key: "xa", es: "xA", headers: ["xA"] },
  { key: "xa90", es: "xA/90", headers: ["AsiE/90", "xA/90"] },
  { key: "keyPasses90", es: "Pases clave/90", headers: ["Pas Clv/90", "K Ps/90"] },
  { key: "keyPassesOpen90", es: "Pases clave en juego abierto/90", headers: ["P Clv-J Ab/90", "OP-KP/90"] },
  { key: "chances90", es: "Ocasiones creadas/90", headers: ["Oc C/90", "Ch C/90"] },
  { key: "passPct", es: "% de pases", headers: ["% Pase", "Pas %"], pct: true },
  { key: "passesCompleted90", es: "Pases completados/90", headers: ["Ps C/90", "Ps C/90"] },
  { key: "progPasses90", es: "Pases progresivos/90", headers: ["Pases prog/90", "Pr passes/90"] },
  { key: "dribbles90", es: "Regates/90", headers: ["Reg/90", "Drb/90"] },
  { key: "crossPctOpen", es: "% de centros en juego abierto", headers: ["Cen.C/I", "OP-Cr %"], pct: true },
  { key: "crossPct", es: "% de centros", headers: ["Cen-Ab %", "Cr C/A"], pct: true },
  { key: "crossesOpen90", es: "Centros intentados en juego abierto/90", headers: ["Cen I-Ab/90", "OP-Crs A/90"] },
  { key: "crossesCompleted90", es: "Centros completados/90", headers: ["Cen C/90", "Cr C/90"] },
  { key: "shots90", es: "Disparos/90", headers: ["Tir/90", "Shot/90"] },
  { key: "shotsOnTargetPct", es: "% de disparos a puerta", headers: ["% disparos", "Shot %"], pct: true },
  { key: "convPct", es: "% de conversión", headers: ["% conv", "Conv %"], pct: true },
  { key: "xgPerShot", es: "xG por disparo", headers: ["xG/disparo", "xG/shot"] },
  { key: "tacklePct", es: "% de entradas ganadas", headers: ["Ent P", "Tck R"], pct: true },
  { key: "tackles90", es: "Entradas/90", headers: ["Entr/90", "Tck/90"] },
  { key: "keyTackles90", es: "Entradas clave/90", headers: ["Ent Clv/90", "K Tck/90"] },
  { key: "interceptions90", es: "Robos/90", headers: ["Rob/90", "Int/90"] },
  { key: "possWon90", es: "Posesiones ganadas/90", headers: ["Pos Gan/90", "Poss Won/90"] },
  { key: "possLost90", es: "Posesiones perdidas/90", headers: ["Pos Perd/90", "Poss Lost/90"], low: true },
  { key: "headerPct", es: "% de cabezazos ganados", headers: ["Rcg %", "Hdr %"], pct: true },
  { key: "headersWon90", es: "Cabezazos ganados/90", headers: ["Cab G/90", "Hdrs W/90"] },
  { key: "headersLost90", es: "Cabezazos perdidos/90", headers: ["Cab P/90", "Hdrs L/90"], low: true },
  { key: "keyHeaders90", es: "Cabezazos clave/90", headers: ["Cab Clv/90", "K Hdrs/90"] },
  { key: "aerials90", es: "Balones aéreos disputados/90", headers: ["Bal aér/90", "Aer A/90"] },
  { key: "clearances90", es: "Despejes/90", headers: ["Desp/90", "Clr/90"] },
  { key: "blocks90", es: "Rechaces/90", headers: ["Rech/90", "Blk/90"] },
  { key: "pressuresAtt90", es: "Presiones intentadas/90", headers: ["Pres I/90", "Pres A/90"] },
  { key: "pressuresComp90", es: "Presiones completadas/90", headers: ["Pres C/90"] },
  { key: "sprints90", es: "Esprints/90", headers: ["Esprints/90", "Sprints/90"] },
  { key: "distance90", es: "Distancia/90 (km)", headers: ["Dist/90"] },
  { key: "errorsGoal", es: "Errores que acaban en gol", headers: ["Gl Err"], low: true },
  { key: "savePct", es: "% de paradas", headers: ["Rp %", "Sv %"], pct: true },
  { key: "saves90", es: "Paradas/90", headers: ["Paradas/90", "Svt/90"] },
  { key: "xgPrevented", es: "xG evitados", headers: ["xGE", "xGP"] },
  { key: "xgPrevented90", es: "xG evitados/90", headers: ["xGE/90", "xGP/90"] },
  { key: "cleanSheets", es: "Porterías imbatidas", headers: ["Portería imbatida", "Clean Sheets"] },
  { key: "conceded90", es: "Goles encajados/90", headers: ["Enc/90", "Con/90"], low: true },
];
export const STAT_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s])) as Record<StatKey, StatDef>;

const HEADER_INDEX: Map<string, StatKey> = (() => {
  const m = new Map<string, StatKey>();
  for (const s of STATS) for (const h of s.headers) if (!m.has(normalizeHeader(h))) m.set(normalizeHeader(h), s.key);
  return m;
})();

const BASE_HEADERS = {
  uid: ["IU", "UID"],
  name: ["Nombre", "Name"],
  club: ["Club"],
  position: ["Posición", "Position"],
  age: ["Edad", "Age"],
  minutes: ["Min", "Mins"],
  starts: ["Titular", "Starts"],
  apps: ["Part", "Apps"],
  wage: ["Sueldo", "Wage"],
  value: ["Valor de traspaso", "Transfer Value"],
};

/**
 * Número de la vista: «3.151» (miles con punto), «11,05» (decimal con coma),
 * «7.05» (la Media, con punto), «89%», «12,9 km», «-5,05». «-» y vacío = null.
 */
export function statNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const t = raw.trim().replace(/\s*(km|%)\s*$/i, "").replace(/\s+/g, "");
  if (!t || t === "-" || t === "–") return null;
  const m = /^(-?)([\d.,]+)$/.exec(t);
  if (!m) return null;
  let s = m[2];
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (m[1] ? -n : n) : null;
}

/** «29 (2)»: 29 de titular y 2 desde el banquillo. */
export function appsNumber(raw: string | undefined | null): number | null {
  const m = /^\s*(\d+)\s*(?:\((\d+)\))?\s*$/.exec(raw ?? "");
  return m ? Number(m[1]) + Number(m[2] ?? 0) : null;
}

// ---------------------------------------------------------------------------
// Registro por jugador y temporada
// ---------------------------------------------------------------------------

export interface StatRecord {
  uid: string;
  /** Nombre de la exportación («- -» si no cargó antes de exportar). */
  name: string;
  club: string | null;
  position: string;
  age: number | null;
  wage: number | null;
  value: number | null;
  /** «2028/29». */
  season: string;
  importedAt: string;
  /** Fuente de importación (plantilla, ojeados, liga, rival-…). */
  source: string;
  minutes: number;
  starts: number | null;
  apps: number | null;
  values: Partial<Record<StatKey, number>>;
}

/** uid → temporada → registro. */
export type StatsStore = Record<string, Record<string, StatRecord>>;

export function seasonOf(gameYear: number): string {
  return `${gameYear - 1}/${String(gameYear).slice(2)}`;
}

/** ¿Es una vista de estadísticas? Al menos 12 columnas de estadísticas reconocidas. */
export function isStatsExport(html: string): boolean {
  const { headers } = extractTable(html.slice(0, 200_000));
  return new Set(headers.map((h) => HEADER_INDEX.get(normalizeHeader(h))).filter(Boolean)).size >= 12;
}

export interface StatsReadResult {
  records: StatRecord[];
  /** Columnas de estadísticas reconocidas. */
  recognized: number;
  withMinutes: number;
}

const noName = (n: string | null | undefined) => !n || /^[-–\s]*$/.test(n);

/** Lee una exportación de la vista Moneyball. */
export function readStatsExport(html: string, opts: { season: string; source: string; importedAt: string; club?: string | null }): StatsReadResult {
  const { headers, rows } = extractTable(html);
  const norm = headers.map(normalizeHeader);
  const col = (aliases: string[]) => norm.findIndex((h) => aliases.some((a) => normalizeHeader(a) === h));
  const base = Object.fromEntries(Object.entries(BASE_HEADERS).map(([k, a]) => [k, col(a)])) as Record<keyof typeof BASE_HEADERS, number>;
  const statCols: [number, StatKey][] = [];
  const seen = new Set<StatKey>();
  norm.forEach((h, i) => { const k = HEADER_INDEX.get(h); if (k && !seen.has(k)) { seen.add(k); statCols.push([i, k]); } });
  const records: StatRecord[] = [];
  for (const r of rows) {
    if (r.length !== headers.length) continue;
    const cell = (i: number) => (i >= 0 ? r[i] : undefined);
    const uid = (cell(base.uid) ?? "").trim();
    if (!uid) continue;
    const values: StatRecord["values"] = {};
    for (const [i, k] of statCols) {
      const v = statNumber(r[i]);
      if (v != null) values[k] = v;
    }
    records.push({
      uid,
      name: (cell(base.name) ?? "").trim(),
      club: cell(base.club)?.trim() || opts.club || null,
      position: (cell(base.position) ?? "").trim(),
      age: statNumber(cell(base.age)),
      wage: parseMoney(cell(base.wage) ?? ""),
      value: parseMoney(cell(base.value) ?? ""),
      season: opts.season,
      importedAt: opts.importedAt,
      source: opts.source,
      minutes: statNumber(cell(base.minutes)) ?? 0,
      starts: statNumber(cell(base.starts)),
      apps: appsNumber(cell(base.apps)),
      values,
    });
  }
  return { records, recognized: statCols.length, withMinutes: records.filter((x) => x.minutes > 0).length };
}

/**
 * Fusiona registros nuevos: por UID y temporada gana el último. Si el nombre
 * vino como «- -», se conserva el que ya había.
 */
export function mergeStats(store: StatsStore, records: StatRecord[]): StatsStore {
  const out: StatsStore = { ...store };
  for (const r of records) {
    const prev = out[r.uid] ?? {};
    const known = Object.values(prev).find((x) => !noName(x.name))?.name;
    const rec = noName(r.name) && known ? { ...r, name: known } : r;
    // Una exportación sin minutos no borra una temporada que ya los tenía
    const old = prev[r.season];
    if (old && old.minutes > 0 && rec.minutes === 0) continue;
    out[r.uid] = { ...prev, [r.season]: rec };
  }
  return out;
}

/** Quita lo importado desde una fuente. */
export function removeStatsSource(store: StatsStore, source: string): StatsStore {
  const out: StatsStore = {};
  for (const [uid, bySeason] of Object.entries(store)) {
    const kept = Object.fromEntries(Object.entries(bySeason).filter(([, r]) => r.source !== source));
    if (Object.keys(kept).length) out[uid] = kept;
  }
  return out;
}

export function seasons(store: StatsStore): string[] {
  const s = new Set<string>();
  for (const bySeason of Object.values(store)) for (const k of Object.keys(bySeason)) s.add(k);
  return [...s].sort();
}

/** Nombre para mostrar: el de los jugadores importados, el de la exportación o el UID. */
export function statName(rec: StatRecord, byUid?: Map<string, Player>): string {
  const p = byUid?.get(rec.uid);
  if (p && !noName(p.name)) return p.name;
  return noName(rec.name) ? `Jugador ${rec.uid}` : rec.name;
}

// ---------------------------------------------------------------------------
// Perfiles
// ---------------------------------------------------------------------------

export type StatProfile = "portero" | "central" | "lateral" | "posicional" | "vertical" | "banda" | "creativo" | "delantero" | "area";

export const PROFILE_LABEL: Record<StatProfile, string> = {
  portero: "Portero",
  central: "Central",
  lateral: "Lateral / carrilero",
  posicional: "Organizador posicional",
  vertical: "Organizador vertical",
  banda: "Mediapunta de banda",
  creativo: "Creativo central",
  delantero: "Delantero",
  area: "Delantero de área",
};

export const PROFILES = Object.keys(PROFILE_LABEL) as StatProfile[];

export interface ProfileMetric {
  key: StatKey;
  /** Peso en el veredicto (0 = solo informativo). */
  weight: number;
  /** Cortes del Excel: celeste, verde, amarillo, naranja (por debajo, rojo). */
  excel?: [number, number, number, number];
  note?: string;
}

const CB_PASS = "El motor cuenta despejes y rechaces como pase fallido: pesa la mitad.";
const CB_HEAD = "Incluye los remates fallados en los córners a favor: un 82 % global puede ser un 89-93 % defendiendo.";
const CROSS_BUG = "Fallo del juego: puede pasar del 100 %. No puntúa; cuenta el volumen de centros.";

/** Métricas por perfil, con los umbrales de la hoja Estadísticas del Excel. */
export const PROFILE_METRICS: Record<StatProfile, ProfileMetric[]> = {
  portero: [
    { key: "xgPrevented90", weight: 2, excel: [0.18, 0.1, 0, -0.1], note: "La métrica clave: separa las paradas de mérito de las rutinarias." },
    { key: "savePct", weight: 1, excel: [80, 75, 70, 65] },
    { key: "passPct", weight: 1, excel: [96, 91, 86, 81], note: "Importa si la táctica sale jugando desde atrás." },
    { key: "passesCompleted90", weight: 0.5, excel: [30, 25, 20, 15] },
    { key: "xgPrevented", weight: 0, excel: [4.73, 3.73, 2.73, 1.73] },
  ],
  central: [
    { key: "tacklePct", weight: 1, excel: [86, 81, 76, 71] },
    { key: "headerPct", weight: 1, excel: [82, 77, 72, 67], note: CB_HEAD },
    { key: "interceptions90", weight: 1, excel: [2.6, 2.3, 2, 1.7] },
    { key: "possWon90", weight: 1, excel: [12.7, 12.2, 11.7, 11.2] },
    { key: "passPct", weight: 0.5, excel: [95, 92, 89, 86], note: CB_PASS },
    { key: "progPasses90", weight: 0.5, excel: [5.8, 5.3, 4.8, 4.3] },
    { key: "possLost90", weight: 0.5, excel: [4.2, 4.4, 4.6, 4.8], note: CB_PASS },
    { key: "headersWon90", weight: 0.5 },
  ],
  lateral: [
    { key: "passPct", weight: 1, excel: [91, 88, 85, 82] },
    { key: "tacklePct", weight: 1, excel: [87, 82, 77, 72] },
    { key: "progPasses90", weight: 1, excel: [7.7, 7.2, 6.7, 6.2] },
    { key: "crossesOpen90", weight: 1, excel: [5.9, 5.4, 4.9, 4.4], note: "Dice si llega a las posiciones de centro." },
    { key: "dribbles90", weight: 1, excel: [2.7, 2.45, 2.2, 1.95], note: "Regate es conducir y trasladar, no solo desbordar." },
    { key: "xa90", weight: 1, excel: [0.25, 0.2, 0.15, 0.1] },
    { key: "keyPassesOpen90", weight: 1, excel: [1.45, 1.2, 0.95, 0.7] },
    { key: "headerPct", weight: 0.5, excel: [72, 67, 62, 57] },
    { key: "interceptions90", weight: 0.5, excel: [3.16, 3, 2.84, 2.68] },
    { key: "possWon90", weight: 0.5, excel: [14.21, 13.71, 13.21, 12.71] },
    { key: "possLost90", weight: 0.5, excel: [8.88, 9.38, 9.88, 10.38] },
    { key: "crossPctOpen", weight: 0, excel: [19, 16, 13, 10], note: CROSS_BUG },
  ],
  posicional: [
    { key: "passPct", weight: 2, excel: [93, 91, 89, 87], note: "Por encima del 90 % para no perder balones en la base." },
    { key: "progPasses90", weight: 1, excel: [6.31, 5.81, 5.31, 4.81] },
    { key: "interceptions90", weight: 1, excel: [2.15, 2, 1.85, 1.7] },
    { key: "possWon90", weight: 1, excel: [10.5, 10, 9.5, 9] },
    { key: "possLost90", weight: 1, excel: [6, 6.5, 7, 7.5] },
    { key: "tacklePct", weight: 1, excel: [81, 78, 75, 72] },
    { key: "headerPct", weight: 0.5, excel: [68, 63, 58, 53] },
    { key: "keyPassesOpen90", weight: 0.5, excel: [1.25, 1.05, 0.85, 0.65] },
  ],
  vertical: [
    { key: "passPct", weight: 1, excel: [92, 90, 88, 86] },
    { key: "progPasses90", weight: 1, excel: [7.25, 6.25, 5.75, 5.25] },
    { key: "dribbles90", weight: 1, excel: [1.8, 1.5, 1.25, 1], note: "El volumen de conducción del todoterreno." },
    { key: "xa90", weight: 1, excel: [0.22, 0.2, 0.17, 0.14] },
    { key: "keyPassesOpen90", weight: 1, excel: [1.5, 1.25, 1.15, 1] },
    { key: "xg90", weight: 1, excel: [0.18, 0.16, 0.14, 0.12], note: "Los disparos desde segunda línea." },
    { key: "tacklePct", weight: 0.5, excel: [83, 80, 77, 74] },
    { key: "interceptions90", weight: 0.5, excel: [2.5, 2.25, 1.9, 1.75] },
    { key: "possWon90", weight: 0.5, excel: [10.7, 10.2, 9.7, 9.2] },
    { key: "possLost90", weight: 0.5, excel: [6.8, 7.3, 7.8, 8.3] },
    { key: "shotsOnTargetPct", weight: 0.5, excel: [55, 50, 45, 40] },
    { key: "convPct", weight: 0.5, excel: [22, 19, 16, 13] },
  ],
  banda: [
    { key: "xa90", weight: 2, excel: [0.3, 0.26, 0.22, 0.18], note: "Informe: filtrar desde 0,3 y bajar a 0,2 para tener más donde elegir." },
    { key: "keyPassesOpen90", weight: 1, excel: [1.75, 1.6, 1.45, 1.3] },
    { key: "dribbles90", weight: 1, excel: [4.4, 3.9, 3.4, 2.9] },
    { key: "xg90", weight: 1, excel: [0.35, 0.3, 0.25, 0.2] },
    { key: "crossesOpen90", weight: 0.5, excel: [5.1, 4.6, 4.1, 3.6] },
    { key: "convPct", weight: 0.5, excel: [29, 25, 21, 17] },
    { key: "shotsOnTargetPct", weight: 0.5, excel: [64, 60, 56, 52] },
    { key: "passPct", weight: 0.5, excel: [88, 86, 84, 82] },
    { key: "progPasses90", weight: 0.5, excel: [4.3, 3.9, 3.5, 3.2] },
    { key: "possLost90", weight: 0.5, excel: [9, 10, 11, 12] },
    { key: "tacklePct", weight: 0.5, excel: [88, 85, 82, 79] },
    { key: "interceptions90", weight: 0.25, excel: [2.65, 2.45, 2.25, 2.05] },
    { key: "possWon90", weight: 0.25, excel: [8.5, 8, 7.5, 7] },
    { key: "crossPctOpen", weight: 0, excel: [24, 21, 18, 15], note: CROSS_BUG },
  ],
  creativo: [
    { key: "keyPassesOpen90", weight: 2, excel: [1.3, 1.1, 1, 0.8] },
    { key: "xa90", weight: 1, excel: [0.2, 0.16, 0.14, 0.12] },
    { key: "progPasses90", weight: 1, excel: [4, 3.7, 3.3, 3] },
    { key: "dribbles90", weight: 0.5, excel: [2, 1.6, 1.4, 1.2] },
    { key: "xg90", weight: 0.5, excel: [0.21, 0.18, 0.16, 0.14] },
    { key: "passPct", weight: 0.5, excel: [88, 86, 84, 82] },
    { key: "possLost90", weight: 0.5, excel: [9.35, 10.35, 11.35, 12.35] },
    { key: "shotsOnTargetPct", weight: 0.5, excel: [56, 51, 47, 43] },
    { key: "convPct", weight: 0.5, excel: [21, 19, 17, 15] },
    { key: "tacklePct", weight: 0.25, excel: [82, 80, 78, 76] },
    { key: "interceptions90", weight: 0.25, excel: [2.05, 1.85, 1.65, 1.34] },
    { key: "possWon90", weight: 0.25, excel: [6.6, 6.2, 5.8, 5.4] },
    { key: "keyPasses90", weight: 0, excel: [2.5, 2, 1.5, 1], note: "Informe: 2 pases clave por 90 como mínimo para un organizador." },
  ],
  delantero: [
    { key: "xg90", weight: 2, excel: [0.5, 0.45, 0.4, 0.35], note: "Mide desde dónde remata: vale más que el % a puerta." },
    { key: "xgOver", weight: 1, excel: [10, 5, 2, 0], note: "Informe: 10 o más es la élite mundial; 5, accesibles." },
    { key: "convPct", weight: 1, excel: [26, 24, 22, 20] },
    { key: "xa90", weight: 0.5, excel: [0.13, 0.11, 0.09, 0.07] },
    { key: "dribbles90", weight: 0.5, excel: [1.8, 1.2, 1, 0.9] },
    { key: "headerPct", weight: 0.5, excel: [50, 45, 40, 35] },
    { key: "shotsOnTargetPct", weight: 0.25, excel: [56, 52, 50, 48], note: "Mezcla remates bloqueados o sin peligro." },
    { key: "passPct", weight: 0.25, excel: [87, 86, 85, 84] },
    { key: "possWon90", weight: 0.25, excel: [4.85, 4.35, 3.85, 3.35] },
    { key: "possLost90", weight: 0.25, excel: [6.6, 7.1, 8.1, 9.1] },
    { key: "tacklePct", weight: 0.25, excel: [80, 76, 72, 68] },
  ],
  area: [
    { key: "headersWon90", weight: 2, excel: [4, 3, 2, 1.5], note: "Informe: de 2 a 4 cabezazos ganados por 90." },
    { key: "xg90", weight: 1, excel: [0.5, 0.45, 0.4, 0.35] },
    { key: "headerPct", weight: 1, excel: [50, 45, 40, 35] },
    { key: "xgOver", weight: 1, excel: [10, 5, 2, 0] },
    { key: "convPct", weight: 1, excel: [26, 24, 22, 20] },
    { key: "keyHeaders90", weight: 0.5 },
    { key: "xa90", weight: 0.25, excel: [0.13, 0.11, 0.09, 0.07] },
    { key: "possLost90", weight: 0.25, excel: [6.6, 7.1, 8.1, 9.1] },
  ],
};

const ROLE_PROFILE: Record<string, StatProfile> = {
  GK: "portero", SK: "portero",
  CD: "central", BPD: "central", NCB: "central", L: "central", WCB: "central",
  FB: "lateral", NFB: "lateral", IFB: "lateral", WB: "lateral", CWB: "lateral", IWB: "lateral",
  A: "posicional", DM: "posicional", HB: "posicional", DLP: "posicional", REG: "posicional", BWM: "posicional",
  RPM: "vertical", SV: "vertical", CM: "vertical", B2B: "vertical", CAR: "vertical", MEZ: "vertical",
  AP: "creativo", AM: "creativo", EG: "creativo",
  W: "banda", IW: "banda", WP: "banda", WM: "banda", DW: "banda", IF: "banda", RMD: "banda", WTF: "banda",
  SS: "delantero", AF: "delantero", P: "delantero", CF: "delantero", DLF: "delantero", PF: "delantero", F9: "delantero",
  TF: "area",
};

/** Perfil del rol en su hueco (el Trequartista arriba juega de delantero). */
export function profileOfRole(role: RoleDef, slot: PositionSlot): StatProfile {
  if (role.code === "TQ") return slot === "ST" ? "delantero" : slot === "AMC" ? "creativo" : "banda";
  return ROLE_PROFILE[role.code] ?? profileOfSlot(slot);
}

/** Perfil por la posición natural (jugadores fuera del XI y la liga). */
export function profileOfSlot(slot: PositionSlot | undefined): StatProfile {
  if (!slot) return "vertical";
  if (slot === "GK") return "portero";
  if (slot === "DC") return "central";
  if (slot === "DR" || slot === "DL" || slot === "WBR" || slot === "WBL") return "lateral";
  if (slot === "DM") return "posicional";
  if (slot === "MC") return "vertical";
  if (slot === "AMC") return "creativo";
  if (slot === "ST") return "delantero";
  return "banda";
}

export function profileOfPosition(raw: string): StatProfile {
  return profileOfSlot(parsePosition(raw).slots[0]);
}

/** Perfil de un jugador: el de su rol si es titular en la táctica; si no, el de su posición. */
export function profileForPlayer(uid: string, p: Player | undefined, rec: StatRecord | undefined, lineup: LineupResult | null): StatProfile {
  const s = lineup?.slots.find((x) => x.starter?.player.uid === uid);
  if (s) return profileOfRole(s.role, s.slot.slot);
  if (p) return p.isGoalkeeper ? "portero" : profileOfSlot(p.position.slots[0]);
  return profileOfPosition(rec?.position ?? "");
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------

/** 4 celeste, 3 verde, 2 amarillo, 1 naranja, 0 rojo. */
export type Band = 0 | 1 | 2 | 3 | 4;
export const BAND_LABEL: Record<Band, string> = { 4: "celeste", 3: "verde", 2: "amarillo", 1: "naranja", 0: "rojo" };
/** Vocabulario del Excel para el veredicto. */
export const VERDICT_WORD: Record<Band, string> = { 4: "Estrella", 3: "Destacado", 2: "Bueno", 1: "Decente", 0: "Común" };

export type Sample = "firme" | "provisional" | "insuficiente";
export const FIRM_MINUTES = 900;
export const FIRM_STARTS = 10;
export const PROVISIONAL_MINUTES = 450;

export function sampleOf(rec: Pick<StatRecord, "minutes" | "starts">): Sample {
  if (rec.minutes >= FIRM_MINUTES || (rec.starts ?? 0) >= FIRM_STARTS) return "firme";
  if (rec.minutes >= PROVISIONAL_MINUTES) return "provisional";
  return "insuficiente";
}

/** Percentiles de la liga para los cortes: celeste el 5 % mejor, verde el 10 %, amarillo desde el 40, naranja desde el 15. */
export const LEAGUE_CUTS = [95, 90, 40, 15] as const;
/** Jugadores del perfil con muestra firme necesarios para usar la liga en vez del Excel. */
export const MIN_LEAGUE_SAMPLE = 12;

export interface LeagueStatCuts {
  /** Valores ordenados de la liga por perfil y estadística (solo muestra firme). */
  values: Record<StatProfile, Partial<Record<StatKey, number[]>>>;
  count: Record<StatProfile, number>;
  season: string | null;
}

function valid(key: StatKey, v: number | undefined): v is number {
  if (v == null || !Number.isFinite(v)) return false;
  if (STAT_BY_KEY[key].pct && (v < 0 || v > 100)) return false;
  return true;
}

export function buildLeagueCuts(records: StatRecord[], season: string | null): LeagueStatCuts {
  const values = Object.fromEntries(PROFILES.map((p) => [p, {}])) as LeagueStatCuts["values"];
  const count = Object.fromEntries(PROFILES.map((p) => [p, 0])) as LeagueStatCuts["count"];
  for (const r of records) {
    if (sampleOf(r) !== "firme") continue;
    const profiles: StatProfile[] = [profileOfPosition(r.position)];
    // El delantero de área se compara con todos los delanteros
    if (profiles[0] === "delantero") profiles.push("area");
    for (const prof of profiles) {
      count[prof]++;
      for (const [k, v] of Object.entries(r.values) as [StatKey, number][]) {
        if (!valid(k, v)) continue;
        (values[prof][k] ??= []).push(v);
      }
    }
  }
  for (const p of PROFILES) for (const arr of Object.values(values[p])) arr!.sort((a, b) => a - b);
  return { values, count, season };
}

/** Valor en el percentil q (0-100) de una lista ordenada. */
function quantile(sorted: number[], q: number): number {
  const i = (q / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function rankPct(sorted: number[], v: number, low: boolean): number {
  let below = 0;
  for (const x of sorted) if (low ? x > v : x < v) below++;
  const equal = sorted.filter((x) => x === v).length;
  return Math.round(((below + equal / 2) / sorted.length) * 100);
}

/** Cortes celeste/verde/amarillo/naranja de una estadística en un perfil: de la liga si hay muestra, si no del Excel. */
export function cutsFor(profile: StatProfile, key: StatKey, league: LeagueStatCuts | null): { cuts: [number, number, number, number]; source: "liga" | "excel" } | null {
  const low = !!STAT_BY_KEY[key].low;
  const arr = league?.values[profile][key];
  if (arr && arr.length >= MIN_LEAGUE_SAMPLE) {
    const qs = LEAGUE_CUTS.map((q) => quantile(arr, low ? 100 - q : q)) as [number, number, number, number];
    return { cuts: qs, source: "liga" };
  }
  const m = PROFILE_METRICS[profile].find((x) => x.key === key)?.excel;
  return m ? { cuts: m, source: "excel" } : null;
}

export function bandOf(v: number, cuts: [number, number, number, number], low: boolean): Band {
  const ok = (c: number) => (low ? v <= c : v >= c);
  return ok(cuts[0]) ? 4 : ok(cuts[1]) ? 3 : ok(cuts[2]) ? 2 : ok(cuts[3]) ? 1 : 0;
}

export interface MetricResult {
  key: StatKey;
  label: string;
  value: number | null;
  band: Band | null;
  /** Percentil en la liga (mayor es mejor también en las de «menos es mejor»). */
  pct: number | null;
  source: "liga" | "excel" | null;
  weight: number;
  cuts: [number, number, number, number] | null;
  note?: string;
}

export interface PerfEval {
  rec: StatRecord;
  profile: StatProfile;
  sample: Sample;
  metrics: MetricResult[];
  /** Media ponderada de franjas (0-4). */
  score: number | null;
  band: Band | null;
  verdict: string | null;
  /** Percentil medio ponderado en la liga. */
  pct: number | null;
  /** Cortes calculados con tu liga (si no, los del Excel). */
  fromLeague: boolean;
  strengths: MetricResult[];
  weaknesses: MetricResult[];
}

export function metricResult(rec: StatRecord, profile: StatProfile, key: StatKey, league: LeagueStatCuts | null, weight = 0, note?: string): MetricResult {
  const def = STAT_BY_KEY[key];
  const raw = rec.values[key];
  const value = valid(key, raw) ? raw : null;
  const c = cutsFor(profile, key, league);
  const arr = league?.values[profile][key];
  return {
    key,
    label: def.es,
    value,
    band: value != null && c ? bandOf(value, c.cuts, !!def.low) : null,
    pct: value != null && arr && arr.length >= MIN_LEAGUE_SAMPLE ? rankPct(arr, value, !!def.low) : null,
    source: c?.source ?? null,
    weight,
    cuts: c?.cuts ?? null,
    note,
  };
}

export function bandFromScore(score: number): Band {
  return score >= 3.5 ? 4 : score >= 2.75 ? 3 : score >= 2 ? 2 : score >= 1.25 ? 1 : 0;
}

/** Juicio de rendimiento del jugador en un perfil. */
export function evaluatePerf(rec: StatRecord, profile: StatProfile, league: LeagueStatCuts | null): PerfEval {
  const sample = sampleOf(rec);
  const metrics = PROFILE_METRICS[profile].map((m) => metricResult(rec, profile, m.key, league, m.weight, m.note));
  let score: number | null = null;
  let pct: number | null = null;
  if (sample !== "insuficiente") {
    const scored = metrics.filter((m) => m.weight > 0 && m.band != null);
    const w = scored.reduce((s, m) => s + m.weight, 0);
    if (w > 0) score = scored.reduce((s, m) => s + m.band! * m.weight, 0) / w;
    const withPct = metrics.filter((m) => m.weight > 0 && m.pct != null);
    const wp = withPct.reduce((s, m) => s + m.weight, 0);
    if (wp > 0) pct = Math.round(withPct.reduce((s, m) => s + m.pct! * m.weight, 0) / wp);
  }
  const band = score != null ? bandFromScore(score) : null;
  const fromLeague = metrics.some((m) => m.weight > 0 && m.band != null && m.source === "liga");
  const ranked = metrics.filter((m) => m.weight > 0 && m.band != null);
  return {
    rec,
    profile,
    sample,
    metrics,
    score,
    band,
    verdict: band != null ? `${VERDICT_WORD[band]} ${fromLeague ? "en tu liga" : "(umbrales del Excel)"}` : null,
    fromLeague,
    pct,
    strengths: sample === "insuficiente" ? [] : ranked.filter((m) => m.band! >= 3).sort((a, b) => b.band! - a.band! || b.weight - a.weight).slice(0, 3),
    weaknesses: sample === "insuficiente" ? [] : ranked.filter((m) => m.band! <= 1).sort((a, b) => a.band! - b.band! || b.weight - a.weight).slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Contexto: temporada, liga y registros de la temporada
// ---------------------------------------------------------------------------

export interface StatsContext {
  season: string | null;
  /** Registro de la temporada por UID. */
  records: Map<string, StatRecord>;
  league: LeagueStatCuts;
  /** Registros de la liga de la temporada (primer equipo, rivales de liga y búsqueda de liga). */
  leagueRecords: StatRecord[];
}

/** Fuentes que cuentan como liga: tu plantilla, los rivales de liga y la búsqueda de liga. */
export function isLeagueSource(source: string, squads: Squad[]): boolean {
  if (source === "plantilla" || source === "liga") return true;
  const q = squads.find((x) => x.id === source);
  return q?.kind === "rival" && (q.competition ?? "liga") === "liga";
}

export function buildStatsContext(store: StatsStore, squads: Squad[], season: string | null = null): StatsContext {
  const all = seasons(store);
  const s = season ?? all[all.length - 1] ?? null;
  const records = new Map<string, StatRecord>();
  if (s) for (const [uid, bySeason] of Object.entries(store)) if (bySeason[s]) records.set(uid, bySeason[s]);
  const leagueRecords = [...records.values()].filter((r) => isLeagueSource(r.source, squads));
  return { season: s, records, league: buildLeagueCuts(leagueRecords, s), leagueRecords };
}

/** Temporadas anteriores de un jugador, de la más reciente a la más antigua. */
export function pastSeasons(store: StatsStore, uid: string, season: string | null): StatRecord[] {
  return Object.values(store[uid] ?? {}).filter((r) => r.season !== season).sort((a, b) => b.season.localeCompare(a.season));
}

// ---------------------------------------------------------------------------
// Atributos frente a rendimiento
// ---------------------------------------------------------------------------

export interface AttrVsPerf {
  attrPct: number;
  perfPct: number;
  diff: number;
  text: string;
}

/**
 * Rinde por encima (un Söyüncü con Decisiones bajas y números de élite, un
 * Maeda que vive de la velocidad) o por debajo de lo que prometen sus atributos.
 */
export function attrVsPerf(perf: PerfEval, player: Player | undefined, attrLeague: LeagueStats | null): AttrVsPerf | null {
  if (!player || !attrLeague || perf.pct == null || perf.sample === "insuficiente") return null;
  const attrPct = leagueLevelPercentile(attrLeague, player);
  if (attrPct == null) return null;
  const diff = perf.pct - attrPct;
  if (Math.abs(diff) < 25) return { attrPct, perfPct: perf.pct, diff, text: "Rinde lo que prometen sus atributos." };
  return {
    attrPct,
    perfPct: perf.pct,
    diff,
    text: diff > 0
      ? `Rinde por encima de sus atributos (rendimiento P${perf.pct}, atributos P${attrPct}): atributos ocultos o el motor le favorece.`
      : `Rinde por debajo de sus atributos (rendimiento P${perf.pct}, atributos P${attrPct}): mira las repeticiones antes de condenarle; puede ser el rol o el contexto.`,
  };
}

// ---------------------------------------------------------------------------
// ¿Cumple su rol? (funciones del detector de equilibrio)
// ---------------------------------------------------------------------------

/** Estadísticas que prueban cada función del rol. */
export const FUNCTION_STATS: Partial<Record<string, { keys: StatKey[]; text: string }>> = {
  crea: { keys: ["keyPassesOpen90", "xa90"], text: "crear ocasiones" },
  amplitud: { keys: ["crossesOpen90"], text: "dar amplitud y centrar" },
  conduce: { keys: ["dribbles90"], text: "conducir y trasladar" },
  llega: { keys: ["xg90"], text: "llegar al área a rematar" },
  huecos: { keys: ["xg90"], text: "atacar los espacios" },
  destruye: { keys: ["interceptions90", "possWon90", "tacklePct"], text: "recuperar balones" },
  fija: { keys: ["headersWon90", "xg90"], text: "fijar a los centrales" },
  sostiene: { keys: ["passPct", "possLost90"], text: "dar salida segura" },
  presiona: { keys: ["pressuresComp90", "possWon90"], text: "presionar" },
};

export interface FunctionCheck {
  fn: string;
  ok: boolean;
  text: string;
  metrics: MetricResult[];
}

/** Para cada función del rol: si las estadísticas la confirman (mejor franja ≥ amarillo) o no. */
export function functionChecks(fns: string[], rec: StatRecord, profile: StatProfile, league: LeagueStatCuts | null): FunctionCheck[] {
  if (sampleOf(rec) === "insuficiente") return [];
  const out: FunctionCheck[] = [];
  for (const fn of fns) {
    const def = FUNCTION_STATS[fn];
    if (!def) continue;
    const ms = def.keys.map((k) => metricResult(rec, profile, k, league)).filter((m) => m.band != null);
    if (!ms.length) continue;
    const best = ms.reduce((a, b) => (b.band! > a.band! ? b : a));
    const ok = best.band! >= 2;
    out.push({
      fn,
      ok,
      metrics: ms,
      text: ok
        ? `Cumple: ${def.text} (${best.label} ${fmtStat(best.key, best.value)}, ${BAND_LABEL[best.band!]}).`
        : `Su rol le pide ${def.text}, pero ${ms.map((m) => `${m.label.toLowerCase()} ${fmtStat(m.key, m.value)} (${BAND_LABEL[m.band!]})`).join(" y ")}.`,
    });
  }
  return out;
}

export function fmtStat(key: StatKey, v: number | null | undefined): string {
  if (v == null) return "–";
  const d = STAT_BY_KEY[key];
  if (d.pct) return `${Math.round(v)} %`;
  const abs = Math.abs(v);
  return (abs >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");
}

/** Filtros para la búsqueda del juego: las estadísticas clave del perfil en verde de tu liga (o del Excel). */
export function searchFilters(profile: StatProfile, league: LeagueStatCuts | null, n = 3): string[] {
  const keys = PROFILE_METRICS[profile].filter((m) => m.weight >= 1).sort((a, b) => b.weight - a.weight).slice(0, n);
  const out: string[] = [];
  for (const m of keys) {
    const c = cutsFor(profile, m.key, league);
    if (!c) continue;
    const low = !!STAT_BY_KEY[m.key].low;
    out.push(`${STAT_BY_KEY[m.key].es} ${low ? "≤" : "≥"} ${fmtStat(m.key, c.cuts[1])}`);
  }
  out.push(`Titularidades ≥ ${FIRM_STARTS}`);
  return out;
}

// ---------------------------------------------------------------------------
// Cazador de gangas
// ---------------------------------------------------------------------------

export interface Bargain {
  rec: StatRecord;
  perf: PerfEval;
  value: number | null;
  wage: number | null;
  /** Juega en tu liga (rival de liga o búsqueda de liga); si no, comprueba el nivel de su liga. */
  sameLeague: boolean;
}

/**
 * Jugadores de fuera (ojeados, rivales de liga, búsqueda) que rinden en
 * verde o celeste en su perfil, del más barato al más caro: lo que el informe
 * llama comprar barato lo que rinde en una liga cercana.
 */
export function findBargains(ctx: StatsContext, squads: Squad[], exclude: Set<string>, byUid: Map<string, Player>, minBand: Band = 3): Bargain[] {
  const out: Bargain[] = [];
  for (const rec of ctx.records.values()) {
    if (rec.source === "plantilla" || exclude.has(rec.uid)) continue;
    const p = byUid.get(rec.uid);
    const profile = p ? (p.isGoalkeeper ? "portero" : profileOfSlot(p.position.slots[0])) : profileOfPosition(rec.position);
    const perf = evaluatePerf(rec, profile, ctx.league);
    if (perf.band == null || perf.band < minBand) continue;
    out.push({ rec, perf, value: rec.value ?? p?.value ?? null, wage: rec.wage ?? p?.wage ?? null, sameLeague: isLeagueSource(rec.source, squads) });
  }
  return out.sort((a, b) => (b.perf.band! - a.perf.band!) || ((a.value ?? Infinity) - (b.value ?? Infinity)));
}

// ---------------------------------------------------------------------------
// Plan por hueco: lo que dicen los datos del titular
// ---------------------------------------------------------------------------

export interface SlotPerf {
  perf: PerfEval;
  checks: FunctionCheck[];
  /** Ajustes del briefing a partir de los datos (instrucciones o rol). */
  advice: string[];
}

/**
 * Rendimiento del titular en su hueco, si cumple las funciones del rol y los
 * ajustes que propone el briefing: «Tomar menos riesgos» al portero con poca
 * Visión que falla pases (caso Oblak), otro rol al lateral que no progresa
 * con el pase, y el pivote por debajo del 90 % de pases.
 */
export function slotPerformance(role: RoleDef, slot: PositionSlot, player: Player, rec: StatRecord, fns: string[], league: LeagueStatCuts | null): SlotPerf {
  const profile = profileOfRole(role, slot);
  const perf = evaluatePerf(rec, profile, league);
  const checks = functionChecks(fns, rec, profile, league);
  const advice: string[] = [];
  if (perf.sample !== "insuficiente") {
    const m = (k: StatKey) => perf.metrics.find((x) => x.key === k) ?? metricResult(rec, profile, k, league);
    const pass = m("passPct");
    const vis = player.attrs.Vis?.value;
    if (profile === "portero" && pass.band != null && pass.band <= 1 && vis != null && vis <= 12)
      advice.push(`«Tomar menos riesgos»: Visión ${vis} y ${fmtStat("passPct", pass.value)} de pases (${BAND_LABEL[pass.band]}). Con poca visión los pases largos acaban en error; que entregue en corto.`);
    const prog = m("progPasses90");
    if (profile === "lateral" && prog.band != null && prog.band <= 1)
      advice.push(`Progresa poco con el pase (${fmtStat("progPasses90", prog.value)} pases progresivos/90, ${BAND_LABEL[prog.band]}): prueba otro rol de lateral.`);
    if (profile === "posicional" && pass.value != null && pass.value < 90)
      advice.push(`Pivote con ${fmtStat("passPct", pass.value)} de pases: por debajo del 90 % pierde balones en la base. «Tomar menos riesgos» o un organizador más seguro.`);
  }
  return { perf, checks, advice };
}
