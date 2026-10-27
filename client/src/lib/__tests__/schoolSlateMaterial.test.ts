import { describe, expect, it } from "vitest";
import { SLATE } from "../schoolSlateMaterial";
import { BINGO_SKIN_SLATE } from "../../games/bingo/bingoSkin";
import { SUDOKU_THEMES } from "../../games/sudoku/sudokuThemes";
import { SLATE_SKIN } from "../../games/brainvita/brainvitaSkins";

/** WCAG 2.1 contrast between two #rrggbb colours. */
function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The greens a chalk ink can land on, from the deepest well to the lit board. */
const BOARD_GREENS = [SLATE.feltDeep, SLATE.felt, SLATE.feltLit, SLATE.panel, SLATE.panelLit, SLATE.room] as const;

describe("School Slate palette", () => {
  it.each(BOARD_GREENS)("keeps chalk-white ink at 4.5:1 or better on %s", (green) => {
    expect(contrast(SLATE.ink, green)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(SLATE.inkMid, green)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BOARD_GREENS)("keeps the quiet ink at 4.5:1 or better on %s", (green) => {
    expect(contrast(SLATE.inkLow, green)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BOARD_GREENS)("keeps chalk-yellow at 4.5:1 or better on %s", (green) => {
    expect(contrast(SLATE.chalkYellow, green)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps dark ink readable on a struck-off chalk-yellow cell", () => {
    expect(contrast(SLATE.inkOnChalk, SLATE.chalkYellow)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("School Slate across the games", () => {
  it("is a dark skin in Bingo, so the pieces that key off isDark keep their meaning", () => {
    expect(BINGO_SKIN_SLATE.isDark).toBe(true);
    expect(BINGO_SKIN_SLATE.pageStyle?.background).toContain("school-slate.svg");
  });

  it("is a theme of its own in Sudoku, with the doodles under the page and the board", () => {
    const slate = SUDOKU_THEMES.slate;
    expect(slate.name).toBe("School Slate");
    expect(slate.bgStyle?.background).toContain("school-slate.svg");
    expect(slate.boardStyle?.background).toContain("school-slate.svg");
  });

  it("draws Goli Jump's marbles as chalk on a slate palette, and is not a rung of the earned ladder", () => {
    expect(SLATE_SKIN.id).toBe("slate");
    expect(SLATE_SKIN.surface).toBe("slate");
    expect(SLATE_SKIN.board).not.toBeNull();
    expect(SLATE_SKIN.particleKind).toBe("dust");
  });
});
