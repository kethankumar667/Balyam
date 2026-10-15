import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ArcadeChestOpeningModal } from "../ArcadeChestOpeningModal";
import type { LootItem } from "../types";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: vi.fn() } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

const ITEMS: LootItem[] = [
  { id: "a", type: "coins", title: "500 Coins", amount: 500, rarity: "rare" },
  { id: "b", type: "title", title: "Early Bird", rarity: "epic" },
];

/** Long enough to cover the rumble (450 ms) and burst (700 ms) steps. */
const SEQUENCE_MS = 1_200;

function renderModal(overrides: Partial<React.ComponentProps<typeof ArcadeChestOpeningModal>> = {}) {
  const onClose = vi.fn();
  render(
    <ArcadeChestOpeningModal
      isOpen
      tier="gold"
      chestTitle="Day 7 Milestone Chest"
      items={ITEMS}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onClose };
}

const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(window, { key, ...init });

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("ArcadeChestOpeningModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts sealed, waiting for the player to unlock it", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Day 7 Milestone Chest" })).toBeDefined();
    expect(screen.getByRole("button", { name: /tap to unlock/i })).toBeDefined();
  });

  it("walks rumble, burst, then reveals the first card", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /tap to unlock/i }));
    advance(SEQUENCE_MS);
    expect(screen.getByText("Remaining Items:")).toBeDefined();
    expect(screen.getByText("500 Coins")).toBeDefined();
  });

  it("stays on the summary when Skip is pressed mid-rumble (the pending burst must not overrule it)", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /tap to unlock/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    advance(SEQUENCE_MS);
    expect(screen.getByText("All Rewards Unlocked!")).toBeDefined();
    expect(screen.queryByText("Remaining Items:")).toBeNull();
  });

  it("shows every item and the caller's footnote on the summary, then closes on Collect All", () => {
    const { onClose } = renderModal({ footnote: "Coins arrive in 3 hr." });
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(screen.getByText("500 Coins")).toBeDefined();
    expect(screen.getByText("Early Bird")).toBeDefined();
    expect(screen.getByText("Coins arrive in 3 hr.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /collect all/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("advances one card per Enter press and lands on the summary after the last", () => {
    renderModal();
    press("Enter");
    advance(SEQUENCE_MS);
    press("Enter");
    expect(screen.getByText("Early Bird")).toBeDefined();
    press("Enter");
    expect(screen.getByText("All Rewards Unlocked!")).toBeDefined();
  });

  it("ignores a held key so one long press cannot race through the cards and close the summary", () => {
    const { onClose } = renderModal();
    press("Enter");
    advance(SEQUENCE_MS);
    press("Enter", { repeat: true });
    press("Enter", { repeat: true });
    press("Enter", { repeat: true });
    expect(screen.queryByText("All Rewards Unlocked!")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape skips to the summary first and closes only from the summary", () => {
    const { onClose } = renderModal();
    press("Escape");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("All Rewards Unlocked!")).toBeDefined();
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Escape from reaching a dialog underneath it (the roadmap's focus trap)", () => {
    const underneath = vi.fn();
    window.addEventListener("keydown", underneath);
    renderModal();
    press("Escape");
    window.removeEventListener("keydown", underneath);
    expect(underneath).not.toHaveBeenCalled();
  });

  it("renders above the level roadmap (z-[90]) and its coin rain (z-[100])", () => {
    renderModal();
    expect(screen.getByRole("dialog").className).toContain("z-[120]");
  });

  it("falls back to a bonus card instead of an empty ceremony", () => {
    renderModal({ items: [] });
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(screen.getByText("Bonus Coins")).toBeDefined();
  });

  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
