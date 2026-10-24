import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { STREAK_REWARDS_SCHEDULE, type DailyStreakState } from "@shared/streak-types";
import DailyStreakModalDesktop from "../DailyStreakModalDesktop";
import DailyStreakModalMobile from "../DailyStreakModalMobile";
import { useStreakStore } from "../../../store/streakStore";

vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: vi.fn() } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

function seed(overrides: Partial<DailyStreakState> = {}) {
  useStreakStore.setState({ state: {
    playerId: "expedition-test", currentStreak: 16, longestStreak: 22,
    cycleCount: 0, lastClaimedDate: "2026-10-24", lastClaimedAt: Date.now(),
    isClaimableToday: false, todayUtcDate: "2026-10-24", activeDayInCycle: 16,
    nextResetAt: Date.now() + 3_600_000, shieldsRemaining: 2, history: [],
    schedule: STREAK_REWARDS_SCHEDULE.map((reward) => ({ ...reward, status: reward.day <= 16 ? "CLAIMED" : "LOCKED" })),
    ...overrides,
  } });
}
afterEach(() => { useStreakStore.getState().resetTransientState(); });

describe("reference-style rewards expedition", () => {
  it("shows today's real day-16 grant, milestone progress, reward preview and shield balance", () => {
    seed();
    render(<DailyStreakModalDesktop onClose={vi.fn()} />);
    expect(screen.getByText("+700 Coins")).toBeInTheDocument();
    expect(screen.getByText("Today secured!")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /next milestone/i })).toHaveAttribute("aria-valuenow", "16");
    expect(screen.getByText("2 shields available")).toBeInTheDocument();
    expect(screen.getByText("22 days")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Preview rewards"));
    expect(screen.getByText("Preview rewards").closest("details")).toHaveAttribute("open");
    expect(screen.getAllByText(/Solar Flare frame/i).some((element) => element.closest("details"))).toBe(true);
  });

  it("does not call a new member's first day secured or claimable", () => {
    seed({ firstClaimAt: Date.now() + 3_600_000, currentStreak: 0, activeDayInCycle: 1,
      schedule: STREAK_REWARDS_SCHEDULE.map((reward) => ({ ...reward, status: "LOCKED" })) });
    render(<DailyStreakModalDesktop onClose={vi.fn()} />);
    expect(screen.getByText("Starts tomorrow")).toBeInTheDocument();
    expect(screen.queryByText("Today secured!")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^claim/i })).not.toBeInTheDocument();
  });

  it("gives mobile journey explicit previous and next controls", () => {
    seed();
    render(<DailyStreakModalMobile onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous waypoints" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next waypoints" })).toBeInTheDocument();
  });
});
