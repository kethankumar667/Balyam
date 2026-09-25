import { useCallback, useEffect, useState } from "react";
import { needsConsent } from "../../lib/privacy/consent";
import { journeyTracker } from "./PlayerJourneyTracker";

/** How often to re-check whether the privacy question has been answered. */
const CONSENT_POLL_MS = 1000;
/** Let the page paint and settle before a dialog appears over it. */
const AUTO_OPEN_DELAY_MS = 1500;

export interface WelcomeTour {
  /** The full tour dialog is open. */
  open: boolean;
  /** Open it on request (a button, a menu item). */
  start: () => void;
  /** Close it; the dialog itself records finish or skip. */
  close: () => void;
  /** Show the quiet "take the tour" prompt: the tour is available, has not been done, and nothing else is asking for attention. */
  showPrompt: boolean;
  dismissPrompt: () => void;
}

/**
 * When the welcome tour appears.
 *
 * The rule is: ask once, never ambush, and always leave a way back.
 *  - The dialog opens by itself at most ONCE per visit, so a reload or a trip
 *    back to Home never brings it back.
 *  - It waits for the privacy question to be answered first, so two dialogs are
 *    never stacked.
 *  - Someone who chose "Only what's essential" is not interrupted at all; they
 *    get the quiet prompt instead (we may not keep a "seen it" mark for them
 *    across visits, so a dialog every visit would be the repeat we are avoiding).
 *  - Anyone who has not finished it can start it from the prompt, and from the
 *    Help pages at any time.
 */
export function useWelcomeTour({ suppressed = false }: { suppressed?: boolean } = {}): WelcomeTour {
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(() => journeyTracker.getState().hasCompletedWelcome);
  const [promptDismissed, setPromptDismissed] = useState(() => journeyTracker.isTourPromptDismissed());
  const [consentAnswered, setConsentAnswered] = useState(() => !needsConsent());

  useEffect(() => {
    if (consentAnswered) return;
    const id = window.setInterval(() => {
      if (!needsConsent()) setConsentAnswered(true);
    }, CONSENT_POLL_MS);
    return () => window.clearInterval(id);
  }, [consentAnswered]);

  const willAutoOpen =
    consentAnswered &&
    !open &&
    !completed &&
    !suppressed &&
    journeyTracker.isPersistenceAllowed() &&
    !journeyTracker.wasTourOffered();

  useEffect(() => {
    if (!willAutoOpen) return;
    const id = window.setTimeout(() => {
      journeyTracker.markTourOffered();
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [willAutoOpen]);

  const start = useCallback(() => {
    journeyTracker.markTourOffered();
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCompleted(journeyTracker.getState().hasCompletedWelcome);
  }, []);

  const dismissPrompt = useCallback(() => {
    journeyTracker.dismissTourPrompt();
    setPromptDismissed(true);
  }, []);

  return {
    open,
    start,
    close,
    showPrompt: consentAnswered && !open && !completed && !promptDismissed && !suppressed && !willAutoOpen,
    dismissPrompt,
  };
}
