import { useRef, useState } from "react";
import { Clock, Gift, Save, UserRound } from "lucide-react";
import { GUEST_IDLE_EXPIRY_DAYS } from "@shared/guestIdentity";
import Modal from "../Modal";

interface GuestInviteNoticeProps {
  /**
   * Resolves true once the guest identity exists. Otherwise false (a plain failure) or a sentence
   * explaining why (a deliberate refusal, such as too many guests from this network), shown as is.
   */
  onContinue: () => Promise<boolean | string>;
  /** Leave without a guest ever being created. */
  onCancel: () => void;
}

/**
 * Shown the first time someone with no identity opens a room link.
 *
 * A friend who has never used the app lands on a table. Before anything is created for them, they
 * are told plainly what is about to happen: a temporary guest account, how long it lasts, that the
 * name they pick belongs to this room only, and that signing in after the game keeps their progress.
 * The guest is created when they tap Continue, not on arrival, so a visitor who closes the tab
 * leaves nothing behind (see AGENTS.md — guests are created just in time).
 */
export default function GuestInviteNotice({ onContinue, onCancel }: GuestInviteNoticeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const handleContinue = async () => {
    setIsCreating(true);
    setError(null);
    const result = await onContinue();
    if (result !== true) {
      setError(typeof result === "string" ? result : "We could not set up your guest account. Check your connection and try again.");
      setIsCreating(false);
    }
  };

  return (
    <Modal
      open
      mobileSheet
      closeOnBackdropClick={false}
      ariaLabelledBy="guest-invite-title"
      ariaDescribedBy="guest-invite-body"
      initialFocusRef={continueRef}
      panelClassName="bhalyam-font relative w-full md:max-w-sm max-h-[92dvh] overflow-y-auto flex flex-col
                 bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                 border-2 border-bhalyam-cream-edge/70 dark:border-slate-800 rounded-t-3xl md:rounded-3xl
                 shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
      panelStyle={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="p-5 space-y-4">
        <header className="space-y-1">
          <h2 id="guest-invite-title" className="font-display text-xl font-black leading-tight">
            Setting up a guest account for you
          </h2>
          <p id="guest-invite-body" className="text-sm text-bhalyam-wood-dark/80 dark:text-slate-300">
            You were invited to play, so we&apos;ll create a quick guest account. No sign-up needed.
          </p>
        </header>

        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <Gift className="w-5 h-5 shrink-0 mt-0.5 text-bhalyam-gold-dark" aria-hidden />
            <span>
              <strong>Your first game is on us.</strong> We cover your entry, and you can add more coins after it.
            </span>
          </li>
          <li className="flex gap-3">
            <Clock className="w-5 h-5 shrink-0 mt-0.5 text-bhalyam-gold-dark" aria-hidden />
            <span>
              It expires after <strong>{GUEST_IDLE_EXPIRY_DAYS} days</strong> of not using it.
            </span>
          </li>
          <li className="flex gap-3">
            <UserRound className="w-5 h-5 shrink-0 mt-0.5 text-bhalyam-gold-dark" aria-hidden />
            <span>
              Pick any name for this game room. Once you leave the room you&apos;re a numbered guest
              again.
            </span>
          </li>
          <li className="flex gap-3">
            <Save className="w-5 h-5 shrink-0 mt-0.5 text-bhalyam-gold-dark" aria-hidden />
            <span>
              After the game, <strong>sign in to save your progress and coins</strong>, and keep your name.
            </span>
          </li>
        </ul>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <button
            ref={continueRef}
            type="button"
            onClick={handleContinue}
            disabled={isCreating}
            className="w-full min-h-[44px] rounded-2xl bhalyam-gold-leaf border border-bhalyam-gold-dark
                       text-bhalyam-wood-dark font-black text-sm cursor-pointer disabled:opacity-60
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark"
          >
            {isCreating ? "Creating your guest account…" : error ? "Try again" : "Continue as guest"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="w-full min-h-[44px] rounded-2xl text-xs font-bold text-bhalyam-wood-dark/70
                       dark:text-slate-400 cursor-pointer focus:outline-none focus-visible:ring-2
                       focus-visible:ring-bhalyam-gold-dark"
          >
            Not now
          </button>
        </div>
      </div>
    </Modal>
  );
}
