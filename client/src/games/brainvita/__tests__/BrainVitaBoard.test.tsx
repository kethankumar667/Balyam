import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const recordSoloScore = vi.fn();
vi.mock("../../../store/scorecardStore", () => ({
  recordSoloScore: (...args: unknown[]) => recordSoloScore(...args),
}));

import BrainVitaBoardMobile from "../BrainVitaBoardMobile";
import BrainVitaBoardDesktop from "../BrainVitaBoardDesktop";
import { BrainVitaGrid, describeHole, neighbourHole } from "../BrainVitaGrid";
import { formatClock } from "../BrainVitaResultModal";
import { BRAINVITA_TUTORIAL_KEY } from "../useBrainVita";
import { CENTRE_HOLE, createBoard, holeAt, solveFrom, type Move } from "../brainvitaRules";

const hole = (row: number, col: number): number => holeAt(row, col) as number;
const holeButton = (container: HTMLElement, h: number): HTMLElement => container.querySelector(`[data-hole="${h}"]`) as HTMLElement;

beforeEach(() => {
  recordSoloScore.mockReset();
  recordSoloScore.mockResolvedValue({ isNewPersonalBest: false });
  try {
    localStorage.setItem(BRAINVITA_TUTORIAL_KEY, "1"); // keep the first-run lesson from covering the board
  } catch {
    /* storage unavailable: the lesson simply stays closed in this environment */
  }
});

describe("neighbourHole", () => {
  it("steps to the next hole in a direction", () => {
    expect(neighbourHole(hole(3, 3), [0, 1])).toBe(hole(3, 4));
    expect(neighbourHole(hole(3, 3), [-1, 0])).toBe(hole(2, 3));
  });

  it("stops at the edge of the cross instead of landing in a cut-away corner", () => {
    expect(neighbourHole(hole(3, 0), [0, -1])).toBeNull();
    expect(neighbourHole(hole(0, 2), [-1, 0])).toBeNull();
    expect(neighbourHole(hole(1, 2), [0, -1])).toBeNull();
  });

  it("skips over cut-away cells when the path crosses them", () => {
    expect(neighbourHole(hole(2, 0), [-1, 0])).toBeNull();
    expect(neighbourHole(hole(1, 2), [1, 0])).toBe(hole(2, 2));
  });
});

describe("describeHole", () => {
  it("names the cell and what is in it, and adds only what is true", () => {
    const base = { hasMarble: true, isSelected: false, isTarget: false, isHintFrom: false, isHintTo: false };
    expect(describeHole(hole(0, 2), base)).toBe("Row 1, column 3, marble");
    expect(describeHole(hole(3, 3), { ...base, hasMarble: false })).toBe("Row 4, column 4, empty hole");
    expect(describeHole(hole(3, 3), { ...base, hasMarble: false, isTarget: true })).toContain("can land here");
    expect(describeHole(hole(1, 3), { ...base, isSelected: true })).toContain("selected");
    expect(describeHole(hole(1, 3), { ...base, isHintFrom: true })).toContain("hint: move this marble");
    expect(describeHole(hole(3, 3), { ...base, hasMarble: false, isHintTo: true })).toContain("hint: land here");
  });
});

