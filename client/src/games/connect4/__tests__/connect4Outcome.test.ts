import { describe, expect, it } from "vitest";
import type { Player, Connect4PublicState } from "@shared/types.js";
import { describeConnect4Outcome } from "../connect4Outcome";

function finished(
  winnerId: string | null,
  isDraw = false,
  endReason: Connect4PublicState["endReason"] = "connect4"
): Connect4PublicState {
  return {
    kind: "connect4",
    phase: "finished",
    options: { turnTimerSeconds: 20, botDifficulty: "medium" },
    playerOrder: ["a", "b"],
    playerDiscs: { a: "R", b: "Y" },
    turnPlayerId: "a",
    grid: Array.from({ length: 6 }, () => Array(7).fill(null)),
    winningCells: null,
    winnerId,
    isDraw,
    endReason,
    moveCount: 10,
    discsPlaced: { a: 5, b: 5 },
    turnDeadline: null,
    lastMove: null,
  };
}

const players: Player[] = [
  { id: "a", name: "Alice", isHost: true, isReady: true, isConnected: true },
  { id: "b", name: "Bob", isHost: false, isReady: true, isConnected: true },
];

describe("describeConnect4Outcome", () => {
  it("crowns the seated winner with victory announcement", () => {
    const o = describeConnect4Outcome(finished("a"), "a", players);
    expect(o.kind).toBe("win");
    expect(o.headline).toMatch(/VICTORY/i);
    expect(o.announcement).toMatch(/victory/i);
  });

  it("tells the loser they were defeated without claiming someone else won", () => {
    const o = describeConnect4Outcome(finished("a"), "b", players);
    expect(o.kind).toBe("loss");
    expect(o.headline).toMatch(/DEFEAT/i);
    expect(o.announcement).toContain("Alice won");
  });

  it("handles draws symmetrically for both players", () => {
    for (const self of ["a", "b"]) {
      const o = describeConnect4Outcome(finished(null, true, "draw"), self, players);
      expect(o.kind).toBe("draw");
      expect(o.headline).toMatch(/DRAW/i);
      expect(o.announcement).toMatch(/draw/i);
    }
  });

  it("handles forfeits appropriately", () => {
    const o = describeConnect4Outcome(finished("a", false, "forfeit"), "a", players);
    expect(o.kind).toBe("win");
    expect(o.headline).toMatch(/FORFEIT/i);
  });

  it("tells spectators who won the match", () => {
    const o = describeConnect4Outcome(finished("a"), "", players);
    expect(o.kind).toBe("spectated");
    expect(o.headline).toContain("ALICE WINS");
  });

  it("returns none while game is playing", () => {
    const playing = { ...finished(null), phase: "playing" as const };
    const o = describeConnect4Outcome(playing, "a", players);
    expect(o.kind).toBe("none");
  });
});
