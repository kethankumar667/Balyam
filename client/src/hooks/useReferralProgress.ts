import { useEffect, useState } from "react";
import type { ReferralProgress } from "@shared/referrals";
import { useAuthStore } from "../store/authStore";
import { useProgressionVersion } from "../store/progressionVersionStore";
import { getSupabase } from "../lib/supabase/client";
import { attributeReferral, pendingReferralIntent, REFERRAL_INTENT_KEY, REFERRAL_REFUSAL_COPY, syncReferrals } from "../lib/referrals";
import { useCosmeticsStore } from "../store/cosmeticsStore";

export function useReferralProgress(enabled: boolean) {
  const userId = useAuthStore(s => s.userId);
  const progression = useProgressionVersion(s => s.version);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    owner: string | null; progress: ReferralProgress | null; loading: boolean; error: string | null; notice: string | null;
  }>({ owner: null, progress: null, loading: true, error: null, notice: null });

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    setState({ owner: userId, progress: null, loading: true, error: null, notice: null });
    void (async () => {
      try {
        const client = getSupabase();
        const session = await client?.auth.getSession();
        if (cancelled || useAuthStore.getState().userId !== userId) return;
        if (session?.error) throw session.error;
        if (!client || !session?.data.session) {
          throw new Error("Sign in with a verified account to refresh friend invitations.");
        }
        if (session.data.session.user.id !== userId) {
          throw new Error("Your account changed. Refresh invitations after signing in.");
        }
        const metadataIntent: unknown = session?.data.session?.user.user_metadata.referral_intent;
        const token = typeof metadataIntent === "string" ? metadataIntent : pendingReferralIntent();
        let notice: string | null = null;
        if (token) {
          const attribution = await attributeReferral(token);
          if (cancelled || useAuthStore.getState().userId !== userId) return;
          notice = attribution.ok
            ? "Invitation connected. Complete a match with another human to qualify."
            : REFERRAL_REFUSAL_COPY[attribution.code];
          if ((attribution.ok || attribution.code !== "VERIFY_EMAIL") && pendingReferralIntent() === token) {
            localStorage.removeItem(REFERRAL_INTENT_KEY);
          }
          if (typeof metadataIntent === "string" && client && (attribution.ok || attribution.code !== "VERIFY_EMAIL")) {
            const cleared = await client.auth.updateUser({ data: { referral_intent: null } });
            if (cleared.error) console.warn("The processed invitation could not be removed from account metadata.", cleared.error);
          }
        }
        if (cancelled || useAuthStore.getState().userId !== userId) return;
        const progress = await syncReferrals();
        if (cancelled || useAuthStore.getState().userId !== userId) return;
        setState({ owner: userId, progress, loading: false, error: null, notice });
        if (progress.rewardGranted) void useCosmeticsStore.getState().fetchCosmetics();
      } catch (error) {
        if (!cancelled) setState({ owner: userId, progress: null, loading: false,
          error: error instanceof Error ? error.message : "Invitations could not be updated. Please try again.", notice: null });
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, userId, attempt, progression]);

  const owned = enabled && userId === state.owner;
  return {
    progress: owned ? state.progress : null,
    loading: enabled && !!userId && (!owned || state.loading),
    error: enabled && !userId ? "A verified account is needed to connect friend invitations." : owned ? state.error : null,
    notice: owned ? state.notice : null,
    retry: () => setAttempt(n => n + 1),
  };
}
