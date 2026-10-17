import { describe, expect, it } from "vitest";
import {
  DEFAULT_VAMANA_OPTIONS,
  VAMANA_SCORE_MAX,
  VAMANA_SCORE_MIN,
  VAMANA_TOTAL_SEEDS,
} from "@shared/types.js";
import { VAMANA_FIRST_TURN_GRACE_MS, VamanaEngine, scoreVamanaWin } from "../VamanaEngine.js";
import { legalPits, simulateSow, totalSeeds } from "../vamanaBoard.js";
import { board, makeClock, makePlayers, mulberry32, newEngine, sow } from "./vamanaTestUtils.js";

const sum = (values: Record<string, number>): number => Object.values(values).reduce((a, b) => a + b, 0);

describe("VamanaEngine — setup", () => {
  it("requires exactly two players", () => {
    const engine = new VamanaEngine();
    const [a, b] = makePlayers();
    expect(() => engine.init([])).toThrow(/exactly 2 players/);
    expect(() => engine.init([a])).toThrow(/exactly 2 players/);
    expect(() => engine.init([a, b, { ...b, id: "p3" }])).toThrow(/exactly 2 players/);
  });

  it("starts with five seeds in every pit, the first seat to move, and no result", () => {
    const { engine } = newEngine();
    const state = engine.getPublicState();
    expect(state.kind).toBe("vamanaguntalu");
    expect(state.phase).toBe("playing");
    expect(state.playerOrder).toEqual(["p1", "p2"]);
    expect(state.turnPlayerId).toBe("p1");
    expect(state.pits).toEqual(Array(14).fill(5));
    expect(state.captured).toEqual({ p1: 0, p2: 0 });
    expect(state.swept).toEqual({ p1: 0, p2: 0 });
    expect(state.winnerId).toBeNull();
    expect(state.isDraw).toBe(false);
    expect(state.endReason).toBeNull();
    expect(state.moveCount).toBe(0);
    expect(state.lastMove).toBeNull();
    expect(state.options).toEqual(DEFAULT_VAMANA_OPTIONS);
  });

  it("is a 2-player game", () => {
    const { engine } = newEngine();
    expect(engine.kind).toBe("vamanaguntalu");
    expect(engine.minPlayers).toBe(2);
    expect(engine.maxPlayers).toBe(2);
  });

  it("returns a fresh state every time: mutating it never changes the engine", () => {
    const { engine } = newEngine();
    const state = engine.getPublicState();
    state.pits[0] = 99;
    state.playerOrder.push("intruder");
    state.captured.p1 = 50;
    state.options.turnTimerSeconds = 1;
    const again = engine.getPublicState();
    expect(again.pits[0]).toBe(5);
    expect(again.playerOrder).toEqual(["p1", "p2"]);
    expect(again.captured.p1).toBe(0);
    expect(again.options.turnTimerSeconds).toBe(DEFAULT_VAMANA_OPTIONS.turnTimerSeconds);
  });

  it("getStateFor is the same public state for both seats and for a stranger (there is no hidden information)", () => {
    const { engine } = newEngine();
    sow(engine, "p1", 2);
    expect(engine.getStateFor("p1")).toEqual(engine.getPublicState());
    expect(engine.getStateFor("p2")).toEqual(engine.getPublicState());
    expect(engine.getStateFor("someone-else")).toEqual(engine.getPublicState());
  });

  it("applies sanitized options only", () => {
    const { engine } = newEngine({ options: { turnTimerSeconds: 9_999, botDifficulty: "nope" as never } });
    expect(engine.getPublicState().options).toEqual({ turnTimerSeconds: 120, botDifficulty: "medium" });
  });

  it("refuses a malformed starting position", () => {
    const players = makePlayers();
    const bad: Array<number[]> = [Array(13).fill(5), [...Array(13).fill(5), -1], [...Array(13).fill(5), 1.5], [...Array(13).fill(5), Number.NaN]];
    for (const pits of bad) {
      const engine = new VamanaEngine({ position: { pits } });
      expect(() => engine.init(players)).toThrow(/starting position/i);
    }
  });
});

