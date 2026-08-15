import React, { useMemo } from "react";
import type { GameState, CellValue } from "../types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";
import { getGhostPosition } from "../engine/ghostEngine";
import styles from "../styles/MatrixGrid.module.css";

interface MatrixGridProps {
  state: GameState;
}

export const MatrixGrid: React.FC<MatrixGridProps> = ({ state }) => {
  // Merge locked board, active piece, and ghost piece into a 2D rendering buffer
  const displayGrid = useMemo(() => {
    const grid: Array<Array<{ value: CellValue; isGhost: boolean; isClearing: boolean }>> =
      Array.from({ length: BOARD_HEIGHT }, (_, r) =>
        Array.from({ length: BOARD_WIDTH }, (_, c) => ({
          value: state.board[r]?.[c] ?? 0,
          isGhost: false,
          isClearing: state.clearingLines.includes(r),
        })),
      );

    // Overlay ghost piece if enabled and playing
    if (state.activePiece && state.settings.ghostPieceEnabled && state.status === "playing") {
      const ghost = getGhostPosition(state.board, state.activePiece);
      const size = state.activePiece.matrix.length;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (state.activePiece.matrix[r][c] === 1) {
            const gy = ghost.y + r;
            const gx = ghost.x + c;
            if (gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
              if (grid[gy][gx].value === 0) {
                grid[gy][gx].isGhost = true;
              }
            }
          }
        }
      }
    }

    // Overlay active piece
    if (state.activePiece && (state.status === "playing" || state.status === "line-clearing")) {
      const size = state.activePiece.matrix.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (state.activePiece.matrix[r][c] === 1) {
            const py = state.activePiece.position.y + r;
            const px = state.activePiece.position.x + c;
            if (py >= 0 && py < BOARD_HEIGHT && px >= 0 && px < BOARD_WIDTH) {
              grid[py][px].value = 1;
              grid[py][px].isGhost = false;
            }
          }
        }
      }
    }

    return grid;
  }, [
    state.board,
    state.activePiece,
    state.settings.ghostPieceEnabled,
    state.status,
    state.clearingLines,
  ]);

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.scanlineOverlay} />
      <div className={styles.matrixGrid}>
        {displayGrid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            let cellStyle = styles.cellInactive;
            if (cell.isClearing) {
              cellStyle = styles.cellClearing;
            } else if (cell.value === 1) {
              cellStyle = styles.cellActive;
            } else if (cell.isGhost) {
              cellStyle = styles.cellGhost;
            }

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`${styles.cell} ${cellStyle}`}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};
