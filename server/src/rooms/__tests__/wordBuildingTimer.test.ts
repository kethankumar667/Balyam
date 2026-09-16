import { describe, it, expect, vi } from "vitest";
import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
  WordBuildingPublicState,
} from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/**
 * Same fake Socket.IO harness as unoTimer.test.ts / roundHistory.test.ts —
 * enough surface for RoomManager (`io.sockets.sockets.get(id)`,
 * `io.to(room).emit(...)`, `socket.join(...)`), capturing every emit so the
 * test can read the latest per-socket game state without reaching into
 * RoomManager's private fields.
 */
function makeFakeIO() {
  const emitted: Array<{ socketId?: string; room?: string; event: string; payload: unknown }> = [];
  const sockets = new Map<string, { id: string; join: () => void; emit: (event: string, payload: unknown) => void }>();

  function addSocket(id: string) {
    sockets.set(id, {
      id,
      join: () => {},
      emit: (event: string, payload: unknown) => emitted.push({ socketId: id, event, payload }),
    });
  }

  const io = {
    sockets: { sockets },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, addSocket, emitted };
}

/**
 * Proves the RoomManager wiring for Word Building's turn timer — not the
 * engine in isolation (that's games/wordbuilding/__tests__/claimFlow.test.ts).
 * scheduleTurnTimer's `instanceof WordBuildingEngine` branch is a flat,
 * unconditional re-arm regardless of move type, so it needs no dedicated
 * per-move-type test; what actually needed proving here is onTurnTimeout's
 * branch between `engine.applyAutoMove(actorId)` (getTimeoutActor() returns
 * an actor) and `engine.resolvePendingClaimOnTimeout()` (it returns null,
 * i.e. a claim is awaiting votes) — mirrors UnoEngine's pendingChallenge
 * dispatch in the same method.
 */
