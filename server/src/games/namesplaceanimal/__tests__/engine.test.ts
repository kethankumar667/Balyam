import { describe, expect, it } from "vitest";
import { NamePlaceAnimalEngine } from "../NamePlaceAnimalEngine.js";
import type { Player } from "@shared/types.js";

function mockPlayers(count = 3): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("NamePlaceAnimalEngine", () => {
  it("initializes round 1 with a letter and 3 players", () => {
    const engine = new NamePlaceAnimalEngine();
    const players = mockPlayers(3);
    engine.init(players);

    const state = engine.getPublicState();
    expect(state.kind).toBe("namesplaceanimal");
    expect(state.phase).toBe("playing");
    expect(state.round).toBe(1);
    expect(state.letter).toBeTruthy();
    expect(state.players).toHaveLength(3);
  });

  it("submits valid answers and scores points", () => {
    const engine = new NamePlaceAnimalEngine();
    const players = mockPlayers(2);
    engine.init(players);

    const state1 = engine.getPublicState();
    const letter = state1.letter!;

    // Player 1 submits
    const res1 = engine.applyMove({
      playerId: "p1",
      type: "submitAnswers",
      data: {
        name: `${letter}rjun`,
        place: `${letter}msterdam`,
        animal: `${letter}lligator`,
        thing: `${letter}pple`,
      },
    });
    expect(res1.ok).toBe(true);

    // Player 2 submits
    const res2 = engine.applyMove({
      playerId: "p2",
      type: "submitAnswers",
      data: {
        name: `${letter}nil`,
        place: `${letter}thens`,
        animal: `${letter}nteater`,
        thing: `${letter}nchor`,
      },
    });
    expect(res2.ok).toBe(true);

    // Both submitted -> advances to roundSummary
    const summaryState = engine.getPublicState();
    expect(summaryState.phase).toBe("roundSummary");
    expect(summaryState.allAnswers?.p1).toBeDefined();
    expect(summaryState.allAnswers?.p2).toBeDefined();
    expect(summaryState.categoryScores?.p1).toBeDefined();
    expect(summaryState.categoryScores?.p2).toBeDefined();
  });

  it("handles STOP call when player completes 4 entries", () => {
    const engine = new NamePlaceAnimalEngine();
    const players = mockPlayers(2);
    engine.init(players);

    const state1 = engine.getPublicState();
    const letter = state1.letter!;

    engine.applyMove({
      playerId: "p1",
      type: "submitAnswers",
      data: {
        name: `${letter}rjun`,
        place: `${letter}msterdam`,
        animal: `${letter}lligator`,
        thing: `${letter}pple`,
      },
    });

    const stopRes = engine.applyMove({
      playerId: "p1",
      type: "stopClock",
    });
    expect(stopRes.ok).toBe(true);
    expect(engine.getPublicState().stoppedByPlayerId).toBe("p1");
  });

  it("completes full game over totalRounds", () => {
    const engine = new NamePlaceAnimalEngine();
    engine.setOptions({ totalRounds: 2 });
    const players = mockPlayers(2);
    engine.init(players);

    // Round 1
    engine.applyAutoMove("p1");
    engine.applyAutoMove("p2");
    expect(engine.getPublicState().phase).toBe("roundSummary");

    // Advance to Round 2
    engine.applyMove({ playerId: "p1", type: "nextRound" });
    expect(engine.getPublicState().round).toBe(2);

    // Round 2
    engine.applyAutoMove("p1");
    engine.applyAutoMove("p2");
    expect(engine.getPublicState().phase).toBe("roundSummary");

    // Advance after final round -> finished
    engine.applyMove({ playerId: "p1", type: "nextRound" });
    const finalState = engine.getPublicState();
    expect(finalState.phase).toBe("finished");
    expect(finalState.isOver).toBe(true);
    expect(finalState.standings).toBeDefined();
  });
});
