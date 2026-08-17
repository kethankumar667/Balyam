import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  authErrorMessage,
  getSupabase,
  isEmailNotConfirmed,
  isSupabaseConfigured,
  redirectTo,
} from "../../lib/supabase/client";

/**
 * The account actions, for the five screens that perform them.
 *
 * ── What replaced what ────────────────────────────────────────────────
 * These screens used to be honest about having nothing behind them:
 * `usePreviewSubmit` ran the busy state and then said plainly that no email
 * had gone anywhere, and `useLocalSignIn` flipped a localStorage flag so the
 * guest permission model had a member to work with. Both are gone, because
 * there is now something behind them.
 *
 * The honesty is not gone, though — it is conditional. A build with no
 * Supabase keys cannot send an email or check a password, and every hook here
 * reports `configured: false` so its screen keeps saying so. What must never
 * come back is a success state with nothing behind it: the failure that costs
 * days is the one where nobody remembers which behaviour was real.
 *
 * ── Why the hooks are split by screen rather than merged ──────────────
 * They look similar — loading, error, done — and one `useAuth()` returning
 * every action would collapse them. But each screen's *result* is different
 * (sign-in navigates, recovery shows an inbox card, update shows a success
 * panel), and that difference is where the bugs live. Keeping them apart
 * keeps each one's finished state impossible to confuse for another's.
 */

/** How long the busy state is held on the local path. Snappy and instant. */
const PRETEND_LATENCY_MS = 120;

/**
 * Where to land after signing in.
 *
 * `from` is a hint about where the player was blocked, never a raw
 * destination: navigating to an arbitrary caller-supplied path is how an open
 * redirect starts, and a query string is the least trustworthy input on the
 * page. `SignInWall` sets it so somebody stopped while reaching for a room
 * code comes back to the games screen rather than a generic home page.
 */
function destinationFor(from: string | null): string {
  return from === "join" || from?.startsWith("game:") ? "/games" : "/";
}

/** Clears a pending timeout on unmount, so nothing sets state on a dead component. */
function useTimer(): { run: (fn: () => void, ms: number) => void } {
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const run = useCallback((fn: () => void, ms: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fn();
    }, ms);
  }, []);
  return { run };
}

/* ──────────────────────── Sign in ──────────────────────── */

export interface SignInState {
  loading: boolean;
  /** A message to show the player, already reworded from the raw API error. */
  error: string | null;
  /** False when this build has no account service — the screen must say so. */
  configured: boolean;
  submit: (email: string, password: string) => void;
  withGoogle: () => void;
  clearError: () => void;
}

export function useSignIn(): SignInState {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signInLocal = useAuthStore((s) => s.signInLocal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run } = useTimer();

  const submit = useCallback(
    (email: string, password: string) => {
      setError(null);
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        // No service to check the password against, so the flag is all there
        // is. The screen says as much next to the button.
        run(() => {
          signInLocal(email);
          navigate(destinationFor(params.get("from")), { replace: true });
        }, PRETEND_LATENCY_MS);
        return;
      }

      void supabase.auth
        .signInWithPassword({ email: email.trim(), password })
        .then(({ error: err }) => {
          setLoading(false);
          if (err) {
            /**
             * The stranded-account escape hatch.
             *
             * Someone whose confirmation email never arrived — the ordinary
             * outcome once the project's hourly mail allowance is spent — has
             * a real account they cannot reach. Sign-up refuses them ("that
             * email already has an account"), and sign-in used to refuse them
             * too, with a sentence pointing at an inbox that never received
             * anything. Nothing on either screen led to the one page that can
             * help, so the only fix was deleting the row by hand.
             *
             * The password they just typed was correct enough to get this
             * specific error rather than "invalid credentials", so sending
             * them to the confirmation screen is not a guess. Its Resend
             * button and code box are exactly what they needed.
             */
            if (isEmailNotConfirmed(err)) {
              navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, {
                replace: true,
              });
              return;
            }
            setError(authErrorMessage(err));
            return;
          }
          // The store is already updating from `onAuthStateChange`; this only
          // decides where the player lands.
          navigate(destinationFor(params.get("from")), { replace: true });
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [navigate, params, run, signInLocal],
  );

  const withGoogle = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Google sign-in isn't connected in this build. Use your email below.");
      return;
    }
    setError(null);
    setLoading(true);
    void supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo(destinationFor(params.get("from"))) },
      })
      .then(({ error: err }) => {
        // On success the browser is already leaving, so only the failure
        // path has a component left to update.
        if (err) {
          setLoading(false);
          setError(authErrorMessage(err));
        }
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(authErrorMessage(err));
      });
  }, [params]);

  return {
    loading,
    error,
    configured: isSupabaseConfigured,
    submit,
    withGoogle,
    clearError: useCallback(() => setError(null), []),
  };
}

/* ──────────────────────── Sign up ──────────────────────── */

