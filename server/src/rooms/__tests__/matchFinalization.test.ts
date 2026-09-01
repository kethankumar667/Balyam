import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { profileService } from "../../profile/ProfileService.js";
import { isValidLifecycleTransition } from "@shared/lifecycle.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";

/**
 * Regression suite for MULTIPLAYER-RELIABILITY-BASELINE.md gaps G1, G2, G4,
 * G8, G14 — every place a match can end (a direct move, a bot's own
 * auto-move, a turn-timeout auto-move, and an explicit-leave or
 * grace-expiry forfeit) must go through the same `finalizeMatch` path:
 * `room.phase` flips to "finished", `lifecycleState` reaches "COMPLETED",
 * and the result is recorded into profile/ranking. Before this fix, only
 * the direct-move path did any of that.
 */
function makeIo() {
  const emits: { event: string; socketId?: string; data?: unknown }[] = [];
  const roomEmits: { room: string; event: string; data?: unknown }[] = [];

  const socketFor = (socketId: string) => ({
    join() {},
    leave() {},
    emit: (event: string, data?: unknown) => emits.push({ event, socketId, data }),
  });

  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => {
        roomEmits.push({ room, event, data });
      },
    }),
    sockets: {
      sockets: {
        get: (id: string) => socketFor(id),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, emits, roomEmits };
}

