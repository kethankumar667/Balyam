import { describe, it, expect, beforeEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../../rooms/RoomManager.js";
import { profileService } from "../ProfileService.js";
import { buildPublicPlayerCard } from "../publicPlayerCard.js";
import { AVATAR_FILES } from "@shared/avatars.js";
import type { ClientToServerEvents, Player, ServerToClientEvents } from "@shared/types.js";

/**
 * THE CARD A STRANGER SEES.
 *
 * What is being pinned is the privacy boundary, not the layout. The card is
 * built on the server so that the account id behind a seat, and every record
 * that is private to its owner, can never reach the browser of someone who
 * only clicked an avatar. These tests fail loudly if a future field leaks.
 */

const ACCOUNT_ID = "account-secret-id-123";

type SeededRoom = {
  code: string;
  players: Map<string, Player>;
  socketToPlayer: Map<string, string>;
};

function makeRoomManager(): RoomManager {
  const io = {
    to: () => ({ emit() {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit() {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return new RoomManager(io);
}

function seat(overrides: Partial<Player> & { id: string; name: string }): Player {
  return { isHost: false, isReady: false, isConnected: true, ...overrides };
}

/** Puts a room in place and seats `viewerSocketId` at it, without going through createRoom's 24 positional parameters. */
function seedRoom(rooms: RoomManager, players: Player[], viewerSocketId: string): void {
  const internals = rooms as unknown as {
    rooms: Map<string, SeededRoom>;
    socketToRoom: Map<string, string>;
  };
  const room: SeededRoom = {
    code: "ABC123",
    players: new Map(players.map((p) => [p.id, p])),
    socketToPlayer: new Map([[viewerSocketId, players[0].id]]),
  };
  internals.rooms.set(room.code, room);
  internals.socketToRoom.set(viewerSocketId, room.code);
}

describe("player card — what a stranger may see", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("returns career and progression for a member seat and never the account id", () => {
    profileService.getOrCreateProfile(ACCOUNT_ID, "Faisal");
    const rooms = makeRoomManager();
    seedRoom(
      rooms,
      [
        seat({ id: "seat-me", name: "kethan" }),
        seat({ id: "seat-them", name: "Faisal", identityId: ACCOUNT_ID, level: 4 }),
      ],
      "socket-me"
    );

    const result = rooms.getPlayerCard("socket-me", "seat-them");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.kind).toBe("member");
    expect(result.card.displayName).toBe("Faisal");
    // The whole serialised card, so a leak under any key name is caught.
    expect(JSON.stringify(result.card)).not.toContain(ACCOUNT_ID);
  });

  it("labels a guest seat as a guest even though it has a server-minted identity", () => {
    const rooms = makeRoomManager();
    seedRoom(
      rooms,
      [seat({ id: "seat-me", name: "kethan" }), seat({ id: "seat-guest", name: "Ravi", isGuest: true, identityId: "guest-id-9" })],
      "socket-me"
    );
    const result = rooms.getPlayerCard("socket-me", "seat-guest");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.kind).toBe("guest");
  });

  it("prefers the name chosen at the table over the stored profile name", () => {
    profileService.getOrCreateProfile(ACCOUNT_ID);
    const rooms = makeRoomManager();
    seedRoom(rooms, [seat({ id: "seat-me", name: "kethan", identityId: ACCOUNT_ID })], "socket-me");
    const result = rooms.getPlayerCard("socket-me", "seat-me");
    expect(result.ok && result.card.displayName).toBe("kethan");
  });

  it("works for the viewer's own seat", () => {
    const rooms = makeRoomManager();
    seedRoom(rooms, [seat({ id: "seat-me", name: "kethan" })], "socket-me");
    const result = rooms.getPlayerCard("socket-me", "seat-me");
    expect(result.ok).toBe(true);
  });

  it("gives a bot a card with no career instead of a block of zeros", () => {
    const rooms = makeRoomManager();
    seedRoom(
      rooms,
      [seat({ id: "seat-me", name: "kethan" }), seat({ id: "seat-bot", name: "Kanakam", isBot: true, level: 6 })],
      "socket-me"
    );
    const result = rooms.getPlayerCard("socket-me", "seat-bot");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.kind).toBe("bot");
    expect(result.card.career).toBeNull();
    expect(result.card.progression.level).toBe(6);
  });

  it("treats a pass-and-play seat as having no account even if it carries an identity", () => {
    profileService.getOrCreateProfile(ACCOUNT_ID, "Hosts Real Name");
    const rooms = makeRoomManager();
    seedRoom(
      rooms,
      [seat({ id: "seat-me", name: "kethan" }), seat({ id: "seat-local", name: "Guest 2", isLocal: true, identityId: ACCOUNT_ID })],
      "socket-me"
    );
    const result = rooms.getPlayerCard("socket-me", "seat-local");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.kind).toBe("guest");
    expect(result.card.displayName).toBe("Guest 2");
  });

  it("refuses a seat that is not in the caller's own room", () => {
    const rooms = makeRoomManager();
    seedRoom(rooms, [seat({ id: "seat-me", name: "kethan" })], "socket-me");
    expect(rooms.getPlayerCard("socket-me", "no-such-seat").ok).toBe(false);
  });

  it("refuses a socket that is not in any room", () => {
    const rooms = makeRoomManager();
    seedRoom(rooms, [seat({ id: "seat-me", name: "kethan" })], "socket-me");
    expect(rooms.getPlayerCard("socket-stranger", "seat-me").ok).toBe(false);
  });
});

describe("buildPublicPlayerCard", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("omits career until there is at least one finished match", () => {
    profileService.getOrCreateProfile(ACCOUNT_ID, "Faisal");
    const card = buildPublicPlayerCard({ identityId: ACCOUNT_ID, kind: "member", seatName: "Faisal" });
    expect(card.career).toBeNull();
  });

  it("drops an avatar that is not on the shared manifest", () => {
    const card = buildPublicPlayerCard({
      identityId: null,
      kind: "guest",
      seatName: "Mallory",
      seatAvatar: "../../evil.png",
    });
    expect(card.avatar).toBeUndefined();
  });

  it("keeps an avatar that is on the manifest", () => {
    const card = buildPublicPlayerCard({
      identityId: null,
      kind: "guest",
      seatName: "Alice",
      seatAvatar: AVATAR_FILES[0],
    });
    expect(card.avatar).toBe(AVATAR_FILES[0]);
  });

  it("does not expose private records under any key", () => {
    profileService.getOrCreateProfile(ACCOUNT_ID, "Faisal");
    const serialised = JSON.stringify(
      buildPublicPlayerCard({ identityId: ACCOUNT_ID, kind: "member", seatName: "Faisal" })
    ).toLowerCase();
    for (const forbidden of ["wallet", "balance", "winnings", "achievement", "matchhistory", "risk", "playerid"]) {
      expect(serialised).not.toContain(forbidden);
    }
  });
});
