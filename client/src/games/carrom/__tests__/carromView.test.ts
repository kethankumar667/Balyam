import { describe, it, expect } from "vitest";
import { BOARD_VIEW, pointerToBoard, toUiSliderPos, toServerSliderPos } from "../carrom-shared";
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

describe("pointerToBoard (Host perspective: isFlipped = false)", () => {
  it("maps the centre of the element to the centre of the board", () => {
    const r = rect(0, 0, 600);
    const p = pointerToBoard(r, 300, 300, false);
    expect(p.x).toBeCloseTo(CARROM_BOARD.size / 2, 6);
    expect(p.y).toBeCloseTo(CARROM_BOARD.size / 2, 6);
  });

  it("maps the element corners to the viewBox corners", () => {
    const r = rect(0, 0, 600);
    const tl = pointerToBoard(r, 0, 0, false);
    expect(tl.x).toBeCloseTo(BOARD_VIEW.min, 6);
    expect(tl.y).toBeCloseTo(BOARD_VIEW.min, 6);

    const br = pointerToBoard(r, 600, 600, false);
    expect(br.x).toBeCloseTo(BOARD_VIEW.min + BOARD_VIEW.span, 6);
    expect(br.y).toBeCloseTo(BOARD_VIEW.min + BOARD_VIEW.span, 6);
  });

  it("accounts for the element's offset on the page", () => {
    const p = pointerToBoard(rect(120, 40, 600), 420, 340, false);
    expect(p.x).toBeCloseTo(CARROM_BOARD.size / 2, 6);
    expect(p.y).toBeCloseTo(CARROM_BOARD.size / 2, 6);
  });

  it("places the playing-surface corner where the frame ends", () => {
    const r = rect(0, 0, BOARD_VIEW.span);
    const p = pointerToBoard(r, CARROM_BOARD.cushion - BOARD_VIEW.min, 0, false);
    expect(p.x).toBeCloseTo(CARROM_BOARD.cushion, 6);
  });

  it("keeps the frame region outside the engine's coordinate space", () => {
    const r = rect(0, 0, BOARD_VIEW.span);
    expect(pointerToBoard(r, 2, 2, false).x).toBeLessThan(0);
    const inside = pointerToBoard(r, -BOARD_VIEW.min + CARROM_BOARD.cushion + 1, 0, false);
    expect(inside.x).toBeGreaterThan(CARROM_BOARD.cushion);
    expect(inside.x).toBeLessThan(CARROM_BOARD.size - CARROM_BOARD.cushion);
  });

  it("is symmetric about the centre", () => {
    const r = rect(0, 0, 800);
    const a = pointerToBoard(r, 200, 400, false);
    const b = pointerToBoard(r, 600, 400, false);
    expect(a.x + b.x).toBeCloseTo(CARROM_BOARD.size, 6);
  });
});

describe("pointerToBoard (Opponent perspective: isFlipped = true)", () => {
  it("maps the centre of the element to the centre of the board", () => {
    const r = rect(0, 0, 600);
    const p = pointerToBoard(r, 300, 300, true);
    expect(p.x).toBeCloseTo(CARROM_BOARD.size / 2, 6);
    expect(p.y).toBeCloseTo(CARROM_BOARD.size / 2, 6);
  });

  it("maps top-left on screen to bottom-right in world coordinates", () => {
    const r = rect(0, 0, 600);
    const tl = pointerToBoard(r, 0, 0, true);
    expect(tl.x).toBeCloseTo(CARROM_BOARD.size - BOARD_VIEW.min, 6);
    expect(tl.y).toBeCloseTo(CARROM_BOARD.size - BOARD_VIEW.min, 6);
  });

  it("maps bottom baseline touch (screen bottom) to Player 1 world baseline (Y=18)", () => {
    const r = rect(0, 0, BOARD_VIEW.span); // 1 px = 1 unit
    // Screen bottom baseline for Player 1 is at visual Y = 82 (relative to board: 82 - min)
    const screenX = 50 - BOARD_VIEW.min;
    const screenY = 82 - BOARD_VIEW.min;
    const world = pointerToBoard(r, screenX, screenY, true);
    expect(world.x).toBeCloseTo(50, 6);
    expect(world.y).toBeCloseTo(18, 6); // Maps to Seat 1's authoritative baseline!
  });

  it("maps drag downward on screen to pull backward in Player 1 world coordinates", () => {
    const r = rect(0, 0, BOARD_VIEW.span);
    // Striker is at world (50, 18), which appears at visual (50, 82) on screen
    const dragScreenX = 50 - BOARD_VIEW.min;
    const dragScreenY = 90 - BOARD_VIEW.min; // dragged downward on screen
    const dragWorld = pointerToBoard(r, dragScreenX, dragScreenY, true);

    expect(dragWorld.x).toBeCloseTo(50, 6);
    expect(dragWorld.y).toBeCloseTo(10, 6);

    // Delta in world coordinates: striker (50, 18) - drag (50, 10) = (0, +8)
    const dy = 18 - dragWorld.y;
    expect(dy).toBeCloseTo(8, 6);
    const angle = Math.atan2(dy, 0);
    expect(angle).toBeCloseTo(Math.PI / 2, 6); // +90 deg -> launches downward into the board in world space
  });
});

