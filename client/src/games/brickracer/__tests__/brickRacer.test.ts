import { describe, it, expect } from "vitest";
import { PlayerCar } from "../entities/PlayerCar";
import { EnemyCarManager } from "../entities/EnemyCarManager";
import { CollisionEngine } from "../engine/CollisionEngine";
import { DifficultyEngine } from "../engine/DifficultyEngine";

describe("Brick Game Formula 1 Core Engine", () => {
  it("initializes player in center lane (lane 1)", () => {
    const player = new PlayerCar();
    expect(player.lane).toBe(1);
    expect(player.centerCol).toBe(5);
  });

  it("moves player left and right within boundary bounds", () => {
    const player = new PlayerCar();
    expect(player.moveLeft()).toBe(true);
    expect(player.lane).toBe(0);
    expect(player.centerCol).toBe(2);

    // Cannot move beyond left lane
    expect(player.moveLeft()).toBe(false);
    expect(player.lane).toBe(0);

    expect(player.moveRight()).toBe(true);
    expect(player.lane).toBe(1);

    expect(player.moveRight()).toBe(true);
    expect(player.lane).toBe(2);
    expect(player.centerCol).toBe(7);

    // Cannot move beyond right lane
    expect(player.moveRight()).toBe(false);
    expect(player.lane).toBe(2);
  });

  it("generates 8 discrete physical block coordinates for Formula 1 car mesh", () => {
    const player = new PlayerCar();
    const pixels = player.getPixels();
    expect(pixels.length).toBe(8);
    expect(pixels[0]).toEqual({ x: 5, y: 16 }); // Nose
  });

  it("advances enemy traffic and counts dodged cars", () => {
    const manager = new EnemyCarManager();
    manager.enemies = [
      { id: "e1", lane: 0, y: 19, speedBonus: false },
      { id: "e2", lane: 2, y: 5, speedBonus: false },
    ];

    const result = manager.advance();
    expect(result.dodgedCount).toBe(0); // y becomes 20 & 6

    const result2 = manager.advance();
    expect(result2.dodgedCount).toBe(1); // e1 exceeds y=20
    expect(manager.enemies.length).toBe(1);
  });

  it("detects car collision on physical block coordinate overlap", () => {
    const player = new PlayerCar();
    player.lane = 1; // Center lane, y=16

    const manager = new EnemyCarManager();
    // Place enemy directly intersecting player in center lane
    manager.enemies = [
      { id: "e1", lane: 1, y: 15, speedBonus: false },
    ];

    expect(CollisionEngine.checkCollision(player, manager)).toBe(true);
  });

  it("reports no collision when enemy is in a different lane", () => {
    const player = new PlayerCar();
    player.lane = 0; // Left lane

    const manager = new EnemyCarManager();
    // Enemy in right lane at same Y
    manager.enemies = [
      { id: "e1", lane: 2, y: 16, speedBonus: false },
    ];

    expect(CollisionEngine.checkCollision(player, manager)).toBe(false);
  });

  it("calculates difficulty speed curves and boost acceleration", () => {
    expect(DifficultyEngine.getTickInterval(1, false)).toBe(240);
    expect(DifficultyEngine.getTickInterval(1, true)).toBe(133);
    expect(DifficultyEngine.getTickInterval(8, false)).toBe(65);
    expect(DifficultyEngine.getTickInterval(8, true)).toBe(40);
  });
});
