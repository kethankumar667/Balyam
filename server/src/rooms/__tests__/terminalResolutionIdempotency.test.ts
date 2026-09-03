import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const origRequestGameStart = RoomManager.prototype.requestGameStart;
beforeAll(() => {
  RoomManager.prototype.requestGameStart = async function (socketId: string) {
    const res = await origRequestGameStart.call(this, socketId);
    const { room } = (this as any).lookup(socketId);
    if (room?.activeStartAttempt && room.activeStartAttempt.status === "COLLECTING_PREFLIGHT") {
      const attempt = room.activeStartAttempt;
      for (const [sId, pId] of room.socketToPlayer.entries()) {
        if (attempt.requiredHumanPlayerIds.has(pId)) {
          await this.acknowledgeStart(sId, {
            startAttemptId: attempt.id,
            roomRevision: attempt.roomRevision,
            visible: true,
            orientationSatisfied: true,
          });
        }
      }
    }
    return res;
  };
});
afterAll(() => {
  RoomManager.prototype.requestGameStart = origRequestGameStart;
});
import { metricsCollector } from "../../observability/MetricsCollector.js";
import { profileService } from "../../profile/ProfileService.js";
import { recentPlayersService } from "../../ranking/RecentPlayersService.js";
import { serverTimelineRecorder } from "../../events/ServerTimelineRecorder.js";
import type { AccountKind, ClientToServerEvents, GameKind, Player, ServerToClientEvents } from "@shared/types.js";

/**
 * Blocker 02 — Terminal Resolution Idempotency.
 *
 * A room/match/economy settlement must reach a terminal outcome exactly
 * once, no matter how many independent pathways become eligible to trigger
 * one (natural completion, disconnect-grace expiry, idle removal,
 * abandonment, host migration). Downstream economy dedup (`currentMatchId`
 * nulling, now inline inside `finalizeMatch`/`abandonRoom`'s own
 * `attemptSettlementPersistence`/`attemptAbandonmentPersistence` — see
 * `RoomManager.ts`; Phase 06.1B's own durability-gate `terminalStatus`
 * state machine is a second, independent idempotency layer on top of it)
 * already prevents a second WALLET effect — this suite is about the layer
 * above that: `finalizeMatch` itself must not re-run its non-economic side
 * effects (profile/ranking stats, the timeline recorder, match-finished
 * metrics) a second time for a match that already concluded.
 *
 * Tests B/G/H reproduce the exact race directly through RoomManager's own
 * public API (disconnect -> auto-play -> natural completion -> a STALE,
 * independently-armed disconnect-grace timer firing afterward) — no mocks
 * of RoomManager's internals. Tests C/D/E/F exercise the full pairwise
 * terminal-outcome matrix by calling `finalizeMatch`/`abandonRoom`
 * themselves — the actual, current, live production methods (intentionally
 * private, never a public surface) every real caller reaches — directly,
 * the same reflection technique economyIntegration.test.ts's own
 * "commit-succeeded-but-never-playing" test already uses for precise state
 * construction. (Tests E and F previously reflected into three now-removed
 * compatibility-adapter methods that Phase 06.1B made dead code with zero
 * production callers — removed entirely as of the Blocker 06 06.1B-audit
 * P1-1 remediation. Both tests were rewritten to exercise `finalizeMatch`/
 * `abandonRoom` directly instead.)
 */

function makeIo() {
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io };
}

function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 3;
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
  accountKind: AccountKind,
  identityId: string | null,
) {
  return rooms.joinRoom(socketId, name, code, undefined, undefined, undefined, accountKind, identityId);
}

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";

function freshEconomy(): { repo: InMemoryEconomyRepository; service: EconomyService } {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  return { repo, service };
}

function seedMember(repo: InMemoryEconomyRepository, identityId: string, balance = "5000"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: "member", balance, lifetimeGranted: balance, starterGranted: true });
}

/** RPS, forced outcome: the socket that always calls "rock" beats one that always calls "scissors", first to 10. */
function playRpsToCompletion(rooms: RoomManager, winnerSocket: string, loserSocket: string): void {
  for (let round = 0; round < 10; round++) {
    rooms.applyMove(winnerSocket, "choose", { choice: "rock" });
    rooms.applyMove(loserSocket, "choose", { choice: "scissors" });
  }
}