describe("Slider position conversions (toUiSliderPos / toServerSliderPos)", () => {
  it("preserves slider value for host (isFlipped = false)", () => {
    expect(toUiSliderPos(0.0, false)).toBe(0.0);
    expect(toUiSliderPos(0.5, false)).toBe(0.5);
    expect(toUiSliderPos(1.0, false)).toBe(1.0);
    expect(toServerSliderPos(0.25, false)).toBe(0.25);
  });

  it("inverts slider value for opponent (isFlipped = true)", () => {
    expect(toUiSliderPos(0.0, true)).toBe(1.0);
    expect(toUiSliderPos(0.2, true)).toBeCloseTo(0.8, 6);
    expect(toUiSliderPos(0.5, true)).toBe(0.5);
    expect(toUiSliderPos(1.0, true)).toBe(0.0);

    expect(toServerSliderPos(0.8, true)).toBeCloseTo(0.2, 6);
    expect(toServerSliderPos(1.0, true)).toBe(0.0);
    expect(toServerSliderPos(0.0, true)).toBe(1.0);
  });

  it("satisfies round-trip identity for all positions and perspectives", () => {
    const testValues = [0, 0.1, 0.33, 0.5, 0.77, 0.99, 1.0];
    for (const val of testValues) {
      expect(toServerSliderPos(toUiSliderPos(val, false), false)).toBeCloseTo(val, 6);
      expect(toServerSliderPos(toUiSliderPos(val, true), true)).toBeCloseTo(val, 6);
    }
  });

  it("clamps out-of-range inputs safely", () => {
    expect(toUiSliderPos(-0.5, false)).toBe(0);
    expect(toUiSliderPos(1.5, false)).toBe(1);
    expect(toUiSliderPos(-0.5, true)).toBe(1);
    expect(toUiSliderPos(1.5, true)).toBe(0);
  });
});

describe("Perspective Seat Mapping", () => {
  const seats = [
    { playerId: "p_host", color: "white" as const, score: 0, remaining: 9 },
    { playerId: "p_guest", color: "black" as const, score: 0, remaining: 9 },
  ];

  it("resolves Host (Seat 0) to isFlipped = false", () => {
    const selfSeatIndex = seats.findIndex((s) => s.playerId === "p_host");
    const isFlipped = selfSeatIndex === 1;
    expect(isFlipped).toBe(false);
  });

  it("resolves Guest (Seat 1) to isFlipped = true", () => {
    const selfSeatIndex = seats.findIndex((s) => s.playerId === "p_guest");
    const isFlipped = selfSeatIndex === 1;
    expect(isFlipped).toBe(true);
  });

  it("resolves Spectator to isFlipped = false", () => {
    const selfSeatIndex = seats.findIndex((s) => s.playerId === "p_spectator");
    const isFlipped = selfSeatIndex === 1;
    expect(isFlipped).toBe(false);
  });
});
