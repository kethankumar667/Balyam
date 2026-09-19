import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GameTutorial, { type TutorialSlide } from "../GameTutorial";

const ACADEMY_KEY = "uno.tutorial.completed.v2"; // "uno" has an academy spec
const CUSTOM_KEY = "custom.tutorial.completed.v1"; // no academy spec -> slide deck
const SLIDES: TutorialSlide[] = [
  { emoji: "A", title: "First slide", body: "Roll the dice." },
  { emoji: "B", title: "Second slide", body: "Move your token." },
];

/**
 * GameTutorial chooses between the rich Game Academy modal (when the game has a spec,
 * picked from the storage key's first segment) and a plain slide deck. The deck used
 * to call its hooks AFTER the academy early-return, so a mounted instance whose key
 * changed between the two would throw "Rendered more hooks than during the previous
 * render". Each branch is now its own component.
 */
describe("GameTutorial", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the Game Academy for a game that has an academy spec", () => {
    render(<GameTutorial storageKey={ACADEMY_KEY} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /got it!/i })).not.toBeInTheDocument();
  });

  it("falls back to the slide deck when the game has no academy spec", () => {
    render(<GameTutorial storageKey={CUSTOM_KEY} slides={SLIDES} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "First slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument();
  });

  it("walks the deck, and finishing marks it seen and closes exactly once", () => {
    const onClose = vi.fn();
    render(<GameTutorial storageKey={CUSTOM_KEY} slides={SLIDES} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByRole("heading", { name: "Second slide" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /got it!/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CUSTOM_KEY)).toBe("1");
  });

  it("skipping also marks the tutorial seen", () => {
    const onClose = vi.fn();
    render(<GameTutorial storageKey={CUSTOM_KEY} slides={SLIDES} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CUSTOM_KEY)).toBe("1");
  });

  it("does not throw when a mounted instance switches between an academy game and a custom deck", () => {
    const view = render(<GameTutorial storageKey={ACADEMY_KEY} onClose={vi.fn()} />);
    expect(() => view.rerender(<GameTutorial storageKey={CUSTOM_KEY} slides={SLIDES} onClose={vi.fn()} />)).not.toThrow();
    expect(screen.getByRole("heading", { name: "First slide" })).toBeInTheDocument();

    expect(() => view.rerender(<GameTutorial storageKey={ACADEMY_KEY} onClose={vi.fn()} />)).not.toThrow();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders nothing for an unknown game with no slides", () => {
    const { container } = render(<GameTutorial storageKey={CUSTOM_KEY} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
