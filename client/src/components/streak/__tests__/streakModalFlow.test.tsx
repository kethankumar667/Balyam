import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAuthStore } from "../../../store/authStore";
import { useStreakStore } from "../../../store/streakStore";
import { DailyStreakEntryChip } from "../DailyStreakEntryChip";
import { DailyStreakModal } from "../DailyStreakModal";
import * as playerIdentity from "../../../lib/playerIdentity";
import * as useEconomy from "../../../hooks/useEconomy";
import { STREAK_REWARDS_SCHEDULE, type DailyStreakState, type DailyStreakClaimResult } from "@shared/streak-types";

import type { MockInstance } from "vitest";

// Mock audio & haptics to prevent side-effects in headless environment
vi.mock("../../../services/AudioManager", () => ({
  AudioManager: { play: vi.fn() },
}));

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: { trigger: vi.fn() },
}));

// Mock useViewport to default to desktop
vi.mock("../../../lib/useViewport", () => ({
  useViewport: () => "desktop",
}));

// Sample mock unclaimed streak state
function createMockStreakState(overrides: Partial<DailyStreakState> = {}): DailyStreakState {
  return {
    playerId: "user-test-123",
    currentStreak: 3,
    longestStreak: 5,
    cycleCount: 1,
    lastClaimedDate: "2026-09-08",
    lastClaimedAt: Date.now() - 86400000,
    isClaimableToday: true,
    todayUtcDate: "2026-09-09",
    activeDayInCycle: 4,
    nextResetAt: Date.now() + 36000000,
    shieldsRemaining: 1,
    history: ["2026-09-06", "2026-09-07", "2026-09-08"],
    schedule: STREAK_REWARDS_SCHEDULE.map((item) => ({
      ...item,
      status: item.day < 4 ? "CLAIMED" : item.day === 4 ? "CLAIMABLE" : "LOCKED",
    })),
    ...overrides,
  };
}

