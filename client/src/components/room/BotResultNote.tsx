import type { Player } from "@shared/types";
import { getPodiumTitleConfig } from "../../lib/cosmeticsResolver";
import { botTitleBadgeClass } from "./BotStyleChip";

/**
 * A bot's title and one-line tagline, for a results screen: the same character the lobby
 * showed, carried through to the end of the match.
 *
 * Renders nothing for a human or a bot without a profile, so a scorecard can drop it under
 * any player without checking first. It takes its colour from the surface it sits on
 * (`currentColor` at reduced opacity) because the scorecards are cream, dark and notebook
 * ruled in different games.
 */
export default function BotResultNote({ player, className = "" }: { player: Player | undefined | null; className?: string }) {
  if (!player?.isBot || !player.botProfile) return null;
  const title = getPodiumTitleConfig(player.cosmetics?.podiumTitle);

  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 text-[10px] font-semibold ${className}`}>
      {title && (
        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${botTitleBadgeClass(player.cosmetics?.podiumTitle)}`}>
          {title.label}
        </span>
      )}
      <span className="min-w-0 opacity-80 sm:truncate">{player.botProfile.tagline}</span>
    </div>
  );
}
