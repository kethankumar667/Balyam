import { useMemo, useState, useEffect, useRef } from "react";
import { Radio, Flame, Zap } from "lucide-react";
import type { GameKind, Player } from "@shared/types";
import { getHandCricketChase, getLatestHandCricketBall, getLatestSnlEventKey, getLatestSnlEventKind } from "./tvState";

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
  const prevChaseRef = useRef<string | null>(null);

  // Dynamic commentary generation based on live game events
  useEffect(() => {
    if (!gameState) return;

    // Hand Cricket Commentary
    if (game === "handcricket") {
      const latestBall = getLatestHandCricketBall(gameState);
      const isWicket = latestBall?.isWicket ?? Boolean(gameState.wicket ?? gameState.isWicket ?? gameState.lastBallWicket);
      const runs = latestBall?.runs ?? Number(gameState.lastBallRuns ?? gameState.lastRuns ?? 0);
      const ballKey = latestBall?.key ?? `${runs}:${isWicket}`;
      const chase = getHandCricketChase(gameState);
      const target = chase?.target ?? 0;
      const teamRuns = chase?.runs ?? 0;
      const ballsLeft = chase?.ballsRemaining ?? 0;

      if (isWicket && prevActionRef.current !== ballKey) {
        setHeadline(`💥 WICKET! Clean bowled! The stadium roars as the batter is sent back to the pavilion!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = ballKey;
        return;
      }
      if (runs === 6 && prevRollRef.current !== ballKey) {
        setHeadline(`🔥 MAXIMUM! Huge SIX smashed out of the park! The living room is on fire!`);
        setHeadlineKey((k) => k + 1);
        prevRollRef.current = ballKey;
        return;
      }
      if (runs === 4 && prevRollRef.current !== ballKey) {
        setHeadline(`🏏 CRACKING FOUR! Sliced through the covers for a boundary!`);
        setHeadlineKey((k) => k + 1);
        prevRollRef.current = ballKey;
        return;
      }
      if (target > 0 && target - teamRuns <= 12 && ballsLeft > 0) {
        const chaseKey = `${target}:${teamRuns}:${ballsLeft}`;
        if (prevChaseRef.current !== chaseKey) {
          setHeadline(`⚡ THRILLER IN PROGRESS: ${target - teamRuns} runs needed from ${ballsLeft} balls! Everyone is on the edge of their seats!`);
          setHeadlineKey((k) => k + 1);
          prevChaseRef.current = chaseKey;
        }
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
      const lastEvent = gameState.lastEvent as { kind?: string; ts?: number } | undefined;
      const isCapture = gameState.lastAction === "kill" || Boolean(gameState.capturedPawn) || lastEvent?.kind === "capture";
      if (isCapture) {
        const captureKey = `ludo-capture:${lastEvent?.ts ?? gameState.lastActionTs ?? activePlayerName}`;
        if (prevActionRef.current !== captureKey) {
          setHeadline(`⚔️ GOTCHA! Token hunted down and sent packing back to the base!`);
          setHeadlineKey((k) => k + 1);
          prevActionRef.current = captureKey;
        }
        return;
      }
    }

    // Snakes & Ladders Commentary
    if (game === "snl") {
      const legacyEvent = typeof gameState.event === "string" ? gameState.event : null;
      const ev = getLatestSnlEventKind(gameState) ?? legacyEvent;
      const eventKey = getLatestSnlEventKey(gameState);
      const stableEventKey = eventKey ?? (legacyEvent ? `legacy:${legacyEvent}` : null);
      if (ev === "snake" && prevActionRef.current !== stableEventKey) {
        setHeadline(`🐍 DISASTER! Slipped right down the serpent's belly! The couch is groaning!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = stableEventKey;
        return;
      }
      if (ev === "ladder" && prevActionRef.current !== stableEventKey) {
        setHeadline(`🪜 SKY HIGH! Climbing the ladder straight into prime position!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = stableEventKey;
        return;
      }
    }

    // UNO Commentary
    if (game === "uno") {
      const topCard = gameState.topCard as { id?: string; rank?: string; color?: string; playedAt?: number } | undefined;
      const rank = topCard?.rank;
      const normalizedRank = rank?.toLowerCase();
      const cardKey = topCard ? `uno:${rank}:${topCard.id ?? topCard.playedAt ?? topCard.color}` : null;
      if ((normalizedRank === "wild+4" || normalizedRank === "wild4") && prevActionRef.current !== cardKey) {
        setHeadline(`🚨 WILD DRAW FOUR! Complete chaos unleashed! 4 cards incoming!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = cardKey;
        return;
      }
      if (normalizedRank === "skip" && prevActionRef.current !== cardKey) {
        setHeadline(`⛔ TURN SKIPPED! Denied! Momentum swings to the next player!`);
        setHeadlineKey((k) => k + 1);
        prevActionRef.current = cardKey;
        return;
      }
    }

    // Rummy Showdown
    if (game === "rummy") {
      const declarer = (gameState.declaredBy as string | undefined) ?? (gameState.phase === "declare" ? "declared" : null);
      if (declarer) {
        const round = gameState.roundNumber ?? gameState.matchStartedAt ?? "1";
        const declareKey = `rummy-declare:${declarer}:${round}`;
        if (prevActionRef.current !== declareKey) {
          setHeadline(`👑 SHOWDOWN DECLARED! Hands on the table—scrutinizing pure sequences now!`);
          setHeadlineKey((k) => k + 1);
          prevActionRef.current = declareKey;
        }
        return;
      }
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
      <div className="flex-1 overflow-hidden whitespace-nowrap" aria-live="polite" aria-atomic="true">
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
