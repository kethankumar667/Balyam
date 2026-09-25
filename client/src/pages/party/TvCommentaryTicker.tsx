import { useMemo, useState, useEffect, useRef } from "react";
import { Radio, Flame, Zap } from "lucide-react";
import type { GameKind, Player } from "@shared/types";

interface TvCommentaryTickerProps {
  game: GameKind;
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerName?: string;
}

export function TvCommentaryTicker({
  game,
  gameState,
  players,
  activePlayerName,
}: TvCommentaryTickerProps) {
  const [headline, setHeadline] = useState<string>("Welcome to Bhalyam TV Stadium! The arena is live.");
  const [headlineKey, setHeadlineKey] = useState(0);

  const prevRollRef = useRef<unknown>(null);
  const prevActionRef = useRef<unknown>(null);

  // Dynamic commentary generation based on live game events
  useEffect(() => {
    if (!gameState) return;

    // Hand Cricket Commentary
    if (game === "handcricket") {
      const isWicket = Boolean(gameState.wicket ?? gameState.isWicket ?? gameState.lastBallWicket);
      const runs = Number(gameState.lastBallRuns ?? gameState.lastRuns ?? 0);
      const target = Number(gameState.target ?? 0);
      const teamRuns = Number(gameState.runs ?? gameState.teamRuns ?? 0);
      const ballsLeft = Number(gameState.ballsRemaining ?? 0);

      if (isWicket && prevActionRef.current !== "wicket") {
        setHeadline(`💥 WICKET! Clean bowled! The stadium roars as the batter is sent back to the pavilion!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = "wicket";
        return;
      }
      if (runs === 6 && prevRollRef.current !== 6) {
        setHeadline(`🔥 MAXIMUM! Huge SIX smashed out of the park! The living room is on fire!`);
        setHeadlineKey((k) => k + 1);
        prevRollRef.current = 6;
        return;
      }
      if (runs === 4 && prevRollRef.current !== 4) {
        setHeadline(`🏏 CRACKING FOUR! Sliced through the covers for a boundary!`);
        setHeadlineKey((k) => k + 1);
        prevRollRef.current = 4;
        return;
      }
      if (target > 0 && target - teamRuns <= 12 && ballsLeft > 0) {
        setHeadline(`⚡ THRILLER IN PROGRESS: ${target - teamRuns} runs needed from ${ballsLeft} balls! Everyone is on the edge of their seats!`);
        setHeadlineKey((k) => k + 1);
        return;
      }
    }

    // Ludo Commentary
    if (game === "ludo") {
      const dice = gameState.diceValue ?? gameState.lastRoll;
      if (dice === 6 && prevRollRef.current !== 6) {
        setHeadline(`🎲 LUCKY SIX! ${activePlayerName ?? "Player"} rolls a 6! Extra turn granted!`);
        setHeadlineKey((k) => k + 1);
        prevRollRef.current = 6;
        return;
      }
      if (gameState.lastAction === "kill" || gameState.capturedPawn) {
        setHeadline(`⚔️ GOTCHA! Token hunted down and sent packing back to the base!`);
        setHeadlineKey((k) => k + 1);
        return;
      }
    }

    // Snakes & Ladders Commentary
    if (game === "snl") {
      const ev = (gameState.lastEvent as string | undefined) ?? (gameState.event as string | undefined);
      if (ev === "snake" && prevActionRef.current !== "snake") {
        setHeadline(`🐍 DISASTER! Slipped right down the serpent's belly! The couch is groaning!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = "snake";
        return;
      }
      if (ev === "ladder" && prevActionRef.current !== "ladder") {
        setHeadline(`🪜 SKY HIGH! Climbing the ladder straight into prime position!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = "ladder";
        return;
      }
    }

    // UNO Commentary
    if (game === "uno") {
      const topCard = gameState.topCard as { rank?: string; color?: string } | undefined;
      if (topCard?.rank === "wild4" && prevActionRef.current !== "wild4") {
        setHeadline(`🚨 WILD DRAW FOUR! Complete chaos unleashed! 4 cards incoming!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = "wild4";
        return;
      }
      if (topCard?.rank === "skip" && prevActionRef.current !== "skip") {
        setHeadline(`⛔ TURN SKIPPED! Denied! Momentum swings to the next player!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = "skip";
        return;
      }
    }

    // Rummy Showdown
    if (game === "rummy" && (gameState.phase === "declare" || gameState.declaredBy)) {
      setHeadline(`👑 SHOWDOWN DECLARED! Hands on the table—scrutinizing pure sequences now!`);
      setHeadlineKey((k) => k + 1);
      return;
    }
  }, [game, gameState, activePlayerName]);

  return (
    <div className="w-full bg-black/80 border-t border-amber-500/30 backdrop-blur-md px-3 py-1.5 flex items-center gap-3 z-30 select-none">
      {/* Breaking / Live Tag */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex-shrink-0">
        <Radio className="w-3 h-3 animate-pulse" />
        <span>LIVE</span>
      </div>

      {/* Marquee Commentary Text */}
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div
          key={headlineKey}
          className="text-xs sm:text-sm font-bold text-amber-100 flex items-center gap-2 animate-[fadeIn_0.5s_ease-out]"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
          <span className="truncate">{headline}</span>
        </div>
      </div>

      {/* Spectator Match Ticker Stat */}
      <div className="hidden md:flex items-center gap-2 text-[11px] font-mono font-bold text-amber-400/80 flex-shrink-0 border-l border-amber-900/40 pl-3">
        <Zap className="w-3 h-3 text-amber-400" />
        <span>BHALYAM LOUNGE • {players.length} PLAYERS SEATED</span>
      </div>
    </div>
  );
}
