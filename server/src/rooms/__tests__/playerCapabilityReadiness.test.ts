import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room, PREFLIGHT_TIMEOUT_MS } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { RummyEngine } from "../../games/rummy/RummyEngine.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

function makeIo() {
  const roomEmits: { room: string; event: string; data?: unknown }[] = [];
  const socketEmits: { socketId: string; event: string; data?: unknown }[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => roomEmits.push({ room, event, data }),
    }),
    sockets: {
      sockets: {
        get: (id: string) => ({
          join() {},
          leave() {},
          emit: (event: string, data?: unknown) => socketEmits.push({ socketId: id, event, data }),
        }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, roomEmits, socketEmits };
}

function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind = "guest",
  identityId: string | null = null,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 4; // 3 leading (socketId,name,game), 4 trailing (avatar,hostKind,identityId,entryStakeCoins)
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

function joinRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  code: string,
  accountKind: AccountKind = "guest",
  identityId: string | null = null,
) {
  return rooms.joinRoom(socketId, name, code, undefined, undefined, undefined, accountKind, identityId);
}

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";
const MEMBER_C = "cccccccc-1111-2222-3333-444444444444";

function freshEconomy(): { repo: InMemoryEconomyRepository; service: EconomyService } {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  return { repo, service };
}

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

