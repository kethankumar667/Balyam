import React, { useMemo } from "react";
import type { GameState } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";
import { getPaddleOccupiedX } from "../engine/movementEngine";
import styles from "../styles/BrickBreakout.module.css";

interface BreakoutGridProps {
  state: GameState;
}

type CellType =
  | "EMPTY"
  | "NORMAL_BRICK"
  | "STRONG_BRICK"
  | "DAMAGED_BRICK"
  | "INDESTRUCTIBLE_BRICK"
  | "PADDLE"
  | "BALL";

export const BreakoutGrid: React.FC<BreakoutGridProps> = ({ state }) => {
  const { paddle, ball, bricks } = state;

  // Build matrix snapshot
  const matrix: CellType[][] = useMemo(() => {
    const grid: CellType[][] = Array.from({ length: BREAKOUT_CONSTANTS.GRID_HEIGHT }, () =>
      Array.from({ length: BREAKOUT_CONSTANTS.GRID_WIDTH }, () => "EMPTY"),
    );

    // 1. Render active Bricks
    for (const b of bricks) {
      if (b.hitPoints > 0 && b.position.y >= 0 && b.position.y < BREAKOUT_CONSTANTS.GRID_HEIGHT && b.position.x >= 0 && b.position.x < BREAKOUT_CONSTANTS.GRID_WIDTH) {
        if (b.type === "INDESTRUCTIBLE") {
          grid[b.position.y][b.position.x] = "INDESTRUCTIBLE_BRICK";
        } else if (b.type === "STRONG") {
          grid[b.position.y][b.position.x] = b.hitPoints === 1 ? "DAMAGED_BRICK" : "STRONG_BRICK";
        } else {
          grid[b.position.y][b.position.x] = "NORMAL_BRICK";
        }
      }
    }

    // 2. Render Paddle
    const paddleXs = getPaddleOccupiedX(paddle);
    for (const x of paddleXs) {
      if (x >= 0 && x < BREAKOUT_CONSTANTS.GRID_WIDTH) {
        grid[paddle.row][x] = "PADDLE";
      }
    }

    // 3. Render Ball
    if (
      ball.position.y >= 0 &&
      ball.position.y < BREAKOUT_CONSTANTS.GRID_HEIGHT &&
      ball.position.x >= 0 &&
      ball.position.x < BREAKOUT_CONSTANTS.GRID_WIDTH
    ) {
      grid[ball.position.y][ball.position.x] = "BALL";
    }

    return grid;
  }, [paddle, ball, bricks]);

  return (
    <div className={styles.lcdContainer} style={{ width: "100%", maxWidth: 280, aspectRatio: "10/20" }}>
      <div className={styles.matrixGrid}>
        {matrix.map((row, rIdx) =>
          row.map((cellType, cIdx) => {
            let cellClass = styles.cellEmpty;
            if (cellType === "NORMAL_BRICK") cellClass = styles.cellNormalBrick;
            else if (cellType === "STRONG_BRICK") cellClass = styles.cellStrongBrick;
            else if (cellType === "DAMAGED_BRICK") cellClass = styles.cellDamagedBrick;
            else if (cellType === "INDESTRUCTIBLE_BRICK") cellClass = styles.cellIndestructibleBrick;
            else if (cellType === "PADDLE") cellClass = styles.cellPaddle;
            else if (cellType === "BALL") cellClass = styles.cellBall;

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`${styles.cell} ${cellClass}`}
                data-row={rIdx}
                data-col={cIdx}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};

export default BreakoutGrid;
