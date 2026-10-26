import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BingoPublicState } from "@shared/types";
import BingoBoardInspection from "../BingoBoardInspection";

afterEach(cleanup);

const state: BingoPublicState = {
  kind: "bingo", phase: "finished", currentTurnPlayerId: null,
  players: ["Me", "Opponent"].map(name => ({
    id: name, name, isReady: true, markedCount: 1, completedLinesCount: 0,
    completedLetters: [], hasWon: false, isBot: false, isConnected: true,
    autoMark: false, hasMarkedCurrent: true,
    board: Array.from({ length: 25 }, (_, index) => ({ index, value: index + 1, marked: index === 0 })),
  })),
  calledNumbers: [], lastCalledNumber: null, callDeadline: null, markDeadline: null,
  winners: [], roundNumber: 1, stopOnFirstWin: true, isOver: true,
  endReason: null, winnerId: "Me",
};

describe("finished table inspection", () => {
  it("opens and closes every player's final grid with marks preserved", () => {
    render(<BingoBoardInspection state={state} selfId="Me" players={[]} />);
    const toggle = screen.getByRole("button", { name: "View all tables" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByText("Me (You)")).toBeInTheDocument();
    expect(screen.getByText("Opponent")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "1, marked" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Hide tables" }));
    expect(screen.queryByText("Opponent")).not.toBeInTheDocument();
  });

  it.each(["arranging", "playing"] as const)("offers no inspection during %s", phase => {
    render(<BingoBoardInspection state={{ ...state, phase, isOver: false }} selfId="Me" players={[]} />);
    expect(screen.queryByRole("region", { name: "Finished Bingo boards" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View all tables" })).not.toBeInTheDocument();
  });
});
