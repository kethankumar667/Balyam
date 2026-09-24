import type { ReactNode } from "react";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import {
  FRIENDSHIP_MILESTONE_LABELS,
  type FriendshipMilestone,
  type FriendshipMilestoneKind,
} from "@shared/social/Friendship";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { SURFACES } from "../../design-system/dls";
import { StreakFlameIcon } from "../../design-system/icons";
import type { LoadState } from "./useLoadable";

interface SharedHistoryModalProps {
  /** The friend whose timeline this is. `null` keeps the dialog closed. */
  friend: Friend | null;
  history: SharedHistory | null;
  state: LoadState;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

const DOT_COLOUR: Record<FriendshipMilestoneKind, string> = {
  FRIENDS_SINCE: "bg-emerald-400",
  FIRST_MATCH: "bg-amber-400",
  FIRST_WIN: "bg-yellow-300",
  MATCHES_10: "bg-amber-400",
  MATCHES_50: "bg-amber-400",
  MATCHES_100: "bg-amber-400",
  MATCHES_500: "bg-amber-400",
  MATCHES_1000: "bg-amber-400",
  FIRST_TOURNAMENT: "bg-purple-400",
};

const formatDay = (epochMs: number): string =>
  new Date(epochMs).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-1 text-left">
      <dt className="text-[10px] font-mono text-stone-500 uppercase">{label}</dt>
      <dd className="text-lg font-black font-mono text-stone-100">{children}</dd>
    </div>
  );
}

function Timeline({ milestones }: { milestones: FriendshipMilestone[] }) {
  return (
    <ol aria-label="Friendship timeline" className="relative border-l border-stone-700 ml-2 space-y-4 text-left">
      {milestones.map((m) => (
        <li key={m.kind} className="pl-5 relative">
          <span
            aria-hidden="true"
            className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${DOT_COLOUR[m.kind]}`}
          />
          <p className="text-sm font-bold text-stone-100">{FRIENDSHIP_MILESTONE_LABELS[m.kind]}</p>
          <p className="text-[11px] font-mono text-stone-500">{formatDay(m.reachedAt)}</p>
        </li>
      ))}
    </ol>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your timeline" className="space-y-3">
      <div className="h-20 rounded-xl bg-stone-800/60 animate-pulse motion-reduce:animate-none" />
      <div className="h-24 rounded-xl bg-stone-800/60 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

/**
 * The friendship timeline: what two friends have shared, and the moments worth
 * remembering.
 *
 * Only real numbers are shown. Wins and tournaments together appear only once
 * there is one — a room reports a single winner and does not yet say when a
 * match is a tournament, so those figures are honestly zero for now, and a
 * permanent "0" would read as a statement about the friendship rather than a
 * gap in what is recorded. A bottom sheet on a phone, a centred panel from
 * `md:` up.
 */
export default function SharedHistoryModal({
  friend,
  history,
  state,
  error,
  onRetry,
  onClose,
}: SharedHistoryModalProps) {
  if (!friend) return null;

  // A different friend's data can still be in hand for one render after the
  // friend changes; showing it under the wrong name would be worse than waiting.
  const isCurrent = history?.friendPlayerId === friend.friendPlayerId;
  const effectiveState: LoadState = state === "ready" && !isCurrent ? "loading" : state;
  const streak = history?.currentStreakDays ?? 0;
  const best = history?.bestStreakDays ?? 0;
  const played = history?.matchesPlayedTogether ?? 0;
  const milestones = history?.milestones ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabelledBy="friendship-timeline-title"
      mobileSheet
      panelClassName={`w-full md:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-6 sm:p-8 ${SURFACES.modalHero} space-y-5 border border-stone-800 shadow-2xl`}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <SeatAvatar
          avatar={friend.avatar}
          name={friend.displayName}
          className="w-16 h-16 rounded-2xl border border-stone-800 shadow"
          textClassName="text-2xl"
        />
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block">
            Friendship timeline
          </span>
          <h3 id="friendship-timeline-title" className="text-xl font-black text-stone-100">
            You &amp; {friend.displayName}
          </h3>
        </div>
      </div>

      {effectiveState === "loading" && <Skeleton />}

      {effectiveState === "error" && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <p className="text-sm font-bold text-rose-400">{error ?? "Couldn't load your timeline."}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black font-mono uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Retry
          </button>
        </div>
      )}

      {effectiveState === "ready" && history && (
        <>
          <dl className="grid grid-cols-2 gap-2.5">
            <Stat label="Matches together">{played}</Stat>
            <Stat label="Streak">
              <span className="inline-flex items-center gap-1.5">
                {streak > 0 && <StreakFlameIcon size={16} className="text-amber-400" />}
                {streak > 0 ? `${streak}-day streak` : "None active"}
              </span>
            </Stat>
            {history.winsTogether > 0 && <Stat label="Wins together">{history.winsTogether}</Stat>}
            {history.tournamentsTogether > 0 && (
              <Stat label="Tournaments together">{history.tournamentsTogether}</Stat>
            )}
            {best > 0 && <Stat label="Best streak">{best} {best === 1 ? "day" : "days"}</Stat>}
          </dl>

          {history.firstPlayedAt !== undefined && (
            <p className="text-xs font-mono text-stone-400 text-center">
              First played together {formatDay(history.firstPlayedAt)}
            </p>
          )}

          {milestones.length > 0 ? (
            <Timeline milestones={milestones} />
          ) : (
            <p role="status" className="text-xs text-stone-400 text-center leading-relaxed">
              {played === 0
                ? "You haven't played a match together yet. Your timeline starts with your first one."
                : "No milestones yet — they appear as you keep playing together."}
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[44px] bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 rounded-xl text-xs font-mono uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Close
      </button>
    </Modal>
  );
}
