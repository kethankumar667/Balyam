import { describe, expect, it } from "vitest";
import { legalTargetsFor } from "../chessMoves";

/**
 * Legal-move highlighting.
 *
 * The board component always had the rendering for this — a dot on an empty
 * target, a ring on a capture — and the in-game rules panel promised "click a
 * piece to highlight legal move target dots". Neither shell ever passed the
 * targets, so `legalTargets` sat at its `[]` default and nothing appeared.
 *
 * These tests cover the derivation, including the cases where highlighting
 * anything at all would be wrong.
 */

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("legalTargetsFor", () => {
  it("gives a knight both its opening squares", () => {
    // The exact case reported: click the horse, see where it can go.
    expect(legalTargetsFor(START, "b1").sort()).toEqual(["a3", "c3"]);
  });

  it("gives a pawn its single and double push", () => {
    expect(legalTargetsFor(START, "e2").sort()).toEqual(["e3", "e4"]);
  });

  it("returns nothing for a piece hemmed in at the start", () => {
    // The rook has no legal move from the opening position, so the board must
    // show no dots rather than implying it is stuck by accident.
    expect(legalTargetsFor(START, "a1")).toEqual([]);
  });

  it("returns nothing for an empty square", () => {
    expect(legalTargetsFor(START, "e5")).toEqual([]);
  });

  it("returns nothing for the side not on move", () => {
    // Black's knight on white's turn. Highlighting it would invite a click
    // that the server can only reject.
    expect(legalTargetsFor(START, "b8")).toEqual([]);
  });

  it("returns nothing when no square is selected", () => {
    expect(legalTargetsFor(START, null)).toEqual([]);
  });

  it("includes captures, which the board renders as a ring rather than a dot", () => {
    // Black knight on d5, white pawn on e3; white knight on c3 can take it.
    const fen = "rnbqkbnr/ppp1pppp/8/3n4/8/2N1P3/PPPP1PPP/R1BQKBNR w KQkq - 0 1";
    expect(legalTargetsFor(fen, "c3")).toContain("d5");
  });

  it("respects a pin instead of offering an illegal move", () => {
    // White knight on e2 is pinned to the king on e1 by the rook on e8, so it
    // has no legal moves at all. This is the case a naive "all knight jumps"
    // implementation gets wrong.
    const fen = "4r3/8/8/8/8/8/4N3/4K3 w - - 0 1";
    expect(legalTargetsFor(fen, "e2")).toEqual([]);
  });

  it("survives a malformed FEN rather than throwing", () => {
    // A board with no dots beats a board that will not render.
    expect(legalTargetsFor("not-a-fen", "b1")).toEqual([]);
    expect(legalTargetsFor("", "b1")).toEqual([]);
  });

  it("survives an off-board square", () => {
    expect(legalTargetsFor(START, "z9")).toEqual([]);
  });
});
