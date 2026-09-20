import { describe, it, expect, beforeEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../../rooms/RoomManager.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  OperationalRoomSummary,
  DisconnectedSeatSummary,
} from "@shared/types.js";

function makeIo(): Server<ClientToServerEvents, ServerToClientEvents> {
  const fakeSocket = { join() {}, leave() {}, emit() {} };
  return {
    to: () => ({
      emit: () => {},
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

function createMemberRoom(rm: RoomManager, socketId: string, name: string, game = "rps" as const) {
  return rm.createRoom(
    socketId,
    name,
    game,
    undefined, // ludo
    undefined, // snl
    undefined, // rummy
    undefined, // hc
    undefined, // wordBuilding
    undefined, // dotsBoxes
    undefined, // starGame
    undefined, // uno
    undefined, // bingo
    undefined, // namesplaceanimal
    undefined, // tambola
    undefined, // snake
    undefined, // carrom
    undefined, // chess
    undefined, // blockBlast
    undefined, // spaceWar
    undefined, // ticTacToe
    undefined, // connect4
    undefined, // avatar
    "member" // hostKind
  );
}

describe("RoomInspectorTelemetry & Sensitive Field Omission Suite", () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager(makeIo());
  });

  it("produces rich OperationalPlayerSummary in getOperationalRoomSummaries without omitting seats", () => {
    const createRes = createMemberRoom(roomManager, "sock_host_1", "HostPlayer", "rps");
    expect(createRes.code).toBeDefined();
    const roomCode = createRes.code;

    const joinRes = roomManager.joinRoom(
      "sock_guest_2",
      "GuestPlayer",
      roomCode,
      undefined,
      undefined,
      undefined,
      "guest"
    );
    expect(joinRes.ok).toBe(true);

    const summaries = roomManager.getOperationalRoomSummaries();
    const roomSummary = summaries.find((r) => r.code === roomCode);
    expect(roomSummary).toBeDefined();
    expect(roomSummary?.players.length).toBe(2);

    const hostSummary = roomSummary?.players.find((p) => p.name === "HostPlayer");
    expect(hostSummary).toBeDefined();
    expect(hostSummary?.isHost).toBe(true);
    expect(hostSummary?.playerType).toBe("human");
    expect(hostSummary?.accountType).toBe("member");
    expect(hostSummary?.isConnected).toBe(true);
    expect(hostSummary?.seatStatus).toBe("active");

    const guestSummary = roomSummary?.players.find((p) => p.name === "GuestPlayer");
    expect(guestSummary).toBeDefined();
    expect(guestSummary?.isHost).toBe(false);
    expect(guestSummary?.playerType).toBe("human");
    expect(guestSummary?.accountType).toBe("guest");
  });

  it("populates isHost and autoTurnCap in getOperationalRecoverySummary when a player disconnects", () => {
    const createRes = createMemberRoom(roomManager, "sock_host_alice", "HostAlice", "rps");
    const roomCode = createRes.code;

    const joinRes = roomManager.joinRoom(
      "sock_guest_bob",
      "GuestBob",
      roomCode,
      undefined,
      undefined,
      undefined,
      "guest"
    );
    expect(joinRes.ok).toBe(true);

    // Start match
    roomManager.setReady("sock_host_alice", true);
    roomManager.setReady("sock_guest_bob", true);
    roomManager.startGame("sock_host_alice");

    // Bob disconnects abruptly
    roomManager.handleDisconnect("sock_guest_bob");

    const recovery = roomManager.getOperationalRecoverySummary();
    expect(recovery.activeGraceCount).toBe(1);

    const bobSeat = recovery.seats[0];
    expect(bobSeat).toBeDefined();
    expect(bobSeat?.playerName).toBe("GuestBob");
    expect(bobSeat?.isHost).toBe(false);
    expect(bobSeat?.autoTurnCap).toBe(5);
    expect(bobSeat?.awayUntil).toBeGreaterThan(bobSeat?.awaySince ?? 0);
  });

  it("STRICT PRIVACY AUDIT: Prohibited sensitive identifiers must NEVER appear in operational telemetry DTOs", () => {
    const createRes = createMemberRoom(roomManager, "sock_secret_id", "PrivacySubject", "rps");
    const roomCode = createRes.code;

    const summaries = roomManager.getOperationalRoomSummaries();
    const recovery = roomManager.getOperationalRecoverySummary();

    const PROHIBITED_KEYS = [
      "identityId",
      "seatToken",
      "sessionToken",
      "refreshToken",
      "jwt",
      "secret",
      "password",
      "wallet",
      "settlement",
      "cards",
      "hand",
      "deck",
      "serviceRole",
      "cookie",
    ];

    // Check room summaries
    for (const room of summaries) {
      const roomKeys = Object.keys(room);
      for (const key of roomKeys) {
        expect(PROHIBITED_KEYS).not.toContain(key);
      }

      for (const player of room.players) {
        const playerKeys = Object.keys(player);
        for (const key of playerKeys) {
          expect(PROHIBITED_KEYS).not.toContain(key);
        }
      }
    }

    // Check recovery summaries
    for (const seat of recovery.seats) {
      const seatKeys = Object.keys(seat);
      for (const key of seatKeys) {
        expect(PROHIBITED_KEYS).not.toContain(key);
      }
    }
  });
});
