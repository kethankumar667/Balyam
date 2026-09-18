import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  areAdjacent,
  emptyCells,
  emptyGrid,
  hasAnyMove,
  highestTile,
  insertGarbage,
  slideAndMerge,
  spawnTile,
  swapCells,
} from "./grid";
import type { Direction, Grid } from "./grid";
import { useAudio } from "../../hooks/useAudio";
import { useHaptics } from "../../hooks/useHaptics";
import { AUDIO } from "../../constants/audio";
import { fire2048WinConfetti } from "./confetti2048";
import { getGame2048Stats, syncGame2048Stats } from "../../lib/game2048StatsApi";
import { useScorecardStore, recordSoloScore } from "../../store/scorecardStore";
import { createDateSeed, mulberry32 } from "./prng";
import type { TableTheme } from "./tileStyles";

export type Game2048Mode = "battle" | "race" | "timeattack" | "zen" | "daily";

const STORAGE_KEY = "bhalyam.2048.stats.v1";
const THEME_STORAGE_KEY = "bhalyam.2048.theme.v1";
export const TARGET_TILE = 2048;
export const TIME_ATTACK_SECONDS = 120;
const ZEN_UNDOS = 3;
/** Battle's self-imposed difficulty ramp: every this-many merges (from any move), one garbage "2" lands on your own board — A.N.N.A.'s baseline pressure before adapting it (see `getAdaptiveGarbageThreshold`). */
const BATTLE_MERGES_PER_GARBAGE = 4;
const EMP_MERGES_FOR_FULL_CHARGE = 5;

/**
 * A.N.N.A.'s adaptive difficulty director: eases off the garbage cadence when the board is
 * nearly full (survival priority), escalates it during an overclock cascade (reward mastery
 * with real pressure), otherwise holds the baseline. Pure/exported for direct unit testing.
 */
export function getAdaptiveGarbageThreshold(isOverclocked: boolean, entropyPercent: number): number {
  if (entropyPercent >= 80) return 6;
  if (isOverclocked) return 2;
  return BATTLE_MERGES_PER_GARBAGE;
}

export type ScoreMode = "battle" | "timeattack" | "zen";

export interface RaceGhostPoint {
  /** Milliseconds since the race started when this tile milestone was first reached. */
  atMs: number;
  tile: number;
}

interface Stats {
  bestScore: Record<ScoreMode, number>;
  bestRaceTimeMs: number | null;
  /** Tile-milestone timeline of the best completed Race run, for the live ghost-pace comparison. */
  bestRaceGhost: RaceGhostPoint[] | null;
  dailyBestScore: number;
  dailyDate: string | null;
}

function defaultStats(): Stats {
  return {
    bestScore: { battle: 0, timeattack: 0, zen: 0 },
    bestRaceTimeMs: null,
    bestRaceGhost: null,
    dailyBestScore: 0,
    dailyDate: null,
  };
}

function isRaceGhostPoint(value: unknown): value is RaceGhostPoint {
  const p = value as Partial<RaceGhostPoint> | null;
  return typeof p?.atMs === "number" && typeof p?.tile === "number";
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStats(): Stats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    const ghost = Array.isArray(parsed.bestRaceGhost) ? parsed.bestRaceGhost.filter(isRaceGhostPoint) : null;
    const isToday = parsed.dailyDate === getTodayStr();
    return {
      bestScore: { ...defaultStats().bestScore, ...(parsed.bestScore ?? {}) },
      bestRaceTimeMs: typeof parsed.bestRaceTimeMs === "number" ? parsed.bestRaceTimeMs : null,
      bestRaceGhost: ghost && ghost.length > 0 ? ghost : null,
      dailyBestScore: isToday && typeof parsed.dailyBestScore === "number" ? parsed.dailyBestScore : 0,
      dailyDate: parsed.dailyDate ?? null,
    };
  } catch {
    return defaultStats();
  }
}

/**
 * Merges a cloud-synced record onto the local one without ever regressing a
 * personal best — mirrors the server's own `mergeGame2048Stats` (the two
 * layers agree on "better" independently: max score, min race time). A
 * malformed/partial cloud payload (offline first sync, a stale server
 * response) degrades to "keep local" per field rather than clobbering it.
 */
