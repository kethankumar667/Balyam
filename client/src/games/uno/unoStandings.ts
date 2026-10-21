import type { Player, UnoPlayerState } from "@shared/types";

/** One line of the final standings, with everything the results screen shows about a seat. */
export interface UnoStanding {
  id: string;
  name: string;
  /** The seat's player, for the avatar, bot profile and cosmetics. Absent when they have already left the room. */
  player: Player | undefined;
  isSelf: boolean;
  isWinner: boolean;
  /** Competition ranking: players on the same score share a rank, and the next rank skips (1, 2, 2, 4). */
  rank: number;
  /** Someone else holds the same rank. */
  isTied: boolean;
  score: number;
  /** Cards still in hand when the round ended; null when the server did not report this seat. */
  cardsLeft: number | null;
}

/**
 * The final standings, best score first.
 *
 * The sort is the one the old scorecard used (score descending, seating order breaking ties) because the economy
 * pays prizes by placement and that is the order `winnerPrizesFor` is indexed in. Only the NUMBER shown changes:
 * a table of three players who all finished on 0 used to read 2, 3, 4 as if the engine had separated them.
 */
export function buildUnoStandings(
  state: Pick<UnoPlayerState, "playerOrder" | "scores" | "handSizes" | "winnerId">,
  players: readonly Player[],
  selfId: string | null,
  nameOf: (id: string) => string,
): UnoStanding[] {
  const byId = new Map(players.map((player) => [player.id, player] as const));
  const ordered = [...state.playerOrder].sort((a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0));

  const rows = ordered.map((id) => {
    const score = state.scores[id] ?? 0;
    const firstWithScore = ordered.findIndex((other) => (state.scores[other] ?? 0) === score);
    return {
      id,
      name: nameOf(id),
      player: byId.get(id),
      isSelf: id === selfId,
      isWinner: id === state.winnerId,
      rank: firstWithScore + 1,
      isTied: false,
      score,
      cardsLeft: state.handSizes?.[id] ?? null,
    };
  });

  return rows.map((row) => ({ ...row, isTied: rows.filter((other) => other.rank === row.rank).length > 1 }));
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 22 -> "22nd". */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "You finished 2nd" / "You tied for 2nd" — the viewer's own line, for someone who did not win. */
export function describeSelfResult(row: Pick<UnoStanding, "rank" | "isTied">): string {
  return row.isTied ? `You tied for ${ordinal(row.rank)}` : `You finished ${ordinal(row.rank)}`;
}

/** The points line under the headline: a running total for a multi-round match, this round's haul otherwise. */
export function describeWinnerPoints(winnerScore: number, targetScore: number | null, round: number): string {
  return targetScore != null ? `${winnerScore} pts · ${round} round${round === 1 ? "" : "s"}` : `+${winnerScore} pts`;
}
