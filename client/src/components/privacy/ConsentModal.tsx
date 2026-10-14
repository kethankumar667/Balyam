import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { recordConsent } from "../../lib/privacy/consent";
import { useConsentPending } from "../../hooks/useConsentPending";
import { useAgeGatePending } from "../../hooks/useAgeGatePending";
import { useAuthStore } from "../../store/authStore";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { KeyholeIcon } from "../auth/authIcons";
import Modal from "../Modal";

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
  const [isReady, setIsReady] = useState(false);
  const [noticeOpened, setNoticeOpened] = useState(false);
  const { pathname } = useLocation();
  const isConsentPending = useConsentPending();
  // The age question is asked first; the privacy choice waits for it.
  const isAgePending = useAgeGatePending();
  const memberId = useAuthStore((state) => state.userId);
  const profileReady = useAuthStore((state) => state.profileReady);
  const open = isReady && !isAgePending && isConsentPending && profileReady !== false && pathname !== "/privacy";
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Deferred a beat so it does not fight the page's first paint.
    const id = window.setTimeout(() => setIsReady(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Focus trap and initial focus (onto "Allow all") are owned by <Modal> at
  // the return site below. No onClose is passed: this is a decision, not a
  // dismissible dialog — Escape and the backdrop must not be able to answer
  // it on the user's behalf, so both are intentionally inert here.

  if (!open) return null;

  function choose(choice: "granted" | "essential-only") {
    recordConsent(choice, new Date(), memberId);
  }

  return (
    <Modal
      open={open}
      initialFocusRef={acceptRef}
      mobileSheet
      zIndex={60}
      ariaLabelledBy="consent-title"
      ariaDescribedBy="consent-body"
      className="auth-shell"
      panelClassName="w-full sm:max-w-[460px] rounded-t-3xl sm:rounded-3xl
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

        <div id="consent-body" className="mt-2 space-y-3 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
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
            We also keep your privacy choice and the account ids that answered this notice on this
            device, including after sign-out. Erasing your local data removes that record.
          </p>
          <p>
            {isSupabaseConfigured
              ? "An account is optional and separate from this choice: you can play everything as a guest, and creating one later asks for an email address then."
              : "There are no accounts in this build at all."}
          </p>
          <p>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setNoticeOpened(true)}
              className="inline-flex items-center min-h-[44px] font-bold text-[var(--auth-accent)]
                         underline decoration-[#D9BE7A] underline-offset-4 rounded-sm
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
            >
              Read the full privacy notice
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          <p role="status" className="text-[12px] text-[var(--auth-ink-soft)]">
            {noticeOpened ? "Privacy notice opened in a new tab. Return here to make your choice." : ""}
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
    </Modal>
  );
}
