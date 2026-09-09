/**
 * 30-Day Daily Login Streak Store
 *
 * Client state management for daily streak progress, claim mutations,
 * countdown timers to next UTC reset, and celebration overlays.
 */

import { create } from "zustand";
import {
  type DailyStreakState,
  type DailyStreakClaimResult,
} from "@shared/streak-types";
import { apiJson } from "../lib/playerIdentity";
import { refreshCurrentWallet } from "../hooks/useEconomy";

export function formatTimeRemaining(nextResetAt: number): string {
  const diffMs = Math.max(0, nextResetAt - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

export type StreakModalView = "reward" | "journey";

export interface StreakStore {
  state: DailyStreakState | null;
  isOpen: boolean;
  viewMode: StreakModalView;
  isLoading: boolean;
  isClaiming: boolean;
  latestClaimResult: DailyStreakClaimResult | null;
  showCelebration: boolean;
  timeUntilReset: string;
  hasAutoOpenedInSession: boolean;

  fetchStreak: () => Promise<void>;
  claimToday: () => Promise<DailyStreakClaimResult | null>;
  openModal: (targetView?: StreakModalView) => void;
  openClaimModal: () => void;
  openExpeditionModal: () => void;
  closeModal: () => void;
  setViewMode: (viewMode: StreakModalView) => void;
  clearCelebration: () => void;
  updateTimeRemaining: () => void;
  setDismissed: () => void;
  resetTransientState: () => void;
}

export const useStreakStore = create<StreakStore>((set, get) => ({
  state: null,
  isOpen: false,
  viewMode: "reward",
  isLoading: false,
  isClaiming: false,
  latestClaimResult: null,
  showCelebration: false,
  timeUntilReset: "24:00:00",
  hasAutoOpenedInSession: false,

  updateTimeRemaining: () => {
    const current = get().state;
    if (!current?.nextResetAt) return;
    const formatted = formatTimeRemaining(current.nextResetAt);
    set({ timeUntilReset: formatted });
  },

  fetchStreak: async () => {
    set({ isLoading: true });
    try {
      const data = await apiJson<DailyStreakState>("/api/streak");
      if (data) {
        set({
          state: data,
          timeUntilReset: formatTimeRemaining(data.nextResetAt),
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  claimToday: async () => {
    const { isClaiming, state } = get();
    if (isClaiming || !state || !state.isClaimableToday) return null;

    set({ isClaiming: true });
    try {
      // No body: the server derives its own day + dedup key from the
      // authenticated caller. A client-supplied idempotency key used to be
      // honored here, which let concurrent claims (each with a fresh key)
      // race past the daily limit and get credited more than once.
      const result = await apiJson<DailyStreakClaimResult>("/api/streak/claim", {
        method: "POST",
      });

      if (result && result.success) {
        set({
          state: result.updatedState,
          latestClaimResult: result,
          showCelebration: true,
          hasAutoOpenedInSession: true,
          timeUntilReset: formatTimeRemaining(result.updatedState.nextResetAt),
        });
        void refreshCurrentWallet();
        return result;
      }

      if (result && !result.success) {
        set({
          state: result.updatedState,
          latestClaimResult: result,
        });
        return result;
      }

      return null;
    } finally {
      set({ isClaiming: false });
    }
  },

  openModal: (targetView?: StreakModalView) => {
    const isClaimable = get().state?.isClaimableToday ?? false;
    const resolvedView = targetView ?? (isClaimable ? "reward" : "journey");
    set({ isOpen: true, viewMode: resolvedView });
    void get().fetchStreak();
  },

  openClaimModal: () => {
    get().openModal("reward");
  },

  openExpeditionModal: () => {
    get().openModal("journey");
  },

  closeModal: () => {
    set({ isOpen: false, hasAutoOpenedInSession: true });
  },

  setViewMode: (viewMode: StreakModalView) => {
    set({ viewMode });
  },

  clearCelebration: () => {
    set({ showCelebration: false, latestClaimResult: null });
  },

  setDismissed: () => {
    set({ hasAutoOpenedInSession: true });
  },

  resetTransientState: () => {
    set({
      state: null,
      isOpen: false,
      viewMode: "reward",
      isLoading: false,
      isClaiming: false,
      latestClaimResult: null,
      showCelebration: false,
      hasAutoOpenedInSession: false,
    });
  },
}));