export interface SignUpState {
  loading: boolean;
  error: string | null;
  configured: boolean;
  /** `displayName` is stored on the user so the profile row starts named. */
  submit: (email: string, password: string, displayName: string) => void;
  withGoogle: () => void;
  clearError: () => void;
}

export function useSignUp(): SignUpState {
  const navigate = useNavigate();
  const signInLocal = useAuthStore((s) => s.signInLocal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run } = useTimer();

  const submit = useCallback(
    (email: string, password: string, displayName: string) => {
      setError(null);
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        run(() => {
          signInLocal(email);
          navigate("/", { replace: true });
        }, PRETEND_LATENCY_MS);
        return;
      }

      void supabase.auth
        .signUp({
          email: email.trim(),
          password,
          options: {
            // Read by the signup trigger, so the profile row is created with
            // a name instead of being filled in by a later round trip.
            data: { display_name: displayName.trim() || null },
            emailRedirectTo: redirectTo("/verify-email?state=verified"),
          },
        })
        .then(({ data, error: err }) => {
          setLoading(false);
          if (err) {
            setError(authErrorMessage(err));
            return;
          }
          // With email confirmation on — Supabase's default — there is no
          // session yet and the next step is the inbox. With it off, the
          // player is already signed in and the wait screen would be a lie.
          if (data.session) navigate("/", { replace: true });
          else navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, { replace: true });
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [navigate, run, signInLocal],
  );

  const withGoogle = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Google sign-up isn't connected in this build. Use your email below.");
      return;
    }
    setError(null);
    setLoading(true);
    void supabase.auth
      .signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo("/") } })
      .then(({ error: err }) => {
        if (err) {
          setLoading(false);
          setError(authErrorMessage(err));
        }
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(authErrorMessage(err));
      });
  }, []);

  return {
    loading,
    error,
    configured: isSupabaseConfigured,
    submit,
    withGoogle,
    clearError: useCallback(() => setError(null), []),
  };
}

/* ──────────────────────── Forgot password ──────────────────────── */

export interface RecoveryState {
  loading: boolean;
  /** True once the request completed — the inbox card, not proof of delivery. */
  done: boolean;
  error: string | null;
  configured: boolean;
  submit: (email: string) => void;
}

