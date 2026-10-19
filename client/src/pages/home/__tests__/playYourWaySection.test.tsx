import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { PlayYourWaySection } from "../PlayYourWaySection";
import { GamesSection } from "../GamesSection";
import { BHALYAM_GAMES, isLocked } from "../../../components/bhalyam/data";
import { gamesForWay, type PlayWay } from "../playWay";
import { NO_FIT, fitForWay, gamesFittingTable, type TableFit } from "../tableFit";

afterEach(() => {
  cleanup();
});

/** Holds the choice the way the home page does, so a click re-renders the section. */
function Harness({
  initial = null,
  onChange,
}: {
  initial?: PlayWay | null;
  onChange?: (next: PlayWay | null) => void;
}) {
  const [way, setWay] = useState<PlayWay | null>(initial);
  const [fit, setFit] = useState<TableFit>(NO_FIT);
  return (
    <PlayYourWaySection
      way={way}
      onChangeWay={(next) => {
        onChange?.(next);
        setWay(next);
        if (next === null) setFit(NO_FIT);
      }}
      fit={fit}
      onChangeFit={setFit}
    />
  );
}

const playableCount = (way: PlayWay) =>
  gamesForWay(BHALYAM_GAMES.filter((g) => !isLocked(g)), way).length;

describe("PlayYourWaySection", () => {
  it("offers two radios under one labelled group, with none chosen", () => {
    render(<Harness />);

    const group = screen.getByRole("radiogroup", { name: /who.s around today/i });
    expect(group).not.toBeNull();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => expect(radio.getAttribute("aria-checked")).toBe("false"));
  });

  it("makes the first radio the single tab stop until something is chosen", () => {
    render(<Harness />);
    const [friends, solo] = screen.getAllByRole("radio");
    expect(friends.getAttribute("tabindex")).toBe("0");
    expect(solo.getAttribute("tabindex")).toBe("-1");
  });

  it("keeps every radio at least 44px tall for thumbs", () => {
    render(<Harness />);
    screen.getAllByRole("radio").forEach((radio) => {
      expect(radio.className).toContain("min-h-[76px]");
    });
  });

  it("reports the choice and tells the player how many games fit", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /play alone/i }));

    expect(onChange).toHaveBeenCalledWith("solo");
    expect(screen.getByRole("radio", { name: /play alone/i }).getAttribute("aria-checked")).toBe(
      "true",
    );
    // The panel cross-fades, so the new line arrives after the old one leaves.
    expect(
      await screen.findByText(new RegExp(`${playableCount("solo")} games for one`)),
    ).not.toBeNull();
  });

  it("does not report a tap on the option that is already chosen", () => {
    const onChange = vi.fn();
    render(<Harness initial="friends" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /play together/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves the choice with the arrow keys", () => {
    const onChange = vi.fn();
    render(<Harness initial="friends" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("radio", { name: /play together/i }), {
      key: "ArrowRight",
    });

    expect(onChange).toHaveBeenCalledWith("solo");
  });

  it("wraps from the last option back to the first", () => {
    const onChange = vi.fn();
    render(<Harness initial="solo" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("radio", { name: /play alone/i }), { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith("friends");
  });

  it("offers a way back to every game only once something is chosen", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole("button", { name: /show all games/i })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /play together/i }));
    fireEvent.click(screen.getByRole("button", { name: /show all games/i }));

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("button", { name: /show all games/i })).toBeNull();
  });
});

