import React, { useMemo } from "react";
import type { Alien, Projectile } from "../types";
import { GRID_HEIGHT, GRID_WIDTH } from "../types";
import { buildOccupancyMatrix } from "../utils/matrix";
import styles from "../styles/BrickSpaceAlien.module.css";

interface BrickSpaceAlienMatrixProps {
  playerCenterX: number;
  isInvulnerable: boolean;
  aliens: readonly Alien[];
  projectiles: readonly Projectile[];
}

export const BrickSpaceAlienMatrix: React.FC<BrickSpaceAlienMatrixProps> = React.memo(
  ({ playerCenterX, isInvulnerable, aliens, projectiles }) => {
    // Memoized single-pass occupancy matrix
    const matrix = useMemo(
      () => buildOccupancyMatrix(playerCenterX, isInvulnerable, aliens, projectiles),
      [playerCenterX, isInvulnerable, aliens, projectiles]
    );

    return (
      <div className={styles.lcdContainer} style={{ width: "100%", height: "100%", aspectRatio: "1/2" }}>
        <div
          className={styles.matrixGrid}
          role="grid"
          aria-label="Space Alien 10 by 20 LCD Matrix"
          aria-rowcount={GRID_HEIGHT}
          aria-colcount={GRID_WIDTH}
        >
          {matrix.map((cellType, index) => {
            let cellClass = styles.cellEmpty;
            if (cellType === "alien_basic") cellClass = styles.cellAlienBasic;
            else if (cellType === "alien_armored") cellClass = styles.cellAlienArmored;
            else if (cellType === "alien_commander") cellClass = styles.cellAlienCommander;
            else if (cellType === "player") cellClass = styles.cellPlayer;
            else if (cellType === "player_invulnerable") cellClass = styles.cellPlayerInvulnerable;
            else if (cellType === "player_bullet") cellClass = styles.cellPlayerBullet;
            else if (cellType === "alien_bullet") cellClass = styles.cellAlienBullet;

            return (
              <div
                key={index}
                className={`${styles.cell} ${cellClass}`}
                role="gridcell"
                aria-selected={cellType !== "empty"}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

export default BrickSpaceAlienMatrix;
