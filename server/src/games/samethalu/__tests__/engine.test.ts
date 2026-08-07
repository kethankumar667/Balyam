import { describe, expect, it } from "vitest";
import { SamethaluEngine } from "../SamethaluEngine.js";
import type { Player } from "@shared/types.js";

function mockPlayers(count = 2): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("SamethaluEngine", () => {
  it("initializes round 1 with question prompt and options", () => {
    const engine = new SamethaluEngine();
    const players = mockPlayers(2);
    engine.init(players);

    const pub = engine.getPublicState();
    expect(pub.kind).toBe("samethalu");
    expect(pub.phase).toBe("playing");
    expect(pub.round).toBe(1);
    expect(pub.currentQuestion).toBeDefined();
    expect(pub.currentQuestion?.options).toHaveLength(4);
  });

  it("evaluates answers and awards points", () => {
    const engine = new SamethaluEngine();
    const players = mockPlayers(2);
    engine.init(players);

    // p1 submits choice 0
    const res1 = engine.applyMove({
      playerId: "p1",
      type: "submitAnswer",
      data: { optionIndex: 0 },
    });
    expect(res1.ok).toBe(true);

    // p2 submits choice 1
    const res2 = engine.applyMove({
      playerId: "p2",
      type: "submitAnswer",
      data: { optionIndex: 1 },
    });
    expect(res2.ok).toBe(true);

    const summary = engine.getPublicState();
    expect(summary.phase).toBe("roundSummary");
    expect(summary.correctIndex).toBeDefined();
    expect(summary.roundScores?.p1).toBeGreaterThanOrEqual(0);
    expect(summary.roundScores?.p2).toBeGreaterThanOrEqual(0);
  });
});
