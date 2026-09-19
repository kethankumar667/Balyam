import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SudokuKeypad from "../SudokuKeypad";
import SudokuDifficultyModal from "../SudokuDifficultyModal";
import { SUDOKU_THEMES, isLightTheme, type SudokuThemeId } from "../sudokuThemes";

/**
 * The selected-state glow used to be a Tailwind arbitrary-value shadow class with
 * the theme's runtime colour interpolated into it. Tailwind only emits classes it
 * can read as literal text at build time, so that class never existed and the glow
 * never rendered — while the build logged invalid-CSS warnings. The colour is now
 * applied as an inline style, which is the only way a runtime value can work.
 * (Do not spell the old class out here: Tailwind scans this file too, and would
 * emit it into the production CSS again.)
 */
describe("Sudoku selected-state glow", () => {
  const darkThemeId = (Object.keys(SUDOKU_THEMES) as SudokuThemeId[]).find((id) => !isLightTheme(id))!;
  const glow = SUDOKU_THEMES[darkThemeId].accentGlow;

  const keypadProps = {
    digitCounts: {},
    selectedDigit: null,
    inputMode: "cell-first" as const,
    themeId: darkThemeId,
    canUndo: false,
    onSelectDigit: vi.fn(),
    onErase: vi.fn(),
    onToggleNotes: vi.fn(),
    onToggleInputMode: vi.fn(),
    onUndo: vi.fn(),
    onUseHint: vi.fn(),
    onAutoFillNotes: vi.fn(),
  };

  it("glows the notes button in a dark theme when notes mode is on", () => {
    render(<SudokuKeypad {...keypadProps} notesMode />);
    const notes = screen.getByRole("button", { name: /Toggle notes pencil mode/i });
    expect(notes.style.boxShadow).toContain(glow);
  });

  it("does not glow the notes button when notes mode is off", () => {
    render(<SudokuKeypad {...keypadProps} notesMode={false} />);
    const notes = screen.getByRole("button", { name: /Toggle notes pencil mode/i });
    expect(notes.style.boxShadow).toBe("");
  });

  it("no longer ships a class built from a runtime template", () => {
    const { container } = render(<SudokuKeypad {...keypadProps} notesMode />);
    // The runtime colour must only ever appear in a style, never spliced into a class.
    const classes = Array.from(container.querySelectorAll("[class]")).map((el) => el.getAttribute("class") ?? "");
    expect(classes.some((c) => c.includes(glow) || c.includes("accentGlow"))).toBe(false);
  });

  it("glows exactly the selected difficulty in a dark theme", () => {
    render(
      <SudokuDifficultyModal
        isOpen
        currentDifficulty="hard"
        progress={{ easy: 0, medium: 0, hard: 0, expert: 0 }}
        themeId={darkThemeId}
        onClose={vi.fn()}
        onSelectDifficulty={vi.fn()}
      />
    );
    const glowing = Array.from(document.body.querySelectorAll("button")).filter((b) =>
      b.style.boxShadow.includes(glow)
    );
    expect(glowing).toHaveLength(1);
    expect(glowing[0]!.textContent?.toLowerCase()).toContain("hard");
  });
});
