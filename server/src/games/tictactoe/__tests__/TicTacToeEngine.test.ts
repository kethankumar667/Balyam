import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TicTacToeEngine,
  TICTACTOE_FIRST_TURN_GRACE_MS,
  scoreTicTacToeWin,
  orderForAlternatingFirstMove,
} from "../TicTacToeEngine.js";
import {
  DEFAULT_TICTACTOE_OPTIONS,
  TICTACTOE_MAX_TURN_SECONDS,
  TICTACTOE_MIN_TURN_SECONDS,
  sanitizeTicTacToeOptions,
} from "@shared/types.js";
import type { Player } from "@shared/types.js";

function makePlayers(): [Player, Player] {
  return [
    { id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true },
    { id: "p2", name: "Player 2", isHost: false, isReady: true, isConnected: true },
  ];
}

describe("TicTacToeEngine — Core & Classic Mode", () => {
  it("initializes state and requires exactly 2 players", () => {
    const engine = new TicTacToeEngine();
    const players = makePlayers();

    expect(() => engine.init([players[0]])).toThrowError("requires exactly 2 players");

    engine.init(players);
    const state = engine.getPublicState();
    expect(state.kind).toBe("tictactoe");
    expect(state.phase).toBe("playing");
    expect(state.playerOrder).toEqual(["p1", "p2"]);
    expect(state.playerMarks).toEqual({ p1: "X", p2: "O" });
    expect(state.turnPlayerId).toBe("p1");
    expect(state.grid).toEqual(Array(9).fill(null));
    expect(state.winnerId).toBeNull();
  });

  it("enforces turn order and prevents placing in occupied cell", () => {
    const engine = new TicTacToeEngine();
    engine.init(makePlayers());

    // p2 cannot move out of turn
    const badTurn = engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 0 } });
    expect(badTurn.ok).toBe(false);
    expect(badTurn.error).toContain("Not your turn");

    // p1 moves
    const move1 = engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    expect(move1.ok).toBe(true);

    // p2 tries to place in same cell
    const occupied = engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 0 } });
    expect(occupied.ok).toBe(false);
    expect(occupied.error).toContain("already occupied");
  });

  it("detects horizontal, vertical, and diagonal wins in Classic mode", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "classic" });
    engine.init(makePlayers());

    // Row win: P1 places 0, P2 places 3, P1 places 1, P2 places 4, P1 places 2 (Row 0 win)
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 3 } });
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 1 } });
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 4 } });
    const winMove = engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 2 } });

    expect(winMove.ok).toBe(true);
    expect(winMove.isOver).toBe(true);
    expect(winMove.winnerId).toBe("p1");

    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.winningLine).toEqual([0, 1, 2]);
    expect(state.winnerId).toBe("p1");
  });

  it("detects draws in Classic mode when grid fills with no winning line", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "classic" });
    engine.init(makePlayers());

    // Grid:
    // X O X
    // X O O
    // O X X
    const moves: [string, number][] = [
      ["p1", 0], // X
      ["p2", 1], // O
      ["p1", 2], // X
      ["p2", 4], // O
      ["p1", 3], // X
      ["p2", 5], // O
      ["p1", 7], // X
      ["p2", 6], // O
      ["p1", 8], // X
    ];

    for (let i = 0; i < moves.length - 1; i++) {
      const [pid, cell] = moves[i];
      const res = engine.applyMove({ playerId: pid, type: "place", data: { cellIndex: cell } });
      expect(res.ok).toBe(true);
      expect(res.isOver).toBe(false);
    }

    const last = moves[moves.length - 1];
    const finalMove = engine.applyMove({ playerId: last[0], type: "place", data: { cellIndex: last[1] } });
    expect(finalMove.ok).toBe(true);
    expect(finalMove.isOver).toBe(true);
    expect(finalMove.winnerId).toBeNull();

    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("draw");
    expect(state.winningLine).toBeNull();
  });
});

