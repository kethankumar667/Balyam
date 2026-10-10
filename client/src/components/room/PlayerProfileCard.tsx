import type { Player } from "@shared/types";
import ProfileCardFrame from "./ProfileCardFrame";
import { botTitleBadgeClass } from "./BotStyleChip";
import { getPodiumTitleConfig } from "../../lib/cosmeticsResolver";

/**
 * A person at the table, up close.
 *
 * Everything here is what every other player already sees of them: their name, avatar and aura,
 * level, title, whether they are the host, a guest, and whether they are here right now. Nothing
 * extra is fetched or sent to open it, and nothing private (a wallet, an account, a history) is
 * on it. The card says so, so it is never mistaken for a dossier.
 */
const CHIP =
  "inline-flex items-center text-[10px] font-bold rounded-md px-1.5 py-0.5 border text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700";

export default function PlayerProfileCard({
  player,
  isSelf = false,
  onClose,
}: {
  player: Player;
  /** True for the viewer's own seat. */
  isSelf?: boolean;
  onClose: () => void;
}) {
  const title = getPodiumTitleConfig(player.cosmetics?.podiumTitle);

  return (
    <ProfileCardFrame
      player={player}
      onClose={onClose}
      badges={
        <>
          {isSelf && <span className={CHIP}>You</span>}
          {typeof player.level === "number" && <span className={CHIP}>Level {player.level}</span>}
          {player.isHost && <span className={CHIP}>Host</span>}
          {player.isGuest && <span className={CHIP}>Guest</span>}
          {title && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${botTitleBadgeClass(player.cosmetics?.podiumTitle)}`}>
              {title.label}
            </span>
          )}
          <span
            className={`${CHIP} ${player.isConnected ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}
          >
            {player.isConnected ? "Online" : "Reconnecting"}
          </span>
        </>
      }
    >
      <p className="mt-4 text-[11px] text-stone-500 dark:text-slate-400">
        This is what everyone at the table can see about a player.
      </p>
    </ProfileCardFrame>
  );
}
