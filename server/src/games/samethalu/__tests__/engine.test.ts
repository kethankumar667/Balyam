import { describe, expect, it } from "vitest";
import { SamethaluEngine } from "../SamethaluEngine.js";
import type { Player } from "@shared/types.js";

function mockPlayers(count = 1): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("SamethaluEngine", () => {
  it("initializes round 1 with question prompt and options in single player mode", () => {
    const engine = new SamethaluEngine();
    const players = mockPlayers(1);
    engine.init(players);

    const pub = engine.getPublicState();
    expect(pub.kind).toBe("samethalu");
    expect(pub.phase).toBe("playing");
    expect(pub.round).toBe(1);
    expect(pub.currentQuestion).toBeDefined();
    expect(pub.currentQuestion?.options).toHaveLength(4);
  });

  it("evaluates answers and awards +5 for correct and -2 for wrong", () => {
    const engine = new SamethaluEngine();
    const players = mockPlayers(1);
    engine.init(players);

    const correctIdx = engine["currentQuestion"]?.correctIndex ?? 0;

    // p1 submits correct choice
    const res1 = engine.applyMove({
      playerId: "p1",
      type: "submitAnswer",
      data: { optionIndex: correctIdx },
    });
    expect(res1.ok).toBe(true);

    const summary = engine.getPublicState();
    expect(summary.phase).toBe("roundSummary");
    expect(summary.correctIndex).toBe(correctIdx);
    expect(summary.roundScores?.p1).toBe(5);
  });
});
