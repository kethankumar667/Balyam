import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import Connect4BoardMobile from "../Connect4BoardMobile";
import Connect4BoardDesktop from "../Connect4BoardDesktop";
import { getConnect4Theme } from "../connect4Themes";
import { Connect4Grid } from "../Connect4Grid";
import { markConnect4TutorialSeen } from "../Connect4TutorialModal";
import type { Player, Connect4PublicState } from "@shared/types.js";

// Mock socket with on and off
vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", isHost: true, isReady: true, isConnected: true },
  { id: "p2", name: "Bob", isHost: false, isReady: true, isConnected: true },
];

const emptyGrid = Array.from({ length: 6 }, () => Array(7).fill(null));

const mockPlayingState: Connect4PublicState = {
  kind: "connect4",
  phase: "playing",
  options: { turnTimerSeconds: 20, botDifficulty: "medium" },
  playerOrder: ["p1", "p2"],
  playerDiscs: { p1: "R", p2: "Y" },
  turnPlayerId: "p1",
  grid: emptyGrid,
  winningCells: null,
  winnerId: null,
  isDraw: false,
  endReason: null,
  moveCount: 0,
  discsPlaced: { p1: 0, p2: 0 },
  turnDeadline: Date.now() + 20000,
  lastMove: null,
};

describe("Connect4Grid", () => {
  it("renders 42 grid cells inside a semantic role=grid with 6 rows", () => {
    const theme = getConnect4Theme("royal_parlour");
    const onDrop = vi.fn();

    render(
      <Connect4Grid
        grid={mockPlayingState.grid}
        winningCells={null}
        lastMove={null}
        theme={theme}
        isMyTurn={true}
        disabled={false}
        onDrop={onDrop}
      />
    );

    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute("aria-label", "Connect 4 board, 7 columns by 6 rows");

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(6);

    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(42);
  });

  it("calls onDrop when clicking a column drop button", () => {
    const theme = getConnect4Theme("royal_parlour");
    const onDrop = vi.fn();

    render(
      <Connect4Grid
        grid={mockPlayingState.grid}
        winningCells={null}
        lastMove={null}
        theme={theme}
        isMyTurn={true}
        disabled={false}
        onDrop={onDrop}
      />
    );

    const col4Btn = screen.getByRole("button", { name: /column 4/i });
    fireEvent.click(col4Btn);
    expect(onDrop).toHaveBeenCalledWith(3);
  });

  it("supports keyboard navigation with numbers 1-7 and Arrow keys", () => {
    const theme = getConnect4Theme("cyber_arcade");
    const onDrop = vi.fn();
    const onHoverCol = vi.fn();

    render(
      <Connect4Grid
        grid={mockPlayingState.grid}
        winningCells={null}
        lastMove={null}
        theme={theme}
        isMyTurn={true}
        disabled={false}
        onDrop={onDrop}
        hoveredCol={2}
        onHoverCol={onHoverCol}
      />
    );

    // Press '5' key to drop into column 5 (index 4)
    fireEvent.keyDown(window, { key: "5" });
    expect(onDrop).toHaveBeenCalledWith(4);

    // Press ArrowRight
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onHoverCol).toHaveBeenCalledWith(3);

    // Press ArrowLeft
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onHoverCol).toHaveBeenCalledWith(1);
  });
});

describe("Connect4BoardMobile", () => {
  beforeEach(() => {
    markConnect4TutorialSeen();
  });

  it("renders player indicators, live token racks, and board without crashing", () => {
    render(
      <Connect4BoardMobile
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByText(/21/i).length).toBeGreaterThan(0);
  });

  it("displays victory headline when finished with winner", () => {
    const wonGrid = Array.from({ length: 6 }, () => Array(7).fill(null));
    wonGrid[5][0] = "R";
    wonGrid[5][1] = "R";
    wonGrid[5][2] = "R";
    wonGrid[5][3] = "R";

    const wonState: Connect4PublicState = {
      ...mockPlayingState,
      phase: "finished",
      winnerId: "p1",
      grid: wonGrid,
      winningCells: [
        { row: 5, col: 0 },
        { row: 5, col: 1 },
        { row: 5, col: 2 },
        { row: 5, col: 3 },
      ],
      endReason: "connect4",
    };

    render(
      <Connect4BoardMobile
        state={wonState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/VICTORY — CONNECT FOUR/i)).toBeInTheDocument();
  });

  it("opens theme switcher modal when tapping palette button", () => {
    render(
      <Connect4BoardMobile
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    const themeBtn = screen.getByRole("button", { name: /tap to change theme/i });
    fireEvent.click(themeBtn);

    expect(screen.getByText(/Architectural Editions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Nordic Teak & Ceramic/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Titanium Cyber Monolith/i)).toBeInTheDocument();
    expect(screen.getByText(/Obsidian & 24K Gold/i)).toBeInTheDocument();
  });
});

describe("Connect4BoardDesktop", () => {
  beforeEach(() => {
    markConnect4TutorialSeen();
  });

  it("renders desktop layout with side intelligence panel and live token racks", () => {
    render(
      <Connect4BoardDesktop
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    expect(screen.getByText(/Match Specs/i)).toBeInTheDocument();
    expect(screen.getByText(/7 × 6 Monolith/i)).toBeInTheDocument();
  });

  it("opens theme switcher modal on desktop and changes theme", () => {
    render(
      <Connect4BoardDesktop
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    const themeBtn = screen.getByRole("button", { name: /click to change theme/i });
    fireEvent.click(themeBtn);

    expect(screen.getByText(/Architectural Editions/i)).toBeInTheDocument();

    // Select Titanium Cyber Monolith
    const cyberOption = screen.getByText(/Titanium Cyber Monolith/i);
    fireEvent.click(cyberOption);

    // Modal closes and theme updates
    expect(screen.queryByText(/Architectural Editions/i)).not.toBeInTheDocument();
  });

  it("opens tutorial modal when clicking How to Play button in header", () => {
    render(
      <Connect4BoardDesktop
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="TEST44"
        onLeave={() => {}}
      />
    );

    const howToPlayBtn = screen.getByRole("button", { name: /how to play/i });
    fireEvent.click(howToPlayBtn);

    expect(screen.getByText(/Gravity & The 7x6 Grid/i)).toBeInTheDocument();
  });
});
