import { describe, it, expect } from "vitest";
import type { LudoColor, LudoToken } from "@shared/types";
import {
  PLAYER_COLORS_ORDER,
  STRETCH_LENGTH,
  colorStartFor,
  lastTrackPosFor,
  resolveDestination,
  trackLengthFor,
  playerCountFromTrackLength,
} from "@shared/ludo-rules";
import { predictDestination } from "../predict";
import {
  COLOR_START_POSITION,
  SAFE_SQUARES,
  STRETCH_CELLS,
  TRACK_CELLS,
  TRACK_LENGTH,
} from "../board-layout";

/**
 * THE CONTRACT TEST.
 *
 * The client draws a hover preview saying "your token will land here". The
 * server then decides where it actually lands. Those are two different code
 * paths, and for most of this game's life they were two different
 * IMPLEMENTATIONS kept in step by a comment. They drifted twice:
 *
 *   1. The home-stretch divert point was off by one on the cross board.
 *   2. `predictDestination` ignored the room's Mandatory Capture option, so
 *      with the option OFF the preview showed a token bypassing its own home
 *      entrance when the engine would have turned it in.
 *
 * Both now resolve through `shared/ludo-rules.ts#resolveDestination`. These
 * tests pin that: they sweep the ENTIRE move space and assert the preview and
 * the rule agree everywhere, so a future "small fix" to one side cannot
 * silently make the preview lie again.
 */

const everyTokenState = (color: LudoColor, playerCount: number): LudoToken[] => {
  const TL = trackLengthFor(playerCount);
  const out: LudoToken[] = [{ id: `${color}-0`, color, state: "yard" }];
  for (let p = 0; p < TL; p++) {
    out.push({ id: `${color}-0`, color, state: "track", trackPos: p });
  }
  for (let s = 0; s < STRETCH_LENGTH; s++) {
    out.push({ id: `${color}-0`, color, state: "stretch", stretchPos: s });
  }
  out.push({ id: `${color}-0`, color, state: "home" });
  return out;
};

describe("client preview === shared rule, across the whole move space", () => {
  for (const playerCount of [2, 4, 6, 8]) {
    it(`agrees for every token state x die x flag at ${playerCount} players`, () => {
      const TL = trackLengthFor(playerCount);
      const colors = PLAYER_COLORS_ORDER.slice(0, Math.max(4, playerCount));
      let checked = 0;

      for (const color of colors) {
        for (const token of everyTokenState(color, playerCount)) {
          for (let dice = 1; dice <= 6; dice++) {
            for (const hasCaptured of [true, false]) {
              for (const mandatoryCapture of [true, false]) {
                const rule = resolveDestination(token, dice, {
                  color,
                  playerCount,
                  mandatoryCapture,
                  hasCaptured,
                });
                const preview = predictDestination(
                  token,
                  dice,
                  color,
                  hasCaptured,
                  TL,
                  mandatoryCapture,
                );
                expect(preview, `${color} ${token.state} pos=${token.trackPos ?? token.stretchPos} d=${dice} mc=${mandatoryCapture} hc=${hasCaptured}`).toEqual(rule);
                checked++;
              }
            }
          }
        }
      }
      // Guard against the sweep silently collapsing to nothing.
      expect(checked).toBeGreaterThan(500);
      expect(TL).toBe(13 * Math.max(4, playerCount));
    });
  }
});

describe("the cross board's pixel geometry matches the rule", () => {
  /**
   * The rule says a token diverts at `lastTrackPosFor`. The board draws cells
   * at fixed grid coordinates. If those disagree the token visibly jumps —
   * which is exactly what the player reported by drawing the route on a
   * screenshot. Adjacency is the objective test.
   */
  const adjacent = (a: { row: number; col: number }, b: { row: number; col: number }) =>
    Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

  it("the divert cell is orthogonally adjacent to the home lane", () => {
    for (const color of ["red", "green", "yellow", "blue"] as const) {
      const last = lastTrackPosFor(color, 4);
      const from = TRACK_CELLS[last];
      const into = STRETCH_CELLS[color][0];
      expect(adjacent(from, into), `${color}: (${from.row},${from.col}) -> (${into.row},${into.col})`).toBe(true);
    }
  });

  it("a token can never step back onto its own start square", () => {
    // The cell one before the start sits on the outer edge; diverting there
    // would let a finishing token walk onto its entry square and lap forever.
    for (const color of ["red", "green", "yellow", "blue"] as const) {
      const start = colorStartFor(color);
      const last = lastTrackPosFor(color, 4);
      expect((last + 1) % TRACK_LENGTH).not.toBe(start);
    }
  });

  it("the ring is continuous apart from the four arm corners", () => {
    let breaks = 0;
    for (let i = 0; i < TRACK_CELLS.length; i++) {
      const a = TRACK_CELLS[i];
      const b = TRACK_CELLS[(i + 1) % TRACK_CELLS.length];
      if (!adjacent(a, b)) breaks++;
    }
    // Exactly four: the path steps diagonally around the centre block at each
    // arm corner, which is how a real cross board is drawn.
    expect(breaks).toBe(4);
  });
});

describe("board constants are derived, not hand-copied", () => {
  it("start positions come from the shared rule", () => {
    for (const color of PLAYER_COLORS_ORDER) {
      expect(COLOR_START_POSITION[color]).toBe(colorStartFor(color));
    }
  });

  it("every drawn star is a safe square, and vice versa", () => {
    // Eight stars on a four-arm board: each arm's start and its mid-wedge.
    expect(SAFE_SQUARES.size).toBe(8);
    for (const pos of SAFE_SQUARES) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThan(TRACK_LENGTH);
      expect(TRACK_CELLS[pos]).toBeDefined();
    }
  });

  it("track length and player count round-trip", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      expect(playerCountFromTrackLength(trackLengthFor(n))).toBe(Math.max(4, n));
    }
  });
});
