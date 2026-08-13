import { describe, expect, it } from "vitest";
import { SpaceWarEngine } from "../SpaceWarEngine.js";

describe("SpaceWarEngine", () => {
  it("initializes player state, lives, and level correctly", () => {
    const engine = new SpaceWarEngine();
    engine.init([{ id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true }]);

    const state = engine.getPublicState() as any;
    expect(state.kind).toBe("spacewar");
    expect(state.player.lives).toBe(4);
    expect(state.level).toBe(1);
    expect(state.score).toBe(0);
    expect(state.isOver).toBe(false);
  });

  it("handles moves and simulates ticks", () => {
    const engine = new SpaceWarEngine();
    engine.init([{ id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true }]);

    // Move player up
    engine.applyMove({ playerId: "p1", type: "keydown", data: "ArrowUp" });
    const initialY = (engine.getPublicState() as any).player.y;
    engine.simulateTick();
    const newY = (engine.getPublicState() as any).player.y;
    expect(newY).toBeLessThan(initialY);

    // Fire primary weapon
    const fireRes = engine.applyMove({ playerId: "p1", type: "fire" });
    expect(fireRes.ok).toBe(true);
    const state = engine.getPublicState() as any;
    expect(state.projectiles.length).toBeGreaterThan(0);
  });

  it("destroys enemy projectiles when hit by player projectiles", () => {
    const engine = new SpaceWarEngine();
    engine.init([{ id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true }]);

    // Inject player projectile and enemy projectile on collision path
    (engine as any).projectiles.push({
      id: "p_proj",
      isPlayer: true,
      x: 100,
      y: 100,
      vx: 10,
      vy: 0,
      width: 20,
      height: 10,
    });
    (engine as any).projectiles.push({
      id: "e_proj",
      isPlayer: false,
      x: 105,
      y: 100,
      vx: -10,
      vy: 0,
      width: 20,
      height: 10,
    });

    engine.simulateTick();
    const state = engine.getPublicState() as any;
    // Both projectiles should be destroyed/filtered out
    expect(state.projectiles).toHaveLength(0);
    expect(state.score).toBe(10);
  });
});
