import type { Ball, Brick, Paddle, Position, Velocity } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";

export type CollisionEvent =
  | { type: "WALL_BOUNCE"; position: Position }
  | { type: "PADDLE_BOUNCE"; segment: "LEFT" | "CENTER" | "RIGHT"; position: Position }
  | { type: "BRICK_HIT"; brick: Brick; destroyed: boolean; scoreDelta: number }
  | { type: "BALL_MISSED" };

export interface StepSimulationResult {
  ball: Ball;
  updatedBricks: Brick[];
  destroyedBrickCount: number;
  scoreDelta: number;
  events: CollisionEvent[];
  missed: boolean;
}

export function createPositionKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function buildBrickMap(bricks: readonly Brick[]): Map<string, Brick> {
  const map = new Map<string, Brick>();
  for (const b of bricks) {
    if (b.hitPoints > 0) {
      map.set(createPositionKey(b.position), b);
    }
  }
  return map;
}

/**
 * Deterministically advances the ball by 1 grid substep and resolves all boundary,
 * paddle, and brick collisions.
 */
export function simulateBallStep(
  ball: Ball,
  paddle: Paddle,
  bricks: readonly Brick[],
  currentCombo: number,
  lastPaddleMoveDir: -1 | 0 | 1 = 0,
): StepSimulationResult {
  if (ball.attachedToPaddle) {
    return {
      ball: {
        ...ball,
        position: { x: paddle.centerX, y: paddle.row - 1 },
      },
      updatedBricks: bricks.slice(),
      destroyedBrickCount: 0,
      scoreDelta: 0,
      events: [],
      missed: false,
    };
  }

  const events: CollisionEvent[] = [];
  let scoreDelta = 0;
  let destroyedCount = 0;

  let vx = ball.velocity.dx;
  let vy = ball.velocity.dy;
  let posX = ball.position.x;
  let posY = ball.position.y;

  // Calculate target candidate position
  let nextX = posX + vx;
  let nextY = posY + vy;

  // 1. Boundary Collisions (Walls & Ceiling)
  if (nextX < 0) {
    nextX = 0;
    vx = 1;
    events.push({ type: "WALL_BOUNCE", position: { x: nextX, y: nextY } });
  } else if (nextX >= BREAKOUT_CONSTANTS.GRID_WIDTH) {
    nextX = BREAKOUT_CONSTANTS.GRID_WIDTH - 1;
    vx = -1;
    events.push({ type: "WALL_BOUNCE", position: { x: nextX, y: nextY } });
  }

  if (nextY < 0) {
    nextY = 0;
    vy = 1;
    events.push({ type: "WALL_BOUNCE", position: { x: nextX, y: nextY } });
  }

  // 2. Paddle Collision Check (when ball moves down towards paddle row)
  const paddleHalf = Math.floor(paddle.width / 2);
  const paddleLeft = paddle.centerX - paddleHalf;
  const paddleRight = paddle.centerX + paddleHalf;

  if (nextY >= paddle.row && posY <= paddle.row) {
    // Check if within paddle width
    if (nextX >= paddleLeft && nextX <= paddleRight) {
      nextY = paddle.row - 1;
      vy = -1; // Always deflect upwards

      let segment: "LEFT" | "CENTER" | "RIGHT" = "CENTER";
      if (nextX < paddle.centerX) {
        segment = "LEFT";
        vx = -1; // Deflect towards left
      } else if (nextX > paddle.centerX) {
        segment = "RIGHT";
        vx = 1; // Deflect towards right
      } else {
        segment = "CENTER";
        // On center hit, preserve or use last paddle motion to prevent straight vertical traps
        if (vx === 0) {
          vx = lastPaddleMoveDir !== 0 ? lastPaddleMoveDir : (nextX < 5 ? 1 : -1);
        }
      }

      events.push({
        type: "PADDLE_BOUNCE",
        segment,
        position: { x: nextX, y: nextY },
      });
    }
  }

  // 3. Ball Missed Check (ball drops below paddle)
  if (nextY > paddle.row) {
    events.push({ type: "BALL_MISSED" });
    return {
      ball: {
        position: { x: nextX, y: nextY },
        velocity: { dx: vx, dy: vy },
        attachedToPaddle: false,
      },
      updatedBricks: bricks.slice(),
      destroyedBrickCount: 0,
      scoreDelta: 0,
      events,
      missed: true,
    };
  }

  // 4. Brick Collision Check
  const brickMap = buildBrickMap(bricks);
  const hitBrick = brickMap.get(createPositionKey({ x: nextX, y: nextY }));

  let modifiedBricks = bricks.slice();

  if (hitBrick && hitBrick.hitPoints > 0) {
    // Resolve collision normal
    const horizontalNeighbor = brickMap.get(createPositionKey({ x: posX + vx, y: posY }));
    const verticalNeighbor = brickMap.get(createPositionKey({ x: posX, y: posY + vy }));

    if (horizontalNeighbor && !verticalNeighbor) {
      // Horizontal face hit -> reverse dx
      vx = (vx === 1 ? -1 : 1) as -1 | 1;
    } else if (verticalNeighbor && !horizontalNeighbor) {
      // Vertical face hit -> reverse dy
      vy = (vy === 1 ? -1 : 1) as -1 | 1;
    } else {
      // Direct or corner hit -> reverse dy primarily, or both if diagonal collision
      vy = (vy === 1 ? -1 : 1) as -1 | 1;
      if (vx !== 0) {
        vx = (vx === 1 ? -1 : 1) as -1 | 1;
      }
    }

    // Step ball back slightly so it does not embed inside brick
    nextX = posX;
    nextY = posY;

    // Apply damage to brick
    if (hitBrick.type !== "INDESTRUCTIBLE") {
      const newHitPoints = hitBrick.hitPoints - 1;
      const destroyed = newHitPoints <= 0;
      if (destroyed) {
        destroyedCount++;
        scoreDelta += hitBrick.scoreValue * Math.max(1, currentCombo);
      }

      modifiedBricks = modifiedBricks
        .map((b) =>
          b.id === hitBrick.id
            ? {
                ...b,
                hitPoints: Math.max(0, newHitPoints),
              }
            : b,
        )
        .filter((b) => b.hitPoints > 0 || b.type === "INDESTRUCTIBLE");

      events.push({
        type: "BRICK_HIT",
        brick: hitBrick,
        destroyed,
        scoreDelta: destroyed ? hitBrick.scoreValue * Math.max(1, currentCombo) : 0,
      });
    } else {
      events.push({
        type: "BRICK_HIT",
        brick: hitBrick,
        destroyed: false,
        scoreDelta: 0,
      });
    }
  }

  // Return updated state snapshot
  return {
    ball: {
      position: { x: nextX, y: nextY },
      velocity: { dx: vx, dy: vy },
      attachedToPaddle: false,
    },
    updatedBricks: modifiedBricks,
    destroyedBrickCount: destroyedCount,
    scoreDelta,
    events,
    missed: false,
  };
}