describe("the table builder", () => {
  it("shows no controls until a way is chosen", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /more people/i })).toBeNull();
    expect(screen.queryByRole("radio", { name: /up to 10 min/i })).toBeNull();
  });

  it("asks for a headcount and a time when playing together", () => {
    render(<Harness initial="friends" />);
    expect(screen.getByRole("button", { name: /more people/i })).not.toBeNull();
    expect(screen.getByRole("radio", { name: /up to 10 min/i })).not.toBeNull();
    expect(screen.getByText("Any number")).not.toBeNull();
  });

  it("asks only for a time when playing alone, because one player has no headcount", () => {
    render(<Harness initial="solo" />);
    expect(screen.queryByRole("button", { name: /more people/i })).toBeNull();
    expect(screen.getByRole("radio", { name: /up to 20 min/i })).not.toBeNull();
  });

  it("steps the headcount up from Any and back down to Any", () => {
    render(<Harness initial="friends" />);
    const fewer = screen.getByRole("button", { name: /fewer people/i });
    expect((fewer as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    expect(screen.getByText("2 people")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    expect(screen.getByText("3 people")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /fewer people/i }));
    fireEvent.click(screen.getByRole("button", { name: /fewer people/i }));
    expect(screen.getByText("Any number")).not.toBeNull();
  });

  it("tells the player how many games fit the table they described", async () => {
    render(<Harness initial="friends" />);
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    }
    const playable = BHALYAM_GAMES.filter((g) => !isLocked(g));
    const fitting = gamesFittingTable(gamesForWay(playable, "friends"), { people: 6, minutes: null });
    expect(
      await screen.findByText(new RegExp(`${fitting.length} games? for a table of 6`)),
    ).not.toBeNull();
  });

  it("adds the time to the count", async () => {
    render(<Harness initial="solo" />);
    fireEvent.click(screen.getByRole("radio", { name: /up to 10 min/i }));
    expect(await screen.findByText(/done in 10 min or less/)).not.toBeNull();
    expect(screen.getByRole("radio", { name: /up to 10 min/i }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("never shows a stale count when taps come in quick succession", () => {
    render(<Harness initial="friends" />);
    fireEvent.click(screen.getByRole("radio", { name: /up to 20 min/i }));
    // Straight on, with no waiting: switch the way, then the time.
    fireEvent.click(screen.getByRole("radio", { name: /play alone/i }));
    fireEvent.click(screen.getByRole("radio", { name: /up to 10 min/i }));

    // Asserted at once, not after a delay: the panel must already be current.
    expect(screen.getByText(/games? for one, done in 10 min or less/)).not.toBeNull();
    expect(screen.queryByText(/done in 20 min or less/)).toBeNull();
  });

  it("says plainly when no game fits, and what to change", async () => {
    render(<Harness initial="friends" />);
    for (let i = 0; i < 11; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    }
    expect(await screen.findByText(/no game fits that table/i)).not.toBeNull();
    expect(screen.getByText(/try fewer people or more time/i)).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: /more people/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("clears the answers along with the way", async () => {
    render(<Harness initial="friends" />);
    fireEvent.click(screen.getByRole("button", { name: /more people/i }));
    fireEvent.click(screen.getByRole("button", { name: /show all games/i }));

    fireEvent.click(screen.getByRole("radio", { name: /play together/i }));
    expect(screen.getByText("Any number")).not.toBeNull();
  });
});

describe("GamesSection with a way chosen", () => {
  const renderSection = (way: PlayWay | null) =>
    render(
      <MemoryRouter>
        <GamesSection onSelect={vi.fn()} way={way} />
      </MemoryRouter>,
    );

  it("counts only the games that fit the way", () => {
    renderSection("solo");
    const fitting = playableCount("solo");
    expect(screen.getByText(new RegExp(`of ${fitting} games`))).not.toBeNull();
  });

  it("tells the player the link leads to every game, not a longer version of this list", () => {
    renderSection("friends");
    expect(screen.getByRole("link", { name: /browse every game/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /view all games/i })).toBeNull();
  });

  it("narrows the grid and the count by the table builder's answers", () => {
    const fit: TableFit = { people: 7, minutes: null };
    render(
      <MemoryRouter>
        <GamesSection onSelect={vi.fn()} way="friends" fit={fit} />
      </MemoryRouter>,
    );
    const playable = BHALYAM_GAMES.filter((g) => !isLocked(g));
    const expected = gamesFittingTable(gamesForWay(playable, "friends"), fitForWay("friends", fit));
    expect(expected.length).toBeLessThan(playableCount("friends"));
    // "Showing 6 of N games." when the list is longer than the home grid, "N games." when it is not.
    expect(
      screen.getByText(new RegExp(`^(Showing \\d+ of )?${expected.length} games?\\.$`)),
    ).not.toBeNull();
  });

  it("ignores the headcount for a one-player way", () => {
    const fit: TableFit = { people: 7, minutes: null };
    render(
      <MemoryRouter>
        <GamesSection onSelect={vi.fn()} way="solo" fit={fit} />
      </MemoryRouter>,
    );
    expect(screen.getByText(new RegExp(`of ${playableCount("solo")} games`))).not.toBeNull();
  });

  it("keeps the usual link when no way is chosen", () => {
    renderSection(null);
    expect(screen.getByRole("link", { name: /view all games/i })).not.toBeNull();
  });
});