export function usePasswordRecovery(): RecoveryState {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run } = useTimer();

  const submit = useCallback(
    (email: string) => {
      setError(null);
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        run(() => {
          setLoading(false);
          setDone(true);
        }, PRETEND_LATENCY_MS);
        return;
      }

      void supabase.auth
        .resetPasswordForEmail(email.trim(), { redirectTo: redirectTo("/reset-password") })
        .then(({ error: err }) => {
          setLoading(false);
          // A failure here is worth showing — but note the success copy still
          // refuses to confirm whether that address has an account, since
          // Supabase returns the same answer either way and telling the
          // difference is a free membership oracle.
          if (err) setError(authErrorMessage(err));
          else setDone(true);
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [run],
  );

  return { loading, done, error, configured: isSupabaseConfigured, submit };
}

/* ──────────────────────── Set a new password ──────────────────────── */

export type RecoverySessionStatus = "checking" | "ready" | "invalid";

export interface PasswordUpdateState {
  /** Whether the emailed link produced a session we can change a password in. */
  status: RecoverySessionStatus;
  loading: boolean;
  done: boolean;
  error: string | null;
  configured: boolean;
  submit: (password: string) => void;
}

/**
 * Set a new password from the recovery link.
 *
 * The link does not carry a token this form submits. Supabase exchanges the
 * `?code=` for a short-lived session as the page loads — which is why the
 * auth client is created at import rather than lazily — and the password
 * change is then an ordinary authenticated update. So "is this link still
 * good?" is really "did a session appear?", and the expired screen is what
 * happens when one did not.
 */
export function usePasswordUpdate(): PasswordUpdateState {
  const [params] = useSearchParams();
  const ready = useAuthStore((s) => s.ready);
  const isMember = useAuthStore((s) => s.isMember);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run } = useTimer();

  // Supabase reports a dead link by redirecting back with an error rather
  // than by failing quietly, in the query string or the hash depending on
  // the flow. Either one means the same thing to the player.
  const linkFailed =
    params.get("error") !== null || /(^|[#&])error(_code)?=/.test(window.location.hash);

  let status: RecoverySessionStatus = "checking";
  if (!isSupabaseConfigured) status = "ready";
  else if (linkFailed) status = "invalid";
  else if (ready) status = isMember ? "ready" : "invalid";

  const submit = useCallback(
    (password: string) => {
      setError(null);
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        run(() => {
          setLoading(false);
          setDone(true);
        }, PRETEND_LATENCY_MS);
        return;
      }

      void supabase.auth
        .updateUser({ password })
        .then(({ error: err }) => {
          setLoading(false);
          if (err) setError(authErrorMessage(err));
          else setDone(true);
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [run],
  );

  return { status, loading, done, error, configured: isSupabaseConfigured, submit };
}

/* ──────────────────────── Confirm the email address ──────────────────────── */

/**
 * Digits in the emailed code.
 *
 * Mirrors **Email OTP Length** in the Supabase dashboard, which this project
 * has set to 8 rather than the default 6. The two must agree: a form that
 * demands six digits of an eight-digit code refuses a perfectly good one and
 * blames the player for it. If that setting ever changes, change this.
 */
export const OTP_LENGTH = 8;

/**
 * How long "Resend code" stays asleep.
 *
 * Matched to Supabase's own limit of one email per address per 60 seconds,
 * deliberately. The earlier 30 was worse than no cooldown: the button woke up
 * while the service was still refusing, so the second press failed and the
 * screen looked broken at exactly the moment someone was already anxious about
 * a missing email.
 */
const RESEND_COOLDOWN_S = 60;

export interface EmailVerificationState {
  /** Busy on either action — the screen can only run one at a time. */
  loading: boolean;
  /**
   * One error slot for both actions, on purpose.
   *
   * Verify and resend live on the same screen, so two independent error
   * states would race for one notice: type a stale code, hit resend, and the
   * page has to decide which complaint is still true. Sharing the slot makes
   * the newest action the one that speaks.
   */
  error: string | null;
  /** The code was accepted. The success panel, before the redirect lands. */
  verified: boolean;
  /** A fresh code is on its way. Cleared as soon as one is typed. */
  resent: boolean;
  /** Seconds until resend wakes up. Zero means available. */
  cooldown: number;
  configured: boolean;
  verify: (email: string | null, code: string) => void;
  resend: (email: string | null) => void;
  clearError: () => void;
}

/**
 * Type the code from the email, and be signed in.
 *
 * ── Why `type: "email"` ───────────────────────────────────────────────
 * The token comes from the "Confirm signup" template, so `"signup"` looks
 * like the obvious verb — but Supabase's own signup-OTP example uses
 * `"email"`, and both reach the same verify path in GoTrue. Following the
 * documented example is the one that stays right when their behaviour moves.
 *
 * ── The link still works ──────────────────────────────────────────────
 * `emailRedirectTo` is deliberately still sent on both signup and resend.
 * The template can carry `{{ .ConfirmationURL }}` beside `{{ .Token }}`
 * during the switch to codes, and someone who clicks the link rather than
 * typing should land on this page's success state instead of the site root.
 */
export function useEmailVerification(): EmailVerificationState {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { run } = useTimer();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const verify = useCallback(
    (email: string | null, code: string) => {
      const token = code.replace(/\D/g, "");
      setError(null);
      setResent(false);

      const supabase = getSupabase();
      if (!supabase) {
        setError("This build has no account service, so there is no code to check.");
        return;
      }
      if (!email) {
        setError("We don't know which address to confirm. Sign up again to get a fresh code.");
        return;
      }
      if (token.length !== OTP_LENGTH) {
        setError(`Enter all ${OTP_LENGTH} digits from the email.`);
        return;
      }

      setLoading(true);
      void supabase.auth
        .verifyOtp({ email, token, type: "email" })
        .then(({ data, error: err }) => {
          setLoading(false);
          if (err) {
            // Expired, mistyped, or already used. All three leave the player
            // on this screen with the box still there to try again.
            setError(authErrorMessage(err));
            return;
          }
          setVerified(true);

          // Confirming normally signs you in. If it somehow did not, saying
          // "you're in" and dropping someone on a signed-out home page is the
          // worse lie — send them to sign in with the password they just set.
          if (!data.session) {
            run(() => navigate("/login", { replace: true }), 1400);
            return;
          }
          // The store is already updating from `onAuthStateChange`; this only
          // decides where the player lands, after a beat to read the panel.
          run(() => navigate("/", { replace: true }), 1200);
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [navigate, run],
  );

  const resend = useCallback(
    (email: string | null) => {
      setError(null);
      setResent(false);

      const supabase = getSupabase();
      if (!supabase) {
        setLoading(true);
        run(() => {
          setLoading(false);
          setResent(true);
          setCooldown(RESEND_COOLDOWN_S);
        }, PRETEND_LATENCY_MS);
        return;
      }
      if (!email) {
        setError("We don't have the address to send to. Sign up again to get a fresh code.");
        return;
      }

      setLoading(true);
      void supabase.auth
        .resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirectTo("/verify-email?state=verified") },
        })
        .then(({ error: err }) => {
          setLoading(false);
          if (err) {
            setError(authErrorMessage(err));
            return;
          }
          setResent(true);
          setCooldown(RESEND_COOLDOWN_S);
        })
        .catch((err: unknown) => {
          setLoading(false);
          setError(authErrorMessage(err));
        });
    },
    [run],
  );

  return {
    loading,
    error,
    verified,
    resent,
    cooldown,
    configured: isSupabaseConfigured,
    verify,
    resend,
    clearError: useCallback(() => setError(null), []),
  };
}
