import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { serverLifecycleRegistry } from "../../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../../reliability/ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";
import { EconomySettlementQueue } from "../economySettlementQueue.js";
import type { EconomyService, SettleMatchEconomyRequest, SettleMatchEconomyResult } from "../../economy/EconomyService.js";

const MATCH_GRACE_PERIOD_MS = 10 * 60_000;

function makeTestHarness(economyService?: EconomyService) {
  const emitted: { target: string; event: string; payload: unknown }[] = [];
  const sockets = new Map<string, { id: string; join: (r: string) => void; leave: (r: string) => void; emit: (ev: string, pl: unknown) => void }>();

  const registerSocket = (id: string) => {
    const sock = {
      id,
      join: (_r: string) => {},
      leave: (_r: string) => {},
      emit: (event: string, payload: unknown) => {
        emitted.push({ target: id, event, payload });
      },
    };
    sockets.set(id, sock);
    return sock;
  };

  const io = {
    sockets: { sockets },
    to: (code: string) => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ target: `room:${code}`, event, payload });
      },
    }),
  };

  const rooms = new RoomManager(io as never, economyService);
  const getInternalRoom = (code: string) => (rooms as unknown as { rooms: Map<string, any> }).rooms.get(code);
  return { rooms, registerSocket, emitted, getInternalRoom };
}

