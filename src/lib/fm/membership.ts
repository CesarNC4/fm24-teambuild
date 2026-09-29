/**
 * Cada jugador está en una sola plantilla de club. Tu primer equipo, tus
 * filiales y los rivales son plantillas de club: al importar una, los
 * jugadores que trae dejan de estar en las demás. Así, un juvenil que sube de
 * la Sub-21 al primer equipo, un fichaje entre rivales o un jugador que
 * compras a un rival no se duplican, y no hace falta volver a importarlo todo.
 * Por UID manda siempre la importación más reciente.
 *
 * Ojeados y la búsqueda de liga no son plantillas sino listas: pueden repetir
 * jugadores de cualquier club y no mueven a nadie.
 *
 * Los cedidos siguen siendo del club que los cede: un jugador marcado como
 * cedido («Cedido en otro club», Inf «Ced») no se quita de su club ni reclama
 * el sitio en el club que lo exporta como cedido.
 */

import type { Player, Squad } from "./types";

export function isClubSquad(q: Squad | undefined): boolean {
  return !!q && (q.kind === "primer" || q.kind === "filial" || q.kind === "rival");
}

/** Cedido a otro club desde la plantilla que lo exporta. */
export function isLoanedOut(p: Player): boolean {
  return /cedido/i.test(p.playingTime ?? "") || /^ced/i.test(p.info ?? "");
}

export interface Move {
  uid: string;
  name: string;
  /** Plantilla de la que sale. */
  from: string;
}

/** Jugadores de la importación nueva que ya estaban en otra plantilla de club y salen de ella. */
export function movesOnImport(players: Record<string, Player[]>, squads: Squad[], source: string, incoming: Player[]): Move[] {
  if (!isClubSquad(squads.find((q) => q.id === source))) return [];
  const claim = new Map(incoming.filter((p) => !isLoanedOut(p)).map((p) => [p.uid, p]));
  const out: Move[] = [];
  for (const q of squads) {
    if (q.id === source || !isClubSquad(q)) continue;
    for (const p of players[q.id] ?? []) {
      if (claim.has(p.uid) && !isLoanedOut(p)) out.push({ uid: p.uid, name: claim.get(p.uid)!.name, from: q.id });
    }
  }
  return out;
}

/** Aplica los movimientos: quita a esos jugadores de las plantillas donde estaban. */
export function applyMoves(players: Record<string, Player[]>, moves: Move[]): Record<string, Player[]> {
  if (!moves.length) return players;
  const out = { ...players };
  const bySource = new Map<string, Set<string>>();
  for (const m of moves) bySource.set(m.from, (bySource.get(m.from) ?? new Set()).add(m.uid));
  for (const [src, uids] of bySource) out[src] = (out[src] ?? []).filter((p) => !uids.has(p.uid));
  return out;
}

/**
 * Limpia duplicados ya guardados: si un jugador está en dos plantillas de
 * club, se queda en la importada más recientemente.
 */
export function dedupeClubSquads(players: Record<string, Player[]>, squads: Squad[], imports: Record<string, { importedAt: string } | null>): { players: Record<string, Player[]>; moves: Move[] } {
  const clubSquads = squads.filter((q) => isClubSquad(q) && (players[q.id]?.length ?? 0) > 0)
    .sort((a, b) => (imports[b.id]?.importedAt ?? "").localeCompare(imports[a.id]?.importedAt ?? ""));
  const owner = new Map<string, string>();
  const moves: Move[] = [];
  for (const q of clubSquads) {
    for (const p of players[q.id]) {
      if (isLoanedOut(p)) continue;
      const own = owner.get(p.uid);
      if (own) moves.push({ uid: p.uid, name: p.name, from: q.id });
      else owner.set(p.uid, q.id);
    }
  }
  return { players: applyMoves(players, moves), moves };
}
