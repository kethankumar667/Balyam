import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyCells, emptyGrid, hasAnyMove, highestTile, insertGarbage, slideAndMerge, spawnTile } from "./grid";
import type { Direction, Grid } from "./grid";
import { useAudio } from "../../hooks/useAudio";
import { useHaptics } from "../../hooks/useHaptics";
import { AUDIO } from "../../constants/audio";
import { fire2048WinConfetti } from "./confetti2048";

export type Game2048Mode = "battle" | "race" | "timeattack" | "zen";

const STORAGE_KEY = "bhalyam.2048.stats.v1";
export const TARGET_TILE = 2048;
export const TIME_ATTACK_SECONDS = 120;
const ZEN_UNDOS = 3;
/** Battle's self-imposed difficulty ramp: every this-many merges (from any move), one garbage "2" lands on your own board. */
const BATTLE_MERGES_PER_GARBAGE = 4;

export type ScoreMode = "battle" | "timeattack" | "zen";

interface Stats {
  bestScore: Record<ScoreMode, number>;
  bestRaceTimeMs: number | null;
}

function defaultStats(): Stats {
  return { bestScore: { battle: 0, timeattack: 0, zen: 0 }, bestRaceTimeMs: null };
}

function loadStats(): Stats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      bestScore: { ...defaultStats().bestScore, ...(parsed.bestScore ?? {}) },
      bestRaceTimeMs: typeof parsed.bestRaceTimeMs === "number" ? parsed.bestRaceTimeMs : null,
    };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats: Stats): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Private browsing / storage disabled — best-effort only, never fatal.
  }
}

interface HistoryEntry {
  grid: Grid;
  score: number;
  moveCount: number;
  mergeCount: number;
}

const ARROW_KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};
const SWIPE_THRESHOLD_PX = 24;

export interface UseGame2048Result {
  mode: Game2048Mode | null;
  selectMode: (mode: Game2048Mode) => void;
  backToMenu: () => void;
  grid: Grid;
  score: number;
  bestScore: number;
  /** Every mode's best score, for the mode-select menu — available even before a mode is picked (unlike `bestScore`, which only reflects the active mode). */
  allBestScores: Record<ScoreMode, number>;
  isOver: boolean;
  isNewBest: boolean;
  undosLeft: number;
  /** Time Attack only. */
  secondsLeft: number | null;
  /** Race only — counts up while the run is live. */
  elapsedMs: number | null;
  bestRaceTimeMs: number | null;
  /** Race only — did this run reach the target tile before locking up? */
  reachedTarget: boolean;
  move: (direction: Direction) => void;
  undo: () => void;
  restart: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;

  /* ── Rich emotional additions ── */
  moveCount: number;
  mergeCount: number;
  highestTile: number;
  lastScoreGained: number;
  scoreGainedId: number;
  combo: number;
  chroniclerQuote: string;
}

function computeChroniclerQuote(
  mode: Game2048Mode | null,
  highest: number,
  emptyCount: number,
  isOver: boolean,
  reachedTarget: boolean,
  moveCount: number,
  combo: number
): string {
  if (isOver) {
    if (reachedTarget) return "👑 Sovereign of the Board! You conquered 2048!";
    return "The tiles rest. Every collapse tempers tomorrow's masterpiece.";
  }
  if (reachedTarget) return "CROWN JEWEL FORGED! You have ascended to 2048!";
  if (highest >= 1024) return "The summit is in sight! One monumental merge from 2048.";
  if (highest >= 512) return "512 radiates glory. Keep your anchor locked in the corner.";
  if (highest >= 256) return "Supernova intensity! Maintain a clean descending ladder.";
  if (emptyCount <= 2) return "Board tension peaking. Precision before speed.";
  if (combo >= 3) return `Harmonic fusion streak! ${combo} merges in rhythm!`;
  if (moveCount <= 2) return "A clean velvet canvas. Lay your corner foundation.";
  if (mode === "battle") return "Garbage encroaches. Break through with sharp corner fusions.";
  if (mode === "race") return "Velocity sprint! Every millisecond counts.";
  if (mode === "timeattack") return "The sands of time slip fast. Forge scores fearlessly.";
  if (mode === "zen") return "Serenity in motion. Breathe, slide, and weave your numbers.";
  return "Slide with intention. Every tile has its destined match.";
}