describe("formatClock", () => {
  it("shows minutes and seconds, and is safe on bad input", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(3_600)).toBe("60:00");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

describe("BrainVitaGrid", () => {
  const grid = (overrides: Partial<Parameters<typeof BrainVitaGrid>[0]> = {}) => {
    const onTap = vi.fn();
    const view = render(
      <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={onTap} {...overrides} />,
    );
    return { onTap, ...view };
  };

  it("draws 33 holes in the cross, each a button, in a labelled group", () => {
    grid();
    expect(screen.getByRole("group", { name: "Goli Jump board" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(33);
  });

  it("taps a marble", () => {
    const { onTap, container } = grid();
    fireEvent.click(holeButton(container, hole(1, 3)));
    expect(onTap).toHaveBeenCalledWith(hole(1, 3));
  });

  it("does nothing for an empty hole that is not a landing hole, and says so", () => {
    const { onTap, container } = grid();
    const centre = holeButton(container, CENTRE_HOLE);
    expect(centre).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(centre);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("lets an empty hole be tapped once it is a landing hole", () => {
    const { onTap, container } = grid({ selected: hole(1, 3), targets: [CENTRE_HOLE] });
    const centre = holeButton(container, CENTRE_HOLE);
    expect(centre).toHaveAttribute("aria-disabled", "false");
    expect(centre).toHaveAccessibleName(/can land here/);
    fireEvent.click(centre);
    expect(onTap).toHaveBeenCalledWith(CENTRE_HOLE);
  });

  it("announces the selected marble and the hint in words", () => {
    const hint: Move = { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE };
    const { container } = grid({ selected: hole(3, 1), hint });
    expect(holeButton(container, hole(3, 1))).toHaveAccessibleName(/selected/);
    expect(holeButton(container, hole(1, 3))).toHaveAccessibleName(/hint: move this marble/);
    expect(holeButton(container, CENTRE_HOLE)).toHaveAccessibleName(/hint: land here/);
  });

  it("refuses every tap when the game is over", () => {
    const { onTap, container } = grid({ disabled: true });
    fireEvent.click(holeButton(container, hole(1, 3)));
    expect(onTap).not.toHaveBeenCalled();
    expect(holeButton(container, hole(1, 3))).toHaveAttribute("aria-disabled", "true");
  });

  it("puts only one hole in the tab order, and moves it with the arrow keys", () => {
    const { container } = grid();
    const tabbable = screen.getAllByRole("button").filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(holeButton(container, CENTRE_HOLE));

    const centre = holeButton(container, CENTRE_HOLE);
    centre.focus();
    fireEvent.keyDown(centre, { key: "ArrowRight" });
    expect(holeButton(container, hole(3, 4))).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    expect(holeButton(container, hole(2, 4))).toHaveFocus();
    expect(holeButton(container, hole(2, 4))).toHaveAttribute("tabindex", "0");
  });

  it("does not trap Tab or run off the edge", () => {
    const { container } = grid();
    const corner = holeButton(container, hole(0, 2));
    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowUp" });
    expect(corner).toHaveFocus();
    expect(fireEvent.keyDown(corner, { key: "Tab" })).toBe(true);
  });
});

describe.each([
  ["mobile", BrainVitaBoardMobile],
  ["desktop", BrainVitaBoardDesktop],
] as const)("Brain Vita board — %s layout", (_name, Board) => {
  const onExit = vi.fn();
  const renderBoard = () => render(<Board onExit={onExit} />);

  beforeEach(() => onExit.mockClear());

  const playMove = (container: HTMLElement, move: Move) => {
    fireEvent.click(holeButton(container, move.from));
    fireEvent.click(holeButton(container, move.to));
  };

  it("starts with 32 marbles and no jumps", () => {
    const { container } = renderBoard();
    expect(screen.getByText("Marbles")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-hole]")).toHaveLength(33);
    expect(within(screen.getByRole("status")).getByText(/32 marbles left/)).toBeInTheDocument();
  });

  it("jumps a marble: pick it up, then tap where it lands", () => {
    const { container } = renderBoard();
    fireEvent.click(holeButton(container, hole(1, 3)));
    expect(holeButton(container, CENTRE_HOLE)).toHaveAccessibleName(/can land here/);
    fireEvent.click(holeButton(container, CENTRE_HOLE));
    expect(within(screen.getByRole("status")).getByText(/31 marbles left\. 1 jumps/)).toBeInTheDocument();
  });

  it("undoes and restarts", () => {
    const { container } = renderBoard();
    playMove(container, { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
    fireEvent.click(screen.getByRole("button", { name: "Undo the last jump" }));
    expect(within(screen.getByRole("status")).getByText(/32 marbles left/)).toBeInTheDocument();
    playMove(container, { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
    fireEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    expect(within(screen.getByRole("status")).getByText(/32 marbles left\. 0 jumps/)).toBeInTheDocument();
  });

  it("shows a hint on the board when asked", async () => {
    const { container } = renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Show a hint" }));
    await vi.waitFor(() => expect(container.querySelector('[aria-label*="hint: move this marble"]')).not.toBeNull());
    expect(container.querySelector('[aria-label*="hint: land here"]')).not.toBeNull();
  });

  it("announces the state through a single polite live region", () => {
    renderBoard();
    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute("aria-live", "polite");
  });

  it("opens the lesson from the how-to-play control", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "How to play" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("leaves when the leave control is used", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Leave game" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("finishes a game: the results dialog says how it went and posts an unassisted result", async () => {
    const { container } = renderBoard();
    for (const move of solveFrom(createBoard()) as Move[]) playMove(container, move);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Genius|Perfect game/)).toBeInTheDocument();
    expect(within(dialog).getByText(/One marble left/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/for practice/)).not.toBeInTheDocument();
    expect(recordSoloScore).toHaveBeenCalledWith("brainvita", "classic", 1, expect.objectContaining({ moves: 31 }));
  });

  it("tells a player their helped game is for practice and does not post it", async () => {
    const { container } = renderBoard();
    playMove(container, { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE });
    fireEvent.click(screen.getByRole("button", { name: "Undo the last jump" }));
    for (const move of solveFrom(createBoard()) as Move[]) playMove(container, move);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/for practice/)).toBeInTheDocument();
    expect(recordSoloScore).not.toHaveBeenCalled();
  });

  it("plays again from the results dialog", async () => {
    const { container } = renderBoard();
    for (const move of solveFrom(createBoard()) as Move[]) playMove(container, move);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Play again" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(screen.getByRole("status")).getByText(/32 marbles left/)).toBeInTheDocument();
  });

  it("lets the player look at the final board", async () => {
    const { container } = renderBoard();
    for (const move of solveFrom(createBoard()) as Move[]) playMove(container, move);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "See board" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(screen.getByRole("status")).getByText(/Game over/)).toBeInTheDocument();
  });
});
