import { useEffect } from "react";
import { peekPlayerCredential } from "../lib/playerIdentity";
import { pendingScores } from "../lib/scoreOutbox";
import { useScorecardStore } from "../store/scorecardStore";

/**
 * Back online: send any finished results that were waiting, without the player having to open My Records.
 *
 * Mounted once from the app's bootstrap. It is a hook, not a listener registered when the store is imported,
 * so importing the store (as many tests and pages do) never adds a global side effect.
 */
export function useScoreSyncOnReconnect(): void {
  useEffect(() => {
    const resend = () => {
      const playerId = peekPlayerCredential()?.playerId;
      if (playerId && pendingScores(playerId).length > 0) void useScorecardStore.getState().fetchScorecards(playerId);
    };
    window.addEventListener("online", resend);
    return () => window.removeEventListener("online", resend);
  }, []);
}
