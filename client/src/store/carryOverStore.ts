/**
 * What the app knows about a guest's coins coming to an account.
 *
 * `arrival` is the one-time moment (this session only: it is not stored, so a reload does not
 * replay it). `status` is what the server last said, for the wallet card. The server owns every
 * fact; nothing here decides an amount.
 */

import { create } from "zustand";
import type { CarryOverStatus } from "@shared/carryover";
import { apiJson } from "../lib/playerIdentity";

export interface CarryOverArrival {
  amount: number;
  /** When the held coins reach the wallet, or `null` if they were paid at once. */
  vestingUntil: number | null;
}

export interface CarryOverStore {
  arrival: CarryOverArrival | null;
  status: CarryOverStatus | null;

  setArrival: (arrival: CarryOverArrival) => void;
  dismissArrival: () => void;
  fetchStatus: () => Promise<void>;
  reset: () => void;
}

const INITIAL = { arrival: null, status: null } satisfies Partial<CarryOverStore>;

export const useCarryOverStore = create<CarryOverStore>((set) => ({
  ...INITIAL,

  setArrival: (arrival) => set({ arrival }),
  dismissArrival: () => set({ arrival: null }),

  fetchStatus: async () => {
    const status = await apiJson<CarryOverStatus>("/api/carryover");
    if (status) set({ status });
  },

  reset: () => set({ ...INITIAL }),
}));
