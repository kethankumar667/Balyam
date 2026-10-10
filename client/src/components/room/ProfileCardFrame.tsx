import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@shared/types";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SeatAvatar from "../profile/SeatAvatar";

/**
 * The shell of a seat's profile card: the dimmed backdrop, the dialog, the avatar and name, and
 * the close button. What goes beside the name (`badges`) and below it (`children`) is the card's
 * own business, so a bot's card and a person's card are the same object to look at and to use.
 *
 * A bottom sheet on a phone and a centred dialog from `md` up, the same shape the app's other
 * dialogs use. Escape and a tap on the backdrop close it, and focus lands on the close button.
 */
export default function ProfileCardFrame({
  player,
  onClose,
  badges,
  children,
}: {
  player: Player;
  onClose: () => void;
  /** Chips shown under the name. */
  badges?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // In a portal: a seat sits inside an animated (transformed) element, which would make `fixed` relative to it.
  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
      onClick={onClose}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-[#EEDBCA] dark:border-slate-700 bg-[#FFF9EE] dark:bg-[#182234] shadow-2xl p-5 pt-3 md:pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {/* The cue that this is a sheet you can put away; the close button and Escape still do the work. */}
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2B3550]/15 dark:bg-slate-100/20 md:hidden" />
        <div className="flex items-start gap-4">
          <SeatAvatar
            avatar={player.avatar}
            aura={player.cosmetics?.avatarAura}
            level={player.level}
            name={player.name}
            className="w-20 h-20 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-black leading-tight text-[#2B3550] dark:text-slate-100 truncate">
              {player.name}
            </h2>
            {badges && <div className="flex items-center gap-1.5 flex-wrap mt-2">{badges}</div>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="w-11 h-11 min-w-[44px] min-h-[44px] -mt-1 -mr-1 rounded-full flex items-center justify-center text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-700/70 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
