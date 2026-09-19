/**
 * Parser de exportaciones HTML de Football Manager 2024.
 *
 * El juego exporta una única <table> con una fila de <th> y una fila <tr> por
 * jugador. Las cabeceras dependen del idioma del juego, así que aquí se
 * reconocen por alias (EN/ES) y, cuando una cabecera es ambigua (p.ej. "Nat"
 * = nacionalidad o forma física natural, "Pos" = posición o colocación), se
 * desambigua mirando el contenido de la columna.
 */

import { ATTRIBUTES, normalizeHeader, type AttrKey } from "./attributes";
import type { AttrValue, Attrs, ImportResult, Player, PositionInfo, PositionSlot } from "./types";

// ---------------------------------------------------------------------------
// Campos no-atributo
// ---------------------------------------------------------------------------

type FieldKey =
  | "name" | "age" | "wage" | "value" | "nationality" | "position" | "personality"
  | "mediaHandling" | "avgRating" | "leftFoot" | "rightFoot" | "height" | "uid"
  | "club" | "contractExpiry" | "preferredFoot" | "playingTime" | "secondNationality"
  | "playingStyle" | "learningTrait" | "pros" | "cons"
  | "birthDate" | "contractStart" | "releaseClause" | "contractType" | "contractKind"
  | "transferStatus" | "loanStatus" | "coachRating" | "abilityRating" | "potentialRating"
  | "apps" | "starts" | "minutes" | "minsPerApp" | "goals" | "assists" | "xg" | "xa" | "morale" | "condition" | "info";

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  name: ["Name", "Nombre"],
  age: ["Age", "Edad"],
  wage: ["Wage", "Sueldo", "Salario"],
  value: ["Transfer Value", "Valor de traspaso", "Valor", "Val. Tras.", "Valor Tras."],
  nationality: ["Nat", "Nac", "Nationality", "Nacionalidad"],
  position: ["Position", "Posición", "Pos", "Posic."],
  personality: ["Personality", "Personalidad"],
  mediaHandling: ["Media Handling", "Trato con la prensa", "Trato con los medios", "Medios"],
  avgRating: ["Av Rat", "Media", "Med", "Nota media", "Prom", "Valoración media"],
  leftFoot: ["Left Foot", "Pierna izquierda", "Pie izquierdo", "Pie Izq"],
  rightFoot: ["Right Foot", "Pierna derecha", "Pie derecho", "Pie Der"],
  height: ["Height", "Altura"],
  uid: ["UID", "IU", "ID"],
  club: ["Club", "Equipo"],
  contractExpiry: ["Expires", "Contract Expires", "Final", "Vence", "Caduca", "Fin de contrato", "Expira"],
  preferredFoot: ["Preferred Foot", "Pie preferido", "Pierna preferida"],
  playingTime: ["Agreed Playing Time", "Minutos acordados", "Playing Time"],
  secondNationality: ["2nd Nat", "2ª Nac", "Second Nationality"],
  playingStyle: ["Estilo", "Style"],
  learningTrait: ["Desarrollar un atributo del jugador", "Learning Trait"],
  pros: ["Pros"],
  cons: ["Contras", "Cons"],
  birthDate: ["Nacim.", "Nacim", "Fecha de nacimiento", "DoB", "Date of Birth"],
  contractStart: ["Comienzo", "Begins", "Contract Begins", "Inicio"],
  releaseClause: ["Cláus. Resc.", "Claus. Resc.", "Cláusula de rescisión", "Release Clause", "Min Fee Rls"],
  contractType: ["Tipo de contrato", "Contract Type"],
  contractKind: ["Tipo", "Type"],
  transferStatus: ["Situación de fichaje", "Transfer Status", "Estado de traspaso"],
  loanStatus: ["Situación de cesión", "Loan Status", "Estado de cesión"],
  coachRating: ["Idoneidad", "Suitability", "Recomendación", "Recommendation"],
  abilityRating: ["Calidad", "Habilidad actual", "Ability", "Current Ability", "CA"],
  potentialRating: ["Potencial", "Potential", "Potential Ability", "PA"],
  apps: ["Part", "Apps", "PJ", "Partidos"],
  starts: ["Titular", "Starts"],
  minutes: ["Min", "Mins", "Minutos"],
  minsPerApp: ["Min/Par", "Mins/Gm", "Min/PJ"],
  goals: ["Gol", "Gls", "Goles", "Goals"],
  assists: ["Asis", "Ast", "Asistencias", "Assists"],
  xg: ["xG- SP", "xG", "xG-SP"],
  xa: ["xA"],
  morale: ["Moral", "Morale"],
  condition: ["CON", "Condición", "Condition"],
  info: ["Inf", "Info"],
};

