import { describe, expect, it } from "vitest";
import type { CarromPiece } from "@shared/types";
import {
  MAX_SNAPSHOTS,
  RENDER_DELAY_MS,
  caughtUp,
  isAnyMoving,
  pushSnapshot,
  samplePieces,
  type Snapshot,
} from "../pieceSmoothing";

const piece = (id: string, x: number, y: number, extra: Partial<CarromPiece> = {}): CarromPiece => ({
  id,
  kind: "white",
  x,
  y,
  vx: 0,
  vy: 0,
  pocketed: false,
  ...extra,
});

const snap = (t: number, ...pieces: CarromPiece[]): Snapshot => ({ t, pieces });

describe("samplePieces", () => {
  const a = snap(100, piece("c1", 10, 20, { vx: 50 }));
  const b = snap(200, piece("c1", 30, 60, { vx: 50 }));

  it("blends two snapshots by how far render time has moved between them", () => {
    const [p] = samplePieces([a, b], 150);
    expect(p.x).toBeCloseTo(20, 6);
    expect(p.y).toBeCloseTo(40, 6);
  });

  it("is exactly the earlier snapshot at its own time and the later one at its", () => {
    expect(samplePieces([a, b], 100)[0].x).toBe(10);
    expect(samplePieces([a, b], 200)[0].x).toBe(30);
  });

  it("holds the first snapshot before it exists and the last after it, never extrapolating", () => {
    expect(samplePieces([a, b], 0)[0].x).toBe(10);
    expect(samplePieces([a, b], 5000)[0].x).toBe(30);
  });

  it("uses whichever pair of snapshots brackets render time", () => {
    const c = snap(300, piece("c1", 130, 60));
    expect(samplePieces([a, b, c], 250)[0].x).toBeCloseTo(80, 6);
  });

  it("keeps a piece on the board until render time reaches the snapshot in which it fell", () => {
    const before = snap(100, piece("c1", 10, 10, { vx: 40 }));
    const after = snap(200, piece("c1", 14, 10, { pocketed: true }));
    expect(samplePieces([before, after], 150)[0].pocketed).toBe(false);
    expect(samplePieces([before, after], 200)[0].pocketed).toBe(true);
  });

  it("does not bring a pocketed piece back to life", () => {
    const gone = snap(100, piece("c1", 5, 5, { pocketed: true }));
    const still = snap(200, piece("c1", 5, 5, { pocketed: true }));
    expect(samplePieces([gone, still], 150)[0].pocketed).toBe(true);
  });

  it("takes a piece that only exists in the later snapshot as it is", () => {
    const later = snap(200, piece("c1", 30, 60), piece("new", 50, 50));
    const out = samplePieces([a, later], 150);
    expect(out.find((p) => p.id === "new")?.x).toBe(50);
  });

  it("never changes the snapshots it was given", () => {
    const frozenA = snap(100, Object.freeze(piece("c1", 10, 20)) as CarromPiece);
    const frozenB = snap(200, Object.freeze(piece("c1", 30, 60)) as CarromPiece);
    expect(() => samplePieces([frozenA, frozenB], 150)).not.toThrow();
    expect(frozenA.pieces[0].x).toBe(10);
  });

  it("returns an empty board for an empty buffer", () => {
    expect(samplePieces([], 100)).toEqual([]);
  });
});

describe("pushSnapshot", () => {
  it("appends without mutating the old buffer", () => {
    const buf: Snapshot[] = [];
    const next = pushSnapshot(buf, [piece("c1", 1, 1)], 10);
    expect(buf).toHaveLength(0);
    expect(next).toHaveLength(1);
  });

  it("keeps only the most recent snapshots", () => {
    let buf: Snapshot[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++) buf = pushSnapshot(buf, [piece("c1", i, 0)], i * 16);
    expect(buf).toHaveLength(MAX_SNAPSHOTS);
    expect(buf[buf.length - 1].pieces[0].x).toBe(MAX_SNAPSHOTS + 4);
  });

  it("never lets time run backwards when two snapshots arrive in the same instant", () => {
    let buf = pushSnapshot([], [piece("c1", 1, 1)], 100);
    buf = pushSnapshot(buf, [piece("c1", 2, 1)], 100);
    expect(buf[1].t).toBeGreaterThan(buf[0].t);
  });
});

describe("motion helpers", () => {
  it("knows whether anything on the board is still moving", () => {
    expect(isAnyMoving([piece("a", 1, 1), piece("b", 2, 2)])).toBe(false);
    expect(isAnyMoving([piece("a", 1, 1, { vx: 3 })])).toBe(true);
    expect(isAnyMoving([piece("a", 1, 1, { vx: 3, pocketed: true })])).toBe(false);
  });

  it("is caught up once render time has passed the newest snapshot and the board is still", () => {
    const still = [snap(100, piece("a", 1, 1))];
    expect(caughtUp(still, 100 + RENDER_DELAY_MS + 1)).toBe(true);
    expect(caughtUp(still, 100)).toBe(false);
    expect(caughtUp([snap(100, piece("a", 1, 1, { vx: 5 }))], 99999)).toBe(false);
  });
});
