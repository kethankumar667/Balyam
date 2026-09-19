import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QuantumGridSandbox } from "../components/sandboxes/QuantumGridSandbox";

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: {
    getInstance: () => ({ subtle: vi.fn(), win: vi.fn() }),
  },
}));

const VAPORISE_WINDOW_MS = 300;
const GRID_CELL_COUNT = 9;
const MAX_PIECES = 3;

function cell(index: number): HTMLElement {
  return screen.getByRole("button", { name: new RegExp(`^Cell ${index}, `) });
}

function placedCells(): HTMLElement[] {
  return screen.queryAllByRole("button", { name: /X placed/ });
}

function placedLabels(): string[] {
  return placedCells().map((el) => el.getAttribute("aria-label") ?? "");
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("QuantumGridSandbox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives every cell an accessible name and renders real buttons", () => {
    render(<QuantumGridSandbox />);
    const buttons = screen
      .getAllByRole("button")
      .filter((el) => /^Cell \d, /.test(el.getAttribute("aria-label") ?? ""));
    expect(buttons).toHaveLength(GRID_CELL_COUNT);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("type")).toBe("button");
    }
    expect(cell(1).getAttribute("aria-label")).toBe("Cell 1, X placed, oldest");
    expect(cell(5).getAttribute("aria-label")).toBe("Cell 5, X placed");
    expect(cell(2).getAttribute("aria-label")).toBe("Cell 2, empty");
  });

  it("evaporates the oldest piece on the 4th placement", () => {
    const onComplete = vi.fn();
    render(<QuantumGridSandbox onComplete={onComplete} />);

    fireEvent.click(cell(2));
    advance(VAPORISE_WINDOW_MS);

    expect(placedCells()).toHaveLength(MAX_PIECES);
    expect(cell(1).getAttribute("aria-label")).toBe("Cell 1, empty");
    expect(cell(2).getAttribute("aria-label")).toMatch(/X placed/);
    expect(cell(5).getAttribute("aria-label")).toBe(
      "Cell 5, X placed, oldest",
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores a second click inside the 300 ms vaporise window", () => {
    const onComplete = vi.fn();
    render(<QuantumGridSandbox onComplete={onComplete} />);

    fireEvent.click(cell(2));
    fireEvent.click(cell(3));
    fireEvent.click(cell(4));
    advance(VAPORISE_WINDOW_MS);

    const labels = placedLabels();
    expect(labels).toHaveLength(MAX_PIECES);
    expect(new Set(labels).size).toBe(labels.length);
    expect(
      labels.filter((label) => label.endsWith("oldest")),
    ).toHaveLength(1);
    // The first accepted placement wins; clicks inside the window are ignored.
    expect(labels).toEqual([
      "Cell 2, X placed",
      "Cell 5, X placed, oldest",
      "Cell 9, X placed",
    ]);
    expect(cell(3).getAttribute("aria-label")).toBe("Cell 3, empty");
    expect(cell(4).getAttribute("aria-label")).toBe("Cell 4, empty");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps the 3-piece invariant and completes once across many placements", () => {
    const onComplete = vi.fn();
    render(<QuantumGridSandbox onComplete={onComplete} />);

    for (const target of [2, 3, 4, 6, 7, 1]) {
      fireEvent.click(cell(target));
      advance(VAPORISE_WINDOW_MS);
      expect(placedCells()).toHaveLength(MAX_PIECES);
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("never fires onComplete when unmounted before the timer elapses", () => {
    const onComplete = vi.fn();
    const { unmount } = render(<QuantumGridSandbox onComplete={onComplete} />);

    fireEvent.click(cell(2));
    unmount();
    advance(VAPORISE_WINDOW_MS * 4);

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("cancels the pending vaporise when the grid is reset", () => {
    const onComplete = vi.fn();
    render(<QuantumGridSandbox onComplete={onComplete} />);

    fireEvent.click(cell(2));
    fireEvent.click(screen.getByRole("button", { name: /Reset Grid/ }));
    advance(VAPORISE_WINDOW_MS * 2);

    expect(onComplete).not.toHaveBeenCalled();
    expect(placedLabels()).toEqual([
      "Cell 1, X placed, oldest",
      "Cell 5, X placed",
      "Cell 9, X placed",
    ]);
    // The grid is usable again after the reset.
    fireEvent.click(cell(2));
    advance(VAPORISE_WINDOW_MS);
    expect(placedCells()).toHaveLength(MAX_PIECES);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not double-complete under React.StrictMode", () => {
    const onComplete = vi.fn();
    render(
      <React.StrictMode>
        <QuantumGridSandbox onComplete={onComplete} />
      </React.StrictMode>,
    );
    fireEvent.click(cell(2));
    fireEvent.click(cell(3));
    advance(VAPORISE_WINDOW_MS);
    expect(placedCells()).toHaveLength(MAX_PIECES);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("announces queue changes through a status region", () => {
    render(<QuantumGridSandbox />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/3\/3/);
  });
});
