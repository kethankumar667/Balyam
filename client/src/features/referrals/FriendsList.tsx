import { UserRound, Users } from "lucide-react";
import type { ReferralFriend, ReferralOverview } from "@shared/referrals";
import { ReferralChip } from "./ReferralChip";
import { PlayTogetherButton } from "./PlayTogetherButton";
import { describeBonus, describeFriendStatus, formatShortDate, FRIEND_STATUS_TONE } from "./referralCopy";

interface FriendsListProps {
  friends: ReferralFriend[];
  campaign: ReferralOverview["campaign"];
  serverNow: number;
}

function FriendRow({ friend, campaign, serverNow }: { friend: ReferralFriend; campaign: ReferralOverview["campaign"]; serverNow: number }) {
  const status = describeFriendStatus(friend.status, friend.expiresAt, serverNow);
  const yours = describeBonus(friend.yourBonus, campaign, serverNow);
  const theirs = describeBonus(friend.theirBonus, campaign, serverNow);
  return (
    <li className="rounded-2xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300"><UserRound size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="truncate text-base font-black text-[var(--auth-ink)]">
              <span className="mr-2 font-mono text-xs font-bold text-[var(--auth-ink-soft)]">#{friend.ordinal}</span>{friend.displayName}
            </p>
            <p className="text-[11px] text-[var(--auth-ink-soft)]">Joined {formatShortDate(friend.joinedAt)}{friend.via === "code" ? " · code" : " · link"}</p>
          </div>
          <div className="mt-2"><ReferralChip tone={FRIEND_STATUS_TONE[friend.status]} label={status} /></div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <ReferralChip tone={yours.tone} prefix="Your bonus" label={yours.label} />
            <ReferralChip tone={theirs.tone} prefix="Their bonus" label={theirs.label} />
          </div>
          {friend.status === "JOINED" && friend.expiresAt > serverNow && <PlayTogetherButton friendName={friend.displayName} />}
        </div>
      </div>
    </li>
  );
}

export function FriendsList({ friends, campaign, serverNow }: FriendsListProps) {
  return (
    <section aria-labelledby="friends-title" className="rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 sm:p-6">
      <h2 id="friends-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--auth-ink-soft)]">
        <Users size={15} aria-hidden="true" /> Friends who joined with your code
      </h2>
      {friends.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--auth-field-edge)] px-4 py-8 text-center">
          <p className="text-sm font-bold text-[var(--auth-ink)]">No one has joined with your code yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--auth-ink-soft)]">
            Share your code above. When a friend signs up and finishes a match with another person, they appear here with both bonuses.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {friends.map(friend => <FriendRow key={friend.ordinal} friend={friend} campaign={campaign} serverNow={serverNow} />)}
        </ul>
      )}
    </section>
  );
}
