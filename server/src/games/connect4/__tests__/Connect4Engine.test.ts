import { describe, expect, it } from "vitest";
import {
  CONNECT4_COLUMNS,
  CONNECT4_MAX_TURN_SECONDS,
  CONNECT4_MIN_TURN_SECONDS,
  CONNECT4_ROWS,
  CONNECT4_SCORE_MAX,
  CONNECT4_SCORE_MIN,
  DEFAULT_CONNECT4_OPTIONS,
} from "@shared/types.js";
import { Connect4Engine, CONNECT4_FIRST_TURN_GRACE_MS, scoreConnect4Win } from "../Connect4Engine.js";
import { orderForAlternatingFirstMove } from "../../seating.js";
import {
  TOTAL_CELLS,
  drop,
  findFullBoardSequence,
  makePlayers,
  newEngine,
  playColumns,
} from "./connect4TestUtils.js";

// Column sequences (p1 moves first, moves alternate). Each is hand-checked in the comment.
const HORIZONTAL_WIN = [0, 0, 1, 1, 2, 2, 3]; // p1: bottom row c0..c3
const VERTICAL_WIN = [0, 1, 0, 1, 0, 1, 0]; // p1: column 0, four high
const ASCENDING_WIN = [0, 1, 1, 2, 2, 3, 3, 3, 2, 6, 3]; // p1: (5,0)(4,1)(3,2)(2,3)
const DESCENDING_WIN = [6, 5, 5, 4, 4, 3, 3, 3, 4, 0, 3]; // p1: (5,6)(4,5)(3,4)(2,3)
const FIVE_IN_A_ROW = [0, 6, 1, 6, 3, 6, 4, 5, 2]; // p1: bottom row c0..c4

const cells = (list: ReadonlyArray<readonly [number, number]>) => list.map(([row, col]) => ({ row, col }));

describe("Connect4Engine — setup", () => {
  it("requires exactly two players", () => {
    const engine = new Connect4Engine();
    const [a, b] = makePlayers();
    expect(() => engine.init([])).toThrow(/exactly 2 players/);
    expect(() => engine.init([a])).toThrow(/exactly 2 players/);
    expect(() => engine.init([a, b, { ...b, id: "p3" }])).toThrow(/exactly 2 players/);
  });

  it("starts with an empty 6x7 board, the first seat to move, and no result", () => {
    const { engine } = newEngine();
    const state = engine.getPublicState();
    expect(state.kind).toBe("connect4");
    expect(state.phase).toBe("playing");
    expect(state.playerOrder).toEqual(["p1", "p2"]);
    expect(state.playerDiscs).toEqual({ p1: "R", p2: "Y" });
    expect(state.turnPlayerId).toBe("p1");
    expect(state.grid).toHaveLength(CONNECT4_ROWS);
    expect(state.grid.every((row) => row.length === CONNECT4_COLUMNS && row.every((c) => c === null))).toBe(true);
    expect(state.winnerId).toBeNull();
    expect(state.isDraw).toBe(false);
    expect(state.endReason).toBeNull();
    expect(state.winningCells).toBeNull();
    expect(state.moveCount).toBe(0);
    expect(state.discsPlaced).toEqual({ p1: 0, p2: 0 });
    expect(state.lastMove).toBeNull();
    expect(state.options).toEqual(DEFAULT_CONNECT4_OPTIONS);
  });

  it("is a 2-player game", () => {
    const { engine } = newEngine();
    expect(engine.kind).toBe("connect4");
    expect(engine.minPlayers).toBe(2);
    expect(engine.maxPlayers).toBe(2);
  });

  it("returns a fresh state every time: mutating it never changes the engine", () => {
    const { engine } = newEngine();
    const state = engine.getPublicState();
    state.grid[5][0] = "R";
    state.playerOrder.push("intruder");
    state.options.turnTimerSeconds = 1;
    const again = engine.getPublicState();
    expect(again.grid[5][0]).toBeNull();
    expect(again.playerOrder).toEqual(["p1", "p2"]);
    expect(again.options.turnTimerSeconds).toBe(DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds);
  });

  it("getStateFor is the same public state for both seats (there is no hidden information)", () => {
    const { engine } = newEngine();
    engine.applyMove({ playerId: "p1", type: "drop", data: { column: 2 } });
    expect(engine.getStateFor("p1")).toEqual(engine.getStateFor("p2"));
    expect(engine.getStateFor("p1")).toEqual(engine.getPublicState());
  });
});

