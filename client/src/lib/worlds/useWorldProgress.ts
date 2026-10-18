import { useEffect, useMemo, useState } from "react";
import type { GameKind } from "@shared/types";
import { WORLD_IDS, worldsEarnedBy, worldsFor, type WorldId } from "@shared/worlds";
import { useAuthStore } from "../../store/authStore";
import { WORLD_WINS_CHANGED_EVENT, WORLD_WINS_STORAGE_KEY, countsAsWorldWin, loadWinCounts, recordWorldWin, type WinCheck } from "./worldWins";

export interface WorldProgress {
  /** Matches won in this game, against other people. */
  wins: number;
  /** The worlds this player can choose in this game: the ones earned, or all of them for an account that opens everything. */
  unlocked: readonly WorldId[];
  /** True when everything is open because of the account, not because it was earned. Nothing of that is ever saved. */
  isAllOpen: boolean;
}

/** The win counts, kept current: told by this page when it counts a win, and by another tab when it does. */
function useWinCounts() {
  const [counts, setCounts] = useState(loadWinCounts);
  useEffect(() => {
    const refresh = () => setCounts(loadWinCounts());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === WORLD_WINS_STORAGE_KEY) refresh();
    };
    window.addEventListener(WORLD_WINS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORLD_WINS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return counts;
}

/**
 * Which worlds this player may choose in a game. Earned by winning (see `shared/worlds.ts`), and every one open for
 * an account that can unlock everything, so it can be tested and reviewed. The open state is only ever shown: the
 * real count is never touched by it.
 */
export function useWorldProgress(game: GameKind): WorldProgress {
  const counts = useWinCounts();
  const isAllOpen = useAuthStore((state) => state.capabilities.unlockAllFeatures);
  const hasWorlds = worldsFor(game).length > 0;
  const wins = game === "ludo" || game === "rummy" ? counts[game] : 0;
  return useMemo(() => {
    if (!hasWorlds) return { wins, unlocked: [], isAllOpen: false };
    return { wins, unlocked: isAllOpen ? [...WORLD_IDS] : worldsEarnedBy(wins), isAllOpen };
  }, [hasWorlds, isAllOpen, wins]);
}

export interface CountWorldWinInput extends WinCheck {
  roomCode: string;
}

/**
 * Counts this player's win toward their worlds when a match they won against other people ends. Safe to run on
 * every render of the finished screen: a room is only ever counted once.
 */
export function useCountWorldWin({ game, phase, winnerId, selfId, players, roomCode }: CountWorldWinInput): void {
  useEffect(() => {
    if (countsAsWorldWin({ game, phase, winnerId, selfId, players })) recordWorldWin(game, roomCode);
  }, [game, phase, winnerId, selfId, players, roomCode]);
}
