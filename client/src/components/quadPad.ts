/**
 * Hit-testing for a four-sector directional pad.
 *
 * The old pads put a small capsule inside each quarter and made only the
 * capsule live, so three quarters of a control the size of a coaster did
 * nothing. A thumb that landed a few millimetres wide of the glyph — which is
 * most of them, because you cannot see your own thumb — simply lost the input,
 * and the game read as unresponsive rather than as mis-aimed.
 *
 * Here the whole quarter is the target. The two diagonals through the centre
 * are the only boundaries, which is exactly the `|dx| > |dy|` test below:
 *
 *        \    UP    /
 *         \        /
 *   LEFT   ╳ dead ╳   RIGHT
 *         /        \
 *        /   DOWN   \
 *
 * The dead zone at the hub matters more than it looks. Without it the sector
 * under a thumb resting near the centre flips between all four on sub-pixel
 * movement, which for Space War means four direction changes a frame.
 */

export type PadDir = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const PAD_DIRS: readonly PadDir[] = ["UP", "RIGHT", "DOWN", "LEFT"];

export interface PadGeometry {
  /** Centre of the pad, in the same space as the point being tested. */
  cx: number;
  cy: number;
  /** Radius of the pad. */
  radius: number;
}

/**
 * Which sector a point falls in, or null for the dead hub.
 *
 * `deadZone` is a fraction of the radius. Points outside the circle still
 * resolve: a thumb that slides past the rim mid-drag should keep steering,
 * not silently release.
 */
export function resolveDir(
  geo: PadGeometry,
  x: number,
  y: number,
  deadZone = 0.22,
): PadDir | null {
  const dx = x - geo.cx;
  const dy = y - geo.cy;
  if (Math.hypot(dx, dy) < geo.radius * deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "RIGHT" : "LEFT";
  // Ties (a perfect diagonal) fall to the vertical axis. Some rule has to win
  // and an unbiased coin-flip here would chatter.
  return dy > 0 ? "DOWN" : "UP";
}

/** Geometry of an element, for `resolveDir`. */
export function geometryOf(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
}): PadGeometry {
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    radius: Math.min(rect.width, rect.height) / 2,
  };
}

/** CSS clip-path for each quarter, as a share of the pad's box. */
export const WEDGE_CLIP: Record<PadDir, string> = {
  UP: "polygon(50% 50%, 0% 0%, 100% 0%)",
  RIGHT: "polygon(50% 50%, 100% 0%, 100% 100%)",
  DOWN: "polygon(50% 50%, 100% 100%, 0% 100%)",
  LEFT: "polygon(50% 50%, 0% 100%, 0% 0%)",
};

export const DIR_LABEL: Record<PadDir, string> = {
  UP: "Up",
  RIGHT: "Right",
  DOWN: "Down",
  LEFT: "Left",
};

export const DIR_GLYPH: Record<PadDir, string> = {
  UP: "▲",
  RIGHT: "▶",
  DOWN: "▼",
  LEFT: "◀",
};
