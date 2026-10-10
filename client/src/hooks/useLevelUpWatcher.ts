import { useEffect } from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { apiJson, peekPlayerCredential } from "../lib/playerIdentity";
import { useAuthStore } from "../store/authStore";
import { useLevelUpStore } from "../store/levelUpStore";
import { useRoomStore } from "../store/roomStore";

/**
 * Notices when the player's REAL level goes up and shows the level-up moment.
 *
 * ── How a rise is seen ────────────────────────────────────────────────
 * The server owns XP and level. This reads the profile (`GET /api/profile/:id`) the first time it can,
 * keeps that level in memory as the baseline, and compares every later read to it. A higher level is a
 * level-up. Nothing is stored: the baseline lives for the session, so reloading the page never replays
 * a celebration and no new browser key is introduced.
 *
 * ── When it looks ─────────────────────────────────────────────────────
 * On first load, when the tab comes back into view, and after a match finishes. XP is written behind
 * the match, so it looks twice: a few seconds after the match ends and again a little later.
 *
 * It is passive. A visitor with no identity yet has no profile to read, and this never creates one.
 */

const AFTER_MATCH_DELAYS_MS = [3_000, 12_000] as const;

/** Level last seen per player, so signing in as someone else starts a fresh baseline instead of a false rise. */
const baselines = new Map<string, number>();
let inFlight = false;

/** Test seam. */
export function resetLevelUpBaselines(): void {
  baselines.clear();
  inFlight = false;
}

export async function checkForLevelUp(): Promise<void> {
  if (inFlight) return;
  const credential = peekPlayerCredential();
  if (!credential) return;
  inFlight = true;
  try {
    const res = await apiJson<{ profile: PlayerProfile }>(`/api/profile/${encodeURIComponent(credential.playerId)}`);
    const profile = res?.profile;
    if (!profile || !Number.isFinite(profile.level)) return;

    const previous = baselines.get(credential.playerId);
    baselines.set(credential.playerId, profile.level);
    if (previous !== undefined && profile.level > previous) {
      useLevelUpStore.getState().show(previous, profile.level, profile.experiencePoints ?? 0);
    }
  } finally {
    inFlight = false;
  }
}

export function useLevelUpWatcher(): void {
  const userId = useAuthStore((s) => s.userId);
  const authReady = useAuthStore((s) => s.ready);

  useEffect(() => {
    if (!authReady) return undefined;
    void checkForLevelUp();

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForLevelUp();
    };
    document.addEventListener("visibilitychange", onVisible);

    const timers: number[] = [];
    const unsubscribe = useRoomStore.subscribe((state, previous) => {
      if (state.roomState?.phase === "finished" && previous.roomState?.phase !== "finished") {
        for (const delay of AFTER_MATCH_DELAYS_MS) timers.push(window.setTimeout(() => void checkForLevelUp(), delay));
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
      for (const id of timers) window.clearTimeout(id);
    };
  }, [authReady, userId]);
}
