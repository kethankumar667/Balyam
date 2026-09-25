import { useMemo } from "react";
import { Flame, ShieldAlert } from "lucide-react";
import type { GameKind, LudoToken } from "@shared/types";

export function isGameInClimax(game: GameKind, gameState: Record<string, unknown> | null): boolean {
  if (!gameState) return false;

  // Ludo: any player has 3 tokens safely in home
  if (game === "ludo") {
    const tokens = gameState.tokens as Record<string, LudoToken[]> | undefined;
    if (tokens) {
      for (const list of Object.values(tokens)) {
        const homeCount = list.filter((t) => t.state === "home" || (t.stretchPos !== undefined && t.stretchPos >= 5)).length;
        if (homeCount >= 3) return true;
      }
    }
  }

  // Snakes & Ladders: any player at square 90 or above
  if (game === "snl") {
    const positions = (gameState.positions as Record<string, number> | undefined) ?? {};
    for (const pos of Object.values(positions)) {
      if (typeof pos === "number" && pos >= 90) return true;
    }
  }

  // UNO: any player with 1 card left
  if (game === "uno") {
    const cardCounts = (gameState.cardCounts as Record<string, number> | undefined) ?? {};
    for (const count of Object.values(cardCounts)) {
      if (count === 1) return true;
    }
    if (gameState.lastAction === "uno" || gameState.isUno) return true;
  }

  // Hand Cricket: Inning 2 with <= 12 runs to win, or <= 6 balls remaining
  if (game === "handcricket") {
    const innings = Number(gameState.currentInning ?? gameState.innings ?? 1);
    if (innings === 2) {
      const target = Number(gameState.target ?? 0);
      const runs = Number(gameState.runs ?? gameState.teamRuns ?? 0);
      const ballsLeft = Number(gameState.ballsRemaining ?? 6);
      if (target > 0 && target - runs <= 12) return true;
      if (ballsLeft <= 6) return true;
    }
  }

  // Dots & Boxes: <= 5 boxes unclaimed
  if (game === "dotsboxes") {
    const totalBoxes = Number(gameState.totalBoxes ?? 16);
    const claimedBoxes = Number(gameState.claimedCount ?? Object.keys((gameState.boxes as Record<string, unknown>) ?? {}).length);
    if (totalBoxes > 0 && totalBoxes - claimedBoxes <= 5) return true;
  }

  return false;
}

interface TvClimaxBannerProps {
  game: GameKind;
  gameState: Record<string, unknown> | null;
}

export function TvClimaxBanner({ game, gameState }: TvClimaxBannerProps) {
  const inClimax = useMemo(() => isGameInClimax(game, gameState), [game, gameState]);

  if (!inClimax) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 border border-amber-300 text-amber-100 font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse">
      <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">CLIMAX • MATCH POINT</span>
      <ShieldAlert className="w-4 h-4 text-amber-200 animate-pulse" />
    </div>
  );
}