describe("Connect4Engine — move validation (every move is untrusted input)", () => {
  it("rejects a move from someone who is not in the match", () => {
    const { engine } = newEngine();
    const result = drop(engine, "stranger", 3);
    expect(result.ok).toBe(false);
    expect(engine.getPublicState().moveCount).toBe(0);
  });

  it("rejects a move out of turn", () => {
    const { engine } = newEngine();
    const result = drop(engine, "p2", 3);
    expect(result).toMatchObject({ ok: false, error: "Not your turn" });
    expect(engine.getPublicState().grid[5][3]).toBeNull();
  });

  it.each(["place", "move", "", "DROP", undefined as unknown as string])("rejects move type %j", (type) => {
    const { engine } = newEngine();
    const result = engine.applyMove({ playerId: "p1", type, data: { column: 3 } });
    expect(result.ok).toBe(false);
    expect(engine.getPublicState().moveCount).toBe(0);
  });

  it.each([undefined, null, "3", 3, true, [], [3]])("rejects a move whose data is %j", (data) => {
    const { engine } = newEngine();
    const result = engine.applyMove({ playerId: "p1", type: "drop", data });
    expect(result.ok).toBe(false);
    expect(engine.getPublicState().moveCount).toBe(0);
  });

  it.each([-1, 7, 100, 1.5, 0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "3", "", null, undefined, true, [], [3], {}])(
    "rejects column %j without throwing and without changing the game",
    (column) => {
      const { engine } = newEngine();
      let result: ReturnType<typeof drop> | undefined;
      expect(() => {
        result = drop(engine, "p1", column);
      }).not.toThrow();
      expect(result?.ok).toBe(false);
      // A bad column is reported as one, never mislabelled as "full".
      expect(result?.error).toMatch(/invalid column/i);
      const state = engine.getPublicState();
      expect(state.moveCount).toBe(0);
      expect(state.turnPlayerId).toBe("p1");
      expect(state.grid.flat().every((c) => c === null)).toBe(true);
    },
  );

  it("does not treat a column at the board edges as invalid", () => {
    const { engine } = newEngine();
    expect(drop(engine, "p1", 0).ok).toBe(true);
    expect(drop(engine, "p2", CONNECT4_COLUMNS - 1).ok).toBe(true);
  });

  it("rejects a drop into a full column and keeps the turn", () => {
    const { engine } = newEngine();
    // Fill column 0 with alternating discs (no four in a column: they alternate).
    playColumns(engine, [0, 0, 0, 0, 0, 0]);
    const before = engine.getPublicState();
    expect(before.turnPlayerId).toBe("p1");
    const result = drop(engine, "p1", 0);
    expect(result.ok).toBe(false);
    expect(engine.getPublicState()).toEqual(before);
  });

  it("gives error text that names no internals", () => {
    const { engine } = newEngine();
    const messages = [drop(engine, "p1", 99), drop(engine, "p2", 3), drop(engine, "ghost", 3)].map((r) => r.error ?? "");
    for (const message of messages) {
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/undefined|\bnull\b|NaN|stack|at .*\.ts|node_modules|C:\\/i);
    }
  });

  it("a rejected move does not disturb the turn clock", () => {
    const { engine, clock } = newEngine();
    const deadline = engine.getPublicState().turnDeadline;
    clock.advance(3_000);
    drop(engine, "p1", 99);
    expect(engine.getPublicState().turnDeadline).toBe(deadline);
  });
});

