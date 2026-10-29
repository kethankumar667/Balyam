import { useCallback, useEffect, useState } from "react";
import type { ReferralAttributionResult, ReferralOverview } from "@shared/referrals";
import { useAuthStore } from "../store/authStore";
import { useProgressionVersion } from "../store/progressionVersionStore";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { useReferralLiveStore } from "../store/referralLiveStore";
import {
  detachReferralCode,
  fetchReferralOverview,
  redeemReferralCode,
  syncReferrals,
} from "../lib/referrals";

const LOAD_ERROR = "Your invitations could not be loaded. Please try again.";

interface OverviewState {
  owner: string | null;
  overview: ReferralOverview | null;
  loading: boolean;
  error: string | null;
}

/**
 * Everything the Referrals page shows, for the signed-in member. The qualification sweep runs on the
 * server every minute; asking for a sync first just means a friend who finished a match a moment ago
 * is already counted when the page opens. The sync is a courtesy — if it fails the overview still loads.
 */
export function useReferralOverview(enabled: boolean) {
  const userId = useAuthStore(s => s.userId);
  const progression = useProgressionVersion(s => s.version);
  // A live notice ("Meera joined") means the overview is stale: read it again, with no refresh needed.
  const liveVersion = useReferralLiveStore(s => s.version);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<OverviewState>({ owner: null, overview: null, loading: true, error: null });

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const stale = () => cancelled || useAuthStore.getState().userId !== userId;
    setState(prev => ({ owner: userId, overview: prev.owner === userId ? prev.overview : null, loading: true, error: null }));
    void (async () => {
      try {
        const progress = await syncReferrals().catch(() => null);
        if (stale()) return;
        if (progress?.rewardGranted) void useCosmeticsStore.getState().fetchCosmetics();
        const overview = await fetchReferralOverview();
        if (stale()) return;
        setState({ owner: userId, overview, loading: false, error: null });
      } catch (error) {
        if (!stale()) setState({ owner: userId, overview: null, loading: false, error: error instanceof Error ? error.message : LOAD_ERROR });
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, userId, attempt, progression, liveVersion]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  /** Type a friend's code. On success the overview is re-read so "Referred by" appears at once. */
  const redeem = useCallback(async (code: string): Promise<ReferralAttributionResult> => {
    const result = await redeemReferralCode(code);
    if (result.ok) setAttempt(n => n + 1);
    return result;
  }, []);

  const detach = useCallback(async (): Promise<ReferralAttributionResult> => {
    const result = await detachReferralCode();
    if (result.ok) setAttempt(n => n + 1);
    return result;
  }, []);

  const owned = enabled && userId === state.owner;
  return {
    overview: owned ? state.overview : null,
    loading: enabled && !!userId && (!owned || state.loading),
    error: enabled && !userId ? "Sign in with a verified account to see your invitations." : owned ? state.error : null,
    retry,
    redeem,
    detach,
  };
}
