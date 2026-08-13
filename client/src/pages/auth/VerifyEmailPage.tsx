import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { FormNotice } from "../../components/auth/AuthControls";
import { usePreviewSubmit } from "../../components/auth/usePreviewSubmit";
import { CheckCircleIcon, MailIcon, SpinnerIcon } from "../../components/auth/authIcons";

/** How long before "send it again" becomes available. Stops inbox flooding. */
const RESEND_COOLDOWN_S = 30;

/**
 * The screen between signing up and being verified.
 *
 * Two states in one route, because they are the same moment: waiting for the
 * email, and having clicked the link in it.
 *
 * The resend cooldown is visible rather than silent. A dead button that
 * quietly ignores you reads as broken; a button that says when it wakes up
 * reads as deliberate, and stops the double-send that lands two links and
 * invalidates the first.
 */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const verified = params.get("state") === "verified";
  const address = params.get("email");

  const { loading, done, submit } = usePreviewSubmit();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (done) setCooldown(RESEND_COOLDOWN_S);
  }, [done]);

  if (verified) {
    return (
      <AuthShell
        title="You're all set"
        subtitle="Your email is confirmed. The chest is yours to open."
        backTo="/"
      >
        <div className="space-y-5">
          <div
            className="flex items-center gap-3 rounded-xl border border-[var(--auth-ok-edge)] bg-[var(--auth-ok-bg)] p-3.5
                       text-[var(--auth-ok-ink)]"
          >
            <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="text-[13.5px] font-bold leading-snug">Email verified</p>
          </div>

          <Link
            to="/"
            className="w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center
                       bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark
                       text-bhalyam-wood-dark font-extrabold text-[16px]
                       hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                       transition-[filter,box-shadow] duration-200"
          >
            Pick a game
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle="We've sent a link to confirm it's really you. Open it and you're in."
      backTo="/login"
      backLabel="Back to sign in"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-[var(--auth-note-edge)] bg-[var(--auth-note-bg)] p-3.5">
          <MailIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--auth-accent)]" />
          <div className="min-w-0 text-[13.5px] leading-relaxed text-[var(--auth-note-ink)]">
            {address ? (
              <p className="font-bold break-words">{address}</p>
            ) : (
              <p className="font-bold">Sent to the address you signed up with</p>
            )}
            <p className="mt-0.5">
              Nothing yet? It sometimes lands in spam, and the address can have a typo —
              both are fixable below.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={submit}
            disabled={loading || cooldown > 0}
            aria-busy={loading || undefined}
            className={`w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center gap-2.5
                        font-extrabold text-[16px] border transition-[filter,box-shadow] duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                        ${
                          loading || cooldown > 0
                            ? "bg-[var(--auth-rule)] border-[var(--auth-field-edge)] text-[var(--auth-ink-mute)] cursor-not-allowed"
                            : "bhalyam-gold-leaf bhalyam-cta-shine border-bhalyam-gold-dark text-bhalyam-wood-dark cursor-pointer hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]"
                        }`}
          >
            {loading ? (
              <>
                <SpinnerIcon className="w-5 h-5 auth-spin" />
                <span>Sending…</span>
              </>
            ) : cooldown > 0 ? (
              <span aria-live="polite">Send again in {cooldown}s</span>
            ) : (
              <span>Send the email again</span>
            )}
          </button>

          <Link
            to="/signup"
            className="w-full min-h-[48px] px-6 rounded-full inline-flex items-center justify-center
                       border border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] font-bold text-[15px]
                       hover:bg-[var(--auth-field)] hover:text-[var(--auth-ink)] active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[background-color,color,transform] duration-200"
          >
            Use a different email
          </Link>
        </div>

        {done ? (
          <FormNotice tone="info" title="No email was sent">
            Verification needs the accounts backend. The cooldown you just saw is the
            real behaviour — it&apos;s only the sending that isn&apos;t wired up.
          </FormNotice>
        ) : null}
      </div>
    </AuthShell>
  );
}
