/**
 * A counter that goes up whenever the player's REAL XP or level is seen to have risen.
 *
 * The level-up watcher is the only thing that bumps it. Surfaces that show the player's own level or XP
 * (the header avatar, the home page, the profile drawer) read profile numbers once when they mount, so
 * without a signal they keep showing the old level after a match until the page is reloaded. Putting this
 * number in their fetch dependencies makes them read again exactly when something changed. It carries no
 * data and is never stored.
 */

import { create } from "zustand";

export interface ProgressionVersionStore {
  version: number;
  bump: () => void;
}

export const useProgressionVersion = create<ProgressionVersionStore>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
