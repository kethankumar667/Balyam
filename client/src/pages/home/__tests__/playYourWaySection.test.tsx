import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { PlayYourWaySection } from "../PlayYourWaySection";
import { GamesSection } from "../GamesSection";
import { BHALYAM_GAMES, isLocked } from "../../../components/bhalyam/data";
import { gamesForWay, type PlayWay } from "../playWay";

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
  return (
    <PlayYourWaySection
      way={way}
      onChangeWay={(next) => {
        onChange?.(next);
        setWay(next);
      }}
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

  it("keeps the usual link when no way is chosen", () => {
    renderSection(null);
    expect(screen.getByRole("link", { name: /view all games/i })).not.toBeNull();
  });
});
