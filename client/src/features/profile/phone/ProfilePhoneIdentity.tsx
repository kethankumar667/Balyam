import { Check, Copy, Pencil, ShieldCheck } from "lucide-react";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { describeXpJourney } from "../../../lib/xpJourney";
import { formatMemberDate } from "../ProfileHeader";
import { useCopyPlayerId } from "../useCopyPlayerId";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

const SECONDARY_ACTION =
  "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-surface-1 px-3 text-sm font-bold text-ink-hi transition hover:bg-surface-2 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-700";

export interface ProfilePhoneIdentityProps {
  profile: PlayerProfile;
  isMember?: boolean;
  name?: string;
  avatar?: string | null;
  onEditName?: () => void;
}

/**
 * Who the player is, in one short block: avatar, name, "Level 16 · Sharpshooter", membership and join date.
 *
 * Level PROGRESS is deliberately absent. It has one home, the next-move card below, so the same bar is never
 * drawn twice on one phone screen. Both actions are secondary; the one primary action on the page is "Play now".
 * The second button copies the player ID (that is what the hero's copy button has always done), so it says so.
 */
export default function ProfilePhoneIdentity({ profile, isMember = true, name, avatar, onEditName }: ProfilePhoneIdentityProps) {
  const { copied, copy } = useCopyPlayerId(profile.playerId);
  const journey = describeXpJourney(profile.experiencePoints);
  const displayName = (name ?? profile.displayName).trim() || "Player";
  const displayAvatar = avatar !== undefined ? avatar ?? undefined : profile.avatar;

  return (
    <section aria-label="Player identity">
      <div className="flex items-center gap-4">
        {/* Padding, not overflow-hidden: an equipped frame draws outside the avatar's circle. */}
        <div className="shrink-0 p-2">
          <SeatAvatar
            playerId={profile.playerId}
            avatar={displayAvatar}
            name={displayName}
            className="h-16 w-16"
            textClassName="text-xl font-black text-ink-hi"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black leading-tight tracking-[-0.03em] text-ink-hi">{displayName}</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink-mid">Level {journey.level} · {journey.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mid">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              {isMember ? "Member" : "Guest"}
            </span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatMemberDate(profile.joinedAt)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {onEditName ? (
          <button type="button" onClick={onEditName} className={SECONDARY_ACTION}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </button>
        ) : null}
        <button type="button" onClick={copy} className={SECONDARY_ACTION}>
          {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Player ID copied" : "Copy player ID"}
        </button>
      </div>
      {/* The button's own text changes, but a screen reader is only told when it is a live region. */}
      <span role="status" className="sr-only">{copied ? "Player ID copied" : ""}</span>
    </section>
  );
}
