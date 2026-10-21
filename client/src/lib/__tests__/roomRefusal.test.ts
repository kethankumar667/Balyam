import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEALED_ROOM_ERROR } from "@shared/permissions";
import {
  JOIN_ERROR_GAME_STARTED,
  JOIN_ERROR_ROOM_FULL,
  JOIN_ERROR_ROOM_NOT_FOUND,
  refusalFromJoinError,
  verdictFromLiveness,
} from "../roomRefusal";

describe("refusalFromJoinError", () => {
  it("names the four refusals the table-unavailable card knows", () => {
    expect(refusalFromJoinError("Room not found")).toBe("not_found");
    expect(refusalFromJoinError("Game already in progress")).toBe("started");
    expect(refusalFromJoinError("Room is full")).toBe("full");
    expect(refusalFromJoinError(SEALED_ROOM_ERROR)).toBe("sealed");
  });

  it("leaves every other refusal to the generic error path", () => {
    expect(refusalFromJoinError("This identity is suspended.")).toBeNull();
    expect(refusalFromJoinError("Could not join room")).toBeNull();
    expect(refusalFromJoinError("")).toBeNull();
    expect(refusalFromJoinError(undefined)).toBeNull();
  });

  it("uses the exact words the server's joinRoom returns, so a reword there cannot strand a player on the wrong screen", () => {
    const server = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "server", "src", "rooms", "RoomManager.ts"), "utf8");
    for (const words of [JOIN_ERROR_ROOM_NOT_FOUND, JOIN_ERROR_ROOM_FULL, JOIN_ERROR_GAME_STARTED]) {
      expect(server, words).toContain(`error: "${words}"`);
    }
  });
});

describe("verdictFromLiveness", () => {
  it("lets a player with a live seat carry on joining", () => {
    expect(verdictFromLiveness({ alive: true, game: "bingo", phase: "playing" })).toEqual({ kind: "open" });
  });

  it("says a room that is not there, or finished with nobody left, is gone", () => {
    expect(verdictFromLiveness({ alive: false, reason: "NOT_FOUND" })).toEqual({ kind: "refused", status: "not_found" });
    expect(verdictFromLiveness({ alive: false, reason: "CONCLUDED", phase: "finished" })).toEqual({ kind: "refused", status: "not_found" });
    expect(verdictFromLiveness({ alive: false, reason: "INVALID_CODE" })).toEqual({ kind: "refused", status: "not_found" });
  });

  it("lets a released seat rejoin a lobby, which simply seats them again", () => {
    expect(verdictFromLiveness({ alive: false, reason: "SEAT_EXPIRED", phase: "lobby" })).toEqual({ kind: "open" });
  });

  it("turns a released seat at a match that has started or finished into 'you cannot come back in'", () => {
    expect(verdictFromLiveness({ alive: false, reason: "SEAT_EXPIRED", phase: "playing" })).toEqual({ kind: "refused", status: "started" });
    expect(verdictFromLiveness({ alive: false, reason: "SEAT_EXPIRED", phase: "finished" })).toEqual({ kind: "refused", status: "started" });
  });

  it("does not guess when the phase of a released seat's table is unknown: the join is authoritative", () => {
    expect(verdictFromLiveness({ alive: false, reason: "SEAT_EXPIRED" })).toEqual({ kind: "open" });
  });

  it("treats silence as silence: an unreachable server says nothing about the room", () => {
    for (const reason of ["UNREACHABLE", "SOCKET_TIMEOUT", "NO_RESPONSE", "SOMETHING_NEW", undefined]) {
      expect(verdictFromLiveness({ alive: false, reason }), String(reason)).toEqual({ kind: "unreachable" });
    }
  });
});
