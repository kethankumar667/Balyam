/**
 * Generic post-match ranking for games that do not bring their own scorecard.
 *
 * The result modal lists players in the order it is given, so the ORDER has to
 * carry the placement. It used to be roster order, which made the host rank #1
 * (with a crown) in every match — including the ones they lost.
 */

export interface RankablePlayer {
  id: string;
  name: string;
  avatar?: string;
}

export interface RankedMatchPlayer extends RankablePlayer {
  score: number;
}

const WINNER_SCORE = 100;
const LOSER_SCORE = 0;

/**
 * Engines report a winner as a player id, `null`, or (Tic Tac Toe) the string
 * `"draw"`. Anything that is not a usable seat id means "nobody won".
 */
export function normalizeWinnerId(raw: unknown): string | null {
  return typeof raw === "string" && raw !== "" && raw !== "draw" ? raw : null;
}

/** Winner first; everyone else keeps their roster order. A draw ranks nobody above anybody. */
export function rankMatchPlayers(
  players: readonly RankablePlayer[],
  winnerId: string | null
): RankedMatchPlayer[] {
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.id === winnerId ? WINNER_SCORE : LOSER_SCORE,
    }))
    .sort((a, b) => b.score - a.score); // Array#sort is stable, so ties keep roster order
}
