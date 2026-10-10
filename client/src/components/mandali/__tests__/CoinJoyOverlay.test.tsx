import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const play = vi.fn();
const trigger = vi.fn();
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: (...a: unknown[]) => play(...a) } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: (...a: unknown[]) => trigger(...a) } }));

import { CoinJoyOverlay, JOY_VISIBLE_MS } from "../CoinJoyOverlay";
import { CoinFountain, JoyBurst, RisingHearts } from "../../faucet/CoinCelebrations";
import { useMandaliJoyStore } from "../../../store/mandaliJoyStore";

describe("CoinJoyOverlay", () => {
  beforeEach(() => {
    play.mockClear();
    trigger.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useMandaliJoyStore.getState().clear();
  });

  it("renders nothing until a coin request is answered", () => {
    const { container } = render(<CoinJoyOverlay />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tells the person who asked who sent how much, with the coins-and-hearts burst", () => {
    useMandaliJoyStore.getState().show("received", 1500, "Bala");

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("Bala sent you 1,500 coins");
    expect(screen.getByTestId("joy-burst")).toBeInTheDocument();
    expect(screen.queryByTestId("rising-hearts")).not.toBeInTheDocument();
    expect(trigger).toHaveBeenCalledWith("reward");
  });

  it("gives the person who paid a quieter thank-you with hearts only, and no reward sound", () => {
    useMandaliJoyStore.getState().show("sent", 100, "Kethan");

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("You sent 100 coins to Kethan. That was kind.");
    expect(screen.getByTestId("rising-hearts")).toBeInTheDocument();
    expect(screen.queryByTestId("joy-burst")).not.toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });

  it("says 'A friend' when the name is not known", () => {
    useMandaliJoyStore.getState().show("received", 100, null);

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("A friend sent you 100 coins");
  });

  it("closes itself after a few seconds", () => {
    useMandaliJoyStore.getState().show("received", 100, "Bala");
    render(<CoinJoyOverlay />);

    act(() => {
      vi.advanceTimersByTime(JOY_VISIBLE_MS + 100);
    });

    expect(useMandaliJoyStore.getState().moment).toBeNull();
  });

  it("closes from the close button", () => {
    useMandaliJoyStore.getState().show("received", 100, "Bala");
    render(<CoinJoyOverlay />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(useMandaliJoyStore.getState().moment).toBeNull();
  });

  it("replaces an older moment with the newest rather than queueing", () => {
    useMandaliJoyStore.getState().show("received", 100, "Bala");
    useMandaliJoyStore.getState().show("received", 250, "Anitha");

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("Anitha sent you 250 coins");
  });
});

describe("the three celebrations are different from one another", () => {
  it("the streak fountain is its own thing, not the top-down rain", () => {
    render(<CoinFountain />);

    const fountain = screen.getByTestId("coin-fountain");
    expect(fountain).toBeInTheDocument();
    expect(screen.queryByTestId("coin-rain")).not.toBeInTheDocument();
    // Dozens of coins erupt from below (half as many on a weak device, so this does not depend on the machine).
    expect(fountain.querySelectorAll("svg").length).toBeGreaterThanOrEqual(18);
  });

  it("the joy burst mixes coins and hearts", () => {
    render(<JoyBurst />);

    const burst = screen.getByTestId("joy-burst");
    expect(burst.querySelectorAll("svg").length).toBeGreaterThanOrEqual(12);
    // Coins carry a gradient fill; hearts do not, so both kinds are present.
    expect(burst.querySelectorAll("radialGradient").length).toBeGreaterThanOrEqual(1);
    expect(burst.querySelectorAll("svg:not(:has(radialGradient))").length).toBeGreaterThanOrEqual(1);
  });

  it("the rising hearts have no coins in them", () => {
    render(<RisingHearts />);

    const hearts = screen.getByTestId("rising-hearts");
    expect(hearts.querySelectorAll("svg").length).toBeGreaterThanOrEqual(8);
    expect(hearts.querySelector("radialGradient")).toBeNull();
  });
});
