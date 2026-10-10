import type { Player } from "@shared/types";
import { Bot, MapPin } from "lucide-react";
import ProfileCardFrame from "./ProfileCardFrame";
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
  const profile = player.botProfile;
  const title = getPodiumTitleConfig(player.cosmetics?.podiumTitle);

  return (
    <ProfileCardFrame
      player={player}
      onClose={onClose}
      badges={
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5">
            <Bot size={11} aria-hidden />
            Practice bot
          </span>
          {title && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${botTitleBadgeClass(player.cosmetics?.podiumTitle)}`}>
              {title.label}
            </span>
          )}
        </>
      }
    >
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
    </ProfileCardFrame>
  );
}
