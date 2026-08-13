import { describe, expect, it } from "vitest";
import { BLOCK_GRID, BLOCK_TRAY_SIZE } from "@shared/types.js";
import { PIECES, drawTray, isLarge, mulberry32 } from "../pieces.js";

describe("the piece table", () => {
  it("has no piece too big for the board", () => {
    for (const p of PIECES) {
      expect(p.w, `${p.id} is ${p.w} wide`).toBeLessThanOrEqual(BLOCK_GRID);
      expect(p.h, `${p.id} is ${p.h} tall`).toBeLessThanOrEqual(BLOCK_GRID);
    }
  });

  it("gives every piece a unique id", () => {
    // Two pieces sharing an id would make `PIECE_BY_ID` silently drop one and
    // the draw table's weights would stop meaning what they say.
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(PIECES.length);
  });

  it("keeps every cell inside the piece's own bounding box", () => {
    for (const p of PIECES) {
      for (const cell of p.cells) {
        expect(cell.r, p.id).toBeLessThan(p.h);
        expect(cell.c, p.id).toBeLessThan(p.w);
        expect(cell.r, p.id).toBeGreaterThanOrEqual(0);
        expect(cell.c, p.id).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("has a tight bounding box on every piece", () => {
    // A piece whose box is bigger than its cells would refuse placements that
    // are visibly legal — the "why won't it go there" bug.
    for (const p of PIECES) {
      expect(Math.max(...p.cells.map((c) => c.r)), p.id).toBe(p.h - 1);
      expect(Math.max(...p.cells.map((c) => c.c)), p.id).toBe(p.w - 1);
      expect(Math.min(...p.cells.map((c) => c.r)), p.id).toBe(0);
      expect(Math.min(...p.cells.map((c) => c.c)), p.id).toBe(0);
    }
  });

  it("uses only palette indices the client renders", () => {
    for (const p of PIECES) {
      expect(p.color, p.id).toBeGreaterThanOrEqual(1);
      expect(p.color, p.id).toBeLessThanOrEqual(8);
    }
  });

  it("weights small pieces heavily enough to keep boards recoverable", () => {
    const total = PIECES.reduce((s, p) => s + p.weight, 0);
    const small = PIECES.filter((p) => p.cells.length <= 3).reduce((s, p) => s + p.weight, 0);
    // Not a law of nature — a tuning floor. If a change ever drops flexible
    // pieces below a third of the bag, boards die early and the game gets
    // shorter rather than harder, which is what this guards.
    expect(small / total).toBeGreaterThan(0.33);
  });
});

describe("mulberry32", () => {
  it("returns the same stream for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays inside [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("drawTray", () => {
  it("is a pure function of seed and draw index", () => {
    /**
     * This is the load-bearing property of Race.
     *
     * A shared mutable generator would hand pieces out in the order players
     * happened to ask for them, so a fast player and a slow player would
     * diverge — and "everyone gets the same pieces" would be a lie in exactly
     * the matches where it is the reason people are playing.
     */
    for (const drawIndex of [0, 1, 2, 17, 400]) {
      const a = drawTray(99, drawIndex, BLOCK_TRAY_SIZE).map((p) => p.id);
      const b = drawTray(99, drawIndex, BLOCK_TRAY_SIZE).map((p) => p.id);
      expect(b).toEqual(a);
    }
  });

  it("gives different seeds different sequences", () => {
    const a = drawTray(1, 0, BLOCK_TRAY_SIZE).map((p) => p.id).join();
    const b = drawTray(2, 0, BLOCK_TRAY_SIZE).map((p) => p.id).join();
    const c = drawTray(3, 0, BLOCK_TRAY_SIZE).map((p) => p.id).join();
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it("never offers more than one five-cell piece at a time", () => {
    // Three monsters at once is not a hard tray, it is a dead one: the
    // player has no decision left to make.
    for (let seed = 0; seed < 300; seed++) {
      for (let draw = 0; draw < 4; draw++) {
        const tray = drawTray(seed, draw, BLOCK_TRAY_SIZE);
        expect(tray.filter(isLarge).length, `seed ${seed} draw ${draw}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never offers three of the same piece", () => {
    for (let seed = 0; seed < 300; seed++) {
      const ids = drawTray(seed, 0, BLOCK_TRAY_SIZE).map((p) => p.id);
      const counts = new Map<string, number>();
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      expect(Math.max(...counts.values()), `seed ${seed}`).toBeLessThanOrEqual(2);
    }
  });

  it("always returns a full tray", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(drawTray(seed, 0, BLOCK_TRAY_SIZE)).toHaveLength(BLOCK_TRAY_SIZE);
    }
  });

  it("reaches most of the table across many draws", () => {
    // A weighting mistake that starved half the pieces would still pass every
    // test above. This one notices.
    const seen = new Set<string>();
    for (let draw = 0; draw < 400; draw++) {
      for (const p of drawTray(4242, draw, BLOCK_TRAY_SIZE)) seen.add(p.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(PIECES.length - 1);
  });
});
