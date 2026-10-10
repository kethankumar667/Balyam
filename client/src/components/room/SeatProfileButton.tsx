import { useState } from "react";
import type { Player } from "@shared/types";
import { Info } from "lucide-react";
import BotProfileCard from "./BotProfileCard";
import PlayerProfileCard from "./PlayerProfileCard";

/**
 * The small ⓘ that opens anyone's profile, for any seat, in any game.
 *
 * It owns its own open/closed state and renders the right card — a practice bot's, or a
 * person's — so a board only has to drop `<SeatProfileButton player={p} />` onto a seat. The
 * tap is kept off the seat underneath it, because a seat's own tap already means "send this
 * player a reaction".
 *
 * Renders nothing for a bot that has no profile, so a caller never has to check first.
 */
export default function SeatProfileButton({
  player,
  isSelf = false,
  className = "",
  iconSize = 16,
  compact = false,
}: {
  player: Player;
  isSelf?: boolean;
  /** Extra classes for the button, e.g. to colour it for a dark seat. */
  className?: string;
  iconSize?: number;
  /** A 32px target instead of 44px, for a seat with no room (desktop, mouse-driven). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (player.isBot && !player.botProfile) return null;

  const label = `View ${player.name}'s profile`;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`${compact ? "h-8 w-8 flex-shrink-0" : "min-w-[44px] min-h-[44px]"} flex items-center justify-center ${/text-/.test(className) ? "" : "text-[#8A6D4B] hover:text-[#EA5A1F]"} transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F] rounded-lg cursor-pointer ${className}`}
        title={label}
        aria-label={label}
      >
        <Info size={iconSize} aria-hidden />
      </button>
      {open && (player.isBot ? (
        <BotProfileCard player={player} onClose={() => setOpen(false)} />
      ) : (
        <PlayerProfileCard player={player} isSelf={isSelf} onClose={() => setOpen(false)} />
      ))}
    </>
  );
}
