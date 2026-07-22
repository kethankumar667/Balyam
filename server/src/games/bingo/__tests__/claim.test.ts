import { describe, it, expect, beforeEach } from "vitest";
import type { Player, BingoBoard } from "@shared/types.js";
import { DEFAULT_BINGO_OPTIONS } from "@shared/types.js";
import { BingoEngine, type InternalBingoState } from "../BingoEngine.js";

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function state(e: BingoEngine): InternalBingoState {
  return (e as unknown as { state: InternalBingoState }).state;
}

/** Rig a player's board to a fixed top-row-only layout (indices 0-4 =
 * 1..5, everything else an out-of-range filler that can never be called),
 * so tests can drive an exact win/no-win outcome deterministically. */
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

/** Tiny deterministic PRNG (mulberry32) - unlike a constant closure, this
 * actually varies across calls, so generateUniqueBoard's per-player
 * shuffles differ instead of colliding on every draw. */
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newEngine(n: number, opts: Partial<typeof DEFAULT_BINGO_OPTIONS> = {}): BingoEngine {
  const e = new BingoEngine();
  e.setRng(seededRng(1));
  e.setOptions({ ...DEFAULT_BINGO_OPTIONS, ...opts });
  e.init(players(n));
  return e;
}

describe("BingoEngine init", () => {
  it("deals every player a distinct 25-cell board with FREE center", () => {
    const e = newEngine(4);
    const s = state(e);
    const boards = [...s.players.values()].map((p) => p.board);
    boards.forEach((b) => {
      expect(b).toHaveLength(25);
      expect(b[12].free).toBe(true);
    });
    const fingerprints = boards.map((b) => b.map((c) => c.value).join(","));
    expect(new Set(fingerprints).size).toBe(boards.length);
  });

  it("getStateFor recomputes cell.marked live from calledSet, not a stale board snapshot", () => {
    const e = newEngine(2);
    const s = state(e);
    s.players.get("p0")!.board = riggedBoard();

    // Before any calls: only the FREE cell is marked.
    const before = e.getStateFor("p0");
    expect(before.myBoard[0].marked).toBe(false);
    expect(before.myBoard[12].marked).toBe(true);
    expect(before.myMarkedCount).toBe(1);

    // Calling one of the board's own values must flip that cell live.
    s.calledSet.add(1); // riggedBoard()'s index 0 holds value 1
    const after = e.getStateFor("p0");
    expect(after.myBoard[0].marked).toBe(true);
    expect(after.myMarkedCount).toBe(2);
  });

  it("rejects a move from a player not in this round", () => {
    const e = newEngine(2);
    const res = e.applyMove({ playerId: "ghost", type: "claim" });
    expect(res).toEqual({ ok: false, error: "Not a player in this round" });
  });
});

describe("callNext", () => {
  it("calls unique numbers with increasing order and finalizes on pool exhaustion", () => {
    const e = newEngine(2);
    const seen = new Set<number>();
    let called;
    for (let i = 0; i < 75; i++) {
      called = e.callNext();
      expect(called).not.toBeNull();
      expect(seen.has(called!.value)).toBe(false);
      seen.add(called!.value);
      expect(called!.order).toBe(i + 1);
    }
    expect(seen.size).toBe(75);
    expect(e.isOver()).toBe(false); // last number stays claimable for one tick
    expect(e.callNext()).toBeNull();
    expect(e.isOver()).toBe(true);
    expect(e.getPublicState().endReason).toBe("poolExhausted");
  });
});

describe("markCell", () => {
  it("rejects an out-of-range cell index", () => {
    const e = newEngine(2);
    const res = e.applyMove({ playerId: "p0", type: "markCell", data: { cellIndex: 99 } });
    expect(res).toEqual({ ok: false, error: "Invalid cell" });
  });

  it("always accepts marking the FREE cell", () => {
    const e = newEngine(2);
    const res = e.applyMove({ playerId: "p0", type: "markCell", data: { cellIndex: 12 } });
    expect(res).toEqual({ ok: true });
  });

  it("rejects a cell whose value has not been called yet", () => {
    const e = newEngine(2);
    const s = state(e);
    s.players.get("p0")!.board = riggedBoard();
    const res = e.applyMove({ playerId: "p0", type: "markCell", data: { cellIndex: 0 } });
    expect(res).toEqual({ ok: false, error: "Not called yet" });
  });

  it("accepts a cell once its value has been called", () => {
    const e = newEngine(2);
    const s = state(e);
    s.players.get("p0")!.board = riggedBoard();
    s.calledSet.add(1);
    const res = e.applyMove({ playerId: "p0", type: "markCell", data: { cellIndex: 0 } });
    expect(res).toEqual({ ok: true });
  });
});

describe("claim", () => {
  let e: BingoEngine;
  beforeEach(() => {
    e = newEngine(3);
    state(e).players.get("p0")!.board = riggedBoard();
  });

  it("rejects a claim with no valid pattern yet", () => {
    const res = e.applyMove({ playerId: "p0", type: "claim" });
    expect(res).toEqual({ ok: false, error: "No valid BINGO pattern yet" });
  });

  it("locks out a player for a cooldown after a false claim", () => {
    e.applyMove({ playerId: "p0", type: "claim" });
    const res = e.applyMove({ playerId: "p0", type: "claim" });
    expect(res).toEqual({ ok: false, error: "Wait before claiming again" });
  });

  it("accepts a valid top-row claim, ends the round (stopOnFirstWin default)", () => {
    const s = state(e);
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    s.calledNumbers = [1, 2, 3, 4, 5].map((v, i) => ({
      value: v,
      letter: "B" as const,
      order: i + 1,
      calledAt: 0,
    }));
    const res = e.applyMove({ playerId: "p0", type: "claim" });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    expect(res.winnerId).toBe("p0");
    expect(e.isOver()).toBe(true);
    const pub = e.getPublicState();
    expect(pub.winners).toHaveLength(1);
    expect(pub.winners[0].pattern).toBe("row0");
  });

  it("rejects any further claim once stopOnFirstWin has ended the round", () => {
    const s = state(e);
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    e.applyMove({ playerId: "p0", type: "claim" });
    const res = e.applyMove({ playerId: "p1", type: "claim" });
    expect(res).toEqual({ ok: false, error: "Round not active" });
  });

  it("rejects a player claiming twice even after winning (stopOnFirstWin=false, round stays open)", () => {
    const e2 = newEngine(3, { stopOnFirstWin: false });
    const s2 = state(e2);
    s2.players.get("p0")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s2.calledSet.add(v));
    e2.applyMove({ playerId: "p0", type: "claim" });
    const res = e2.applyMove({ playerId: "p0", type: "claim" });
    expect(res).toEqual({ ok: false, error: "You already won" });
  });

  it("with stopOnFirstWin=false, keeps the round open until every player resolves", () => {
    const e2 = newEngine(2, { stopOnFirstWin: false });
    const s = state(e2);
    s.players.get("p0")!.board = riggedBoard();
    [1, 2, 3, 4, 5].forEach((v) => s.calledSet.add(v));
    const res = e2.applyMove({ playerId: "p0", type: "claim" });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(false); // p1 hasn't resolved yet
    expect(e2.isOver()).toBe(false);
  });
});

describe("removePlayer", () => {
  it("drops the player and ends the round once nobody is left", () => {
    const e = newEngine(2);
    e.removePlayer("p0");
    expect(e.isOver()).toBe(false);
    e.removePlayer("p1");
    expect(e.isOver()).toBe(true);
  });
});
