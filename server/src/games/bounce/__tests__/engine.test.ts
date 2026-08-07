import { describe, expect, it } from "vitest";
import { BounceEngine } from "../BounceEngine.js";
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

describe("BounceEngine", () => {
  it("initializes red ball physics and rings", () => {
    const engine = new BounceEngine();
    engine.init(mockPlayers(1));

    const state = engine.getPublicState();
    expect(state.kind).toBe("bounce");
    expect(state.balls.p1).toBeDefined();
    expect(state.rings.length).toBeGreaterThan(0);
  });

  it("handles move and jump physics", () => {
    const engine = new BounceEngine();
    engine.init(mockPlayers(1));

    const jumpRes = engine.applyMove({ playerId: "p1", type: "move", data: { dir: "JUMP" } });
    expect(jumpRes.ok).toBe(true);

    const tickRes = engine.applyMove({ playerId: "p1", type: "tick" });
    expect(tickRes.ok).toBe(true);
  });
});
