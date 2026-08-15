import { describe, it, expect } from "vitest";
import { Snake } from "../entities/Snake";
import { FoodManager } from "../entities/FoodManager";
import { CollisionEngine } from "../engine/CollisionEngine";
import { DifficultyEngine } from "../engine/DifficultyEngine";

describe("Nokia Snake Core Engine", () => {
  it("advances snake head correctly based on direction", () => {
    const snake = new Snake(3);
    snake.setDirection("RIGHT");
    const head = snake.advance(false, 20, 20);
    expect(head).toEqual({ x: 9, y: 10 });
    expect(snake.body.length).toBe(3);
  });

  it("prevents 180-degree anti-reversal within the same step", () => {
    const snake = new Snake(3);
    snake.setDirection("RIGHT");
    const result = snake.setDirection("LEFT"); // Invalid 180-degree reversal
    expect(result).toBe(false);
    expect(snake.nextDirection).toBe("RIGHT");
  });

  it("allows 90-degree turns (RIGHT to UP or DOWN)", () => {
    const snake = new Snake(3);
    snake.setDirection("RIGHT");
    const upResult = snake.setDirection("UP");
    expect(upResult).toBe(true);
    expect(snake.nextDirection).toBe("UP");
  });

  it("grows when growthPending is set", () => {
    const snake = new Snake(3);
    snake.grow(1);
    snake.advance(false, 20, 20);
    expect(snake.body.length).toBe(4);
  });

  it("wraps around screen boundaries in wrap-around mode", () => {
    const snake = new Snake(1);
    snake.body = [{ x: 19, y: 10 }];
    snake.currentDirection = "RIGHT";
    snake.nextDirection = "RIGHT";
    const head = snake.advance(true, 20, 20);
    expect(head).toEqual({ x: 0, y: 10 });
  });

  it("detects wall collision in classic mode", () => {
    expect(CollisionEngine.checkWallCollision({ x: 20, y: 10 }, 20, 20)).toBe(true);
    expect(CollisionEngine.checkWallCollision({ x: -1, y: 10 }, 20, 20)).toBe(true);
    expect(CollisionEngine.checkWallCollision({ x: 10, y: 10 }, 20, 20)).toBe(false);
  });

  it("detects self collision when head intersects body segment", () => {
    const body = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 5, y: 5 }, // Collision
    ];
    expect(CollisionEngine.checkSelfCollision(body)).toBe(true);
  });

  it("spawns food only in empty grid cells", () => {
    const foodManager = new FoodManager();
    const snakeBody = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const food = foodManager.spawnNormalFood(snakeBody, 20, 20);
    expect(food).not.toBeNull();
    if (food) {
      expect(snakeBody.some((s) => s.x === food.x && s.y === food.y)).toBe(false);
    }
  });

  it("calculates difficulty speed interval scaling", () => {
    expect(DifficultyEngine.getTickInterval(1)).toBe(220);
    expect(DifficultyEngine.getTickInterval(5)).toBe(120);
    expect(DifficultyEngine.getTickInterval(8)).toBe(60);
  });
});
