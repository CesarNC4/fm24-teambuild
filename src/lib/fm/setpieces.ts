/**
 * Balón parado y capitanes a partir del XI titular.
 *
 * Lanzadores por atributos (Córners, Faltas, Penaltis, Saques largos) con la
 * regla habitual de no gastar al mejor rematador aéreo en lanzar; rematadores
 * por juego aéreo; capitán por liderazgo, determinación, personalidad,
 * edad y estatus.
 */

import type { AttrKey } from "./attributes";
import { personalityTierLevel } from "./personalities";
import type { LineupResult } from "./tactics";
import type { Player } from "./types";

const a = (p: Player, k: AttrKey) => p.attrs[k]?.value ?? 0;

export interface Taker {
  player: Player;
  score: number;
  note?: string;
}

export interface SetPiecePlan {
  cornersLeft: Taker[];
  cornersRight: Taker[];
  freeKicksDirect: Taker[];
  freeKicksIndirect: Taker[];
  penalties: Taker[];
  longThrows: Taker[];
  /** Rematadores en córners y faltas a favor. */
  aerialTargets: Taker[];
  /** Quién se queda arriba / en el borde en córners a favor. */
  stayBack: Taker[];
  edgeOfBox: Taker[];
  /** Marcadores aéreos en córners en contra. */
  aerialDefenders: Taker[];
  /** Rutina de arrastre (PDF de balón parado): mejor rematador al primer palo, dos al segundo, uno alto estorbando al portero. */
  routine: { nearPost: Taker | null; farPost: Taker[]; onKeeper: Taker | null; ideal: Taker[] };
  notes: string[];
}

/**
 * Perfil del rematador ideal de córner (PDF de balón parado): Salto 16-17,
 * Fuerza 15-16, Cabeceo 15 y más de 1,90; Anticipación y Colocación como
 * secundarios. Devuelve 0-20 aproximado.
 */
export function headerProfile(p: Player): number {
  const h = p.height ?? 180;
  const heightScore = Math.max(0, Math.min(20, 8 + (h - 175) * 0.6));
  return a(p, "Jum") * 0.3 + a(p, "Str") * 0.2 + a(p, "Hea") * 0.25 + heightScore * 0.15 + a(p, "Ant") * 0.05 + a(p, "Pos") * 0.05;
}

function starters(lineup: LineupResult): Player[] {
  return lineup.slots.filter((s) => s.starter).map((s) => s.starter!.player);
}

