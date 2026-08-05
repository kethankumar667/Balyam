import { describe, it, expect } from "vitest";
import { HOME_SLOTS, HOME_TOKEN_PCT } from "../board-layout";

/**
 * Finished tokens must sit INSIDE their own centre wedge, without overlapping
 * each other.
 *
 * The old layout was a line of four slots 0.5 cells apart hugging the wedge's
 * outer edge. Home tokens render ~0.63 cells wide, so they overlapped — and
 * because each wedge tapers to a point at the board centre, the two end slots
 * were outside the triangle altogether and spilled onto the neighbour's wedge.
 *
 * The centre block spans rows/cols 5.5..8.5 and is cut into four triangles that
 * meet at (7, 7) in the cell-INDEX space cellToPct consumes:
 *   red    LEFT   (5.5,5.5) (5.5,8.5) (7,7)
 *   green  TOP    (5.5,5.5) (8.5,5.5) (7,7)
 *   yellow RIGHT  (8.5,5.5) (8.5,8.5) (7,7)
 *   blue   BOTTOM (5.5,8.5) (8.5,8.5) (7,7)
 * (given as col,row to match the SVG polygons that draw them.)
 */

/** Half-width of a home token, in cells. Derived from the SAME constant the
 *  renderer uses, so the two can no longer drift apart. */
const TOKEN_R = HOME_TOKEN_PCT / (100 / 15) / 2;

/**
 * Radius of the white star medallion drawn at the board centre, in cells.
 *
 * This bound was ABSENT from the original suite, which is exactly how the old
 * 2x2 layout shipped: its inner pair sat 0.71 cells from centre — comfortably
 * inside its wedge, and comfortably underneath the star.
 */
const MEDALLION_R = 0.78;

/** How far inside its wedge a point is, in cells. Negative means outside. */
const insetInWedge: Record<string, (r: number, c: number) => number> = {
  // Boundary at row r is col <= 6 + min(r-6, 9-r); also col >= 6.
  red: (r, c) => Math.min(5.5 + Math.min(r - 5.5, 8.5 - r) - c, c - 5.5),
  // Boundary at col c is row <= 6 + min(c-6, 9-c); also row >= 6.
  green: (r, c) => Math.min(5.5 + Math.min(c - 5.5, 8.5 - c) - r, r - 5.5),
  // Boundary at row r is col >= 9 - min(r-6, 9-r); also col <= 9.
  yellow: (r, c) => Math.min(c - (8.5 - Math.min(r - 5.5, 8.5 - r)), 8.5 - c),
  // Boundary at col c is row >= 9 - min(c-6, 9-c); also row <= 9.
  blue: (r, c) => Math.min(r - (8.5 - Math.min(c - 5.5, 8.5 - c)), 8.5 - r),
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

  it.each(WEDGES)("%s: no finished token sits on the centre medallion", (color) => {
    // The regression this suite previously allowed through.
    for (const s of HOME_SLOTS[color]) {
      const d = Math.hypot(s.row - 7, s.col - 7);
      expect(
        d,
        `${color} slot (${s.row}, ${s.col}) is ${d.toFixed(3)} cells from centre — ` +
          `needs >= ${(MEDALLION_R + TOKEN_R).toFixed(3)} to clear the star`,
      ).toBeGreaterThanOrEqual(MEDALLION_R + TOKEN_R);
    }
  });

  it.each(WEDGES)("%s: no finished token escapes the centre block", (color) => {
    for (const s of HOME_SLOTS[color]) {
      expect(Math.min(s.row, s.col), `${color} (${s.row}, ${s.col})`).toBeGreaterThanOrEqual(5.5 + TOKEN_R);
      expect(Math.max(s.row, s.col), `${color} (${s.row}, ${s.col})`).toBeLessThanOrEqual(8.5 - TOKEN_R);
    }
  });

  it("the four wedges are exact 90-degree rotations of each other", () => {
    // So the arrangement reads identically however the board is spun.
    const rot = (p: { row: number; col: number }) => ({
      row: 7 + (p.col - 7),
      col: 7 - (p.row - 7),
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
