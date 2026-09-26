/**
 * Radiografía: estado de la plantilla hoy y dentro de una y dos temporadas.
 * Cada hueco de la táctica con su titular, su suplente real (segundo XI) y el
 * juvenil más cercano, coloreado por profundidad y necesidad. El horizonte
 * aplica la edad (declive físico a partir de los 30; porteros, a partir de
 * los 33) y quita a los que acaban contrato o están en venta. Encima, la
 * preparación para el estilo, el percentil de liga y los sueldos; al final,
 * la lista de acciones antes de la ventana.
 */

import type { AttrKey } from "./attributes";
import { FAMILIES, familyOf, familyOfSlot, leagueLevelPercentile, percentile, type Family, type LeagueStats } from "./league";
import { POSITION_LABEL, type RoleDef } from "./roles";
import { bestRoles, scoreRole } from "./scoring";
import { bestYouth, fmtMoney, overpaidPlayers, squadNeeds, type SquadNeed } from "./scouting";
import { STYLE_BY_ID, STYLE_PRESETS, styleChildren, type EvolutionReq, type StylePreset } from "./stylePresets";
import { styleGaps, type GapResult } from "./styles";
import { buildLineup, depthMap, familiarity, type DepthTone, type LineupResult, type SlotCandidate, type Tactic } from "./tactics";
import type { FormationSlot } from "./formations";
import type { Player, PositionSlot } from "./types";

export type Unit = "def" | "mid" | "att";
export const UNIT_LABEL: Record<Unit, string> = { def: "Defensa", mid: "Medio campo", att: "Ataque" };

/** Grupos de atributos por unidad (los usa Rival para comparar líneas). */
export const CLUSTERS: { id: string; label: string; keys: AttrKey[] }[] = [
  { id: "vel", label: "Velocidad", keys: ["Pac", "Acc"] },
  { id: "aer", label: "Juego aéreo", keys: ["Hea", "Jum"] },
  { id: "tec", label: "Técnica", keys: ["Fir", "Tec", "Pas"] },
  { id: "men", label: "Mentales", keys: ["Ant", "Dec", "Pos", "Cmp"] },
  { id: "fis", label: "Físico", keys: ["Sta", "Str", "Wor"] },
  { id: "def", label: "Defensa", keys: ["Mar", "Tck", "Pos"] },
  { id: "cre", label: "Creación", keys: ["Vis", "Pas", "Dri"] },
  { id: "gol", label: "Gol", keys: ["Fin", "OtB", "Cmp"] },
];

export function unitOfSlot(s: PositionSlot): Unit | null {
  if (s === "GK") return null;
  if (s.startsWith("D") && !s.startsWith("DM")) return "def";
  if (s.startsWith("WB")) return "def";
  if (s.startsWith("DM") || s.startsWith("M")) return "mid";
  return "att";
}

export function unitOfPlayer(p: Player): Unit | null {
  const s = p.position.slots[0];
  return s ? unitOfSlot(s) : null;
}

// ---------------------------------------------------------------------------
// Horizonte: edad y contratos
// ---------------------------------------------------------------------------

export type Horizon = 0 | 1 | 2;
export const HORIZONS: Horizon[] = [0, 1, 2];
export const HORIZON_LABEL: Record<Horizon, string> = { 0: "Hoy", 1: "Próxima temporada", 2: "Dentro de dos" };

/** «2028/29» para la temporada del horizonte (gameYear = año en que acaba la actual). */
export function seasonLabel(gameYear: number | null, h: Horizon): string | null {
  return gameYear == null ? null : `${gameYear - 1 + h}/${String(gameYear + h).slice(2)}`;
}

/**
 * Declive por cada temporada que se cumple con esa edad. Los atributos
 * técnicos y mentales se mantienen; los físicos caen a partir de los 30 y
 * más deprisa desde los 32. Los porteros van tres años por detrás.
 */
const DECLINE: { from: number; to: number; attrs: AttrKey[]; per: number }[] = [
  { from: 30, to: 31, attrs: ["Acc", "Pac", "Agi"], per: 0.5 },
  { from: 32, to: 33, attrs: ["Acc", "Pac", "Agi", "Sta", "Bal", "Jum"], per: 1 },
  { from: 34, to: 99, attrs: ["Acc", "Pac", "Agi", "Sta", "Bal", "Jum"], per: 1.5 },
  { from: 34, to: 99, attrs: ["Str"], per: 0.5 },
];
const GK_DECLINE_SHIFT = 3;

