import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CoinColor, Player, SnlState } from "@shared/types";

// The avatar, profile and reaction widgets pull in stores and routing that have
// nothing to do with the board; stub them so these tests stay about the board.
vi.mock("../../../components/profile/SeatAvatar", () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock("../../../components/room/SeatProfileButton", () => ({ default: () => null }));
vi.mock("../../../components/reactions/SeatTargetReactionWheel", () => ({ default: () => null }));
vi.mock("../../ludo/Dice", () => ({ Dice: ({ value }: { value: number | null }) => <span data-testid="dice">{value}</span> }));

const { BOARD_SIZE, CELL, START_ZONE_Y, cellInfo, squareCenter, tokenFanOffset } = await import("../snl-geometry");
const { DiceTray, EventFeed, SnlBoardSvg, SnlPlayerRail, toastForEvent } = await import("../snl-board-shared");

const players = [
  { id: "a", name: "Asha" },
  { id: "b", name: "Bharat" },
] as unknown as Player[];

const coinColorOf: Record<string, CoinColor> = { a: "red", b: "blue" };
const initialOf = { a: "A", b: "B" };

function makeState(overrides: Partial<SnlState> = {}): SnlState {
  const stats = { rolls: 2, laddersClimbed: 1, snakesBitten: 0, bounces: 0, highestSquare: 14 };
  return {
    kind: "snl",
    phase: "playing",
    config: { size: 100, ladders: { 4: 14, 9: 31 }, snakes: { 17: 7, 62: 19 }, difficulty: "medium" },
    playerOrder: ["a", "b"],
    turnPlayerId: "a",
    turnPhase: "rolling",
    positions: { a: 14, b: 0 },
    diceValue: 3,
    winnerId: null,
    finishedOrder: [],
    stats: { a: stats, b: { ...stats, laddersClimbed: 0, highestSquare: 0 } },
    recentEvents: [{ kind: "ladder", playerId: "a", ts: 1, from: 4, to: 14 }],
    startedAt: 0,
    ...overrides,
  };
}

afterEach(cleanup);

describe("snl geometry", () => {
  it("numbers the grid boustrophedon, square 1 bottom-left", () => {
    expect(cellInfo(1)).toMatchObject({ x: CELL / 2, y: BOARD_SIZE - CELL / 2 });
    expect(cellInfo(10)).toMatchObject({ x: BOARD_SIZE - CELL / 2, y: BOARD_SIZE - CELL / 2 });
    // The second row runs right-to-left, so 11 sits above 10, not above 1.
    expect(cellInfo(11)).toMatchObject({ x: BOARD_SIZE - CELL / 2, y: BOARD_SIZE - CELL * 1.5 });
    expect(cellInfo(100)).toMatchObject({ x: CELL / 2, y: CELL / 2 });
  });

  it("never gives two tiles that touch on the board the same chequer tone", () => {
    const byPlace = new Map<string, number>();
    for (let n = 1; n <= 100; n++) {
      const c = cellInfo(n);
      byPlace.set(`${c.col},${c.row}`, c.tone);
    }
    expect(byPlace.size).toBe(100);
    for (let n = 1; n <= 100; n++) {
      const c = cellInfo(n);
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const neighbour = byPlace.get(`${c.col + dc},${c.row + dr}`);
        if (neighbour !== undefined) expect(neighbour).not.toBe(c.tone);
      }
    }
  });

  it("puts a lone START token in the middle and spreads several across the tray", () => {
    expect(squareCenter(0, 0, 1)).toEqual({ x: 50, y: START_ZONE_Y });
    const first = squareCenter(0, 0, 4);
    const last = squareCenter(0, 3, 4);
    expect(first.x).toBeLessThan(last.x);
    expect(first.y).toBe(START_ZONE_Y);
  });

  it("shrinks tokens as more of them share a square", () => {
    expect(tokenFanOffset(0, 1)).toEqual({ dx: 0, dy: 0, r: 2.6 });
    expect(tokenFanOffset(0, 8).r).toBeLessThan(tokenFanOffset(0, 2).r);
  });
});

