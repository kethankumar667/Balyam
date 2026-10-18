import { useState } from "react";
import type { GameKind } from "@shared/types";
import { DEFAULT_WORLD, type WorldId } from "@shared/worlds";
import { getSocket } from "../socket";
import { artWorldsFor, drawnWorld } from "./worldArt";
import { useWorldProgress, type WorldProgress } from "./useWorldProgress";

export interface WorldChoice {
  /** Whether this game has more than the classic table to choose from. */
  canChoose: boolean;
  /** The world the table is drawn in now. */
  current: WorldId;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Why the server refused the last choice, if it did. */
  error: string | null;
  /** Asks the server for a world. The picker closes only when the server says yes. */
  choose: (next: WorldId) => void;
  progress: WorldProgress;
}

/**
 * The host's choosing of the table's world, shared by the lobby card and the in-game control. The choice goes to the
 * server, which decides (host only, a world this game has, not on a finished table), and what is shown afterwards is
 * what the server says back, never what was merely asked for. `onChanged` runs once the server has agreed, so a menu the
 * choice was made from can get out of the way and let the host see the new table.
 */
export function useWorldChoice(game: GameKind, world: WorldId | undefined, onChanged?: () => void): WorldChoice {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useWorldProgress(game);
  const current = drawnWorld(game, world ?? DEFAULT_WORLD);

  const choose = (next: WorldId): void => {
    setError(null);
    if (next === current) {
      setIsOpen(false);
      return;
    }
    getSocket().emit("room:setWorld", next, (response) => {
      if (response?.ok) {
        setIsOpen(false);
        onChanged?.();
      } else setError(response?.error ?? "The world could not be changed.");
    });
  };

  return {
    canChoose: artWorldsFor(game).length >= 2,
    current,
    isOpen,
    open: () => {
      setError(null);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    error,
    choose,
    progress,
  };
}