describe("Connect4Engine — gravity and turns", () => {
  it("the first disc lands on the bottom row, in every column", () => {
    for (let column = 0; column < CONNECT4_COLUMNS; column++) {
      const { engine } = newEngine();
      expect(drop(engine, "p1", column).ok).toBe(true);
      expect(engine.getPublicState().grid[CONNECT4_ROWS - 1][column]).toBe("R");
    }
  });

  it("stacks upward, alternating colours, until the column is full", () => {
    const { engine } = newEngine();
    playColumns(engine, [3, 3, 3]);
    const { grid } = engine.getPublicState();
    expect(grid[5][3]).toBe("R");
    expect(grid[4][3]).toBe("Y");
    expect(grid[3][3]).toBe("R");
  });

  it("uses the top row and then closes the column", () => {
    const { engine } = newEngine();
    // Odd/even so the discs alternate colours and no vertical four can form.
    const results = playColumns(engine, [2, 2, 2, 2, 2, 2]);
    expect(results.every((r) => r.ok && !r.isOver)).toBe(true);
    const { grid } = engine.getPublicState();
    expect(grid[0][2]).toBe("Y"); // the 6th disc (p2) sits on the top row
    expect(drop(engine, "p1", 2).ok).toBe(false);
  });

  it("passes the turn after each accepted move and tracks counts and the last move", () => {
    const { engine } = newEngine();
    drop(engine, "p1", 4);
    let state = engine.getPublicState();
    expect(state.turnPlayerId).toBe("p2");
    expect(state.moveCount).toBe(1);
    expect(state.discsPlaced).toEqual({ p1: 1, p2: 0 });
    expect(state.lastMove).toEqual({ row: 5, col: 4, playerId: "p1" });

    drop(engine, "p2", 4);
    state = engine.getPublicState();
    expect(state.turnPlayerId).toBe("p1");
    expect(state.discsPlaced).toEqual({ p1: 1, p2: 1 });
    expect(state.lastMove).toEqual({ row: 4, col: 4, playerId: "p2" });
  });

  it("reports isOver false and no winner for an ordinary move", () => {
    const { engine } = newEngine();
    expect(drop(engine, "p1", 0)).toEqual({ ok: true, isOver: false });
  });
});

describe("Connect4Engine — winning", () => {
  const winCases: ReadonlyArray<{ name: string; moves: number[]; expected: ReadonlyArray<readonly [number, number]> }> = [
    { name: "horizontal", moves: HORIZONTAL_WIN, expected: [[5, 0], [5, 1], [5, 2], [5, 3]] },
    { name: "vertical", moves: VERTICAL_WIN, expected: [[5, 0], [4, 0], [3, 0], [2, 0]] },
    { name: "ascending diagonal", moves: ASCENDING_WIN, expected: [[5, 0], [4, 1], [3, 2], [2, 3]] },
    { name: "descending diagonal", moves: DESCENDING_WIN, expected: [[5, 6], [4, 5], [3, 4], [2, 3]] },
  ];

  it.each(winCases)("a $name four ends the match, names the winner and returns the exact cells", ({ moves, expected }) => {
    const { engine } = newEngine();
    const results = playColumns(engine, moves);
    expect(results.slice(0, -1).every((r) => r.ok && !r.isOver)).toBe(true);
    expect(results[results.length - 1]).toEqual({ ok: true, isOver: true, winnerId: "p1" });

    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p1");
    expect(state.isDraw).toBe(false);
    expect(state.endReason).toBe("connect4");
    expect(state.turnDeadline).toBeNull();
    expect([...(state.winningCells ?? [])].sort((a, b) => a.row - b.row || a.col - b.col)).toEqual(
      cells(expected).sort((a, b) => a.row - b.row || a.col - b.col),
    );
    expect(engine.isOver()).toBe(true);
    expect(engine.getWinner()).toBe("p1");
  });

  it("five or more in a row counts, and every disc of the run is reported", () => {
    const { engine } = newEngine();
    const results = playColumns(engine, FIVE_IN_A_ROW);
    expect(results[results.length - 1]).toMatchObject({ ok: true, isOver: true, winnerId: "p1" });
    expect(engine.getPublicState().winningCells).toHaveLength(5);
  });

  it("the second seat can win too", () => {
    const { engine } = newEngine();
    // p1 wastes discs on columns 5/6 while p2 stacks column 0 and wins with the 4th.
    playColumns(engine, [5, 0, 6, 0, 5, 0, 6, 0]);
    expect(engine.getPublicState()).toMatchObject({ phase: "finished", winnerId: "p2", endReason: "connect4" });
    expect(engine.getWinner()).toBe("p2");
  });

  it("a finished match accepts no more moves and its result cannot change", () => {
    const { engine } = newEngine();
    playColumns(engine, VERTICAL_WIN);
    const finished = engine.getPublicState();
    expect(drop(engine, "p2", 3).ok).toBe(false);
    expect(drop(engine, "p1", 3).ok).toBe(false);
    expect(engine.getPublicState()).toEqual(finished);
  });

  it("winnerId in the state and getWinner() always agree", () => {
    const { engine } = newEngine();
    expect(engine.getWinner()).toBe(engine.getPublicState().winnerId);
    playColumns(engine, HORIZONTAL_WIN);
    expect(engine.getWinner()).toBe(engine.getPublicState().winnerId);
  });
});

