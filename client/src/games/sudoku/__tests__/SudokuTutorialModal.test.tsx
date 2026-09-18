import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SudokuTutorialModal, {
  hasSeenSudokuTutorial,
  markSudokuTutorialSeen,
} from "../SudokuTutorialModal";

describe("SudokuTutorialModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("manages tutorial seen state in localStorage", () => {
    expect(hasSeenSudokuTutorial()).toBe(false);
    markSudokuTutorialSeen();
    expect(hasSeenSudokuTutorial()).toBe(true);
  });

  it("renders tutorial modal with step 1 and golden rules", () => {
    const handleClose = vi.fn();
    render(
      <SudokuTutorialModal
        isOpen={true}
        themeId="obsidian"
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/The 3 Golden Rules/i)).toBeTruthy();
    expect(screen.getByText(/Step 1 of 5/i)).toBeTruthy();
    expect(screen.getByText(/Interactive Test/i)).toBeTruthy();
  });

  it("handles interactive mini-box verification: error on wrong digit, success on 5", () => {
    const handleClose = vi.fn();
    render(
      <SudokuTutorialModal
        isOpen={true}
        themeId="paper"
        onClose={handleClose}
      />
    );

    // Click incorrect digit 3
    const wrongBtn = screen.getByRole("button", { name: "3" });
    fireEvent.click(wrongBtn);
    expect(screen.queryByText(/Correct!/i)).toBeNull();

    // Click correct digit 5
    const correctBtn = screen.getByRole("button", { name: "5" });
    fireEvent.click(correctBtn);
    expect(screen.getByText(/Correct!/i)).toBeTruthy();
    expect(screen.getByText(/Every 3x3 sector box must contain numbers 1 through 9/i)).toBeTruthy();
  });

  it("advances through slides using Next Step and closes on completion", () => {
    const handleClose = vi.fn();
    render(
      <SudokuTutorialModal
        isOpen={true}
        themeId="obsidian"
        onClose={handleClose}
      />
    );

    // Slide 1 -> 2
    fireEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    expect(screen.getByText(/Step 2 of 5/i)).toBeTruthy();
    expect(screen.getByText(/Crosshatch Scanning/i)).toBeTruthy();

    // Slide 2 -> 3
    fireEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    expect(screen.getByText(/Step 3 of 5/i)).toBeTruthy();
    expect(screen.getByText(/Pencil Notes & Pruning/i)).toBeTruthy();

    // Slide 3 -> 4
    fireEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    expect(screen.getByText(/Step 4 of 5/i)).toBeTruthy();
    expect(screen.getByText(/The Naked Single/i)).toBeTruthy();

    // Slide 4 -> 5
    fireEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    expect(screen.getByText(/Step 5 of 5/i)).toBeTruthy();
    expect(screen.getByText(/Tactical Controls & Themes/i)).toBeTruthy();

    // Slide 5 -> Complete
    fireEvent.click(screen.getByRole("button", { name: /Start Solving/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(hasSeenSudokuTutorial()).toBe(true);
  });
});
