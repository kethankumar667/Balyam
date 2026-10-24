import type { GameKind } from "@shared/types";
import { Palette } from "lucide-react";
import { useRoomStore } from "../../store/roomStore";
import { WORLD_META } from "../../lib/worlds/worldMeta";
import { useWorldChoice } from "../../lib/worlds/useWorldChoice";
import { WorldPickerDialog } from "./WorldPickerDialog";
import { WorldSwatch } from "./WorldSwatch";

export interface TableWorldControlProps {
  game: GameKind;
  /**
   * `row` fills a menu with the world's swatch and name; `chip` is a text header button; `icon` is a touch-sized palette;
   * `nav` adds a visible Theme label below the palette.
   * All open the same picker.
   */
  variant: "row" | "chip" | "icon" | "nav";
  /** Extra classes for the trigger (the icon surface in `nav`), so each game can match its own buttons. */
  className?: string;
  /** Runs once the server has changed the world, so the menu this sits in can close and show the new table. */
  onChanged?: () => void;
}

/**
 * The host's way to change the table's world while a match is under way. Only the host sees it (the server refuses
 * anyone else anyway), and only while the match is live: the lobby has its own card (`LobbyWorld`), and a finished table
 * is left as it was. The picker offers the worlds this host has unlocked (all of them for an account that opens
 * everything), and every player's table changes at once when the server confirms.
 */
export function TableWorldControl({ game, variant, className = "", onChanged }: TableWorldControlProps) {
  const roomState = useRoomStore((s) => s.roomState);
  const playerId = useRoomStore((s) => s.playerId);
  const choice = useWorldChoice(game, roomState?.world, onChanged);
  if (!roomState || roomState.hostId !== playerId || roomState.phase !== "playing" || !choice.canChoose) return null;

  const meta = WORLD_META[choice.current];
  return (
    <>
      {variant === "row" ? (
        <button
          type="button"
          onClick={choice.open}
          className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${className}`}
        >
          <WorldSwatch world={choice.current} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Table world</span>
            <span className="block truncate text-sm font-bold">{meta.name}</span>
          </span>
          <span className="flex-shrink-0 text-xs font-bold underline underline-offset-2">Change</span>
        </button>
      ) : (
        <button type="button" onClick={choice.open}
          className={variant === "nav"
            ? "flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer flex-col items-center gap-1 rounded-xl transition active:scale-95 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            : variant === "icon"
              ? `inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${className}`
              : className}
          title="Change the table's world" aria-label={variant === "nav" ? "Change table theme" : "Change the table's world"}
          aria-haspopup="dialog" aria-expanded={choice.isOpen}>
          {variant === "nav" ? (
            <>
              <span className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md ${className}`}>
                <Palette size={19} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider short-land:hidden">Theme</span>
            </>
          ) : variant === "icon" ? <Palette size={18} aria-hidden="true" /> : "World"}
        </button>
      )}
      <WorldPickerDialog
        open={choice.isOpen}
        onClose={choice.close}
        game={game}
        current={choice.current}
        unlocked={choice.progress.unlocked}
        isAllOpen={choice.progress.isAllOpen}
        onChoose={choice.choose}
        error={choice.error}
      />
    </>
  );
}