describe("Connect4Engine — draw and the last disc", () => {
  it("a completely full board with no four is a draw: no winner, flagged as a draw", () => {
    const sequence = findFullBoardSequence("draw");
    expect(sequence).not.toBeNull();
    expect(sequence).toHaveLength(TOTAL_CELLS);

    const { engine } = newEngine();
    const results = playColumns(engine, sequence!);
    expect(results.slice(0, -1).every((r) => r.ok && !r.isOver)).toBe(true);
    expect(results[results.length - 1]).toEqual({ ok: true, isOver: true, winnerId: null });

    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.isDraw).toBe(true);
    expect(state.winnerId).toBeNull();
    expect(state.endReason).toBe("draw");
    expect(state.winningCells).toBeNull();
    expect(state.moveCount).toBe(TOTAL_CELLS);
    expect(state.turnDeadline).toBeNull();
    expect(engine.getWinner()).toBeNull();
    expect(engine.isOver()).toBe(true);
  });

  it("a four made by the 42nd and last disc is a WIN, not a draw", () => {
    const sequence = findFullBoardSequence("lastMoveWin");
    expect(sequence).not.toBeNull();
    expect(sequence).toHaveLength(TOTAL_CELLS);

    const { engine } = newEngine();
    const results = playColumns(engine, sequence!);
    expect(results.slice(0, -1).every((r) => r.ok && !r.isOver)).toBe(true);
    expect(results[results.length - 1]).toEqual({ ok: true, isOver: true, winnerId: "p2" });

    const state = engine.getPublicState();
    expect(state.isDraw).toBe(false);
    expect(state.winnerId).toBe("p2");
    expect(state.endReason).toBe("connect4");
    expect(state.winningCells?.length).toBeGreaterThanOrEqual(4);
  });

  it("the match is not over before the board is full or a four appears", () => {
    const { engine } = newEngine();
    const sequence = findFullBoardSequence("draw")!;
    const results = playColumns(engine, sequence.slice(0, TOTAL_CELLS - 1));
    expect(results.every((r) => r.ok && !r.isOver)).toBe(true);
    expect(engine.isOver()).toBe(false);
  });
});

