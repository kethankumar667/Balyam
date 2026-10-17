import { describe, expect, it } from "vitest";
import { GRID_UNITS, MAX_FRAME, MIN_FRAME, MIN_HOLE_PX, boardFit, crossOutlinePath, grooveInset } from "../brainvitaTheme";

/** Every x and y a path visits (arc radii and flags excluded), so the outline's extent can be checked. */
function visited(path: string): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const command of path.split(/(?=[MLAZ])/)) {
    const numbers = command.slice(1).trim().split(/\s+/).map(Number);
    if (command[0] === "A") {
      xs.push(numbers[5]);
      ys.push(numbers[6]);
    } else if (command[0] === "M" || command[0] === "L") {
      xs.push(numbers[0]);
      ys.push(numbers[1]);
    }
  }
  return { xs, ys };
}

describe("crossOutlinePath", () => {
  it("is one closed outline with a rounded corner at each of the cross's 12 corners", () => {
    const path = crossOutlinePath(0.5);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/A/g)).toHaveLength(12);
  });

  it("turns outward at 8 corners and inward at the 4 notches between arm and shoulder", () => {
    const path = crossOutlinePath(0.5);
    expect(path.match(/ 0 0 1 /g)).toHaveLength(8);
    expect(path.match(/ 0 0 0 /g)).toHaveLength(4);
  });

  it("reaches exactly one rim's width beyond the holes on every side", () => {
    for (const frame of [0.2, 0.5, MAX_FRAME]) {
      const { xs, ys } = visited(crossOutlinePath(frame));
      expect(Math.min(...xs)).toBeCloseTo(-frame, 2);
      expect(Math.max(...xs)).toBeCloseTo(GRID_UNITS + frame, 2);
      expect(Math.min(...ys)).toBeCloseTo(-frame, 2);
      expect(Math.max(...ys)).toBeCloseTo(GRID_UNITS + frame, 2);
    }
  });

  it("draws a pulled-in outline strictly inside the edge, for the carved groove", () => {
    const frame = MAX_FRAME;
    const inset = grooveInset(frame);
    const outer = visited(crossOutlinePath(frame));
    const inner = visited(crossOutlinePath(frame, inset));
    expect(Math.min(...inner.xs)).toBeGreaterThan(Math.min(...outer.xs));
    expect(Math.max(...inner.xs)).toBeLessThan(Math.max(...outer.xs));
    expect(Math.min(...inner.xs)).toBeCloseTo(-(frame - inset), 2);
  });

  it("never produces a bad number, even with almost no rim", () => {
    expect(crossOutlinePath(MIN_FRAME)).not.toMatch(/NaN|Infinity/);
    expect(crossOutlinePath(MIN_FRAME, grooveInset(MIN_FRAME))).not.toMatch(/NaN|Infinity/);
  });
});

describe("boardFit", () => {
  const hole = (side: number, frame: number): number => side / (GRID_UNITS + 2 * frame);

  it("gives a roomy screen the full rim and leaves its size alone", () => {
    expect(boardFit(700)).toEqual({ frame: MAX_FRAME, side: 700 });
  });

  it("keeps a hole at least 44px wherever the offered square allows it", () => {
    for (const offered of [313, 320, 340, 352, 360, 375, 400]) {
      const { frame, side } = boardFit(offered);
      expect(hole(side, frame)).toBeGreaterThanOrEqual(MIN_HOLE_PX - 0.001);
    }
  });

  it("thins the rim as the screen narrows, never below the sliver and never above the full rim", () => {
    const frames = [420, 380, 352, 330, 313, 280].map((offered) => boardFit(offered).frame);
    for (let i = 1; i < frames.length; i += 1) expect(frames[i]).toBeLessThanOrEqual(frames[i - 1]);
    for (const frame of frames) {
      expect(frame).toBeGreaterThanOrEqual(MIN_FRAME);
      expect(frame).toBeLessThanOrEqual(MAX_FRAME);
    }
  });

  it("lets a too-small square spill a few pixels rather than shrink a hole under 44px", () => {
    const { frame, side } = boardFit(300);
    expect(frame).toBe(MIN_FRAME);
    expect(side).toBeGreaterThan(300);
    expect(side).toBeLessThan(320);
    expect(hole(side, frame)).toBeCloseTo(MIN_HOLE_PX, 5);
  });

  it("never shrinks what it was offered", () => {
    for (const offered of [200, 300, 313, 350, 500]) expect(boardFit(offered).side).toBeGreaterThanOrEqual(offered);
  });
});