describe("TicTacToeEngine — Quantum Flux (3-Piece Vanishing Mode)", () => {
  it("enforces 3-piece limit by evaporating the oldest piece when 4th is placed", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "quantum" });
    engine.init(makePlayers());

    // P1: places at 0
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    // P2: places at 8
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 8 } });
    // P1: places at 1
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 1 } });
    // P2: places at 7
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 7 } });
    // P1: places at 3 (now P1 has 3 pieces at [0, 1, 3])
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 3 } });

    let state = engine.getPublicState();
    expect(state.pieceQueues.X).toEqual([0, 1, 3]);
    // Cell 0 is oldest and should be flagged as isExpiring
    expect(state.grid[0]?.isExpiring).toBe(true);
    expect(state.grid[1]?.isExpiring).toBe(false);
    expect(state.grid[3]?.isExpiring).toBe(false);

    // P2: places at 5 (now P2 has 3 pieces at [8, 7, 5])
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 5 } });
    state = engine.getPublicState();
    expect(state.grid[8]?.isExpiring).toBe(true);

    // P1 places 4th piece at cell 4! Cell 0 MUST evaporate!
    const move4 = engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 4 } });
    expect(move4.ok).toBe(true);

    state = engine.getPublicState();
    expect(state.grid[0]).toBeNull(); // Cell 0 is gone
    expect(state.lastEvaporatedCell).toBe(0);
    expect(state.pieceQueues.X).toEqual([1, 3, 4]); // Queue shifted!
    expect(state.grid[1]?.isExpiring).toBe(true); // Cell 1 is now the oldest
    expect(state.grid[4]?.mark).toBe("X");
  });

  it("can win in Quantum mode by forming a 3-in-a-row", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "quantum" });
    engine.init(makePlayers());

    // P1: 0
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    // P2: 3
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 3 } });
    // P1: 1
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 1 } });
    // P2: 4
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 4 } });
    // P1: 2 -> Wins before hitting 4 pieces!
    const win = engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 2 } });
    expect(win.ok).toBe(true);
    expect(win.isOver).toBe(true);
    expect(win.winnerId).toBe("p1");
    expect(engine.getPublicState().winningLine).toEqual([0, 1, 2]);
  });
});

describe("TicTacToeEngine — Bot AI & Lifecycle", () => {
  it("provides pendingActors and applies intelligent auto moves", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "classic" });
    engine.init(makePlayers());

    expect(engine.pendingActors()).toEqual(["p1"]);

    // Bot move for p1
    const res1 = engine.applyAutoMove("p1");
    expect(res1.ok).toBe(true);

    const state = engine.getPublicState();
    expect(state.moveCount).toBe(1);
    expect(engine.pendingActors()).toEqual(["p2"]);

    // Wrong player auto move rejected
    const badBot = engine.applyAutoMove("p1");
    expect(badBot.ok).toBe(false);
  });

  it("bot blocks opponent immediate win", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "classic" });
    engine.init(makePlayers());

    // P1 places at 0
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    // P2 places at 8
    engine.applyMove({ playerId: "p2", type: "place", data: { cellIndex: 8 } });
    // P1 places at 1 (P1 threatening cell 2 for win)
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 1 } });

    // P2 bot should block at cell 2
    const botMove = engine.applyAutoMove("p2");
    expect(botMove.ok).toBe(true);

    const state = engine.getPublicState();
    expect(state.grid[2]?.mark).toBe("O");
  });

  it("handles player removal as forfeit win for remaining player", () => {
    const engine = new TicTacToeEngine();
    engine.init(makePlayers());

    engine.removePlayer("p1");
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().winnerId).toBe("p2");
  });
});

describe("sanitizeTicTacToeOptions — untrusted client options", () => {
  it("falls back to defaults for an unknown mode", () => {
    expect(sanitizeTicTacToeOptions({ mode: "bogus" as never }).mode).toBe(DEFAULT_TICTACTOE_OPTIONS.mode);
  });

  it("accepts both real modes", () => {
    expect(sanitizeTicTacToeOptions({ mode: "classic" }).mode).toBe("classic");
    expect(sanitizeTicTacToeOptions({ mode: "quantum" }).mode).toBe("quantum");
  });

  it("keeps 0 as 'untimed' and floors any other timer at the platform minimum", () => {
    expect(sanitizeTicTacToeOptions({ turnTimerSeconds: 0 }).turnTimerSeconds).toBe(0);
    expect(sanitizeTicTacToeOptions({ turnTimerSeconds: 0.001 }).turnTimerSeconds).toBe(TICTACTOE_MIN_TURN_SECONDS);
    expect(sanitizeTicTacToeOptions({ turnTimerSeconds: 10 }).turnTimerSeconds).toBe(10);
  });

  it("caps huge timers so they can never overflow a 32-bit setTimeout", () => {
    const capped = sanitizeTicTacToeOptions({ turnTimerSeconds: 1e13 }).turnTimerSeconds;
    expect(capped).toBe(TICTACTOE_MAX_TURN_SECONDS);
    expect(capped * 1000).toBeLessThan(2 ** 31);
  });

  it.each([NaN, Infinity, -Infinity, "15", null, {}, []])(
    "uses the default timer for non-numeric or non-finite input %p",
    (bad) => {
      expect(sanitizeTicTacToeOptions({ turnTimerSeconds: bad as never }).turnTimerSeconds).toBe(
        DEFAULT_TICTACTOE_OPTIONS.turnTimerSeconds
      );
    }
  );

  it("treats a negative timer as untimed", () => {
    expect(sanitizeTicTacToeOptions({ turnTimerSeconds: -5 }).turnTimerSeconds).toBe(0);
  });

  it("returns defaults for missing or non-object input", () => {
    expect(sanitizeTicTacToeOptions(undefined)).toEqual(DEFAULT_TICTACTOE_OPTIONS);
    expect(sanitizeTicTacToeOptions("member" as never)).toEqual(DEFAULT_TICTACTOE_OPTIONS);
  });

  it("engine.setOptions applies the same sanitising", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "bogus" as never, turnTimerSeconds: 0.001 });
    engine.init(makePlayers());
    const opts = engine.getPublicState().options;
    expect(opts.mode).toBe(DEFAULT_TICTACTOE_OPTIONS.mode);
    expect(opts.turnTimerSeconds).toBe(TICTACTOE_MIN_TURN_SECONDS);
  });
});

