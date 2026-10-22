import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { BingoBoard, BingoPlayerPublic, Player } from "@shared/types";
import * as chrome from "../bingo-chrome";
import { BingoPlayersStrip, BingoTurnBanner, buildBingoSeats } from "../bingo-chrome";
import { AutoMarkToggle, BingoGrid, BingoLetterBanner, CallOutToggle } from "../bingo-shared";
import { BINGO_SKIN_DARK, BINGO_SKIN_LIGHT, bingoSkinFor } from "../bingoSkin";

afterEach(cleanup);

const seatState = (id: string, over: Partial<BingoPlayerPublic> = {}): BingoPlayerPublic => ({
  id,
  name: id,
  isReady: true,
  markedCount: 0,
  completedLinesCount: 0,
  completedLetters: [],
  hasWon: false,
  isBot: false,
  isConnected: true,
  board: [],
  autoMark: false,
  hasMarkedCurrent: false,
  ...over,
});

const member = (id: string, over: Partial<Player> = {}): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, ...over });

const board = (marked: number[] = []): BingoBoard =>
  Array.from({ length: 25 }, (_, index) => ({ index, value: index + 1, marked: marked.includes(index + 1) }));

describe("bingo seats", () => {
  it("joins the game's progress with the room's host, picture and connection", () => {
    const seats = buildBingoSeats(
      [seatState("a", { completedLinesCount: 2, completedLetters: ["B", "I"] }), seatState("b", { isBot: true, isConnected: true })],
      [member("a", { isHost: true, avatar: "x.png" }), member("b", { isConnected: false })],
      "a",
      "b",
    );
    expect(seats[0]).toMatchObject({ id: "a", isSelf: true, isHost: true, avatar: "x.png", lines: 2, letters: ["B", "I"], isCaller: false });
    expect(seats[1]).toMatchObject({ id: "b", isSelf: false, isBot: true, isCaller: true, isConnected: false });
  });

  it("falls back to the game state's connection flag for a seat the roster does not list", () => {
    const [seat] = buildBingoSeats([seatState("ghost", { isConnected: false })], [], null, null);
    expect(seat.isConnected).toBe(false);
    expect(seat.isHost).toBe(false);
  });
});

describe("the table has no called-numbers strip", () => {
  it("is gone from the frame on every device: the open number is shown by the call-out panel instead", () => {
    // Players found a second list of past numbers to be noise next to the card; it was removed on purpose.
    expect("NumbersCalledStrip" in chrome).toBe(false);
    expect("CALLED_STRIP_SLOTS" in chrome).toBe(false);
  });
});

