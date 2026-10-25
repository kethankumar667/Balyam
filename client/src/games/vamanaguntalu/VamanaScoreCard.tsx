import { Crown } from "lucide-react";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { CARD_CREAM, CARD_INK, CARD_INK_SOFT, TURN_GREEN, TURN_GREEN_BRIGHT } from "./vamanaTheme";

export interface VamanaScoreCardProps {
  name: string;
  avatar?: string;
  playerId?: string;
  isSelf: boolean;
  /** Seeds this player has captured so far (after the match, including the seeds kept from their row). */
  captured: number;
  /** Seeds currently sitting in this player's own row — informational, not yet theirs. */
  onRow: number;
  isActiveTurn: boolean;
  isBot?: boolean;
  /** True for the player ahead on captured seeds, so a crown can mark who is winning. */
  isLeading?: boolean;
  /** How much of the turn is left, 0 to 1. Drawn as a thin bar under the card while it is this player's turn. */
  turnFraction?: number | null;
  /** A tighter card for short screens. */
  compact?: boolean;
  /** Drops the face where the card sits in a column too narrow for it. */
  isAvatarHidden?: boolean;
}

/**
 * One player's side of the scoreboard, on a cream card. Whose turn it is travels in words as well as
 * in the green edge (an arrow and a label), so it never depends on colour alone, and the leader is
 * named by a crown that is hidden from the accessible name (the numbers already say who is ahead).
 */
export function VamanaScoreCard({ name, avatar, playerId, isSelf, captured, onRow, isActiveTurn, isBot, isLeading = false, turnFraction = null, compact, isAvatarHidden = false }: VamanaScoreCardProps) {
  const role = isSelf ? "You" : isBot ? "Bot" : "";
  const detail = isActiveTurn ? (isSelf ? "▶ Your turn" : "▶ Their turn") : `${onRow} on row`;

  return (
    <div
      className={`relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-[1.25rem] ${compact ? "px-2.5 py-1.5" : "px-2 py-2.5 md:gap-3.5 md:px-4 md:py-3.5"}`}
      style={{
        background: CARD_CREAM,
        border: `2px solid ${isActiveTurn ? TURN_GREEN_BRIGHT : "rgba(255,244,214,0.85)"}`,
        boxShadow: isActiveTurn ? "0 0 0 2px rgba(74,222,128,0.28), 0 8px 18px rgba(0,0,0,0.4)" : "0 6px 14px rgba(0,0,0,0.38)",
      }}
    >
      {!isAvatarHidden && (
        <SeatAvatar avatar={avatar} playerId={playerId} name={name} className={compact ? "hidden h-8 w-8 min-[360px]:inline-flex" : "hidden h-8 w-8 min-[340px]:inline-flex md:h-14 md:w-14"} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate font-bold ${compact ? "text-xs" : "text-[13px] md:text-lg"}`} style={{ color: CARD_INK }}>
            {name}
          </span>
          {/* A phone has no room for the chip beside the name, so there the role is only spoken. */}
          {role && <span className="sr-only">({role})</span>}
          {!compact && role && (
            <span aria-hidden className="hidden rounded bg-amber-700/15 px-1 text-[10px] font-bold uppercase tracking-wide md:inline" style={{ color: CARD_INK_SOFT }}>
              {role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 truncate text-[11px] font-semibold md:text-sm" style={{ color: isActiveTurn ? TURN_GREEN : CARD_INK_SOFT }}>
          {isLeading && <Crown aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" fill="currentColor" />}
          <span className="truncate">{detail}</span>
        </div>
      </div>
      <div className="text-right leading-none">
        <div className={`font-black tabular-nums ${compact ? "text-xl" : "text-2xl md:text-[2.5rem]"}`} style={{ color: CARD_INK }}>
          {captured}
        </div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider md:text-xs" style={{ color: CARD_INK_SOFT }}>
          seeds
        </div>
      </div>
      {isActiveTurn && turnFraction !== null && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <span
            className="block h-full rounded-r-full motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-linear"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, turnFraction)) * 100)}%`, background: TURN_GREEN_BRIGHT }}
          />
        </span>
      )}
    </div>
  );
}
