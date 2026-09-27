import { useState, useCallback, useRef, useEffect } from "react";
import type { GameKind } from "@shared/types";
import { getLatestHandCricketBall, getLatestSnlEventKey, getLatestSnlEventKind } from "./tvState";

export type TvShakeLevel = "none" | "subtle" | "intense";

interface UseTvScreenShakeProps {
  game?: GameKind;
  gameState?: Record<string, unknown> | null;
}

export interface UseTvScreenShakeReturn {
  shakeLevel: TvShakeLevel;
  triggerShake: (level: TvShakeLevel) => void;
}

export function useTvScreenShake({ game, gameState }: UseTvScreenShakeProps = {}): UseTvScreenShakeReturn {
  const [shakeLevel, setShakeLevel] = useState<TvShakeLevel>("none");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevRollRef = useRef<unknown>(null);
  const prevActionRef = useRef<unknown>(null);
  const prevScoreRef = useRef<unknown>(null);

  const triggerShake = useCallback((level: TvShakeLevel) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShakeLevel(level);

    const duration = level === "intense" ? 480 : 280;
    timeoutRef.current = setTimeout(() => {
      setShakeLevel("none");
    }, duration);
  }, []);

  // Automatic Game Event Detection for Screen Shakes
  useEffect(() => {
    if (!game || !gameState) return;

    // Ludo / SNL dice 6 & events
    const roll = gameState.diceValue ?? gameState.lastRoll;
    if (roll === 6 && prevRollRef.current !== 6) {
      triggerShake("intense");
    }
    prevRollRef.current = roll;

    // SNL Snake / Ladder
    const legacySnlEvent = typeof gameState.event === "string" ? gameState.event : null;
    const snlEvent = getLatestSnlEventKind(gameState) ?? legacySnlEvent;
    const snlEventKey = getLatestSnlEventKey(gameState);
    const stableSnlEventKey = snlEventKey ?? (legacySnlEvent ? `legacy:${legacySnlEvent}` : null);
    if (snlEvent === "snake" && prevActionRef.current !== stableSnlEventKey) {
      triggerShake("intense");
    } else if (snlEvent === "ladder" && prevActionRef.current !== stableSnlEventKey) {
      triggerShake("subtle");
    }
    if (stableSnlEventKey) prevActionRef.current = stableSnlEventKey;

    // Hand Cricket Boundaries / Wicket
    if (game === "handcricket") {
      const latestBall = getLatestHandCricketBall(gameState);
      const isWicket = latestBall?.isWicket ?? Boolean(gameState.wicket ?? gameState.isWicket ?? gameState.lastBallWicket);
      const runs = latestBall?.runs ?? Number(gameState.lastBallRuns ?? gameState.lastRuns ?? 0);
      const ballKey = latestBall?.key ?? `${runs}:${isWicket}`;
      if (isWicket && prevActionRef.current !== ballKey) {
        triggerShake("intense");
        prevActionRef.current = ballKey;
      } else if (runs === 6 && prevScoreRef.current !== ballKey) {
        triggerShake("intense");
        prevScoreRef.current = ballKey;
      } else if (runs === 4 && prevScoreRef.current !== ballKey) {
        triggerShake("subtle");
        prevScoreRef.current = ballKey;
      }
    }

    // UNO Wild Draw 4 / Action
    if (game === "uno") {
      const topCardRaw = typeof gameState.topCard === "object" && gameState.topCard !== null
        ? (gameState.topCard as Record<string, unknown>)
        : undefined;
      const rank = typeof topCardRaw?.rank === "string" ? topCardRaw.rank : undefined;
      const id = typeof topCardRaw?.id === "string" ? topCardRaw.id : undefined;
      const playedAt = typeof topCardRaw?.playedAt === "number" ? topCardRaw.playedAt : undefined;
      const color = typeof topCardRaw?.color === "string" ? topCardRaw.color : undefined;
      const turnDeadline = typeof gameState.turnDeadline === "number" ? gameState.turnDeadline : undefined;

      const normalizedRank = rank?.toLowerCase();
      const cardKey = rank
        ? `uno:${rank}:${id ?? playedAt ?? turnDeadline ?? color ?? "card"}`
        : null;
      if ((normalizedRank === "wild+4" || normalizedRank === "wild4") && prevActionRef.current !== cardKey) {
        triggerShake("intense");
        prevActionRef.current = cardKey;
      } else if ((normalizedRank === "+2" || normalizedRank === "draw2" || normalizedRank === "skip") && prevActionRef.current !== cardKey) {
        triggerShake("subtle");
        prevActionRef.current = cardKey;
      }
    }

    // RPS Clash
    if (game === "rps" && (gameState.phase === "reveal" || gameState.lastRevealTs)) {
      const round = gameState.round ?? gameState.roundIndex ?? gameState.currentRound ?? 1;
      const revealKey = `rps:reveal:${gameState.lastRevealTs ?? round}`;
      if (prevActionRef.current !== revealKey) {
        triggerShake("intense");
        prevActionRef.current = revealKey;
      }
    }

    // Rummy Showdown Declare
    if (game === "rummy") {
      const declaredByStr = typeof gameState.declaredBy === "string" ? gameState.declaredBy : undefined;
      const declarer = declaredByStr ?? (gameState.phase === "declare" ? "declared" : null);
      if (declarer) {
        const round = String(gameState.roundNumber ?? gameState.matchStartedAt ?? "1");
        const declareKey = `rummy:declare:${declarer}:${round}`;
        if (prevActionRef.current !== declareKey) {
          triggerShake("intense");
          prevActionRef.current = declareKey;
        }
      }
    }
  }, [game, gameState, triggerShake]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { shakeLevel, triggerShake };
}
