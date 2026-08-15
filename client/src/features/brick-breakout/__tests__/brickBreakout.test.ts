import { describe, it, expect } from "vitest";
import {
  clampPaddleCenterX,
  getPaddleOccupiedX,
  movePaddle,
  syncAttachedBall,
} from "../engine/movementEngine";
import {
  simulateBallStep,
  buildBrickMap,
} from "../engine/collisionEngine";
import {
  createInitialBreakoutState,
  breakoutGameReducer,
} from "../engine/gameReducer";
import { generateLevelBricks, calculateTickSpeed } from "../engine/levelGenerator";
import { createMulberry32 } from "../utils/prng";
import type { Ball, Brick, Paddle } from "../types";

describe("Brick Breakout Engine & Physics", () => {
  it("clamps paddle movement within board boundaries", () => {
    // Width 3: half width is 1. Valid center range is 1 to 8 (in grid 0..9)
    expect(clampPaddleCenterX(-5, 3)).toBe(1);
    expect(clampPaddleCenterX(0, 3)).toBe(1);
    expect(clampPaddleCenterX(5, 3)).toBe(5);
    expect(clampPaddleCenterX(9, 3)).toBe(8);
    expect(clampPaddleCenterX(15, 3)).toBe(8);
  });

  it("calculates occupied horizontal cells for paddle", () => {
    const paddle: Paddle = { centerX: 4, width: 3, row: 18 };
    expect(getPaddleOccupiedX(paddle)).toEqual([3, 4, 5]);
  });

  it("moves paddle left and right with bound protection", () => {
    const paddle: Paddle = { centerX: 1, width: 3, row: 18 };
    const movedLeft = movePaddle(paddle, -1);
    expect(movedLeft.centerX).toBe(1); // clamped at left bound

    const movedRight = movePaddle(paddle, 1);
    expect(movedRight.centerX).toBe(2);
  });

  it("synchronizes attached ball position with paddle movement", () => {
    const paddle: Paddle = { centerX: 5, width: 3, row: 18 };
    const ball: Ball = {
      position: { x: 4, y: 17 },
      velocity: { dx: 0, dy: -1 },
      attachedToPaddle: true,
    };
    const synced = syncAttachedBall(ball, paddle);
    expect(synced.position).toEqual({ x: 5, y: 17 });
  });

  it("handles wall and ceiling rebounds correctly", () => {
    const paddle: Paddle = { centerX: 5, width: 3, row: 18 };
    const bricks: Brick[] = [];

    // Left wall bounce (moving at x=0 with dx=-1)
    const leftWallBall: Ball = {
      position: { x: 0, y: 10 },
      velocity: { dx: -1, dy: -1 },
      attachedToPaddle: false,
    };
    const leftResult = simulateBallStep(leftWallBall, paddle, bricks, 1);
    expect(leftResult.ball.velocity.dx).toBe(1);
    expect(leftResult.events.some((e) => e.type === "WALL_BOUNCE")).toBe(true);

    // Right wall bounce (moving at x=9 with dx=1)
    const rightWallBall: Ball = {
      position: { x: 9, y: 10 },
      velocity: { dx: 1, dy: -1 },
      attachedToPaddle: false,
    };
    const rightResult = simulateBallStep(rightWallBall, paddle, bricks, 1);
    expect(rightResult.ball.velocity.dx).toBe(-1);
    expect(rightResult.events.some((e) => e.type === "WALL_BOUNCE")).toBe(true);

    // Ceiling bounce (moving at y=0 with dy=-1)
    const ceilingBall: Ball = {
      position: { x: 5, y: 0 },
      velocity: { dx: 1, dy: -1 },
      attachedToPaddle: false,
    };
    const ceilingResult = simulateBallStep(ceilingBall, paddle, bricks, 1);
    expect(ceilingResult.ball.velocity.dy).toBe(1);
    expect(ceilingResult.events.some((e) => e.type === "WALL_BOUNCE")).toBe(true);
  });

  it("deflects ball based on paddle segment contact", () => {
    const paddle: Paddle = { centerX: 5, width: 3, row: 18 }; // spans cells 4, 5, 6
    const bricks: Brick[] = [];

    // Left segment contact (x=4)
    const ballHitLeft: Ball = {
      position: { x: 4, y: 17 },
      velocity: { dx: 0, dy: 1 },
      attachedToPaddle: false,
    };
    const leftHit = simulateBallStep(ballHitLeft, paddle, bricks, 1);
    expect(leftHit.ball.velocity.dx).toBe(-1);
    expect(leftHit.ball.velocity.dy).toBe(-1);
    expect(leftHit.events.some((e) => e.type === "PADDLE_BOUNCE")).toBe(true);

    // Right segment contact (x=6)
    const ballHitRight: Ball = {
      position: { x: 6, y: 17 },
      velocity: { dx: 0, dy: 1 },
      attachedToPaddle: false,
    };
    const rightHit = simulateBallStep(ballHitRight, paddle, bricks, 1);
    expect(rightHit.ball.velocity.dx).toBe(1);
    expect(rightHit.ball.velocity.dy).toBe(-1);
  });

  it("destroys normal bricks and damages strong bricks with combo scoring", () => {
    const paddle: Paddle = { centerX: 5, width: 3, row: 18 };
    const normalBrick: Brick = {
      id: "b1",
      position: { x: 4, y: 4 },
      type: "NORMAL",
      hitPoints: 1,
      maxHitPoints: 1,
      scoreValue: 100,
    };
    const strongBrick: Brick = {
      id: "b2",
      position: { x: 5, y: 4 },
      type: "STRONG",
      hitPoints: 2,
      maxHitPoints: 2,
      scoreValue: 250,
    };

    // Hit normal brick with 2x combo
    const ball1: Ball = {
      position: { x: 4, y: 5 },
      velocity: { dx: 0, dy: -1 },
      attachedToPaddle: false,
    };
    const res1 = simulateBallStep(ball1, paddle, [normalBrick], 2);
    expect(res1.destroyedBrickCount).toBe(1);
    expect(res1.scoreDelta).toBe(200); // 100 * 2 combo
    expect(res1.updatedBricks.length).toBe(0);

    // Hit strong brick (first hit reduces HP to 1)
    const ball2: Ball = {
      position: { x: 5, y: 5 },
      velocity: { dx: 0, dy: -1 },
      attachedToPaddle: false,
    };
    const res2 = simulateBallStep(ball2, paddle, [strongBrick], 1);
    expect(res2.destroyedBrickCount).toBe(0);
    expect(res2.updatedBricks[0].hitPoints).toBe(1);
  });

  it("detects ball missed when dropping below paddle", () => {
    const paddle: Paddle = { centerX: 5, width: 3, row: 18 };
    const ballMissed: Ball = {
      position: { x: 1, y: 18 }, // x=1 is far away from paddle at 4..6
      velocity: { dx: 0, dy: 1 },
      attachedToPaddle: false,
    };
    const res = simulateBallStep(ballMissed, paddle, [], 1);
    expect(res.missed).toBe(true);
    expect(res.events.some((e) => e.type === "BALL_MISSED")).toBe(true);
  });

  it("generates deterministic seeded procedural levels", () => {
    const bricksA = generateLevelBricks(5, 42);
    const bricksB = generateLevelBricks(5, 42);
    expect(bricksA).toEqual(bricksB);
    expect(bricksA.length).toBeGreaterThan(0);
  });

  it("manages reducer lifecycle: start, launch, life loss, and restart", () => {
    let state = createInitialBreakoutState(500, true);
    expect(state.status).toBe("menu");

    // Start Game
    state = breakoutGameReducer(state, { type: "START_GAME", level: 1 });
    expect(state.status).toBe("serving");
    expect(state.ball.attachedToPaddle).toBe(true);
    expect(state.lives).toBe(3);

    // Move Paddle while serving
    state = breakoutGameReducer(state, { type: "MOVE_PADDLE", direction: 1 });
    expect(state.paddle.centerX).toBe(6);
    expect(state.ball.position.x).toBe(6);

    // Launch Ball
    state = breakoutGameReducer(state, { type: "LAUNCH_BALL" });
    expect(state.status).toBe("playing");
    expect(state.ball.attachedToPaddle).toBe(false);

    // Pause and Resume
    state = breakoutGameReducer(state, { type: "PAUSE_TOGGLE" });
    expect(state.status).toBe("paused");
    state = breakoutGameReducer(state, { type: "RESUME" });
    expect(state.status).toBe("playing");
  });
});
