import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import {
  AuthField,
  FormNotice,
  PasswordInput,
  PasswordStrengthMeter,
  SubmitButton,
  useFieldIds,
} from "../../components/auth/AuthControls";
import { usePasswordUpdate } from "../../components/auth/useAccountAuth";
import { SpinnerIcon } from "../../components/auth/authIcons";
import {
  validatePassword,
  validatePasswordConfirm,
  type FieldError,
} from "../../lib/authValidation";

/**
 * Set a new password, arrived at from the emailed link.
 *
 * This is the one form that DOES ask twice. Everywhere else the reveal toggle
 * is enough, but here a typo locks you out of the account you are in the
 * middle of recovering, with no signed-in session to try again from.
 *
 * The expired-link state is the common case, not an edge case — reset emails
 * get opened the next morning — so it is a designed screen with a way
 * forward, not a red banner over a dead form.
 */
export default function ResetPasswordPage() {
  const ids = useFieldIds(["password", "confirm"] as const);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [confirmError, setConfirmError] = useState<FieldError>(null);
  const { status, loading, done, error, configured, submit } = usePasswordUpdate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextPassword = validatePassword(password);
    const nextConfirm = validatePasswordConfirm(password, confirm);
    setPasswordError(nextPassword);
    setConfirmError(nextConfirm);
    if (nextPassword || nextConfirm) {
      document.getElementById(nextPassword ? ids.password : ids.confirm)?.focus();
      return;
    }
    submit(password);
  }

  // The link is exchanged for a session as the page loads, so for a moment
  // we genuinely do not know yet. Showing the expired screen during that
  // moment would tell a player with a perfectly good link to go away.
  if (status === "checking") {
    return (
      <AuthShell
        title="Checking your link"
        subtitle="One moment — making sure it's still good."
        backTo="/login"
        backLabel="Back to sign in"
      >
        <div
          className="flex items-center gap-3 rounded-xl border border-[var(--auth-note-edge)]
                     bg-[var(--auth-note-bg)] p-3.5 text-[var(--auth-note-ink)]"
          role="status"
          aria-live="polite"
        >
          <SpinnerIcon className="w-5 h-5 flex-shrink-0 auth-spin" />
          <p className="text-[13.5px] font-bold">Opening your reset link…</p>
        </div>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell
        title="That link has expired"
        subtitle="Reset links last an hour and work once, so old ones stop opening."
        backTo="/login"
        backLabel="Back to sign in"
      >
        <div className="space-y-5">
          <p className="text-[14px] leading-relaxed text-[var(--auth-ink-soft)]">
            Ask for a fresh one and it&apos;ll be in your inbox in a moment. The password
            on the account hasn&apos;t changed.
          </p>
          <Link
            to="/forgot-password"
            className="w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center
                       bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark
                       text-bhalyam-wood-dark font-extrabold text-[16px]
                       hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                       transition-[filter,box-shadow] duration-200"
          >
            Send a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Pick something you'll remember on a phone at someone else's house."
      backTo="/login"
      backLabel="Back to sign in"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField id={ids.password} label="New password" error={passwordError}>
          {(aria) => (
            <>
              <PasswordInput
                id={ids.password}
                value={password}
                onChange={(next) => {
                  setPassword(next);
                  if (passwordError) setPasswordError(null);
                  // The match error stops being true the moment either box
                  // changes, so clearing it here avoids a stale complaint.
                  if (confirmError) setConfirmError(null);
                }}
                hasError={!!passwordError}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria={aria}
              />
              <PasswordStrengthMeter password={password} />
            </>
          )}
        </AuthField>

        <AuthField id={ids.confirm} label="Type it again" error={confirmError}>
          {(aria) => (
            <PasswordInput
              id={ids.confirm}
              value={confirm}
              onChange={(next) => {
                setConfirm(next);
                if (confirmError) setConfirmError(null);
              }}
              hasError={!!confirmError}
              placeholder="Same password"
              autoComplete="new-password"
              aria={aria}
            />
          )}
        </AuthField>

        {error ? (
          <FormNotice tone="error" title="Couldn't save it">
            {error}
          </FormNotice>
        ) : done && configured ? (
          <FormNotice tone="success" title="Password changed">
            You&apos;re signed in already — or use the new one next time.{" "}
            <Link to="/" className="font-extrabold underline underline-offset-4">
              Pick a game
            </Link>
            .
          </FormNotice>
        ) : done ? (
          <FormNotice tone="info" title="Nothing was changed">
            This build has no account service configured, so there is no password to
            update. The flow and its states are what you are seeing here.
          </FormNotice>
        ) : null}

        <SubmitButton loading={loading} loadingLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