export function useGame2048(): UseGame2048Result {
  const [mode, setMode] = useState<Game2048Mode | null>(null);
  const [grid, setGrid] = useState<Grid>(() => emptyGrid());
  const [score, setScore] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [reachedTarget, setReachedTarget] = useState(false);
  const [undosLeft, setUndosLeft] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [isNewBest, setIsNewBest] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Rich metrics
  const [moveCount, setMoveCount] = useState(0);
  const [mergeCount, setMergeCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastScoreGained, setLastScoreGained] = useState(0);
  const [scoreGainedId, setScoreGainedId] = useState(0);

  const { play } = useAudio();
  const haptics = useHaptics();

  const mergesSinceGarbageRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const modeRef = useRef<Game2048Mode | null>(null);
  modeRef.current = mode;

  // Ticking clock for Time Attack's countdown / Race's stopwatch.
  useEffect(() => {
    if (isOver || (mode !== "timeattack" && mode !== "race")) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [isOver, mode]);

  const secondsLeft =
    mode === "timeattack" && startedAtRef.current != null
      ? Math.max(0, TIME_ATTACK_SECONDS - Math.floor((now - startedAtRef.current) / 1000))
      : null;

  const elapsedMs = mode === "race" && startedAtRef.current != null ? now - startedAtRef.current : null;

  const finish = useCallback(
    (finalScore: number, hitTarget: boolean, finalElapsedMs: number | null) => {
      setIsOver(true);
      const m = modeRef.current;
      if (!m) return;

      if (hitTarget) {
        try {
          play(AUDIO.REWARD_ACHIEVEMENT);
          haptics.win();
          fire2048WinConfetti();
        } catch {
          // safe in headless/test environments
        }
      } else {
        try {
          play(AUDIO.SYS_ERROR);
          haptics.subtle();
        } catch {
          // safe in headless/test environments
        }
      }

      setStats((prev) => {
        let improved = false;
        const next: Stats = { bestScore: { ...prev.bestScore }, bestRaceTimeMs: prev.bestRaceTimeMs };
        if (m !== "race" && finalScore > prev.bestScore[m]) {
          next.bestScore[m] = finalScore;
          improved = true;
        }
        if (m === "race" && hitTarget && finalElapsedMs != null) {
          if (prev.bestRaceTimeMs == null || finalElapsedMs < prev.bestRaceTimeMs) {
            next.bestRaceTimeMs = finalElapsedMs;
            improved = true;
          }
        }
        if (improved) saveStats(next);
        setIsNewBest(improved);
        return improved ? next : prev;
      });
    },
    [play, haptics]
  );

  // Time Attack: auto-finish the instant the clock runs out.
  useEffect(() => {
    if (mode === "timeattack" && secondsLeft === 0 && !isOver) {
      finish(score, false, null);
    }
  }, [mode, secondsLeft, isOver, score, finish]);

  const selectMode = useCallback(
    (m: Game2048Mode) => {
      setMode(m);
      setGrid(spawnTile(spawnTile(emptyGrid())));
      setScore(0);
      setIsOver(false);
      setReachedTarget(false);
      setIsNewBest(false);
      setHistory([]);
      setUndosLeft(m === "zen" ? ZEN_UNDOS : 0);
      setMoveCount(0);
      setMergeCount(0);
      setCombo(0);
      setLastScoreGained(0);
      mergesSinceGarbageRef.current = 0;
      startedAtRef.current = Date.now();
      setNow(Date.now());
      try {
        play(AUDIO.UI_CLICK);
      } catch {
        // safe
      }
    },
    [play]
  );

  const restart = useCallback(() => {
    if (mode) selectMode(mode);
  }, [mode, selectMode]);

  const backToMenu = useCallback(() => {
    setMode(null);
    setIsOver(false);
    try {
      play(AUDIO.UI_CLICK);
    } catch {
      // safe
    }
  }, [play]);

  const move = useCallback(
    (direction: Direction) => {
      if (isOver || !mode) return;
      const slide = slideAndMerge(grid, direction);
      if (!slide.moved) return;

      if (mode === "zen") {
        setHistory((h) => [...h, { grid, score, moveCount, mergeCount }]);
      }

      let nextGrid = spawnTile(slide.grid);
      const nextScore = score + slide.scoreGained;
      const nextHighest = highestTile(nextGrid);

      setMoveCount((c) => c + 1);
      if (slide.mergeCount > 0) {
        setMergeCount((m) => m + slide.mergeCount);
        setCombo((c) => c + 1);
        setLastScoreGained(slide.scoreGained);
        setScoreGainedId((id) => id + 1);

        try {
          if (nextHighest >= TARGET_TILE) {
            play(AUDIO.REWARD_ACHIEVEMENT);
            haptics.win();
            fire2048WinConfetti();
          } else if (nextHighest >= 512) {
            play(AUDIO.REWARD_LEVEL_UP);
            haptics.win();
          } else {
            play(AUDIO.REWARD_COIN);
            haptics.subtle();
          }
        } catch {
          // safe
        }
      } else {
        setCombo(0);
        try {
          play(AUDIO.UI_SWIPE);
          haptics.subtle();
        } catch {
          // safe
        }
      }

      if (mode === "battle" && slide.mergeCount > 0) {
        mergesSinceGarbageRef.current += slide.mergeCount;
        const garbageCount = Math.floor(mergesSinceGarbageRef.current / BATTLE_MERGES_PER_GARBAGE);
        if (garbageCount > 0) {
          mergesSinceGarbageRef.current -= garbageCount * BATTLE_MERGES_PER_GARBAGE;
          nextGrid = insertGarbage(nextGrid, garbageCount);
        }
      }

      setGrid(nextGrid);
      setScore(nextScore);

      if (mode === "race" && nextHighest >= TARGET_TILE) {
        setReachedTarget(true);
        finish(nextScore, true, startedAtRef.current != null ? Date.now() - startedAtRef.current : null);
        return;
      }

      if (!hasAnyMove(nextGrid)) {
        finish(nextScore, false, null);
      }
    },
    [grid, score, mode, isOver, finish, moveCount, mergeCount, play, haptics]
  );

  const undo = useCallback(() => {
    if (mode !== "zen" || undosLeft <= 0 || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev.grid);
    setScore(prev.score);
    setMoveCount(prev.moveCount);
    setMergeCount(prev.mergeCount);
    setUndosLeft((u) => u - 1);
    setIsOver(false);
    try {
      play(AUDIO.UI_TOGGLE);
      haptics.subtle();
    } catch {
      // safe
    }
  }, [mode, undosLeft, history, play, haptics]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture inputs if active element is an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape" && mode) {
        e.preventDefault();
        backToMenu();
        return;
      }
      if ((e.key === "r" || e.key === "R") && mode) {
        e.preventDefault();
        restart();
        return;
      }
      if ((e.key === "u" || e.key === "U") && mode === "zen" && undosLeft > 0 && !isOver) {
        e.preventDefault();
        undo();
        return;
      }

      const direction = ARROW_KEY_DIRECTION[e.key] ?? ARROW_KEY_DIRECTION[e.code];
      if (!direction) return;
      e.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, restart, undo, backToMenu, mode, undosLeft, isOver]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) return;
      move(absX > absY ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    },
    [move]
  );

  const bestScore = mode && mode !== "race" ? stats.bestScore[mode] : 0;
  const currentHighest = useMemo(() => highestTile(grid), [grid]);
  const emptyCount = useMemo(() => emptyCells(grid).length, [grid]);

  const chroniclerQuote = useMemo(
    () =>
      computeChroniclerQuote(
        mode,
        currentHighest,
        emptyCount,
        isOver,
        reachedTarget,
        moveCount,
        combo
      ),
    [mode, currentHighest, emptyCount, isOver, reachedTarget, moveCount, combo]
  );

  return {
    mode,
    selectMode,
    backToMenu,
    grid,
    score,
    bestScore,
    allBestScores: stats.bestScore,
    isOver,
    isNewBest,
    undosLeft,
    secondsLeft,
    elapsedMs,
    bestRaceTimeMs: stats.bestRaceTimeMs,
    reachedTarget,
    move,
    undo,
    restart,
    onTouchStart,
    onTouchEnd,

    moveCount,
    mergeCount,
    highestTile: currentHighest,
    lastScoreGained,
    scoreGainedId,
    combo,
    chroniclerQuote,
  };
}