describe("RoomManager — Word Building turn timer wiring", () => {
  function setup(claimToScoreMode: boolean) {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    addSocket("s1");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom(
      "s0",
      "Anand",
      "wordbuilding",
      undefined, // ludoOptions
      undefined, // snlOptions
      undefined, // rummyOptions
      undefined, // hcOptions
      { turnTimerSeconds: 1, claimToScoreMode }, // wordBuildingOptions — 1s floors to 5s
    );
    rooms.joinRoom("s1", "Babji", code);
    rooms.setReady("s0", true);
    rooms.setReady("s1", true);

    function latestGameStateFor(socketId: string): WordBuildingPublicState {
      const matches = emitted.filter((e) => e.event === "game:state" && e.socketId === socketId);
      const last = matches[matches.length - 1];
      if (!last) throw new Error("no game:state broadcast yet");
      return last.payload as WordBuildingPublicState;
    }
    function latestRoomState(): RoomPublicState {
      const matches = emitted.filter((e) => e.event === "room:state" && e.room === code);
      return matches[matches.length - 1].payload as RoomPublicState;
    }

    return { rooms, latestGameStateFor, latestRoomState };
  }

  it("schedules a deadline using room.wordBuildingOptions.turnTimerSeconds and force-advances the turn when it lapses (legacy mode)", () => {
    const { rooms, latestGameStateFor } = setup(false);

    vi.useFakeTimers();
    try {
      rooms.startGame("s0");

      // Word Building has no rotation/deal-gate wait (unlike UNO/Rummy) —
      // scheduleInitialTurnTimer goes straight to scheduleTurnTimer, so the
      // very first deadline is armed synchronously within startGame.
      const before = latestGameStateFor("s0");
      expect(before.turnDeadline).not.toBeNull();
      expect(before.turnDeadline!).toBeGreaterThan(Date.now());

      // scheduleTurnTimer floors every game's timer at 5s — a requested 1s
      // becomes a real 5s timer.
      vi.advanceTimersByTime(5_100);

      const after = latestGameStateFor("s0");
      // onTurnTimeout's WordBuildingEngine branch must have forced a move
      // for getTimeoutActor() (the current turn player in legacy mode) —
      // the turn flips between the two players on every accepted move.
      expect(after.turnPlayerId).not.toBe(before.turnPlayerId);
      // A fresh timer must have been scheduled for the resulting state too.
      expect(after.turnDeadline).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("claimToScoreMode: a claim awaiting the claimant's submission times out into an auto-skip via applyAutoMove(actorId), and advances the turn", async () => {
    const { rooms, latestGameStateFor, latestRoomState } = setup(true);

    vi.useFakeTimers();
    try {
      rooms.startGame("s0");

      const claimantId = latestGameStateFor("s0").turnPlayerId;
      const players = latestRoomState().players;
      const claimantSocket = players[0].id === claimantId ? "s0" : "s1";
      const opponentSocket = claimantSocket === "s0" ? "s1" : "s0";

      // Build an unbroken run of 3 non-word letters ("A","B","C") through
      // one shared row so the run qualifies purely by length (claim mode
      // never checks the dictionary at claim-open time) but the bot judge
      // inside applyAutoMove's "collecting" branch can't verify it as a
      // real word, forcing a skip on timeout.
      await rooms.applyMove(claimantSocket, "place", { r: 5, c: 5, letter: "A" });
      await rooms.applyMove(opponentSocket, "place", { r: 5, c: 6, letter: "B" });
      // This third placement completes a length-3 run through (5,7) and
      // opens the claim — the claimant is back on this same nominal turn.
      await rooms.applyMove(claimantSocket, "place", { r: 5, c: 7, letter: "C" });

      const pending = latestGameStateFor("s0");
      expect(pending.pendingClaim).not.toBeNull();
      expect(pending.pendingClaim!.status).toBe("collecting");
      expect(pending.pendingClaim!.claimantId).toBe(claimantId);
      // Turn does not advance while a claim is open.
      expect(pending.turnPlayerId).toBe(claimantId);

      vi.advanceTimersByTime(5_100);

      const after = latestGameStateFor("s0");
      // getTimeoutActor() returned the claimant (status "collecting"), and
      // applyAutoMove's bot-judge couldn't verify "ABC" as a real word, so
      // it skipped the claim rather than submitting it.
      expect(after.pendingClaim).toBeNull();
      expect(after.turnPlayerId).not.toBe(claimantId);
      expect(after.turnDeadline).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("claimToScoreMode: a claim awaiting votes times out into a silent accept via resolvePendingClaimOnTimeout(), crediting the claimant", async () => {
    const { rooms, latestGameStateFor, latestRoomState } = setup(true);

    vi.useFakeTimers();
    try {
      rooms.startGame("s0");

      const claimantId = latestGameStateFor("s0").turnPlayerId;
      const players = latestRoomState().players;
      const claimantSocket = players[0].id === claimantId ? "s0" : "s1";
      const opponentSocket = claimantSocket === "s0" ? "s1" : "s0";

      // Spell "CAT" across one row: claimant places C, opponent places A
      // (run length 2, below minWordLength — no claim opens yet), claimant
      // places T completing the length-3 run and opening the claim.
      await rooms.applyMove(claimantSocket, "place", { r: 5, c: 5, letter: "C" });
      await rooms.applyMove(opponentSocket, "place", { r: 5, c: 6, letter: "A" });
      await rooms.applyMove(claimantSocket, "place", { r: 5, c: 7, letter: "T" });

      await rooms.applyMove(claimantSocket, "claimWord", {
        cells: [{ r: 5, c: 5 }, { r: 5, c: 6 }, { r: 5, c: 7 }],
      });

      const pending = latestGameStateFor("s0");
      expect(pending.pendingClaim).not.toBeNull();
      expect(pending.pendingClaim!.status).toBe("voting");
      expect(pending.pendingClaim!.word).toBe("CAT");

      vi.advanceTimersByTime(5_100);

      const after = latestGameStateFor("s0");
      // getTimeoutActor() returned null (no single actor to force while
      // votes are outstanding) — RoomManager's onTurnTimeout must have
      // fallen through to resolvePendingClaimOnTimeout() instead, which
      // resolves accepted (silence = accept) and credits the claimant.
      expect(after.pendingClaim).toBeNull();
      expect(after.scores[claimantId]).toBe(3);
      expect(after.turnPlayerId).not.toBe(claimantId);
      expect(after.turnDeadline).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
