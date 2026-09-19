import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HoloDeckOnboardingModal } from "../HoloDeckOnboardingModal";
import { journeyTracker } from "../PlayerJourneyTracker";
import { AudioManager } from "../../../services/AudioManager";

const ONBOARDING_KEY = "bhalyam.onboarding.state";
const STAGE_COUNT = 5;

function renderTour() {
  const onClose = vi.fn();
  const onStartQuest = vi.fn();
  const view = render(<HoloDeckOnboardingModal open onClose={onClose} onStartQuest={onStartQuest} />);
  return { onClose, onStartQuest, ...view };
}

/**
 * The visible text of the whole dialog for each stage, in order. AnimatePresence keeps the
 * previous stage's body mounted until its exit animation finishes, so each read waits for
 * the new stage's badge — otherwise every "stage" would just be stage 1 again.
 */
async function readEveryStage(): Promise<string[]> {
  const texts: string[] = [];
  for (let stage = 1; stage <= STAGE_COUNT; stage++) {
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain(`STAGE 0${stage} //`));
    texts.push(screen.getByRole("dialog").textContent ?? "");
    if (stage < STAGE_COUNT) {
      fireEvent.click(screen.getByRole("button", { name: /→$/ }));
    }
  }
  return texts;
}

/**
 * Nothing rendered this modal before. The tour used to promise "+50 XP" and play a
 * coin-rain sound on the last stage although nothing was ever granted; it also made
 * claims about latency, spatial audio and privacy that the product cannot back.
 */
describe("HoloDeckOnboardingModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("is a named dialog that starts on the first stage", () => {
    renderTour();
    expect(screen.getByRole("dialog", { name: /ultimate multiplayer lounge/i })).toBeInTheDocument();
    expect(screen.getByText(/stage 1 of 5/i)).toBeInTheDocument();
  });

  it("really reads five different stages (guards the checks below against re-reading stage 1)", async () => {
    renderTour();
    const texts = await readEveryStage();
    expect(texts).toHaveLength(STAGE_COUNT);
    const badges = texts.map((text) => text.match(/STAGE 0\d/)?.[0]);
    expect(new Set(badges).size).toBe(STAGE_COUNT);
  });

  it("never promises XP, coins or a reward on any stage", async () => {
    renderTour();
    for (const text of await readEveryStage()) {
      expect(text).not.toMatch(/\bXP\b|coin|reward|claim/i);
    }
  });

  it("makes no claims about latency, spatial audio or privacy that the product cannot back", async () => {
    renderTour();
    const texts = (await readEveryStage()).join(" ");
    expect(texts).not.toMatch(/zero latency|spatial audio|privacy-respecting|100% fair|pay-to-win/i);
  });

  it("finishing the tour records it, closes once, starts the quest once and plays no reward sound", async () => {
    const play = vi.spyOn(AudioManager, "play").mockImplementation(() => undefined);
    const { onClose, onStartQuest } = renderTour();
    await readEveryStage();

    fireEvent.click(screen.getByRole("button", { name: /enter the lounge/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStartQuest).toHaveBeenCalledTimes(1);
    expect(journeyTracker.getState().hasCompletedWelcome).toBe(true);
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "{}").hasCompletedWelcome).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it("skipping records it and closes without starting the quest", () => {
    const { onClose, onStartQuest } = renderTour();
    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStartQuest).not.toHaveBeenCalled();
    expect(journeyTracker.getState().hasCompletedWelcome).toBe(true);
  });

  it("a stray tap outside the card does not skip the first-run tour", () => {
    const { onClose } = renderTour();
    // Modal's backdrop closes on mousedown when the press lands on the backdrop itself.
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers Back only after the first stage, and Back returns to it", () => {
    renderTour();
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /→$/ }));
    expect(screen.getByText(/stage 2 of 5/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByText(/stage 1 of 5/i)).toBeInTheDocument();
  });

  it("marks the current stage dot and lets you jump straight to another stage", () => {
    renderTour();
    expect(screen.getByRole("button", { name: "Jump to stage 1" })).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: "Jump to stage 3" }));
    expect(screen.getByText(/stage 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jump to stage 3" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Jump to stage 1" })).not.toHaveAttribute("aria-current");
  });

  it("keeps keyboard focus where the user put it when the tour re-renders (no focus stealing)", () => {
    const view = renderTour();
    const dot = screen.getByRole("button", { name: "Jump to stage 3" });
    dot.focus();
    fireEvent.click(dot);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Jump to stage 3" }));

    // A parent re-render hands the tour brand-new callbacks; that must not move focus either.
    view.rerender(<HoloDeckOnboardingModal open onClose={vi.fn()} onStartQuest={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Jump to stage 3" }));
  });

  it("gives every control a touch target of at least 44px in both directions", () => {
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: /→$/ }));
    for (const name of [/skip tour/i, /jump to stage 1/i, /^back$/i, /→$/]) {
      const { className } = screen.getByRole("button", { name });
      expect(className, String(name)).toMatch(/min-h-\[44px\]/);
    }
    expect(screen.getByRole("button", { name: /jump to stage 1/i }).className).toMatch(/min-w-\[44px\]/);
  });

  it("renders nothing when closed", () => {
    render(<HoloDeckOnboardingModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
