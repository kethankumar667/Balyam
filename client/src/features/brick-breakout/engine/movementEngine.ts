import type { Ball, Paddle, Position } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";

/**
 * Clamps paddle center X position so all paddle cells remain inside board [0, GRID_WIDTH - 1].
 */
export function clampPaddleCenterX(centerX: number, width: number = BREAKOUT_CONSTANTS.PADDLE_WIDTH): number {
  const half = Math.floor(width / 2);
  const minCenter = half;
  const maxCenter = BREAKOUT_CONSTANTS.GRID_WIDTH - 1 - half;
  return Math.max(minCenter, Math.min(maxCenter, centerX));
}

/**
 * Returns all horizontal cell X coordinates occupied by the paddle.
 */
export function getPaddleOccupiedX(paddle: Paddle): number[] {
  const half = Math.floor(paddle.width / 2);
  const xs: number[] = [];
  for (let dx = -half; dx <= half; dx++) {
    xs.push(paddle.centerX + dx);
  }
  return xs;
}

/**
 * Moves the paddle by deltaX (-1 or +1), clamping within board bounds.
 */
export function movePaddle(paddle: Paddle, deltaX: -1 | 1): Paddle {
  const newCenter = clampPaddleCenterX(paddle.centerX + deltaX, paddle.width);
  return {
    ...paddle,
    centerX: newCenter,
  };
}

/**
 * Updates attached ball position when paddle moves.
 */
export function syncAttachedBall(ball: Ball, paddle: Paddle): Ball {
  if (!ball.attachedToPaddle) return ball;
  return {
    ...ball,
    position: {
      x: paddle.centerX,
      y: paddle.row - 1,
    },
  };
}
