import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import TicTacToeBoardMobile from "../TicTacToeBoardMobile";
import { getTicTacToeTheme } from "../tictactoeThemes";
import { TicTacToeGrid } from "../TicTacToeGrid";
import type { Player, TicTacToePublicState } from "@shared/types.js";

// Mock socket
vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: vi.fn(),
  }),
}));

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", isHost: true, isReady: true, isConnected: true },
  { id: "p2", name: "Bob", isHost: false, isReady: true, isConnected: true },
];

const mockPlayingState: TicTacToePublicState = {
  kind: "tictactoe",
  phase: "playing",
  options: { mode: "quantum", turnTimerSeconds: 15 },
  playerOrder: ["p1", "p2"],
  playerMarks: { p1: "X", p2: "O" },
  turnPlayerId: "p1",
  grid: [
    { mark: "X", playerId: "p1", moveNumber: 1, isExpiring: true },
    { mark: "O", playerId: "p2", moveNumber: 2, isExpiring: false },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ],
  pieceQueues: { X: [0], O: [1] },
  winningLine: null,
  winnerId: null,
  moveCount: 2,
  turnDeadline: Date.now() + 15000,
  lastEvaporatedCell: null,
};

describe("TicTacToeGrid", () => {
  it("renders 9 grid cells with proper accessibility labels", () => {
    const theme = getTicTacToeTheme("neo_tokyo");
    const onCellClick = vi.fn();

    render(
      <TicTacToeGrid
        grid={mockPlayingState.grid}
        winningLine={null}
        lastEvaporatedCell={null}
        theme={theme}
        isMyTurn={true}
        disabled={false}
        onCellClick={onCellClick}
      />
    );

    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(9);

    // Cell 1 has X and is expiring
    expect(cells[0].getAttribute("aria-label")).toContain("occupied by X");
    expect(cells[0].getAttribute("aria-label")).toContain("expiring next move");

    // Cell 2 has O
    expect(cells[1].getAttribute("aria-label")).toContain("occupied by O");

    // Cell 3 is empty and clickable
    expect(cells[2].getAttribute("aria-label")).toContain("empty");
    fireEvent.click(cells[2]);
    expect(onCellClick).toHaveBeenCalledWith(2);
  });
});

describe("TicTacToeBoardMobile", () => {
  it("renders player names, room code, and turn indicator", () => {
    render(
      <TicTacToeBoardMobile
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="CYBER1"
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText("CYBER1")).toBeDefined();
    expect(screen.getByText(/Alice/)).toBeTruthy();
    expect(screen.getByText(/Bob/)).toBeTruthy();
    expect(screen.getByText(/YOUR TURN — DEPLOY MARK/)).toBeTruthy();
  });

  it("renders victory announcement when match is won", () => {
    const wonState: TicTacToePublicState = {
      ...mockPlayingState,
      phase: "finished",
      winningLine: [0, 1, 2],
      winnerId: "p1",
    };

    render(
      <TicTacToeBoardMobile
        state={wonState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="CYBER1"
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText(/VICTORY ACHIEVED!/)).toBeTruthy();
    expect(screen.getByText(/Request Instant Rematch/)).toBeTruthy();
  });

  it("renders Quantum FIFO warning 'Dissolves Next' when a player has 3 pieces on board", () => {
    const fullQueueState: TicTacToePublicState = {
      ...mockPlayingState,
      pieceQueues: {
        X: [0, 1, 2],
        O: [3, 4],
      },
    };

    render(
      <TicTacToeBoardMobile
        state={fullQueueState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="CYBER1"
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText("Dissolves Next")).toBeTruthy();
  });
});

describe("TicTacToeBoardDesktop", () => {
  it("renders desktop cockpit with match roster, chat, and keyboard shortcuts", async () => {
    const TicTacToeBoardDesktop = (await import("../TicTacToeBoardDesktop")).default;

    render(
      <TicTacToeBoardDesktop
        state={mockPlayingState}
        players={mockPlayers}
        selfId="p1"
        messages={[]}
        roomCode="CYBER1"
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText("Match Roster")).toBeTruthy();
    expect(screen.getByText("Keyboard Shortcuts")).toBeTruthy();
    expect(screen.getByText("Cyber Visual Matrix")).toBeTruthy();
  });
});

