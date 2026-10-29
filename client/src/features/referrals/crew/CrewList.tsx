import { useState } from "react";
import { Check, Gamepad2, Gem, UsersRound } from "lucide-react";
import type { ReferralFriend, ReferralOverview } from "@shared/referrals";
import { AlbumAvatar } from "../../../components/mandali/album/AlbumAvatar";
import { PlayTogetherButton } from "../PlayTogetherButton";
import { ReferralChip } from "../ReferralChip";
import { describeBonus, formatShortDate } from "../referralCopy";
import { friendTrack, type BadgeTone, type FriendTrack, type StepState } from "./crewProgress";
import { GHOST_BUTTON, HEADING, MUTED, PANEL } from "./crewStyles";

/** How many friends show before "View all". Three fits the first screen without pushing the vault and rules away. */
const VISIBLE_FRIENDS = 3;

const BADGE: Record<BadgeTone, string> = {
  info: "border-sky-400 dark:border-cyan-300/50 bg-sky-50 dark:bg-cyan-300/10 text-sky-700 dark:text-cyan-200",
  pending: "border-violet-400 dark:border-purple-400/60 bg-violet-100 dark:bg-purple-500/15 text-violet-700 dark:text-purple-200",
  success: "border-emerald-500 dark:border-emerald-400/60 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500 dark:border-amber-400/60 bg-amber-50 dark:bg-amber-400/10 text-amber-800 dark:text-amber-200",
  muted: "border-slate-300 bg-slate-100 dark:border-slate-500/50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300",
};
const NODE: Record<StepState, string> = {
  done: "border-emerald-400 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300",
  current: "border-[#ffb800] bg-[#ffb800]/15 text-amber-700 dark:text-[#ffd76a]",
  upcoming: "border-slate-500/60 bg-slate-500/10 text-slate-500",
  ended: "border-slate-500/40 bg-slate-500/10 text-slate-500",
};
const STATE_WORD: Record<StepState, string> = { done: "completed", current: "in progress", upcoming: "not started yet", ended: "ended" };
const STEP_ICON = { joined: Check, played: Gamepad2, reward: Gem } as const;

/**
 * Joined, Play Match, Reward as three nodes on a line. Drawn for the eye only: the same facts are written out in a
 * sentence for a screen reader, so the nodes carry no semantics of their own.
 */
function MiniTrack({ steps }: { steps: FriendTrack["steps"] }) {
  return (
    <div>
      <p className="sr-only">{steps.map((step) => `${step.label}: ${STATE_WORD[step.state]}.`).join(" ")}</p>
      <div aria-hidden="true" className="flex items-start">
        {steps.map((step, index) => {
          const Icon = step.state === "done" ? Check : STEP_ICON[step.key];
          return (
            <div key={step.key} className="contents">
              <div className="flex w-[72px] shrink-0 flex-col items-center gap-1 text-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${NODE[step.state]} ${step.key === "reward" && step.state === "current" ? "motion-safe:animate-pulse" : ""}`}>
                  <Icon size={16} />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-600 dark:text-[#b6c4d8]">{step.label}</span>
              </div>
              {index < steps.length - 1 && <span className={`mt-[17px] h-0 flex-1 border-t-2 border-dashed ${step.state === "done" ? "border-emerald-400/70" : "border-slate-500/50"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrewMemberCard({ friend, campaign, now }: { friend: ReferralFriend; campaign: ReferralOverview["campaign"]; now: number }) {
  const track = friendTrack(friend, campaign, now);
  const yours = describeBonus(friend.yourBonus, campaign, now);
  const theirs = describeBonus(friend.theirBonus, campaign, now);
  const showBonuses = friend.yourBonus.state !== "NONE" || friend.theirBonus.state !== "NONE";
  const canPlay = friend.status === "JOINED" && friend.expiresAt > now;
  return (
    <li className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <AlbumAvatar avatar={friend.avatarId ?? undefined} name="" size="md" />
        <div className="min-w-0 flex-1">
          <p className="m-0 break-words text-base font-black leading-snug text-slate-900 dark:text-white">{friend.displayName}</p>
          <p className={`m-0 mt-0.5 text-[11px] ${MUTED}`}>
            Joined {formatShortDate(friend.joinedAt)} · {friend.via === "code" ? "Code used" : "Link used"}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-black ${BADGE[track.badge.tone]}`}>{track.badge.label}</span>
      </div>
      <div className="mt-3 max-w-sm">
        <MiniTrack steps={track.steps} />
      </div>
      {track.note && <p className="m-0 mt-3 text-xs leading-relaxed text-slate-600 dark:text-[#b6c4d8]">{track.note}</p>}
      {showBonuses && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ReferralChip tone={yours.tone} prefix="Your bonus" label={yours.label} />
          <ReferralChip tone={theirs.tone} prefix="Their bonus" label={theirs.label} />
        </div>
      )}
      {canPlay && <PlayTogetherButton friendName={friend.displayName} label="Play Together" className="mt-3" />}
    </li>
  );
}

interface CrewListProps {
  friends: ReferralFriend[];
  campaign: ReferralOverview["campaign"];
  serverNow: number;
}

export function CrewList({ friends, campaign, serverNow }: CrewListProps) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? friends : friends.slice(0, VISIBLE_FRIENDS);
  return (
    <section aria-labelledby="crew-list-title" className={PANEL}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="crew-list-title" className={HEADING}>
            <UsersRound size={15} aria-hidden="true" className="text-sky-700 dark:text-cyan-300" /> Your crew
          </h2>
          <p className={`m-0 mt-1 text-xs ${MUTED}`}>Track each invitation from joining to reward delivery.</p>
        </div>
        {friends.length > VISIBLE_FRIENDS && (
          <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} className={GHOST_BUTTON}>
            {showAll ? "Show fewer" : `View all (${friends.length})`}
          </button>
        )}
      </div>
      {friends.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-white/20 px-4 py-8 text-center">
          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">No one has joined with your code yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-600 dark:text-[#b6c4d8]">
            Share your code above. When a friend signs up and finishes a match with another person, they appear here with both bonuses.
          </p>
        </div>
      ) : (
        <ul className="m-0 mt-4 list-none space-y-3 p-0">
          {shown.map((friend) => <CrewMemberCard key={friend.ordinal} friend={friend} campaign={campaign} now={serverNow} />)}
        </ul>
      )}
    </section>
  );
}
