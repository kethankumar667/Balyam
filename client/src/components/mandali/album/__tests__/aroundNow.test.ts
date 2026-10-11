import { describe, it, expect } from "vitest";
import type { MandaliMember, MandaliMessage } from "@shared/mandali/types.js";
import type { RoomInviteStatus } from "@shared/mandali/notifications.js";
import { OPEN_TABLE_MAX_AGE_MS, OPEN_TABLES_MAX, pickOpenTables, playingSummary, whoIsAround } from "../aroundNow";

const NOW = 1_800_000_000_000;

const member = (id: string, presence: MandaliMember["presence"], over: Partial<MandaliMember> = {}): MandaliMember => ({
  memberId: `mem_${id}`,
  mandaliId: "m1",
  playerId: id,
  displayName: id.toUpperCase(),
  avatar: `${id}.png`,
  role: "MEMBER",
  state: "ACTIVE",
  joinedAt: 1,
  presence,
  contributionScore: 0,
  ...over,
});

const invite = (code: string, minutesAgo: number, over: Partial<MandaliMessage> = {}): MandaliMessage =>
  ({
    messageId: `msg_${code}`,
    channelId: "c1",
    mandaliId: "m1",
    senderId: "asha",
    senderName: "Asha",
    senderAvatar: "asha.png",
    senderRole: "MEMBER",
    content: `room ${code}`,
    reactions: {},
    timestamp: NOW - minutesAgo * 60_000,
    kind: "ROOM_INVITE",
    roomCode: code,
    roomInvite: { game: "ludo", gameName: "Ludo 🎲", maxPlayers: 4, hostName: "Asha" },
    ...over,
  }) as MandaliMessage;

const status = (code: string, over: Partial<RoomInviteStatus> = {}): RoomInviteStatus =>
  ({ code, state: "OPEN", players: 2, maxPlayers: 4, youAreIn: false, ...over }) as RoomInviteStatus;

describe("whoIsAround", () => {
  it("leaves out yourself, people who are offline and people who have left", () => {
    const list = whoIsAround(
      [member("me", "online"), member("bala", "offline"), member("gone", "online", { state: "LEFT" as never }), member("asha", "online")],
      "me",
    );

    expect(list.map((m) => m.playerId)).toEqual(["asha"]);
  });

  it("puts people who are here before people mid-match before people who are away, keeping the group's own order within each", () => {
    const list = whoIsAround(
      [member("a", "idle"), member("b", "in-game"), member("c", "online"), member("d", "online"), member("e", "in-game")],
      null,
    );

    expect(list.map((m) => m.playerId)).toEqual(["c", "d", "b", "e", "a"]);
  });

  it("is empty when nobody is around", () => {
    expect(whoIsAround([member("a", "offline")], null)).toEqual([]);
  });
});

describe("playingSummary", () => {
  it("names the first person in a game, and that game as people say it", () => {
    const summary = playingSummary([member("a", "online"), member("bala", "in-game", { activeGame: "ludo" })]);

    expect(summary?.first.playerId).toBe("bala");
    expect(summary?.game).toBe("Ludo");
    expect(summary?.others).toBe(0);
  });

  it("counts the others who are also in a game", () => {
    const summary = playingSummary([member("a", "in-game", { activeGame: "uno" }), member("b", "in-game"), member("c", "in-game")]);

    expect(summary?.others).toBe(2);
  });

  it("is null when nobody is mid-match", () => {
    expect(playingSummary([member("a", "online")])).toBeNull();
  });

  it("copes with a game that was not reported", () => {
    expect(playingSummary([member("a", "in-game")])?.game).toBe("");
  });
});

describe("pickOpenTables", () => {
  it("offers a recent room that is still open, with the host, the room and the seats", () => {
    const tables = pickOpenTables([invite("LDO482", 5, { roomInvite: { game: "ludo", gameName: "Ludo 🎲", maxPlayers: 4, roomName: "Sunday night Ludo", hostName: "Asha" } } as never)], { LDO482: status("LDO482") }, NOW);

    expect(tables).toEqual([
      { code: "LDO482", hostName: "Asha", hostAvatar: "asha.png", title: "Sunday night Ludo", gameName: "Ludo", players: 2, maxPlayers: 4 },
    ]);
  });

  it("names an unnamed room after its game, without the emoji", () => {
    const [table] = pickOpenTables([invite("LDO482", 5)], { LDO482: status("LDO482") }, NOW);

    expect(table.title).toBe("Ludo room");
  });

  it.each(["FULL", "IN_PROGRESS", "CLOSED"] as const)("does not offer a room that is %s", (state) => {
    expect(pickOpenTables([invite("LDO482", 5)], { LDO482: status("LDO482", { state }) }, NOW)).toEqual([]);
  });

  it("does not offer a room whose status has not arrived: a Join that may be dead is worse than none", () => {
    expect(pickOpenTables([invite("LDO482", 5)], {}, NOW)).toEqual([]);
  });

  it("does not offer a room you are already in", () => {
    expect(pickOpenTables([invite("LDO482", 5)], { LDO482: status("LDO482", { youAreIn: true }) }, NOW)).toEqual([]);
  });

  it("does not offer a room shared long ago", () => {
    const old = invite("OLD123", OPEN_TABLE_MAX_AGE_MS / 60_000 + 1);

    expect(pickOpenTables([old], { OLD123: status("OLD123") }, NOW)).toEqual([]);
  });

  it("does not offer a deleted invitation", () => {
    expect(pickOpenTables([invite("LDO482", 5, { content: "" })], { LDO482: status("LDO482") }, NOW)).toEqual([]);
  });

  it("ignores messages that are not room invitations", () => {
    expect(pickOpenTables([invite("LDO482", 5, { kind: undefined, roomCode: undefined })], {}, NOW)).toEqual([]);
  });

  it("lists the same room once, newest first, and no more than the strip can show", () => {
    const messages = [invite("AAA111", 30), invite("BBB222", 20), invite("BBB222", 10), invite("CCC333", 5)];
    const statuses = { AAA111: status("AAA111"), BBB222: status("BBB222"), CCC333: status("CCC333") };

    const tables = pickOpenTables(messages, statuses, NOW);

    expect(tables.map((t) => t.code)).toEqual(["CCC333", "BBB222"]);
    expect(tables).toHaveLength(OPEN_TABLES_MAX);
  });

  it("skips past a closed newer room to an open older one", () => {
    const tables = pickOpenTables(
      [invite("OPEN11", 30), invite("DONE22", 5)],
      { OPEN11: status("OPEN11"), DONE22: status("DONE22", { state: "CLOSED" }) },
      NOW,
    );

    expect(tables.map((t) => t.code)).toEqual(["OPEN11"]);
  });
});
