import { describe, it, expect, beforeEach } from "vitest";
import { SnakeEngine } from "../SnakeEngine.js";
import type { Player } from "@shared/types.js";

/**
 * Runs out the "3, 2, 1, GO" countdown so the snake actually moves.
 *
 * These tests used to drive the engine with `applyMove({ type: "tick" })`,
 * which called the step function directly and skipped the countdown as a
 * side effect. That move is refused now — an engine that owns a server loop
 * must not also take ticks from clients (see speed.test.ts) — so the tests
 * go through `simulateTick`, which honours the countdown like a real game.
 */
function beginPlay(engine: SnakeEngine): void {
  for (let i = 0; i < 30; i++) engine.simulateTick();
}

describe("SnakeEngine", () => {
  let engine: SnakeEngine;
  const players: Player[] = [
    { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    { id: "p2", name: "Player 2", isBot: false, isHost: false, isLocal: false, isReady: true, isConnected: true },
  ];

  beforeEach(() => {
    engine = new SnakeEngine();
    engine.init(players);
    beginPlay(engine);
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

  it("handles valid turn inputs and queues turns", () => {
    const res = engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "DOWN" },
    });
    expect(res.ok).toBe(true);

    engine.simulateTick();
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("DOWN");
  });

  it("ignores opposite direction inputs", () => {
    // Initial dir is RIGHT, opposite is LEFT
    engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "LEFT" },
    });
    engine.simulateTick();
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("RIGHT");
  });

  it("handles wrap around mode correctly", () => {
    const singlePlayer: Player[] = [
      { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    ];
    engine.setOptions({ wallMode: "wrap", gridSize: 10 });
    engine.init(singlePlayer);
    beginPlay(engine);

    // Turn p1 UP and move off grid top boundary
    engine.applyMove({ playerId: "p1", type: "turn", data: { dir: "UP" } });
    for (let i = 0; i < 6; i++) {
      engine.simulateTick();
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

describe("public state carries identity", () => {
  it("gives every player their real name, not an id fragment", () => {
    // The boards used to render `p.id.slice(0, 4)`, so opponents appeared as
    // strings like "p_17". `snakes` holds no identity, so the name has to be
    // captured at init and re-attached here.
    const e = new SnakeEngine();
    e.init([
      { id: "p0", name: "Kethan", isHost: true, isReady: true, isConnected: true },
      { id: "p1", name: "Ravi", isHost: false, isReady: true, isConnected: true },
    ] as never);

    const names = e.getPublicState().players.map((p) => p.name);
    expect(names).toEqual(["Kethan", "Ravi"]);
  });

  it("falls back to a readable label rather than undefined", () => {
    const e = new SnakeEngine();
    e.init([
      { id: "p0", name: "", isHost: true, isReady: true, isConnected: true },
    ] as never);
    const name = e.getPublicState().players[0].name;
    expect(name.length).toBeGreaterThan(0);
  });
});