/**
 * Drives an RPS match to natural completion where the LOSING seat is
 * disconnected and being auto-played by the server (via the same
 * `scheduleBotMoveIfNeeded`/`applyAutoMove` machinery a real bot uses —
 * `isAutoDriven` treats the two identically). `Math.random` is pinned for
 * the duration so the auto-driven seat's throw always resolves to
 * "scissors" (`RpsEngine.applyAutoMove`: `VALID_CHOICES[Math.floor(0.8*3)]`
 * = index 2), letting the connected winner's "rock" win every round
 * deterministically — same pinning technique economyIntegration.test.ts's
 * own `playToNaturalCompletion` uses for a real bot opponent.
 */
function playToNaturalCompletionAgainstAutoDrivenSeat(rooms: RoomManager, winnerSocketId: string): void {
  const originalRandom = Math.random;
  Math.random = () => 0.8;
  try {
    for (let round = 0; round < 10; round++) {
      rooms.applyMove(winnerSocketId, "choose", { choice: "rock" });
      vi.advanceTimersByTime(2_100);
    }
  } finally {
    Math.random = originalRandom;
  }
}

/**
 * Reflection access to the terminal-resolution functions under test.
 * All four are deliberately private (never a public RoomManager surface) —
 * exercising the exhaustive pairwise matrix (Tests C-F) requires calling
 * them directly, exactly as economyIntegration.test.ts's own
 * "commit-succeeded-but-never-playing" test directly mutates `room.phase`
 * for the same reason: constructing a precise race precondition is not
 * otherwise reachable deterministically through the public API alone.
 */
interface PrivateTerminalSurface {
  finalizeMatch(room: Room, departedPlayer?: Player): Promise<void>;
  abandonRoom(room: Room): Promise<void>;
  forceQuitAutoPlayedSeat(room: Room, playerId: string): Promise<void>;
}
function priv(rooms: RoomManager): PrivateTerminalSurface {
  return rooms as unknown as PrivateTerminalSurface;
}

