import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import {
  AuthField,
  FormNotice,
  PasswordInput,
  PasswordStrengthMeter,
  SubmitButton,
  useFieldIds,
} from "../../components/auth/AuthControls";
import { usePreviewSubmit } from "../../components/auth/usePreviewSubmit";
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
  const [params] = useSearchParams();
  // Real tokens arrive as ?token=… . Absent means the link was hand-typed,
  // truncated by a mail client, or already used.
  const hasToken = !!params.get("token");
  const expired = params.get("state") === "expired";

  const ids = useFieldIds(["password", "confirm"] as const);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [confirmError, setConfirmError] = useState<FieldError>(null);
  const { loading, done, submit } = usePreviewSubmit();

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
    submit();
  }

  if (expired || !hasToken) {
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

        {done ? (
          <FormNotice tone="info" title="Nothing was changed">
            There&apos;s no account store yet, so this form has nothing to update. The
            flow and its states are what&apos;s being reviewed here.
          </FormNotice>
        ) : null}

        <SubmitButton loading={loading} loadingLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
