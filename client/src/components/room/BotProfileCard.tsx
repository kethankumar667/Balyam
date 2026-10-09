import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@shared/types";
import { Bot, MapPin, X } from "lucide-react";
import SeatAvatar from "../profile/SeatAvatar";
import BotStyleChip, { botTitleBadgeClass, describePlayStyle } from "./BotStyleChip";
import { getPodiumTitleConfig } from "../../lib/cosmeticsResolver";

/**
 * A bot's profile, opened by tapping its seat: who it is, where it is from, how it
 * plays, and a record.
 *
 * A bottom sheet on a phone and a centred dialog from `md` up, the same shape the
 * app's other dialogs use. Nothing here is typed by a player: every line comes from
 * the fixed lists in `shared/bot-profile.ts`, and the card says plainly what is real
 * (a difficulty the host chose) and what is flavour (a persona, a simulated record),
 * so a practice opponent is never passed off as a person with a history.
 */

const winRateOf = (wins: number, matches: number): string => `${Math.round((wins / Math.max(1, matches)) * 100)}%`;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-stone-100/80 dark:bg-slate-800/70 border border-stone-200/80 dark:border-slate-700/70 px-2 py-2 text-center">
      <div className="text-base font-black tabular-nums text-[#2B3550] dark:text-slate-100">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export default function BotProfileCard({ player, onClose }: { player: Player; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const profile = player.botProfile;
  const title = getPodiumTitleConfig(player.cosmetics?.podiumTitle);

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
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5">
                <Bot size={11} aria-hidden />
                Practice bot
              </span>
              {title && (
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${botTitleBadgeClass(player.cosmetics?.podiumTitle)}`}>
                  {title.label}
                </span>
              )}
            </div>
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

        {profile ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm italic text-[#5C4328] dark:text-slate-300">“{profile.tagline}”</p>

            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#2B3550] dark:text-slate-200">
              <MapPin size={15} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
              <span>From {profile.hometown}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">Play style</span>
                <BotStyleChip profile={profile} />
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">{describePlayStyle(profile)}</p>
            </div>

            <div>
              <div className="grid grid-cols-4 gap-2" aria-label="Simulated record">
                <Stat label="Matches" value={profile.stats.matches} />
                <Stat label="Wins" value={profile.stats.wins} />
                <Stat label="Win rate" value={winRateOf(profile.stats.wins, profile.stats.matches)} />
                <Stat label="Best streak" value={profile.stats.bestStreak} />
              </div>
              <p className="mt-2 text-[11px] text-stone-500 dark:text-slate-400">
                Simulated record, just for fun. Practice bots are not real players and nothing here is tracked.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-600 dark:text-slate-400">This bot has no profile yet.</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
