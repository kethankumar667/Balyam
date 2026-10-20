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

  it("keeps every box a generous touch target", () => {
    render(<Harness />);
    screen.getAllByRole("radio").forEach((radio) => {
      expect(radio.className).toContain("min-h-[132px]");
    });
  });

  it("shows how many games each box holds before anything is chosen", () => {
    render(<Harness />);
    expect(screen.getByText(`${playableCount("friends")} games`)).not.toBeNull();
    expect(screen.getByText(`${playableCount("solo")} games`)).not.toBeNull();
  });

  it("keeps the art out of the accessibility tree", () => {
    const { container } = render(<Harness />);
    const images = [...container.querySelectorAll("img")];
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("never puts a space in an image source, which would silently skip the AVIF and WebP files", () => {
    const { container } = render(<Harness />);
    const sources = [...container.querySelectorAll("source")].map((s) => s.getAttribute("srcset") ?? "");
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((srcset) => expect(srcset).not.toMatch(/\s/));
  });

  describe("the handheld on the Play alone box", () => {
    it("is drawn inside Play alone and nowhere else", () => {
      const { container } = render(<Harness />);
      const handhelds = container.querySelectorAll("[data-handheld]");
      expect(handhelds).toHaveLength(1);
      expect(handhelds[0].closest('[role="radio"]')).toBe(screen.getByRole("radio", { name: /play alone/i }));
    });

    it("is decoration, hidden from assistive technology", () => {
      const { container } = render(<Harness />);
      const handheld = container.querySelector("[data-handheld]");
      expect(handheld?.getAttribute("aria-hidden")).toBe("true");
      expect(handheld?.getAttribute("focusable")).toBe("false");
    });

    it("keeps its pixel snake as one segmented dash pattern the length of its route", () => {
      const { container } = render(<Harness />);
      const snake = [...container.querySelectorAll("[data-handheld] path")].find((p) => p.getAttribute("stroke-dasharray"));
      const parts = (snake?.getAttribute("stroke-dasharray") ?? "").split(" ").map(Number);
      expect(parts.length % 2).toBe(0);
      // One lap of the route: the seven segments, their joints and the long gap add up to the 160-unit path.
      expect(parts.reduce((sum, n) => sum + n, 0)).toBeCloseTo(160, 5);
    });

    it("renders without error when the box is chosen, focused or left", () => {
      render(<Harness />);
      const alone = screen.getByRole("radio", { name: /play alone/i });
      fireEvent.focus(alone);
      fireEvent.click(alone);
      fireEvent.blur(alone);
      expect(alone.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("the pawn", () => {
    const radioHoldingPawn = (container: HTMLElement) =>
      container.querySelector("[data-way-pawn]")?.closest('[role="radio"]') ?? null;

    it("waits in the caption until a way is chosen", () => {
      const { container } = render(<Harness />);
      expect(container.querySelector("[data-way-pawn]")).not.toBeNull();
      expect(radioHoldingPawn(container)).toBeNull();
    });

    it("stands in the box that was chosen", () => {
      const { container } = render(<Harness />);
      fireEvent.click(screen.getByRole("radio", { name: /play alone/i }));
      expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
      expect(radioHoldingPawn(container)).toBe(screen.getByRole("radio", { name: /play alone/i }));
    });

    it("moves to the other box when the choice changes", () => {
      const { container } = render(<Harness initial="friends" />);
      expect(radioHoldingPawn(container)).toBe(screen.getByRole("radio", { name: /play together/i }));

      fireEvent.click(screen.getByRole("radio", { name: /play alone/i }));

      expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
      expect(radioHoldingPawn(container)).toBe(screen.getByRole("radio", { name: /play alone/i }));
    });

    it("goes home to the caption when the choice is cleared", () => {
      const { container } = render(<Harness initial="solo" />);
      fireEvent.click(screen.getByRole("button", { name: /show all games/i }));
      expect(container.querySelectorAll("[data-way-pawn]")).toHaveLength(1);
      expect(radioHoldingPawn(container)).toBeNull();
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
