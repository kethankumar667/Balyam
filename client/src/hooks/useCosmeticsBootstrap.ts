import { useEffect } from "react";
import { peekPlayerCredential } from "../lib/playerIdentity";
import { useAuthStore } from "../store/authStore";
import { useCosmeticsStore } from "../store/cosmeticsStore";

/**
 * Loads the player's equipped cosmetics as soon as the app knows who they are.
 *
 * What a player has equipped lives on the server, but the browser only asked for it when the shop was
 * opened. Anyone who equipped a token yesterday and created a room today therefore announced the default
 * pawn. The load is a read, so it uses `peekPlayerCredential` and never creates anyone: a first-time
 * visitor has nothing saved and costs no request. It runs again on sign-in, because the saved loadout
 * belongs to the account. A room that is already open hears about the result from the store.
 */
export function useCosmeticsBootstrap(): void {
  const isSessionReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (!isSessionReady) return;
    if (!peekPlayerCredential()) return;
    void useCosmeticsStore.getState().fetchCosmetics();
  }, [isSessionReady, userId]);
}
