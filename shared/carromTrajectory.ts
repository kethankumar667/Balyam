import type { CarromPiece } from "./types.js";
import { CARROM_BOARD } from "./types.js";

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface TargetCoinTrajectory {
  coinId: string;
  coinKind: string;
  startX: number;
  startY: number;
  dirX: number;
  dirY: number;
  endX: number;
  endY: number;
  aimedPocketIndex: number | null; // 0..3 if aimed directly at a pocket
}

export interface StrikerDeflectionTrajectory {
  startX: number;
  startY: number;
  dirX: number;
  dirY: number;
  endX: number;
  endY: number;
}

export interface CarromTrajectoryResult {
  /** Striker start point */
  startX: number;
  startY: number;
  /** Primary ray segments (can include cushion bounce before coin hit) */
  strikerPath: TrajectoryPoint[];
  /** Cushion impact point, if a cushion was hit */
  cushionBounce: TrajectoryPoint | null;
  /** Ghost striker location at first piece collision */
  ghostStriker: TrajectoryPoint | null;
  /** Target coin projection ray, if a coin is in the line of fire */
  targetCoin: TargetCoinTrajectory | null;
  /** Striker deflection tangent path, if a coin is hit */
  strikerDeflection: StrikerDeflectionTrajectory | null;
  /** Whether the target coin trajectory leads straight into a pocket */
  isPocketTargeted: boolean;
  /** Targeted pocket index (0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right) */
  targetedPocketIndex: number | null;
}

export interface ComputeTrajectoryOptions {
  striker: { x: number; y: number };
  angleRad: number;
  power01: number;
  pieces: CarromPiece[];
  cushion?: number;
  size?: number;
  strikerRadius?: number;
  coinRadius?: number;
  pocketRadius?: number;
  maxDistance?: number;
}

/**
 * Calculates the complete predictive aim trajectory for Carrom, matching Miniclip Carrom Pool:
 * 1. Striker forward raycast.
 * 2. Ray-circle intersection with all candidate pieces.
 * 3. Cushion rebound if no piece is hit before wall.
 * 4. Post-cushion bank shot piece detection.
 * 5. Ghost striker positioning.
 * 6. Target coin departure angle and length.
 * 7. Striker deflection angle and length.
 * 8. Pocket target acquisition check.
 */
