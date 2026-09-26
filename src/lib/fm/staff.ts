/**
 * Empleados del club (exportación de la vista de empleados, Ctrl+P → página
 * web), igual que los jugadores: cada importación reemplaza la red. Se fusiona
 * por nombre: los nuevos entran, los que ya no están se marcan «ya no está»
 * (sus focos quedan para reasignar).
 *
 * Columnas que se leen: Equipo, Empleo, Empleo secundario, Nombre, Nac, Sueldo,
 * Final, Ada (adaptabilidad), Juz. Cal (juzgar calidad actual), Juz. Pot
 * (juzgar potencial) y, si vienen, los atributos de entrenador. «Asi» y
 * «Calificación» se ignoran.
 */

import { extractTable, parseMoney } from "./parser";

export type StaffKind = "ojeador" | "analista" | "direccion" | "entrenador" | "otro";

export const STAFF_KIND_LABEL: Record<StaffKind, string> = {
  ojeador: "Ojeador",
  analista: "Analista de contrataciones",
  direccion: "Dirección deportiva (no se asigna a focos)",
  entrenador: "Cuerpo técnico",
  otro: "Otro",
};

export interface StaffMember {
  name: string;
  /** Empleo tal como viene en la exportación. */
  job: string;
  kind: StaffKind;
  team: string | null;
  nationality: string | null;
  /** Adaptabilidad: para mandarlo a mercados lejanos, 15 o más. */
  adaptability: number | null;
  /** Juzgar calidad actual (JPA). */
  judgeAbility: number | null;
  /** Juzgar potencial (JPP). */
  judgePotential: number | null;
  wage: number | null;
  contractEnd: string | null;
  /** Resto de atributos numéricos que traiga la vista (entrenamiento…). */
  attrs: Record<string, number>;
  /** No venía en la última importación. */
  gone?: boolean;
  /** Fecha de la última importación en la que aparecía. */
  lastSeen: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Cabeceras (normalizadas) → campo. */
const HEADERS: Record<string, keyof StaffMember | "secondary" | "ignore"> = {
  equipo: "team",
  empleo: "job",
  "empleo secundario": "secondary",
  nombre: "name",
  nac: "nationality",
  nacionalidad: "nationality",
  sueldo: "wage",
  final: "contractEnd",
  ada: "adaptability",
  adaptabilidad: "adaptability",
  "juz cal": "judgeAbility",
  "juzgar calidad": "judgeAbility",
  "juz pot": "judgePotential",
  "juzgar potencial": "judgePotential",
  asi: "ignore",
  calificacion: "ignore",
  "calificaci n": "ignore",
  "tc tp": "ignore",
  "calificaciones de preparador": "ignore",
};

/** ¿Es una exportación de empleados y no de jugadores? */
export function isStaffExport(html: string): boolean {
  const { headers } = extractTable(html);
  const h = headers.map(norm);
  return h.includes("empleo") && (h.includes("juz cal") || h.includes("juz pot") || h.includes("ada"));
}

export function staffKind(job: string): StaffKind {
  const j = norm(job);
  if (/ojeador|scout/.test(j)) return "ojeador";
  if (/analista|analyst/.test(j)) return "analista";
  if (/director deportivo|secretario tecnico|cesiones|director of football|technical director|loan/.test(j)) return "direccion";
  if (/entrenador|preparador|fisio|medico|psicolog|coach|manager|asistente/.test(j)) return "entrenador";
  return "otro";
}

const num = (s: string): number | null => {
  const m = /^\s*(\d{1,2})\s*$/.exec(s);
  return m ? Number(m[1]) : null;
};

export function parseStaffHtml(html: string, importedAt = new Date().toISOString()): StaffMember[] {
  const { headers, rows } = extractTable(html);
  const cols = headers.map((h) => HEADERS[norm(h)] ?? null);
  const out: StaffMember[] = [];
  for (const row of rows) {
    if (row.length !== headers.length) continue;
    const m: StaffMember = { name: "", job: "", kind: "otro", team: null, nationality: null, adaptability: null, judgeAbility: null, judgePotential: null, wage: null, contractEnd: null, attrs: {}, lastSeen: importedAt };
    row.forEach((cell, i) => {
      const c = cols[i];
      const v = cell.trim();
      if (c === "name") m.name = v;
      else if (c === "job") m.job = v;
      else if (c === "team") m.team = v || null;
      else if (c === "nationality") m.nationality = v || null;
      else if (c === "adaptability" || c === "judgeAbility" || c === "judgePotential") m[c] = num(v);
      else if (c === "wage") m.wage = parseMoney(v);
      else if (c === "contractEnd") m.contractEnd = v && v !== "-" ? v : null;
      else if (c === null && num(v) != null) m.attrs[headers[i]] = num(v)!;
    });
    if (!m.name || m.name === "- -") continue;
    m.kind = staffKind(m.job);
    out.push(m);
  }
  return out;
}

/** Nueva importación sobre la red guardada: los que siguen se actualizan, los nuevos entran y los que faltan quedan «ya no está». */
export function mergeStaff(prev: StaffMember[], incoming: StaffMember[]): StaffMember[] {
  const byName = new Map(incoming.map((m) => [norm(m.name), m]));
  const kept = prev.filter((m) => !byName.has(norm(m.name))).map((m) => ({ ...m, gone: true }));
  return [...incoming.map((m) => ({ ...m, gone: false })), ...kept];
}

/** País por código de nacionalidad de la exportación (para el campo «Áreas» del foco). */
export const NATION_NAME: Record<string, string> = {
  ENG: "Inglaterra", SCO: "Escocia", WAL: "Gales", NIR: "Irlanda del Norte", IRL: "República de Irlanda",
  ESP: "España", POR: "Portugal", FRA: "Francia", GER: "Alemania", ITA: "Italia", NED: "Países Bajos", BEL: "Bélgica",
  SUI: "Suiza", AUT: "Austria", DEN: "Dinamarca", SWE: "Suecia", NOR: "Noruega", POL: "Polonia", CRO: "Croacia",
  SRB: "Serbia", TUR: "Turquía", GRE: "Grecia", CZE: "República Checa", UKR: "Ucrania",
  BRA: "Brasil", ARG: "Argentina", URU: "Uruguay", COL: "Colombia", CHI: "Chile", MEX: "México", USA: "Estados Unidos",
  NGA: "Nigeria", GHA: "Ghana", SEN: "Senegal", CIV: "Costa de Marfil", MAR: "Marruecos", JPN: "Japón", KOR: "Corea del Sur", AUS: "Australia",
};

export function nationName(code: string | null): string | null {
  return code ? NATION_NAME[code.toUpperCase()] ?? code : null;
}
