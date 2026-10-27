import { afterEach, describe, it, expect, vi } from "vitest";
import { PlayerCar } from "../entities/PlayerCar";
import { EnemyCarManager } from "../entities/EnemyCarManager";
import { CollisionEngine } from "../engine/CollisionEngine";
import { DifficultyEngine } from "../engine/DifficultyEngine";
import type { LaneIndex } from "../types";

afterEach(() => { vi.restoreAllMocks(); });

function escapePath(manager: EnemyCarManager, start: LaneIndex): LaneIndex[] | null {
  const horizon = Math.max(0, ...manager.enemies.map(enemy => 13 - enemy.y));
  const probe = new EnemyCarManager();
  const player = new PlayerCar();
  const failed = new Set<string>();
  const safe = (lane: LaneIndex, tick: number) => {
    player.lane = lane;
    probe.enemies = manager.enemies.map(enemy => ({ ...enemy, y: enemy.y + tick }));
    return !CollisionEngine.checkCollision(player, probe);
  };
  const visit = (lane: LaneIndex, tick: number, wait: number): LaneIndex[] | null => {
    if (!safe(lane, tick)) return null;
    if (tick >= horizon) return [];
    const key = `${lane}:${tick}:${wait}`;
    if (failed.has(key)) return null;
    const candidates: LaneIndex[] = wait > 0 ? [lane] : [lane, 0, 1, 2];
    for (const destination of candidates) {
      if (Math.abs(destination - lane) > 1 || !safe(destination, tick)) continue;
      const path = visit(destination, tick + 1, destination === lane ? Math.max(0, wait - 1) : 4);
      if (path) return [destination, ...path];
    }
    failed.add(key);
    return null;
  };
  return visit(start, 0, 8);
}

