import { create } from "zustand";
import type { ReferralOverview } from "@shared/referrals";
import { fetchReferralOverview } from "../lib/referrals";
import { useAuthStore } from "./authStore";

/** What an invitation offer needs from the member's overview: their code and what each side earns. */
export type InvitePromoOffer = Pick<ReferralOverview, "shareCode" | "campaign">;

type InvitePromoStatus = "idle" | "loading" | "ready" | "unavailable";

interface InvitePromoStore {
  /** Whose offer this is, so a different member signing in never sees the last one's code. */
  owner: string | null;
  status: InvitePromoStatus;
  offer: InvitePromoOffer | null;
  /** "Not now" for this visit. Memory only: a reload brings the offer back, and nothing is written to the device. */
  isDismissed: boolean;
  /** Reads the member's code once, however many promos on the page ask for it. */
  load: (userId: string) => Promise<void>;
  dismiss: () => void;
}

/**
 * The invitation promos' shared data. Every promo asks, one request answers. A promo is an offer, not a feature
 * the person asked for, so a failure is silent (`unavailable` just means "show nothing") and is not retried
 * until the next visit or the next member.
 */
export const useInvitePromoStore = create<InvitePromoStore>((set, get) => ({
  owner: null,
  status: "idle",
  offer: null,
  isDismissed: false,

  async load(userId) {
    const { owner, status, isDismissed } = get();
    if (owner === userId && status !== "idle") return;
    set({ owner: userId, status: "loading", offer: null, isDismissed: owner === userId ? isDismissed : false });
    try {
      const { shareCode, campaign } = await fetchReferralOverview();
      if (useAuthStore.getState().userId !== userId) return;
      set({ status: "ready", offer: { shareCode, campaign } });
    } catch {
      if (useAuthStore.getState().userId !== userId) return;
      set({ status: "unavailable", offer: null });
    }
  },

  dismiss: () => set({ isDismissed: true }),
}));
