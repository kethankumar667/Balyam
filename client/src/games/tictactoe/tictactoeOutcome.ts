import type { Player, TicTacToePublicState } from "@shared/types.js";

export type TicTacToeOutcomeKind = "none" | "win" | "loss" | "draw" | "spectated";

export interface TicTacToeOutcome {
  kind: TicTacToeOutcomeKind;
  /** The on-screen banner. */
  headline: string;
  /** The screen-reader announcement. */
  announcement: string;
}

/**
 * What the board should say about a finished match, to whoever is looking at it.
 *
 * A spectator (or anyone not seated in the match) used to fall through to the
 * "you lost" branch: they saw DEFEAT, heard the defeat sound and were offered a
 * rematch. They are told who won instead.
 */
export function describeTicTacToeOutcome(
  state: TicTacToePublicState,
  selfId: string,
  players: readonly Player[]
): TicTacToeOutcome {
  if (state.phase !== "finished") return { kind: "none", headline: "", announcement: "" };

  if (state.winnerId === "draw") {
    return {
      kind: "draw",
      headline: "SYSTEM STALEMATE (DRAW)",
      announcement: "Match ended in a draw.",
    };
  }

  const isSeated = selfId !== "" && state.playerMarks[selfId] !== undefined;
  const winnerName = players.find((p) => p.id === state.winnerId)?.name ?? "Opponent";

  if (!isSeated) {
    return {
      kind: "spectated",
      headline: `${winnerName.toUpperCase()} WINS THE MATCH`,
      announcement: `${winnerName} won the match.`,
    };
  }
  if (state.winnerId === selfId) {
    return { kind: "win", headline: "🏆 VICTORY ACHIEVED! 🏆", announcement: "Victory! You won the match." };
  }
  return {
    kind: "loss",
    headline: "DEFEAT — RETRY NEXT ROUND",
    announcement: `${winnerName} won the match.`,
  };
}