describe("VamanaEngine — validating a move", () => {
  it("rejects a seat that is not in the match", () => {
    const { engine } = newEngine();
    expect(sow(engine, "stranger", 0)).toEqual({ ok: false, error: "You are not in this match" });
  });

  it("rejects a move out of turn", () => {
    const { engine } = newEngine();
    expect(sow(engine, "p2", 7)).toEqual({ ok: false, error: "Not your turn" });
  });

  it("rejects an unknown move type", () => {
    const { engine } = newEngine();
    expect(engine.applyMove({ playerId: "p1", type: "drop", data: { pit: 0 } })).toEqual({ ok: false, error: "Invalid move type" });
  });

  it("rejects a pit that is not a whole board position", () => {
    const { engine } = newEngine();
    for (const bad of [-1, 14, 99, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", "", null, undefined, {}, [3], true]) {
      const result = sow(engine, "p1", bad);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Invalid pit/);
    }
    expect(engine.getPublicState().moveCount).toBe(0);
  });

  it("rejects a payload that is not an object", () => {
    const { engine } = newEngine();
    for (const data of [undefined, null, 3, "3", [3], true]) {
      const result = engine.applyMove({ playerId: "p1", type: "sow", data });
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Invalid pit/);
    }
  });

  it("rejects the opponent's pit", () => {
    const { engine } = newEngine();
    expect(sow(engine, "p1", 7)).toEqual({ ok: false, error: "That pit is not yours" });
  });

  it("rejects an empty pit", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 0, 1: 2, 9: 4 }) } });
    expect(sow(engine, "p1", 0)).toEqual({ ok: false, error: "That pit is empty" });
  });

  it("changes nothing when a move is rejected", () => {
    const { engine } = newEngine();
    const before = engine.getPublicState();
    sow(engine, "p1", 99);
    sow(engine, "p2", 7);
    sow(engine, "p1", 8);
    expect(engine.getPublicState()).toEqual(before);
  });

  it("rejects every move once the match is over", () => {
    const { engine } = newEngine();
    engine.removePlayer("p2");
    expect(sow(engine, "p1", 0)).toEqual({ ok: false, error: "Match over" });
  });
});

describe("VamanaEngine — playing a turn", () => {
  it("plays the hand-worked opening: sows, relays, captures 7, and passes the turn", () => {
    const { engine } = newEngine();
    const result = sow(engine, "p1", 0);
    expect(result).toEqual({ ok: true, isOver: false });

    const state = engine.getPublicState();
    expect(state.pits).toEqual([2, 8, 8, 8, 0, 0, 1, 7, 7, 7, 7, 0, 1, 7]);
    expect(state.captured).toEqual({ p1: 7, p2: 0 });
    expect(state.turnPlayerId).toBe("p2");
    expect(state.moveCount).toBe(1);
    expect(state.lastMove).toEqual({
      playerId: "p1",
      lifts: [
        { pit: 0, seeds: 5 },
        { pit: 6, seeds: 5 },
        { pit: 12, seeds: 5 },
        { pit: 4, seeds: 6 },
        { pit: 11, seeds: 6 },
      ],
      capture: { pit: 5, seeds: 7 },
      truncated: false,
    });
  });

  it("passes the turn even when nothing was captured", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 1, 8: 3, 10: 3 }) } });
    expect(sow(engine, "p1", 0).ok).toBe(true);
    const state = engine.getPublicState();
    expect(state.captured).toEqual({ p1: 0, p2: 0 });
    expect(state.lastMove?.capture).toBeNull();
    expect(state.turnPlayerId).toBe("p2");
  });

  it("alternates seats and always conserves the 70 seeds", () => {
    const { engine } = newEngine();
    const random = mulberry32(7);
    for (let turn = 0; turn < 60 && !engine.isOver(); turn++) {
      const state = engine.getPublicState();
      const side = state.turnPlayerId === "p1" ? 0 : 1;
      const options = legalPits(state.pits, side);
      const pit = options[Math.floor(random() * options.length)];
      expect(sow(engine, state.turnPlayerId, pit).ok).toBe(true);
      const after = engine.getPublicState();
      expect(totalSeeds(after.pits) + sum(after.captured)).toBe(VAMANA_TOTAL_SEEDS);
      if (!engine.isOver()) expect(after.turnPlayerId).not.toBe(state.turnPlayerId);
    }
  });
});

