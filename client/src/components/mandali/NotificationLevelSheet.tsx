/**
 * BHALYAM Mandali — how loud this group may be for you.
 *
 *  - All messages   the summary of what you missed, plus room invitations
 *  - Invites only   just the rooms people share — chat stays silent
 *  - Muted          nothing at all
 *
 * A busy group is the reason this exists: someone in an eight-person Mandali
 * who is at work needs to be able to say "only tell me when there is a game".
 *
 * Built on the shared `Modal` (focus trap, Escape, bottom sheet on phones).
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { Bell, BellOff, Gamepad2, Check, Loader2, X, AlertCircle } from "lucide-react";
import type { NotificationLevel } from "@shared/mandali/notifications.js";
import Modal from "../Modal";

export interface NotificationLevelSheetProps {
  open: boolean;
  onClose: () => void;
  mandaliName: string;
  level: NotificationLevel;
  /** Resolves true when the server accepted the change. */
  onChange: (level: NotificationLevel) => Promise<boolean>;
}

const OPTIONS: ReadonlyArray<{
  level: NotificationLevel;
  title: string;
  description: string;
  Icon: typeof Bell;
}> = [
  {
    level: "ALL",
    title: "All messages",
    description: "One summary of what you missed, plus any room someone shares.",
    Icon: Bell,
  },
  {
    level: "INVITES_ONLY",
    title: "Invites only",
    description: "Stay quiet about chat. Tell me only when someone shares a room to play in.",
    Icon: Gamepad2,
  },
  {
    level: "MUTED",
    title: "Muted",
    description: "No notifications from this Mandali. You can still read the chat any time.",
    Icon: BellOff,
  },
];

export default function NotificationLevelSheet({ open, onClose, mandaliName, level, onChange }: NotificationLevelSheetProps) {
  const [saving, setSaving] = useState<NotificationLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (next: NotificationLevel) => {
    if (saving || next === level) return;
    setSaving(next);
    setError(null);
    const ok = await onChange(next);
    setSaving(null);
    if (ok) onClose();
    else setError("Could not save that setting. Please try again.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobileSheet
      ariaLabelledBy="notification-level-title"
      panelClassName="w-full max-w-md rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="notification-level-title" className="text-base font-black text-slate-900 dark:text-white">
            Notifications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">How loud {mandaliName} may be for you.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <fieldset>
        <legend className="sr-only">Notification level</legend>
        <div className="space-y-2">
          {OPTIONS.map(({ level: option, title, description, Icon }) => {
            const selected = option === level;
            return (
              <label
                key={option}
                className={`flex items-start gap-3 min-h-[64px] px-3.5 py-3 rounded-2xl border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-amber-500 ${
                  selected
                    ? "bg-amber-500/10 border-amber-500"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="notification-level"
                  value={option}
                  checked={selected}
                  onChange={() => void choose(option)}
                  className="sr-only"
                />
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400 leading-snug mt-0.5">{description}</span>
                </span>
                {saving === option ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 mt-1" />
                ) : (
                  selected && <Check className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-1" />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </Modal>
  );
}
