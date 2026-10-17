import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { Player, VamanaPublicState } from "@shared/types.js";

const emit = vi.fn();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({ emit, on: vi.fn(), off: vi.fn() }),
}));

import VamanaBoardMobile from "../VamanaBoardMobile";
import VamanaBoardDesktop from "../VamanaBoardDesktop";
import { VamanaBoardGrid, arrowDelta } from "../VamanaBoardGrid";
import { VAMANA_TUTORIAL_KEY } from "../useVamanaBoard";

const PLAYERS: Player[] = [
  { id: "p1", name: "Alice", isHost: true, isReady: true, isConnected: true },
  { id: "p2", name: "Bob", isHost: false, isReady: true, isConnected: true },
];

function makeState(overrides: Partial<VamanaPublicState> = {}): VamanaPublicState {
  return {
    kind: "vamanaguntalu",
    phase: "playing",
    options: { turnTimerSeconds: 25, botDifficulty: "medium" },
    playerOrder: ["p1", "p2"],
    turnPlayerId: "p1",
    pits: Array(14).fill(5),
    captured: { p1: 0, p2: 0 },
    swept: { p1: 0, p2: 0 },
    winnerId: null,
    isDraw: false,
    endReason: null,
    moveCount: 0,
    lastMove: null,
    turnDeadline: Date.now() + 25_000,
    ...overrides,
  };
}

const baseProps = { players: PLAYERS, messages: [], roomCode: "ABC123", onLeave: vi.fn() };

beforeEach(() => {
  emit.mockClear();
  baseProps.onLeave.mockClear();
  try {
    localStorage.setItem(VAMANA_TUTORIAL_KEY, "1"); // keep the first-run lesson from covering the board
  } catch {
    /* storage unavailable: the lesson simply stays closed in this environment */
  }
});

describe("arrowDelta", () => {
  it("moves along the row with left/right on the wide board and up/down on the upright one", () => {
    expect(arrowDelta("ArrowRight", "horizontal")).toBe(1);
    expect(arrowDelta("ArrowLeft", "horizontal")).toBe(-1);
    expect(arrowDelta("ArrowUp", "horizontal")).toBe(0);
    expect(arrowDelta("ArrowUp", "vertical")).toBe(1);
    expect(arrowDelta("ArrowDown", "vertical")).toBe(-1);
    expect(arrowDelta("ArrowLeft", "vertical")).toBe(0);
    expect(arrowDelta("a", "horizontal")).toBe(0);
    expect(arrowDelta("Tab", "vertical")).toBe(0);
  });
});