describe("the turn banner", () => {
  it("tells the caller to pick, and everyone else who is calling", () => {
    const mine = render(<BingoTurnBanner skin={BINGO_SKIN_LIGHT} isMyTurn callerName={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("YOUR TURN!");
    expect(screen.getByRole("status")).toHaveTextContent("Pick a number to call out");
    mine.unmount();

    render(<BingoTurnBanner skin={BINGO_SKIN_LIGHT} isMyTurn={false} callerName="Sravani" />);
    expect(screen.getByRole("status")).toHaveTextContent("Sravani's turn");
  });
});

describe("the players strip", () => {
  const seats = buildBingoSeats(
    [seatState("me", { name: "Kethan" }), seatState("sra", { name: "Sravani", completedLinesCount: 1, completedLetters: ["B"] })],
    [member("me", { isHost: true }), member("sra", { isConnected: false })],
    "me",
    "sra",
  );

  it("crowns the host, marks who is calling and shows who is away", () => {
    render(<BingoPlayersStrip skin={BINGO_SKIN_LIGHT} seats={seats} layout="row" viewingAllTables={false} onToggleTables={() => {}} />);
    expect(screen.getAllByRole("img", { name: "Host" }).length).toBeGreaterThan(0);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Calling")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Away" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Online" })).toBeInTheDocument();
  });

  it("lets you react at another player but not at yourself", () => {
    const onTarget = vi.fn();
    render(<BingoPlayersStrip skin={BINGO_SKIN_LIGHT} seats={seats} layout="row" viewingAllTables={false} onToggleTables={() => {}} onTarget={onTarget} />);
    fireEvent.click(screen.getByRole("button", { name: "React at Sravani" }));
    expect(onTarget).toHaveBeenCalledWith("sra");
    expect(screen.getByRole("button", { name: "Kethan (you)" })).toBeDisabled();
  });

  it("offers the switch between your board and every table, worded for where you are", () => {
    const toggle = vi.fn();
    const first = render(<BingoPlayersStrip skin={BINGO_SKIN_DARK} seats={seats} layout="list" viewingAllTables={false} onToggleTables={toggle} />);
    fireEvent.click(screen.getByRole("button", { name: "View all tables" }));
    expect(toggle).toHaveBeenCalledTimes(1);
    first.unmount();

    render(<BingoPlayersStrip skin={BINGO_SKIN_DARK} seats={seats} layout="list" viewingAllTables onToggleTables={toggle} />);
    expect(screen.getByRole("button", { name: "Back to my board" })).toBeInTheDocument();
  });

  it("shows each seat's progress in the desktop list", () => {
    render(<BingoPlayersStrip skin={BINGO_SKIN_LIGHT} seats={seats} layout="list" viewingAllTables={false} onToggleTables={() => {}} />);
    expect(screen.getByText("1 line · B")).toBeInTheDocument();
    expect(screen.getByText("0 lines")).toBeInTheDocument();
  });
});

describe("the letters", () => {
  it("says which letters are earned, in words as well as in the ring", () => {
    render(<BingoLetterBanner completedLetters={["B", "N"]} skin={BINGO_SKIN_LIGHT} />);
    const list = screen.getByRole("list", { name: "Completed letters" });
    const labels = within(list).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"));
    expect(labels).toEqual(["B, completed", "I", "N, completed", "G", "O"]);
  });
});

describe("the grid", () => {
  it("names a struck-off number as marked", () => {
    render(<BingoGrid board={board([9])} skin={BINGO_SKIN_LIGHT} />);
    expect(screen.getByRole("button", { name: "9, marked" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "10" })).toBeDisabled();
  });

  it("lets you strike the open number, and only that one", () => {
    const onMarkCell = vi.fn();
    render(<BingoGrid board={board()} markableNumber={16} onMarkCell={onMarkCell} skin={BINGO_SKIN_DARK} />);
    expect(screen.getByRole("button", { name: "17" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mark 16" }));
    expect(onMarkCell).toHaveBeenCalledWith(16);
  });

  it("lets the caller pick any number that is not struck off, on their turn", () => {
    const onCellClick = vi.fn();
    render(<BingoGrid board={board([1])} isMyTurn onCellClick={onCellClick} skin={BINGO_SKIN_LIGHT} />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onCellClick).toHaveBeenCalledWith(2);
    expect(screen.getByRole("button", { name: "1, marked" })).toBeDisabled();
  });

  it("marks the open number before it picks the cell to call, even on the caller's own turn", () => {
    const onMarkCell = vi.fn();
    const onCellClick = vi.fn();
    render(<BingoGrid board={board()} isMyTurn onCellClick={onCellClick} markableNumber={5} onMarkCell={onMarkCell} skin={BINGO_SKIN_LIGHT} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark 5" }));
    expect(onMarkCell).toHaveBeenCalledWith(5);
    expect(onCellClick).not.toHaveBeenCalled();
  });
});

describe("mark for me", () => {
  it("is a switch that reports the opposite of its state when pressed", () => {
    const onChange = vi.fn();
    render(<AutoMarkToggle enabled={false} onChange={onChange} skin={BINGO_SKIN_LIGHT} />);
    const toggle = screen.getByRole("switch", { name: /Mark for me/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("call out numbers", () => {
  it("is a switch that reports the opposite of its state when pressed", () => {
    const onChange = vi.fn();
    render(<CallOutToggle enabled={false} onChange={onChange} skin={BINGO_SKIN_LIGHT} />);
    const toggle = screen.getByRole("switch", { name: /Call out numbers/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows that it is on, and turns off when pressed again", () => {
    const onChange = vi.fn();
    render(<CallOutToggle enabled onChange={onChange} skin={BINGO_SKIN_DARK} />);
    const toggle = screen.getByRole("switch", { name: /Call out numbers/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("says in words what it does, not by its icon alone", () => {
    render(<CallOutToggle enabled={false} onChange={() => {}} skin={BINGO_SKIN_LIGHT} />);
    expect(screen.getByText("Speak each number aloud")).toBeInTheDocument();
  });
});

describe("the two skins", () => {
  it("is light or dark by one flag, each with its own room-rail variant", () => {
    expect(bingoSkinFor(false)).toBe(BINGO_SKIN_LIGHT);
    expect(bingoSkinFor(true)).toBe(BINGO_SKIN_DARK);
    expect(BINGO_SKIN_LIGHT.railVariant).toBe("paper");
    expect(BINGO_SKIN_DARK.railVariant).toBe("dark");
  });

  it("gives both themes a value for every token, so neither can be left half-styled", () => {
    const light = Object.keys(BINGO_SKIN_LIGHT).sort();
    const dark = Object.keys(BINGO_SKIN_DARK).sort();
    expect(dark).toEqual(light);
    for (const skin of [BINGO_SKIN_LIGHT, BINGO_SKIN_DARK]) {
      for (const [key, value] of Object.entries(skin)) {
        if (typeof value === "string") expect(value, key).not.toBe("");
      }
    }
  });
});