describe("Brick Game Formula 1 Core Engine", () => {
  it("initializes player in center lane (lane 1)", () => {
    const player = new PlayerCar();
    expect(player.lane).toBe(1);
    expect(player.centerCol).toBe(6);
  });

  it("moves player left and right within boundary bounds", () => {
    const player = new PlayerCar();
    expect(player.moveLeft()).toBe(true);
    expect(player.lane).toBe(0);
    expect(player.centerCol).toBe(3);

    // Cannot move beyond left lane
    expect(player.moveLeft()).toBe(false);
    expect(player.lane).toBe(0);

    expect(player.moveRight()).toBe(true);
    expect(player.lane).toBe(1);

    expect(player.moveRight()).toBe(true);
    expect(player.lane).toBe(2);
    expect(player.centerCol).toBe(9);

    // Cannot move beyond right lane
    expect(player.moveRight()).toBe(false);
    expect(player.lane).toBe(2);
  });

  it("generates 8 discrete physical block coordinates for Formula 1 car mesh", () => {
    const player = new PlayerCar();
    const pixels = player.getPixels();
    expect(pixels.length).toBe(8);
    expect(pixels[0]).toEqual({ x: 6, y: 8 }); // Nose
  });

  it("advances enemy traffic and counts dodged cars", () => {
    const manager = new EnemyCarManager();
    manager.enemies = [
      { id: "e1", lane: 0, y: 11, speedBonus: false },
      { id: "e2", lane: 2, y: 3, speedBonus: false },
    ];

    const result = manager.advance();
    expect(result.dodgedCount).toBe(0); // y becomes 12 & 4

    const result2 = manager.advance();
    expect(result2.dodgedCount).toBe(1); // e1 exceeds y=12
    expect(manager.enemies.length).toBe(1);
  });

  it("detects car collision on physical block coordinate overlap", () => {
    const player = new PlayerCar();
    player.lane = 1; // Center lane, y=8

    const manager = new EnemyCarManager();
    // Place enemy directly intersecting player in center lane
    manager.enemies = [
      { id: "e1", lane: 1, y: 7, speedBonus: false },
    ];

    expect(CollisionEngine.checkCollision(player, manager)).toBe(true);
  });

  it("reports no collision when enemy is in a different lane", () => {
    const player = new PlayerCar();
    player.lane = 0; // Left lane

    const manager = new EnemyCarManager();
    // Enemy in right lane at same Y
    manager.enemies = [
      { id: "e1", lane: 2, y: 8, speedBonus: false },
    ];

    expect(CollisionEngine.checkCollision(player, manager)).toBe(false);
  });

  it("calculates difficulty speed curves and boost acceleration", () => {
    expect(DifficultyEngine.getTickInterval(1, false)).toBe(240);
    expect(DifficultyEngine.getTickInterval(1, true)).toBe(133);
    expect(DifficultyEngine.getTickInterval(8, false)).toBe(65);
    expect(DifficultyEngine.getTickInterval(8, true)).toBe(40);
  });

  it("defers a staggered wave that closes the only remaining escape lane", () => {
    const manager = new EnemyCarManager();
    manager.enemies = [
      { id: "left", lane: 0, y: 0, speedBonus: false },
      { id: "middle", lane: 1, y: -2, speedBonus: false },
    ];
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    manager.trySpawnWave(8, 2);
    expect(manager.enemies.map(enemy => enemy.id)).toEqual(["left", "middle"]);
  });

  it("does not require crossing an occupied middle lane to reach an empty outer lane", () => {
    const manager = new EnemyCarManager();
    manager.enemies = [{ id: "middle", lane: 1, y: 0, speedBonus: false }];
    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.trySpawnWave(1, 0);
    expect(manager.enemies).toHaveLength(1);
  });

  it("allows traffic with a reachable corridor and keeps the accepted wave cooldown", () => {
    const manager = new EnemyCarManager();
    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.trySpawnWave(1, 1);
    expect(manager.enemies).toHaveLength(1);
    manager.trySpawnWave(8, 1);
    expect(manager.enemies).toHaveLength(1);
  });

  it("retries a rejected wave later without consuming enemy ids", () => {
    const manager = new EnemyCarManager();
    manager.enemies = [{ id: "middle", lane: 1, y: 0, speedBonus: false }];
    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.trySpawnWave(1, 0);
    expect(manager.enemies).toHaveLength(1);
    manager.enemies = [];
    manager.trySpawnWave(1, 0);
    expect(manager.enemies.map(enemy => enemy.id)).toEqual(["enemy_1"]);
  });

  it("rejects a dual wave requiring faster than 200 ms steering after reacting", () => {
    const manager = new EnemyCarManager();
    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.trySpawnWave(8, 0);
    expect(manager.enemies).toEqual([]);
    manager.trySpawnWave(8, 2);
    expect(manager.enemies.map(enemy => enemy.lane)).toEqual([0, 1]);
  });

  it("keeps a traversable route through seeded traffic at every level and Nitro speed", () => {
    let randomState = 1;
    vi.spyOn(Math, "random").mockImplementation(() => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState / 4294967296;
    });
    let accepted = 0;
    let dualWaves = 0;
    for (let seed = 1; seed <= 24; seed++) {
      randomState = seed;
      const level = (seed - 1) % 8 + 1;
      const manager = new EnemyCarManager();
      const player = new PlayerCar();
      player.lane = ((seed - 1) % 3) as LaneIndex;
      manager.reset();
      let plan: LaneIndex[] = [];
      for (let tick = 0; tick < 160; tick++) {
        manager.advance();
        expect(CollisionEngine.checkCollision(player, manager), `seed ${seed}, tick ${tick}`).toBe(false);
        const before = manager.enemies.length;
        manager.trySpawnWave(level, player.lane);
        if (manager.enemies.length > before) {
          accepted++;
          if (manager.enemies.length - before === 2) dualWaves++;
          const route = escapePath(manager, player.lane);
          expect(route, `unreachable spawn at seed ${seed}, tick ${tick}`).not.toBeNull();
          plan = route!;
        }
        player.lane = plan.shift() ?? player.lane;
        expect(CollisionEngine.checkCollision(player, manager)).toBe(false);
      }
    }
    expect(accepted).toBeGreaterThan(200);
    expect(dualWaves).toBeGreaterThan(10);
  });
});
