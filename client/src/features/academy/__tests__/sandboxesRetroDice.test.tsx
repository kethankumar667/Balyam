import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RetroMiniSandbox } from "../components/sandboxes/RetroMiniSandbox";
import { DiceRollSandbox } from "../components/sandboxes/DiceRollSandbox";

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: {
    getInstance: () => ({ subtle: vi.fn(), win: vi.fn() }),
  },
}));

const SCORE_PER_FOOD = 10;
const ROLL_ANIMATION_MS = 600;

function move(direction: "up" | "down" | "left" | "right", times = 1): void {
  const name = `Move ${direction}`;
  for (let step = 0; step < times; step += 1) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
}

function scoreText(): string {
  return screen.getByText(/SCORE:/).textContent ?? "";
}

describe("RetroMiniSandbox", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scores exactly once per food eaten under React.StrictMode", () => {
    const onComplete = vi.fn();
    render(
      <React.StrictMode>
        <RetroMiniSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    expect(scoreText()).toBe("SCORE: 0");

    // Player starts at (4,4); first food sits at (6,3).
    move("right", 2);
    move("up");
    expect(scoreText()).toBe(`SCORE: ${SCORE_PER_FOOD}`);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // With Math.random() === 0 the next food respawns at (1,1).
    move("left", 5);
    move("up", 2);
    expect(scoreText()).toBe(`SCORE: ${SCORE_PER_FOOD * 2}`);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not eat the respawned food from the stale first position", () => {
    render(
      <React.StrictMode>
        <RetroMiniSandbox />
      </React.StrictMode>,
    );
    move("right", 2);
    move("up");
    // Walking back over the OLD food cell must not score again.
    move("down");
    move("up");
    expect(scoreText()).toBe(`SCORE: ${SCORE_PER_FOOD}`);
  });

  it("does not promise XP or a real reward and announces progress politely", () => {
    const { container } = render(<RetroMiniSandbox />);
    move("right", 2);
    move("up");
    expect(container.textContent).not.toMatch(/XP|coins?/i);
    expect(screen.getByRole("status").textContent).toMatch(/food collected/i);
  });

  it("keeps the player inside the LCD grid", () => {
    render(<RetroMiniSandbox />);
    move("left", 20);
    move("up", 20);
    // No crash and no score from bumping walls.
    expect(scoreText()).toBe("SCORE: 0");
  });
});

describe("DiceRollSandbox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function rollButton(): HTMLElement {
    return screen.getByRole("button", { name: /Roll tactical dice/ });
  }

  it("never calls onComplete when unmounted mid-roll", () => {
    const onComplete = vi.fn();
    const { unmount } = render(<DiceRollSandbox onComplete={onComplete} />);
    fireEvent.click(rollButton());
    unmount();
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS * 3);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does not update state after unmount", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<DiceRollSandbox />);
    fireEvent.click(rollButton());
    unmount();
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS * 3);
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("launches the token and completes exactly once", () => {
    const onComplete = vi.fn();
    render(
      <React.StrictMode>
        <DiceRollSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    fireEvent.click(rollButton());
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toMatch(/Rolled 6/);

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    fireEvent.click(rollButton());
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores a second roll while the first is still animating", () => {
    const onComplete = vi.fn();
    render(<DiceRollSandbox onComplete={onComplete} />);
    fireEvent.click(rollButton());
    fireEvent.click(rollButton());
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS * 3);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows no XP claim once the mechanic is validated", () => {
    const { container } = render(<DiceRollSandbox />);
    fireEvent.click(rollButton());
    act(() => {
      vi.advanceTimersByTime(ROLL_ANIMATION_MS);
    });
    expect(container.textContent).not.toMatch(/XP|coins?/i);
    expect(container.textContent).toMatch(/Demo complete/i);
  });
});
