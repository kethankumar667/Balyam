import { describe, expect, it } from "vitest";
import { TeluguCinemaluEngine } from "../TeluguCinemaluEngine.js";
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

describe("TeluguCinemaluEngine", () => {
  it("initializes in categorySelection phase and supports single player mode", () => {
    const engine = new TeluguCinemaluEngine();
    const players = mockPlayers(1);
    engine.init(players);

    const pub = engine.getPublicState();
    expect(pub.kind).toBe("telugucinemalu");
    expect(pub.phase).toBe("categorySelection");
    expect(pub.selectedCategory).toBeNull();
  });

  it("handles category and question count selection, evaluates +5 for correct and -2 for wrong", () => {
    const engine = new TeluguCinemaluEngine();
    const players = mockPlayers(1);
    engine.init(players);

    // Select category Tollywood and 5 questions
    const catRes = engine.applyMove({
      playerId: "p1",
      type: "selectCategory",
      data: { category: "Tollywood", questionCount: 5 },
    });
    expect(catRes.ok).toBe(true);

    const pub = engine.getPublicState();
    expect(pub.phase).toBe("playing");
    expect(pub.selectedCategory).toBe("Tollywood");
    expect(pub.totalRounds).toBe(5);
    expect(pub.currentQuestion).toBeDefined();

    const correctIdx = engine["currentQuestion"]?.correctIndex ?? 0;
    const wrongIdx = (correctIdx + 1) % 4;

    // Submit wrong answer
    const res1 = engine.applyMove({
      playerId: "p1",
      type: "submitAnswer",
      data: { optionIndex: wrongIdx },
    });
    expect(res1.ok).toBe(true);

    const summary = engine.getPublicState();
    expect(summary.phase).toBe("roundSummary");
    expect(summary.roundScores?.p1).toBe(-2);
  });
});
