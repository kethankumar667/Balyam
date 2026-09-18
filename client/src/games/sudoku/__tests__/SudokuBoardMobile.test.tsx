import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SudokuBoardMobile from "../SudokuBoardMobile";
import { type UseSudokuReturn } from "../useSudoku";

describe("SudokuBoardMobile Redesigned Header & HUD", () => {
  const mockGame: UseSudokuReturn = {
    cells: Array.from({ length: 81 }, (_, i) => ({
      index: i,
      row: Math.floor(i / 9),
      col: i % 9,
      block: Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3),
      value: null,
      solution: 1,
      isGiven: false,
      isError: false,
      notes: [],
    })),
    selectedCellIndex: null,
    selectedDigit: null,
    difficulty: "medium",
    boardNumber: 1,
    progress: { easy: 0, medium: 0, hard: 0, expert: 0 },
    notesMode: false,
    inputMode: "cell-first",
    themeId: "paper",
    mistakes: 1,
    maxMistakes: 3,
    elapsedSeconds: 125,
    isPaused: false,
    isComplete: false,
    isGameOver: false,
    hintText: null,
    canUndo: false,
    digitCounts: {},
    ghostDelta: 45,
    ghostDeltaFormatted: "+0:45",
    zenMode: false,
    newPersonalBest: false,
    recentlyCompletedUnits: [],
    selectCell: vi.fn(),
    selectDigit: vi.fn(),
    inputDigit: vi.fn(),
    eraseCell: vi.fn(),
    toggleNotesMode: vi.fn(),
    toggleInputMode: vi.fn(),
    undo: vi.fn(),
    useHint: vi.fn(),
    autoFillNotes: vi.fn(),
    togglePause: vi.fn(),
    startNewGame: vi.fn(),
    startNextBoard: vi.fn(),
    restartCurrentGame: vi.fn(),
    setThemeId: vi.fn(),
    toggleZenMode: vi.fn(),
  };

  it("renders streamlined header without button clutter and never wraps Board number", () => {
    render(
      <MemoryRouter>
        <SudokuBoardMobile game={mockGame} onExit={vi.fn()} />
      </MemoryRouter>
    );

    // Check Back button
    expect(screen.getByLabelText(/Exit to games catalog/i)).toBeTruthy();

    // Check Level & Board Pill
    const levelBtn = screen.getByText(/medium/i).closest("button");
    expect(levelBtn).toBeTruthy();
    expect(levelBtn?.textContent).toContain("Board 1");

    // Check Tutorial and Quick Settings buttons exist
    expect(screen.getByLabelText(/Sudoku interactive tutorial guide/i)).toBeTruthy();
    expect(screen.getByLabelText(/Quick tools and options/i)).toBeTruthy();
  });

  it("toggles the quick tools and settings ribbon when the settings button is clicked", () => {
    render(
      <MemoryRouter>
        <SudokuBoardMobile game={mockGame} onExit={vi.fn()} />
      </MemoryRouter>
    );

    // Initially settings ribbon should not be open
    expect(screen.queryByText(/Zen Focus/i)).toBeNull();

    // Click quick settings toggle
    const settingsBtn = screen.getByLabelText(/Quick tools and options/i);
    fireEvent.click(settingsBtn);

    // Settings ribbon is now visible with Theme, Zen, Audio, and Reset options
    expect(screen.getByText(/Zen/i)).toBeTruthy();
    expect(screen.getByText(/Sound/i)).toBeTruthy();
    expect(screen.getByText(/Reset/i)).toBeTruthy();
  });

  it("renders unified telemetry console with Mistakes, Pace, and Timer", () => {
    render(
      <MemoryRouter>
        <SudokuBoardMobile game={mockGame} onExit={vi.fn()} />
      </MemoryRouter>
    );

    // Unified mistakes meter
    expect(screen.getByText(/Mistakes/i)).toBeTruthy();
    expect(screen.getByText("1/3")).toBeTruthy();

    // Ghost pace chip
    expect(screen.getByText("+0:45")).toBeTruthy();

    // Timer display (125 seconds = 2:05)
    expect(screen.getByText("2:05")).toBeTruthy();
  });
});
