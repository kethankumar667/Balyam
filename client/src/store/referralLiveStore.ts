import { create } from "zustand";

/**
 * "Something about your referrals changed." A counter and nothing else: the Referrals page watches it and
 * re-reads its overview when a live notice arrives, so a friend who joins while the page is open shows up
 * without a refresh. It carries no names or coins and is never saved; the page always re-reads the server.
 */
interface ReferralLiveStore {
  version: number;
  bump: () => void;
}

export const useReferralLiveStore = create<ReferralLiveStore>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
