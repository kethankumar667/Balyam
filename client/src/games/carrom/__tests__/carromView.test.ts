import { describe, it, expect } from "vitest";
import { BOARD_VIEW, pointerToBoard } from "../carrom-shared";
import { CARROM_BOARD } from "@shared/types";

/**
 * The board's viewBox is wider than the engine's 0..100 space so the wooden
 * frame can be drawn outside the playing surface. Aiming depends on the
 * pointer mapping tracking that viewBox exactly — if the two drift apart,
 * every shot is aimed somewhere the player did not click, which is the kind
 * of break that looks like "the physics is wrong".
 */

const rect = (left: number, top: number, size: number) => ({
  left,
  top,
  width: size,
  height: size,
});

describe("pointerToBoard", () => {
  it("maps the centre of the element to the centre of the board", () => {
    const r = rect(0, 0, 600);
    const p = pointerToBoard(r, 300, 300);
    expect(p.x).toBeCloseTo(CARROM_BOARD.size / 2, 6);
    expect(p.y).toBeCloseTo(CARROM_BOARD.size / 2, 6);
  });

  it("maps the element corners to the viewBox corners", () => {
    const r = rect(0, 0, 600);
    const tl = pointerToBoard(r, 0, 0);
    expect(tl.x).toBeCloseTo(BOARD_VIEW.min, 6);
    expect(tl.y).toBeCloseTo(BOARD_VIEW.min, 6);

    const br = pointerToBoard(r, 600, 600);
    expect(br.x).toBeCloseTo(BOARD_VIEW.min + BOARD_VIEW.span, 6);
    expect(br.y).toBeCloseTo(BOARD_VIEW.min + BOARD_VIEW.span, 6);
  });

  it("accounts for the element's offset on the page", () => {
    const p = pointerToBoard(rect(120, 40, 600), 420, 340);
    expect(p.x).toBeCloseTo(CARROM_BOARD.size / 2, 6);
    expect(p.y).toBeCloseTo(CARROM_BOARD.size / 2, 6);
  });

  it("places the playing-surface corner where the frame ends", () => {
    // The rebound area starts at `cushion`; everything outside it is frame.
    const r = rect(0, 0, BOARD_VIEW.span); // 1 unit per pixel
    const p = pointerToBoard(r, CARROM_BOARD.cushion - BOARD_VIEW.min, 0);
    expect(p.x).toBeCloseTo(CARROM_BOARD.cushion, 6);
  });

  it("keeps the frame region outside the engine's coordinate space", () => {
    const r = rect(0, 0, BOARD_VIEW.span);
    // A click 2px in from the left edge lands on the frame, not the board.
    expect(pointerToBoard(r, 2, 2).x).toBeLessThan(0);
    // ...and one just inside the surface edge is within the rebound area.
    const inside = pointerToBoard(r, -BOARD_VIEW.min + CARROM_BOARD.cushion + 1, 0);
    expect(inside.x).toBeGreaterThan(CARROM_BOARD.cushion);
    expect(inside.x).toBeLessThan(CARROM_BOARD.size - CARROM_BOARD.cushion);
  });

  it("is symmetric about the centre", () => {
    const r = rect(0, 0, 800);
    const a = pointerToBoard(r, 200, 400);
    const b = pointerToBoard(r, 600, 400);
    expect(a.x + b.x).toBeCloseTo(CARROM_BOARD.size, 6);
  });
});
