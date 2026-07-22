import { describe, it, expect } from "vitest";
import type { Player, BingoBoard } from "@shared/types.js";
import { DEFAULT_BINGO_OPTIONS } from "@shared/types.js";
import { BingoEngine, type InternalBingoState } from "../BingoEngine.js";

function riggedBoard(): BingoBoard {
  let filler = 1000;
  const cells = [];
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push({ index: 12, letter: "N" as const, value: null, free: true, marked: true });
    } else if (i < 5) {
      cells.push({ index: i, letter: "B" as const, value: i + 1, free: false, marked: false });
    } else {
      cells.push({ index: i, letter: "B" as const, value: filler++, free: false, marked: false });
    }
  }
  return cells;
}

function players(n: number, botDifficulty?: Record<string, "easy" | "medium" | "hard">): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    isBot: i > 0,
    bingoDifficulty: botDifficulty?.[`p${i}`],
  }));
}

function state(e: BingoEngine): InternalBingoState {
  return (e as unknown as { state: InternalBingoState }).state;
}

function newEngine(list: Player[]): BingoEngine {
  const e = new BingoEngine();
  e.setRng(() => 0.42);
  e.setOptions({ ...DEFAULT_BINGO_OPTIONS });
  e.init(list);
  return e;
}

describe("pendingActors", () => {
  it("returns no bots when nobody has a winning pattern", () => {
    const e = newEngine(players(2));
    expect(e.pendingActors()).toEqual([]);
  });

  it("returns a bot once its board has a completed pattern", () => {
    const e = newEngine(players(2));
    const s = state(e);
    s.players.get("p1")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    expect(e.pendingActors()).toEqual(["p1"]);
  });

  it("never includes a human player, even with a completed pattern", () => {
    const e = newEngine(players(2));
    const s = state(e);
    s.players.get("p0")!.board = riggedBoard(); // p0 is the human host
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    expect(e.pendingActors()).toEqual([]);
  });

  it("excludes a bot that already won", () => {
    const e = newEngine(players(2));
    const s = state(e);
    s.players.get("p1")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    e.applyAutoMove("p1");
    expect(e.isOver()).toBe(true);
    expect(e.pendingActors()).toEqual([]);
  });
});

describe("applyAutoMove", () => {
  it("claims on the bot's behalf via the same claim path as a human move", () => {
    const e = newEngine(players(2));
    const s = state(e);
    s.players.get("p1")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    const res = e.applyAutoMove("p1");
    expect(res.ok).toBe(true);
    expect(res.winnerId).toBe("p1");
  });
});

describe("getBotThinkDelayMs", () => {
  it("returns a near-instant delay for a hard bot", () => {
    const e = newEngine(players(2, { p1: "hard" }));
    const s = state(e);
    s.players.get("p1")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    const ms = e.getBotThinkDelayMs();
    expect(ms).toBeGreaterThanOrEqual(150);
    expect(ms).toBeLessThan(500);
  });

  it("returns a slower delay for an easy bot", () => {
    const e = newEngine(players(2, { p1: "easy" }));
    const s = state(e);
    s.players.get("p1")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    const ms = e.getBotThinkDelayMs();
    expect(ms).toBeGreaterThanOrEqual(3_000);
    expect(ms).toBeLessThan(6_000);
  });

  it("defaults to medium pacing when nobody is currently pending", () => {
    const e = newEngine(players(2));
    const ms = e.getBotThinkDelayMs();
    expect(ms).toBeGreaterThanOrEqual(1_000);
    expect(ms).toBeLessThan(2_500);
  });
});
