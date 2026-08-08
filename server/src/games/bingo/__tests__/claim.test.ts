import { describe, it, expect, beforeEach } from "vitest";
import type { Player, BingoBoard } from "@shared/types.js";
import { BingoEngine } from "../BingoEngine.js";

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function riggedBoard(): BingoBoard {
  const cells = [];
  for (let i = 0; i < 25; i++) {
    cells.push({ index: i, value: i + 1, marked: false });
  }
  return cells;
}

describe("BingoEngine", () => {
  let e: BingoEngine;
  beforeEach(() => {
    e = new BingoEngine();
    e.init(players(2));
  });

  it("starts in arranging phase and allows shuffling board", () => {
    expect(e.getPublicState().phase).toBe("arranging");
    const res = e.applyMove({ playerId: "p0", type: "shuffleBoard" });
    expect(res.ok).toBe(true);
  });

  it("switches to playing phase when all players lock board", () => {
    e.applyMove({ playerId: "p0", type: "lockBoard" });
    e.applyMove({ playerId: "p1", type: "lockBoard" });
    expect(e.getPublicState().phase).toBe("playing");
    expect(e.getPublicState().currentTurnPlayerId).toBe("p0");
  });

  it("allows player on turn to call uncalled numbers 1-25", () => {
    e.applyMove({ playerId: "p0", type: "lockBoard" });
    e.applyMove({ playerId: "p1", type: "lockBoard" });

    const res = e.applyMove({
      playerId: "p0",
      type: "callNumber",
      data: { number: 5 },
    });
    expect(res.ok).toBe(true);
    expect(e.getPublicState().calledNumbers[0].value).toBe(5);
    // Turn advances to p1
    expect(e.getPublicState().currentTurnPlayerId).toBe("p1");
  });

  it("allows claimBingo when 5 lines are formed", () => {
    e.applyMove({ playerId: "p0", type: "lockBoard" });
    e.applyMove({ playerId: "p1", type: "lockBoard" });

    // Rig p0 board
    (e as any).players.get("p0").board = riggedBoard();

    // Call 5 rows (all numbers 1-25)
    for (let num = 1; num <= 25; num++) {
      const turnPid = e.getPublicState().currentTurnPlayerId!;
      e.applyMove({
        playerId: turnPid,
        type: "callNumber",
        data: { number: num },
      });
    }

    // Now p0 can claim Bingo
    const claimRes = e.applyMove({ playerId: "p0", type: "claimBingo" });
    expect(claimRes.ok).toBe(true);
    expect(e.isOver()).toBe(true);
    expect(e.getPublicState().winnerId).toBe("p0");
  });
});
