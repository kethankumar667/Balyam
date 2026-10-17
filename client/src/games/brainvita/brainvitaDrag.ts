import { cellOf } from "./brainvitaRules";
import { GRID_UNITS } from "./brainvitaTheme";

/**
 * The arithmetic of dragging a marble: where a pointer is on the board, and which landing hole it is
 * close enough to be pulled into. Pure, so it is tested without a browser.
 */

/** A press that moves less than this is a tap, not a drag, so the ordinary tap-tap play is untouched. */
export const DRAG_START_PX = 7;
/** How close, in hole widths, a dragged marble must come to a landing hole for it to snap in. */
export const SNAP_RADIUS = 0.68;

export interface Point {
  x: number;
  y: number;
}

/** The pointer's position in hole widths from the pit area's top-left, given that area's on-screen box. */
export function pointerToCells(box: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): Point {
  return {
    x: ((clientX - box.left) / box.width) * GRID_UNITS,
    y: ((clientY - box.top) / box.height) * GRID_UNITS,
  };
}

export function holeCentre(hole: number): Point {
  const { row, col } = cellOf(hole);
  return { x: col + 0.5, y: row + 0.5 };
}

/** True once a press has travelled far enough to be a drag. */
export const hasDragged = (startX: number, startY: number, x: number, y: number): boolean => Math.hypot(x - startX, y - startY) >= DRAG_START_PX;

/** The nearest landing hole within reach of the pointer, or null when it is over open wood. */
export function snapTarget(point: Point, targets: readonly number[], radius = SNAP_RADIUS): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  for (const target of targets) {
    const centre = holeCentre(target);
    const distance = Math.hypot(centre.x - point.x, centre.y - point.y);
    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

/** Keeps a point on the board, so a marble dragged to the edge of the screen cannot be lost off it. */
export const clampToBoard = (point: Point): Point => ({
  x: Math.min(GRID_UNITS, Math.max(0, point.x)),
  y: Math.min(GRID_UNITS, Math.max(0, point.y)),
});