describe("VamanaEngine — the end of the match", () => {
  it("ends when the next player has no seeds, and the mover keeps the seeds left on their own row", () => {
    // p1 sows pit 0 (2 seeds) into 1 and 2, then captures the 3 in pit 4. p2's row is empty, so the
    // match ends and p1 keeps the 2 seeds still on their row.
    const { engine } = newEngine({ position: { pits: board({ 0: 2, 4: 3 }) } });
    const result = sow(engine, "p1", 0);
    expect(result).toEqual({ ok: true, isOver: true, winnerId: "p1" });
    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.captured).toEqual({ p1: 5, p2: 0 });
    expect(state.swept).toEqual({ p1: 2, p2: 0 });
    expect(state.pits).toEqual(Array(14).fill(0));
    expect(state.winnerId).toBe("p1");
    expect(state.isDraw).toBe(false);
    expect(state.endReason).toBe("seeds");
    expect(state.turnDeadline).toBeNull();
    expect(engine.isOver()).toBe(true);
    expect(engine.getWinner()).toBe("p1");
  });

  it("lets the second seat win and keeps their swept seeds", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 1, 11: 2 }) } });
    expect(sow(engine, "p1", 0)).toEqual({ ok: true, isOver: false });
    // p2 sows 11 into 12 and 13, then the empty pit 0 means pit 1 (one seed) is captured.
    const result = sow(engine, "p2", 11);
    expect(result).toEqual({ ok: true, isOver: true, winnerId: "p2" });
    const state = engine.getPublicState();
    expect(state.captured).toEqual({ p1: 0, p2: 3 });
    expect(state.swept).toEqual({ p1: 0, p2: 2 });
    expect(state.winnerId).toBe("p2");
    expect(state.endReason).toBe("seeds");
  });

  it("is a draw when both totals are equal, with no winner (the stake is refunded)", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 1 }), captured: [4, 5] } });
    const result = sow(engine, "p1", 0);
    expect(result).toEqual({ ok: true, isOver: true, winnerId: null });
    const state = engine.getPublicState();
    expect(state.captured).toEqual({ p1: 5, p2: 5 });
    expect(state.isDraw).toBe(true);
    expect(state.winnerId).toBeNull();
    expect(state.endReason).toBe("draw");
    expect(engine.getWinner()).toBeNull();
  });

  it("is already over when the first player has no seeds at the start", () => {
    const { engine } = newEngine({ position: { pits: board({ 7: 3 }) } });
    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p2");
    expect(state.captured).toEqual({ p1: 0, p2: 3 });
    expect(state.turnDeadline).toBeNull();
    expect(engine.pendingActors()).toEqual([]);
  });

  it("scores a win by the seeds the winner finished with, always inside the published bounds", () => {
    expect(scoreVamanaWin(36)).toBe(36);
    expect(scoreVamanaWin(53)).toBe(53);
    expect(scoreVamanaWin(70)).toBe(70);
    expect(scoreVamanaWin(0)).toBe(VAMANA_SCORE_MIN);
    expect(scoreVamanaWin(500)).toBe(VAMANA_SCORE_MAX);
    expect(scoreVamanaWin(Number.NaN)).toBe(VAMANA_SCORE_MIN);
    expect(scoreVamanaWin(Number.POSITIVE_INFINITY)).toBe(VAMANA_SCORE_MIN);
    expect(VAMANA_SCORE_MIN).toBe(36);
    expect(VAMANA_SCORE_MAX).toBe(70);
  });

  it("always finishes with a consistent result across many random full games", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { engine } = newEngine({ seed, flags: { p1Bot: true, p2Bot: true }, options: { botDifficulty: "easy" } });
      let guard = 0;
      while (!engine.isOver() && guard++ < 4_000) {
        const [actor] = engine.pendingActors();
        expect(engine.applyAutoMove(actor).ok).toBe(true);
      }
      const state = engine.getPublicState();
      expect(engine.isOver(), `seed ${seed} did not finish`).toBe(true);
      expect(sum(state.captured)).toBe(VAMANA_TOTAL_SEEDS);
      expect(state.pits).toEqual(Array(14).fill(0));
      expect(engine.getWinner()).toBe(state.winnerId);
      if (state.winnerId) {
        const loser = state.playerOrder.find((id) => id !== state.winnerId) as string;
        expect(state.captured[state.winnerId]).toBeGreaterThan(state.captured[loser]);
        expect(state.captured[state.winnerId]).toBeGreaterThanOrEqual(VAMANA_SCORE_MIN);
      } else {
        expect(state.captured.p1).toBe(state.captured.p2);
      }
    }
  });
});

