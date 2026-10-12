import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { needsConsent, readConsent } from "../lib/privacy/consent";
import { shouldShowSignInInvite } from "../lib/signInInvite";

const TICK_MS = 1_000;

/*
 * Module state, not React state: the layout that hosts the invitation
 * re-mounts on navigation, and neither the time spent so far nor the fact that
 * it has already been shown may reset when it does. All of it lives for one
 * page load, which is exactly "this visit" — nothing is written to storage.
 */
let firstVisit: boolean | null = null;
let engagedMs = 0;
let shown = false;

/** Test hook: start from a fresh visit. */
export function resetSignInInviteForTests(): void {
  firstVisit = null;
  engagedMs = 0;
  shown = false;
}

/**
 * Decides when the first-visit sign-in invitation should open.
 *
 * "First visit" is read once, the first time this runs, from the consent record:
 * it does not exist until the first-run consent dialog is answered, and that
 * dialog waits a beat before opening, so reading it here — at app start — still
 * sees the pre-answer state. See `lib/signInInvite.ts` for the rest of the rule.
 *
 * Only time the tab is actually visible counts. A tab left open in the
 * background is not someone who has spent two minutes with the app.
 */
export function useSignInInvite(): { open: boolean; dismiss: () => void } {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  if (firstVisit === null) firstVisit = readConsent() === null;

  useEffect(() => {
    if (shown) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") engagedMs += TICK_MS;
      const auth = useAuthStore.getState();
      const eligible = shouldShowSignInInvite({
        firstVisit: firstVisit === true,
        engagedMs,
        isMember: auth.isMember,
        authReady: auth.ready,
        authConfigured: isSupabaseConfigured,
        consentPending: needsConsent(),
        pathname: pathRef.current,
        alreadyShown: shown,
      });
      if (!eligible) return;
      shown = true;
      window.clearInterval(id);
      setOpen(true);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const dismiss = useCallback(() => setOpen(false), []);
  return { open, dismiss };
}
