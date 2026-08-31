import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";
import type {
  ChatMessage,
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * Recovery Success Rate — completed-outcome accounting.
 *
 * Replaces a metric that was structurally guaranteed to always read 100%
 * (its denominator, `recovery.attempts_total`, was never incremented in
 * production). These tests pin the new definition: a recovery SESSION
 * starts on a genuine connect->disconnect transition, and resolves exactly
 * once, either by a reclaim strictly before the authoritative deadline
 * (success) or by that deadline's own timer firing first (expired). Active,
 * unresolved sessions never enter the rate.
 */

function makeIo(): {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  chat: ChatMessage[];
} {
  const chat: ChatMessage[] = [];
  const fakeSocket = { join() {}, leave() {}, emit() {} };
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        if (event === "chat:message") chat.push(payload as ChatMessage);
      },
    }),
    sockets: { sockets: { get: () => fakeSocket } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, chat };
}

interface PeekRoom {
  players: Map<string, Player>;
  phase: string;
}
const peek = (rooms: RoomManager, code: string): PeekRoom =>
  (rooms as unknown as { rooms: Map<string, PeekRoom> }).rooms.get(code)!;

const playerOf = (rooms: RoomManager, code: string, name: string): Player =>
  [...peek(rooms, code).players.values()].find((p) => p.name === name)!;

/** Two humans, mid-Ludo-game — the auto-play/takeover machinery this seam
 *  also touches is irrelevant here; only the disconnect/reclaim/expiry path
 *  and the operational getters are under test. */
function seatTwoInMatch() {
  const { io, chat } = makeIo();
  const rooms = new RoomManager(io);
  const { code } = rooms.createRoom("sockA", "Alice", "ludo");
  rooms.joinRoom("sockB", "Bob", code);
  rooms.setReady("sockA", true);
  rooms.setReady("sockB", true);
  rooms.startGame("sockA");
  return { rooms, code, chat };
}

/** Two humans, still in the lobby — used for the grace-window-composition
 *  test, where the lobby's short window (vs. the match's long one) is what
 *  makes an authoritative-vs-recomputed deadline actually distinguishable. */
function seatTwoInLobby() {
  const { io, chat } = makeIo();
  const rooms = new RoomManager(io);
  const { code } = rooms.createRoom("sockA", "Alice", "ludo");
  rooms.joinRoom("sockB", "Bob", code);
  return { rooms, code, chat };
}

beforeEach(() => {
  vi.useFakeTimers();
  metricsRegistry.reset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RoomManager — recovery success rate (completed outcomes only)", () => {
  it("renders unavailable (null), never a fabricated 100%, when nothing has resolved", () => {
    const { rooms } = seatTwoInMatch();
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBeNull();
  });

  it("one success, zero expiry -> 100", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBe(100);
  });

  it("zero success, one expiry -> 0", () => {
    const { rooms, code } = seatTwoInMatch();
    void playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11 * 60_000); // past the 10-minute match grace window
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBe(0);
  });

  it("one success and one expiry -> 50", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));

    // A second, independent disconnect episode for the same seat, this time
    // left to expire — a session is per-episode, not per-player-forever.
    rooms.handleDisconnect("sockB2");
    vi.advanceTimersByTime(11 * 60_000);

    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBe(50);
  });

  it("an active, unresolved grace session does not affect the rate", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBe(100);

    // A brand-new, still-open session for the same seat — not yet resolved
    // either way. Must not dilute or change the rate computed above.
    rooms.handleDisconnect("sockB2");
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBe(100);
  });

  it("a repeated reclaim of the same seat does not double-count success", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(metricsRegistry.getCounter("recovery.sessions_succeeded_total")).toBe(1);

    // Same socket-equivalent join fired again (StrictMode-style duplicate, or
    // a client re-emitting room:join while already connected).
    rooms.joinRoom("sockB2", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(metricsRegistry.getCounter("recovery.sessions_succeeded_total")).toBe(1);
  });

  it("a join call for an already-connected seat is never counted as a recovery", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    // Bob was never disconnected — a duplicate/StrictMode join for a live seat.
    rooms.joinRoom("sockB", "Bob", code, bob.id, mintSeatToken(code, bob.id));
    expect(metricsRegistry.getCounter("recovery.sessions_succeeded_total")).toBe(0);
    expect(metricsRegistry.getCounter("recovery.sessions_started_total")).toBe(0);
  });

  it("a bot never contributes to recovery accounting", () => {
    const { io } = makeIo();
    const rooms = new RoomManager(io);
    const { code } = rooms.createRoom("sockA", "Alice", "ludo");
    rooms.addBot("sockA");
    rooms.setReady("sockA", true);
    rooms.startGame("sockA");
    vi.advanceTimersByTime(20 * 60_000);
    void code;
    expect(metricsRegistry.getCounter("recovery.sessions_started_total")).toBe(0);
    expect(metricsRegistry.getCounter("recovery.sessions_succeeded_total")).toBe(0);
    expect(metricsRegistry.getCounter("recovery.sessions_expired_total")).toBe(0);
  });

  it("an explicit leave (never disconnected) does not touch recovery counters", () => {
    const { rooms } = seatTwoInLobby();
    rooms.leaveRoom("sockB");
    expect(metricsRegistry.getCounter("recovery.sessions_started_total")).toBe(0);
    expect(metricsRegistry.getCounter("recovery.sessions_expired_total")).toBe(0);
  });

  it("grace expiry counts exactly once, not once per broadcast tick", () => {
    const { rooms, code } = seatTwoInMatch();
    void playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11 * 60_000);
    expect(metricsRegistry.getCounter("recovery.sessions_expired_total")).toBe(1);

    // Nothing left to expire again — advancing further must not re-fire it.
    vi.advanceTimersByTime(11 * 60_000);
    expect(metricsRegistry.getCounter("recovery.sessions_expired_total")).toBe(1);
  });

  it("room teardown after the last human leaves retains no stale recovery session", () => {
    const { rooms, code } = seatTwoInMatch();
    rooms.handleDisconnect("sockA");
    rooms.handleDisconnect("sockB");
    vi.advanceTimersByTime(11 * 60_000); // both expire; the room abandons

    const summary = rooms.getOperationalRecoverySummary();
    expect(summary.seats.find((s) => s.roomCode === code)).toBeUndefined();
  });

  it("counters are process-local and start at zero for a fresh registry (restart semantics)", () => {
    // `metricsRegistry` is an in-memory singleton with no persistence — a
    // process restart is exactly `metricsRegistry.reset()`, which the
    // `beforeEach` above already exercises for every test in this file.
    expect(metricsRegistry.getCounter("recovery.sessions_succeeded_total")).toBe(0);
    expect(metricsRegistry.getCounter("recovery.sessions_expired_total")).toBe(0);
    const { rooms } = seatTwoInMatch();
    expect(rooms.getOperationalDetailedStats().recoverySuccessRate).toBeNull();
  });
});

