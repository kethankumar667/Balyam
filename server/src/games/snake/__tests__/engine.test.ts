import { describe, expect, it } from "vitest";
import { SnakeEngine } from "../SnakeEngine.js";
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

describe("SnakeEngine", () => {
  it("initializes snake body and food pellet", () => {
    const engine = new SnakeEngine();
    engine.init(mockPlayers(1));

    const state = engine.getPublicState();
    expect(state.kind).toBe("snake");
    expect(state.snakes.p1).toBeDefined();
    expect(state.snakes.p1.body.length).toBe(3);
    expect(state.food).toBeDefined();
  });

  it("handles snake turn and movement ticks", () => {
    const engine = new SnakeEngine();
    engine.init(mockPlayers(1));

    const turnRes = engine.applyMove({ playerId: "p1", type: "turn", data: { dir: "DOWN" } });
    expect(turnRes.ok).toBe(true);

    const tickRes = engine.applyMove({ playerId: "p1", type: "tick" });
    expect(tickRes.ok).toBe(true);
  });
});
