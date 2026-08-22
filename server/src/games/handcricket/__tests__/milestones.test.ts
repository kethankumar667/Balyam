import { describe, it, expect } from "vitest";
import { milestoneCrossed } from "../milestones";

describe("milestoneCrossed", () => {
  it("fires exactly on the ball that crosses 50", () => {
    expect(milestoneCrossed(44, 50, false)).toBe(50);
    expect(milestoneCrossed(47, 53, false)).toBe(50);
  });

  it("fires on 100, 150, 200 the same way", () => {
    expect(milestoneCrossed(96, 100, false)).toBe(100);
    expect(milestoneCrossed(148, 151, false)).toBe(150);
    expect(milestoneCrossed(199, 200, false)).toBe(200);
  });

  it("does not fire on a ball that stays within the same 50-band", () => {
    expect(milestoneCrossed(51, 55, false)).toBeNull();
    expect(milestoneCrossed(0, 4, false)).toBeNull();
    expect(milestoneCrossed(0, 0, false)).toBeNull();
  });

  it("never fires on a wicket ball, even if the runs argument would otherwise cross a mark", () => {
    // Can't happen in practice (a dismissal ball always passes runs=0), but
    // the guard is defensive — a wicket ball is never a milestone ball.
    expect(milestoneCrossed(44, 50, true)).toBeNull();
  });

  it("landing exactly on a mark from a single delivery still counts", () => {
    expect(milestoneCrossed(48, 50, false)).toBe(50);
  });

  it("does not re-fire once already past a mark", () => {
    expect(milestoneCrossed(52, 53, false)).toBeNull();
  });
});
