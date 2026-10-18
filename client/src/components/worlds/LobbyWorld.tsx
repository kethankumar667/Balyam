import { useState } from "react";
import type { GameKind } from "@shared/types";
import { DEFAULT_WORLD, type WorldId } from "@shared/worlds";
import { getSocket } from "../../lib/socket";
import { artWorldsFor, drawnWorld } from "../../lib/worlds/worldArt";
import { WORLD_META } from "../../lib/worlds/worldMeta";
import { useWorldProgress } from "../../lib/worlds/useWorldProgress";
import { WorldPickerDialog } from "./WorldPickerDialog";
import { WorldSwatch } from "./WorldSwatch";

export interface LobbyWorldProps {
  game: GameKind;
  /** The table's world as the server last said it. Absent from a server that predates worlds, which reads as the classic one. */
  world: WorldId | undefined;
  isHost: boolean;
}

/**
 * The lobby's line about the table's world. Everyone sees which world the table is in; the host also gets the button
 * that opens the choices. The choice goes to the server, which decides (host only, lobby only, a world this game has),
 * and the card shows what the server says back, never what was merely asked for.
 */
export function LobbyWorld({ game, world, isHost }: LobbyWorldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useWorldProgress(game);
  // Offered only when there is more than the classic table to choose, and only the worlds this game can draw.
  if (artWorldsFor(game).length < 2) return null;

  const current = drawnWorld(game, world ?? DEFAULT_WORLD);
  const meta = WORLD_META[current];

  const choose = (next: WorldId): void => {
    setError(null);
    if (next === current) {
      setIsOpen(false);
      return;
    }
    getSocket().emit("room:setWorld", next, (response) => {
      if (response?.ok) setIsOpen(false);
      else setError(response?.error ?? "The world could not be changed.");
    });
  };

  return (
    <section aria-label="Table world" className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:p-3.5">
      <WorldSwatch world={current} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">Table world</div>
        <div className="truncate text-sm font-black text-[#2B3550] dark:text-slate-100 sm:text-base">{meta.name}</div>
        <div className="text-xs leading-snug text-stone-600 dark:text-slate-300">{meta.blurb}</div>
        {!isHost && <div className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400">Chosen by the host</div>}
      </div>
      {isHost && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className="inline-flex min-h-[44px] flex-shrink-0 cursor-pointer items-center rounded-full border border-amber-300/70 bg-amber-100 px-4 text-xs font-bold text-amber-900 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-95 dark:border-amber-700/60 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Change world
        </button>
      )}
      {isHost && <WorldPickerDialog open={isOpen} onClose={() => setIsOpen(false)} game={game} current={current} unlocked={progress.unlocked} isAllOpen={progress.isAllOpen} onChoose={choose} error={error} />}
    </section>
  );
}
