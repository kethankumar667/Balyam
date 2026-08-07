import { describe, expect, it } from "vitest";
import { RoadRashEngine } from "../RoadRashEngine.js";
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

describe("RoadRashEngine", () => {
  it("initializes motorcycle position and speeds", () => {
    const engine = new RoadRashEngine();
    engine.init(mockPlayers(1));

    const state = engine.getPublicState();
    expect(state.kind).toBe("roadrash");
    expect(state.bikes.p1).toBeDefined();
    expect(state.bikes.p1.speed).toBe(20);
  });

  it("handles steering, acceleration, and attack combat", () => {
    const engine = new RoadRashEngine();
    engine.init(mockPlayers(1));

    const steerRes = engine.applyMove({ playerId: "p1", type: "steer", data: { dir: "RIGHT" } });
    expect(steerRes.ok).toBe(true);

    const accelRes = engine.applyMove({ playerId: "p1", type: "throttle", data: { accel: true } });
    expect(accelRes.ok).toBe(true);

    const attackRes = engine.applyMove({ playerId: "p1", type: "attack" });
    expect(attackRes.ok).toBe(true);
  });
});
