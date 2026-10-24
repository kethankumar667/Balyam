import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { IdCard, LockKeyhole, SlidersHorizontal, Star } from "lucide-react";
import { recordConsent } from "../../lib/privacy/consent";
import { useConsentPending } from "../../hooks/useConsentPending";
import { useAgeGatePending } from "../../hooks/useAgeGatePending";
import { useAuthStore } from "../../store/authStore";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import Modal from "../Modal";
import SafetyEmblem from "./SafetyEmblem";
import "./safety-gateway.css";

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
 * Both choices let someone play. This asks about optional device storage
 * and stays until explicitly answered; dismissing it cannot count as consent.
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
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Deferred a beat so it does not fight the page's first paint.
    const id = window.setTimeout(() => setIsReady(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Heading focus keeps the first keystroke neutral. No onClose is passed:
  // Escape and the backdrop must not answer a privacy choice on someone's behalf.

  if (!open) return null;

  function choose(choice: "granted" | "essential-only") {
    recordConsent(choice, new Date(), memberId);
  }

  return (
    <Modal
      open={open}
      initialFocusRef={titleRef}
      closeOnBackdropClick={false}
      zIndex={60}
      ariaLabelledBy="consent-title"
      ariaDescribedBy="consent-description"
      className="safety-gateway-backdrop"
      panelClassName="safety-gateway max-h-full w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-[28px] p-6 sm:p-7"
    >
      <header className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.16em]">
        <span className="flex items-center gap-1.5"><Star aria-hidden="true" className="h-3 w-3 text-[var(--safety-accent)]" />BHALYAM</span>
        <span className="text-[var(--safety-muted)]">Privacy choice</span>
      </header>
      <div className="relative mt-3 text-center">
        <SafetyEmblem>
          <LockKeyhole className="h-7 w-7" strokeWidth={1.6} />
        </SafetyEmblem>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--safety-muted)]">Your data, your choice</p>
        <h2
          ref={titleRef}
          tabIndex={-1}
          id="consent-title"
          className="mx-auto mt-2 max-w-[340px] text-[25px] font-bold leading-tight tracking-tight"
        >
          What BHALYAM keeps
        </h2>
        <p id="consent-description" className="mt-3 text-[13px] leading-relaxed text-[var(--safety-muted)]">
          Choose what this device remembers.
        </p>
      </div>

      <div id="consent-body" className="relative mt-5 space-y-3 text-[13px] leading-relaxed text-[var(--safety-muted)]">
        <section aria-labelledby="consent-essential-title" className="safety-protections rounded-2xl border p-4">
          <h3 id="consent-essential-title" className="flex items-center gap-2 text-xs font-bold text-[var(--safety-ink)]">
            <IdCard aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--safety-verification)]" />Required for play
          </h3>
          <p className="mt-2">
            To seat you at a table we store a display name and a random player id on this device.
            That much is what playing requires.
          </p>
        </section>
        <section aria-labelledby="consent-optional-title" className="safety-protections rounded-2xl border p-4">
          <h3 id="consent-optional-title" className="flex items-center gap-2 text-xs font-bold text-[var(--safety-ink)]">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--safety-verification)]" />Optional on this device
          </h3>
          <p className="mt-2">
            Beyond that we&apos;d like to remember your sound and language settings, board
            skins, best scores, which tutorials you have already seen, and a short connection log
            for debugging dropped games. All of it stays on this device. There is no tracking and
            no advertising.
          </p>
        </section>
        <div className="flex items-start gap-2.5 px-1">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--safety-verification)]" />
          <p className="text-[11px]">
            We also keep your privacy choice and the account ids that answered this notice on this
            device, including after sign-out. Erasing your local data removes that record.
          </p>
        </div>
        <p className="px-1 text-[11px]">
          {isSupabaseConfigured
            ? "An account is optional and separate from this choice: you can play everything as a guest, and creating one later asks for an email address then."
            : "There are no accounts in this build at all."}
        </p>
      </div>

      <footer className="safety-privacy relative mt-5 border-t pt-2">
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setNoticeOpened(true)}
          className="safety-back mx-auto flex min-h-11 w-fit items-center px-2 text-center text-xs font-semibold underline underline-offset-4"
        >
          Read the full privacy notice
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p role="status" className="text-center text-[11px] leading-relaxed text-[var(--safety-muted)]">
          {noticeOpened ? "Privacy notice opened in a new tab. Return here to make your choice." : ""}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ["granted", "Allow all"],
            ["essential-only", "Only what's essential"],
          ] as const).map(([choice, label]) => (
            <button
              key={choice}
              type="button"
              onClick={() => choose(choice)}
              className="safety-choice min-h-14 w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--safety-muted)]">
          You can change this any time from Profile → Your data, and erase everything from the
          same place.
        </p>
      </footer>
    </Modal>
  );
}