describe("Connect4Engine — turn clock", () => {
  it("opens the first turn with the timer plus a start-ceremony grace, and later turns without it", () => {
    const { engine, clock } = newEngine();
    const start = clock.now();
    const seconds = DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds;
    expect(engine.getPublicState().turnDeadline).toBe(start + seconds * 1000 + CONNECT4_FIRST_TURN_GRACE_MS);

    clock.advance(6_000);
    drop(engine, "p1", 0);
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + seconds * 1000);
  });

  it("honours a custom timer", () => {
    const { engine, clock } = newEngine({ options: { turnTimerSeconds: 45 } });
    expect(engine.getPublicState().options.turnTimerSeconds).toBe(45);
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + 45_000 + CONNECT4_FIRST_TURN_GRACE_MS);
  });

  it("restartTurnClock opens a full fresh window with no grace (the room layer calls this after a withheld timeout)", () => {
    const { engine, clock } = newEngine();
    clock.advance(60_000); // the stored deadline has long passed
    engine.restartTurnClock();
    expect(engine.getPublicState().turnDeadline).toBe(clock.now() + DEFAULT_CONNECT4_OPTIONS.turnTimerSeconds * 1000);
  });

  it("there is no way to switch the clock off: a playing match always has a deadline", () => {
    for (const bad of [0, -5, Number.NaN, "off", null]) {
      const { engine } = newEngine({ options: { turnTimerSeconds: bad as unknown as number } });
      expect(engine.getPublicState().options.turnTimerSeconds).toBeGreaterThan(0);
      expect(engine.getPublicState().turnDeadline).not.toBeNull();
    }
  });

  it("setOptions never trusts its input", () => {
    const { engine } = newEngine({
      options: { turnTimerSeconds: 10_000, botDifficulty: "impossible" as unknown as "easy" },
    });
    const { options } = engine.getPublicState();
    expect(options.turnTimerSeconds).toBe(CONNECT4_MAX_TURN_SECONDS);
    expect(options.botDifficulty).toBe(DEFAULT_CONNECT4_OPTIONS.botDifficulty);
  });

  it("clamps a too-small timer to the floor", () => {
    const { engine } = newEngine({ options: { turnTimerSeconds: 1 } });
    expect(engine.getPublicState().options.turnTimerSeconds).toBe(CONNECT4_MIN_TURN_SECONDS);
  });

  it("clears the deadline once the match is over", () => {
    const { engine } = newEngine();
    playColumns(engine, VERTICAL_WIN);
    expect(engine.getPublicState().turnDeadline).toBeNull();
  });
});

describe("Connect4Engine — leaving the match", () => {
  it("the remaining player wins by forfeit, and it is not recorded as a four-in-a-row", () => {
    const { engine } = newEngine();
    drop(engine, "p1", 3);
    engine.removePlayer("p1");
    const state = engine.getPublicState();
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p2");
    expect(state.endReason).toBe("forfeit");
    expect(state.winningCells).toBeNull();
    expect(state.isDraw).toBe(false);
    expect(state.turnDeadline).toBeNull();
    expect(engine.isOver()).toBe(true);
    expect(engine.getWinner()).toBe("p2");
  });

  it("leaving after the match has ended does not change the result", () => {
    const { engine } = newEngine();
    playColumns(engine, VERTICAL_WIN);
    const finished = engine.getPublicState();
    engine.removePlayer("p1");
    engine.removePlayer("p2");
    expect(engine.getPublicState()).toEqual(finished);
  });

  it("leaving after a draw does not turn it into a win", () => {
    const { engine } = newEngine();
    playColumns(engine, findFullBoardSequence("draw")!);
    engine.removePlayer("p2");
    expect(engine.getPublicState()).toMatchObject({ isDraw: true, winnerId: null, endReason: "draw" });
  });

  it("ignores someone who was never seated", () => {
    const { engine } = newEngine();
    engine.removePlayer("ghost");
    expect(engine.getPublicState().phase).toBe("playing");
    expect(engine.getWinner()).toBeNull();
  });
});

describe("Connect4Engine — who must act", () => {
  it("pendingActors is the player on turn while playing, and empty otherwise", () => {
    const { engine } = newEngine();
    expect(engine.pendingActors()).toEqual(["p1"]);
    drop(engine, "p1", 0);
    expect(engine.pendingActors()).toEqual(["p2"]);
    engine.removePlayer("p2");
    expect(engine.pendingActors()).toEqual([]);
  });
});