function mergeCloudStats(local: Stats, cloud: Partial<Stats> | null): Stats {
  if (!cloud) return local;
  const today = getTodayStr();
  const cloudBestScore: Partial<Record<ScoreMode, number>> = cloud.bestScore ?? {};
  const merged: Stats = {
    bestScore: {
      battle: Math.max(local.bestScore.battle, cloudBestScore.battle ?? 0),
      timeattack: Math.max(local.bestScore.timeattack, cloudBestScore.timeattack ?? 0),
      zen: Math.max(local.bestScore.zen, cloudBestScore.zen ?? 0),
    },
    bestRaceTimeMs: local.bestRaceTimeMs,
    bestRaceGhost: local.bestRaceGhost,
    dailyBestScore: local.dailyBestScore,
    dailyDate: local.dailyDate,
  };

  if (typeof cloud.bestRaceTimeMs === "number") {
    if (merged.bestRaceTimeMs == null || cloud.bestRaceTimeMs < merged.bestRaceTimeMs) {
      merged.bestRaceTimeMs = cloud.bestRaceTimeMs;
      merged.bestRaceGhost = cloud.bestRaceGhost ?? merged.bestRaceGhost;
    }
  }

  // Daily resets every day, so "better" only means anything when comparing
  // the SAME day's runs — normalize both sides to "today's score, or 0" first,
  // exactly like `loadStats()` already does for the local-only value.
  if (cloud.dailyDate === today && typeof cloud.dailyBestScore === "number") {
    const localDailyToday = local.dailyDate === today ? local.dailyBestScore : 0;
    if (cloud.dailyBestScore > localDailyToday) {
      merged.dailyBestScore = cloud.dailyBestScore;
      merged.dailyDate = today;
    }
  }

  return merged;
}

/** Ghost's tile milestone as of `elapsedMs` into the current run — 0 if the ghost hadn't reached any milestone yet. Pure/exported for direct unit testing. */
export function getGhostTileAtElapsed(ghost: RaceGhostPoint[] | null, elapsedMs: number): number {
  if (!ghost || ghost.length === 0) return 0;
  let best = 0;
  for (const point of ghost) {
    if (point.atMs <= elapsedMs) best = point.tile;
    else break;
  }
  return best;
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
const SWIPE_THRESHOLD_PX = 16;

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
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;

  /* ── Futuristic Telemetry & OSD Additions ── */
  moveCount: number;
  mergeCount: number;
  highestTile: number;
  lastScoreGained: number;
  scoreGainedId: number;
  combo: number;
  chroniclerQuote: string;
  entropyPercent: number;
  fusionVelocity: number;
  isOverclocked: boolean;
  empCharge: number;
  canTriggerEmp: boolean;
  triggerEmp: () => void;
  isChronoRewinding: boolean;
  showHyperspaceWarp: boolean;
  dismissHyperspaceWarp: () => void;

  /** Race only — how the live run compares to the best run's tile-milestone timeline, once one exists. */
  ghostStatus: "ahead" | "behind" | "tied" | null;
  /** Race only — the tile the ghost had reached by the current elapsed time. */
  ghostTileAtElapsed: number;

  dailyBestScore: number;

  /* ── Tactical Power-Up Augments ── */
  quantumSwapCharges: number;
  isSwapping: boolean;
  selectedSwapIdx: number | null;
  activateSwap: () => void;
  cancelSwap: () => void;
  onTileClick: (index: number) => void;

  cryoFreezeCharges: number;
  isCryoFrozen: boolean;
  cryoSecondsLeft: number;
  activateCryo: () => void;

  wildcardCharges: number;
  activateWildcard: () => void;

  /* ── Themes & Modals ── */
  theme: TableTheme;
  setTheme: (theme: TableTheme) => void;
  showCodex: boolean;
  setShowCodex: (show: boolean) => void;
}

