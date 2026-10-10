/**
 * Free-coins faucet store.
 *
 * Holds what the server last said about the faucet and runs the claim. The
 * server owns every fact here: the amount, the cooldown and the time of the next
 * claim. The device clock is used only to count down, and even that is anchored to
 * the server's clock (`clockOffsetMs`) so a wrong device time cannot make a claim
 * look ready early, or hide one that is ready.
 */

import { create } from "zustand";
import type { FaucetClaimResult, FaucetStatus } from "@shared/faucet";
import { apiJson } from "../lib/playerIdentity";
import { refreshCurrentWallet } from "../hooks/useEconomy";

export interface FaucetStore {
  status: FaucetStatus | null;
  /** Server time minus device time at the last answer, in ms. */
  clockOffsetMs: number;
  isClaiming: boolean;
  /** The claim dialog is open. Every claim control opens it; the claim itself happens inside. */
  isClaimModalOpen: boolean;
  /** Coins just paid, shown briefly as "+100". Cleared by `clearJustClaimed`. */
  justClaimed: number | null;
  /** The last refusal worth showing, or `null`. */
  message: string | null;

  fetchStatus: () => Promise<void>;
  claim: () => Promise<FaucetClaimResult | null>;
  openClaimModal: () => void;
  closeClaimModal: () => void;
  clearJustClaimed: () => void;
  reset: () => void;
}

/** Whole seconds until `nextClaimAt`, never negative, measured on the server's clock. */
export function secondsUntil(nextClaimAt: number | null, clockOffsetMs: number, deviceNow: number = Date.now()): number {
  if (nextClaimAt === null) return 0;
  return Math.max(0, Math.ceil((nextClaimAt - (deviceNow + clockOffsetMs)) / 1_000));
}

/** `3:59:07` for hours, `59:07` under an hour. */
export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

const INITIAL = {
  status: null,
  clockOffsetMs: 0,
  isClaiming: false,
  isClaimModalOpen: false,
  justClaimed: null,
  message: null,
} satisfies Partial<FaucetStore>;

export const useFaucetStore = create<FaucetStore>((set, get) => ({
  ...INITIAL,

  fetchStatus: async () => {
    const status = await apiJson<FaucetStatus>("/api/faucet");
    if (status) set({ status, clockOffsetMs: status.serverNow - Date.now() });
  },

  claim: async () => {
    if (get().isClaiming) return null;
    set({ isClaiming: true, message: null });
    try {
      // No body: the amount, the clock and the player are all the server's.
      const result = await apiJson<FaucetClaimResult>("/api/faucet/claim", { method: "POST" });
      if (!result) {
        set({ message: "Free coins are temporarily unavailable. Try again in a moment." });
        return null;
      }
      const clockOffsetMs = result.serverNow - Date.now();
      if (result.ok) {
        // "+100" means the coins are in the wallet. A claim that is accepted but not yet credited (a
        // payment still being retried, or held for review) starts the wait but must not claim otherwise.
        set((s) => ({
          clockOffsetMs,
          justClaimed: result.paidNow ? result.amount : null,
          message: result.paidNow ? null : "Your free coins are on their way.",
          status: s.status && {
            ...s.status,
            serverNow: result.serverNow,
            nextClaimAt: result.nextClaimAt,
            canClaim: false,
          },
        }));
        void refreshCurrentWallet();
      } else {
        // Only a refusal that names a wait (too early) locks the button; "unavailable" can be retried.
        const nextClaimAt = result.nextClaimAt;
        set((s) => ({
          clockOffsetMs,
          message: result.message,
          status:
            s.status && nextClaimAt !== null
              ? { ...s.status, serverNow: result.serverNow, nextClaimAt, canClaim: false }
              : s.status,
        }));
      }
      return result;
    } finally {
      set({ isClaiming: false });
    }
  },

  openClaimModal: () => set({ isClaimModalOpen: true, message: null }),
  closeClaimModal: () => set({ isClaimModalOpen: false }),

  clearJustClaimed: () => set({ justClaimed: null }),

  reset: () => set({ ...INITIAL }),
}));
