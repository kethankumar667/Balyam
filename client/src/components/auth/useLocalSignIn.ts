import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

/**
 * Sign in, as far as this branch can.
 *
 * ── Why this exists alongside usePreviewSubmit ────────────────────────
 * `usePreviewSubmit` refuses to fake a sign-in, and it is right to: a stub
 * that flipped a flag would make the screens demo well and lie about what
 * works. That reasoning still holds for password reset and email verification,
 * which cannot be honestly simulated because they need somebody to actually
 * receive an email. Those screens keep using it.
 *
 * Sign-in is different now, because something downstream depends on the
 * answer. The guest permission model needs a member to exist before it means
 * anything, so this hook does the one thing that is real: it records that this
 * browser is a member. No password is checked, because there is no account
 * store to check one against — see the comment on top of store/authStore.ts,
 * which is the honest account of exactly how much this is worth.
 *
 * The screens still say so on the page. What changed is that the flag flips,
 * so the rest of the product can be built and exercised end to end.
 *
 * ── Where it sends you ────────────────────────────────────────────────
 * Back where you were blocked. `SignInWall` puts `?from=` on the link it
 * generates, so someone who hit the wall reaching for a room code lands back
 * on the games screen rather than on a generic home page, having forgotten
 * what they came for.
 */

/** How long the busy state is held. Long enough to see, short enough to trust. */
const PRETEND_LATENCY_MS = 650;

export interface LocalSignInState {
  loading: boolean;
  /** Set on a completed submit with nothing to sign in with (Google, Apple). */
  unavailable: boolean;
  /** Runs the sign-in and navigates. `email` is stored as-is, unverified. */
  submit: (email: string) => void;
  /** For providers with no credentials configured — shows an honest notice. */
  markUnavailable: () => void;
  reset: () => void;
}

export function useLocalSignIn(): LocalSignInState {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);

  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const timer = useRef<number | null>(null);

  // A pending timeout that resolves after unmount would set state on a dead
  // component; clearing on unmount is the whole fix.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const submit = useCallback(
    (email: string) => {
      setUnavailable(false);
      setLoading(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        signIn(email);
        // `from` is a hint about where to land, never a raw destination:
        // navigating to an arbitrary caller-supplied path is how an open
        // redirect starts, and a query string is the least trustworthy input
        // on the page.
        const from = params.get("from");
        navigate(from === "join" || from?.startsWith("game:") ? "/games" : "/", {
          replace: true,
        });
      }, PRETEND_LATENCY_MS);
    },
    [navigate, params, signIn],
  );

  const markUnavailable = useCallback(() => {
    setLoading(false);
    setUnavailable(true);
  }, []);

  const reset = useCallback(() => setUnavailable(false), []);

  return { loading, unavailable, submit, markUnavailable, reset };
}
