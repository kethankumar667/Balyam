import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { AuthField, FormNotice, inputClass, useFieldIds } from "../../components/auth/AuthControls";
import { OTP_LENGTH, useEmailVerification } from "../../components/auth/useAccountAuth";
import { CheckCircleIcon, MailIcon, SpinnerIcon } from "../../components/auth/authIcons";

/**
 * The screen between signing up and being verified.
 *
 * ── Why a code and not a link ─────────────────────────────────────────
 * The confirmation email carries an 8-digit token rather than only a link,
 * which means the person who signs up on a laptop and opens mail on a phone
 * finishes on the laptop, where their half-filled game lobby still is. A link
 * would have stranded them in a mobile browser with no session on the device
 * they were actually using.
 *
 * The link is not gone — the template can carry both, and arriving here with
 * `?state=verified` still lands on the success panel below. One flow simply
 * stopped being the only one.
 *
 * ── One input, not eight boxes ────────────────────────────────────────
 * Eight separate inputs are the familiar look and the wrong control: pasting
 * a code read from another window is how most people enter one, and a paste
 * into box one either fills a single digit or takes eight lines of key
 * handling to spread. They also announce as eight unlabelled fields to a
 * screen reader. A single input, letter-spaced, is visually the same thing
 * and behaves correctly for free.
 *
 * The resend cooldown is visible rather than silent. A dead button that
 * quietly ignores you reads as broken; a button that says when it wakes up
 * reads as deliberate — and it is pinned to Supabase's own one-per-minute
 * limit so it never wakes up into a refusal.
 */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const address = params.get("email");
  const ids = useFieldIds(["code"] as const);
  const [code, setCode] = useState("");

  const { loading, error, verified, resent, cooldown, configured, verify, resend, clearError } =
    useEmailVerification();

  // Either half of the flow can land here: the code was accepted just now, or
  // the emailed link was clicked and Supabase sent the browser back.
  const done = verified || params.get("state") === "verified";
  const complete = code.length === OTP_LENGTH;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || loading) return;
    verify(address, code);
  }

  if (done) {
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
            role="status"
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
      subtitle={`We've sent an ${OTP_LENGTH}-digit verification code. Type it in and you're in.`}
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
              Nothing yet? It sometimes lands in spam, and the address can have a typo — both
              are fixable below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <AuthField
            id={ids.code}
            label="Verification code"
            error={error}
            help={`The ${OTP_LENGTH} digits from the email.`}
          >
            {(aria) => (
              <input
                id={ids.code}
                type="text"
                // `numeric` gives the digit pad without the spinner and the
                // "e"/"-" that `type="number"` would also accept here.
                inputMode="numeric"
                // Lets the phone offer the code straight from the notification
                // instead of making someone switch apps to read it.
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                autoFocus
                value={code}
                onChange={(e) => {
                  // Non-digits are dropped rather than rejected — a stray
                  // space costs nobody a retype.
                  setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                  if (error) clearError();
                }}
                onPaste={(e) => {
                  // Paste is handled here rather than left to `onChange`
                  // because `maxLength` truncates the RAW text first: a code
                  // copied as "1234 5678" is nine characters, so the browser
                  // would drop the final digit before the filter above ever
                  // saw it — and the field would sit there one short with no
                  // hint why.
                  const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                  if (!pasted) return;
                  e.preventDefault();
                  setCode(pasted.slice(0, OTP_LENGTH));
                  if (error) clearError();
                }}
                placeholder={"•".repeat(OTP_LENGTH)}
                className={inputClass(
                  !!error,
                  "font-mono text-center text-[22px] tracking-[0.45em] placeholder:tracking-[0.45em]",
                )}
                // Tracking adds space AFTER the last digit too, which shifts a
                // centred value visibly left. Indenting by the same amount
                // puts it back.
                style={{ textIndent: "0.45em" }}
                {...aria}
              />
            )}
          </AuthField>

          {resent ? (
            <FormNotice tone="success" title="A new code is on its way">
              {configured
                ? "Use the newest one — sending a fresh code retires the previous."
                : "This build has no account service, so nothing was actually sent."}
            </FormNotice>
          ) : null}

          <button
            type="submit"
            disabled={!complete || loading}
            aria-busy={loading || undefined}
            className={`w-full min-h-[52px] px-6 rounded-full inline-flex items-center justify-center gap-2.5
                        font-extrabold text-[16px] border transition-[filter,box-shadow] duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                        ${
                          !complete || loading
                            ? "bg-[var(--auth-rule)] border-[var(--auth-field-edge)] text-[var(--auth-ink-mute)] cursor-not-allowed"
                            : "bhalyam-gold-leaf bhalyam-cta-shine border-bhalyam-gold-dark text-bhalyam-wood-dark cursor-pointer hover:brightness-[1.04] shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]"
                        }`}
          >
            {loading ? (
              <>
                <SpinnerIcon className="w-5 h-5 auth-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <span>Verify email</span>
            )}
          </button>
        </form>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => resend(address)}
            disabled={loading || cooldown > 0}
            className={`w-full min-h-[48px] px-6 rounded-full inline-flex items-center justify-center
                        border font-bold text-[15px] transition-[background-color,color,transform] duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                        ${
                          loading || cooldown > 0
                            ? "border-[var(--auth-field-edge)] text-[var(--auth-ink-mute)] cursor-not-allowed"
                            : "border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] hover:bg-[var(--auth-field)] hover:text-[var(--auth-ink)] active:scale-[0.99] cursor-pointer"
                        }`}
          >
            {cooldown > 0 ? (
              <span aria-live="polite">Resend code in {cooldown}s</span>
            ) : (
              <span>Resend code</span>
            )}
          </button>

          <Link
            to="/signup"
            className="w-full min-h-[48px] px-6 rounded-full inline-flex items-center justify-center
                       text-[var(--auth-ink-soft)] font-bold text-[15px]
                       hover:text-[var(--auth-ink)] active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[color,transform] duration-200"
          >
            Use a different email
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
