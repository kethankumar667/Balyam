import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { peekPlayerCredential } from "../lib/playerIdentity";

/**
 * Loads the player's equipped cosmetics once the session is known, instead of waiting for them to
 * open the shop.
 *
 * Until now the loadout was fetched only when the shop opened, so a player who had bought and
 * equipped something saw every default again after a refresh, and rooms they created or joined
 * before visiting the shop carried no cosmetics at all. That was tolerable while the equipped
 * items were mostly dice faces; with avatar frames, which every other player sees, and Carrom coin
 * sets, which change the board, it would read as the purchase having been lost.
 *
 * It uses `peekPlayerCredential` and so never mints a guest: someone who has not yet done anything
 * deliberate has no identity, no wallet and nothing equipped, and a page view must not create one.
 */
export function useCosmeticsLoadoutBootstrap(): void {
  const ready = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (!ready) return;
    if (!peekPlayerCredential()) return;
    // Depending on `userId` re-runs this when a different account signs in, so the new account
    // never inherits the previous one's equipped items.
    void useCosmeticsStore.getState().fetchCosmetics();
  }, [ready, userId]);
}
