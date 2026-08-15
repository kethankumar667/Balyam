import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { needsConsent, recordConsent } from "../../lib/privacy/consent";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { KeyholeIcon } from "../auth/authIcons";

/**
 * First-run consent — DPDP Sections 5 and 6.
 *
 * Three things separate this from a cookie banner:
 *
 *   • Both choices are real buttons of equal weight. A greyed-out "decline"
 *     beside a bright "accept" is a nudge, and consent obtained by nudging is
 *     not freely given.
 *   • Declining is enforced, not just recorded — see consent.ts.
 *   • It says what is stored before asking, in one screen, rather than
 *     linking away and hoping nobody follows.
 *
 * It does NOT block the page. Someone arriving on a shared room link is
 * mid-social-moment and should not meet a wall; the essential data needed to
 * seat them is lawful under legitimate use either way. This asks about the
 * rest, and stays until answered.
 */
export default function ConsentModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Deferred a beat so it does not fight the page's first paint.
    const id = window.setTimeout(() => setOpen(needsConsent()), 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (open) acceptRef.current?.focus();
  }, [open]);

  // Focus stays inside while it is up: this is a decision, and tabbing into
  // the page behind it would leave a keyboard user answering a question they
  // can no longer see.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function choose(choice: "granted" | "essential-only") {
    recordConsent(choice);
    setOpen(false);
  }

  return (
    <div
      className="auth-shell fixed inset-0 z-[60] flex items-end sm:items-center justify-center
                 bg-[#2A1D11]/55 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
    >
      <div
        ref={dialogRef}
        className="w-full sm:max-w-[460px] rounded-t-3xl sm:rounded-3xl
                   border border-[var(--auth-card-edge)] bg-[var(--auth-card)]
                   p-5 sm:p-6 shadow-[0_-8px_40px_-12px_rgba(74,44,18,0.5)]
                   max-h-[88vh] overflow-y-auto"
      >
        <span
          className="inline-flex w-11 h-11 rounded-2xl items-center justify-center
                     bhalyam-gold-leaf text-bhalyam-wood-dark
                     shadow-[0_8px_18px_-8px_rgba(228,177,40,0.7)]"
          aria-hidden
        >
          <KeyholeIcon className="w-6 h-6" />
        </span>

        <h2
          id="consent-title"
          className="bhalyam-display text-[var(--auth-ink)] text-[24px] leading-tight mt-4"
        >
          What BHALYAM keeps
        </h2>

        <div id="consent-body" className="mt-2 space-y-3 text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">
          <p>
            To seat you at a table we store a display name and a random player id on this device.
            That much is what playing requires.
          </p>
          <p>
            Beyond that we&apos;d like to remember your sound and language settings, board
            skins, best scores, which tutorials you have already seen, and a short connection log
            for debugging dropped games. All of it stays on this device. There is no tracking and
            no advertising.
          </p>
          <p>
            {isSupabaseConfigured
              ? "An account is optional and separate from this choice: you can play everything as a guest, and creating one later asks for an email address then."
              : "There are no accounts in this build at all."}
          </p>
          <p>
            <Link
              to="/privacy"
              className="inline-flex items-center min-h-[44px] font-bold text-[var(--auth-accent)]
                         underline decoration-[#D9BE7A] underline-offset-4 rounded-sm
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
            >
              Read the full privacy notice
            </Link>
          </p>
        </div>

        {/* Equal weight on purpose — see the note above. */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            ref={acceptRef}
            type="button"
            onClick={() => choose("granted")}
            className="min-h-[50px] px-5 rounded-full font-extrabold text-[15px]
                       bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark
                       text-bhalyam-wood-dark cursor-pointer hover:brightness-[1.04]
                       shadow-[0_8px_18px_-6px_rgba(228,177,40,0.6)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                       transition-[filter,box-shadow] duration-200"
          >
            Allow all
          </button>
          <button
            type="button"
            onClick={() => choose("essential-only")}
            className="min-h-[50px] px-5 rounded-full font-extrabold text-[15px]
                       bg-[var(--auth-field)] border border-[var(--auth-field-edge)]
                       text-[var(--auth-ink)] cursor-pointer hover:bg-[var(--auth-rule)]
                       active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                       transition-[background-color,transform] duration-200"
          >
            Only what&apos;s essential
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-[var(--auth-ink-mute)]">
          You can change this any time from Profile → Your data, and erase everything from the
          same place.
        </p>
      </div>
    </div>
  );
}