function computeAnnaQuote(
  mode: Game2048Mode | null,
  highest: number,
  emptyCount: number,
  isOver: boolean,
  reachedTarget: boolean,
  moveCount: number,
  combo: number,
  isOverclocked: boolean,
  entropyPercent: number,
  empCharge: number,
  secondsLeft: number | null,
  isCryoFrozen: boolean,
  isSwapping: boolean
): string {
  if (isOver) {
    if (reachedTarget) return "A.N.N.A. // Core resonance achieved. Crown protocol online.";
    return "A.N.N.A. // Grid overload. Vector paths terminated. Stand by for reboot.";
  }
  if (isCryoFrozen) return "A.N.N.A. // CRYO STASIS ENGAGED: Temporal vectors and hazards suspended.";
  if (isSwapping) return "A.N.N.A. // QUANTUM SWAP ACTIVE: Select adjacent cell coordinates to transpose.";
  if (reachedTarget) return "A.N.N.A. // CRITICAL SINGULARITY! Sovereign 2048 core synthesized.";
  if (isOverclocked) return `A.N.N.A. // OVERCLOCK ACTIVE! ${combo}x cascade resonance detected.`;
  if (highest >= 1024) return "A.N.N.A. // Tesseract Engine active. Final fusion barrier approaching.";
  if (highest >= 512) return "A.N.N.A. // Antimatter core online. Lock corner coordinates.";
  if (highest >= 256) return "A.N.N.A. // Supernova threshold crossed. Maintain descending ladder.";
  if (entropyPercent >= 85) return `A.N.N.A. // CRITICAL ALERT: Board entropy at ${entropyPercent}%. Vector choke imminent.`;
  if (mode === "battle" && empCharge >= 100) return "A.N.N.A. // EMP Capacitor fully primed. Purge countermeasure armed.";
  if (mode === "battle") return "A.N.N.A. // Corruption detected. Synthesize tiles to charge EMP capacitor.";
  if (mode === "race") return "A.N.N.A. // Velocity sprint nominal. Chronometer running at maximum precision.";
  if (mode === "timeattack") return `A.N.N.A. // Temporal window closing: ${secondsLeft ?? 0}s remaining. Forge score rapidly.`;
  if (mode === "zen") return "A.N.N.A. // Sanctuary simulation engaged. Chrono-stabilizers online.";
  if (mode === "daily") return "A.N.N.A. // Daily Singularity coordinates synchronized. Compete on the global seed.";
  if (moveCount <= 2) return "A.N.N.A. // Grid entropy nominal. Establish corner quantum anchor.";
  return "A.N.N.A. // Systems nominal. Calculate vectors with precision.";
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

  // Rich futuristic metrics
  const [moveCount, setMoveCount] = useState(0);
  const [mergeCount, setMergeCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastScoreGained, setLastScoreGained] = useState(0);
  const [scoreGainedId, setScoreGainedId] = useState(0);
  const [empMerges, setEmpMerges] = useState(0);
  const [isChronoRewinding, setIsChronoRewinding] = useState(false);
  const [showHyperspaceWarp, setShowHyperspaceWarp] = useState(false);
  const hasTriggeredWarpRef = useRef(false);
  const raceGhostRef = useRef<RaceGhostPoint[]>([]);

  // Tactical Augments
  const [quantumSwapCharges, setQuantumSwapCharges] = useState(2);
  const [isSwapping, setIsSwapping] = useState(false);
  const [selectedSwapIdx, setSelectedSwapIdx] = useState<number | null>(null);

  const [cryoFreezeCharges, setCryoFreezeCharges] = useState(1);
  const [isCryoFrozen, setIsCryoFrozen] = useState(false);
  const [cryoSecondsLeft, setCryoSecondsLeft] = useState(0);

  const [wildcardCharges, setWildcardCharges] = useState(1);

  // Themes & Modals
  const [theme, setThemeState] = useState<TableTheme>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as TableTheme | null;
      if (stored && ["cyberpunk", "obsidian", "synthwave", "zen"].includes(stored)) {
        return stored;
      }
    } catch {
      // safe
    }
    return "cyberpunk";
  });
  const setTheme = useCallback((t: TableTheme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // safe
    }
  }, []);

  const [showCodex, setShowCodex] = useState(false);

  const dailyRngRef = useRef<(() => number) | null>(null);

  const { play } = useAudio();
  const haptics = useHaptics();

  const mergesSinceGarbageRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const modeRef = useRef<Game2048Mode | null>(null);
  modeRef.current = mode;

  // Cryo Freeze countdown timer
  useEffect(() => {
    if (!isCryoFrozen) return;
    const interval = window.setInterval(() => {
      setCryoSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsCryoFrozen(false);
          return 0;
        }
        return prev - 1;
      });
      // In Time Attack mode, pause the timer by pushing startedAt forward 1s
      if (modeRef.current === "timeattack" && startedAtRef.current != null) {
        startedAtRef.current += 1000;
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCryoFrozen]);

  // Cloud sync, once per mount: pull the account's cloud-synced personal
  // bests (if any) and merge them onto whatever this device already has
  // locally — never a raw overwrite, so a fresh browser with no localStorage
  // adopts the cloud record, and a device that's ahead of the cloud keeps its
  // own lead until its own next improvement pushes it up. `apiJson` never
  // throws (see `lib/playerIdentity.ts`), so a signed-out guest, an offline
  // device, or a server hiccup all just leave `stats` as the local baseline.
  useEffect(() => {
    let cancelled = false;

    // Sync any existing local bests into cloud and scorecards on mount
    const local = loadStats();
    if (
      local.bestScore.battle > 0 ||
      local.bestScore.zen > 0 ||
      local.bestScore.timeattack > 0 ||
      local.bestRaceTimeMs != null ||
      local.dailyBestScore > 0
    ) {
      void syncGame2048Stats(local);
    }

    void getGame2048Stats().then((cloud) => {
      if (cancelled || !cloud) return;
      setStats((prev) => {
        const merged = mergeCloudStats(prev, cloud);
        saveStats(merged);
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
          // safe
        }
      } else {
        try {
          play(AUDIO.SYS_ERROR);
          haptics.subtle();
        } catch {
          // safe
        }
      }

      setStats((prev) => {
        let improved = false;
        const next: Stats = {
          bestScore: { ...prev.bestScore },
          bestRaceTimeMs: prev.bestRaceTimeMs,
          bestRaceGhost: prev.bestRaceGhost,
          dailyBestScore: prev.dailyBestScore,
          dailyDate: prev.dailyDate,
        };
        if (m !== "race" && m !== "daily" && finalScore > prev.bestScore[m]) {
          next.bestScore[m] = finalScore;
          improved = true;
        }
        if (m === "daily") {
          const today = getTodayStr();
          const currentDaily = prev.dailyDate === today ? prev.dailyBestScore : 0;
          if (finalScore > currentDaily) {
            next.dailyBestScore = finalScore;
            next.dailyDate = today;
            improved = true;
          }
        }
        if (m === "race" && hitTarget && finalElapsedMs != null) {
          if (prev.bestRaceTimeMs == null || finalElapsedMs < prev.bestRaceTimeMs) {
            next.bestRaceTimeMs = finalElapsedMs;
            next.bestRaceGhost = [...raceGhostRef.current];
            improved = true;
          }
        }
        if (improved) {
          saveStats(next);
          // Fire-and-forget: never blocks the game-over screen on network
          // state, and the server merges rather than overwrites (see
          // `Game2048StatsService.syncStats`), so an out-of-order or dropped
          // push here just costs a slightly stale cloud copy, not a regression.
          void syncGame2048Stats(next);
        }

        // Sync with universal Chrono-Scorecard system
        try {
          const currentMode = modeRef.current || "battle";
          const scorecardScore = currentMode === "race" ? (finalElapsedMs ? Math.round(finalElapsedMs / 1000) : 0) : finalScore;
          void recordSoloScore("2048", currentMode, scorecardScore);
        } catch {
          // Ignore
        }

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
      if (m === "daily") {
        const dateStr = getTodayStr();
        const seed = createDateSeed(dateStr);
        const rng = mulberry32(seed);
        dailyRngRef.current = rng;
        setGrid(spawnTile(spawnTile(emptyGrid(), rng), rng));
      } else {
        dailyRngRef.current = null;
        setGrid(spawnTile(spawnTile(emptyGrid())));
      }
      setScore(0);
      try {
        useScorecardStore.getState().updateLivePace("2048", m, 0);
      } catch {
        // safe
      }
      setIsOver(false);
      setReachedTarget(false);
      setIsNewBest(false);
      setHistory([]);
      setUndosLeft(m === "zen" ? ZEN_UNDOS : 0);
      setQuantumSwapCharges(2);
      setIsSwapping(false);
      setSelectedSwapIdx(null);
      setCryoFreezeCharges(1);
      setIsCryoFrozen(false);
      setCryoSecondsLeft(0);
      setWildcardCharges(1);
      setMoveCount(0);
      setMergeCount(0);
      setCombo(0);
      setLastScoreGained(0);
      setEmpMerges(0);
      setIsChronoRewinding(false);
      setShowHyperspaceWarp(false);
      hasTriggeredWarpRef.current = false;
      raceGhostRef.current = [];
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
    setShowHyperspaceWarp(false);
    try {
      play(AUDIO.UI_CLICK);
    } catch {
      // safe
    }
  }, [play]);

  const move = useCallback(
    (direction: Direction) => {
      if (isOver || !mode) return;
      if (isSwapping) {
        setIsSwapping(false);
        setSelectedSwapIdx(null);
      }
      const slide = slideAndMerge(grid, direction);
      if (!slide.moved) return;

      if (mode === "zen") {
        setHistory((h) => [...h, { grid, score, moveCount, mergeCount }]);
      }

      const rng = mode === "daily" ? dailyRngRef.current ?? undefined : undefined;
      let nextGrid = spawnTile(slide.grid, rng);
      const nextScore = score + slide.scoreGained;
      const nextHighest = highestTile(nextGrid);

      if (mode === "race" && nextHighest > highestTile(grid)) {
        raceGhostRef.current = [
          ...raceGhostRef.current,
          { atMs: startedAtRef.current != null ? Date.now() - startedAtRef.current : 0, tile: nextHighest },
        ];
      }

      setMoveCount((c) => c + 1);
      if (slide.mergeCount > 0) {
        setMergeCount((m) => m + slide.mergeCount);
        setCombo((c) => c + 1);
        setLastScoreGained(slide.scoreGained);
        setScoreGainedId((id) => id + 1);
        setEmpMerges((m) => Math.min(EMP_MERGES_FOR_FULL_CHARGE, m + slide.mergeCount));

        try {
          if (nextHighest >= TARGET_TILE) {
            play(AUDIO.REWARD_ACHIEVEMENT);
            haptics.win();
            fire2048WinConfetti();
            if (!hasTriggeredWarpRef.current) {
              hasTriggeredWarpRef.current = true;
              setShowHyperspaceWarp(true);
            }
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

      if (mode === "battle" && slide.mergeCount > 0 && !isCryoFrozen) {
        mergesSinceGarbageRef.current += slide.mergeCount;
        const nextOccupied = nextGrid.filter((c) => c != null).length;
        const nextEntropyPercent = Math.round((nextOccupied / 16) * 100);
        const threshold = getAdaptiveGarbageThreshold(combo + 1 >= 3, nextEntropyPercent);
        const garbageCount = Math.floor(mergesSinceGarbageRef.current / threshold);
        if (garbageCount > 0) {
          mergesSinceGarbageRef.current -= garbageCount * threshold;
          nextGrid = insertGarbage(nextGrid, garbageCount);
        }
      }

      setGrid(nextGrid);
      setScore(nextScore);
      try {
        useScorecardStore.getState().updateLivePace("2048", modeRef.current || "battle", nextScore);
      } catch {
        // safe
      }

      if (mode === "race" && nextHighest >= TARGET_TILE) {
        setReachedTarget(true);
        finish(nextScore, true, startedAtRef.current != null ? Date.now() - startedAtRef.current : null);
        return;
      }

      if (!hasAnyMove(nextGrid)) {
        finish(nextScore, false, null);
      }
    },
    [grid, score, mode, isOver, finish, moveCount, mergeCount, isSwapping, isCryoFrozen, play, haptics]
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

    // Trigger futuristic Chrono-Rewind glitch effect
    setIsChronoRewinding(true);
    setTimeout(() => setIsChronoRewinding(false), 450);

    try {
      play(AUDIO.UI_TOGGLE);
      haptics.subtle();
    } catch {
      // safe
    }
  }, [mode, undosLeft, history, play, haptics]);

  // Battle Mode: EMP Purge countermeasure
  const empCharge = Math.round((empMerges / EMP_MERGES_FOR_FULL_CHARGE) * 100);
  const canTriggerEmp = mode === "battle" && empCharge >= 100 && grid.some((c) => c?.isGarbage) && !isOver;

  const triggerEmp = useCallback(() => {
    if (!canTriggerEmp) return;
    // Disintegrate one garbage tile from the grid
    const garbageIdx = grid.findIndex((c) => c?.isGarbage);
    if (garbageIdx === -1) return;

    const nextGrid = [...grid];
    nextGrid[garbageIdx] = null;
    setGrid(nextGrid);
    setEmpMerges(0);

    try {
      play(AUDIO.REWARD_LEVEL_UP);
      haptics.win();
    } catch {
      // safe
    }
  }, [canTriggerEmp, grid, play, haptics]);

  // Tactical Power-Up Augments
  const activateSwap = useCallback(() => {
    if (quantumSwapCharges <= 0 || isOver || !mode) return;
    setIsSwapping((prev) => !prev);
    setSelectedSwapIdx(null);
    try {
      play(AUDIO.UI_TOGGLE);
      haptics.subtle();
    } catch {
      // safe
    }
  }, [quantumSwapCharges, isOver, mode, play, haptics]);

  const cancelSwap = useCallback(() => {
    setIsSwapping(false);
    setSelectedSwapIdx(null);
  }, []);

  const onTileClick = useCallback(
    (index: number) => {
      if (!isSwapping || isOver || !mode) return;
      if (selectedSwapIdx === null) {
        if (grid[index] == null) return;
        setSelectedSwapIdx(index);
        try {
          play(AUDIO.UI_CLICK);
          haptics.subtle();
        } catch {
          // safe
        }
      } else {
        if (index === selectedSwapIdx) {
          setSelectedSwapIdx(null);
          return;
        }
        if (!areAdjacent(selectedSwapIdx, index)) {
          try {
            play(AUDIO.SYS_ERROR);
            haptics.subtle();
          } catch {
            // safe
          }
          return;
        }
        const nextGrid = swapCells(grid, selectedSwapIdx, index);
        setGrid(nextGrid);
        setQuantumSwapCharges((c) => Math.max(0, c - 1));
        setIsSwapping(false);
        setSelectedSwapIdx(null);
        try {
          play(AUDIO.REWARD_COIN);
          haptics.win();
        } catch {
          // safe
        }
        if (!hasAnyMove(nextGrid)) {
          finish(score, false, null);
        }
      }
    },
    [isSwapping, isOver, mode, selectedSwapIdx, grid, play, haptics, score, finish]
  );

  const activateCryo = useCallback(() => {
    if (cryoFreezeCharges <= 0 || isCryoFrozen || isOver || !mode) return;
    setCryoFreezeCharges((c) => Math.max(0, c - 1));
    setIsCryoFrozen(true);
    setCryoSecondsLeft(10);
    try {
      play(AUDIO.REWARD_LEVEL_UP);
      haptics.win();
    } catch {
      // safe
    }
  }, [cryoFreezeCharges, isCryoFrozen, isOver, mode, play, haptics]);

  const activateWildcard = useCallback(() => {
    if (wildcardCharges <= 0 || isOver || !mode) return;
    const empties = emptyCells(grid);
    if (empties.length === 0) return;
    const rngVal = mode === "daily" && dailyRngRef.current ? dailyRngRef.current() : Math.random();
    const targetIdx = empties[Math.floor(rngVal * empties.length)];
    const nextGrid = [...grid];
    nextGrid[targetIdx] = { value: 0, isWildcard: true };
    setGrid(nextGrid);
    setWildcardCharges((c) => Math.max(0, c - 1));
    try {
      play(AUDIO.REWARD_ACHIEVEMENT);
      haptics.win();
    } catch {
      // safe
    }
  }, [wildcardCharges, isOver, mode, grid, play, haptics]);

  const dismissHyperspaceWarp = useCallback(() => {
    setShowHyperspaceWarp(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        if (isSwapping) {
          e.preventDefault();
          cancelSwap();
          return;
        }
        if (showCodex) {
          e.preventDefault();
          setShowCodex(false);
          return;
        }
        if (mode) {
          e.preventDefault();
          backToMenu();
          return;
        }
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
      if ((e.key === "e" || e.key === "E") && canTriggerEmp) {
        e.preventDefault();
        triggerEmp();
        return;
      }

      const direction = ARROW_KEY_DIRECTION[e.key] ?? ARROW_KEY_DIRECTION[e.code];
      if (!direction) return;
      e.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    move,
    restart,
    undo,
    triggerEmp,
    canTriggerEmp,
    backToMenu,
    cancelSwap,
    isSwapping,
    showCodex,
    mode,
    undosLeft,
    isOver,
  ]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchFiredRef = useRef<boolean>(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      touchStartRef.current = null;
      touchFiredRef.current = true;
      return;
    }
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    touchFiredRef.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchFiredRef.current || !touchStartRef.current) return;
      if (e.touches.length > 1) return;

      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) >= SWIPE_THRESHOLD_PX) {
        touchFiredRef.current = true;
        const direction: Direction =
          absX > absY ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        move(direction);
      }
    },
    [move]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      const alreadyFired = touchFiredRef.current;
      touchStartRef.current = null;
      touchFiredRef.current = false;

      if (alreadyFired || !start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) return;
      move(absX > absY ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    },
    [move]
  );

  const bestScore =
    mode === "daily"
      ? stats.dailyDate === getTodayStr()
        ? stats.dailyBestScore
        : 0
      : mode && mode !== "race"
      ? stats.bestScore[mode]
      : 0;
  const currentHighest = useMemo(() => highestTile(grid), [grid]);
  const emptyCount = useMemo(() => emptyCells(grid).length, [grid]);

  // Live Telemetry
  const occupiedCount = useMemo(() => grid.filter((c) => c != null).length, [grid]);
  const entropyPercent = useMemo(() => Math.round((occupiedCount / 16) * 100), [occupiedCount]);
  const fusionVelocity = useMemo(() => {
    if (!startedAtRef.current) return 0;
    const elapsedMins = Math.max(0.1, (now - startedAtRef.current) / 60000);
    return Math.round(mergeCount / elapsedMins);
  }, [mergeCount, now]);

  const isOverclocked = combo >= 3;

  const ghostTileAtElapsed = useMemo(
    () => (mode === "race" ? getGhostTileAtElapsed(stats.bestRaceGhost, elapsedMs ?? 0) : 0),
    [mode, stats.bestRaceGhost, elapsedMs]
  );

  const ghostStatus = useMemo<"ahead" | "behind" | "tied" | null>(() => {
    if (mode !== "race" || !stats.bestRaceGhost || stats.bestRaceGhost.length === 0) return null;
    if (currentHighest > ghostTileAtElapsed) return "ahead";
    if (currentHighest < ghostTileAtElapsed) return "behind";
    return "tied";
  }, [mode, stats.bestRaceGhost, currentHighest, ghostTileAtElapsed]);

  const chroniclerQuote = useMemo(
    () =>
      computeAnnaQuote(
        mode,
        currentHighest,
        emptyCount,
        isOver,
        reachedTarget,
        moveCount,
        combo,
        isOverclocked,
        entropyPercent,
        empCharge,
        secondsLeft,
        isCryoFrozen,
        isSwapping
      ),
    [
      mode,
      currentHighest,
      emptyCount,
      isOver,
      reachedTarget,
      moveCount,
      combo,
      isOverclocked,
      entropyPercent,
      empCharge,
      secondsLeft,
      isCryoFrozen,
      isSwapping,
    ]
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
    onTouchMove,
    onTouchEnd,

    moveCount,
    mergeCount,
    highestTile: currentHighest,
    lastScoreGained,
    scoreGainedId,
    combo,
    chroniclerQuote,

    entropyPercent,
    fusionVelocity,
    isOverclocked,
    empCharge,
    canTriggerEmp,
    triggerEmp,
    isChronoRewinding,
    showHyperspaceWarp,
    dismissHyperspaceWarp,

    ghostStatus,
    ghostTileAtElapsed,

    dailyBestScore: stats.dailyDate === getTodayStr() ? stats.dailyBestScore : 0,

    /* ── Tactical Power-Up Augments ── */
    quantumSwapCharges,
    isSwapping,
    selectedSwapIdx,
    activateSwap,
    cancelSwap,
    onTileClick,

    cryoFreezeCharges,
    isCryoFrozen,
    cryoSecondsLeft,
    activateCryo,

    wildcardCharges,
    activateWildcard,

    /* ── Themes & Modals ── */
    theme,
    setTheme,
    showCodex,
    setShowCodex,
  };
}
