/**
 * What the app knows about a guest's coins coming to an account.
 *
 * `arrival` is the one-time moment (this session only: it is not stored, so a reload does not
 * replay it). `status` is what the server last said, for the wallet card. The server owns every
 * fact; nothing here decides an amount or whether a bonus is unlocked.
 */

import { create } from "zustand";
import type { BonusResult, CarryOverStatus } from "@shared/carryover";
import { apiJson } from "../lib/playerIdentity";
import { refreshCurrentWallet } from "../hooks/useEconomy";

export interface CarryOverArrival {
  amount: number;
  /** When the held coins reach the wallet, or `null` if they were paid at once. */
  vestingUntil: number | null;
}

export interface CarryOverStore {
  arrival: CarryOverArrival | null;
  status: CarryOverStatus | null;
  isClaimingBonus: boolean;
  /** The last thing worth telling the player about the bonus, or `null`. */
  bonusMessage: string | null;

  setArrival: (arrival: CarryOverArrival) => void;
  dismissArrival: () => void;
  fetchStatus: () => Promise<void>;
  claimBonus: () => Promise<BonusResult | null>;
  reset: () => void;
}

const INITIAL = { arrival: null, status: null, isClaimingBonus: false, bonusMessage: null } satisfies Partial<CarryOverStore>;

export const useCarryOverStore = create<CarryOverStore>((set, get) => ({
  ...INITIAL,

  setArrival: (arrival) => set({ arrival }),
  dismissArrival: () => set({ arrival: null }),

  fetchStatus: async () => {
    const status = await apiJson<CarryOverStatus>("/api/carryover");
    if (status) set({ status });
  },

  claimBonus: async () => {
    if (get().isClaimingBonus) return null;
    set({ isClaimingBonus: true, bonusMessage: null });
    try {
      const result = await apiJson<BonusResult>("/api/carryover/bonus", { method: "POST" });
      if (!result) {
        set({ bonusMessage: "Your bonus is temporarily unavailable. Try again in a moment." });
        return null;
      }
      if (result.ok) {
        set({
          bonusMessage: result.vestingUntil
            ? "Your welcome bonus is on its way. It reaches your wallet within a day."
            : "Your welcome bonus is in your wallet.",
        });
        void refreshCurrentWallet();
      } else {
        set({ bonusMessage: result.message });
      }
      await get().fetchStatus();
      return result;
    } finally {
      set({ isClaimingBonus: false });
    }
  },

  reset: () => set({ ...INITIAL }),
}));
