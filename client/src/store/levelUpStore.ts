/**
 * The level-up moment being shown, if any. Lives only while it is on screen and is never stored, so a
 * reload does not replay an old celebration.
 */

import { create } from "zustand";

export interface LevelUpMoment {
  fromLevel: number;
  toLevel: number;
  /** The player's total XP when the rise was seen, from the server. */
  totalXp: number;
  /** Changes on every moment, so the animation restarts. */
  key: number;
}

export interface LevelUpStore {
  moment: LevelUpMoment | null;
  show: (fromLevel: number, toLevel: number, totalXp: number) => void;
  clear: () => void;
}

let nextKey = 1;

export const useLevelUpStore = create<LevelUpStore>((set) => ({
  moment: null,
  show: (fromLevel, toLevel, totalXp) => set({ moment: { fromLevel, toLevel, totalXp, key: nextKey++ } }),
  clear: () => set({ moment: null }),
}));
