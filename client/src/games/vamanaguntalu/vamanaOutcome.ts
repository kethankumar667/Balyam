import type { Player, VamanaPublicState } from "@shared/types.js";

export type VamanaOutcomeKind = "none" | "win" | "loss" | "draw" | "spectated" | "passplay";

export interface VamanaOutcome {
  kind: VamanaOutcomeKind;
  headline: string;
  announcement: string;
}

const NONE: VamanaOutcome = { kind: "none", headline: "", announcement: "" };

/**
 * What the board should say about a finished match, to whoever is viewing it. The server decides the
 * result; this only words it. A draw is never presented as a win for anyone.
 */
export function describeVamanaOutcome(
  state: VamanaPublicState,
  selfId: string,
  players: readonly Player[],
): VamanaOutcome {
  if (state.phase !== "finished") return NONE;

  const nameOf = (id: string): string => players.find((p) => p.id === id)?.name ?? "Opponent";
  const [firstId, secondId] = state.playerOrder;
  const firstSeeds = state.captured[firstId] ?? 0;
  const secondSeeds = state.captured[secondId] ?? 0;

  if (state.isDraw || state.endReason === "draw" || state.winnerId === null) {
    return {
      kind: "draw",
      headline: `DRAW — ${firstSeeds} SEEDS EACH`,
      announcement: `The match is a draw, ${firstSeeds} seeds each.`,
    };
  }

  const winnerId = state.winnerId;
  const winnerName = nameOf(winnerId);
  const winnerSeeds = state.captured[winnerId] ?? 0;
  const loserSeeds = winnerId === firstId ? secondSeeds : firstSeeds;
  const score = `${winnerSeeds} TO ${loserSeeds}`;
  const forfeited = state.endReason === "forfeit";

  // One person on both sides of the same device: nobody "wins" or "loses" from this seat's point of view.
  if (players.some((p) => p.isLocal === true)) {
    return {
      kind: "passplay",
      headline: forfeited ? `${winnerName.toUpperCase()} WINS — OPPONENT LEFT` : `${winnerName.toUpperCase()} WINS — ${score}`,
      announcement: forfeited ? `${winnerName} won because the opponent left.` : `${winnerName} won, ${score.toLowerCase()}.`,
    };
  }

  const isSeated = selfId !== "" && state.playerOrder.includes(selfId);
  if (!isSeated) {
    return {
      kind: "spectated",
      headline: forfeited ? `${winnerName.toUpperCase()} WINS — OPPONENT LEFT` : `${winnerName.toUpperCase()} WINS — ${score}`,
      announcement: `${winnerName} won the match.`,
    };
  }

  if (winnerId === selfId) {
    return forfeited
      ? { kind: "win", headline: "VICTORY — OPPONENT LEFT", announcement: "Victory! Your opponent left the match." }
      : { kind: "win", headline: `VICTORY — ${score}`, announcement: `Victory! You won ${score.toLowerCase()}.` };
  }

  return {
    kind: "loss",
    headline: `DEFEAT — ${score}`,
    announcement: `${winnerName} won ${score.toLowerCase()}.`,
  };
}