describe("VamanaEngine — leaving", () => {
  it("awards the match to the player who stays (a forfeit, not a capture win)", () => {
    const { engine } = newEngine();
    engine.removePlayer("p1");
    const state = engine.getPublicState();
    expect(engine.isOver()).toBe(true);
    expect(state.winnerId).toBe("p2");
    expect(state.endReason).toBe("forfeit");
    expect(state.isDraw).toBe(false);
    expect(engine.getWinner()).toBe("p2");
    expect(state.turnDeadline).toBeNull();
  });

  it("ignores someone who was never seated", () => {
    const { engine } = newEngine();
    engine.removePlayer("stranger");
    expect(engine.isOver()).toBe(false);
  });

  it("does not change a finished result when someone leaves afterwards", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 2, 4: 3 }) } });
    sow(engine, "p1", 0);
    const before = engine.getPublicState();
    engine.removePlayer("p1");
    engine.removePlayer("p2");
    expect(engine.getPublicState()).toEqual(before);
  });
});

describe("VamanaEngine — turn clock", () => {
  it("gives the opening turn extra time for the start ceremony, and no extra time afterwards", () => {
    const { engine, clock } = newEngine();
    const start = clock.now();
    expect(engine.getPublicState().turnDeadline).toBe(start + 25_000 + VAMANA_FIRST_TURN_GRACE_MS);
    clock.advance(1_000);
    sow(engine, "p1", 2);
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + 25_000);
  });

  it("uses the sanitized timer option", () => {
    const { engine, clock } = newEngine({ options: { turnTimerSeconds: 10 } });
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + 10_000 + VAMANA_FIRST_TURN_GRACE_MS);
  });

  it("restartTurnClock opens a fresh full window with no opening grace", () => {
    const { engine, clock } = newEngine();
    clock.advance(60_000);
    engine.restartTurnClock();
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + 25_000);
  });

  it("restartTurnClock leaves a finished match without a deadline", () => {
    const { engine } = newEngine();
    engine.removePlayer("p2");
    engine.restartTurnClock();
    expect(engine.getPublicState().turnDeadline).toBeNull();
  });

  it("reads time only from the injected clock", () => {
    const clock = makeClock(5_000);
    const engine = new VamanaEngine({ now: clock.now, random: mulberry32(1) });
    engine.init(makePlayers());
    expect(engine.getPublicState().turnDeadline).toBe(5_000 + 25_000 + VAMANA_FIRST_TURN_GRACE_MS);
  });
});

describe("VamanaEngine — bots and timeouts", () => {
  it("names only the seat on turn as pending, and nobody once the match is over", () => {
    const { engine } = newEngine();
    expect(engine.pendingActors()).toEqual(["p1"]);
    sow(engine, "p1", 3);
    expect(engine.pendingActors()).toEqual(["p2"]);
    engine.removePlayer("p1");
    expect(engine.pendingActors()).toEqual([]);
  });

  it("refuses an auto move for a seat that is not on turn or when the match is over", () => {
    const { engine } = newEngine();
    expect(engine.applyAutoMove("p2").ok).toBe(false);
    expect(engine.applyAutoMove("stranger").ok).toBe(false);
    engine.removePlayer("p1");
    expect(engine.applyAutoMove("p2").ok).toBe(false);
  });

  it("plays a legal pit for a bot seat, at every difficulty", () => {
    for (const botDifficulty of ["easy", "medium", "pro"] as const) {
      const { engine } = newEngine({ flags: { p1Bot: true }, options: { botDifficulty } });
      const result = engine.applyAutoMove("p1");
      expect(result.ok, botDifficulty).toBe(true);
      expect(engine.getPublicState().moveCount).toBe(1);
    }
  });

  it("plays the greedy fallback for a human whose clock ran out: the pit that captures the most", () => {
    const { engine } = newEngine({ position: { pits: board({ 0: 2, 3: 0, 4: 9, 6: 1, 10: 3 }) } });
    const state = engine.getPublicState();
    const best = Math.max(...legalPits(state.pits, 0).map((pit) => simulateSow(state.pits, pit).capture?.seeds ?? 0));
    expect(engine.applyAutoMove("p1").ok).toBe(true);
    expect(engine.getPublicState().lastMove?.capture?.seeds ?? 0).toBe(best);
    expect(best).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed", () => {
    const run = (): number[] => {
      const { engine } = newEngine({ seed: 42, flags: { p1Bot: true, p2Bot: true }, options: { botDifficulty: "easy" } });
      const picked: number[] = [];
      for (let i = 0; i < 12 && !engine.isOver(); i++) {
        engine.applyAutoMove(engine.pendingActors()[0]);
        picked.push(engine.getPublicState().lastMove?.lifts[0].pit ?? -1);
      }
      return picked;
    };
    expect(run()).toEqual(run());
  });
});
