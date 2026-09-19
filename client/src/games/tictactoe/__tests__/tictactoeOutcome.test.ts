import { describe, expect, it } from "vitest";
import type { Player, TicTacToePublicState } from "@shared/types.js";
import { describeTicTacToeOutcome } from "../tictactoeOutcome";

const players = [
  { id: "a", name: "Asha" },
  { id: "b", name: "Bilal" },
] as Player[];

function finished(winnerId: string | "draw" | null): TicTacToePublicState {
  return {
    kind: "tictactoe",
    phase: "finished",
    options: { mode: "classic", turnTimerSeconds: 0 },
    playerOrder: ["a", "b"],
    playerMarks: { a: "X", b: "O" },
    turnPlayerId: "a",
    grid: Array(9).fill(null),
    pieceQueues: { X: [], O: [] },
    winningLine: winnerId && winnerId !== "draw" ? [0, 1, 2] : null,
    winnerId,
    moveCount: 5,
    turnDeadline: null,
    lastEvaporatedCell: null,
  };
}

describe("describeTicTacToeOutcome", () => {
  it("tells the winner they won", () => {
    const o = describeTicTacToeOutcome(finished("a"), "a", players);
    expect(o.kind).toBe("win");
    expect(o.headline).toMatch(/VICTORY/);
    expect(o.announcement).toBe("Victory! You won the match.");
  });

  it("tells the loser they lost, naming the winner for screen readers", () => {
    const o = describeTicTacToeOutcome(finished("a"), "b", players);
    expect(o.kind).toBe("loss");
    expect(o.headline).toMatch(/DEFEAT/);
    expect(o.announcement).toBe("Asha won the match.");
  });

  it("reports a draw to both players", () => {
    for (const self of ["a", "b"]) {
      const o = describeTicTacToeOutcome(finished("draw"), self, players);
      expect(o.kind).toBe("draw");
      expect(o.headline).toMatch(/DRAW/);
      expect(o.announcement).toBe("Match ended in a draw.");
    }
  });

  it("never tells a spectator they lost — it names the winner", () => {
    const o = describeTicTacToeOutcome(finished("a"), "", players);
    expect(o.kind).toBe("spectated");
    expect(o.headline).not.toMatch(/DEFEAT|VICTORY/);
    expect(o.headline).toContain("ASHA");
  });

  it("describes a spectated draw neutrally", () => {
    const o = describeTicTacToeOutcome(finished("draw"), "", players);
    expect(o.kind).toBe("draw");
  });

  it("falls back to a generic name if the winner is no longer in the roster", () => {
    const o = describeTicTacToeOutcome(finished("ghost"), "b", players);
    expect(o.announcement).toBe("Opponent won the match.");
  });

  it("handles a match with no result yet without claiming one", () => {
    const o = describeTicTacToeOutcome({ ...finished(null), phase: "playing" }, "a", players);
    expect(o.kind).toBe("none");
  });
});