/**
 * Escala textual de los informes del cuerpo técnico (columnas Idoneidad /
 * Potencial). El juego exporta "Buena - Soberbia" cuando hay incertidumbre.
 */
const RATING_WORDS: [RegExp, number][] = [
  [/clase mundial|world class/i, 5],
  [/soberbi|superb/i, 4.5],
  [/excelente|excellent/i, 4],
  [/muy buena|very good/i, 3.5],
  [/^buena|^good/i, 3],
  [/correcta|decent|fair/i, 2.5],
  [/aceptable|adequate|average/i, 2],
  [/floja|poor/i, 1.5],
  [/pobre|muy floja|very poor/i, 1],
];

export function parseCoachRating(s: string | undefined): { raw: string; min: number; max: number } | null {
  const raw = (s ?? "").trim();
  if (!raw || raw === "-") return null;
  const parts = raw.split(/\s+-\s+/).map((x) => x.trim());
  const vals = parts.map((p) => RATING_WORDS.find(([re]) => re.test(p))?.[1]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return { raw, min: Math.min(...vals), max: Math.max(...vals) };
}

type ColumnKey = { kind: "attr"; key: AttrKey } | { kind: "field"; key: FieldKey };

/** Índice alias normalizado → candidatos (puede haber varios por ambigüedad). */
const ALIAS_INDEX: Map<string, ColumnKey[]> = (() => {
  const m = new Map<string, ColumnKey[]>();
  const add = (alias: string, ck: ColumnKey) => {
    const n = normalizeHeader(alias);
    const list = m.get(n) ?? [];
    list.push(ck);
    m.set(n, list);
  };
  for (const a of ATTRIBUTES) {
    for (const al of a.aliases) add(al, { kind: "attr", key: a.key });
    add(a.en, { kind: "attr", key: a.key });
    add(a.es, { kind: "attr", key: a.key });
  }
  for (const [key, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
    for (const al of aliases) add(al, { kind: "field", key });
  }
  return m;
})();

// ---------------------------------------------------------------------------
// Extracción de la tabla
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim();
}

export function extractTable(html: string): { headers: string[]; rows: string[][] } {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
  const headers: string[] = [];
  const rows: string[][] = [];
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html))) {
    const cells: { tag: string; text: string }[] = [];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rm[1]))) cells.push({ tag: cm[1].toLowerCase(), text: decodeEntities(cm[2]) });
    if (cells.length === 0) continue;
    if (headers.length === 0 && cells.every((c) => c.tag === "th")) {
      headers.push(...cells.map((c) => c.text));
    } else {
      rows.push(cells.map((c) => c.text));
    }
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Parseo de valores
// ---------------------------------------------------------------------------

const ATTR_CELL_RE = /^\s*(\d{1,2})\s*(?:-\s*(\d{1,2}))?\s*$/;

export function parseAttrValue(s: string): AttrValue | null {
  const m = ATTR_CELL_RE.exec(s);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] !== undefined ? Number(m[2]) : a;
  if (a < 1 || a > 20 || b < 1 || b > 20) return null;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return { value: (min + max) / 2, min, max, isRange: min !== max };
}

/** ¿La columna parece de atributos (1-20 o rangos)? Ignora vacíos y guiones. */
function looksLikeAttrColumn(values: string[]): boolean {
  let ok = 0;
  let total = 0;
  for (const v of values) {
    const t = v.trim();
    if (t === "" || t === "-" || t === "–") continue;
    total++;
    if (parseAttrValue(t)) ok++;
  }
  return total > 0 && ok / total >= 0.8;
}

/**
 * Convierte una cantidad monetaria a número. Acepta "€50M", "£1.2K", "50.000 €",
 * "€2,5M - €4M" (devuelve el punto medio), "12.5K p/w", "5.000 € p/s".
 */
export function parseMoney(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/\s+/g, " ").trim();
  const numRe = /(\d[\d.,]*)\s*([KkMm])?(?![a-z\/])/g;
  const found: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(clean))) {
    let raw = m[1];
    const suffix = m[2] ?? "";
    // Separadores: si hay coma y punto, el último es decimal; si solo hay uno y
    // va seguido de exactamente 3 dígitos, es de miles.
    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) {
      const dec = lastDot > lastComma ? "." : ",";
      raw = raw.replace(dec === "." ? /,/g : /\./g, "").replace(dec, ".");
    } else if (lastDot >= 0 || lastComma >= 0) {
      const sep = lastDot >= 0 ? "." : ",";
      const parts = raw.split(sep);
      const isThousands = parts.slice(1).every((p) => p.length === 3);
      raw = isThousands ? parts.join("") : parts[0] + "." + parts.slice(1).join("");
    }
    let n = Number(raw);
    if (!Number.isFinite(n)) continue;
    // En español el juego usa "m" (mil) para miles y "M" para millones: "220m €" = 220.000, "9,2M €" = 9.200.000.
    if (suffix.toUpperCase() === "K" || suffix === "m") n *= 1_000;
    if (suffix === "M") n *= 1_000_000;
    found.push(n);
  }
  if (found.length === 0) return null;
  if (found.length >= 2) return (found[0] + found[1]) / 2;
  return found[0];
}