describe("Daily Streak Reward Flow & Modal Orchestration", () => {
  let refreshWalletSpy: MockInstance<[], Promise<void>>;
  let apiJsonSpy: MockInstance<[path: string, init?: RequestInit], Promise<unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    useStreakStore.getState().resetTransientState();

    refreshWalletSpy = vi.spyOn(useEconomy, "refreshCurrentWallet").mockResolvedValue();
    apiJsonSpy = vi.spyOn(playerIdentity, "apiJson");
  });

  afterEach(() => {
    useStreakStore.getState().resetTransientState();
    useAuthStore.setState({
      ready: true,
      userId: null,
      kind: "guest",
      isMember: false,
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * 1. Auto-Open Triggering
   * ───────────────────────────────────────────────────────────────────────── */
  describe("Auto-Open Triggering", () => {
    it("auto-opens claim modal when user is authenticated, streak is unclaimed, and not yet opened in session", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha-99",
        isMember: true,
      });

      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
        hasAutoOpenedInSession: false,
      });

      render(<DailyStreakModal />);

      await waitFor(() => {
        expect(useStreakStore.getState().isOpen).toBe(true);
        expect(useStreakStore.getState().viewMode).toBe("reward");
        expect(useStreakStore.getState().hasAutoOpenedInSession).toBe(true);
      });

      // Reward claim screen must be visible with today's reward
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText(/Day 4 Ready to Claim/i)).toBeDefined();
      expect(screen.getByText(/CLAIM \+180 COINS/i)).toBeDefined();
    });

    it("does NOT auto-open when user is unauthenticated (guest / userId is null)", async () => {
      useAuthStore.setState({
        ready: true,
        userId: null,
        isMember: false,
      });

      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
        hasAutoOpenedInSession: false,
      });

      render(<DailyStreakModal />);

      // Wait a tick to confirm no auto-open triggers
      await new Promise((r) => setTimeout(r, 50));
      expect(useStreakStore.getState().isOpen).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("does NOT auto-open when auth is not ready yet", async () => {
      useAuthStore.setState({
        ready: false,
        userId: "user-alpha-99",
        isMember: true,
      });

      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
        hasAutoOpenedInSession: false,
      });

      render(<DailyStreakModal />);

      await new Promise((r) => setTimeout(r, 50));
      expect(useStreakStore.getState().isOpen).toBe(false);
    });

    it("does NOT auto-open when today's reward is already claimed", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha-99",
        isMember: true,
      });

      const mockState = createMockStreakState({ isClaimableToday: false });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
        hasAutoOpenedInSession: false,
      });

      render(<DailyStreakModal />);

      await new Promise((r) => setTimeout(r, 50));
      expect(useStreakStore.getState().isOpen).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("does NOT auto-open if already opened or dismissed in current session", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha-99",
        isMember: true,
      });

      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
        hasAutoOpenedInSession: true, // Already dismissed earlier in this mounted tab
      });

      render(<DailyStreakModal />);

      await new Promise((r) => setTimeout(r, 50));
      expect(useStreakStore.getState().isOpen).toBe(false);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * 2. Session Dismissal & Manual Reopening
   * ───────────────────────────────────────────────────────────────────────── */
  describe("Dismissal & Header Chip Navigation", () => {
    it("dismissing modal leaves reward claimable, suppresses auto-open, but keeps indicator active", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha-99",
        isMember: true,
      });

      const mockState = createMockStreakState({ isClaimableToday: true, currentStreak: 5 });
      useStreakStore.setState({
        state: mockState,
        isOpen: true,
        viewMode: "reward",
        hasAutoOpenedInSession: false,
      });

      render(
        <>
          <DailyStreakEntryChip />
          <DailyStreakModal />
        </>
      );

      // Verify open
      expect(screen.getByRole("dialog")).toBeDefined();

      // Close modal by clicking close button
      const closeBtn = screen.getByRole("button", { name: /Close/i });
      fireEvent.click(closeBtn);

      // Modal is closed, but reward is STILL claimable
      expect(useStreakStore.getState().isOpen).toBe(false);
      expect(useStreakStore.getState().hasAutoOpenedInSession).toBe(true);
      expect(useStreakStore.getState().state?.isClaimableToday).toBe(true);

      // Chip still displays claimable status
      const chip = screen.getByRole("button", { name: /Reward Ready to Claim/i });
      expect(chip).toBeDefined();

      // Clicking chip reopens the claim modal
      fireEvent.click(chip);
      expect(useStreakStore.getState().isOpen).toBe(true);
      expect(useStreakStore.getState().viewMode).toBe("reward");
    });

    it("clicking header streak chip when unclaimed opens claim modal", () => {
      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
      });

      render(<DailyStreakEntryChip />);
      const chip = screen.getByRole("button", { name: /Reward Ready to Claim/i });
      fireEvent.click(chip);

      expect(useStreakStore.getState().isOpen).toBe(true);
      expect(useStreakStore.getState().viewMode).toBe("reward");
    });

    it("clicking header streak chip when already claimed opens Rewards Expedition modal (journey)", () => {
      const mockState = createMockStreakState({ isClaimableToday: false, currentStreak: 7 });
      useStreakStore.setState({
        state: mockState,
        isOpen: false,
      });

      render(<DailyStreakEntryChip />);
      const chip = screen.getByRole("button", { name: /Daily Login Streak: 7 days/i });
      fireEvent.click(chip);

      expect(useStreakStore.getState().isOpen).toBe(true);
      expect(useStreakStore.getState().viewMode).toBe("journey");
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * 3. Idempotent Claim, Wallet Sync & Notification Dismissal
   * ───────────────────────────────────────────────────────────────────────── */
  describe("Idempotent Claim & State Synchronization", () => {
    it("executes claim, updates state, refreshes wallet, and removes notification beacon", async () => {
      const mockState = createMockStreakState({ isClaimableToday: true, activeDayInCycle: 4 });
      const updatedState = createMockStreakState({
        isClaimableToday: false,
        currentStreak: 4,
        activeDayInCycle: 4,
      });

      const claimResult: DailyStreakClaimResult = {
        success: true,
        code: "SUCCESS",
        message: "Claimed successfully",
        claimedDay: 4,
        reward: { day: 4, coins: 180, description: "Day 4 Consistency Grant" },
        coinsAwarded: 180,
        newStreak: 4,
        cycleCompleted: false,
        cycleCount: 1,
        shieldUsed: false,
        walletBalance: "5000",
        updatedState,
      };

      let currentServerState = mockState;
      apiJsonSpy.mockImplementation(async (path: string) => {
        if (path === "/api/streak/claim") {
          currentServerState = updatedState;
          return claimResult;
        }
        if (path === "/api/streak") {
          return currentServerState;
        }
        return null;
      });

      useStreakStore.setState({
        state: mockState,
        isOpen: true,
        viewMode: "reward",
      });

      render(
        <>
          <DailyStreakEntryChip />
          <DailyStreakModal />
        </>
      );

      // Verify claimable button exists
      const claimBtn = screen.getByRole("button", { name: /CLAIM \+180 COINS/i });
      expect(claimBtn).toBeDefined();

      // Click claim
      fireEvent.click(claimBtn);

      await waitFor(() => {
        expect(apiJsonSpy).toHaveBeenCalledWith("/api/streak/claim", { method: "POST" });
        expect(refreshWalletSpy).toHaveBeenCalledTimes(1);
        expect(useStreakStore.getState().state?.isClaimableToday).toBe(false);
        expect(useStreakStore.getState().showCelebration).toBe(true);
        expect(screen.queryByRole("button", { name: /Reward Ready to Claim/i })).toBeNull();
        expect(screen.getByRole("button", { name: /Daily Login Streak: 4 days/i })).toBeDefined();
      });
    });

    it("handles claim failure gracefully with error alert and permits retry", async () => {
      const mockState = createMockStreakState({ isClaimableToday: true, activeDayInCycle: 4 });
      useStreakStore.setState({
        state: mockState,
        isOpen: true,
        viewMode: "reward",
      });

      // Simulate network / server error returning null
      apiJsonSpy.mockResolvedValueOnce(null);

      render(<DailyStreakModal />);

      const claimBtn = screen.getByRole("button", { name: /CLAIM \+180 COINS/i });
      fireEvent.click(claimBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeDefined();
        expect(screen.getByText(/Failed to claim reward. Please try again./i)).toBeDefined();
      });

      // Claim state remains active and button is re-enabled for retry
      expect(useStreakStore.getState().state?.isClaimableToday).toBe(true);
      expect(claimBtn.hasAttribute("disabled")).toBe(false);
      expect(refreshWalletSpy).not.toHaveBeenCalled();
    });

    it("strictly prevents concurrent duplicate claim invocations (idempotency)", async () => {
      const mockState = createMockStreakState({ isClaimableToday: true });
      useStreakStore.setState({
        state: mockState,
        isClaiming: true, // Already in flight
      });

      const result = await useStreakStore.getState().claimToday();
      expect(result).toBeNull();
      expect(apiJsonSpy).not.toHaveBeenCalled();
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * 4. Identity Boundary & Account Switching
   * ───────────────────────────────────────────────────────────────────────── */
  describe("Identity Boundary & Data Leak Prevention", () => {
    it("resets transient streak store state on user sign out", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha",
        isMember: true,
      });

      useStreakStore.setState({
        state: createMockStreakState({ currentStreak: 12 }),
        isOpen: true,
        hasAutoOpenedInSession: true,
        showCelebration: true,
      });

      // Trigger sign out
      await useAuthStore.getState().signOut();

      // Streak store must be completely cleansed
      expect(useStreakStore.getState().state).toBeNull();
      expect(useStreakStore.getState().isOpen).toBe(false);
      expect(useStreakStore.getState().hasAutoOpenedInSession).toBe(false);
      expect(useStreakStore.getState().showCelebration).toBe(false);
    });

    it("resets streak state when userId changes to another account", async () => {
      useAuthStore.setState({
        ready: true,
        userId: "user-alpha",
        isMember: true,
      });

      useStreakStore.setState({
        state: createMockStreakState({ currentStreak: 12 }),
        isOpen: true,
      });

      render(<DailyStreakModal />);

      // Switch to another user
      useAuthStore.setState({
        userId: "user-beta",
      });

      await waitFor(() => {
        expect(useStreakStore.getState().isOpen).toBe(false);
      });
    });
  });
});