describe("Connect4Engine — timeout fallback for a human (applyAutoMove)", () => {
  it("plays the most central column on an empty board", () => {
    const { engine } = newEngine();
    expect(engine.applyAutoMove("p1").ok).toBe(true);
    expect(engine.getPublicState().lastMove).toEqual({ row: 5, col: 3, playerId: "p1" });
  });

  it("takes a win when one is available", () => {
    const { engine } = newEngine();
    playColumns(engine, [0, 0, 1, 1, 2, 6]); // p1 holds the bottom row c0..c2 and is to move
    const result = engine.applyAutoMove("p1");
    expect(result).toEqual({ ok: true, isOver: true, winnerId: "p1" });
    expect(engine.getPublicState().lastMove?.col).toBe(3);
  });

  it("blocks the opponent's immediate win when it cannot win itself", () => {
    const { engine } = newEngine();
    playColumns(engine, [0, 0, 1, 1, 2]); // p1 threatens c3; p2 is to move and has no win of its own
    const result = engine.applyAutoMove("p2");
    expect(result).toEqual({ ok: true, isOver: false });
    expect(engine.getPublicState().lastMove).toMatchObject({ col: 3, playerId: "p2" });
  });

  it("never picks a full column: it takes the next most central one", () => {
    const { engine } = newEngine();
    playColumns(engine, [3, 3, 3, 3, 3, 3]); // column 3 is full, p1 is to move
    expect(engine.applyAutoMove("p1").ok).toBe(true);
    expect(engine.getPublicState().lastMove?.col).toBe(2);
  });

  it("refuses to move for someone whose turn it is not", () => {
    const { engine } = newEngine();
    expect(engine.applyAutoMove("p2").ok).toBe(false);
    expect(engine.getPublicState().moveCount).toBe(0);
  });

  it("refuses after the match is over", () => {
    const { engine } = newEngine();
    playColumns(engine, VERTICAL_WIN);
    expect(engine.applyAutoMove("p2").ok).toBe(false);
  });

  it("is weaker than a bot: a human's timeout fallback ignores the bot difficulty setting", () => {
    const first = newEngine({ options: { botDifficulty: "easy" } });
    const second = newEngine({ options: { botDifficulty: "pro" } });
    first.engine.applyAutoMove("p1");
    second.engine.applyAutoMove("p1");
    expect(first.engine.getPublicState().lastMove).toEqual(second.engine.getPublicState().lastMove);
  });
});

