import { describe, it, expect, beforeEach } from "vitest";
import { SnakeEngine } from "../SnakeEngine.js";
import type { Player } from "@shared/types.js";

describe("SnakeEngine", () => {
  let engine: SnakeEngine;
  const players: Player[] = [
    { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    { id: "p2", name: "Player 2", isBot: false, isHost: false, isLocal: false, isReady: true, isConnected: true },
  ];

  beforeEach(() => {
    engine = new SnakeEngine();
    engine.init(players);
  });

  it("initializes players and food correctly", () => {
    const state = engine.getPublicState();
    expect(state.kind).toBe("snake");
    expect(state.players.length).toBe(2);
    expect(state.isOver).toBe(false);
    expect(state.food).toBeDefined();
    expect(state.snakes["p1"]).toBeDefined();
    expect(state.snakes["p2"]).toBeDefined();
  });

  // The simulation is now server-owned: RoomManager calls `simulateTick`, and
  // the per-step logic lives in the private `tick()`. Tests advance the world
  // by calling `tick()` directly (one deterministic logical step), the same way
  // the server loop does internally.
  const step = (e: SnakeEngine) => (e as any).tick();

  it("handles valid turn inputs and queues turns", () => {
    const res = engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "DOWN" },
    });
    expect(res.ok).toBe(true);

    step(engine);
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("DOWN");
  });

  it("ignores client-driven tick moves (server owns the clock)", () => {
    const before = engine.getPublicState();
    const beforeHead = { ...before.snakes["p1"].body[0] };
    const res = engine.applyMove({ playerId: "p1", type: "tick" });
    expect(res.ok).toBe(true);
    const after = engine.getPublicState();
    // A client "tick" must not advance the shared world.
    expect(after.snakes["p1"].body[0]).toEqual(beforeHead);
  });

  it("advances the world from the server-owned simulateTick loop", () => {
    engine.setOptions({ speedMs: 40, gridSize: 20 });
    engine.init(players);
    const startX = engine.getPublicState().snakes["p1"].body[0].x;
    // At 20Hz each call banks 50ms; with speedMs=40 that is one step per call.
    engine.simulateTick();
    const after = engine.getPublicState();
    expect(after.snakes["p1"].body[0].x).toBe(startX + 1);
  });

  it("ignores opposite direction inputs", () => {
    // Initial dir is RIGHT, opposite is LEFT
    engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "LEFT" },
    });
    step(engine);
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("RIGHT");
  });

  it("handles wrap around mode correctly", () => {
    const singlePlayer: Player[] = [
      { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    ];
    engine.setOptions({ wallMode: "wrap", gridSize: 10 });
    engine.init(singlePlayer);

    // Turn p1 UP and move off grid top boundary
    engine.applyMove({ playerId: "p1", type: "turn", data: { dir: "UP" } });
    for (let i = 0; i < 6; i++) {
      step(engine);
    }

    const state = engine.getPublicState();
    expect(state.snakes["p1"].isAlive).toBe(true);
    // Head wrapped from y=0 -> y=9
    expect(state.snakes["p1"].body[0].y).toBe(9);
  });

  it("increases level and spawns obstacles every 10 points", () => {
    const singlePlayer: Player[] = [
      { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    ];
    engine.init(singlePlayer);
    let state = engine.getPublicState();
    expect(state.level).toBe(1);
    expect(state.obstacles.length).toBe(0);

    // Force score to 10 and tick to trigger level up
    const snake = (engine as any).snakes.get("p1");
    snake.score = 10;
    (engine as any).updateLevelAndObstacles();

    state = engine.getPublicState();
    expect(state.level).toBe(2);
    expect(state.obstacles.length).toBe(2);

    // Level 3 (20 pts) -> 4 obstacles
    snake.score = 20;
    (engine as any).updateLevelAndObstacles();

    state = engine.getPublicState();
    expect(state.level).toBe(3);
    expect(state.obstacles.length).toBe(4);

    // Level 9 (80 pts) -> size of obstacles increases
    snake.score = 80;
    (engine as any).updateLevelAndObstacles();

    state = engine.getPublicState();
    expect(state.level).toBe(9);
    expect(state.obstacles.length).toBeGreaterThan(14);
  });
});