export interface Projection {
  player: Player;
  /** Atributos que bajan y cuánto. */
  changes: { key: AttrKey; from: number; to: number }[];
}

/** El jugador dentro de `years` temporadas: más viejo y, desde los 30, más lento. No se proyecta el crecimiento. */
export function projectPlayer(p: Player, years: number): Projection {
  if (years <= 0) return { player: p, changes: [] };
  const drop: Partial<Record<AttrKey, number>> = {};
  const age = p.age ?? 25;
  for (let y = 1; y <= years; y++) {
    const a = age + y - (p.isGoalkeeper ? GK_DECLINE_SHIFT : 0);
    for (const row of DECLINE) if (a >= row.from && a <= row.to) for (const k of row.attrs) drop[k] = (drop[k] ?? 0) + row.per;
  }
  const attrs = { ...p.attrs };
  const changes: Projection["changes"] = [];
  for (const [k, d] of Object.entries(drop) as [AttrKey, number][]) {
    const v = attrs[k];
    if (!v) continue;
    const to = Math.max(1, v.value - d);
    attrs[k] = { ...v, value: to, min: Math.max(1, v.min - d), max: Math.max(1, v.max - d) };
    changes.push({ key: k, from: v.value, to });
  }
  return { player: { ...p, age: p.age != null ? p.age + years : null, attrs }, changes };
}

export function expiryYear(p: Player): number | null {
  const m = /(\d{4})/.exec(p.contractExpiry ?? "");
  return m ? Number(m[1]) : null;
}

export interface Departure {
  player: Player;
  why: "contrato" | "transferible";
  text: string;
}

export interface HorizonOptions {
  /** Los que acaban contrato antes del horizonte cuentan como salidas (si no renuevas). */
  contractsLeave: boolean;
  /** Los transferibles cuentan como salidas. */
  listedLeave: boolean;
}

export const DEFAULT_HORIZON_OPTIONS: HorizonOptions = { contractsLeave: true, listedLeave: true };

