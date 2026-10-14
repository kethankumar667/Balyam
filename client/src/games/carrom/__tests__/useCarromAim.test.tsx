import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOARD_VIEW } from "../carrom-shared";
import { useCarromAim } from "../useCarromAim";

/**
 * The real input path, with synthetic pointer events: what a finger, a second finger, an operating
 * system gesture and the Escape key each do to a shot. The board is drawn one pixel per board unit so
 * a client coordinate difference is a board unit difference.
 */

type PointerInit = { pointerId?: number; button?: number; clientX?: number; clientY?: number; timeStamp?: number };

const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), hasPointerCapture: () => true };

function pe(init: PointerInit): React.PointerEvent<SVGSVGElement> {
  return { pointerId: 1, button: 0, clientX: 0, clientY: 0, timeStamp: 0, currentTarget: target, ...init } as unknown as React.PointerEvent<SVGSVGElement>;
}

const svgRef = {
  current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: BOARD_VIEW.span, height: BOARD_VIEW.span }) },
} as unknown as React.RefObject<SVGSVGElement>;

const onShoot = vi.fn();

function setup(enabled = true) {
  return renderHook(({ on }) => useCarromAim({ svgRef, isFlipped: false, enabled: on, onShoot }), { initialProps: { on: enabled } });
}

beforeEach(() => {
  onShoot.mockReset();
  target.setPointerCapture.mockReset();
  target.releasePointerCapture.mockReset();
});

describe("a normal shot", () => {
  it("fires once on release, with the angle and power of the pull, and clears the aim", () => {
    const { result } = setup();

    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 80, clientY: 100, timeStamp: 16 })));
    expect(result.current.aim?.power).toBeCloseTo(0.5, 6);
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 80, clientY: 100, timeStamp: 200 })));

    expect(onShoot).toHaveBeenCalledTimes(1);
    expect(onShoot.mock.calls[0][0].power).toBeCloseTo(0.5, 6);
    expect(onShoot.mock.calls[0][0].angle).toBeCloseTo(0, 6);
    expect(result.current.aim).toBeNull();
  });
});

describe("a touch is not a shot", () => {
  it("does not fire for a tap that never moved", () => {
    const { result } = setup();

    act(() => result.current.handlers.onPointerDown(pe({ clientX: 300, clientY: 20, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 300, clientY: 20, timeStamp: 80 })));

    expect(onShoot).not.toHaveBeenCalled();
  });

  it("does not turn the first touch, however far from the striker, into a shot", () => {
    const { result } = setup();

    act(() => result.current.handlers.onPointerDown(pe({ clientX: 10, clientY: 10, timeStamp: 0 })));

    expect(result.current.aim).toBeNull();
  });
});

describe("an interrupted touch never fires", () => {
  it("drops the aim when the system cancels the pointer, as for an edge swipe or a palm", () => {
    const { result } = setup();
    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 70, clientY: 100, timeStamp: 16 })));
    expect(result.current.aim).not.toBeNull();

    act(() => result.current.handlers.onPointerCancel(pe({ timeStamp: 300 })));

    expect(onShoot).not.toHaveBeenCalled();
    expect(result.current.aim).toBeNull();
  });

  it("drops the aim on Escape", () => {
    const { result } = setup();
    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 70, clientY: 100, timeStamp: 16 })));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 70, clientY: 100, timeStamp: 300 })));

    expect(onShoot).not.toHaveBeenCalled();
    expect(result.current.aim).toBeNull();
  });

  it("drops the aim when the turn passes mid-drag", () => {
    const { result, rerender } = setup(true);
    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 70, clientY: 100, timeStamp: 16 })));

    rerender({ on: false });
    // The aim line must vanish the moment the turn passes, not when the finger finally lifts.
    expect(result.current.aim).toBeNull();
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 70, clientY: 100, timeStamp: 300 })));

    expect(onShoot).not.toHaveBeenCalled();
    expect(result.current.aim).toBeNull();
  });
});

describe("only the right input starts an aim", () => {
  it("ignores a right or middle mouse button", () => {
    const { result } = setup();

    act(() => result.current.handlers.onPointerDown(pe({ button: 2, clientX: 100, clientY: 100 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 70, clientY: 100, timeStamp: 16 })));
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 70, clientY: 100, timeStamp: 300 })));

    expect(target.setPointerCapture).not.toHaveBeenCalled();
    expect(onShoot).not.toHaveBeenCalled();
  });

  it("does nothing when it is not the player's turn", () => {
    const { result } = setup(false);

    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100 })));
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 70, clientY: 100, timeStamp: 16 })));
    act(() => result.current.handlers.onPointerUp(pe({ clientX: 70, clientY: 100, timeStamp: 300 })));

    expect(onShoot).not.toHaveBeenCalled();
    expect(result.current.aim).toBeNull();
  });

  it("keeps the first finger's aim when a second finger touches down and moves", () => {
    const { result } = setup();
    act(() => result.current.handlers.onPointerDown(pe({ pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 })));
    act(() => result.current.handlers.onPointerMove(pe({ pointerId: 1, clientX: 80, clientY: 100, timeStamp: 16 })));

    act(() => result.current.handlers.onPointerDown(pe({ pointerId: 2, clientX: 10, clientY: 10, timeStamp: 40 })));
    act(() => result.current.handlers.onPointerMove(pe({ pointerId: 2, clientX: 200, clientY: 200, timeStamp: 56 })));
    act(() => result.current.handlers.onPointerUp(pe({ pointerId: 2, clientX: 200, clientY: 200, timeStamp: 80 })));
    expect(onShoot).not.toHaveBeenCalled();
    expect(result.current.aim?.power).toBeCloseTo(0.5, 6);

    act(() => result.current.handlers.onPointerUp(pe({ pointerId: 1, clientX: 80, clientY: 100, timeStamp: 200 })));
    expect(onShoot).toHaveBeenCalledTimes(1);
    expect(onShoot.mock.calls[0][0].power).toBeCloseTo(0.5, 6);
  });
});

describe("the finger rolling off the glass", () => {
  it("fires the aim that was held, not the twitch just before release", () => {
    const { result } = setup();
    act(() => result.current.handlers.onPointerDown(pe({ clientX: 100, clientY: 100, timeStamp: 0 })));
    for (let t = 16; t <= 192; t += 16) {
      act(() => result.current.handlers.onPointerMove(pe({ clientX: 76, clientY: 100, timeStamp: t })));
    }
    act(() => result.current.handlers.onPointerMove(pe({ clientX: 76, clientY: 107, timeStamp: 290 })));

    act(() => result.current.handlers.onPointerUp(pe({ clientX: 76, clientY: 107, timeStamp: 300 })));

    expect(onShoot).toHaveBeenCalledTimes(1);
    expect(onShoot.mock.calls[0][0].angle).toBeCloseTo(0, 6);
  });
});
