import type { Player, Connect4PublicState } from "@shared/types.js";

export type Connect4OutcomeKind = "none" | "win" | "loss" | "draw" | "forfeit" | "spectated";

export interface Connect4Outcome {
  kind: Connect4OutcomeKind;
  headline: string;
  announcement: string;
}

/**
 * What the board should say about a finished match, to whoever is viewing it.
 */
export function describeConnect4Outcome(
  state: Connect4PublicState,
  selfId: string,
  players: readonly Player[]
): Connect4Outcome {
  if (state.phase !== "finished") {
    return { kind: "none", headline: "", announcement: "" };
  }

  if (state.isDraw || state.endReason === "draw" || state.winnerId === null) {
    return {
      kind: "draw",
      headline: "MATCH DRAW — BOARD FULL",
      announcement: "Match ended in a draw. Board is full.",
    };
  }

  const isSeated = selfId !== "" && state.playerDiscs[selfId] !== undefined;
  const winner = players.find((p) => p.id === state.winnerId);
  const winnerName = winner?.name ?? "Opponent";

  if (!isSeated) {
    return {
      kind: "spectated",
      headline: `${winnerName.toUpperCase()} WINS`,
      announcement: `${winnerName} won the match.`,
    };
  }

  if (state.winnerId === selfId) {
    if (state.endReason === "forfeit") {
      return {
        kind: "win",
        headline: "VICTORY — OPPONENT FORFEITED",
        announcement: "Victory! Opponent left the match.",
      };
    }
    return {
      kind: "win",
      headline: "VICTORY — CONNECT FOUR",
      announcement: "Victory! You connected four discs.",
    };
  }

  if (state.endReason === "forfeit") {
    return {
      kind: "loss",
      headline: "MATCH FORFEITED",
      announcement: "Match forfeited.",
    };
  }

  return {
    kind: "loss",
    headline: "DEFEAT — RETRY NEXT ROUND",
    announcement: `${winnerName} won the match.`,
  };
}