describe("TicTacToeEngine — draw reporting", () => {
  it("getWinner() is null on a draw so profile/economy code sees 'no winner'", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ mode: "classic", turnTimerSeconds: 0 });
    engine.init(makePlayers());
    for (const [p, c] of [["p1", 0], ["p2", 1], ["p1", 2], ["p2", 4], ["p1", 3], ["p2", 5], ["p1", 7], ["p2", 6], ["p1", 8]] as [string, number][]) {
      engine.applyMove({ playerId: p, type: "place", data: { cellIndex: c } });
    }
    expect(engine.getPublicState().winnerId).toBe("draw"); // client protocol unchanged
    expect(engine.getWinner()).toBeNull();
  });

  it("getWinner() returns the winner id after a win and after a forfeit", () => {
    const won = new TicTacToeEngine();
    won.setOptions({ mode: "classic", turnTimerSeconds: 0 });
    won.init(makePlayers());
    for (const [p, c] of [["p1", 0], ["p2", 3], ["p1", 1], ["p2", 4], ["p1", 2]] as [string, number][]) {
      won.applyMove({ playerId: p, type: "place", data: { cellIndex: c } });
    }
    expect(won.getWinner()).toBe("p1");

    const forfeit = new TicTacToeEngine();
    forfeit.init(makePlayers());
    forfeit.removePlayer("p1");
    expect(forfeit.getWinner()).toBe("p2");
  });

  it("getWinner() is null while the game is still being played", () => {
    const engine = new TicTacToeEngine();
    engine.init(makePlayers());
    expect(engine.getWinner()).toBeNull();
  });
});

describe("TicTacToeEngine — turn clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the very first turn a grace window for the client's start ceremony", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ turnTimerSeconds: 15 });
    engine.init(makePlayers());
    const first = engine.getPublicState().turnDeadline! - Date.now();
    expect(first).toBe(15_000 + TICTACTOE_FIRST_TURN_GRACE_MS);
    engine.applyMove({ playerId: "p1", type: "place", data: { cellIndex: 0 } });
    const second = engine.getPublicState().turnDeadline! - Date.now();
    expect(second).toBe(15_000);
  });

  it("restartTurnClock() opens a fresh full window without grace", () => {
    const engine = new TicTacToeEngine();
    engine.setOptions({ turnTimerSeconds: 15 });
    engine.init(makePlayers());
    vi.advanceTimersByTime(60_000);
    expect(engine.getPublicState().turnDeadline! - Date.now()).toBeLessThan(0);
    engine.restartTurnClock();
    expect(engine.getPublicState().turnDeadline! - Date.now()).toBe(15_000);
  });

  it("restartTurnClock() is a no-op for untimed or finished games", () => {
    const untimed = new TicTacToeEngine();
    untimed.setOptions({ turnTimerSeconds: 0 });
    untimed.init(makePlayers());
    untimed.restartTurnClock();
    expect(untimed.getPublicState().turnDeadline).toBeNull();
  });
});

describe("scoreTicTacToeWin — win efficiency", () => {
  it("scores a 3-move win as the maximum and never drops below 1", () => {
    expect(scoreTicTacToeWin(5, "X")).toBe(8); // X: 3 own moves
    expect(scoreTicTacToeWin(6, "O")).toBe(8); // O: 3 own moves
    expect(scoreTicTacToeWin(7, "X")).toBe(7); // X: 4 own moves
    expect(scoreTicTacToeWin(400, "X")).toBe(1);
  });

  it("is monotonic: a slower win never scores higher", () => {
    let prev = Infinity;
    for (let m = 5; m < 60; m++) {
      const s = scoreTicTacToeWin(m, m % 2 === 1 ? "X" : "O");
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });
});

describe("orderForAlternatingFirstMove", () => {
  const p = (id: string) => ({ id }) as Player;

  it("puts the previous second player first", () => {
    expect(orderForAlternatingFirstMove(["a", "b"], [p("a"), p("b")]).map((x) => x.id)).toEqual(["b", "a"]);
    expect(orderForAlternatingFirstMove(["b", "a"], [p("a"), p("b")]).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("ignores players who left and keeps newcomers at the end", () => {
    expect(orderForAlternatingFirstMove(["a", "b"], [p("b"), p("c")]).map((x) => x.id)).toEqual(["b", "c"]);
  });
});