describe("VamanaBoardGrid", () => {
  const grid = (overrides: Partial<Parameters<typeof VamanaBoardGrid>[0]> = {}) => {
    const onSelect = vi.fn();
    render(
      <VamanaBoardGrid
        orientation="horizontal"
        seat={0}
        pits={Array(14).fill(5)}
        isPlayer
        canSow={() => true}
        onSelect={onSelect}
        activePit={null}
        capturedPit={null}
        lastCapturePit={null}
        {...overrides}
      />,
    );
    return onSelect;
  };

  it("makes only the viewer's own seven pits into buttons; the opponent's seven are plain images", () => {
    grid();
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.getAllByRole("img").filter((el) => /^Opponent's pit/.test(el.getAttribute("aria-label") ?? ""))).toHaveLength(7);
  });

  it("names every pit with its owner, number and seed count", () => {
    grid({ pits: [1, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5] });
    expect(screen.getByRole("button", { name: "Your pit 1, 1 seed" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Opponent's pit 1, 0 seeds" })).toBeInTheDocument();
  });

  it("sows the pit that is tapped", () => {
    const onSelect = grid();
    fireEvent.click(screen.getByRole("button", { name: "Your pit 3, 5 seeds" }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("does nothing for a pit that cannot be sown, and says so to assistive tech", () => {
    const onSelect = grid({ canSow: (pit) => pit !== 0 });
    const blocked = screen.getByRole("button", { name: "Your pit 1, 5 seeds" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(blocked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("gives a spectator no controls at all", () => {
    grid({ isPlayer: false });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("draws the second seat's own row as the controls", () => {
    const onSelect = grid({ seat: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Your pit 1, 5 seeds" }));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("moves focus between your pits with the arrow keys and leaves Tab alone", () => {
    grid();
    const first = screen.getByRole("button", { name: "Your pit 1, 5 seeds" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Your pit 2, 5 seeds" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
    const notPrevented = fireEvent.keyDown(first, { key: "Tab" });
    expect(notPrevented).toBe(true);
  });

  it("does not run off either end of the row", () => {
    grid();
    const first = screen.getByRole("button", { name: "Your pit 1, 5 seeds" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
  });

  it("uses up/down for the upright board", () => {
    grid({ orientation: "vertical" });
    const first = screen.getByRole("button", { name: "Your pit 1, 5 seeds" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Your pit 2, 5 seeds" })).toHaveFocus();
  });
});

describe.each([
  ["mobile", VamanaBoardMobile],
  ["desktop", VamanaBoardDesktop],
] as const)("Vamana board — %s layout", (_name, Board) => {
  const renderBoard = (state: VamanaPublicState, selfId = "p1") =>
    render(<Board state={state} selfId={selfId} {...baseProps} />);

  it("shows both players, the board and whose turn it is", () => {
    renderBoard(makeState());
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: "Vamana Guntalu board" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Your pit/ })).toHaveLength(7);
  });

  it("sends a sow for the tapped pit when it is your turn", () => {
    renderBoard(makeState());
    fireEvent.click(screen.getByRole("button", { name: "Your pit 4, 5 seeds" }));
    expect(emit).toHaveBeenCalledWith("game:move", { type: "sow", data: { pit: 3 }, playerId: "p1" });
  });

  it("sends nothing on a double tap", () => {
    renderBoard(makeState());
    const pit = screen.getByRole("button", { name: "Your pit 2, 5 seeds" });
    fireEvent.click(pit);
    fireEvent.click(pit);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when it is the other player's turn", () => {
    renderBoard(makeState({ turnPlayerId: "p2" }));
    fireEvent.click(screen.getByRole("button", { name: "Your pit 2, 5 seeds" }));
    expect(emit).not.toHaveBeenCalled();
  });

  it("draws the board from the second seat's side", () => {
    renderBoard(makeState({ turnPlayerId: "p2" }), "p2");
    expect(screen.getByRole("button", { name: "Your pit 1, 5 seeds" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Your pit 1, 5 seeds" }));
    expect(emit).toHaveBeenCalledWith("game:move", { type: "sow", data: { pit: 7 }, playerId: "p2" });
  });

  it("gives a spectator the board with no controls", () => {
    renderBoard(makeState(), "watcher");
    expect(screen.getByRole("group", { name: "Vamana Guntalu board" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^Your pit/ })).toHaveLength(0);
  });

  it("announces the turn through a single polite live region", () => {
    renderBoard(makeState());
    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute("aria-live", "polite");
    expect(regions[0]).toHaveTextContent(/your turn/i);
  });

  it("words a win, with the seed count, and offers a way out", () => {
    const finished = makeState({
      phase: "finished",
      pits: Array(14).fill(0),
      captured: { p1: 41, p2: 29 },
      swept: { p1: 4, p2: 0 },
      winnerId: "p1",
      endReason: "seeds",
      turnDeadline: null,
    });
    renderBoard(finished);
    expect(screen.getByText("VICTORY — 41 TO 29")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^(Leave|Exit)/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /^Your pit/ })).toHaveLength(0);
  });

  it("never calls a draw a win", () => {
    const drawn = makeState({
      phase: "finished",
      pits: Array(14).fill(0),
      captured: { p1: 35, p2: 35 },
      winnerId: null,
      isDraw: true,
      endReason: "draw",
      turnDeadline: null,
    });
    renderBoard(drawn);
    expect(screen.getByText("DRAW — 35 SEEDS EACH")).toBeInTheDocument();
    expect(screen.queryByText(/VICTORY/)).not.toBeInTheDocument();
  });

  it("leaves when the leave control is used", () => {
    renderBoard(makeState());
    fireEvent.click(screen.getAllByRole("button", { name: "Leave match" })[0]);
    expect(baseProps.onLeave).toHaveBeenCalledTimes(1);
  });

  it("opens the lesson from the how-to-play control", () => {
    renderBoard(makeState());
    fireEvent.click(screen.getAllByRole("button", { name: "How to play" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("offers Give Up during a match, and it leaves through the same door as the back button", () => {
    renderBoard(makeState());
    fireEvent.click(screen.getByRole("button", { name: "Give up and leave the match" }));
    expect(baseProps.onLeave).toHaveBeenCalledTimes(1);
  });

  it("offers Leave, not Give Up, once the match is over", () => {
    const finished = makeState({ phase: "finished", pits: Array(14).fill(0), captured: { p1: 41, p2: 29 }, winnerId: "p1", endReason: "seeds", turnDeadline: null });
    renderBoard(finished);
    expect(screen.queryByRole("button", { name: "Give up and leave the match" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave the table" }));
    expect(baseProps.onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not offer Give Up to someone only watching", () => {
    renderBoard(makeState(), "watcher");
    expect(screen.queryByRole("button", { name: "Give up and leave the match" })).not.toBeInTheDocument();
  });

  it("tells you where to act on your turn and who it is waiting for otherwise", () => {
    const mine = renderBoard(makeState());
    expect(screen.getByText(/^Your turn — (tap|click) a pit on your row/)).toBeInTheDocument();
    mine.unmount();
    renderBoard(makeState({ turnPlayerId: "p2" }));
    expect(screen.getByText("Waiting for Bob")).toBeInTheDocument();
  });

  it("shows the turn clock on the turn bar and none once the match is over", () => {
    const live = renderBoard(makeState({ turnDeadline: Date.now() + 25_000 }));
    expect(screen.getByTestId("vamana-turn-clock")).toHaveTextContent(/^\d+s$/);
    live.unmount();
    renderBoard(makeState({ phase: "finished", pits: Array(14).fill(0), captured: { p1: 41, p2: 29 }, winnerId: "p1", endReason: "seeds", turnDeadline: null }));
    expect(screen.queryByTestId("vamana-turn-clock")).not.toBeInTheDocument();
  });

  it("puts a crown on whoever has captured more, and on nobody when it is level", () => {
    const ahead = renderBoard(makeState({ captured: { p1: 9, p2: 4 } }));
    expect(document.querySelectorAll("svg.lucide-crown")).toHaveLength(1);
    ahead.unmount();
    renderBoard(makeState({ captured: { p1: 6, p2: 6 } }));
    expect(document.querySelectorAll("svg.lucide-crown")).toHaveLength(0);
  });

  it("describes the last turn in words", () => {
    const state = makeState({
      turnPlayerId: "p2",
      moveCount: 1,
      lastMove: { playerId: "p1", lifts: [{ pit: 0, seeds: 5 }], capture: { pit: 5, seeds: 7 }, truncated: false },
    });
    renderBoard(state, "p2");
    expect(within(screen.getByRole("status")).getByText(/Alice sowed 5 seeds from pit 1 and captured 7 seeds\./)).toBeInTheDocument();
  });
});
