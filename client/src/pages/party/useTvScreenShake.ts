import { useState, useCallback, useRef, useEffect } from "react";
import type { GameKind } from "@shared/types";
import { getLatestHandCricketBall, getLatestSnlEventKey, getLatestSnlEventKind } from "./tvState";

export type TvShakeLevel = "none" | "subtle" | "intense";

interface UseTvScreenShakeProps {
  game?: GameKind;
  gameState?: Record<string, unknown> | null;
}

export function useTvScreenShake({ game, gameState }: UseTvScreenShakeProps = {}) {
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
      const topCard = gameState.topCard as { rank?: string } | undefined;
      const rank = topCard?.rank;
      if (rank === "wild4" && prevActionRef.current !== "wild4") {
        triggerShake("intense");
        prevActionRef.current = "wild4";
      } else if ((rank === "draw2" || rank === "skip") && prevActionRef.current !== rank) {
        triggerShake("subtle");
        prevActionRef.current = rank;
      }
    }

    // RPS Clash
    if (game === "rps" && gameState.phase === "reveal" && prevActionRef.current !== "reveal") {
      triggerShake("intense");
      prevActionRef.current = "reveal";
    }

    // Rummy Showdown Declare
    if (game === "rummy" && (gameState.phase === "declare" || gameState.declaredBy) && prevActionRef.current !== "declare") {
      triggerShake("intense");
      prevActionRef.current = "declare";
    }
  }, [game, gameState, triggerShake]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { shakeLevel, triggerShake };
}
