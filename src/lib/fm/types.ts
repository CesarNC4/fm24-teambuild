import type { AttrKey } from "./attributes";

/** Valor de un atributo. Los ojeados pueden venir como rango ("10-14"). */
export interface AttrValue {
  /** Valor puntual o punto medio del rango. */
  value: number;
  min: number;
  max: number;
  /** true si el juego lo exportó como rango (conocimiento incompleto). */
  isRange: boolean;
}

export type Attrs = Partial<Record<AttrKey, AttrValue>>;

/** Posición natural/competente del jugador tal y como la exporta el juego, p.ej. "D/CAR (D), MC". */
export interface PositionInfo {
  raw: string;
  /** Posiciones descompuestas: "GK", "DC", "DR", "DL", "WBR", "WBL", "DM", "MC", "MR", "ML", "AMC", "AMR", "AML", "ST". */
  slots: PositionSlot[];
}

export type PositionSlot =
  | "GK"
  | "DR" | "DC" | "DL"
  | "WBR" | "WBL"
  | "DM"
  | "MR" | "MC" | "ML"
  | "AMR" | "AMC" | "AML"
  | "ST";

export interface Player {
  /** UID del juego. Si no está en la exportación se genera a partir del nombre. */
  uid: string;
  name: string;
  age: number | null;
  club: string | null;
  nationality: string | null;
  position: PositionInfo;
  personality: string | null;
  mediaHandling: string | null;
  leftFoot: string | null;
  rightFoot: string | null;
  height: number | null;
  /** Sueldo semanal en unidades de la moneda del juego. */
  wage: number | null;
  /** Valor de traspaso (punto medio si es rango). */
  value: number | null;
  contractExpiry: string | null;
  avgRating: number | null;
  /** Sueldo tal cual lo exporta el juego (incluye periodo: p/s, p/m…). */
  wageRaw: string | null;
  /** Minutos acordados: "Titular habitual", "Promesa importante", … */
  playingTime: string | null;
  secondNationality: string | null;
  /** Estilo de juego que muestra el juego: Técnico, Físico, Líder… */
  playingStyle: string | null;
  /** Rasgo que está aprendiendo ahora mismo. */
  learningTrait: string | null;
  pros: string | null;
  cons: string | null;
  // --- Columnas añadidas a la vista (contrato, informe, estadísticas) ---
  /** Fecha de nacimiento "20/6/1999". */
  birthDate: string | null;
  contractStart: string | null;
  releaseClause: number | null;
  /** "Tiempo completo", "Contrato juvenil", "A tiempo parcial"… */
  contractType: string | null;
  /** "Contrato tiempo completo", "Mes a mes"… */
  contractKind: string | null;
  /** Situación de fichaje: "Listado", "No asignado"… */
  transferStatus: string | null;
  /** Situación de cesión: "Listado", "No disponible", "No asignado"… */
  loanStatus: string | null;
  /** Valoración textual del cuerpo técnico (columna Idoneidad/Potencial): rango 1-5. */
  coachRating: { raw: string; min: number; max: number } | null;
  apps: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  morale: string | null;
  condition: string | null;
  /** Columna "Inf" del juego: Les, Juv, Int, Per… */
  info: string | null;
  attrs: Attrs;
  /** Columnas de la exportación que no se reconocieron, por si se quieren mostrar. */
  extra: Record<string, string>;
  isGoalkeeper: boolean;
}

/** Id de la fuente de importación: "plantilla", "ojeados" o un filial ("filial-…"). */
export type ImportSource = string;

export interface Squad {
  id: ImportSource;
  name: string;
  kind: "primer" | "filial" | "ojeados";
  /** Edad máxima del filial (Sub-18 → 18, Sub-21 → 21). null = sin límite (equipo B). */
  maxAge: number | null;
  /** true si juega una liga competitiva de verdad (equipo B), no liga juvenil. */
  competitive: boolean;
}

export interface ImportResult {
  players: Player[];
  /** Cabeceras originales en orden. */
  headers: string[];
  /** Primera fila de datos sin procesar, para mostrar ejemplos por columna. */
  sampleRow: string[];
  /** Cabecera → clave reconocida (atributo o campo). */
  mapping: Record<string, string | null>;
  unmappedHeaders: string[];
  missingAttrs: AttrKey[];
  droppedRows: number;
}