describe("shared/lifecycle.ts — RECOVERING and PAUSED can reach COMPLETED", () => {
  it("allows a match to finish while the room is mid-recovery or paused (G2 fix)", () => {
    expect(isValidLifecycleTransition("RECOVERING", "COMPLETED")).toBe(true);
    expect(isValidLifecycleTransition("PAUSED", "COMPLETED")).toBe(true);
  });

  it("still rejects genuinely illegal transitions", () => {
    expect(isValidLifecycleTransition("COMPLETED", "CREATED")).toBe(false);
    expect(isValidLifecycleTransition("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(isValidLifecycleTransition("WAITING_FOR_PLAYERS", "COMPLETED")).toBe(false);
  });
});

describe("RoomManager — match finalization is a single, audited path", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records match history and advances lifecycleState to COMPLETED when a BOT's own auto-move finishes the match (G1/G2, bot-takeover path)", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);
    const { code, playerId: aliceId } = rm.createRoom("s_alice", "Alice", "rps");
    rm.addBot("s_alice", "Botty");
    rm.setReady("s_alice", true);
    rm.startGame("s_alice");

    const matchesBefore = profileService.getStats(aliceId).totalMatches;

    // Force every bot throw to be "paper" (VALID_CHOICES[1]) so the bot
    // beats Alice's "rock" deterministically every round — this test needs
    // the OUTCOME to be certain, not the actual RPS randomness.
    const originalRandom = Math.random;
    Math.random = () => 0.4; // Math.floor(0.4 * 3) === 1 === "paper"
    try {
      // RPS is first-to-10. Alice throws first each round (not yet over —
      // the bot hasn't chosen), then the bot's scheduled auto-throw fires
      // and — on ordinary rounds — is what actually flips isOver() true.
      // This is not a contrived edge case: it is how a human-vs-bot RPS
      // match against a bot who reacts second always finishes.
      for (let round = 0; round < 10; round++) {
        rm.applyMove("s_alice", "choose", { choice: "rock" });
        vi.advanceTimersByTime(2100); // clears the bot's max ~2000ms "thinking" delay, stays well under the 30s round deadline
      }
    } finally {
      Math.random = originalRandom;
    }

    const state = rm.getRoomState("s_alice") as unknown as { phase: string; lifecycleState: string } | null;
    expect(state?.phase).toBe("finished");
    expect(state?.lifecycleState).toBe("COMPLETED");

    const stats = profileService.getStats(aliceId);
    expect(stats.totalMatches).toBe(matchesBefore + 1);
    void code;
  });

  it("records match history and advances lifecycleState to COMPLETED when a turn-timeout auto-move finishes the match (G1/G2, afterAutoMove path)", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);
    const { playerId: aliceId } = rm.createRoom("s_alice", "Alice", "blockblast");
    rm.addBot("s_alice", "Botty");
    rm.setReady("s_alice", true);
    rm.startGame("s_alice");

    const matchesBefore = profileService.getStats(aliceId).totalMatches;

    // Block Blast's race has a single, deterministic 120s deadline
    // (DEFAULT_BLOCKBLAST_OPTIONS.raceSeconds) — no per-round RNG involved
    // in whether the race ends, only in the final placement. Once the
    // deadline passes, RoomManager.onTurnTimeout calls
    // engine.finishOnDeadline() → afterAutoMove(room, true).
    vi.advanceTimersByTime(121_000);

    const state = rm.getRoomState("s_alice") as unknown as { phase: string; lifecycleState: string } | null;
    expect(state?.phase).toBe("finished");
    expect(state?.lifecycleState).toBe("COMPLETED");

    const stats = profileService.getStats(aliceId);
    expect(stats.totalMatches).toBe(matchesBefore + 1);
  });

  it("finalizes a 1v1 match the instant an explicit leave forces a forfeit win, instead of leaving phase stuck at 'playing' forever (G14)", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);
    const created = rm.createRoom("h_alice", "Alice", "handcricket");
    const joined = rm.joinRoom("h_bob", "Bob", created.code);
    expect(joined.ok).toBe(true);
    const bobId = (joined as { playerId: string }).playerId;
    rm.setReady("h_alice", true);
    rm.setReady("h_bob", true);
    rm.startGame("h_alice");

    const bobMatchesBefore = profileService.getStats(bobId).totalMatches;

    rm.leaveRoom("h_alice"); // Alice forfeits to Bob

    const state = rm.getRoomState("h_bob") as unknown as { phase: string; lifecycleState: string } | null;
    expect(state?.phase).toBe("finished");
    expect(state?.lifecycleState).toBe("COMPLETED");

    const bobStats = profileService.getStats(bobId);
    expect(bobStats.totalMatches).toBe(bobMatchesBefore + 1);
  });

  it("rejects a move sent for a room that has already finished, instead of letting a stale event reopen it (G4)", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);
    const created = rm.createRoom("h_alice", "Alice", "handcricket");
    const joined = rm.joinRoom("h_bob", "Bob", created.code);
    expect(joined.ok).toBe(true);
    rm.setReady("h_alice", true);
    rm.setReady("h_bob", true);
    rm.startGame("h_alice");

    rm.leaveRoom("h_alice"); // Bob wins by forfeit; room is now "finished" (G14)
    const finishedState = rm.getRoomState("h_bob") as unknown as { phase: string } | null;
    expect(finishedState?.phase).toBe("finished");

    // A late/replayed move now arrives for the finished room.
    rm.applyMove("h_bob", "choice", { move: "anything" });

    const stateAfter = rm.getRoomState("h_bob") as unknown as { phase: string } | null;
    expect(stateAfter?.phase).toBe("finished"); // unchanged — the stale move was rejected, not applied
  });

  it("clears pending rematch timers when the room is abandoned, instead of leaving them to fire against a deleted room (G8)", () => {
    const { io } = makeIo();
    const rm = new RoomManager(io);
    const created = rm.createRoom("h_alice", "Alice", "handcricket");
    const joined = rm.joinRoom("h_bob", "Bob", created.code);
    expect(joined.ok).toBe(true);
    rm.setReady("h_alice", true);
    rm.setReady("h_bob", true);
    rm.startGame("h_alice");

    rm.leaveRoom("h_alice"); // Bob wins by forfeit (G14) — room now "finished"
    rm.requestRematch("h_bob"); // arms room.rematchTimer (30s)

    // Bob leaves too — last human gone, abandonRoom must tear down every
    // timer it owns, including the rematch ones (previously it did not).
    rm.leaveRoom("h_bob");

    const roomsMap = (rm as unknown as { rooms: Map<string, unknown> }).rooms;
    expect(roomsMap.has(created.code)).toBe(false);

    // If rematchTimer/rematchStartTimer had leaked, this would either throw
    // (mutating a detached, already-torn-down Room) or silently resurrect
    // room state nobody holds a reference to. Neither happens.
    expect(() => vi.advanceTimersByTime(31_000)).not.toThrow();
    expect(roomsMap.has(created.code)).toBe(false);
  });

  describe("Blocker 01 — match winner resolution via shared getWinnerId fallback", () => {
    it("correctly records WIN for winner and LOSS for loser in a decisive non-DotsBoxes 1v1 match (RPS)", () => {
      const { io } = makeIo();
      const rm = new RoomManager(io);
      const created = rm.createRoom("s_alice", "Alice", "rps");
      const joined = rm.joinRoom("s_bob", "Bob", created.code);
      expect(joined.ok).toBe(true);

      const aliceId = created.playerId;
      const bobId = (joined as { playerId: string }).playerId;

      rm.setReady("s_alice", true);
      rm.setReady("s_bob", true);
      rm.startGame("s_alice");

      // Play 10 rounds of RPS where Alice throws rock and Bob throws scissors.
      // Target is 10. Alice wins 10-0.
      for (let round = 0; round < 10; round++) {
        rm.applyMove("s_alice", "choose", { choice: "rock" });
        rm.applyMove("s_bob", "choose", { choice: "scissors" });
      }

      const state = rm.getRoomState("s_alice") as unknown as { phase: string; lifecycleState: string } | null;
      expect(state?.phase).toBe("finished");
      expect(state?.lifecycleState).toBe("COMPLETED");

      // Verify Alice (Winner)
      const aliceStats = profileService.getStats(aliceId);
      expect(aliceStats.totalMatches).toBe(1);
      expect(aliceStats.wins).toBe(1);
      expect(aliceStats.losses).toBe(0);
      expect(aliceStats.draws).toBe(0);
      expect(aliceStats.currentWinStreak).toBe(1);

      const aliceProfile = profileService.getProfile(aliceId);
      expect(aliceProfile?.experiencePoints).toBe(50); // 50 XP for WIN

      // Verify Bob (Loser)
      const bobStats = profileService.getStats(bobId);
      expect(bobStats.totalMatches).toBe(1);
      expect(bobStats.wins).toBe(0);
      expect(bobStats.losses).toBe(1);
      expect(bobStats.draws).toBe(0);
      expect(bobStats.currentWinStreak).toBe(0);

      const bobProfile = profileService.getProfile(bobId);
      expect(bobProfile?.experiencePoints).toBe(15); // 15 XP for LOSS
    });

    it("correctly records genuine DRAW for both players in a drawn match (Chess agreed draw)", () => {
      const { io } = makeIo();
      const rm = new RoomManager(io);
      const created = rm.createRoom("c_alice", "Alice", "chess");
      const joined = rm.joinRoom("c_bob", "Bob", created.code);
      expect(joined.ok).toBe(true);

      const aliceId = created.playerId;
      const bobId = (joined as { playerId: string }).playerId;

      rm.setReady("c_alice", true);
      rm.setReady("c_bob", true);
      rm.startGame("c_alice");

      // Alice offers draw, Bob accepts draw
      rm.applyMove("c_alice", "offerDraw", {});
      rm.applyMove("c_bob", "acceptDraw", {});

      const state = rm.getRoomState("c_alice") as unknown as { phase: string; lifecycleState: string } | null;
      expect(state?.phase).toBe("finished");
      expect(state?.lifecycleState).toBe("COMPLETED");

      // Verify Alice (Draw)
      const aliceStats = profileService.getStats(aliceId);
      expect(aliceStats.totalMatches).toBe(1);
      expect(aliceStats.wins).toBe(0);
      expect(aliceStats.losses).toBe(0);
      expect(aliceStats.draws).toBe(1);
      expect(aliceStats.currentWinStreak).toBe(0);

      const aliceProfile = profileService.getProfile(aliceId);
      expect(aliceProfile?.experiencePoints).toBe(25); // 25 XP for DRAW

      // Verify Bob (Draw)
      const bobStats = profileService.getStats(bobId);
      expect(bobStats.totalMatches).toBe(1);
      expect(bobStats.wins).toBe(0);
      expect(bobStats.losses).toBe(0);
      expect(bobStats.draws).toBe(1);
      expect(bobStats.currentWinStreak).toBe(0);

      const bobProfile = profileService.getProfile(bobId);
      expect(bobProfile?.experiencePoints).toBe(25); // 25 XP for DRAW
    });

    it("preserves getWinner() derivation for DotsBoxes matches without regression", () => {
      const { io } = makeIo();
      const rm = new RoomManager(io);
      const created = rm.createRoom(
        "d_alice",
        "Alice",
        "dotsboxes",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { boardSize: 5, turnTimerSeconds: 30 }
      );
      const joined = rm.joinRoom("d_bob", "Bob", created.code);
      expect(joined.ok).toBe(true);

      const bobId = (joined as { playerId: string }).playerId;

      rm.setReady("d_alice", true);
      rm.setReady("d_bob", true);
      rm.startGame("d_alice");

      // Alice leaves / forfeits, which exercises DotsBoxesEngine.removePlayer() -> getWinner()
      rm.leaveRoom("d_alice");

      const state = rm.getRoomState("d_bob") as unknown as { phase: string; lifecycleState: string } | null;
      expect(state?.phase).toBe("finished");
      expect(state?.lifecycleState).toBe("COMPLETED");

      // Bob is winner via DotsBoxesEngine.getWinner()
      const bobStats = profileService.getStats(bobId);
      expect(bobStats.totalMatches).toBe(1);
      expect(bobStats.wins).toBe(1);
      expect(bobStats.losses).toBe(0);
      expect(bobStats.draws).toBe(0);

      const bobProfile = profileService.getProfile(bobId);
      expect(bobProfile?.experiencePoints).toBe(50); // 50 XP for WIN
    });

    it("correctly records WIN for winner and LOSS for loser in a decisive chess resignation match", () => {
      const { io } = makeIo();
      const rm = new RoomManager(io);
      const created = rm.createRoom("c_alice", "Alice", "chess");
      const joined = rm.joinRoom("c_bob", "Bob", created.code);
      expect(joined.ok).toBe(true);

      const aliceId = created.playerId;
      const bobId = (joined as { playerId: string }).playerId;

      rm.setReady("c_alice", true);
      rm.setReady("c_bob", true);
      rm.startGame("c_alice");

      // Alice resigns while remaining seated in the room -> Bob wins
      rm.applyMove("c_alice", "resign", {});

      const state = rm.getRoomState("c_alice") as unknown as { phase: string; lifecycleState: string } | null;
      expect(state?.phase).toBe("finished");
      expect(state?.lifecycleState).toBe("COMPLETED");

      // Verify Bob (Winner)
      const bobStats = profileService.getStats(bobId);
      expect(bobStats.totalMatches).toBe(1);
      expect(bobStats.wins).toBe(1);
      expect(bobStats.losses).toBe(0);
      expect(bobStats.draws).toBe(0);
      expect(bobStats.currentWinStreak).toBe(1);

      const bobProfile = profileService.getProfile(bobId);
      expect(bobProfile?.experiencePoints).toBe(50); // 50 XP for WIN

      // Verify Alice (Loser)
      const aliceStats = profileService.getStats(aliceId);
      expect(aliceStats.totalMatches).toBe(1);
      expect(aliceStats.wins).toBe(0);
      expect(aliceStats.losses).toBe(1);
      expect(aliceStats.draws).toBe(0);
      expect(aliceStats.currentWinStreak).toBe(0);

      const aliceProfile = profileService.getProfile(aliceId);
      expect(aliceProfile?.experiencePoints).toBe(15); // 15 XP for LOSS
    });
  });
});
