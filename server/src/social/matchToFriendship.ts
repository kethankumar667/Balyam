import { matchIdFor } from "../persistence/ProgressionRepository.js";
import type { FinishedMatch } from "./FriendshipHistoryService.js";

/** A seat in a finished room, as much of it as friendship history needs. */
export interface RoomSeat {
  /** The per-room seat id. Names nobody's account — it is only used to find the winner. */
  id: string;
  /** The verified account behind the seat, if any. */
  identityId?: string | null;
  isBot?: boolean;
  isLocal?: boolean;
}

/**
 * Turns a finished room into the input friendship history takes.
 *
 * - The match id is the same one match history derives from a room, so a
 *   backfill from stored matches and live counting name a match identically.
 * - A room reports its winner as a SEAT id. It becomes that seat's verified
 *   account, or nothing if the seat is a bot, a Pass & Play seat, or unverified.
 * - Only ONE winner ever comes out, because that is all a room reports. So no
 *   pair from such a match can win together; the match still counts.
 */
export function friendshipMatchFrom(args: {
  roomCode: string;
  startedAt: number;
  finishedAt: number;
  seats: ReadonlyArray<RoomSeat>;
  winnerSeatId?: string | null;
}): FinishedMatch {
  const winner = args.seats.find((s) => s.id === args.winnerSeatId);
  const winnerIdentityIds =
    winner && !winner.isBot && !winner.isLocal && winner.identityId ? [winner.identityId] : [];

  return {
    matchId: matchIdFor(args.roomCode, args.startedAt),
    playedAt: args.finishedAt,
    participants: args.seats.map((s) => ({
      identityId: s.identityId,
      isBot: s.isBot,
      isLocal: s.isLocal,
    })),
    winnerIdentityIds,
  };
}
