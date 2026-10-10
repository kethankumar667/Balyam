import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@shared/types";
import { X } from "lucide-react";
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
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-[#EEDBCA] dark:border-slate-700 bg-[#FFF9EE] dark:bg-[#182234] shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start gap-3">
          <SeatAvatar
            avatar={player.avatar}
            aura={player.cosmetics?.avatarAura}
            level={player.level}
            name={player.name}
            className="w-16 h-16 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-black text-[#2B3550] dark:text-slate-100 truncate">
              {player.name}
            </h2>
            {badges && <div className="flex items-center gap-1.5 flex-wrap mt-1">{badges}</div>}
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
      </div>
    </div>,
    document.body,
  );
}
