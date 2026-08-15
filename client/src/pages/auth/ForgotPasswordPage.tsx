import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import {
  AuthField,
  FormNotice,
  SubmitButton,
  inputClass,
  useFieldIds,
} from "../../components/auth/AuthControls";
import { usePasswordRecovery } from "../../components/auth/useAccountAuth";
import { validateEmail, type FieldError } from "../../lib/authValidation";
import { MailIcon } from "../../components/auth/authIcons";

/**
 * Request a reset link.
 *
 * The confirmation deliberately does not say whether that address has an
 * account. "No account with that email" is a free membership oracle for
 * anyone probing a list of addresses, and it helps the genuine user barely at
 * all — they mistyped, and the fix is the same either way: check the inbox,
 * then try again.
 */
export default function ForgotPasswordPage() {
  const ids = useFieldIds(["email"] as const);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<FieldError>(null);
  const { loading, done, error, configured, submit } = usePasswordRecovery();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validateEmail(email);
    setEmailError(next);
    if (next) {
      document.getElementById(ids.email)?.focus();
      return;
    }
    submit(email);
  }

  if (done) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If that address has an account, a reset link is on its way."
        backTo="/login"
        backLabel="Back to sign in"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-[var(--auth-note-edge)] bg-[var(--auth-note-bg)] p-3.5">
            <MailIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--auth-accent)]" />
            <div className="min-w-0 text-[13.5px] leading-relaxed text-[var(--auth-note-ink)]">
              <p className="font-bold break-words">{email.trim()}</p>
              <p className="mt-0.5">
                The link works once and expires in an hour. Check spam if it hasn&apos;t
                arrived in a few minutes.
              </p>
            </div>
          </div>

          {configured ? null : (
            <FormNotice tone="info" title="No email actually went out">
              This build has no account service configured, so there was nothing to send
              a link from. Set the Supabase keys and this screen becomes real.
            </FormNotice>
          )}

          <Link
            to="/login"
            className="w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center
                       bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark
                       text-bhalyam-wood-dark font-extrabold text-[16px]
                       hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                       transition-[filter,box-shadow] duration-200"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Give us the email on the account and we'll send a link to set a new one."
      backTo="/login"
      backLabel="Back to sign in"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthField id={ids.email} label="Email" error={emailError}>
          {(aria) => (
            <input
              id={ids.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="you@example.com"
              className={inputClass(!!emailError)}
              {...aria}
            />
          )}
        </AuthField>

        {error ? (
          <FormNotice tone="error" title="Couldn't send the link">
            {error}
          </FormNotice>
        ) : null}

        <SubmitButton loading={loading} loadingLabel="Sending…">
          Send reset link
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