describe("Blocker 02 — Terminal Resolution Idempotency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Test A: natural gameplay completion", () => {
    it("finalizeMatch executes once and settlement is queued exactly once", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const settleSpy = vi.spyOn(service, "settleMatchEconomy");
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");

      playRpsToCompletion(rooms, "s_a", "s_b");
      await rooms.drainEconomySettlementQueue();

      expect(profileSpy).toHaveBeenCalledTimes(1);
      expect(settleSpy).toHaveBeenCalledTimes(1);
      expect(peek(rooms, host.code).currentMatchId).toBeNull();
    });
  });

  describe("Test B: natural completion followed by a stale grace-expiry callback", () => {
    it("first completion wins; the later grace-expiry callback for an already-finished match is a safe no-op", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");
      const recentSpy = vi.spyOn(recentPlayersService, "recordMatch");
      const timelineSpy = vi.spyOn(serverTimelineRecorder, "recordGameFinished");
      const metricsSpy = vi.spyOn(metricsCollector, "onMatchFinished");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.startGame("s_a");

      // Bob disconnects mid-match — this arms BOTH the 10s takeover timer
      // AND the independent ~10-minute disconnect-grace REMOVAL timer in
      // the same call (RoomManager.ts's own handleDisconnect/armTakeover).
      rooms.handleDisconnect("s_b");
      vi.advanceTimersByTime(11_000); // past TAKEOVER_GRACE_MS -> Bob is now auto-driven

      playToNaturalCompletionAgainstAutoDrivenSeat(rooms, "s_a");

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("finished"); // natural completion, well under the 10-minute grace window
      expect(profileSpy).toHaveBeenCalledTimes(1);
      expect(recentSpy).toHaveBeenCalledTimes(1);
      expect(timelineSpy).toHaveBeenCalledTimes(1);
      expect(metricsSpy).toHaveBeenCalledTimes(1);

      // Bob's disconnect-grace REMOVAL timer (armed back at handleDisconnect,
      // independent of the takeover timer) is STILL pending. Advance past it
      // to fire the exact stale callback the observed race describes.
      vi.advanceTimersByTime(600_000);

      expect(profileSpy).toHaveBeenCalledTimes(1); // still exactly 1 — no duplicate
      expect(recentSpy).toHaveBeenCalledTimes(1);
      expect(timelineSpy).toHaveBeenCalledTimes(1);
      expect(metricsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Test C: abandonment followed by a later completion signal", () => {
    it("abandonment wins; a subsequent finalizeMatch call for the same room is a safe no-op", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");
      const abandonedMetricSpy = vi.spyOn(metricsCollector, "onRoomAbandoned");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      rooms.startGame("s_a");
      const room = peek(rooms, host.code);

      priv(rooms).abandonRoom(room); // e.g. the last human leaving mid-match
      expect(room.lifecycleState).toBe("CLOSED");
      expect(abandonedMetricSpy).toHaveBeenCalledTimes(1);

      // A stale in-flight closure (e.g. a queued auto-move tick that
      // captured `room` directly, not re-fetched from the room map) still
      // attempts to report completion after abandonment already tore the
      // room down.
      priv(rooms).finalizeMatch(room);

      expect(room.lifecycleState).toBe("CLOSED"); // unchanged — never reverted to COMPLETED
      expect(profileSpy).not.toHaveBeenCalled(); // no completion ever recorded for an abandoned match
    });
  });

  describe("Test D: completion followed by an abandonment signal", () => {
    it("completion wins; a subsequent abandonRoom call routes to ordinary teardown, never re-abandons", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const abandonedMetricSpy = vi.spyOn(metricsCollector, "onRoomAbandoned");
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      rooms.startGame("s_a");
      const room = peek(rooms, host.code);

      priv(rooms).finalizeMatch(room); // natural completion fires first
      expect(room.lifecycleState).toBe("COMPLETED");
      expect(profileSpy).toHaveBeenCalledTimes(1);

      priv(rooms).abandonRoom(room); // a stale abandonment signal arrives afterward

      expect(abandonedMetricSpy).not.toHaveBeenCalled(); // routed to closeConcludedRoom, never counted as abandonment
      expect(room.lifecycleState).toBe("CLOSED"); // COMPLETED -> CLOSED directly, never -> ABANDONED
      expect((rooms as unknown as { rooms: Map<string, Room> }).rooms.has(host.code)).toBe(false);
    });
  });

  /**
   * Tests E and F (below) were remediated per the Blocker 06 combined
   * 06.1B audit's finding P1-1: the original versions reflected into three
   * compatibility-adapter methods that, as of Phase 06.1B, were never
   * called from any production code path (`finalizeMatch`/`abandonRoom`
   * now construct and persist their settlement/refund/forfeiture requests inline — see
   * `RoomManager.ts`'s own `attemptSettlementPersistence`/
   * `attemptAbandonmentPersistence`). Those three dead methods have been
   * removed entirely; these tests now reflect into `finalizeMatch`/
   * `abandonRoom` themselves — the actual, current, live production
   * methods every real caller in `RoomManager.ts` reaches (§6 of the
   * audit's own call graph) — exactly like this file's own pre-existing,
   * already-accepted Tests C/D/G/H already do for the identical reason
   * (constructing a precise race precondition is not otherwise reachable
   * deterministically through the public API alone). No dead method is
   * referenced anywhere in this file any longer.
   */
  describe("Test E: duplicate forfeiture attempts through the real production path", () => {
    it("the first terminal persistence call wins; a second direct abandonRoom call for the same room is a safe no-op — exactly one financial application", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");
      const refundSpy = vi.spyOn(service, "refundMatchEntry");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      rooms.addBot("s_a", "Botty");
      rooms.setReady("s_a", true);
      await rooms.requestGameStart("s_a");
      const room = peek(rooms, host.code);
      const matchId = room.currentMatchId!;

      await priv(rooms).abandonRoom(room); // real production forfeiture path — room is playing, no human successor
      await priv(rooms).abandonRoom(room); // a stale second attempt for the exact same room object
      await rooms.drainEconomySettlementQueue();

      expect(forfeitSpy).toHaveBeenCalledTimes(1);
      expect(refundSpy).not.toHaveBeenCalled();
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("ABANDONMENT_FORFEITED");
    });
  });

  describe("Test F: duplicate settlement attempts through the real production path", () => {
    it("finalizeMatch persists a settlement intent exactly once for the same room, even across two direct calls", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B);
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const settleSpy = vi.spyOn(service, "settleMatchEconomy");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const room = peek(rooms, host.code);

      await priv(rooms).finalizeMatch(room); // real production settlement path
      await priv(rooms).finalizeMatch(room); // stale second call, same room object
      await rooms.drainEconomySettlementQueue();

      expect(settleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Test G: host migration plus terminal completion race", () => {
    it("reproduces the observed timeline exactly: reassignHost fires from the same stale grace-expiry callback that would have double-finalized", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A); // Alice is host
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.startGame("s_a");

      // The HOST disconnects this time — matches the prompt's own "Observed
      // timeline" exactly (reassignHost fires from inside the stale callback).
      rooms.handleDisconnect("s_a");
      vi.advanceTimersByTime(11_000); // past TAKEOVER_GRACE_MS -> Alice is now auto-driven

      playToNaturalCompletionAgainstAutoDrivenSeat(rooms, "s_b"); // Bob (connected) plays her out

      const room = peek(rooms, host.code);
      expect(room.phase).toBe("finished"); // natural completion, host still nominally Alice
      expect(room.hostId).toBe(host.playerId); // reassignHost has not run yet — only the departure timer does that
      expect(profileSpy).toHaveBeenCalledTimes(1);

      // Alice's disconnect-grace REMOVAL timer fires ~10 minutes later,
      // deletes her seat, and — because she was still nominally host — runs
      // reassignHost before attempting finalizeMatch again. This is the
      // literal reassignHost -> finalizeMatch shape from the observed race.
      vi.advanceTimersByTime(600_000);

      expect(room.hostId).toBe(bobJoin.ok ? bobJoin.playerId : null); // reassigned once Alice's seat is finally reaped
      expect(profileSpy).toHaveBeenCalledTimes(1); // still exactly 1 — the guarded finalizeMatch attempt is a no-op
    });
  });

  describe("Test H: disconnect-grace expiry plus idle-removal race", () => {
    it("idle-removal's own finalizeMatch call wins; a later disconnect-grace-expiry finalizeMatch attempt for the same match is a safe no-op", () => {
      const { io } = makeIo();
      const rooms = new RoomManager(io);
      const profileSpy = vi.spyOn(profileService, "recordMatchFinished");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      const bobJoin = joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      rooms.startGame("s_a");
      const room = peek(rooms, host.code);
      const bobId = bobJoin.ok ? bobJoin.playerId : "";

      // Idle-removal fires first: Bob exceeded AUTO_PLAY_TURN_CAP while idle
      // (connected, not acting). RPS has no `quitPlayer`, so this is a full
      // seat removal + walkover, ending the match for Alice.
      priv(rooms).forceQuitAutoPlayedSeat(room, bobId);
      expect(room.phase).toBe("finished");
      expect(profileSpy).toHaveBeenCalledTimes(1);

      // A disconnect-grace-expiry timer, armed independently for the same
      // seat before it was force-quit, fires later and attempts the exact
      // same finalizeMatch call the real grace-expiry callback makes.
      priv(rooms).finalizeMatch(room);

      expect(profileSpy).toHaveBeenCalledTimes(1); // still exactly 1
    });
  });

  describe("Test I: economy integration verification", () => {
    it("the natural-completion-then-stale-grace-expiry race applies exactly one economic outcome", async () => {
      const { repo, service } = freshEconomy();
      seedMember(repo, MEMBER_A);
      seedMember(repo, MEMBER_B, "1000");
      const { io } = makeIo();
      const rooms = new RoomManager(io, service);
      const settleSpy = vi.spyOn(service, "settleMatchEconomy");
      const refundSpy = vi.spyOn(service, "refundMatchEntry");
      const forfeitSpy = vi.spyOn(service, "forfeitMatchEntry");

      const host = createRoomAs(rooms, "s_a", "Alice", "rps", "member", MEMBER_A);
      joinRoomAs(rooms, "s_b", "Bob", host.code, "member", MEMBER_B);
      rooms.setReady("s_a", true);
      rooms.setReady("s_b", true);
      await rooms.requestGameStart("s_a");
      const matchId = peek(rooms, host.code).currentMatchId!;

      rooms.handleDisconnect("s_b");
      vi.advanceTimersByTime(11_000);
      playToNaturalCompletionAgainstAutoDrivenSeat(rooms, "s_a");
      await rooms.drainEconomySettlementQueue();

      vi.advanceTimersByTime(600_000); // the stale grace-expiry callback fires
      await rooms.drainEconomySettlementQueue();

      expect(settleSpy).toHaveBeenCalledTimes(1);
      expect(refundSpy).not.toHaveBeenCalled();
      expect(forfeitSpy).not.toHaveBeenCalled();
      const settlement = await service.getSettlement(matchId);
      expect(settlement?.status).toBe("SETTLED");
      const alice = await service.getWallet(MEMBER_A);
      expect(alice.balance).toBe("4950"); // debited 200, credited 150 prize — exactly once
    }, 15_000);
  });
});
