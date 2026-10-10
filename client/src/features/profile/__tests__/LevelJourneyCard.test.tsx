import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LevelJourneyCard from "../LevelJourneyCard";

/** Reduced motion on, so the card paints its finished state (no counting up) and the numbers can be asserted directly. */
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

describe("LevelJourneyCard", () => {
  it("shows the real level, title, XP into the level and lifetime XP", () => {
    render(<LevelJourneyCard experiencePoints={265} />);

    expect(screen.getByRole("heading", { name: "Level & XP" })).toBeTruthy();
    expect(screen.getByText("Trainee")).toBeTruthy();
    expect(screen.getByText("/ 100 XP")).toBeTruthy();
    expect(screen.getByText("265")).toBeTruthy();
  });

  it("exposes the XP bar to assistive tech with the real values", () => {
    render(<LevelJourneyCard experiencePoints={265} />);

    const bar = screen.getByRole("progressbar", { name: /level 3 experience/i });

    expect(bar.getAttribute("aria-valuenow")).toBe("65");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("says what the next level takes and lists the ways to earn from the XP config", () => {
    render(<LevelJourneyCard experiencePoints={265} />);

    expect(screen.getByText("One win takes you to Level 4.")).toBeTruthy();
    expect(screen.getByText("+35")).toBeTruthy();
    expect(screen.getByText("+10")).toBeTruthy();
    expect(screen.getByText("+15")).toBeTruthy();
  });

  it("marks the nearest reward as next and lists the ones after it", () => {
    render(<LevelJourneyCard experiencePoints={265} />);

    expect(screen.getByText("Next")).toBeTruthy();
    expect(screen.getByText("+250")).toBeTruthy();
    expect(screen.getByText(/Level 5 · 2 levels away/)).toBeTruthy();
  });

  it("opens the level roadmap from the Roadmap button", () => {
    render(<LevelJourneyCard experiencePoints={265} />);

    fireEvent.click(screen.getByRole("button", { name: /roadmap/i }));

    // The roadmap is a dialog; once open it is in the document.
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });

  it("says so when every milestone has been reached", () => {
    render(<LevelJourneyCard experiencePoints={1_000_000} />);

    expect(screen.getByText(/reached every milestone/i)).toBeTruthy();
  });
});