describe("Connect4Engine — bot seats", () => {
  it.each(["easy", "medium", "pro"] as const)("a %s bot always plays a legal move and reaches a legal result", (botDifficulty) => {
    const { engine } = newEngine({ flags: { p1Bot: true, p2Bot: true }, options: { botDifficulty }, seed: 7 });
    // A pro search is the expensive one, so it plays only the opening; the others play to the end.
    const maxPlies = botDifficulty === "pro" ? 12 : TOTAL_CELLS + 1;
    let guard = 0;
    while (!engine.isOver() && guard++ < maxPlies) {
      const actor = engine.pendingActors()[0];
      expect(actor).toBeDefined();
      const result = engine.applyAutoMove(actor);
      expect(result.ok).toBe(true);
    }
    const state = engine.getPublicState();
    expect(state.moveCount).toBeLessThanOrEqual(TOTAL_CELLS);
    if (botDifficulty === "pro" && !engine.isOver()) return; // opening only: every move so far was legal
    expect(engine.isOver()).toBe(true);
    if (state.winnerId !== null) {
      expect(state.endReason).toBe("connect4");
      expect(state.winningCells?.length).toBeGreaterThanOrEqual(4);
    } else {
      expect(state.isDraw).toBe(true);
    }
  });

  it("is reproducible: the same seed and the same moves give the same game", () => {
    const play = () => {
      const { engine } = newEngine({ flags: { p2Bot: true }, options: { botDifficulty: "medium" }, seed: 42 });
      const log: number[] = [];
      for (const column of [3, 3, 2, 4]) {
        if (engine.isOver()) break;
        drop(engine, "p1", column);
        engine.applyAutoMove("p2");
        log.push(engine.getPublicState().lastMove?.col ?? -1);
      }
      return log;
    };
    expect(play()).toEqual(play());
  });

  // p1 (red) holds (5,2) and (5,3) with (5,1) and (5,5) both open: dropping in column 4 makes an
  // OPEN THREE, a double threat the opponent cannot stop. Only a search sees that; the plain
  // timeout fallback (win, block, else most central) just stacks on the centre column.
  const OPEN_THREE_SETUP = [2, 0, 3, 6];

  it.each(["medium", "pro"] as const)("a %s bot seat searches ahead and finds the double threat", (botDifficulty) => {
    const { engine } = newEngine({ flags: { p1Bot: true }, options: { botDifficulty } });
    playColumns(engine, OPEN_THREE_SETUP);
    expect(engine.applyAutoMove("p1").ok).toBe(true);
    expect(engine.getPublicState().lastMove).toMatchObject({ row: 5, col: 4, playerId: "p1" });
  });

  it("a human seat on timeout does not search: the same position gets the plain centre move", () => {
    const { engine } = newEngine({ options: { botDifficulty: "pro" } });
    playColumns(engine, OPEN_THREE_SETUP);
    expect(engine.applyAutoMove("p1").ok).toBe(true);
    expect(engine.getPublicState().lastMove).toMatchObject({ col: 3, playerId: "p1" });
  });

  it("every difficulty takes an immediate win and blocks an immediate loss", () => {
    for (const botDifficulty of ["easy", "medium", "pro"] as const) {
      const win = newEngine({ flags: { p1Bot: true }, options: { botDifficulty } });
      playColumns(win.engine, [0, 0, 1, 1, 2, 6]); // p1 threatens column 3 and is to move
      expect(win.engine.applyAutoMove("p1")).toEqual({ ok: true, isOver: true, winnerId: "p1" });

      const block = newEngine({ flags: { p2Bot: true }, options: { botDifficulty } });
      playColumns(block.engine, [0, 0, 1, 1, 2]); // p2 must stop column 3
      block.engine.applyAutoMove("p2");
      expect(block.engine.getPublicState().lastMove?.col).toBe(3);
    }
  });
});

describe("scoreConnect4Win", () => {
  it.each([
    [4, 18],
    [5, 17],
    [10, 12],
    [21, 1],
  ])("a win with %i of your own discs scores %i", (discs, score) => {
    expect(scoreConnect4Win(discs)).toBe(score);
  });

  it("stays inside the published bounds for any input", () => {
    for (const discs of [-5, 0, 1, 3, 22, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const score = scoreConnect4Win(discs);
      expect(score).toBeGreaterThanOrEqual(CONNECT4_SCORE_MIN);
      expect(score).toBeLessThanOrEqual(CONNECT4_SCORE_MAX);
    }
  });

  it("rewards speed: fewer of your own discs never scores lower", () => {
    for (let discs = 4; discs < 21; discs++) {
      expect(scoreConnect4Win(discs)).toBeGreaterThan(scoreConnect4Win(discs + 1));
    }
  });
});

describe("rematch seating", () => {
  it("swaps who moves first, so the host does not open every rematch", () => {
    const [p1, p2] = makePlayers();
    const next = orderForAlternatingFirstMove(["p1", "p2"], [p1, p2]);
    expect(next.map((p) => p.id)).toEqual(["p2", "p1"]);

    const engine = new Connect4Engine();
    engine.init(next);
    expect(engine.getPublicState().turnPlayerId).toBe("p2");
    expect(engine.getPublicState().playerDiscs).toEqual({ p2: "R", p1: "Y" });
  });
});
