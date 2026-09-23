import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  Connect4TutorialModal,
  hasSeenConnect4Tutorial,
  markConnect4TutorialSeen,
} from "../Connect4TutorialModal";
import { getConnect4Theme } from "../connect4Themes";

describe("Connect4TutorialModal", () => {
  const theme = getConnect4Theme("cyber_matrix");

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <Connect4TutorialModal
        isOpen={false}
        theme={theme}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText(/Gravity & The 7x6 Grid/i)).not.toBeInTheDocument();
  });

  it("renders initial slide (Step 1) when isOpen is true", () => {
    render(
      <Connect4TutorialModal
        isOpen={true}
        theme={theme}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Gravity & The 7x6 Grid/i)).toBeInTheDocument();
    expect(screen.getByText(/BASICS/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/7 Columns/i)).toBeInTheDocument();
    expect(screen.getByText(/6 Rows/i)).toBeInTheDocument();
    expect(screen.getByText(/4 in a Row/i)).toBeInTheDocument();
  });

  it("navigates through slides with Next and Previous buttons", () => {
    render(
      <Connect4TutorialModal
        isOpen={true}
        theme={theme}
        onClose={vi.fn()}
      />
    );

    // Initial state: Previous button is disabled on slide 0
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    expect(prevBtn).toBeDisabled();

    // Click Next -> Step 2
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("PRACTICE")).toBeInTheDocument();
    expect(screen.getByText("Interactive Practice Drop")).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();

    // Click Prev -> returns to Step 1
    fireEvent.click(prevBtn);
    expect(screen.getByText("BASICS")).toBeInTheDocument();
  });

  it("allows interactive practice drops on slide 2", () => {
    render(
      <Connect4TutorialModal
        isOpen={true}
        theme={theme}
        onClose={vi.fn()}
      />
    );

    // Navigate to slide 2
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Interactive Practice Drop/i)).toBeInTheDocument();

    // Drop in column 1
    const col1Btn = screen.getByRole("button", { name: /practice drop in column 1/i });
    fireEvent.click(col1Btn);

    // Active turn toggles to Yellow Disc
    expect(screen.getByText(/Yellow Disc/i)).toBeInTheDocument();

    // Reset practice board
    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/Red Disc/i)).toBeInTheDocument();
  });

  it("saves seen state and calls onClose on last slide completion", () => {
    const onClose = vi.fn();
    render(
      <Connect4TutorialModal
        isOpen={true}
        theme={theme}
        onClose={onClose}
      />
    );

    expect(hasSeenConnect4Tutorial()).toBe(false);

    // Advance to last slide (5)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    }

    expect(screen.getByText("PRO HUD")).toBeInTheDocument();

    // Click "Let's Play"
    const finishBtn = screen.getByRole("button", { name: /let's play/i });
    fireEvent.click(finishBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenConnect4Tutorial()).toBe(true);
  });

  it("saves seen state when clicking close button directly", () => {
    const onClose = vi.fn();
    render(
      <Connect4TutorialModal
        isOpen={true}
        theme={theme}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /close tutorial/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenConnect4Tutorial()).toBe(true);
  });
});
