import { describe, expect, it } from "vitest";
import { computeCarromTrajectory } from "@shared/carromTrajectory";
import type { CarromPiece } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";

describe("computeCarromTrajectory", () => {
  const cushion = CARROM_BOARD.cushion; // 6
  const size = CARROM_BOARD.size; // 100
  const baseline = CARROM_BOARD.baseline; // 18
  const strikerRadius = CARROM_BOARD.strikerRadius; // 2.6
  const coinRadius = CARROM_BOARD.coinRadius; // 1.9

  it("calculates direct forward ray when no coins or walls are hit", () => {
    const result = computeCarromTrajectory({
      striker: { x: 50, y: size - baseline }, // 50, 82
      angleRad: -Math.PI / 2, // Straight UP
      power01: 0.5,
      pieces: [],
    });

    expect(result.startX).toBe(50);
    expect(result.startY).toBe(82);
    expect(result.ghostStriker).toBeNull();
    expect(result.targetCoin).toBeNull();
    expect(result.strikerDeflection).toBeNull();
    // Path should reach top cushion or range
    expect(result.strikerPath.length).toBeGreaterThanOrEqual(2);
  });

  it("detects direct coin hit, computes ghost striker, target trajectory and deflection", () => {
    const coinY = 50;
    const pieces: CarromPiece[] = [
      { id: "c1", kind: "white", x: 50, y: coinY, vx: 0, vy: 0, pocketed: false },
    ];

    const result = computeCarromTrajectory({
      striker: { x: 50, y: 82 },
      angleRad: -Math.PI / 2, // Straight UP towards (50, 50)
      power01: 0.8,
      pieces,
    });

    expect(result.ghostStriker).not.toBeNull();
    // Expected ghost striker Y at impact = coinY + strikerRadius + coinRadius
    const expectedGhostY = coinY + strikerRadius + coinRadius;
    expect(result.ghostStriker!.x).toBeCloseTo(50, 2);
    expect(result.ghostStriker!.y).toBeCloseTo(expectedGhostY, 2);

    expect(result.targetCoin).not.toBeNull();
    expect(result.targetCoin!.coinId).toBe("c1");
    // Direct head-on hit: target should fly straight UP (dirY = -1, dirX = 0)
    expect(result.targetCoin!.dirX).toBeCloseTo(0, 2);
    expect(result.targetCoin!.dirY).toBeCloseTo(-1, 2);
    // Target end Y should be well above start Y
    expect(result.targetCoin!.endY).toBeLessThan(coinY);
  });

  it("computes cut-shot angles and deflection tangent on glancing hit", () => {
    // Coin is offset slightly to the right of the striker path
    const pieces: CarromPiece[] = [
      { id: "c2", kind: "black", x: 52, y: 60, vx: 0, vy: 0, pocketed: false },
    ];

    const result = computeCarromTrajectory({
      striker: { x: 50, y: 82 },
      angleRad: -Math.PI / 2, // Shooting straight UP
      power01: 0.7,
      pieces,
    });

    expect(result.ghostStriker).not.toBeNull();
    expect(result.targetCoin).not.toBeNull();
    // Coin should be pushed to the right (positive dirX)
    expect(result.targetCoin!.dirX).toBeGreaterThan(0);
    expect(result.targetCoin!.dirY).toBeLessThan(0);

    // Striker should deflect to the left (negative dirX)
    expect(result.strikerDeflection).not.toBeNull();
    expect(result.strikerDeflection!.dirX).toBeLessThan(0);
  });

  it("computes bank shot: reflects off cushion and hits coin after rebound", () => {
    // Striker shoots toward left cushion at an angle
    // Coin is placed where the rebound will travel
    const pieces: CarromPiece[] = [
      { id: "c3", kind: "queen", x: 30, y: 40, vx: 0, vy: 0, pocketed: false },
    ];

    const result = computeCarromTrajectory({
      striker: { x: 20, y: 82 },
      angleRad: -2.356, // Up and left toward left cushion (~135 deg)
      power01: 1.0,
      pieces,
    });

    expect(result.cushionBounce).not.toBeNull();
    expect(result.cushionBounce!.x).toBeCloseTo(cushion + strikerRadius, 1);
  });

  it("flags isPocketTargeted when target coin is heading directly for a pocket", () => {
    // Pocket 0 is at (6, 6)
    // Place coin at (20, 20)
    // Striker at (30, 30) aiming at -2.356 (-135 deg) directly in line with pocket
    const pieces: CarromPiece[] = [
      { id: "c_pocket", kind: "white", x: 20, y: 20, vx: 0, vy: 0, pocketed: false },
    ];

    const angleToCoinAndPocket = Math.atan2(20 - 30, 20 - 30); // -135 deg

    const result = computeCarromTrajectory({
      striker: { x: 30, y: 30 },
      angleRad: angleToCoinAndPocket,
      power01: 0.9,
      pieces,
    });

    expect(result.ghostStriker).not.toBeNull();
    expect(result.targetCoin).not.toBeNull();
    expect(result.isPocketTargeted).toBe(true);
    expect(result.targetedPocketIndex).toBe(0); // Top-left pocket
  });
});
