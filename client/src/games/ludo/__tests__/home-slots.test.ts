import { describe, it, expect } from "vitest";
import { HOME_SLOTS } from "../board-layout";

/**
 * Finished tokens must sit INSIDE their own centre wedge, without overlapping
 * each other.
 *
 * The old layout was a line of four slots 0.5 cells apart hugging the wedge's
 * outer edge. Home tokens render ~0.63 cells wide, so they overlapped — and
 * because each wedge tapers to a point at the board centre, the two end slots
 * were outside the triangle altogether and spilled onto the neighbour's wedge.
 *
 * The centre block spans rows/cols 6..9 and is cut into four triangles that
 * meet at (7.5, 7.5):
 *   red    LEFT   (6,6) (6,9) (7.5,7.5)
 *   green  TOP    (6,6) (9,6) (7.5,7.5)
 *   yellow RIGHT  (9,6) (9,9) (7.5,7.5)
 *   blue   BOTTOM (6,9) (9,9) (7.5,7.5)
 * (given as col,row to match the SVG polygons that draw them.)
 */

/** Half-width of a home token, in cells: 3.7% of a 15-cell board / 2. */
const TOKEN_R = (3.7 / (100 / 15)) / 2;

/** How far inside its wedge a point is, in cells. Negative means outside. */
const insetInWedge: Record<string, (r: number, c: number) => number> = {
  // Boundary at row r is col <= 6 + min(r-6, 9-r); also col >= 6.
  red: (r, c) => Math.min(6 + Math.min(r - 6, 9 - r) - c, c - 6),
  // Boundary at col c is row <= 6 + min(c-6, 9-c); also row >= 6.
  green: (r, c) => Math.min(6 + Math.min(c - 6, 9 - c) - r, r - 6),
  // Boundary at row r is col >= 9 - min(r-6, 9-r); also col <= 9.
  yellow: (r, c) => Math.min(c - (9 - Math.min(r - 6, 9 - r)), 9 - c),
  // Boundary at col c is row >= 9 - min(c-6, 9-c); also row <= 9.
  blue: (r, c) => Math.min(r - (9 - Math.min(c - 6, 9 - c)), 9 - r),
};

const WEDGES = ["red", "green", "yellow", "blue"] as const;

describe("finished tokens sit inside their own wedge", () => {
  it.each(WEDGES)("%s: all four slots are within the triangle", (color) => {
    const slots = HOME_SLOTS[color];
    expect(slots).toHaveLength(4);
    for (const s of slots) {
      const inset = insetInWedge[color](s.row, s.col);
      expect(inset, `${color} slot (${s.row}, ${s.col}) inset=${inset.toFixed(3)}`).toBeGreaterThan(0);
    }
  });

  it.each(WEDGES)("%s: the token body also fits, not just its centre", (color) => {
    // A centre inside the triangle is not enough — the drawn token has width.
    for (const s of HOME_SLOTS[color]) {
      const inset = insetInWedge[color](s.row, s.col);
      expect(inset, `${color} (${s.row}, ${s.col})`).toBeGreaterThanOrEqual(TOKEN_R * 0.9);
    }
  });

  it.each(WEDGES)("%s: no two finished tokens overlap", (color) => {
    const slots = HOME_SLOTS[color];
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const d = Math.hypot(slots[i].row - slots[j].row, slots[i].col - slots[j].col);
        expect(d, `${color} slots ${i}/${j} are ${d.toFixed(3)} cells apart`).toBeGreaterThan(TOKEN_R * 2);
      }
    }
  });

  it("the four wedges are exact 90-degree rotations of each other", () => {
    // So the arrangement reads identically however the board is spun.
    const rot = (p: { row: number; col: number }) => ({
      row: 7.5 + (p.col - 7.5),
      col: 7.5 - (p.row - 7.5),
    });
    const key = (ps: { row: number; col: number }[]) =>
      ps.map((p) => `${p.row.toFixed(2)},${p.col.toFixed(2)}`).sort().join("|");

    for (let i = 0; i < WEDGES.length; i++) {
      const from = HOME_SLOTS[WEDGES[i]];
      const to = HOME_SLOTS[WEDGES[(i + 1) % WEDGES.length]];
      expect(key(from.map(rot)), `${WEDGES[i]} rotated -> ${WEDGES[(i + 1) % WEDGES.length]}`).toBe(key(to));
    }
  });
});