export function computeCarromTrajectory(
  options: ComputeTrajectoryOptions
): CarromTrajectoryResult {
  const {
    striker,
    angleRad,
    power01,
    pieces,
    cushion = CARROM_BOARD.cushion,
    size = CARROM_BOARD.size,
    strikerRadius = CARROM_BOARD.strikerRadius,
    coinRadius = CARROM_BOARD.coinRadius,
    pocketRadius = CARROM_BOARD.pocketRadius,
    maxDistance = 55,
  } = options;

  const p = Math.max(0.05, Math.min(1, power01));
  const totalRange = maxDistance * (0.35 + p * 0.65);

  const minB = cushion + strikerRadius;
  const maxB = size - cushion - strikerRadius;

  const pockets: TrajectoryPoint[] = [
    { x: cushion, y: cushion },
    { x: size - cushion, y: cushion },
    { x: cushion, y: size - cushion },
    { x: size - cushion, y: size - cushion },
  ];

  const dir0X = Math.cos(angleRad);
  const dir0Y = Math.sin(angleRad);

  const livePieces = pieces.filter(
    (item) => !item.pocketed && item.kind !== "striker"
  );

  // Helper: Find ray intersection with cushion walls
  function rayCushionHit(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    maxDist: number
  ): { t: number; normalX: number; normalY: number } {
    let tMin = maxDist;
    let normalX = 0;
    let normalY = 0;

    if (dx > 1e-6) {
      const t = (maxB - ox) / dx;
      if (t > 1e-4 && t < tMin) {
        tMin = t;
        normalX = -1;
        normalY = 0;
      }
    } else if (dx < -1e-6) {
      const t = (minB - ox) / dx;
      if (t > 1e-4 && t < tMin) {
        tMin = t;
        normalX = 1;
        normalY = 0;
      }
    }

    if (dy > 1e-6) {
      const t = (maxB - oy) / dy;
      if (t > 1e-4 && t < tMin) {
        tMin = t;
        normalX = 0;
        normalY = -1;
      }
    } else if (dy < -1e-6) {
      const t = (minB - oy) / dy;
      if (t > 1e-4 && t < tMin) {
        tMin = t;
        normalX = 0;
        normalY = 1;
      }
    }

    return { t: tMin, normalX, normalY };
  }

  // Helper: Ray-circle intersection test against all candidate pieces
  function rayCoinHit(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    maxDist: number,
    ignoredCoinId?: string
  ): { t: number; piece: CarromPiece | null } {
    let bestT = maxDist;
    let bestPiece: CarromPiece | null = null;
    const rTotal = strikerRadius + coinRadius;
    const rTotalSq = rTotal * rTotal;

    for (const piece of livePieces) {
      if (ignoredCoinId && piece.id === ignoredCoinId) continue;

      const vx = ox - piece.x;
      const vy = oy - piece.y;

      const b = 2 * (vx * dx + vy * dy);
      const c = vx * vx + vy * vy - rTotalSq;
      const disc = b * b - 4 * c;

      if (disc < 0) continue;

      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / 2;
      const t2 = (-b + sqrtDisc) / 2;

      let candidateT = -1;
      if (t1 > 0.05 && t1 < bestT) {
        candidateT = t1;
      } else if (t2 > 0.05 && t2 < bestT && c < 0) {
        // Started slightly overlapping
        candidateT = t2;
      }

      if (candidateT > 0 && candidateT < bestT) {
        bestT = candidateT;
        bestPiece = piece;
      }
    }

    return { t: bestT, piece: bestPiece };
  }

  // Phase 1: Check if striker hits a coin directly before cushion
  const cushion1 = rayCushionHit(striker.x, striker.y, dir0X, dir0Y, totalRange);
  const coinHit1 = rayCoinHit(
    striker.x,
    striker.y,
    dir0X,
    dir0Y,
    cushion1.t
  );

  const strikerPath: TrajectoryPoint[] = [{ x: striker.x, y: striker.y }];
  let cushionBounce: TrajectoryPoint | null = null;
  let ghostStriker: TrajectoryPoint | null = null;
  let hitPiece: CarromPiece | null = null;
  let impactDirX = dir0X;
  let impactDirY = dir0Y;

  if (coinHit1.piece) {
    // Direct coin hit before cushion!
    const ghostX = striker.x + dir0X * coinHit1.t;
    const ghostY = striker.y + dir0Y * coinHit1.t;
    strikerPath.push({ x: ghostX, y: ghostY });
    ghostStriker = { x: ghostX, y: ghostY };
    hitPiece = coinHit1.piece;
  } else if (cushion1.t < totalRange && (cushion1.normalX !== 0 || cushion1.normalY !== 0)) {
    // Hits cushion first: calculate rebound
    const bounceX = striker.x + dir0X * cushion1.t;
    const bounceY = striker.y + dir0Y * cushion1.t;
    strikerPath.push({ x: bounceX, y: bounceY });
    cushionBounce = { x: bounceX, y: bounceY };

    // Reflect velocity vector
    const dot = dir0X * cushion1.normalX + dir0Y * cushion1.normalY;
    const refX = dir0X - 2 * dot * cushion1.normalX;
    const refY = dir0Y - 2 * dot * cushion1.normalY;
    const remainingDist = totalRange - cushion1.t;

    if (remainingDist > 0.5) {
      // Check if reflected ray hits a coin (bank shot)
      const cushion2 = rayCushionHit(bounceX, bounceY, refX, refY, remainingDist);
      const coinHit2 = rayCoinHit(bounceX, bounceY, refX, refY, cushion2.t);

      if (coinHit2.piece) {
        const ghostX = bounceX + refX * coinHit2.t;
        const ghostY = bounceY + refY * coinHit2.t;
        strikerPath.push({ x: ghostX, y: ghostY });
        ghostStriker = { x: ghostX, y: ghostY };
        hitPiece = coinHit2.piece;
        impactDirX = refX;
        impactDirY = refY;
      } else {
        // Ends at cushion or ray end
        const endX = bounceX + refX * cushion2.t;
        const endY = bounceY + refY * cushion2.t;
        strikerPath.push({ x: endX, y: endY });
      }
    }
  } else {
    // Ends in open space without hitting anything
    strikerPath.push({
      x: striker.x + dir0X * totalRange,
      y: striker.y + dir0Y * totalRange,
    });
  }

  // Phase 2: If a piece was hit, compute target coin vector and deflection
  let targetCoin: TargetCoinTrajectory | null = null;
  let strikerDeflection: StrikerDeflectionTrajectory | null = null;
  let isPocketTargeted = false;
  let targetedPocketIndex: number | null = null;

  if (ghostStriker && hitPiece) {
    // Line of centers at impact: from ghost striker center to target coin center
    const normDx = hitPiece.x - ghostStriker.x;
    const normDy = hitPiece.y - ghostStriker.y;
    const normDist = Math.hypot(normDx, normDy);

    const normalX = normDist > 1e-4 ? normDx / normDist : impactDirX;
    const normalY = normDist > 1e-4 ? normDy / normDist : impactDirY;

    // Target coin departure velocity direction is normal vector
    // Power transfer factor (cos theta)
    const dotProduct = Math.max(0, impactDirX * normalX + impactDirY * normalY);
    const targetRayLength = Math.max(8, 38 * p * (0.35 + 0.65 * dotProduct));

    const targetEndX = hitPiece.x + normalX * targetRayLength;
    const targetEndY = hitPiece.y + normalY * targetRayLength;

    // Check if target coin trajectory points toward any pocket
    for (let i = 0; i < pockets.length; i++) {
      const pocket = pockets[i];
      const toPox = pocket.x - hitPiece.x;
      const toPoy = pocket.y - hitPiece.y;
      const toPoDist = Math.hypot(toPox, toPoy);

      if (toPoDist < 0.1) continue;

      const toPoDirX = toPox / toPoDist;
      const toPoDirY = toPoy / toPoDist;

      // Dot product between target direction and direction to pocket
      const aimAccuracy = normalX * toPoDirX + normalY * toPoDirY;
      // Allow slight angle tolerance (~16 degrees, cos(16) approx 0.96)
      if (aimAccuracy > 0.962 && toPoDist <= targetRayLength + pocketRadius * 2) {
        isPocketTargeted = true;
        targetedPocketIndex = i;
        break;
      }
    }

    targetCoin = {
      coinId: hitPiece.id,
      coinKind: hitPiece.kind,
      startX: hitPiece.x,
      startY: hitPiece.y,
      dirX: normalX,
      dirY: normalY,
      endX: targetEndX,
      endY: targetEndY,
      aimedPocketIndex: targetedPocketIndex,
    };

    // Striker deflection direction is the tangent component
    const tangentX = impactDirX - normalX * (impactDirX * normalX + impactDirY * normalY);
    const tangentY = impactDirY - normalY * (impactDirX * normalX + impactDirY * normalY);
    const tanLength = Math.hypot(tangentX, tangentY);

    if (tanLength > 0.05) {
      const tanUnitX = tangentX / tanLength;
      const tanUnitY = tangentY / tanLength;
      const deflectDist = Math.max(4, 18 * p * tanLength);

      strikerDeflection = {
        startX: ghostStriker.x,
        startY: ghostStriker.y,
        dirX: tanUnitX,
        dirY: tanUnitY,
        endX: ghostStriker.x + tanUnitX * deflectDist,
        endY: ghostStriker.y + tanUnitY * deflectDist,
      };
    }
  }

  return {
    startX: striker.x,
    startY: striker.y,
    strikerPath,
    cushionBounce,
    ghostStriker,
    targetCoin,
    strikerDeflection,
    isPocketTargeted,
    targetedPocketIndex,
  };
}
