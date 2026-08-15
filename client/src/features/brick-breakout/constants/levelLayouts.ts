import type { Brick, BrickType, Position } from "../types";
import { BREAKOUT_CONSTANTS } from "./gameConstants";

export interface LevelBlueprint {
  levelNumber: number;
  name: string;
  rows: string[]; // 10 chars per string. '.' = empty, 'N' = normal, 'S' = strong, 'X' = indestructible
}

export const PRESET_LEVELS: LevelBlueprint[] = [
  // Level 1: Classic 3 full rows
  {
    levelNumber: 1,
    name: "BEGINNER WALL",
    rows: [
      "..........",
      "..........",
      "NNNNNNNNNN",
      "NNNNNNNNNN",
      "NNNNNNNNNN",
    ],
  },
  // Level 2: Alternating checkerboard with strong corner bricks
  {
    levelNumber: 2,
    name: "CHECKERBOARD",
    rows: [
      "..........",
      ".S.N.N.N.S",
      "N.S.N.N.S.",
      ".N.S.S.N..",
      "S.N.N.N.S.",
      ".S.N.N.N.S",
    ],
  },
  // Level 3: Pyramid fortress with Indestructible side pillars
  {
    levelNumber: 3,
    name: "PYRAMID FORTRESS",
    rows: [
      "....SS....",
      "...SSSS...",
      "..NNSSNN..",
      ".NNNNNNNN.",
      "XNNNNNNNNX",
      "X..SSSS..X",
    ],
  },
  // Level 4: Space invaders / castle barrier
  {
    levelNumber: 4,
    name: "CASTLE DEFENSE",
    rows: [
      "X.SSSSSS.X",
      "X.SNNNNS.X",
      "X..NNNN..X",
      "..X.NN.X..",
      "SS..SS..SS",
      ".X.SSSS.X.",
    ],
  },
];

/**
 * Parses level blueprint rows into concrete Brick objects.
 */
export function parseBlueprintToBricks(blueprint: LevelBlueprint): Brick[] {
  const bricks: Brick[] = [];
  let index = 0;

  blueprint.rows.forEach((rowStr, y) => {
    for (let x = 0; x < BREAKOUT_CONSTANTS.GRID_WIDTH; x++) {
      const char = rowStr[x] ?? ".";
      if (char === ".") continue;

      let type: BrickType = "NORMAL";
      let hitPoints: number = 1;
      let scoreValue: number = BREAKOUT_CONSTANTS.SCORE_NORMAL_BRICK;

      if (char === "S") {
        type = "STRONG";
        hitPoints = 2;
        scoreValue = BREAKOUT_CONSTANTS.SCORE_STRONG_BRICK;
      } else if (char === "X") {
        type = "INDESTRUCTIBLE";
        hitPoints = 999;
        scoreValue = 0;
      }

      bricks.push({
        id: `b_${blueprint.levelNumber}_${index++}_${x}_${y}`,
        position: { x, y },
        type,
        hitPoints,
        maxHitPoints: hitPoints,
        scoreValue,
      });
    }
  });

  return bricks;
}
