import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const play = vi.fn();
const trigger = vi.fn();
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: (...a: unknown[]) => play(...a) } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: (...a: unknown[]) => trigger(...a) } }));

import { CoinJoyOverlay, JOY_VISIBLE_MS } from "../CoinJoyOverlay";
import { STAGE_ARRIVAL_MS } from "../CoinTransferStage";
import { CoinFountain, JoyBurst, RisingHearts } from "../../faucet/CoinCelebrations";
import { useMandaliJoyStore } from "../../../store/mandaliJoyStore";

const show = useMandaliJoyStore.getState().show;
/** The avatar pictures on the stage, left to right. They carry alt="" (the names are written beside them), so they have no `img` role. */
const faces = (): Array<string | null> => Array.from(document.querySelectorAll("img")).map((img) => img.getAttribute("src"));
const bala = { name: "Bala", avatar: "bala.png" };
const kethan = { name: "Kethan", avatar: "kethan.png" };

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

  it("runs for exactly five seconds", () => {
    expect(JOY_VISIBLE_MS).toBe(5_000);
  });

  it("shows the sender and the receiver side by side, so the person who asked sees who sent how much", () => {
    show("received", 1500, "Bala", { self: kethan, other: bala });

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("Bala sent you 1,500 coins");
    expect(faces()).toEqual(["/Avatars/bala.png", "/Avatars/kethan.png"]);
    expect(screen.getByText("Sender")).toBeInTheDocument();
    expect(screen.getByText("Receiver")).toBeInTheDocument();
    expect(screen.getByText("+1,500")).toBeInTheDocument();
  });

  it("puts this player on the sending side when they paid", () => {
    show("sent", 100, "Kethan", { self: bala, other: kethan });

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("You sent 100 coins to Kethan. That was kind.");
    expect(faces()).toEqual(["/Avatars/bala.png", "/Avatars/kethan.png"]);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("says 'A friend' and draws the logo when the friend is not known on this screen", () => {
    show("received", 100, null);

    render(<CoinJoyOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("A friend sent you 100 coins");
    expect(faces()[0]).toBe("/Bhalyam-logo.png");
  });

  it("gives the receiver the coin chime when the last coin lands, not before", () => {
    show("received", 100, "Bala", { self: kethan, other: bala });
    render(<CoinJoyOverlay />);

    act(() => {
      vi.advanceTimersByTime(STAGE_ARRIVAL_MS - 100);
    });
    expect(play).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(trigger).toHaveBeenCalledWith("reward");
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("gives the payer a quieter buzz and no reward sound", () => {
    show("sent", 100, "Kethan", { self: bala, other: kethan });
    render(<CoinJoyOverlay />);

    act(() => {
      vi.advanceTimersByTime(JOY_VISIBLE_MS);
    });

    expect(trigger).toHaveBeenCalledWith("subtle");
    expect(trigger).not.toHaveBeenCalledWith("reward");
    expect(play).not.toHaveBeenCalled();
  });

  it("closes itself after the five seconds", () => {
    show("received", 100, "Bala");
    render(<CoinJoyOverlay />);

    act(() => {
      vi.advanceTimersByTime(JOY_VISIBLE_MS - 50);
    });
    expect(useMandaliJoyStore.getState().moment).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(useMandaliJoyStore.getState().moment).toBeNull();
  });

  it("can be skipped mid-animation with the Skip button", () => {
    show("received", 100, "Bala");
    render(<CoinJoyOverlay />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.click(screen.getByRole("button", { name: /skip the coin animation/i }));

    expect(useMandaliJoyStore.getState().moment).toBeNull();
  });

  it("can be skipped with Escape", () => {
    show("sent", 100, "Kethan");
    render(<CoinJoyOverlay />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(useMandaliJoyStore.getState().moment).toBeNull();
  });

  it("does not take focus, so a game in progress keeps its keyboard", () => {
    show("received", 100, "Bala");
    render(<CoinJoyOverlay />);

    expect(document.body).toHaveFocus();
  });

  it("replaces an older moment with the newest rather than queueing", () => {
    show("received", 100, "Bala");
    show("received", 250, "Anitha");

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
