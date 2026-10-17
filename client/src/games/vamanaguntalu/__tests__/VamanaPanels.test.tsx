import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { VamanaDock, VamanaDockButton, VamanaMoveNote } from "../VamanaDock";
import { VamanaScene } from "../VamanaScene";
import { VamanaScoreCard } from "../VamanaScoreCard";
import { VamanaTitleSign } from "../VamanaTitleSign";
import { VamanaOutcomeBar, VamanaTurnBar } from "../VamanaTurnBar";

const RING_CIRCUMFERENCE = 2 * Math.PI * 17;

/** The ring is the second circle: the first is its track. */
const ringOffset = (container: HTMLElement): number => Number(container.querySelectorAll("circle")[1].getAttribute("stroke-dashoffset"));
const ringStroke = (container: HTMLElement): string | null => container.querySelectorAll("circle")[1].getAttribute("stroke");

describe("VamanaTurnBar", () => {
  it("says whose move it is in words", () => {
    render(<VamanaTurnBar text="Your turn — tap a pit on your row" secondsLeft={20} totalSeconds={30} isCritical={false} />);
    expect(screen.getByText("Your turn — tap a pit on your row")).toBeInTheDocument();
  });

  it("drains the ring in proportion to the clock and shows the seconds", () => {
    const { container } = render(<VamanaTurnBar text="x" secondsLeft={15} totalSeconds={30} isCritical={false} />);
    expect(screen.getByText("15s")).toBeInTheDocument();
    expect(ringOffset(container)).toBeCloseTo(RING_CIRCUMFERENCE / 2, 5);
  });

  it("is full at the start of a turn and empty at the end, and never runs past either", () => {
    const full = render(<VamanaTurnBar text="x" secondsLeft={45} totalSeconds={30} isCritical={false} />);
    expect(ringOffset(full.container)).toBeCloseTo(0, 5);
    full.unmount();
    const empty = render(<VamanaTurnBar text="x" secondsLeft={0} totalSeconds={30} isCritical={false} />);
    expect(ringOffset(empty.container)).toBeCloseTo(RING_CIRCUMFERENCE, 5);
  });

  it("turns the ring red when time is nearly up, as well as showing the seconds", () => {
    const calm = render(<VamanaTurnBar text="x" secondsLeft={20} totalSeconds={30} isCritical={false} />);
    const calmColour = ringStroke(calm.container);
    calm.unmount();
    const urgent = render(<VamanaTurnBar text="x" secondsLeft={3} totalSeconds={30} isCritical />);
    expect(ringStroke(urgent.container)).not.toBe(calmColour);
    expect(screen.getByText("3s")).toBeInTheDocument();
  });

  it("draws no clock at all for a table that plays without one", () => {
    const { container } = render(<VamanaTurnBar text="Waiting for Bob" secondsLeft={null} totalSeconds={0} isCritical={false} />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    expect(screen.queryByText(/\ds$/)).not.toBeInTheDocument();
  });

  it("is not itself a live region, so the board's one polite region is not doubled", () => {
    render(<VamanaTurnBar text="Your turn" secondsLeft={20} totalSeconds={30} isCritical={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("VamanaOutcomeBar", () => {
  it("shows the result headline", () => {
    render(<VamanaOutcomeBar headline="VICTORY — 41 TO 29" />);
    expect(screen.getByText("VICTORY — 41 TO 29")).toBeInTheDocument();
  });
});

describe("VamanaScoreCard", () => {
  const card = (overrides: Partial<Parameters<typeof VamanaScoreCard>[0]> = {}) =>
    render(<VamanaScoreCard name="Alice" isSelf={false} captured={12} onRow={9} isActiveTurn={false} {...overrides} />);

  it("shows the name, the captured seeds and the seeds on the row", () => {
    card();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("9 on row")).toBeInTheDocument();
  });

  it("says whose turn it is in words, for you and for them", () => {
    const mine = card({ isSelf: true, isActiveTurn: true });
    expect(screen.getByText("▶ Your turn")).toBeInTheDocument();
    mine.unmount();
    card({ isActiveTurn: true });
    expect(screen.getByText("▶ Their turn")).toBeInTheDocument();
  });

  it("speaks the role beside the name even where the visible chip is hidden", () => {
    card({ isSelf: true });
    expect(screen.getByText("(You)")).toHaveClass("sr-only");
  });

  it("marks only the leader with a crown", () => {
    const leader = card({ isLeading: true });
    expect(leader.container.querySelector("svg.lucide-crown")).not.toBeNull();
    leader.unmount();
    const trailing = card({ isLeading: false });
    expect(trailing.container.querySelector("svg.lucide-crown")).toBeNull();
  });

  it("draws the turn-clock bar only on the card whose turn it is", () => {
    const active = card({ isActiveTurn: true, turnFraction: 0.5 });
    expect(active.container.querySelector('span[style*="width: 50%"]')).not.toBeNull();
    active.unmount();
    const idle = card({ isActiveTurn: false, turnFraction: 0.5 });
    expect(idle.container.querySelector('span[style*="width: 50%"]')).toBeNull();
  });

  it("clamps a clock that has overrun", () => {
    const { container } = card({ isActiveTurn: true, turnFraction: 1.7 });
    expect(container.querySelector('span[style*="width: 100%"]')).not.toBeNull();
  });

  it("can drop the face for a column too narrow to show it", () => {
    // With no photo the face is the player's initial on a coloured disc.
    const shown = card();
    expect(screen.getByText("A")).toBeInTheDocument();
    shown.unmount();
    card({ isAvatarHidden: true });
    expect(screen.queryByText("A")).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});

describe("VamanaDockButton", () => {
  it("is a named button that does its job when pressed", () => {
    const onClick = vi.fn();
    render(<VamanaDockButton label="Give Up" ariaLabel="Give up and leave the match" icon={<svg />} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Give up and leave the match" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Give Up")).toBeInTheDocument();
  });

  it("falls back to its caption as the spoken name", () => {
    render(<VamanaDockButton label="Sound" icon={<svg />} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sound" })).toBeInTheDocument();
  });

  it("shows an unread marker only when asked", () => {
    const plain = render(<VamanaDockButton label="Chat" icon={<svg />} onClick={vi.fn()} />);
    expect(plain.container.querySelector(".bg-rose-500")).toBeNull();
    plain.unmount();
    const unread = render(<VamanaDockButton label="Chat" icon={<svg />} onClick={vi.fn()} hasBadge />);
    expect(unread.container.querySelector(".bg-rose-500")).not.toBeNull();
  });

  it("lays its buttons out in a column on a wide screen", () => {
    const { container } = render(
      <VamanaDock isVertical>
        <span>a</span>
      </VamanaDock>,
    );
    expect(container.firstElementChild).toHaveClass("flex-col");
  });
});

describe("VamanaMoveNote", () => {
  it("shows the recap text", () => {
    render(<VamanaMoveNote text="Gunta sowed 1 seed from pit 7." />);
    expect(screen.getByText("Gunta sowed 1 seed from pit 7.")).toBeInTheDocument();
  });
});

describe("VamanaTitleSign", () => {
  it("is the page heading, named in one piece whether it is stacked or not", () => {
    const stacked = render(<VamanaTitleSign isStacked />);
    expect(screen.getByRole("heading", { level: 1, name: "Vamana Guntalu" })).toBeInTheDocument();
    stacked.unmount();
    render(<VamanaTitleSign isCompact />);
    expect(screen.getByRole("heading", { level: 1, name: "Vamana Guntalu" })).toBeInTheDocument();
  });
});

describe("VamanaScene", () => {
  it("is decoration only: hidden from assistive tech and never in the way of a tap", () => {
    const { container } = render(<VamanaScene />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pointer-events-none");
  });

  it("defines each shared gradient once, so no id repeats on the page", () => {
    const { container } = render(<VamanaScene />);
    for (const id of ["vg-leaf", "vg-brass", "vg-seed"]) {
      expect(container.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
    }
  });

  it("leaves out the bowl where a short phone has no corner for it", () => {
    const full = render(<VamanaScene />);
    const withBowl = full.container.querySelectorAll("svg").length;
    full.unmount();
    const compact = render(<VamanaScene isCompact />);
    expect(compact.container.querySelectorAll("svg").length).toBe(withBowl - 1);
  });
});