describe("Player Capability & Start-Attempt Readiness Protocol", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test S1: Unknown acknowledgement blocks match start (fail-closed)", async () => {
    const { io, roomEmits } = makeIo();
    const rooms = new RoomManager(io);
    const host = createRoomAs(rooms, "s_host", "Alice", "rummy");
    joinRoomAs(rooms, "s_bob", "Bob", host.code);
    rooms.setReady("s_host", true);
    rooms.setReady("s_bob", true);

    // Host requests start -> initiates preflight challenge
    await rooms.requestGameStart("s_host");
    const room = peek(rooms, host.code);
    expect(room.activeStartAttempt).not.toBeNull();
    expect(room.activeStartAttempt?.status).toBe("COLLECTING_PREFLIGHT");
    expect(room.phase).toBe("lobby"); // still in lobby!

    // Verify preflight was emitted
    const preflight = roomEmits.find((e) => e.event === "room:startPreflight");
    expect(preflight).toBeDefined();

    // Derived readiness shows ACKNOWLEDGEMENT_MISSING
    const readiness = rooms.getRoomStartReadiness(room);
    expect(readiness.canStart).toBe(false);
    expect(readiness.participants.find((p) => p.playerId === host.playerId)?.blockers).toContain("ACKNOWLEDGEMENT_MISSING");
  });

  it("Test S2: Original A/B/C scenario — A and C blocked by orientation/background; B acknowledged; no start, 0 debit", async () => {
    const { io, roomEmits } = makeIo();
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);
    seedMember(repo, MEMBER_C);

    const rooms = new RoomManager(io, service);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy", "member", MEMBER_A);
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code, "member", MEMBER_B);
    const joinC = joinRoomAs(rooms, "s_c", "Charlie", hostA.code, "member", MEMBER_C);

    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);
    rooms.setReady("s_c", true);

    // Host A requests start
    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId = room.activeStartAttempt!.id;
    const revision = room.roomRevision;

    // Only B acknowledges
    rooms.acknowledgeStart("s_b", {
      startAttemptId: attemptId,
      roomRevision: revision,
      visible: true,
      orientationSatisfied: true,
    });

    // A and C did NOT acknowledge (outside browser or blocked by rotate screen)
    expect(room.phase).toBe("lobby");
    expect(room.engine).toBeNull();
    expect(room.currentMatchId).toBeNull(); // No economy commitment made!

    // Balance of Member A remains unchanged
    const walletA = await repo.getWallet(MEMBER_A);
    expect(walletA?.balance).toBe("5000");
  });

  it("Test S3: Fresh acknowledgements allow start", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId = room.activeStartAttempt!.id;
    const rev = room.roomRevision;

    rooms.acknowledgeStart("s_a", {
      startAttemptId: attemptId,
      roomRevision: rev,
      visible: true,
      orientationSatisfied: true,
    });
    rooms.acknowledgeStart("s_b", {
      startAttemptId: attemptId,
      roomRevision: rev,
      visible: true,
      orientationSatisfied: true,
    });

    expect(room.phase).toBe("playing");
    expect(room.engine).not.toBeNull();
    expect(room.activeStartAttempt).toBeNull();
  });

  it("Test S4: Old attempt acknowledgement is rejected", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinBResult = joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    expect(joinBResult.ok).toBe(true);
    const joinB = joinBResult as { ok: true; playerId: string; seatToken: string };
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const oldAttemptId = room.activeStartAttempt!.id;
    const oldRev = room.roomRevision;

    // Attempt 1 gets cancelled (e.g. host declines)
    rooms.declineStart("s_a", { startAttemptId: oldAttemptId, reason: "PAGE_NOT_VISIBLE" });
    expect(room.activeStartAttempt).toBeNull();

    // Start Attempt 2
    await rooms.requestGameStart("s_a");
    const newAttemptId = room.activeStartAttempt!.id;
    expect(newAttemptId).not.toBe(oldAttemptId);

    // Late ack for old Attempt 1 arrives from Bob
    rooms.acknowledgeStart("s_b", {
      startAttemptId: oldAttemptId,
      roomRevision: oldRev,
      visible: true,
      orientationSatisfied: true,
    });

    // Bob is NOT acknowledged for newAttemptId
    expect(room.activeStartAttempt?.acknowledgements.has(joinB.playerId)).toBe(false);
  });

  it("Test S5: Old socket rejected after seat recovery", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinBResult = joinRoomAs(rooms, "s_b_old", "Bob", hostA.code);
    expect(joinBResult.ok).toBe(true);
    const joinB = joinBResult as { ok: true; playerId: string; seatToken: string };
    rooms.setReady("s_a", true);
    rooms.setReady("s_b_old", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId = room.activeStartAttempt!.id;
    const rev = room.roomRevision;

    // Bob disconnects and reconnects on a new socket
    rooms.handleDisconnect("s_b_old");
    expect(room.activeStartAttempt).toBeNull(); // Disconnect cancels in-flight attempt!

    const reclaim = rooms.joinRoom("s_b_new", "Bob", hostA.code, joinB.playerId, joinB.seatToken);
    expect(reclaim.ok).toBe(true);

    // If an old socket packet arrives for the previous attempt, it is ignored
    rooms.acknowledgeStart("s_b_old", {
      startAttemptId: attemptId,
      roomRevision: rev,
      visible: true,
      orientationSatisfied: true,
    });
    expect(room.activeStartAttempt).toBeNull();
  });

  it("Test S6: Room revision mismatch rejects acknowledgement", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId = room.activeStartAttempt!.id;
    const initialRev = room.roomRevision;

    // Bob unreadies, then readies -> roomRevision increments
    rooms.setReady("s_b", false);
    expect(room.roomRevision).toBeGreaterThan(initialRev);

    // Bob attempts to send ack with old revision
    rooms.acknowledgeStart("s_b", {
      startAttemptId: attemptId,
      roomRevision: initialRev,
      visible: true,
      orientationSatisfied: true,
    });

    expect(room.phase).toBe("lobby");
  });

  it("Test S6b: a redundant setReady(true) resend during an active preflight does not orphan a pending acknowledgement", async () => {
    // Regression: setReady used to bump roomRevision unconditionally, even
    // when the ready value wasn't actually changing. A harmless re-affirm
    // (a double-tap on Ready before the first click's broadcast round-trips
    // back, a reconnect resync, etc.) landing while a start attempt is in
    // flight would silently move roomRevision out from under an
    // already-issued preflight challenge — acknowledgeStart's revision
    // fence then drops the real ack with no explanation, and the whole
    // match start times out 5s later even though everyone was present.
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId = room.activeStartAttempt!.id;
    const rev = room.roomRevision;

    // Bob's client redundantly resends "ready: true" — already his value —
    // while the preflight challenge he's about to acknowledge is in flight.
    rooms.setReady("s_b", true);
    expect(room.roomRevision).toBe(rev);
    expect(room.activeStartAttempt?.id).toBe(attemptId);

    // The ack Bob's client already had in flight, stamped with the
    // still-valid revision, must be accepted rather than silently dropped.
    rooms.acknowledgeStart("s_a", {
      startAttemptId: attemptId,
      roomRevision: rev,
      visible: true,
      orientationSatisfied: true,
    });
    rooms.acknowledgeStart("s_b", {
      startAttemptId: attemptId,
      roomRevision: rev,
      visible: true,
      orientationSatisfied: true,
    });

    expect(room.phase).toBe("playing");
    expect(room.activeStartAttempt).toBeNull();
  });

  it("Test S7: Ready toggled off cancels start attempt", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Bob toggles ready off
    rooms.setReady("s_b", false);
    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
  });

  it("Test S8: Visibility loss invalidates attempt", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Bob reports tab hidden
    rooms.reportUnavailable("s_b", { reason: "PAGE_NOT_VISIBLE" });
    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
  });

  it("Test S9: Orientation invalidation cancels attempt", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Bob turns phone back to portrait (needsRotation = true)
    rooms.setOrientation("s_b", true);
    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
  });

  it("Test S10: Disconnect cancels attempt", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    rooms.handleDisconnect("s_b");
    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
  });

  it("Test S11: Preflight expiry with everyone still connected and ready STARTS the match", async () => {
    // The behaviour this test asserts was deliberately inverted 2026-09-09.
    // It previously required that silence cancel the start. See
    // `RoomManager.resolveExpiredPreflight`'s doc comment for the full
    // reasoning: silence from a seat the server can independently see is
    // connected and ready is not evidence that anyone is unable to play,
    // and treating it as fatal made the single most important action in the
    // product hostage to a best-effort message arriving.
    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Nobody acknowledges at all — the exact live failure this fixes.
    vi.advanceTimersByTime(PREFLIGHT_TIMEOUT_MS + 100);

    expect(room.phase).toBe("playing");
    expect(room.engine).not.toBeNull();
    const errorEmit = socketEmits.find((e) => e.socketId === "s_a" && e.event === "room:error");
    expect(errorEmit).toBeUndefined();
  });

  it("Test S11b: Preflight expiry still CANCELS when a silent player is actually disconnected", async () => {
    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code) as { ok: true; playerId: string };
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Mark Bob's seat disconnected WITHOUT going through handleDisconnect
    // (which cancels the attempt outright via its own path) — this isolates
    // the expiry handler's own server-observed connectivity check.
    room.players.get(joinB.playerId)!.isConnected = false;

    vi.advanceTimersByTime(PREFLIGHT_TIMEOUT_MS + 100);

    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
    const errorEmit = socketEmits.find((e) => e.socketId === "s_a" && e.event === "room:error");
    expect(errorEmit).toBeDefined();
  });

  it("Test S11c: Preflight expiry still CANCELS when a silent player reported needing rotation", async () => {
    const { io, socketEmits } = makeIo();
    const rooms = new RoomManager(io);
    // Rummy requires landscape, so an explicit rotation report is a real,
    // player-signalled blocker rather than mere silence.
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code) as { ok: true; playerId: string };
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    // Set the flag directly: `setOrientation` cancels the attempt on the spot,
    // which is a different (already-tested) path — this checks the expiry
    // handler's own reading of a report that landed before the attempt began.
    room.players.get(joinB.playerId)!.needsRotation = true;

    vi.advanceTimersByTime(PREFLIGHT_TIMEOUT_MS + 100);

    expect(room.activeStartAttempt).toBeNull();
    expect(room.phase).toBe("lobby");
    const errorEmit = socketEmits.find((e) => e.socketId === "s_a" && e.event === "room:error");
    expect(errorEmit).toBeDefined();
  });

  it("Test S11d: a partially-acknowledged expiry starts, and the silent seat stops reading as blocked", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    // Ludo — no orientation requirement, the game from the live report.
    const hostA = createRoomAs(rooms, "s_a", "Alice", "ludo");
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code) as { ok: true; playerId: string };
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attempt = room.activeStartAttempt!;

    // Only the host's ack lands; the second player's is lost in transit.
    await rooms.acknowledgeStart("s_a", {
      startAttemptId: attempt.id,
      roomRevision: room.roomRevision,
      visible: true,
      orientationSatisfied: true,
    });
    expect(room.phase).toBe("lobby");
    expect(
      rooms
        .getRoomStartReadiness(room)
        .participants.find((p) => p.playerId === joinB.playerId)?.blockers,
    ).toContain("ACKNOWLEDGEMENT_MISSING");

    vi.advanceTimersByTime(PREFLIGHT_TIMEOUT_MS + 100);

    expect(room.phase).toBe("playing");
    expect(attempt.acknowledgements.has(joinB.playerId)).toBe(true);
  });

  it("Test S12: Host migration cancels active start attempt", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    expect(room.activeStartAttempt).not.toBeNull();

    // Alice leaves
    await rooms.leaveRoom("s_a");
    expect(room.activeStartAttempt).toBeNull();
    expect(room.hostId).not.toBe(hostA.playerId);
    expect(room.phase).toBe("lobby");
  });

  it("Test S13: Duplicate start requests are ignored while attempt is active", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attemptId1 = room.activeStartAttempt!.id;

    // Rapid double-click by host
    await rooms.requestGameStart("s_a");
    expect(room.activeStartAttempt!.id).toBe(attemptId1); // Still the same attempt!
  });

  it("Test S14: Economy invalidation race triggers compensating refund", async () => {
    const { io } = makeIo();
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);

    const rooms = new RoomManager(io, service);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy", "member", MEMBER_A);
    const joinB = joinRoomAs(rooms, "s_b", "Bob", hostA.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    const refundSpy = vi.spyOn(service, "refundMatchEntry");

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attempt = room.activeStartAttempt!;
    const rev = room.roomRevision;

    // Intercept commitMatchEntry to simulate Bob disconnecting right during commit
    const originalCommit = service.commitMatchEntry.bind(service);
    service.commitMatchEntry = vi.fn().mockImplementation(async (args) => {
      const res = await originalCommit(args);
      // Bob disconnects during async boundary
      rooms.handleDisconnect("s_b");
      return res;
    });

    // Both acknowledge to trigger commit
    rooms.acknowledgeStart("s_a", { startAttemptId: attempt.id, roomRevision: rev, visible: true, orientationSatisfied: true });
    rooms.acknowledgeStart("s_b", { startAttemptId: attempt.id, roomRevision: rev, visible: true, orientationSatisfied: true });

    // Drain the compensating refund queue
    await rooms.drainEconomySettlementQueue();

    expect(room.phase).toBe("lobby");
    expect(room.engine).toBeNull();

    // Verify compensating refund was triggered and wallet was restored
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000"); // fully refunded
  });

  it("Test S15: Non-orientation game (RPS) requires no orientation acknowledgement", async () => {
    const { io, roomEmits } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rps");
    joinRoomAs(rooms, "s_b", "Bob", hostA.code);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const preflight = roomEmits.find((e) => e.event === "room:startPreflight") as { data: { requiredOrientation: unknown } };
    expect(preflight.data.requiredOrientation).toBeNull();

    const attemptId = room.activeStartAttempt!.id;
    const rev = room.roomRevision;

    rooms.acknowledgeStart("s_a", { startAttemptId: attemptId, roomRevision: rev, visible: true, orientationSatisfied: true });
    rooms.acknowledgeStart("s_b", { startAttemptId: attemptId, roomRevision: rev, visible: true, orientationSatisfied: true });

    expect(room.phase).toBe("playing");
    expect(room.engine).not.toBeNull();
  });

  it("Test S16: Solo vs bots does not require network preflight handshake", async () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "ludo");
    rooms.addBot("s_a"); // Bot 1
    rooms.setReady("s_a", true);

    // Host starts immediately without waiting on bot preflight
    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);

    expect(room.phase).toBe("playing");
    expect(room.engine).not.toBeNull();
  });

  it("Test S17: engine.init() throwing after a landed commit refunds the debit and unsticks the lobby", async () => {
    const { io } = makeIo();
    const { repo, service } = freshEconomy();
    seedMember(repo, MEMBER_A);
    seedMember(repo, MEMBER_B);

    const rooms = new RoomManager(io, service);
    const hostA = createRoomAs(rooms, "s_a", "Alice", "rummy", "member", MEMBER_A);
    joinRoomAs(rooms, "s_b", "Bob", hostA.code, "member", MEMBER_B);
    rooms.setReady("s_a", true);
    rooms.setReady("s_b", true);

    // The commit itself must succeed — this simulates a bug reachable only
    // AFTER the money already moved (a bad engine option, a validation gap
    // between getGameLimits and an engine's own init() check, a genuine
    // coding bug), not a checkout-time rejection.
    const initSpy = vi.spyOn(RummyEngine.prototype, "init").mockImplementationOnce(() => {
      throw new Error("Simulated engine.init() failure");
    });

    await rooms.requestGameStart("s_a");
    const room = peek(rooms, hostA.code);
    const attempt = room.activeStartAttempt!;
    const rev = room.roomRevision;

    rooms.acknowledgeStart("s_a", { startAttemptId: attempt.id, roomRevision: rev, visible: true, orientationSatisfied: true });
    rooms.acknowledgeStart("s_b", { startAttemptId: attempt.id, roomRevision: rev, visible: true, orientationSatisfied: true });
    await rooms.drainEconomySettlementQueue();

    // The match never actually started — no engine, no stuck "STARTING".
    expect(room.phase).toBe("lobby");
    expect(room.engine).toBeNull();
    expect(room.lifecycleState).toBe("READY_CHECK");
    expect(room.currentMatchId).toBeNull();

    // The debit that landed before init() threw must not stay stuck.
    expect((await service.getWallet(MEMBER_A)).balance).toBe("5000");

    initSpy.mockRestore();
  });
});
