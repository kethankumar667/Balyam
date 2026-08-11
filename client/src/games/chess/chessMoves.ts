import { Chess } from "chess.js";

/**
 * Squares the piece on `square` may legally move to.
 *
 * Derived on the CLIENT from the FEN rather than sent by the server. A chess
 * position is fully public — both players look at the same board — so
 * computing legal moves here leaks nothing, keeps every broadcast smaller,
 * and gives instant feedback with no round trip. The server still validates
 * the move that is actually submitted; this is a hint, never an authority.
 *
 * Lives in a plain .ts module rather than beside the board component so it
 * can be unit tested without pulling React, haptics and framer-motion into a
 * node test environment.
 *
 * Returns [] for an empty square, a piece belonging to the side not on move,
 * a pinned piece with nowhere to go, or an unparseable FEN — every case where
 * highlighting something would be a lie.
 */
export function legalTargetsFor(fen: string, square: string | null): string[] {
  if (!square) return [];
  try {
    const game = new Chess(fen);
    // `verbose` is required: the short form returns SAN like "Nf3", not the
    // destination square this needs.
    return game
      .moves({ square: square as never, verbose: true })
      .map((m) => (m as unknown as { to: string }).to);
  } catch {
    // chess.js throws on a malformed FEN or an off-board square. A board with
    // no dots is a better failure than a board that will not render.
    return [];
  }
}