function parseNumber(s: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(s);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Posiciones
// ---------------------------------------------------------------------------

/**
 * Prefijos de posición → estrato. En español el juego usa POR, DF, CR
 * (carrilero), MC (mediocentro = DM), ME (medio = M), MP (mediapunta = AM), DL.
 */
const PREFIX_MAP: Record<string, string> = {
  GK: "GK", POR: "GK",
  D: "D", DF: "D",
  WB: "WB", CR: "WB", CAR: "WB",
  DM: "DM", MC: "DM", MCD: "DM",
  M: "M", ME: "M",
  AM: "AM", MP: "AM",
  ST: "ST", DL: "ST",
};

const SIDE_MAP: Record<string, "R" | "L" | "C"> = { R: "R", D: "R", L: "L", I: "L", C: "C" };

export function parsePosition(raw: string): PositionInfo {
  const slots = new Set<PositionSlot>();
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = /^([^(]+?)\s*(?:\(([^)]*)\))?$/.exec(part);
    if (!m) continue;
    const prefixes = m[1].split("/").map((p) => PREFIX_MAP[p.trim().toUpperCase()]).filter(Boolean);
    const sidesRaw = (m[2] ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    const sides = sidesRaw ? sidesRaw.split("").map((c) => SIDE_MAP[c]).filter(Boolean) : [];
    for (const pre of prefixes) {
      if (pre === "GK") { slots.add("GK"); continue; }
      if (pre === "DM") { slots.add("DM"); continue; }
      if (pre === "ST") { slots.add("ST"); continue; }
      const useSides = sides.length ? sides : (["C"] as const);
      for (const side of useSides) {
        if (pre === "WB") {
          if (side === "R") slots.add("WBR");
          else if (side === "L") slots.add("WBL");
        } else {
          slots.add(`${pre}${side}` as PositionSlot);
        }
      }
    }
  }
  return { raw, slots: [...slots] };
}

// ---------------------------------------------------------------------------
// Resolución de columnas
// ---------------------------------------------------------------------------

export interface ColumnResolution {
  header: string;
  index: number;
  resolved: ColumnKey | null;
}

function resolveColumns(headers: string[], rows: string[][]): ColumnResolution[] {
  const used = new Set<string>();
  const out: ColumnResolution[] = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const candidates = ALIAS_INDEX.get(normalizeHeader(header)) ?? [];
    const colValues = rows.map((r) => r[i] ?? "");
    const isAttrCol = looksLikeAttrColumn(colValues);
    let resolved: ColumnKey | null = null;
    // Prioridad: candidato coherente con el contenido y todavía no usado. Si
    // ninguno es coherente (p.ej. "Edad" en un filial donde todos tienen <= 20
    // años) se acepta igualmente el primero libre.
    const ordered = [...candidates].sort((a, b) => {
      const sa = (a.kind === "attr") === isAttrCol ? 0 : 1;
      const sb = (b.kind === "attr") === isAttrCol ? 0 : 1;
      return sa - sb;
    });
    for (const c of ordered) {
      const id = `${c.kind}:${c.key}`;
      if (used.has(id)) continue;
      // Un atributo solo se acepta si la columna es numérica 1-20.
      if (c.kind === "attr" && !isAttrCol) continue;
      resolved = c;
      used.add(id);
      break;
    }
    out.push({ header, index: i, resolved });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parseo principal
// ---------------------------------------------------------------------------

/** "Ninguno" / "Sin datos" / "-" → null. */
function cleanNone(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t || /^(ninguno|sin datos|none|no data|-|–)$/i.test(t)) return null;
  return t;
}

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "gen-" + (h >>> 0).toString(36);
}

/**
 * @param overrides cabecera → clave forzada por el usuario ("attr:Pac", "field:name" o null para ignorar).
 */
