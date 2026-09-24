import { describe, it, expect } from "vitest";
import { friendshipMatchFrom, type RoomSeat } from "../matchToFriendship.js";

const seats: RoomSeat[] = [
  { id: "p_1_aaa", identityId: "acct-a" },
  { id: "p_2_bbb", identityId: "acct-b" },
  { id: "p_3_bot", identityId: null, isBot: true },
  { id: "p_4_loc", identityId: "acct-a", isLocal: true },
  { id: "p_5_anon", identityId: null },
];

const build = (winnerSeatId?: string | null) =>
  friendshipMatchFrom({ roomCode: "abc123", startedAt: 1_700_000_000_000, finishedAt: 1_700_000_600_000, seats, winnerSeatId });

describe("friendshipMatchFrom", () => {
  it("names the match the way match history does, with the room code upper-cased", () => {
    expect(build().matchId).toBe("m_ABC123_1700000000000");
  });

  it("dates the match by when it finished", () => {
    expect(build().playedAt).toBe(1_700_000_600_000);
  });

  it("passes every seat through with its verified identity, so the service can decide who counts", () => {
    expect(build().participants).toEqual([
      { identityId: "acct-a", isBot: undefined, isLocal: undefined },
      { identityId: "acct-b", isBot: undefined, isLocal: undefined },
      { identityId: null, isBot: true, isLocal: undefined },
      { identityId: "acct-a", isBot: undefined, isLocal: true },
      { identityId: null, isBot: undefined, isLocal: undefined },
    ]);
  });

  it("turns the winning SEAT into that seat's verified account", () => {
    expect(build("p_2_bbb").winnerIdentityIds).toEqual(["acct-b"]);
  });

  it("names no winner when the room reported none", () => {
    expect(build(null).winnerIdentityIds).toEqual([]);
    expect(build(undefined).winnerIdentityIds).toEqual([]);
  });

  it.each([
    ["a bot", "p_3_bot"],
    ["a Pass & Play seat", "p_4_loc"],
    ["an unverified seat", "p_5_anon"],
    ["a seat that is not at the table", "p_9_ghost"],
  ])("names no winner when the winner is %s", (_label, winnerSeatId) => {
    expect(build(winnerSeatId).winnerIdentityIds).toEqual([]);
  });

  it("never reports more than one winner, because a room reports only one", () => {
    expect(build("p_1_aaa").winnerIdentityIds).toHaveLength(1);
  });
});
