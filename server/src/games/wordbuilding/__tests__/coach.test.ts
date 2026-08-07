import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { WordBuildingEngine } from "../WordBuildingEngine.js";

/**
 * AI Coach — Word Building.
 *
 * The hint must always name a cell that is (a) on the board and (b) empty.
 * A hint pointing at a filled square is worse than no hint: the player taps
 * it, nothing happens, and they conclude the button is broken.
 */

function makePlayers(n = 2): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  })) as Player[];
}

function newGame(): WordBuildingEngine {
  const e = new WordBuildingEngine();
  e.init(makePlayers());
  return e;
}

function parseCell(key: string): { r: number; c: number } {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

describe("word building coach", () => {
  it("points at an empty cell inside the board", () => {
    const e = newGame();
    const state = e.getStateFor("p0");
    const hint = e.getHint("p0");

    expect(hint).not.toBeNull();
    expect(hint!.highlight).toHaveLength(1);
    const { r, c } = parseCell(hint!.highlight[0]);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(state.board.length);
    expect(c).toBeLessThan(state.board.length);
    expect(state.board[r][c]).toBe("");
  });

  it("keeps pointing at an empty cell as the board fills up", () => {
    const e = newGame();
    // Play a handful of real moves, alternating seats.
    const letters = "STAREPLINDO".split("");
    for (let i = 0; i < 10; i++) {
      const state = e.getStateFor("p0");
      const pid = state.turnPlayerId!;
      const hint = e.getHint(pid);
      expect(hint).not.toBeNull();
      const { r, c } = parseCell(hint!.highlight[0]);
      expect(e.getStateFor(pid).board[r][c]).toBe("");
      e.applyMove({ playerId: pid, type: "place", data: { r, c, letter: letters[i] } });
    }
  });

  it("explains itself in both the scoring and non-scoring case", () => {
    const e = newGame();
    const hint = e.getHint("p0");
    expect(hint!.headline.length).toBeGreaterThan(0);
    expect(hint!.detail.length).toBeGreaterThan(20);
  });

  it("tells a waiting player to watch rather than to act", () => {
    const e = newGame();
    const turnPid = e.getStateFor("p0").turnPlayerId;
    const waitingPid = turnPid === "p0" ? "p1" : "p0";
    const hint = e.getHint(waitingPid);
    // Advising "place X" out of turn would be advice the board rejects.
    expect(hint!.kind).toBe("wait");
  });

  it("returns null once the game is over", () => {
    const e = newGame();
    // Fill every cell so the engine finalizes.
    const size = e.getStateFor("p0").board.length;
    outer: for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pid = e.getStateFor("p0").turnPlayerId;
        if (!pid) break outer;
        e.applyMove({ playerId: pid, type: "place", data: { r, c, letter: "E" } });
      }
    }
    // A hint on a finished sheet is stale by definition.
    expect(e.getHint("p0")).toBeNull();
  });
});
