import type { Player, RoomPublicState } from "@shared/types";
import type { MatchCommitmentMotionPayload, ParticipantSeatTarget } from "../components/economy/motion";

/**
 * Pure derivation logic for wiring Economy V1's motion sequences to real
 * `roomState` broadcasts in `Room.tsx`. Extracted out of the component so
 * it is independently testable without mounting the whole page — these
 * three functions ARE the fix for the audited contract mismatch (see
 * `docs/economy` and this session's own audit trail): `currentMatchId` is
 * cleared by the server in the SAME broadcast that reports a match
 * finished, so the frontend must never read it for a just-concluded match,
 * and must never fall back to the room code as a match-scoped id.
 */

type TerminalMatchRoomState = Pick<RoomPublicState, "phase" | "lastMatchId">;

/**
 * The id to hand `SettlementView`/`BhalyamResultModal` once a match has
 * concluded — `lastMatchId`, never `currentMatchId` (already null by the
 * time `phase` reports "finished") and never the room code (stable across
 * an entire room's lifetime, including every rematch — using it here would
 * make every match in a room share one settlement lookup).
 */
export function deriveTerminalMatchId(roomState: TerminalMatchRoomState | null | undefined): string | undefined {
  if (!roomState || roomState.phase !== "finished") return undefined;
  return roomState.lastMatchId ?? undefined;
}

/**
 * True exactly when a match is genuinely beginning: a fresh game
 * (lobby → playing) or a rematch (finished → playing — `startRematch` sets
 * `phase` directly from "finished", it never passes back through "lobby",
 * confirmed by reading `RoomManager.startRematch`). Both are real starts;
 * every other transition into "playing" (there are none today, but this
 * stays an explicit allow-list rather than "anything -> playing") is not.
 */
export function isMatchStartTransition(prevPhase: string | undefined, nextPhase: string | undefined): boolean {
  return nextPhase === "playing" && (prevPhase === "lobby" || prevPhase === "finished");
}

type CommitmentRoomState = Pick<
  RoomPublicState,
  "currentMatchId" | "committedCostPerSeat" | "committedTotalPot" | "players"
>;

/**
 * The real commitment-sequence payload, built ONLY from authoritative
 * broadcast fields — never a client-side guess, never fired optimistically
 * ahead of the server's own commit. Returns `null` when there is nothing
 * authoritative to animate: no `currentMatchId` means either economy isn't
 * configured for this deployment (nothing to celebrate — a real pot needs
 * a real commit) or the match started through a path that bypassed
 * `requestGameStart`'s commit step. The caller must not invent a
 * substitute sequence id in that case (see `isMatchStartTransition`'s
 * caller in `Room.tsx`): simply don't animate.
 */
export function buildCommitmentPayload(
  roomState: CommitmentRoomState,
  selfId?: string | null,
): MatchCommitmentMotionPayload | null {
  const { currentMatchId, committedCostPerSeat, committedTotalPot } = roomState;
  if (!currentMatchId || !committedCostPerSeat || !committedTotalPot) return null;

  const seats: ParticipantSeatTarget[] = roomState.players.map((p: Player, index) => ({
    seatId: p.id,
    seatNumber: index + 1,
    playerId: p.id,
    name: p.name,
    isHost: p.isHost,
    isBot: p.isBot,
    isSelf: selfId ? p.id === selfId : undefined,
  }));

  return {
    sequenceId: `commit-${currentMatchId}`,
    matchId: currentMatchId,
    amountPerSeat: committedCostPerSeat,
    totalPotAmount: committedTotalPot,
    seats,
  };
}
