import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SudokuKeypad from "../SudokuKeypad";

describe("SudokuKeypad UX & Ergonomics", () => {
  const defaultProps = {
    digitCounts: { 1: 9, 2: 4, 3: 0 },
    selectedDigit: null,
    notesMode: false,
    inputMode: "cell-first" as const,
    themeId: "paper" as const,
    canUndo: true,
    onSelectDigit: vi.fn(),
    onErase: vi.fn(),
    onToggleNotes: vi.fn(),
    onToggleInputMode: vi.fn(),
    onUndo: vi.fn(),
    onUseHint: vi.fn(),
    onAutoFillNotes: vi.fn(),
  };

  it("renders 1-9 keypad with correct remaining clue counts and completed checkmark", () => {
    render(<SudokuKeypad {...defaultProps} />);

    // Digit 1 is complete (9/9 placed) -> displays checkmark
    const digit1Btn = screen.getByRole("button", { name: /Digit 1, 0 remaining/i });
    expect(digit1Btn).toBeTruthy();
    expect(digit1Btn.textContent).toContain("✓");

    // Digit 2 has 4 placed -> 5 remaining
    const digit2Btn = screen.getByRole("button", { name: /Digit 2, 5 remaining/i });
    expect(digit2Btn).toBeTruthy();
    expect(digit2Btn.textContent).toContain("5");
  });

  it("applies light theme styling in Paper mode", () => {
    render(<SudokuKeypad {...defaultProps} themeId="paper" />);

    // Undo button should have light theme border and slate text
    const undoBtn = screen.getByRole("button", { name: /Undo move/i });
    expect(undoBtn.className).toContain("text-slate-700");
    expect(undoBtn.className).toContain("border-slate-300");
  });

  it("applies dark theme styling in Obsidian mode", () => {
    render(<SudokuKeypad {...defaultProps} themeId="obsidian" />);

    const undoBtn = screen.getByRole("button", { name: /Undo move/i });
    expect(undoBtn.className).toContain("text-stone-300");
  });

  it("toggles Notes mode and updates visual state to 'Notes ON'", () => {
    const handleToggleNotes = vi.fn();
    const { rerender } = render(
      <SudokuKeypad {...defaultProps} notesMode={false} onToggleNotes={handleToggleNotes} />
    );

    const notesBtn = screen.getByRole("button", { name: /Toggle notes pencil mode/i });
    expect(notesBtn.textContent).toContain("Notes");

    fireEvent.click(notesBtn);
    expect(handleToggleNotes).toHaveBeenCalledTimes(1);

    // Re-render with notesMode=true
    rerender(
      <SudokuKeypad {...defaultProps} notesMode={true} onToggleNotes={handleToggleNotes} />
    );
    expect(screen.getByRole("button", { name: /Toggle notes pencil mode/i }).textContent).toContain(
      "Notes ON"
    );
  });

  it("handles action buttons and input mode toggle", () => {
    const handleUndo = vi.fn();
    const handleErase = vi.fn();
    const handleHint = vi.fn();
    const handleAutoNotes = vi.fn();
    const handleToggleInputMode = vi.fn();

    render(
      <SudokuKeypad
        {...defaultProps}
        onUndo={handleUndo}
        onErase={handleErase}
        onUseHint={handleHint}
        onAutoFillNotes={handleAutoNotes}
        onToggleInputMode={handleToggleInputMode}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Undo move/i }));
    expect(handleUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Erase cell/i }));
    expect(handleErase).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Neural laser hint/i }));
    expect(handleHint).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Auto candidate notes/i }));
    expect(handleAutoNotes).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(/Input Mode:/i));
    expect(handleToggleInputMode).toHaveBeenCalledTimes(1);
  });
});
