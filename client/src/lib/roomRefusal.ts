import { SEALED_ROOM_ERROR } from "@shared/permissions";
import type { RoomProbeStatus } from "@shared/types";
import type { RoomLivenessResult } from "../core/recovery/roomLiveness";

/**
 * Why a player cannot be (re)seated at a table, as the screen that explains it understands it.
 * The same four answers `room:probe` gives a first-time guest, so one card serves both.
 */
export type RoomRefusal = Exclude<RoomProbeStatus, "open">;

/**
 * What the server says to a `room:join` it refuses. These are the strings `RoomManager.joinRoom` returns; they are
 * duplicated here because the wire carries only the text, and `roomRefusal.test.ts` pins them so a rewording on the
 * server shows up as a failing test here rather than as a player stuck on the wrong screen.
 */
export const JOIN_ERROR_ROOM_NOT_FOUND = "Room not found";
export const JOIN_ERROR_ROOM_FULL = "Room is full";
export const JOIN_ERROR_GAME_STARTED = "Game already in progress";

/**
 * Turns a refused join into the reason to show, or null when the refusal is something else (a suspended identity, a
 * name that was not allowed) and the generic error path should keep handling it.
 *
 * "Game already in progress" is also what the server says about a FINISHED table, so for someone coming back it
 * means "your seat was released and the match has moved on", which is what the `started` card says.
 */
export function refusalFromJoinError(error: string | undefined): RoomRefusal | null {
  switch (error) {
    case JOIN_ERROR_ROOM_NOT_FOUND:
      return "not_found";
    case JOIN_ERROR_GAME_STARTED:
      return "started";
    case JOIN_ERROR_ROOM_FULL:
      return "full";
    case SEALED_ROOM_ERROR:
      return "sealed";
    default:
      return null;
  }
}

/** What a liveness answer means for a player who is trying to get (back) into a room. */
export type RoomVerdict =
  /** The table exists and can take them: carry on joining. */
  | { kind: "open" }
  /** The table is gone, or cannot take them back: stop connecting and say so. */
  | { kind: "refused"; status: RoomRefusal }
  /** Nobody answered. This says nothing about the room; keep waiting and keep asking. */
  | { kind: "unreachable" };

/**
 * Reads the answer of `checkRoomAlive` (the server's `isRoomAlive`).
 *
 * - alive: the seat, if there was one, is still held. Rejoin.
 * - NOT_FOUND / CONCLUDED: no table, or a finished one nobody is left at. Gone.
 * - SEAT_EXPIRED: the table is still there but the seat was released after the grace period. In a lobby the join
 *   simply seats them again; once the match has started or finished there is no way back in.
 * - anything else (the host unreachable, a timeout): the server did not answer, so nothing is known about the room.
 */
export function verdictFromLiveness(result: RoomLivenessResult): RoomVerdict {
  if (result.alive) return { kind: "open" };
  switch (result.reason) {
    case "NOT_FOUND":
    case "CONCLUDED":
    case "INVALID_CODE":
      return { kind: "refused", status: "not_found" };
    case "SEAT_EXPIRED":
      // Unknown phase: let the join decide. It is authoritative and costs one round trip.
      return result.phase === undefined || result.phase === "lobby" ? { kind: "open" } : { kind: "refused", status: "started" };
    default:
      return { kind: "unreachable" };
  }
}
