import { describe, it, expect } from "vitest";
import { SnapshotTimeline } from "../snapshotTimeline";

const STEP = 100;

function feed(tl: SnapshotTimeline<number>, count: number, gap = STEP, from = 1000): number {
  let at = from;
  for (let i = 0; i < count; i++) {
    tl.push(i, at);
    at += gap;
  }
  return at - gap; // arrival time of the last snapshot pushed
}

describe("SnapshotTimeline", () => {
  it("returns null until something has been pushed", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    expect(tl.sample(0)).toBeNull();
  });

  it("advances t across a step instead of finishing early and freezing", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    const lastAt = feed(tl, 4);

    // Rendering one delay behind live, walk the frame clock across one step
    // and confirm t sweeps the whole 0..1 range without ever pinning at 1.
    const delay = tl.delayMs();
    const seen: number[] = [];
    for (let ms = 0; ms < STEP; ms += 10) {
      const s = tl.sample(lastAt - STEP + delay + ms)!;
      seen.push(s.t);
      expect(s.starved).toBe(false);
    }
    expect(seen[0]).toBeCloseTo(0, 5);
    expect(seen[seen.length - 1]).toBeGreaterThan(0.85);
    // Strictly increasing — no frozen tail.
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it("absorbs a late packet instead of stalling on it", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    // A connection that wobbles by ~25ms, so the buffer learns to sit deeper.
    let at = 1000;
    const gaps = [100, 125, 80, 120, 85, 115, 90];
    for (let i = 0; i < gaps.length; i++) {
      tl.push(i, at);
      at += gaps[i];
    }
    expect(tl.delayMs()).toBeGreaterThan(STEP);

    // The next packet is 40ms late. Every frame in the meantime still has two
    // snapshots to blend, because the render clock is that far behind.
    const lateArrival = at + 40;
    tl.push(gaps.length, lateArrival);
    let starvedFrames = 0;
    for (let ms = 0; ms < 40; ms += 8) {
      if (tl.sample(at + ms)!.starved) starvedFrames++;
    }
    expect(starvedFrames).toBe(0);
  });

  it("holds the newest state when the buffer genuinely runs dry", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    const lastAt = feed(tl, 3);
    const s = tl.sample(lastAt + STEP * 5)!;
    expect(s.starved).toBe(true);
    expect(s.cur).toBe(2);
    expect(s.t).toBe(1);
  });

  it("never extrapolates past the newest snapshot", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    const lastAt = feed(tl, 5);
    for (let ms = 0; ms < STEP * 6; ms += 7) {
      const s = tl.sample(lastAt - STEP * 3 + ms)!;
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the delay at one step on a jitter-free connection", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    feed(tl, 12);
    // Perfect delivery must not buy extra latency: this is the same one-step
    // lag the old fixed-duration tween had.
    expect(tl.delayMs()).toBeCloseTo(STEP, 1);
  });

  it("does not let a backgrounded tab inflate the buffer", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    let at = 1000;
    for (let i = 0; i < 8; i++, at += STEP) tl.push(i, at);
    const before = tl.delayMs();
    tl.push(99, at + 5000); // tab was hidden for five seconds
    expect(tl.delayMs()).toBeCloseTo(before, 1);
  });

  it("caps retained snapshots", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP, capacity: 5 });
    feed(tl, 50);
    const s = tl.sample(1000 + 49 * STEP)!;
    // Only the tail survived, and the tail is what we render from.
    expect(s.cur).toBeGreaterThanOrEqual(45);
  });

  it("re-seeds pacing when the engine changes speed", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    feed(tl, 6);
    tl.setStepMs(50);
    expect(tl.delayMs()).toBeCloseTo(50, 1);
  });

  it("prunes snapshots it can no longer reach", () => {
    const tl = new SnapshotTimeline<number>({ stepMs: STEP });
    const lastAt = feed(tl, 20);
    tl.sample(lastAt);
    // After sampling near live, the old head is gone but rendering continues.
    const s = tl.sample(lastAt + 10)!;
    expect(s.cur).toBeGreaterThan(15);
  });
});
