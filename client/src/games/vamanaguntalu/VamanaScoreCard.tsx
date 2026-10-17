import SeatAvatar from "../../components/profile/SeatAvatar";

export interface VamanaScoreCardProps {
  name: string;
  avatar?: string;
  isSelf: boolean;
  /** Seeds this player has captured so far (after the match, including the seeds kept from their row). */
  captured: number;
  /** Seeds currently sitting in this player's own row — informational, not yet theirs. */
  onRow: number;
  isActiveTurn: boolean;
  isBot?: boolean;
  /** A tighter card for phones. */
  compact?: boolean;
}

/**
 * One player's side of the scoreboard. Whose turn it is travels in words as well as in the highlight
 * (an icon and a label), so it never depends on colour alone.
 */
export function VamanaScoreCard({ name, avatar, isSelf, captured, onRow, isActiveTurn, isBot, compact }: VamanaScoreCardProps) {
  const role = isSelf ? "You" : isBot ? "Bot" : "";
  const detail = compact
    ? isActiveTurn
      ? "▶ Turn"
      : `${onRow} on row`
    : isActiveTurn
      ? isSelf
        ? "▶ Your turn"
        : "▶ Their turn"
      : `${onRow} on their row`;

  return (
    <div
      className={`relative flex min-w-0 items-center gap-2.5 rounded-2xl border ${compact ? "px-2.5 py-1.5" : "px-3.5 py-3"} ${
        isActiveTurn ? "border-amber-300/70 bg-amber-200/10" : "border-white/10 bg-black/30"
      }`}
    >
      <SeatAvatar
        avatar={avatar}
        name={name}
        className={compact ? "hidden h-8 w-8 min-[360px]:inline-flex" : "h-11 w-11"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate font-semibold text-amber-50 ${compact ? "text-xs" : "text-sm"}`}>{name}</span>
          {compact && role && <span className="sr-only">({role})</span>}
          {!compact && role && (
            <span className="rounded bg-amber-300/20 px-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">{role}</span>
          )}
        </div>
        <div className="truncate text-[11px] text-amber-100/80">{detail}</div>
      </div>
      <div className="text-right leading-none">
        <div className={`font-black tabular-nums text-amber-200 ${compact ? "text-xl" : "text-3xl"}`}>{captured}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-amber-100/70">seeds</div>
      </div>
    </div>
  );
}