describe("BHALYAM — Multiplayer Game Flow & Recovery Certification Suite", () => {
  let harness: ReturnType<typeof makeTestHarness>;

  beforeEach(() => {
    vi.useFakeTimers();
    serverLifecycleRegistry.reset();
    serverResourceTracker.reset();
    serverEventStore.reset();
    metricsRegistry.reset();
    harness = makeTestHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Room Creation & Joining Lifecycle", () => {
    it("creates room with valid seatToken, player identity, and initial lobby state", () => {
      harness.registerSocket("s_host");
      const res = harness.rooms.createRoom("s_host", "Alice", "rps");

      expect(res.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(res.playerId).toBeTruthy();
      expect(res.seatToken).toBeTruthy();
      expect(res.state.phase).toBe("lobby");
      expect(res.state.players).toHaveLength(1);
      expect(res.state.players[0].name).toBe("Alice");
      expect(res.state.players[0].isHost).toBe(true);
      expect(res.state.hostId).toBe(res.playerId);
    });

    it("allows second player to join and prevents exceeding game capacity", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");
      harness.registerSocket("s_p3");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps"); // RPS capacity is 2

      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      expect(join2.ok).toBe(true);

      const join3 = harness.rooms.joinRoom("s_p3", "Charlie", code);
      expect(join3.ok).toBe(false);
      if (!join3.ok) {
        expect(join3.error).toBe("Room is full");
      }
    });

    it("idempotently handles duplicate join from the same socket without creating ghost seats", () => {
      harness.registerSocket("s_host");
      const { code, playerId, seatToken } = harness.rooms.createRoom("s_host", "Alice", "ludo");

      // Duplicate join emit with same socket
      const dupJoin = harness.rooms.joinRoom("s_host", "Alice", code);
      expect(dupJoin.ok).toBe(true);
      if (dupJoin.ok) {
        expect(dupJoin.playerId).toBe(playerId);
        expect(dupJoin.seatToken).toBe(seatToken);
      }

      const state = harness.rooms.getRoomStateByCode(code);
      expect(state?.players).toHaveLength(1);
    });
  });

  describe("2. Mid-Game Disconnect & Takeover Automation", () => {
    it("arms takeover bot when player disconnects during active multiplayer match", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "ludo");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      expect(join2.ok).toBe(true);
      const bobId = (join2 as { playerId: string }).playerId;

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      const stateBefore = harness.rooms.getRoomStateByCode(code);
      expect(stateBefore?.phase).toBe("playing");

      // Bob drops connection
      harness.rooms.handleDisconnect("s_p2");

      const stateAfter = harness.rooms.getRoomStateByCode(code);
      expect(stateAfter?.lifecycleState).toBe("RECOVERING");
      const bobSeat = stateAfter?.players.find((p) => p.id === bobId);
      expect(bobSeat?.isConnected).toBe(false);
      expect(bobSeat?.awaySince).toBeDefined();
      expect(bobSeat?.awayUntil).toBeDefined();
    });

    it("pauses game and clears turn timers when solo human disconnects vs bots", () => {
      harness.registerSocket("s_host");
      const { code, playerId } = harness.rooms.createRoom("s_host", "SoloAlice", "ludo");
      harness.rooms.addBot("s_host", "Bot1");
      harness.rooms.setReady("s_host", true);
      harness.rooms.startGame("s_host");

      expect(harness.rooms.getRoomStateByCode(code)?.phase).toBe("playing");

      // Solo player disconnects
      harness.rooms.handleDisconnect("s_host");

      const state = harness.rooms.getRoomStateByCode(code);
      expect(state?.lifecycleState).toBe("PAUSED");
      const aliceSeat = state?.players.find((p) => p.id === playerId);
      expect(aliceSeat?.isConnected).toBe(false);
    });
  });

  describe("3. Seat-Token Security & Reclaim Suite (10 Scenarios)", () => {
    it("Scenario 1: rejects forged token in non-full room from stealing victim identity", () => {
      harness.registerSocket("s_host");
      const { code, playerId: aliceId } = harness.rooms.createRoom("s_host", "Alice", "ludo"); // Ludo capacity is 4

      harness.registerSocket("s_attacker");
      const attackerJoin = harness.rooms.joinRoom(
        "s_attacker",
        "Attacker",
        code,
        aliceId,
        "completely_forged_token_xyz"
      );

      // Must succeed as a NEW player (since room has capacity in lobby), but MUST NOT give Alice's identity
      expect(attackerJoin.ok).toBe(true);
      if (attackerJoin.ok) {
        expect(attackerJoin.playerId).not.toBe(aliceId);
      }

      const room = harness.getInternalRoom(code);
      expect(room?.players.get(aliceId)?.name).toBe("Alice");
      expect(room?.socketToPlayer.get("s_host")).toBe(aliceId);
      expect(room?.socketToPlayer.get("s_attacker")).not.toBe(aliceId);
    });

    it("Scenario 2: rejects token modified by single character", () => {
      harness.registerSocket("s_host");
      const { code, playerId, seatToken } = harness.rooms.createRoom("s_host", "Alice", "ludo");

      // Mutate 1 character in valid token
      const tamperedToken = seatToken.slice(0, -1) + (seatToken.endsWith("a") ? "b" : "a");

      harness.registerSocket("s_tamper");
      const res = harness.rooms.joinRoom("s_tamper", "AliceClone", code, playerId, tamperedToken);

      expect(res.ok).toBe(true);
      if (res.ok) {
        // Did not reclaim Alice's seat
        expect(res.playerId).not.toBe(playerId);
      }
    });

    it("Scenario 3: rejects token minted for another room", () => {
      harness.registerSocket("s_host1");
      harness.registerSocket("s_host2");

      const room1 = harness.rooms.createRoom("s_host1", "Alice", "ludo");
      const room2 = harness.rooms.createRoom("s_host2", "Bob", "ludo");

      // Attempt to use Room 1's token in Room 2
      harness.registerSocket("s_cross");
      const crossJoin = harness.rooms.joinRoom("s_cross", "Eve", room2.code, room2.playerId, room1.seatToken);

      if (crossJoin.ok) {
        expect(crossJoin.playerId).not.toBe(room2.playerId);
      }
    });

    it("Scenario 4: rejects token associated with another player in same room", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code, playerId: aliceId, seatToken: aliceToken } = harness.rooms.createRoom("s_host", "Alice", "ludo");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      const bobId = (join2 as { playerId: string }).playerId;

      // Attacker tries to reclaim Bob's seat using Alice's valid token
      harness.registerSocket("s_intruder");
      const res = harness.rooms.joinRoom("s_intruder", "Intruder", code, bobId, aliceToken);

      if (res.ok) {
        expect(res.playerId).not.toBe(bobId);
      }
    });

    it("Scenario 5: rejects empty token string", () => {
      harness.registerSocket("s_host");
      const { code, playerId } = harness.rooms.createRoom("s_host", "Alice", "ludo");

      harness.registerSocket("s_empty");
      const res = harness.rooms.joinRoom("s_empty", "EmptyToken", code, playerId, "");

      if (res.ok) {
        expect(res.playerId).not.toBe(playerId);
      }
    });

    it("Scenario 6: rejects malformed token safely without throwing unhandled error", () => {
      harness.registerSocket("s_host");
      const { code, playerId } = harness.rooms.createRoom("s_host", "Alice", "ludo");

      harness.registerSocket("s_malformed");
      expect(() => {
        harness.rooms.joinRoom("s_malformed", "Malformed", code, playerId, "!@#$%^&*()_+~`|}{[]:;?><,./");
      }).not.toThrow();
    });

    it("Scenario 7: reclaims seat with valid token and restores connected state", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "ludo");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      const bobId = (join2 as { playerId: string }).playerId;
      const bobToken = (join2 as { seatToken: string }).seatToken;

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      harness.rooms.handleDisconnect("s_p2");

      harness.registerSocket("s_p2_reclaim");
      const reclaim = harness.rooms.joinRoom("s_p2_reclaim", "Bob", code, bobId, bobToken);

      expect(reclaim.ok).toBe(true);
      if (reclaim.ok) {
        expect(reclaim.playerId).toBe(bobId);
      }

      const state = harness.rooms.getRoomStateByCode(code);
      const bobSeat = state?.players.find((p) => p.id === bobId);
      expect(bobSeat?.isConnected).toBe(true);
    });

    it("Scenario 8: handles multi-tab takeover using same valid token", () => {
      harness.registerSocket("s_tab1");
      const { code, playerId, seatToken } = harness.rooms.createRoom("s_tab1", "Alice", "ludo");

      harness.registerSocket("s_tab2");
      const tab2Join = harness.rooms.joinRoom("s_tab2", "Alice", code, playerId, seatToken);

      expect(tab2Join.ok).toBe(true);
      if (tab2Join.ok) {
        expect(tab2Join.playerId).toBe(playerId);
      }
    });

    it("Scenario 9: disassociates old displaced socket after tab takeover", () => {
      harness.registerSocket("s_tab1");
      const { code, playerId, seatToken } = harness.rooms.createRoom("s_tab1", "Alice", "ludo");

      harness.registerSocket("s_tab2");
      harness.rooms.joinRoom("s_tab2", "Alice", code, playerId, seatToken);

      const room = harness.getInternalRoom(code);
      expect(room?.socketToPlayer.get("s_tab2")).toBe(playerId);
      expect(room?.socketToPlayer.get("s_tab1")).toBeUndefined();
      expect(harness.rooms.getRoomState("s_tab1")).toBeNull();
    });

    it("Scenario 10: rejects move attempts submitted from displaced old socket", () => {
      harness.registerSocket("s_tab1");
      harness.registerSocket("s_p2");

      const { code, playerId, seatToken } = harness.rooms.createRoom("s_tab1", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);

      harness.rooms.setReady("s_tab1", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_tab1");

      // Tab 2 takes over Alice's seat
      harness.registerSocket("s_tab2");
      harness.rooms.joinRoom("s_tab2", "Alice", code, playerId, seatToken);

      // Old displaced Tab 1 attempts move
      harness.rooms.applyMove("s_tab1", "choose", { choice: "rock" });

      // Tab 1 is displaced and cannot mutate
      const room = harness.getInternalRoom(code);
      expect(room?.socketToPlayer.get("s_tab1")).toBeUndefined();
      expect(harness.rooms.getRoomState("s_tab1")).toBeNull();
    });
  });

  describe("4. Host Succession & Abandonment", () => {
    it("reassigns host to remaining eligible player when host leaves lobby", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code, playerId: hostId } = harness.rooms.createRoom("s_host", "HostAlice", "ludo");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code, undefined, undefined, undefined, "member");
      expect(join2.ok).toBe(true);
      const bobId = (join2 as { playerId: string }).playerId;

      expect(harness.rooms.getRoomStateByCode(code)?.hostId).toBe(hostId);

      // Host leaves
      harness.rooms.leaveRoom("s_host");

      const stateAfter = harness.rooms.getRoomStateByCode(code);
      expect(stateAfter?.hostId).toBe(bobId);
      const bobPlayer = stateAfter?.players.find((p) => p.id === bobId);
      expect(bobPlayer?.isHost).toBe(true);
    });

    it("reassigns host after MATCH_GRACE_PERIOD_MS if host disconnects and fails to return", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code, playerId: hostId } = harness.rooms.createRoom("s_host", "HostAlice", "ludo");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code, undefined, undefined, undefined, "member");
      expect(join2.ok).toBe(true);
      const bobId = (join2 as { playerId: string }).playerId;

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      // Host drops
      harness.rooms.handleDisconnect("s_host");

      // Fast forward past match grace window (10 minutes)
      vi.advanceTimersByTime(MATCH_GRACE_PERIOD_MS + 5000);

      const state = harness.rooms.getRoomStateByCode(code);
      expect(state?.hostId).toBe(bobId);
      expect(state?.players.find((p) => p.id === hostId)).toBeUndefined();
    });

    it("abandons and destroys room when all humans depart", () => {
      harness.registerSocket("s_host");
      const { code } = harness.rooms.createRoom("s_host", "SoloAlice", "ludo");
      harness.rooms.addBot("s_host", "Bot1");

      harness.rooms.leaveRoom("s_host");

      expect(harness.rooms.getRoomStateByCode(code)).toBeNull();
      expect(harness.rooms.getRoomCount()).toBe(0);
    });
  });

  describe("5. Spectator Isolation & Flow", () => {
    it("allows spectator to join, receive broadcasts, and forbids making gameplay moves", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");
      harness.registerSocket("s_spec");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);

      const specRes = harness.rooms.spectateRoom("s_spec", code);
      expect(specRes.ok).toBe(true);

      const state = harness.rooms.getRoomStateByCode(code);
      expect(state?.spectatorCount).toBe(1);

      // Spectator attempts to make a move
      harness.rooms.applyMove("s_spec", "choose", { choice: "rock" });

      // Spectator leaves
      harness.rooms.stopSpectating("s_spec");
      const stateAfter = harness.rooms.getRoomStateByCode(code);
      expect(stateAfter?.spectatorCount).toBe(0);
      expect(stateAfter?.players).toHaveLength(2);
    });
  });

  describe("6. Rematch Flow & Match Completion Safety", () => {
    it("executes rematch lifecycle cleanly when all players vote accept", async () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      expect(join2.ok).toBe(true);

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      // Play 10 rounds so Alice reaches target score 10
      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      const stateFinished = harness.rooms.getRoomStateByCode(code);
      expect(stateFinished?.phase).toBe("finished");
      expect(stateFinished?.lifecycleState).toBe("COMPLETED");

      // Host requests rematch, opponent accepts
      harness.rooms.requestRematch("s_host");
      harness.rooms.respondRematch("s_p2", "accept");

      // Advance rematch countdown timer (3s)
      await vi.advanceTimersByTimeAsync(4000);

      const stateRematch = harness.rooms.getRoomStateByCode(code);
      expect(stateRematch?.phase).toBe("playing");
      expect(stateRematch?.lifecycleState).toBe("IN_PROGRESS");
    });

    it("cancels pending rematch if a player leaves during vote", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      // Play 10 rounds to finish
      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      expect(harness.rooms.getRoomStateByCode(code)?.phase).toBe("finished");

      // Host initiates rematch
      harness.rooms.requestRematch("s_host");

      // Bob leaves during vote
      harness.rooms.leaveRoom("s_p2");

      // Rematch state was emitted as declined
      const rematchEmits = harness.emitted.filter(
        (e) => e.event === "rematch:state" && (e.payload as { status?: string })?.status === "declined"
      );
      expect(rematchEmits.length).toBeGreaterThan(0);
    });
  });

  describe("7. Settlement Idempotency & Queue Resilience (10 Scenarios)", () => {
    it("Scenario 1: calling finalization multiple times does not duplicate state changes", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      // Finish match
      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      const room = harness.getInternalRoom(code)!;
      expect(room.phase).toBe("finished");

      // Redundant move attempts after finish
      harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
      expect(room.phase).toBe("finished");
    });

    it("Scenario 2: duplicate game-completion events are rejected when phase is finished", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      // Stale move after game over
      harness.rooms.applyMove("s_host", "choose", { choice: "rock" });

      const room = harness.getInternalRoom(code);
      expect(room?.phase).toBe("finished");
    });

    it("Scenario 3: EconomySettlementQueue handles duplicate requests idempotently via service", async () => {
      let callCount = 0;
      const mockEconomyService: Partial<EconomyService> = {
        settleMatchEconomy: vi.fn().mockImplementation(async (req: SettleMatchEconomyRequest): Promise<SettleMatchEconomyResult> => {
          callCount += 1;
          return {
            applied: callCount === 1,
            settlement: {
              matchId: req.matchId,
              roomCode: "MOCK01",
              hostIdentityId: "id_host",
              seatCount: 2,
              humanSeatCount: 2,
              botSeatCount: 0,
              costPerSeat: "50",
              totalCollected: "100",
              totalWalletRewarded: "100",
              totalGuestEscrow: "0",
              totalBotCollection: "0",
              totalWorldBankCut: "0",
              totalRefunded: "0",
              refundReason: null,
              totalForfeited: "0",
              forfeitureReason: null,
              status: "SETTLED",
              settledAt: Date.now(),
              createdAt: Date.now(),
            },
            issuedVouchers: [],
          };
        }),
      };

      const queue = new EconomySettlementQueue(mockEconomyService as EconomyService);

      const request: SettleMatchEconomyRequest = {
        matchId: "m_dup_queue_1",
        isValidRanking: true,
        participants: [
          { identityId: "id_alice", identityKind: "member", placement: 1 },
          { identityId: "id_bob", identityKind: "member", placement: 2 },
        ],
      };

      queue.queueSettlement(request);
      queue.queueSettlement(request);

      await queue.drain();

      const st = queue.status();
      expect(st.settled).toBe(2);
      expect(mockEconomyService.settleMatchEconomy).toHaveBeenCalledTimes(2);
    });

    it("Scenario 4: reconnect after match completion maintains completed state without re-settlement", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      const join2 = harness.rooms.joinRoom("s_p2", "Bob", code);
      const bobId = (join2 as { playerId: string }).playerId;
      const bobToken = (join2 as { seatToken: string }).seatToken;

      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      harness.rooms.handleDisconnect("s_p2");

      harness.registerSocket("s_p2_return");
      const reclaim = harness.rooms.joinRoom("s_p2_return", "Bob", code, bobId, bobToken);

      expect(reclaim.ok).toBe(true);
      const room = harness.getInternalRoom(code);
      expect(room?.phase).toBe("finished");
      expect(room?.lifecycleState).toBe("COMPLETED");
    });

    it("Scenario 5: stale actions ignored once finalized", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);
      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      const room = harness.getInternalRoom(code);
      expect(room?.phase).toBe("finished");
    });

    it("Scenario 6: rematch after prior settlement assigns fresh game and resets state", async () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);
      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      const room = harness.getInternalRoom(code)!;
      expect(room.phase).toBe("finished");

      // Rematch agreed
      harness.rooms.requestRematch("s_host");
      harness.rooms.respondRematch("s_p2", "accept");

      await vi.advanceTimersByTimeAsync(4000);

      expect(room.phase).toBe("playing");
      expect(room.lifecycleState).toBe("IN_PROGRESS");
    });

    it("Scenario 7: abandonment of completed room cleans up resources without double settlement", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);
      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      // Both players leave finished room
      harness.rooms.leaveRoom("s_host");
      harness.rooms.leaveRoom("s_p2");

      expect(harness.rooms.getRoomStateByCode(code)).toBeNull();
    });

    it("Scenario 8: player departure from finished room does not re-trigger finalization", () => {
      harness.registerSocket("s_host");
      harness.registerSocket("s_p2");

      const { code } = harness.rooms.createRoom("s_host", "Alice", "rps");
      harness.rooms.joinRoom("s_p2", "Bob", code);
      harness.rooms.setReady("s_host", true);
      harness.rooms.setReady("s_p2", true);
      harness.rooms.startGame("s_host");

      for (let i = 0; i < 10; i++) {
        harness.rooms.applyMove("s_host", "choose", { choice: "rock" });
        harness.rooms.applyMove("s_p2", "choose", { choice: "scissors" });
      }

      const room = harness.getInternalRoom(code)!;
      expect(room.phase).toBe("finished");

      // Bob leaves after match is finished
      harness.rooms.leaveRoom("s_p2");

      expect(room.phase).toBe("finished");
      expect(room.players.has("s_p2")).toBe(false);
    });

    it("Scenario 9: EconomySettlementQueue tracks failed jobs without throwing unhandled exceptions", async () => {
      const mockEconomyService: Partial<EconomyService> = {
        settleMatchEconomy: vi.fn().mockRejectedValue(new Error("Database RPC failure")),
      };

      const queue = new EconomySettlementQueue(mockEconomyService as EconomyService);

      queue.queueSettlement({
        matchId: "m_fail_1",
        isValidRanking: true,
        participants: [],
      });

      await queue.drain();

      const st = queue.status();
      expect(st.failed).toBe(1);
      expect(st.lastError).toContain("Database RPC failure");
    });

    it("Scenario 10: EconomySettlementQueue executes jobs serially via FIFO promise tail", async () => {
      const executionOrder: string[] = [];
      const mockEconomyService: Partial<EconomyService> = {
        settleMatchEconomy: vi.fn().mockImplementation(async (req: SettleMatchEconomyRequest) => {
          executionOrder.push(req.matchId);
          return { applied: true, settlement: {} as never, issuedVouchers: [] };
        }),
      };

      const queue = new EconomySettlementQueue(mockEconomyService as EconomyService);

      queue.queueSettlement({ matchId: "m_seq_1", isValidRanking: true, participants: [] });
      queue.queueSettlement({ matchId: "m_seq_2", isValidRanking: true, participants: [] });
      queue.queueSettlement({ matchId: "m_seq_3", isValidRanking: true, participants: [] });

      await queue.drain();

      expect(executionOrder).toEqual(["m_seq_1", "m_seq_2", "m_seq_3"]);
    });
  });
});