export function parseFmHtml(html: string, overrides: Record<string, string | null> = {}): ImportResult {
  const { headers, rows } = extractTable(html);
  if (headers.length === 0) throw new Error("No se encontró ninguna tabla con cabeceras en el archivo.");

  const validRows = rows.filter((r) => r.length === headers.length);
  const droppedRows = rows.length - validRows.length;

  const resolution = resolveColumns(headers, validRows);
  for (const col of resolution) {
    if (col.header in overrides) {
      const ov = overrides[col.header];
      if (ov === null) col.resolved = null;
      else {
        const [kind, key] = ov.split(":") as ["attr" | "field", string];
        col.resolved = kind === "attr" ? { kind, key: key as AttrKey } : { kind, key: key as FieldKey };
      }
    }
  }

  const players: Player[] = [];
  for (const row of validRows) {
    const attrs: Attrs = {};
    const fields: Partial<Record<FieldKey, string>> = {};
    const extra: Record<string, string> = {};
    for (const col of resolution) {
      const cell = row[col.index] ?? "";
      if (!col.resolved) {
        if (cell) extra[col.header] = cell;
        continue;
      }
      if (col.resolved.kind === "attr") {
        const v = parseAttrValue(cell);
        if (v) attrs[col.resolved.key] = v;
      } else {
        fields[col.resolved.key] = cell;
      }
    }
    const name = (fields.name ?? "").trim();
    if (!name) continue;
    const position = parsePosition(fields.position ?? "");
    const isGoalkeeper = position.slots.includes("GK") || (attrs.Ref !== undefined && attrs.Ref.value > 5 && attrs.Han !== undefined);
    players.push({
      uid: (fields.uid ?? "").trim() || simpleHash(`${name}|${fields.age ?? ""}|${fields.club ?? ""}`),
      name,
      age: parseNumber(fields.age ?? ""),
      club: fields.club?.trim() || null,
      nationality: fields.nationality?.trim() || null,
      position,
      personality: fields.personality?.trim() || null,
      mediaHandling: fields.mediaHandling?.trim() || null,
      leftFoot: fields.leftFoot?.trim() || null,
      rightFoot: fields.rightFoot?.trim() || null,
      height: parseNumber(fields.height ?? ""),
      wage: parseMoney(fields.wage ?? ""),
      value: parseMoney(fields.value ?? ""),
      contractExpiry: fields.contractExpiry?.trim() || null,
      avgRating: parseNumber(fields.avgRating ?? ""),
      wageRaw: fields.wage?.trim() || null,
      playingTime: fields.playingTime?.trim() || null,
      secondNationality: fields.secondNationality?.trim() || null,
      playingStyle: fields.playingStyle?.trim() || null,
      learningTrait: cleanNone(fields.learningTrait),
      pros: cleanNone(fields.pros),
      cons: cleanNone(fields.cons),
      birthDate: cleanNone(fields.birthDate)?.replace(/\s*\(.*\)\s*$/, "") ?? null,
      contractStart: cleanNone(fields.contractStart),
      releaseClause: parseMoney(cleanNone(fields.releaseClause) ?? ""),
      contractType: cleanNone(fields.contractType),
      contractKind: cleanNone(fields.contractKind),
      transferStatus: cleanNone(fields.transferStatus),
      loanStatus: cleanNone(fields.loanStatus),
      // El informe puede venir en Idoneidad (vista en español) o en Potencial/Calidad.
      coachRating: parseCoachRating(fields.coachRating) ?? parseCoachRating(fields.potentialRating) ?? parseCoachRating(fields.abilityRating),
      apps: parseNumber(cleanNone(fields.apps) ?? ""),
      starts: parseNumber(cleanNone(fields.starts) ?? ""),
      minutes: parseNumber(cleanNone(fields.minutes) ?? ""),
      goals: parseNumber(cleanNone(fields.goals) ?? ""),
      assists: parseNumber(cleanNone(fields.assists) ?? ""),
      xg: parseNumber(cleanNone(fields.xg) ?? ""),
      xa: parseNumber(cleanNone(fields.xa) ?? ""),
      morale: cleanNone(fields.morale),
      condition: cleanNone(fields.condition),
      info: cleanNone(fields.info),
      attrs,
      extra,
      isGoalkeeper,
    });
  }

  const mapping: Record<string, string | null> = {};
  for (const col of resolution) mapping[col.header] = col.resolved ? `${col.resolved.kind}:${col.resolved.key}` : null;
  const unmappedHeaders = resolution.filter((c) => !c.resolved).map((c) => c.header);
  const mappedAttrs = new Set(resolution.filter((c) => c.resolved?.kind === "attr").map((c) => (c.resolved as { key: AttrKey }).key));
  const missingAttrs = ATTRIBUTES.map((a) => a.key).filter((k) => !mappedAttrs.has(k)) as AttrKey[];

  return { players, headers, sampleRow: validRows[0] ?? [], mapping, unmappedHeaders, missingAttrs, droppedRows };
}
