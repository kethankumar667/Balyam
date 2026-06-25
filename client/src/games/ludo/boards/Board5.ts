import type { LudoColor } from "@shared/types";
import { PLAYER_COLORS_ORDER } from "../board-layout";
import type { BoardWedge, LudoBoard, Pt } from "./types";
import { P, fmt, scale } from "./kit";

/**
 * 5-player pentagon Ludo board — geometry only (drawn by the shared BoardView).
 * Five hexagonal pods hugged by a gently-bulged gold rim, a 3-wide grid arm per
 * player (white loop columns flanking a coloured home column), safe-stars +
 * chevrons, and a 5-wedge centre. Tuned independently of the other counts.
 */

const N = 5;
const W = 360 / N; // 72°
const CELL = 4.0;
const SIDE = 4.25; // tangential offset of the loop columns from the home axis
const R_OUT = 27; // outer radius of the arm grid (just inside the pod)
const R_STEP = 3.55;
const R_POD = 37;
const POD_R = 8.8;
const WELL = 4.2;
const R_CENTER = 8.5;
const R_PODTIP = 45; // rim reaches just past each pod
const R_GAP = 39.5; // gentle valley between pods (convex, not a star)

export function buildBoard5(): LudoBoard {
  const colors = PLAYER_COLORS_ORDER.slice(0, N);

  const trackCells: Pt[] = new Array(13 * N);
  const stretchCells = {} as Record<LudoColor, Pt[]>;
  const yardSlots = {} as Record<LudoColor, Pt[]>;
  const homeSlots = {} as Record<LudoColor, Pt[]>;
  const colorStarts = {} as Record<LudoColor, number>;
  const safeSquares = new Set<number>();
  const wedges: BoardWedge[] = [];

  const radii = Array.from({ length: 6 }, (_, j) => R_OUT - j * R_STEP);
  const rTurn = radii[5] - R_STEP;

  colors.forEach((color, i) => {
    const a = i * W;
    const base = i * 13;
    colorStarts[color] = base;
    safeSquares.add(base);
    safeSquares.add(base + 8);

    for (let j = 0; j < 6; j++) trackCells[base + j] = P(radii[j], a, -SIDE);
    trackCells[base + 6] = P(rTurn, a, 0);
    for (let j = 0; j < 6; j++) trackCells[base + 7 + j] = P(radii[5 - j], a, +SIDE);

    stretchCells[color] = radii.map((r) => P(r, a));

    const podCenter = P(R_POD, a);
    const podPoly = Array.from({ length: 6 }, (_, k) => {
      const va = ((a + 30 + k * 60) * Math.PI) / 180;
      return { x: podCenter.x + POD_R * Math.sin(va), y: podCenter.y - POD_R * Math.cos(va) };
    });
    const podInner = podPoly.map((v) => ({ x: podCenter.x + (v.x - podCenter.x) * 0.84, y: podCenter.y + (v.y - podCenter.y) * 0.84 }));

    yardSlots[color] = [
      P(R_POD + 3, a, -WELL),
      P(R_POD + 3, a, +WELL),
      P(R_POD - 3, a, -WELL),
      P(R_POD - 3, a, +WELL),
    ];
    homeSlots[color] = [
      P(radii[5] - 0.6, a, -1.9),
      P(radii[5] - 0.6, a, +1.9),
      P(radii[5] - 3.8, a, -1.9),
      P(radii[5] - 3.8, a, +1.9),
    ];

    const centerPoly = [{ x: 50, y: 50 }, P(R_CENTER, a - W / 2), P(R_CENTER, a + W / 2)];

    wedges.push({
      color,
      podPoly: podPoly.map(fmt).join(" "),
      podInner: podInner.map(fmt).join(" "),
      podCenter,
      nameAnchor: P(R_POD - POD_R + 2.0, a),
      centerPoly: centerPoly.map(fmt).join(" "),
      arrow: { at: P(radii[0] + R_STEP * 0.7, a), angle: a + 180 },
    });
  });

  const outline: Pt[] = [];
  colors.forEach((_, i) => {
    outline.push(P(R_PODTIP, i * W));
    outline.push(P(R_GAP, i * W + W / 2));
  });

  return {
    N,
    cellSize: CELL,
    colors,
    trackCells,
    stretchCells,
    yardSlots,
    homeSlots,
    colorStarts,
    safeSquares,
    framePoly: outline.map((p) => scale(p, 1.075)).map(fmt).join(" "),
    boardPoly: outline.map(fmt).join(" "),
    wedges,
    centerBadge: colors.map((_, i) => P(5.6, i * W)).map(fmt).join(" "),
  };
}