export function setPiecePlan(lineup: LineupResult): SetPiecePlan {
  const xi = starters(lineup).filter((p) => !p.isGoalkeeper);
  const gk = starters(lineup).find((p) => p.isGoalkeeper) ?? null;
  const notes: string[] = [];
  const top = (score: (p: Player) => number, n = 3, pool = xi): Taker[] =>
    pool.map((p) => ({ player: p, score: score(p) })).sort((x, y) => y.score - x.score).slice(0, n);

  const aerial = (p: Player) => a(p, "Hea") * 0.5 + a(p, "Jum") * 0.35 + a(p, "Str") * 0.15;
  const aerialTargets = top(aerial, 4);
  const targetSet = new Set(aerialTargets.slice(0, 2).map((t) => t.player.uid));

  // Lanzadores: córners con la pierna correspondiente (rosca hacia dentro desde
  // la derecha = zurdo; desde la izquierda = diestro) si el jugador la tiene.
  const foot = (p: Player, side: "L" | "R") => {
    const f = side === "L" ? p.leftFoot : p.rightFoot;
    return /muy fuerte|fuerte|very strong|strong|bastante/i.test(f ?? "") ? 1 : 0.85;
  };
  const cornerScore = (side: "L" | "R") => (p: Player) => {
    let s = (a(p, "Cor") * 0.7 + a(p, "Tec") * 0.15 + a(p, "Vis") * 0.15) * foot(p, side === "L" ? "R" : "L");
    if (targetSet.has(p.uid)) s -= 3; // no gastar al rematador
    return s;
  };
  const cornersLeft = top(cornerScore("L"));
  const cornersRight = top(cornerScore("R"));
  for (const t of [...cornersLeft.slice(0, 1), ...cornersRight.slice(0, 1)]) if (targetSet.has(t.player.uid)) t.note = "es tu mejor rematador: si lanza él, pierdes su remate";

  const freeKicksDirect = top((p) => a(p, "Fre") * 0.6 + a(p, "Lon") * 0.25 + a(p, "Tec") * 0.15);
  const freeKicksIndirect = top((p) => a(p, "Fre") * 0.5 + a(p, "Cro") * 0.25 + a(p, "Vis") * 0.25);
  const penalties = top((p) => a(p, "Pen") * 0.7 + a(p, "Cmp") * 0.2 + a(p, "Fin") * 0.1);
  const longThrows = top((p) => a(p, "L Th") * 0.8 + a(p, "Str") * 0.2);
  if ((longThrows[0]?.score ?? 0) < 12) notes.push("Nadie con saque de banda largo ≥12: no montes jugadas de saque largo.");
  if ((freeKicksDirect[0]?.score ?? 0) < 12) notes.push("Sin lanzador de faltas directas fiable (<12): en las faltas lejanas, centra en vez de tirar.");

  // Quién no sube a rematar: los más rápidos y los de peor juego aéreo
  const stayBack = top((p) => a(p, "Pac") * 0.4 + a(p, "Acc") * 0.3 + a(p, "Ant") * 0.3 - aerial(p) * 0.3, 2);
  const edgeOfBox = top((p) => a(p, "Lon") * 0.5 + a(p, "Fir") * 0.2 + a(p, "Tec") * 0.3 - aerial(p) * 0.2, 2, xi.filter((p) => !targetSet.has(p.uid)));
  const aerialDefenders = top((p) => a(p, "Hea") * 0.35 + a(p, "Jum") * 0.3 + a(p, "Mar") * 0.2 + a(p, "Str") * 0.15, 4);
  // Rutina de arrastre
  const ideal = top(headerProfile, 4);
  const nearPost = ideal[0] ?? null;
  const farPost = ideal.slice(1, 3);
  const onKeeper = xi.filter((p) => !ideal.slice(0, 3).some((t) => t.player.uid === p.uid)).map((p) => ({ player: p, score: (p.height ?? 0) * 0.08 + a(p, "Str") * 0.5 + a(p, "Bra") * 0.3 })).sort((x, y) => y.score - x.score)[0] ?? null;
  if (nearPost && headerProfile(nearPost.player) >= 16) notes.push(`${nearPost.player.name} tiene el perfil de rematador de córner del PDF (Salto ${a(nearPost.player, "Jum")}, Fuerza ${a(nearPost.player, "Str")}, Cabeceo ${a(nearPost.player, "Hea")}${nearPost.player.height ? `, ${nearPost.player.height} cm` : ""}): un central así vale 12+ goles por temporada. Rutina al primer palo con él y frecuencia alta.`);
  if (gk && a(gk, "Aer") < 11) notes.push(`${gk.name} tiene juego aéreo ${a(gk, "Aer")}: en córners en contra, marca al primer palo y en zona, no le dejes salir a por todo.`);
  else if (gk && a(gk, "Aer") >= 15) notes.push(`${gk.name} domina el área (${a(gk, "Aer")}): puede salir a los centros; marca en zona.`);

  return { cornersLeft, cornersRight, freeKicksDirect, freeKicksIndirect, penalties, longThrows, aerialTargets, stayBack, edgeOfBox, aerialDefenders, routine: { nearPost, farPost, onKeeper, ideal }, notes };
}

export interface CaptainCandidate {
  player: Player;
  score: number;
  reasons: string[];
  warnings: string[];
}

/** Capitán y segundo capitán entre toda la plantilla (no solo el XI). */
export function captainCandidates(players: Player[], lineup: LineupResult | null): CaptainCandidate[] {
  const xi = new Set(lineup ? starters(lineup).map((p) => p.uid) : []);
  return players
    .map((p) => {
      const ldr = a(p, "Ldr"), det = a(p, "Det");
      const tier = personalityTierLevel(p.personality);
      const age = p.age ?? 25;
      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = ldr * 3 + det * 1.2 + tier * 1.5;
      if (ldr >= 15) reasons.push(`Liderazgo ${ldr}`);
      if (det >= 15) reasons.push(`Determinación ${det}`);
      if (tier >= 6) reasons.push(`personalidad ${p.personality}`);
      if (age >= 27) { score += 4; reasons.push(`${age} años`); } else if (age <= 23) { score -= 6; warnings.push("demasiado joven para el vestuario"); }
      if (xi.has(p.uid)) { score += 6; reasons.push("titular"); } else warnings.push("no es titular: el brazalete pesa menos desde el banquillo");
      if (/estrella|importante|titular habitual|star|important|regular/i.test(p.playingTime ?? "")) score += 3;
      if (tier <= 2) { score -= 10; warnings.push(`personalidad ${p.personality}`); }
      if (/ambicios|mercenari|voluble|ambitious|mercenary|fickle/i.test(p.personality ?? "")) warnings.push("lealtad baja: puede pedir salir con el brazalete puesto");
      if (/provocar|irascible|vol[aá]til|confrontational|volatile/i.test(p.mediaHandling ?? "")) { score -= 4; warnings.push("prensa conflictiva"); }
      const exp = /(\d{4})/.exec(p.contractExpiry ?? "")?.[1];
      if (exp) reasons.push(`contrato hasta ${exp}`);
      return { player: p, score, reasons, warnings };
    })
    .sort((x, y) => y.score - x.score);
}
