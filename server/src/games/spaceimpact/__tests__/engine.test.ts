import { describe, expect, it } from "vitest";
import { SpaceImpactEngine } from "../SpaceImpactEngine.js";
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

describe("SpaceImpactEngine", () => {
  it("initializes player spaceship and enemy wave", () => {
    const engine = new SpaceImpactEngine();
    engine.init(mockPlayers(1));

    const state = engine.getPublicState();
    expect(state.kind).toBe("spaceimpact");
    expect(state.ships.p1).toBeDefined();
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("handles ship movement and laser shooting", () => {
    const engine = new SpaceImpactEngine();
    engine.init(mockPlayers(1));

    const moveRes = engine.applyMove({ playerId: "p1", type: "moveShip", data: { dy: -5 } });
    expect(moveRes.ok).toBe(true);

    const shootRes = engine.applyMove({ playerId: "p1", type: "shoot" });
    expect(shootRes.ok).toBe(true);
  });
});