describe("RoomManager — grace eligibility uses the authoritative deadline", () => {
  it("remainingGraceMs is derived from player.awayUntil, not recomputed", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");

    const seat = rooms.getOperationalRecoverySummary().seats.find((s) => s.playerId === bob.id)!;
    expect(seat.remainingGraceMs).toBe(Math.max(0, bob.awayUntil! - Date.now()));
  });

  it("negative remaining time clamps to zero, never goes negative", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    // Force the deadline into the past without letting the real timer fire,
    // to exercise the clamp on the getter directly.
    bob.awayUntil = Date.now() - 5_000;

    const seat = rooms.getOperationalRecoverySummary().seats.find((s) => s.playerId === bob.id)!;
    expect(seat.remainingGraceMs).toBe(0);
    expect(seat.isEligibleForRejoin).toBe(false);
  });

  it("a disconnected seat with no deadline set is not reported as rejoin-eligible", () => {
    const { rooms, code } = seatTwoInMatch();
    const bob = playerOf(rooms, code, "Bob");
    rooms.handleDisconnect("sockB");
    delete bob.awayUntil;

    const stats = rooms.getOperationalDetailedStats();
    expect(stats.disconnectedUsers).toBeGreaterThan(0);
    // Present in the disconnected count, but not counted eligible without an
    // authoritative deadline to be eligible against.
    const seat = rooms.getOperationalRecoverySummary().seats.find((s) => s.playerId === bob.id);
    expect(seat).toBeUndefined();
  });

  it("room composition changing after disconnect does not move the original deadline", () => {
    // Bob disconnects while Alice is still in the lobby with him -> the
    // short (90s) lobby window is armed, because he is not solo. Alice then
    // explicitly leaves, which — read live, the way the old code did — would
    // make Bob look "solo" and (wrongly) imply the long 10-minute window.
    // The authoritative `awayUntil` must not move.
    const { rooms, code } = seatTwoInLobby();
    const bob = playerOf(rooms, code, "Bob");

    rooms.handleDisconnect("sockB");
    const originalAwayUntil = bob.awayUntil;
    expect(originalAwayUntil).toBeDefined();

    rooms.leaveRoom("sockA"); // Alice leaves; Bob is now the only human left

    expect(bob.awayUntil).toBe(originalAwayUntil);
    const seat = rooms.getOperationalRecoverySummary().seats.find((s) => s.playerId === bob.id)!;
    // The short lobby window (90s), not the long match/solo window (10min) —
    // this is the exact number the pre-fix recompute would have gotten wrong.
    expect(seat.gracePeriodMs).toBeLessThan(100_000);
  });

  it("the platform KPI and the recovery endpoint agree on who is rejoin-eligible", () => {
    const { rooms, code } = seatTwoInMatch();
    rooms.handleDisconnect("sockB");
    void code;

    const stats = rooms.getOperationalDetailedStats();
    const summary = rooms.getOperationalRecoverySummary();
    const eligibleInSummary = summary.seats.filter((s) => s.isEligibleForRejoin).length;
    expect(stats.rejoinEligibleUsers).toBe(eligibleInSummary);
  });
});