/** Quién ya no está en la temporada del horizonte. */
export function departures(firstTeam: Player[], gameYear: number | null, h: Horizon, opts: HorizonOptions = DEFAULT_HORIZON_OPTIONS): Departure[] {
  if (h === 0) return [];
  const out: Departure[] = [];
  for (const p of firstTeam) {
    const exp = expiryYear(p);
    if (opts.contractsLeave && gameYear != null && exp != null && exp <= gameYear + h - 1) out.push({ player: p, why: "contrato", text: `acaba contrato en ${exp}` });
    else if (opts.listedLeave && /listado|transferible/i.test(p.transferStatus ?? "")) out.push({ player: p, why: "transferible", text: "está en la lista de transferibles" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Estado por hueco
// ---------------------------------------------------------------------------

export interface SlotState {
  slotId: string;
  slot: FormationSlot;
  role: RoleDef;
  starter: SlotCandidate | null;
  /** Suplente real: quien juega ese hueco en el segundo XI. */
  backup: SlotCandidate | null;
  /** Puntos del titular al suplente. */
  gap: number | null;
  depthTone: DepthTone;
  need: SquadNeed;
  /** Semáforo del hueco: rojo si es urgente, ámbar si es mejorable, de sucesión o con el suplente lejos. */
  tone: DepthTone;
  /** Mejor juvenil de los filiales que domina el puesto. */
  youth: { player: Player; effective: number } | null;
  /** Percentil del titular en la liga, entre los de la familia del hueco. */
  leaguePct: number | null;
  /** Sueldo del titular más el del suplente. */
  wage: number;
  /** El titular de hoy ya no está en este horizonte. */
  lost: Departure | null;
  /** Puntos que pierde el titular por la edad respecto a hoy. */
  decline: number | null;
  /** El contrato del titular vence al acabar la temporada del horizonte. */
  expiring: boolean;
}

export interface SquadState {
  horizon: Horizon;
  season: string | null;
  lineup: LineupResult;
  slots: SlotState[];
  departures: Departure[];
  /** Titulares y suplentes que pierden atributos por la edad. */
  declines: { player: Player; changes: Projection["changes"] }[];
  counts: Record<DepthTone, number>;
  needs: SquadNeed[];
}

export interface StateContext {
  gameYear: number | null;
  youth: Player[];
  league: LeagueStats | null;
  traits?: Record<string, string[]>;
  options?: HorizonOptions;
}

/** Percentil en la liga del jugador entre los de la familia del hueco que ocupa. */
export function slotLeaguePct(league: LeagueStats | null, slot: PositionSlot, p: Player | null | undefined): number | null {
  if (!league || !p) return null;
  const best = bestRoles(p, 1)[0];
  return best ? percentile(league.byFamily[familyOfSlot(slot)].level, best.score) : leagueLevelPercentile(league, p);
}

export function slotTone(depth: DepthTone, need: SquadNeed): DepthTone {
  if (need.level === "urgente" || depth === "poor") return "poor";
  if (need.level !== "cubierto" || depth === "ok") return "ok";
  return "good";
}

/** Estado de la plantilla en un horizonte: la plantilla proyectada, su XI, su segundo XI y sus necesidades. */
export function squadState(tactic: Tactic, firstTeam: Player[], h: Horizon, ctx: StateContext): SquadState {
  const opts = ctx.options ?? DEFAULT_HORIZON_OPTIONS;
  const gone = departures(firstTeam, ctx.gameYear, h, opts);
  const goneUid = new Map(gone.map((d) => [d.player.uid, d]));
  const projections = firstTeam.filter((p) => !goneUid.has(p.uid)).map((p) => projectPlayer(p, h));
  const squad = projections.map((x) => x.player);
  const youth = ctx.youth.map((p) => projectPlayer(p, h).player);
  const gameYear = ctx.gameYear != null ? ctx.gameYear + h : null;
  const { lineup, needs } = squadNeeds(tactic, squad, gameYear, { traits: ctx.traits, youth, league: ctx.league });
  const depth = depthMap(tactic, squad);
  const today = h === 0 ? lineup : buildLineup(tactic, firstTeam);
  const original = new Map(firstTeam.map((p) => [p.uid, p]));

  const slots: SlotState[] = lineup.slots.map((s, i) => {
    const d = depth[i];
    const need = needs[i];
    const starter = s.starter;
    const was = today.slots[i]?.starter?.player;
    const orig = starter ? original.get(starter.player.uid) : undefined;
    const decline = h > 0 && starter && orig ? scoreRole(orig, s.role).score * familiarity(orig, s.slot.slot) - starter.effective : null;
    const exp = starter ? expiryYear(starter.player) : null;
    return {
      slotId: s.slot.id,
      slot: s.slot,
      role: s.role,
      starter,
      backup: d.backup,
      gap: d.gap,
      depthTone: d.tone,
      need,
      tone: slotTone(d.tone, need),
      youth: bestYouth(youth, s.slot.slot, s.role) ?? null,
      leaguePct: slotLeaguePct(ctx.league, s.slot.slot, starter?.player),
      wage: (starter?.player.wage ?? 0) + (d.backup?.player.wage ?? 0),
      lost: was ? goneUid.get(was.uid) ?? null : null,
      decline: decline != null && decline > 0.05 ? decline : null,
      expiring: gameYear != null && exp != null && exp <= gameYear,
    };
  });

  const inXis = new Set(slots.flatMap((s) => [s.starter?.player.uid, s.backup?.player.uid]).filter(Boolean) as string[]);
  const declines = projections.filter((x) => x.changes.length && inXis.has(x.player.uid)).map((x) => ({ player: x.player, changes: x.changes }));
  const counts: Record<DepthTone, number> = { good: 0, ok: 0, poor: 0 };
  for (const s of slots) counts[s.tone]++;
  return { horizon: h, season: seasonLabel(ctx.gameYear, h), lineup, slots, departures: gone, declines, counts, needs };
}

// ---------------------------------------------------------------------------
// Preparación para el estilo
// ---------------------------------------------------------------------------

export interface StyleGap extends GapResult {
  /** Huecos que no llegan (vacío si el requisito es de todo el XI). */
  slotIds: string[];
}

export interface StyleReadiness {
  style: StylePreset;
  current: boolean;
  gaps: StyleGap[];
  missing: number;
}

function meanOf(p: Player, keys: readonly AttrKey[]): number {
  const vals = keys.map((k) => p.attrs[k]?.value).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

/** Huecos del XI que fallan un requisito de atributos del estilo. */
export function gapSlots(req: EvolutionReq, lineup: LineupResult): string[] {
  if (req.kind !== "attr") return [];
  return lineup.slots
    .filter((s) => s.starter && (req.positions === "xi" ? true : req.positions === "campo" ? s.slot.slot !== "GK" : req.positions.includes(s.slot.slot)))
    .filter((s) => meanOf(s.starter!.player, req.attrs) < req.min)
    .map((s) => s.slot.id);
}

/**
 * Lo que falta para el estilo de la táctica y para los que salen de él. Sin
 * estilo elegido, los más cercanos.
 */
export function styleReadiness(tactic: Tactic, lineup: LineupResult, limit = 6): StyleReadiness[] {
  const withGaps = (style: StylePreset, current: boolean): StyleReadiness => {
    const gaps = styleGaps(style, lineup).map((g) => ({ ...g, slotIds: g.ok ? [] : gapSlots(g.req, lineup) }));
    return { style, current, gaps, missing: gaps.filter((g) => !g.ok).length };
  };
  const cur = tactic.styleId ? STYLE_BY_ID[tactic.styleId] : undefined;
  if (cur) return [withGaps(cur, true), ...styleChildren(cur.id).map((s) => withGaps(s, false))];
  return STYLE_PRESETS.map((s) => withGaps(s, false)).sort((a, b) => a.missing - b.missing).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Frente a la liga
// ---------------------------------------------------------------------------

export interface LeagueComparison {
  family: Family;
  /** Percentil medio de tus jugadores de esa familia dentro de la liga. */
  meanPercentile: number | null;
  players: { player: Player; percentile: number | null }[];
}

/**
 * Familia de cada jugador para compararlo con la liga: los titulares, por el
 * hueco que ocupan en la táctica (un MC que juega de mediapunta se compara con
 * los mediapuntas); el resto, por su primera posición.
 */
export function leagueComparison(firstTeam: Player[], league: LeagueStats, lineup: LineupResult | null = null): LeagueComparison[] {
  const slotOf = new Map<string, PositionSlot>();
  if (lineup) for (const s of lineup.slots) if (s.starter) slotOf.set(s.starter.player.uid, s.slot.slot);
  const famOf = (p: Player) => { const s = slotOf.get(p.uid); return s ? familyOfSlot(s) : familyOf(p); };
  return FAMILIES.map((family) => {
    const players = firstTeam.filter((p) => famOf(p) === family).map((p) => {
      const best = bestRoles(p, 1)[0];
      // Percentil del nivel dentro de la familia donde juega, no de la suya natural
      const pct = best ? percentile(league.byFamily[family].level, best.score) : leagueLevelPercentile(league, p);
      return { player: p, percentile: pct };
    }).sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0));
    const vals = players.map((x) => x.percentile).filter((v): v is number => v != null);
    return { family, meanPercentile: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, players };
  });
}

// ---------------------------------------------------------------------------
// Economía
// ---------------------------------------------------------------------------

export interface WageSummary {
  total: number;
  byUnit: { unit: Unit | "gk"; label: string; total: number; count: number }[];
  /** Jugadores que no son titulares ni suplentes reales, con lo que cobran. */
  outside: Player[];
  outsideTotal: number;
}

export function wageSummary(firstTeam: Player[], state: SquadState | null): WageSummary {
  const withWage = firstTeam.filter((p) => p.wage != null);
  const total = withWage.reduce((s, p) => s + (p.wage ?? 0), 0);
  const groups: { unit: Unit | "gk"; label: string }[] = [{ unit: "gk", label: "Porteros" }, { unit: "def", label: "Defensa" }, { unit: "mid", label: "Medio campo" }, { unit: "att", label: "Ataque" }];
  const byUnit = groups.map((g) => {
    const ps = withWage.filter((p) => (p.isGoalkeeper ? g.unit === "gk" : unitOfPlayer(p) === g.unit));
    return { ...g, total: ps.reduce((s, p) => s + (p.wage ?? 0), 0), count: ps.length };
  });
  const inXis = new Set(state ? state.slots.flatMap((s) => [s.starter?.player.uid, s.backup?.player.uid]).filter(Boolean) as string[] : []);
  const outside = state ? withWage.filter((p) => !inXis.has(p.uid)).sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0)) : [];
  return { total, byUnit, outside, outsideTotal: outside.reduce((s, p) => s + (p.wage ?? 0), 0) };
}

// ---------------------------------------------------------------------------
// Lista de acciones
// ---------------------------------------------------------------------------

export type ActionKind = "renovar" | "salida" | "subir" | "fichar" | "planificar" | "estilo";
export const ACTION_LABEL: Record<ActionKind, string> = { renovar: "Renovar", salida: "Salida", subir: "Subir del filial", fichar: "Fichar", planificar: "Planificar", estilo: "Estilo" };
const ACTION_ORDER: ActionKind[] = ["renovar", "subir", "fichar", "salida", "planificar", "estilo"];

export interface SquadAction {
  kind: ActionKind;
  title: string;
  why: string;
  href: string;
  horizon: Horizon;
  slotId?: string;
}

export interface ActionContext {
  firstTeam: Player[];
  gameYear: number | null;
  /** Nombre del filial de cada juvenil. */
  youthSquad: Map<string, string>;
  style: StyleReadiness | null;
}

const posName = (s: SlotState) => `${POSITION_LABEL[s.slot.slot]} (${s.role.es})`;

/** Renovar, dejar salir, subir del filial, fichar y planificar, a partir de los tres horizontes. */
export function squadActions(states: SquadState[], ctx: ActionContext): SquadAction[] {
  const out: SquadAction[] = [];
  const today = states[0];
  if (!today) return out;
  const done = new Set<string>();
  const roleOf = new Map<string, { s: SlotState; as: "titular" | "suplente" }>();
  for (const s of today.slots) {
    if (s.backup) roleOf.set(s.backup.player.uid, { s, as: "suplente" });
    if (s.starter) roleOf.set(s.starter.player.uid, { s, as: "titular" });
  }

  // El tercer portero hace falta aunque no juegue: el más barato de los que quedan fuera
  const spareGk = ctx.firstTeam.filter((p) => p.isGoalkeeper && !roleOf.has(p.uid)).sort((a, b) => (a.wage ?? 0) - (b.wage ?? 0))[0];
  if (spareGk) done.add(spareGk.uid);

  // Transferibles: ya has decidido venderlos
  for (const p of ctx.firstTeam) {
    if (done.has(p.uid) || !/listado|transferible/i.test(p.transferStatus ?? "")) continue;
    done.add(p.uid);
    const r = roleOf.get(p.uid);
    const exp = expiryYear(p);
    const free = ctx.gameYear != null && exp != null && exp <= ctx.gameYear;
    out.push({ kind: "salida", title: `Vender ya a ${p.name}`, why: `Está en la lista de transferibles${free ? ` y su contrato vence en ${exp}: en verano se va libre` : ""}.${r ? ` Es el ${r.as === "titular" ? "titular" : "suplente real"} de ${posName(r.s)}: ten el relevo antes de venderlo.` : ""}`, href: "/plantilla", horizon: 0, slotId: r?.s.slotId });
  }

  // Contratos: renovar a los que juegan, dejar salir al resto
  if (ctx.gameYear != null) {
    for (const p of ctx.firstTeam) {
      const exp = expiryYear(p);
      if (done.has(p.uid) || exp == null || exp > ctx.gameYear + 1) continue;
      const h: Horizon = exp <= ctx.gameYear ? 0 : 1;
      const r = roleOf.get(p.uid);
      done.add(p.uid);
      if (r && (p.age ?? 0) >= 32) out.push({ kind: "renovar", title: `Renovar a ${p.name} solo por un año`, why: `${r.as === "titular" ? "Titular" : "Suplente real"} de ${posName(r.s)} con ${p.age} años; vence en ${exp}. Contrato corto y a la baja: a esa edad el físico cae cada temporada.`, href: "/plantilla", horizon: h, slotId: r.s.slotId });
      else if (r) out.push({ kind: "renovar", title: `Renovar a ${p.name}`, why: `${r.as === "titular" ? "Titular" : "Suplente real"} de ${posName(r.s)}; vence en ${exp}.${h === 0 ? " Si no renueva, desde enero puede negociar con otros clubes." : ""}`, href: "/plantilla", horizon: h, slotId: r.s.slotId });
      else out.push({ kind: "salida", title: `Dejar salir a ${p.name}`, why: `No entra en ninguno de los dos XI y su contrato vence en ${exp}.${h === 1 ? " Si quieres sacar algo, véndelo esta temporada." : " Se va libre."}`, href: "/plantilla", horizon: h });
    }
  }

  // Fuera de los dos XI: vender o ceder
  const outside = ctx.firstTeam.filter((p) => !roleOf.has(p.uid) && !done.has(p.uid)).sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0));
  for (const p of outside) {
    done.add(p.uid);
    if ((p.age ?? 99) <= 21) out.push({ kind: "salida", title: `Ceder a ${p.name}`, why: `Con ${p.age} años no entra en ninguno de los dos XI: necesita minutos fuera.`, href: "/juveniles", horizon: 0 });
    else out.push({ kind: "salida", title: `Vender a ${p.name}`, why: `No entra en ninguno de los dos XI${p.wage ? ` y cobra ${fmtMoney(p.wage)}` : ""}.`, href: "/plantilla", horizon: 0 });
  }
  for (const o of overpaidPlayers(ctx.firstTeam, today.lineup)) {
    if (done.has(o.player.uid)) continue;
    done.add(o.player.uid);
    out.push({ kind: "salida", title: `Vender a ${o.player.name}`, why: `Cobra por encima de lo que aporta: ${o.wageRank}º sueldo de la plantilla y ${o.levelRank}º nivel.`, href: "/plantilla", horizon: 0 });
  }

  // Subir del filial: el juvenil supera al suplente real y está a 15 puntos del titular como mucho, o es el relevo en casa
  const slotDone = new Map<string, Horizon>();
  const covered = (slotId: string, h: Horizon) => { const at = slotDone.get(slotId); return at != null && at <= h; };
  const mark = (slotId: string, h: Horizon) => { if (!covered(slotId, h)) slotDone.set(slotId, h); };
  for (const st of states) {
    for (const s of st.slots) {
      const y = s.youth;
      if (!y || done.has(y.player.uid)) continue;
      const st11 = s.starter?.effective ?? 0;
      const beatsBackup = y.effective > (s.backup?.effective ?? 0) + 1 && y.effective >= st11 - 15;
      const relief = s.need.reasons.some((r) => r.startsWith("Relevo en casa"));
      if (!beatsBackup && !relief) continue;
      done.add(y.player.uid);
      mark(s.slotId, st.horizon);
      const squad = ctx.youthSquad.get(y.player.uid);
      const when = st.horizon ? ` en ${st.season ?? HORIZON_LABEL[st.horizon].toLowerCase()}` : "";
      out.push({
        kind: "subir",
        title: `Subir a ${y.player.name}${squad ? ` (${squad})` : ""}`,
        why: relief && s.starter
          ? `${posName(s)}${when}: relevo de ${s.starter.player.name} (${s.starter.player.age} años), a ${Math.max(0, Math.round(st11 - y.effective))} puntos de él.`
          : `${posName(s)}${when}: ${Math.round(y.effective)} frente a ${s.backup ? `${Math.round(s.backup.effective)} del suplente real (${s.backup.player.name})` : "nadie en el segundo XI"}.`,
        href: "/juveniles",
        horizon: st.horizon,
        slotId: s.slotId,
      });
    }
  }

  // Fichar hoy lo urgente o mejorable
  for (const s of today.slots) {
    if (s.need.level !== "urgente" && s.need.level !== "mejorable") continue;
    if (covered(s.slotId, 0)) continue;
    mark(s.slotId, 0);
    out.push({ kind: "fichar", title: `Fichar para ${posName(s)}`, why: s.need.reasons[0] ?? "", href: "/ojeados", horizon: 0, slotId: s.slotId });
  }

  // Planificar: huecos que están bien hoy y se ponen en rojo más adelante
  for (const st of states.slice(1)) {
    for (const s of st.slots) {
      const now = today.slots.find((x) => x.slotId === s.slotId);
      if (s.tone !== "poor" || now?.tone === "poor" || covered(s.slotId, st.horizon)) continue;
      mark(s.slotId, st.horizon);
      const cause = s.lost ? `${s.lost.player.name} ${s.lost.text}. ` : s.decline != null && s.decline >= 2 ? `${s.starter?.player.name} pierde ${s.decline.toFixed(1)} puntos por la edad. ` : "";
      out.push({ kind: "planificar", title: `Planificar ${posName(s)} para ${st.season ?? HORIZON_LABEL[st.horizon].toLowerCase()}`, why: `${cause}${s.need.reasons[0] ?? ""}`, href: "/ojeados", horizon: st.horizon, slotId: s.slotId });
    }
  }

  // Lo que falta para el estilo de la táctica
  if (ctx.style?.current) {
    for (const g of ctx.style.gaps.filter((x) => !x.ok)) {
      out.push({ kind: "estilo", title: `${ctx.style.style.name}: ${g.req.label}`, why: g.detail, href: g.req.kind === "role" ? "/tactica" : "/ojeados", horizon: 0 });
    }
  }

  return out.sort((a, b) => a.horizon - b.horizon || ACTION_ORDER.indexOf(a.kind) - ACTION_ORDER.indexOf(b.kind));
}
