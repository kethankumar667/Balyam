import { GRID_SIZE } from "./brainvitaRules";

/**
 * The look of the Brain Vita table, and the pure geometry behind the carved cross-shaped board.
 * Colours and measurements live here so the board, the table decorations and the chrome around
 * them stay one family on every screen size.
 */

export const GOLD = "#E4B128";
export const GOLD_SOFT = "#F6D57A";

/** Dark walnut tabletop the whole game sits on. */
export const TABLE_BACKGROUND = "radial-gradient(ellipse at 50% 18%, #6a3f1e 0%, #432712 48%, #24130a 100%)";

/** A dark, translucent wooden plank used for the stats bar, the action pills and the side panel. */
export const PLANK_BACKGROUND = "linear-gradient(180deg, rgba(86,50,24,0.93) 0%, rgba(48,27,12,0.95) 100%)";
export const PLANK_BORDER = "1px solid rgba(228,177,40,0.36)";
export const PLANK_SHADOW = "0 6px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,226,170,0.16)";

/** How many holes run across (and down) the board's square. */
export const GRID_UNITS = GRID_SIZE;
/** The cross's arms are the middle three columns and rows of the square. */
export const ARM_START = 2;
export const ARM_END = 5;

/** The widest rim of wood round the holes, in hole widths, and the narrowest a cramped screen can spare. */
export const MAX_FRAME = 0.55;
export const MIN_FRAME = 0.06;
/** A hole is a button, and the product asks 44px of any control on a touch screen. */
export const MIN_HOLE_PX = 44;
/** Below this much rim the carved sprigs no longer fit and are left out. */
export const SPRIG_MIN_FRAME = 0.4;

const CONCAVE_RADIUS = 0.42;
const CONVEX_RADIUS_CAP = 0.55;
const GROOVE_OFFSET = 0.17;

interface Corner {
  x: number;
  y: number;
  /** True where the outline turns away from the board, false in the notches between arm and shoulder. */
  isConvex: boolean;
}

/** The 12 corners of the cross, clockwise from the top arm's top-left, for a rim of `frame` all round. */
function crossCorners(frame: number): Corner[] {
  const near = ARM_START - frame;
  const far = ARM_END + frame;
  const lo = -frame;
  const hi = GRID_UNITS + frame;
  return [
    { x: near, y: lo, isConvex: true },
    { x: far, y: lo, isConvex: true },
    { x: far, y: near, isConvex: false },
    { x: hi, y: near, isConvex: true },
    { x: hi, y: far, isConvex: true },
    { x: far, y: far, isConvex: false },
    { x: far, y: hi, isConvex: true },
    { x: near, y: hi, isConvex: true },
    { x: near, y: far, isConvex: false },
    { x: lo, y: far, isConvex: true },
    { x: lo, y: near, isConvex: true },
    { x: near, y: near, isConvex: false },
  ];
}

const fmt = (value: number): string => value.toFixed(3);

/**
 * The outline of the cross as an SVG path, with every corner rounded. `frame` is the rim of wood round
 * the holes; `inset` pulls the whole outline inward by that much (for the carved groove), which turns
 * rounded corners into slightly tighter ones and notches into slightly looser ones, exactly as an
 * offset curve should.
 */
export function crossOutlinePath(frame: number, inset = 0): string {
  const corners = crossCorners(frame - inset);
  const convexRadius = Math.max(0.04, Math.min(CONVEX_RADIUS_CAP, Math.max(0.1, frame)) - inset);
  const concaveRadius = CONCAVE_RADIUS + inset;
  const parts: string[] = [];
  corners.forEach((corner, index) => {
    const before = corners[(index + corners.length - 1) % corners.length];
    const after = corners[(index + 1) % corners.length];
    const radius = corner.isConvex ? convexRadius : concaveRadius;
    const toward = (other: Corner): [number, number] => {
      const dx = other.x - corner.x;
      const dy = other.y - corner.y;
      const length = Math.hypot(dx, dy);
      return [corner.x + (dx / length) * radius, corner.y + (dy / length) * radius];
    };
    const [startX, startY] = toward(before);
    const [endX, endY] = toward(after);
    parts.push(`${index === 0 ? "M" : "L"}${fmt(startX)} ${fmt(startY)}`);
    parts.push(`A${fmt(radius)} ${fmt(radius)} 0 0 ${corner.isConvex ? 1 : 0} ${fmt(endX)} ${fmt(endY)}`);
  });
  parts.push("Z");
  return parts.join(" ");
}

/** Where the carved groove runs, a short way in from the board's edge. */
export const grooveInset = (frame: number): number => Math.min(GROOVE_OFFSET, frame * 0.45);

export interface BoardFit {
  /** The rim of wood round the holes, in hole widths. */
  frame: number;
  /** The side of the board's square, in px. Equal to what was offered unless a cramped screen asks to spill a little. */
  side: number;
}

/**
 * Chooses the rim so a hole is never narrower than 44px where that is possible. On a roomy screen the
 * rim is full width. On a narrow or short one it thins, down to a sliver, and if even that cannot reach
 * 44px the board is allowed to spill past what was offered by the few pixels it needs: the wood at the
 * very edge is cropped by the screen, which costs nothing, where a hole too small to tap would.
 */
export function boardFit(offered: number): BoardFit {
  const roomy = MIN_HOLE_PX * (GRID_UNITS + 2 * MAX_FRAME);
  if (offered >= roomy) return { frame: MAX_FRAME, side: offered };
  const frame = Math.max(MIN_FRAME, (offered / MIN_HOLE_PX - GRID_UNITS) / 2);
  return { frame, side: Math.max(offered, MIN_HOLE_PX * (GRID_UNITS + 2 * frame)) };
}
