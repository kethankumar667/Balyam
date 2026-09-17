import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useStreakStore } from "../store/streakStore";

/**
 * useStreakAutoOpen
 *
 * Orchestrates the Daily Streak auto-opening lifecycle and identity boundary:
 * 1. Automatically opens the Daily Streak Reward claim modal when an authenticated user
 *    has an active, unclaimed streak reward (`isClaimableToday === true`).
 * 2. Suppresses auto-opening for the rest of the session once dismissed or claimed.
 * 3. Does not auto-open for unauthenticated / guest users or while auth is loading.
 * 4. Resets transient streak state and prevents leaking data when switching accounts or signing out.
 */
export function useStreakAutoOpen(): void {
  const authReady = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);
  const isMember = useAuthStore((s) => s.isMember);

  const {
    state,
    isLoading,
    isOpen,
    hasAutoOpenedInSession,
    openClaimModal,
    fetchStreak,
    resetTransientState,
  } = useStreakStore();

  const identity = userId ? `user:${userId}` : isMember ? "member" : null;
  const previousIdentityRef = useRef(identity);
  const autoFetchAttemptedRef = useRef(false);

  // Identity transition boundary: reset state on sign out or account switch
  useEffect(() => {
    if (previousIdentityRef.current !== identity) {
      previousIdentityRef.current = identity;
      autoFetchAttemptedRef.current = false;
      resetTransientState();
      if (authReady && identity !== null) {
        autoFetchAttemptedRef.current = true;
        void fetchStreak();
      }
    }
  }, [identity, authReady, resetTransientState, fetchStreak]);

  // Initial fetch on authenticated mount if not yet requested
  useEffect(() => {
    if (authReady && identity !== null && !state && !isLoading && !autoFetchAttemptedRef.current) {
      autoFetchAttemptedRef.current = true;
      void fetchStreak();
    }
  }, [authReady, identity, state, isLoading, fetchStreak]);

  // Auto-open claim modal when authenticated user has an unclaimed reward
  useEffect(() => {
    if (!authReady || !userId) return;
    if (isLoading || !state) return;

    if (state.isClaimableToday && !hasAutoOpenedInSession && !isOpen) {
      useStreakStore.setState({ hasAutoOpenedInSession: true });
      openClaimModal();
    }
  }, [
    authReady,
    userId,
    isLoading,
    state,
    hasAutoOpenedInSession,
    isOpen,
    openClaimModal,
  ]);
}

export default useStreakAutoOpen;
