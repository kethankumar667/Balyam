import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const subtle = vi.fn();
vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: { getInstance: () => ({ subtle }) },
}));

import { CarromStrikerSlider } from "../CarromStrikerSlider";

/**
 * The striker slider. It used to vibrate the phone on every single move event, which on a drag is a
 * continuous buzz rather than a feel of notches. Now it ticks once per notch of travel.
 */

const TRACK_WIDTH = 200;

beforeEach(() => {
  subtle.mockReset();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: TRACK_WIDTH,
    bottom: 44,
    width: TRACK_WIDTH,
    height: 44,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function renderSlider(onPlace = vi.fn()) {
  render(<CarromStrikerSlider myTurn phase="aiming" strikerPos={0.5} onPlace={onPlace} />);
  return { track: screen.getByTitle("Slide to position your striker"), onPlace };
}

describe("striker slider haptics", () => {
  it("ticks a handful of times across a long drag, not once per move event", () => {
    const { track } = renderSlider();

    fireEvent.pointerDown(track, { pointerId: 1, clientX: 0 });
    for (let x = 1; x <= TRACK_WIDTH; x++) fireEvent.pointerMove(track, { pointerId: 1, clientX: x });
    fireEvent.pointerUp(track, { pointerId: 1, clientX: TRACK_WIDTH });

    expect(subtle.mock.calls.length).toBeGreaterThan(5);
    expect(subtle.mock.calls.length).toBeLessThanOrEqual(25);
  });

  it("stays silent while the finger moves within one notch", () => {
    const { track } = renderSlider();
    fireEvent.pointerDown(track, { pointerId: 1, clientX: 100 });
    subtle.mockClear();

    for (let x = 100; x <= 103; x++) fireEvent.pointerMove(track, { pointerId: 1, clientX: x });

    expect(subtle).not.toHaveBeenCalled();
  });

  it("still reports every position it passes to the board", () => {
    const { track, onPlace } = renderSlider();

    fireEvent.pointerDown(track, { pointerId: 1, clientX: 50 });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 150 });

    expect(onPlace).toHaveBeenCalledTimes(2);
    expect(onPlace).toHaveBeenLastCalledWith(0.75);
  });
});