describe("SnlBoardSvg", () => {
  it("describes where every player is for screen readers", () => {
    render(
      <SnlBoardSvg
        state={makeState()}
        players={players}
        coinColorOf={coinColorOf}
        initialOf={initialOf}
        squareGroups={new Map([[14, ["a"]], [0, ["b"]]])}
        startCount={1}
        toast={null}
      />,
    );
    const board = screen.getByRole("img", { name: /snakes and ladders board/i });
    expect(board.getAttribute("aria-label")).toContain("Asha on square 14");
    expect(board.getAttribute("aria-label")).toContain("Bharat at start");
  });

  it("prints all 100 squares and the waiting count", () => {
    const { container } = render(
      <SnlBoardSvg
        state={makeState()}
        players={players}
        coinColorOf={coinColorOf}
        initialOf={initialOf}
        squareGroups={new Map([[14, ["a"]], [0, ["b"]]])}
        startCount={1}
        toast={null}
      />,
    );
    const labels = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    for (const n of [1, 37, 64, 100]) expect(labels).toContain(String(n));
    expect(labels).toContain("1 waiting");
  });

  it("shows the event toast with a glyph that is not colour-only", () => {
    render(
      <SnlBoardSvg
        state={makeState()}
        players={players}
        coinColorOf={coinColorOf}
        initialOf={initialOf}
        squareGroups={new Map()}
        startCount={0}
        toast={{ text: "Asha climbed to 14!", emoji: "▲", color: "#22C98A" }}
      />,
    );
    expect(screen.getByText("Asha climbed to 14!")).toBeTruthy();
    expect(screen.getByText("▲")).toBeTruthy();
  });
});

describe("DiceTray", () => {
  it("lets the player whose turn it is roll, and nobody else", () => {
    const onRoll = vi.fn();
    const { rerender } = render(
      <DiceTray value={3} rolling={false} canRoll myTurn phase="playing" turnName="Asha" onRoll={onRoll} variant="dock" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Roll the dice" }));
    expect(onRoll).toHaveBeenCalledTimes(1);

    rerender(<DiceTray value={3} rolling={false} canRoll myTurn={false} phase="playing" turnName="Bharat" onRoll={onRoll} variant="dock" />);
    expect(screen.queryByRole("button", { name: "Roll the dice" })).toBeNull();
    expect(screen.getByText("Waiting for Bharat to roll…")).toBeTruthy();
  });

  it("disables Roll while the previous move is still resolving", () => {
    render(<DiceTray value={3} rolling={false} canRoll={false} myTurn phase="playing" turnName="Asha" onRoll={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Roll the dice" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("only advertises the Space shortcut on the desktop panel", () => {
    const { rerender } = render(<DiceTray value={null} rolling={false} canRoll myTurn phase="playing" turnName="Asha" onRoll={vi.fn()} />);
    expect(screen.getByText("Space")).toBeTruthy();
    rerender(<DiceTray value={null} rolling={false} canRoll myTurn phase="playing" turnName="Asha" onRoll={vi.fn()} variant="dock" />);
    expect(screen.queryByText("Space")).toBeNull();
  });
});

describe("SnlPlayerRail", () => {
  const railProps = { players, state: makeState(), coinColorOf, initialOf, selfId: "a" };

  it("shows a progress bar toward 100 for every player in the desktop list", () => {
    render(<SnlPlayerRail {...railProps} layout="list" />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute("aria-valuenow")).toBe("14");
  });

  it("is a compact strip on a phone, with no progress bars", () => {
    render(<SnlPlayerRail {...railProps} layout="strip" />);
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
    expect(screen.getByText("Asha")).toBeTruthy();
  });

  it("marks whose turn it is, and lets you react only at other players", () => {
    const onTarget = vi.fn();
    render(<SnlPlayerRail {...railProps} layout="list" onTarget={onTarget} />);
    const turnRow = screen.getAllByRole("listitem").find((li) => li.getAttribute("aria-current") === "true");
    expect(turnRow?.textContent).toContain("Asha");

    expect(screen.queryByRole("button", { name: "React at Asha" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "React at Bharat" }));
    expect(onTarget).toHaveBeenCalledWith("b");
  });
});

describe("EventFeed", () => {
  const events = [
    { kind: "roll" as const, playerId: "a", ts: 1, roll: 4 },
    { kind: "snake" as const, playerId: "b", ts: 2, from: 17, to: 7 },
  ];

  it("lists the newest event first, with a glyph as well as a colour", () => {
    render(<EventFeed events={events} players={players} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Bharat bitten at 17 → 7");
    expect(rows[0].textContent).toContain("▼");
  });

  it("folds the list behind the newest line on a phone and still announces it", () => {
    const { container } = render(<EventFeed events={events} players={players} compact />);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("Bharat bitten at 17 → 7");
  });

  it("says so when nothing has happened yet", () => {
    render(<EventFeed events={[]} players={players} />);
    expect(screen.getByText("Waiting for the first roll…")).toBeTruthy();
  });
});

describe("toastForEvent", () => {
  it("only toasts the dramatic events", () => {
    expect(toastForEvent({ kind: "roll", playerId: "a", ts: 1, roll: 2 }, players)).toBeNull();
    expect(toastForEvent({ kind: "ladder", playerId: "a", ts: 1, from: 4, to: 14 }, players)?.text).toBe("Asha climbed to 14!");
    expect(toastForEvent({ kind: "win", playerId: "b", ts: 1 }, players)?.text).toBe("Bharat wins!");
  });
});
