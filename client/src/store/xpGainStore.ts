/**
 * The "XP earned this match" moment being shown, if any. Lives only while it is on screen and is never
 * stored, so a reload does not replay an old card.
 */

import { create } from "zustand";

export interface XpGainMoment {
  previousXp: number;
  newXp: number;
  /** Changes on every moment, so the card re-animates when a new match pays out. */
  key: number;
}

export interface XpGainStore {
  moment: XpGainMoment | null;
  show: (previousXp: number, newXp: number) => void;
  clear: () => void;
}

let nextKey = 1;

export const useXpGainStore = create<XpGainStore>((set) => ({
  moment: null,
  show: (previousXp, newXp) => set({ moment: { previousXp, newXp, key: nextKey++ } }),
  clear: () => set({ moment: null }),
}));
