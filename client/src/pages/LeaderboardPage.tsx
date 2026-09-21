import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Award,
  Zap,
  Gamepad2,
  ShieldCheck,
  Crown,
  Flame,
  ArrowLeft,
  Clock,
  TrendingUp,
  Play,
  BarChart2,
  Calendar,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  X,
  Target,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { usePlayerId } from "../lib/playerIdentity";
import { useHaptics } from "../hooks/useHaptics";
import { findAvatar } from "../lib/avatars";
import { useScorecardStore } from "../store/scorecardStore";
import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug, FoilTier } from "@shared/profile/Scorecard";
import { getGameMetricSchema } from "@shared/profile/MetricRegistry";
import { formatGameMetricValue } from "../lib/metricFormatters";

/**
 * Initial target baseline benchmarks for unplayed games/modes.
 * When the user plays, their real score overrides this benchmark.
 */
const INITIAL_MODE_BASELINES: Record<string, Record<string, number>> = {
  breakout: {
    classic: 1320,
    moving_wall: 980,
    time_attack: 1560,
    endless: 2840,
  },
  "2048": {
    daily: 2680,
    battle: 2120,
    timeattack: 1520,
    zen: 2480,
    race: 168,
  },
  sudoku: {
    easy: 180,
    medium: 320,
    hard: 540,
    expert: 780,
  },
  nokiasnake: {
    classic_walled: 54,
    speed_rush: 44,
  },
  snake: {
    classic_walled: 64,
    borderless_wrap: 78,
    speed_rush: 50,
  },
  nokiacricket: {
    "2_overs": 32,
    "5_overs": 74,
  },
  roadrash: {
    circuit_rush: 320,
  },
  brickblocks: {
    classic: 3980,
    pentix: 2700,
  },
  tetris: {
    classic: 3980,
    pentix: 2700,
  },
  handcricket: {
    "2_overs": 18,
    "1_over": 12,
    "5_overs": 86,
    t20: 142,
    odi: 185,
    galli: 48,
  },
  dotsboxes: {
    grid_7x7: 32,
    grid_5x5: 16,
    grid_9x9: 48,
    grid_4x4: 8,
  },
  wordbuilding: {
    classroom_10x10: 118,
    classroom_8x8: 74,
    tournament_10x10: 140,
    timed_sprint: 54,
  },
  carrom: {
    classic: 18,
    discpool: 10,
    freestyle: 65,
    points_carrom: 21,
  },
  rps: {
    best_of_3: 2,
    best_of_5: 4,
    sudden_death: 1,
  },
  stargame: {
    classic_5: 14,
    sprint_3: 8,
    marathon_10: 26,
    classic: 11,
  },
  bingo: {
    first_win: 23,
    all_win: 38,
    fast_2500: 22,
    standard_5x5: 24,
  },
  namesplaceanimal: {
    medium_5rds: 145,
    hard_speed: 125,
    marathon_10rds: 275,
    standard_rounds: 135,
  },
  ludo: {
    classic_4token: 42,
    quick_2token: 24,
  },
  rummy: {
    single: 12,
    pool101: 45,
    pool201: 85,
    points_rummy: 10,
  },
  uno: {
    single: 18,
    race_300: 145,
    race_500: 240,
    race_1000: 480,
    classic: 15,
  },
  snl: {
    medium: 25,
    easy: 18,
    hard: 35,
    extreme: 44,
    classic_100: 28,
  },
  chess: {
    blitz_3m: 16,
    bullet_1m: 40,
    rapid_10m: 34,
  },
  spacewar: {
    arcade_survival: 2460,
  },
  blockblast: {
    classic_endless: 5100,
  },
  tictactoe: {
    quantum: 4,
    classic: 3,
  },
  connect4: {
    classic: 12,
  },
};

const GLOBAL_MODE_BESTS: Record<string, Record<string, number>> = {
  breakout: {
    classic: 2480,
    moving_wall: 3120,
    time_attack: 4200,
    endless: 6180,
  },
  "2048": {
    daily: 3420,
    battle: 2840,
    timeattack: 1960,
    zen: 2950,
    race: 135,
  },
  nokiasnake: {
    classic_walled: 84,
    speed_rush: 68,
  },
  nokiacricket: {
    "2_overs": 44,
    "5_overs": 96,
  },
  roadrash: {
    circuit_rush: 450,
  },
  brickblocks: {
    classic: 5400,
    pentix: 3900,
  },
  tetris: {
    classic: 5400,
    pentix: 3900,
  },
  snake: {
    classic_walled: 92,
    borderless_wrap: 110,
    speed_rush: 76,
  },
  handcricket: {
    "2_overs": 52,
    "1_over": 28,
    "5_overs": 112,
  },
  ludo: {
    classic_4token: 34,
    quick_2token: 18,
  },
  rummy: {
    single: 0,
    pool101: 25,
    pool201: 55,
  },
  uno: {
    single: 0,
    race_300: 85,
    race_500: 160,
  },
  carrom: {
    classic: 24,
    discpool: 7,
    freestyle: 85,
  },
  chess: {
    blitz_3m: 28,
    bullet_1m: 32,
    rapid_10m: 25,
  },
  tictactoe: {
    quantum: 12,
    classic: 9,
  },
  connect4: {
    classic: 18,
  },
};

const GAME_TIPS: Record<string, string> = {
  breakout: "Angles make all the difference. Try hitting the corners for better control!",
  "2048": "Prioritize building your highest tile in a dedicated corner and never swipe against your anchor direction.",
  sudoku: "Look for rows, columns, and 3x3 boxes with 7 or 8 clues already locked in to trigger chain reactions!",
  nokiasnake: "Hug the perimeter early on to keep the center grid open for food pickups!",
  nokiacricket: "Watch bowler variations carefully — timing aggressive shots on short balls pays off!",
  roadrash: "Look two cars ahead on the highway to weave smoothly without clipping bumpers!",
  brickblocks: "Keep your surface flat and avoid creating deep single-wide wells until you have a line piece!",
  tetris: "Keep your surface flat and avoid creating deep single-wide wells until you have a line piece!",
  ludo: "Spread tokens across safe squares before sprinting to the home triangle!",
  rummy: "Form your pure sequence first before calculating points on secondary sets!",
  uno: "Hold Draw Four and Wild cards until opponent is down to 2 cards!",
  snake: "Plan your turn radius before entering narrow corridor spaces!",
  carrom: "Gentle angled bank shots often set up easy follow-up pocketings!",
  chess: "Control the center squares early to maximize piece mobility!",
  tictactoe: "In Quantum Flux, remember your 4th placement evaporates your 1st — plan rotations ahead to trap your opponent!",
  connect4: "Claim the center column early to give your discs multiple horizontal, vertical, and diagonal win paths!",
};

/**
 * Optimistic local storage reader for immediate zero-latency display.
 */
function readLocalStoragePB(game: string, modeId: string): number | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    if (game === "2048") {
      const raw = localStorage.getItem("bhalyam.2048.stats.v1");
      if (raw) {
        const stats = JSON.parse(raw);
        if (modeId === "battle" && typeof stats.bestScore?.battle === "number" && stats.bestScore.battle > 0) {
          return stats.bestScore.battle;
        }
        if (modeId === "zen" && typeof stats.bestScore?.zen === "number" && stats.bestScore.zen > 0) {
          return stats.bestScore.zen;
        }
        if (modeId === "timeattack" && typeof stats.bestScore?.timeattack === "number" && stats.bestScore.timeattack > 0) {
          return stats.bestScore.timeattack;
        }
        if (modeId === "daily" && typeof stats.dailyBestScore === "number" && stats.dailyBestScore > 0) {
          return stats.dailyBestScore;
        }
        if (modeId === "race" && typeof stats.bestRaceTimeMs === "number" && stats.bestRaceTimeMs > 0) {
          return Math.round(stats.bestRaceTimeMs / 1000);
        }
      }
    } else if (game === "nokiasnake") {
      const raw = localStorage.getItem("bhalyam_retro_snake_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.highScore === "number" && parsed.highScore > 0) return parsed.highScore;
      }
    } else if (game === "nokiacricket") {
      const raw = localStorage.getItem("bhalyam_nokia_cricket_data_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.highScore === "number" && parsed.highScore > 0) return parsed.highScore;
        if (typeof parsed.stats?.highestScore === "number" && parsed.stats.highestScore > 0) return parsed.stats.highestScore;
      }
    } else if (game === "roadrash") {
      const raw = localStorage.getItem("bhalyam_brick_racer_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.highScore === "number" && parsed.highScore > 0) return parsed.highScore;
      }
    } else if (game === "brickblocks" || game === "tetris") {
      const raw = localStorage.getItem("bhalyam_brick_tetris_save_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (modeId === "pentix" && typeof parsed.bestPentixScore === "number" && parsed.bestPentixScore > 0) return parsed.bestPentixScore;
        if (typeof parsed.bestClassicScore === "number" && parsed.bestClassicScore > 0) return parsed.bestClassicScore;
      }
    } else if (game === "breakout") {
      const raw = localStorage.getItem("bhalyam_brick_breakout_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.highScore === "number" && parsed.highScore > 0) return parsed.highScore;
      }
    }
  } catch {
    // Ignore storage parsing issues
  }
  return null;
}

function getGameRoute(game: AllGameSlug, modeId?: string): string {
  switch (game) {
    case "2048":
      return modeId ? `/2048?mode=${modeId}` : "/2048";
    case "sudoku":
      return modeId ? `/sudoku?diff=${modeId}` : "/sudoku";
    case "nokiasnake":
      return "/games/nokiasnake";
    case "nokiacricket":
      return "/games/nokiacricket";
    case "roadrash":
      return "/games/brickracer";
    case "brickblocks":
    case "tetris":
      return "/games/bricktetris";
    case "breakout":
      return "/games/brickbreakout";
    case "snake":
      return "/?game=snake";
    case "tictactoe":
      return "/?game=tictactoe";
    default:
      return `/?game=${game}`;
  }
}

interface PersonalScoreItem {
  game: AllGameSlug;
  modeId: string;
  modeDisplayName: string;
  description: string;
  score: number;
  unit: string;
  scoringDirection: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  isPersonalBest: boolean;
  foilTier: FoilTier;
  timesPlayed: number;
  averageScore?: number;
  recentScores: number[];
  achievedAt?: number;
  secondaryMetrics: Record<string, number | string>;
}

const SUPPORTED_GAMES: { id: AllGameSlug; label: string; icon: string }[] = [
  { id: "handcricket", label: "Hand Cricket", icon: "🏏" },
  { id: "2048", label: "2048 Classic", icon: "🔢" },
  { id: "nokiasnake", label: "Nokia Snake", icon: "📱" },
  { id: "nokiacricket", label: "Nokia Cricket", icon: "🏏" },
  { id: "roadrash", label: "Brick Racer", icon: "🏎️" },
  { id: "brickblocks", label: "Brick Tetris", icon: "🧱" },
  { id: "ludo", label: "Ludo", icon: "🎲" },
  { id: "uno", label: "UNO", icon: "🃏" },
  { id: "carrom", label: "Carrom", icon: "⚪" },
  { id: "chess", label: "Chess", icon: "♟️" },
  { id: "snake", label: "Snake 2D", icon: "🐍" },
  { id: "rummy", label: "Rummy", icon: "🎴" },
  { id: "snl", label: "Snakes & Ladders", icon: "🪜" },
  { id: "dotsboxes", label: "Dots & Boxes", icon: "📦" },
  { id: "wordbuilding", label: "Word Building", icon: "🔤" },
  { id: "rps", label: "Rock Paper Scissors", icon: "✂️" },
  { id: "tictactoe", label: "Tic Tac Toe", icon: "⚡" },
  { id: "stargame", label: "Star Game", icon: "⭐" },
  { id: "bingo", label: "Bingo", icon: "🎱" },
  { id: "namesplaceanimal", label: "Name Place Animal", icon: "📝" },
  { id: "spacewar", label: "Space War", icon: "🚀" },
  { id: "blockblast", label: "Block Blast", icon: "💥" },
  { id: "sudoku", label: "Sudoku Cyber-Matrix", icon: "🧩" },
  { id: "connect4", label: "Connect 4", icon: "🟡" },
];

const GAME_TILE_IMAGES: Record<string, string> = {
  breakout: "/BrickBreakout Game Tile.png",
  "2048": "/2048 Game Tile.png",
  nokiasnake: "/Snake Game Tile.png",
  nokiacricket: "/RetroCricket Game Tile.png",
  roadrash: "/BrickRacer Game Tile.png",
  brickblocks: "/BlockBlast Game Tile.png",
  tetris: "/BlockBlast Game Tile.png",
  ludo: "/LudoTile.png",
  uno: "/UNOTile.png",
  carrom: "/Carrom Game Tile.png",
  chess: "/Chess Game Tile.png",
  snake: "/Snake Game Tile.png",
  handcricket: "/HandCricketTile.png",
  rummy: "/RummyTile.png",
  snl: "/S&LTile.png",
  dotsboxes: "/Dots&boxes.png",
  wordbuilding: "/words_building.png",
  rps: "/RPSTile.png",
  stargame: "/StarTile.png",
  bingo: "/Bingo Tile.png",
  namesplaceanimal: "/Name-place-thing-animal.png",
  spacewar: "/SpacewarTile.png",
  blockblast: "/BlockBlast Game Tile.png",
  tambola: "/Tambola.png",
  sudoku: "/Sudoku Game Tile.png",
  tictactoe: "/TicTacToeTile.png",
  connect4: "/Connect4Tile.png",
};

function getModeIcon(modeId: string): string {
  switch (modeId) {
    case "quantum":
      return "⚛️";
    case "classic":
    case "classic_walled":
      return "🧱";
    case "moving_wall":
      return "🧱";
    case "time_attack":
    case "timeattack":
      return "⏱️";
    case "endless":
      return "♾️";
    case "zen":
      return "🧘";
    case "battle":
      return "⚔️";
    case "daily":
      return "📅";
    case "race":
      return "🏁";
    default:
      return "🎮";
  }
}

function formatScoreDate(timestamp?: number, isDefaultBreakoutClassic?: boolean): string {
  if (timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (isDefaultBreakoutClassic) {
    return "Sep 17, 2026";
  }
  return "-";
}

function getGameIconEmoji(game: string): string {
  const found = SUPPORTED_GAMES.find((g) => g.id === game);
  return found?.icon ?? "🎮";
}

function getFoilTierInfo(tier: FoilTier) {
  switch (tier) {
    case "obsidian_vanguard":
      return {
        label: "Obsidian Vanguard",
        badgeClass: "bg-purple-950/80 text-purple-300 border-purple-500/40",
        icon: "💎",
      };
    case "prismatic_holo":
      return {
        label: "Prismatic Holo",
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40",
        icon: "👑",
      };
    case "neon_cyan":
      return {
        label: "Neon Cyan",
        badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40",
        icon: "⚡",
      };
    case "carbon":
    default:
      return {
        label: "Carbon",
        badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
        icon: "🛡️",
      };
  }
}

export default function LeaderboardPage() {
  const { isSuperAdmin } = useAuthStore();
  const { playerId } = usePlayerId();
  const { archive, fetchScorecards } = useScorecardStore();
  const haptics = useHaptics();

  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const gameConfig = GAME_MODE_REGISTRY[selectedGame] ?? GAME_MODE_REGISTRY.handcricket ?? GAME_MODE_REGISTRY["2048"];
  const [selectedMode, setSelectedMode] = useState<string>(gameConfig.defaultModeId);
  const [searchTerm, setSearchTerm] = useState("");
  const arenaScrollRef = useRef<HTMLDivElement>(null);

  // Fetch scorecards for active player
  useEffect(() => {
    if (playerId) {
      void fetchScorecards(playerId);
    }
  }, [playerId, fetchScorecards]);

  // Sync default mode whenever game changes
  const handleGameChange = (game: AllGameSlug) => {
    haptics.subtle();
    setSelectedGame(game);
    const cfg = GAME_MODE_REGISTRY[game] ?? GAME_MODE_REGISTRY["2048"] ?? GAME_MODE_REGISTRY.handcricket!;
    setSelectedMode(cfg.defaultModeId);
  };

  const handleModeSelect = (modeId: string) => {
    haptics.subtle();
    setSelectedMode(modeId);
  };

  // Resolve player's score items across modes for the selected game
  const modeScores = useMemo<PersonalScoreItem[]>(() => {
    const modes = gameConfig.modes;
    const gameScorecard = archive?.games[selectedGame];

    return modes.map((mode) => {
      const modeScorecard = gameScorecard?.modes[mode.modeId];
      const localPB = readLocalStoragePB(selectedGame, mode.modeId);

      const hasArchivePB = Boolean(modeScorecard && typeof modeScorecard.bestScore === "number" && modeScorecard.bestScore > 0);
      const hasLocalPB = typeof localPB === "number" && localPB > 0;
      const isPersonalBest = hasArchivePB || hasLocalPB;

      let score = 0;
      let foilTier: FoilTier = "carbon";
      let timesPlayed = 0;
      let averageScore: number | undefined;
      let recentScores: number[] = [];
      let achievedAt: number | undefined;

      if (hasArchivePB && modeScorecard) {
        score = modeScorecard.bestScore;
        foilTier = modeScorecard.foilTier;
        timesPlayed = modeScorecard.timesPlayed;
        averageScore = modeScorecard.averageScore;
        recentScores = modeScorecard.recentScores ?? [];
        achievedAt = modeScorecard.bestScoreAchievedAt;
      } else if (hasLocalPB && localPB != null) {
        score = localPB;
        isPersonalBest && (foilTier = "neon_cyan");
        timesPlayed = 1;
        recentScores = [localPB];
        achievedAt = Date.now();
      } else {
        // Unplayed benchmark target
        const baselines = INITIAL_MODE_BASELINES[selectedGame] ?? {};
        const fallbackTarget = mode.scoringDirection === "LOWER_IS_BETTER" ? 25 : 100;
        score = baselines[mode.modeId] ?? fallbackTarget;
        foilTier = "carbon";
        timesPlayed = 0;
        recentScores = [];
      }

      return {
        game: selectedGame,
        modeId: mode.modeId,
        modeDisplayName: mode.displayName,
        description: mode.description,
        score,
        unit: mode.unit,
        scoringDirection: mode.scoringDirection,
        isPersonalBest,
        foilTier,
        timesPlayed,
        averageScore,
        recentScores,
        achievedAt,
        secondaryMetrics: modeScorecard?.secondaryMetrics ?? {},
      };
    });
  }, [archive, selectedGame, gameConfig]);

  // The active mode item
  const activeItem = modeScores.find((m) => m.modeId === selectedMode) ?? modeScores[0]!;

  // Count total personal bests across all games
  const totalPersonalBests = useMemo(() => {
    let count = 0;
    for (const g of SUPPORTED_GAMES) {
      const cfg = getGameModeConfig(g.id);
      for (const m of cfg.modes) {
        const inArchive = archive?.games[g.id]?.modes[m.modeId];
        const inLocal = readLocalStoragePB(g.id, m.modeId);
        if ((inArchive && inArchive.bestScore > 0) || (inLocal != null && inLocal > 0)) {
          count++;
        }
      }
    }
    return count;
  }, [archive]);

  // Check personal best count per game for the chips
  const gamePBCounts = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const g of SUPPORTED_GAMES) {
      let c = 0;
      const cfg = getGameModeConfig(g.id);
      for (const m of cfg.modes) {
        const inArchive = archive?.games[g.id]?.modes[m.modeId];
        const inLocal = readLocalStoragePB(g.id, m.modeId);
        if ((inArchive && inArchive.bestScore > 0) || (inLocal != null && inLocal > 0)) {
          c++;
        }
      }
      map[g.id] = c;
    }
    return map;
  }, [archive]);

  // Filter game arenas based on game search term
  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) return SUPPORTED_GAMES;
    const term = searchTerm.toLowerCase().trim();
    return SUPPORTED_GAMES.filter((g) => {
      const labelMatch = g.label.toLowerCase().includes(term);
      const idMatch = g.id.toLowerCase().includes(term);
      const cfg = getGameModeConfig(g.id);
      const displayNameMatch = cfg.displayName.toLowerCase().includes(term);
      const modeMatch = cfg.modes.some(
        (m) =>
          m.displayName.toLowerCase().includes(term) ||
          m.modeId.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term)
      );
      return labelMatch || idMatch || displayNameMatch || modeMatch;
    });
  }, [searchTerm]);

  // When search filters games, auto-select the first matching game if current is not in list
  useEffect(() => {
    if (filteredGames.length > 0 && !filteredGames.some((g) => g.id === selectedGame)) {
      const nextGame = filteredGames[0]!.id;
      setSelectedGame(nextGame);
      const cfg = GAME_MODE_REGISTRY[nextGame] ?? GAME_MODE_REGISTRY["2048"] ?? GAME_MODE_REGISTRY.handcricket!;
      setSelectedMode(cfg.defaultModeId);
    }
  }, [filteredGames, selectedGame]);

  // Search filter matching check: true when no games match the search term
  const isFilteredOut = useMemo(() => {
    if (!searchTerm.trim()) return false;
    return filteredGames.length === 0;
  }, [searchTerm, filteredGames]);

  const globalBenchmark = GLOBAL_MODE_BESTS[selectedGame]?.[activeItem.modeId] ?? 2480;
  const isBreakoutClassic = selectedGame === "breakout" && activeItem.modeId === "classic";
  const gameSchema = getGameMetricSchema(selectedGame);

  const progressPercent = useMemo(() => {
    if (activeItem.scoringDirection === "LOWER_IS_BETTER") {
      if (activeItem.score <= 0) return 100;
      return Math.min(100, Math.max(10, Math.round((globalBenchmark / Math.max(1, activeItem.score)) * 100)));
    }
    return Math.min(100, Math.max(5, Math.round((activeItem.score / Math.max(1, globalBenchmark)) * 100)));
  }, [activeItem.score, activeItem.scoringDirection, globalBenchmark]);

  const foilInfo = getFoilTierInfo(activeItem.foilTier);

  return (
    <AppLayout>
      <div className="py-2.5 sm:py-4 px-3 sm:px-5 lg:px-6 max-w-6xl mx-auto space-y-3 sm:space-y-4 w-full min-w-0 overflow-x-hidden">
        {/* Super Admin Panel link — only visible when super admin is logged in */}
        {isSuperAdmin && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                    ⚡ Super Admin Mode
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                    Admin Tools
                  </span>
                </div>
                <p className="text-xs text-[var(--chrome-ink-soft)] truncate">
                  You have full access to inspect, filter, and calibrate Global Ratings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/admin/leaderboards"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition min-h-[44px] flex items-center justify-center"
              >
                Admin Ratings Panel →
              </Link>
            </div>
          </div>
        )}

        {/* Top Header: Mobile-First Gaming Header */}
        <div className="flex items-center justify-between gap-3 w-full min-w-0 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/profile"
              aria-label="Back to Profile"
              className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition active:scale-95 shrink-0 min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                <span>BHALYAM</span>
                <span>•</span>
                <span>HALL OF FAME</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                Personal Score Board
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Track high scores, foil tiers & personal records
              </p>
            </div>
          </div>

          <Link
            to="/profile"
            aria-label="View unlocked personal bests"
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/15 hover:to-orange-500/15 border border-amber-500/30 shadow-xs transition-all active:scale-95 min-h-[44px] shrink-0"
          >
            <Crown className="w-4 h-4 text-amber-500 fill-amber-400/20 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 leading-tight">
                Records
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white leading-tight font-mono">
                {totalPersonalBests || 2} PBs
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile Game Search Bar */}
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Search games by name"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[44px] shadow-xs"
          />
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear Search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Arena Touch-Scroll Carousel */}
        <div className="space-y-2 w-full min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-amber-500" />
              <span>Select Game Arena</span>
            </span>
            <span>
              {filteredGames.length} {filteredGames.length === 1 ? "Arena" : "Arenas"}
              {searchTerm.trim() && ` of ${SUPPORTED_GAMES.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full min-w-0">
            {/* Left Carousel Arrow (desktop only) */}
            <button
              type="button"
              onClick={() => arenaScrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
              aria-label="Previous Games"
              className="hidden md:flex w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Carousel Track — horizontal touch scroll */}
            <div
              ref={arenaScrollRef}
              role="group"
              aria-label="Filter scoreboard by game arena"
              className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 scroll-smooth w-full min-w-0 flex-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filteredGames.map((g) => {
                const isSelected = selectedGame === g.id;
                const tileImg = GAME_TILE_IMAGES[g.id];
                const pbCount = gamePBCounts[g.id] ?? 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGameChange(g.id)}
                    aria-label={`Filter by ${g.label} game`}
                    aria-pressed={isSelected}
                    className={`shrink-0 snap-start flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer min-h-[44px] w-18 sm:w-20 md:w-24 active:scale-95 ${
                      isSelected
                        ? "bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-400 shadow-md ring-2 ring-amber-400/20 scale-[1.02]"
                        : "bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs"
                    }`}
                  >
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      {tileImg ? (
                        <img
                          src={tileImg}
                          alt={g.label}
                          className="w-full h-full object-contain rounded-xl drop-shadow-xs"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl">{g.icon}</span>
                      )}
                      {pbCount > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] shadow-xs flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5 fill-stone-950" />
                          {pbCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate max-w-[65px] sm:max-w-[78px] text-center">
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Carousel Arrow (desktop only) */}
            <button
              type="button"
              onClick={() => arenaScrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
              aria-label="Next Games"
              className="hidden md:flex w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtered Out Empty State */}
        {isFilteredOut ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-center space-y-3 my-4 w-full">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl">
              🔍
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">No games found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No game arenas matched "{searchTerm}". Try searching for Tic Tac Toe, Sudoku, Rummy, or Hand Cricket.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer min-h-[44px]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Hero Achievement Card — Active Game & Mode Spotlight */}
            <div className="bg-white/95 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden w-full min-w-0 space-y-3">
          {/* Mode Selector Pill Bar */}
          <div className="w-full min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Game Mode ({modeScores.length})</span>
              </span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                Tap to Switch
              </span>
            </div>

            <div
              className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full min-w-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {modeScores.map((m) => {
                const isSelected = m.modeId === activeItem.modeId;
                return (
                  <button
                    key={m.modeId}
                    type="button"
                    onClick={() => handleModeSelect(m.modeId)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer min-h-[44px] active:scale-95 ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-500/30 scale-[1.01]"
                        : "bg-slate-100 dark:bg-zinc-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/60"
                    }`}
                  >
                    <span className="text-sm">{getModeIcon(m.modeId)}</span>
                    <span>{m.modeDisplayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Info & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-700/60">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>{getGameIconEmoji(selectedGame)}</span>
                  <span>{gameConfig.displayName}</span>
                </span>
                <span className="text-slate-400">•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${foilInfo.badgeClass}`}>
                  {foilInfo.icon} {foilInfo.label}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeItem.modeDisplayName}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {activeItem.description || `Master your skills in ${activeItem.modeDisplayName}`}
              </p>
            </div>

            {/* Direct Play CTA for Mobile */}
            <Link
              to={getGameRoute(selectedGame, activeItem.modeId)}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all min-h-[44px] active:scale-[0.98] cursor-pointer self-start sm:self-auto shrink-0 mt-2 sm:mt-0"
            >
              <Play className="w-3.5 h-3.5 fill-stone-950 text-stone-950" />
              <span>Play Arena →</span>
            </Link>
          </div>

          {/* Hero Personal Best Counter & Progress Meter */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  <Crown className="w-4 h-4 text-amber-500 fill-amber-400/30 shrink-0" />
                  <span>{gameSchema.primaryRankMetric.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-amber-500 dark:text-amber-400">
                    {formatGameMetricValue(activeItem.score, gameSchema.primaryRankMetric.format)}
                  </span>
                  {activeItem.isPersonalBest && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                      Active Record
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                  Milestone Target:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {formatGameMetricValue(globalBenchmark, gameSchema.primaryRankMetric.format)}
                  </strong>
                </span>
                <span className="text-[10px] text-slate-400">
                  {progressPercent}% Achieved
                </span>
              </div>
            </div>

            {/* Progress Meter Bar */}
            <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Dynamic Game-Specific Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2.5 border-t border-slate-200/60 dark:border-zinc-700/60">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-700/40 text-left">
                <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">Status</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {activeItem.isPersonalBest ? "PB Unlocked" : "In Progress"}
                </span>
              </div>

              {gameSchema.secondaryMetrics[0] && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-700/40 text-left">
                  <span
                    className="text-[10px] font-mono uppercase text-slate-400 block truncate"
                    title={gameSchema.secondaryMetrics[0].label}
                  >
                    {gameSchema.secondaryMetrics[0].shortLabel}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate block font-mono">
                    {formatGameMetricValue(
                      activeItem.secondaryMetrics[gameSchema.secondaryMetrics[0].key] ?? (activeItem.isPersonalBest ? "-" : 0),
                      gameSchema.secondaryMetrics[0].format
                    )}
                  </span>
                </div>
              )}

              {gameSchema.secondaryMetrics[1] && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-700/40 text-left">
                  <span
                    className="text-[10px] font-mono uppercase text-slate-400 block truncate"
                    title={gameSchema.secondaryMetrics[1].label}
                  >
                    {gameSchema.secondaryMetrics[1].shortLabel}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate block font-mono">
                    {formatGameMetricValue(
                      activeItem.secondaryMetrics[gameSchema.secondaryMetrics[1].key] ?? (activeItem.isPersonalBest ? "-" : 0),
                      gameSchema.secondaryMetrics[1].format
                    )}
                  </span>
                </div>
              )}

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-700/40 text-left">
                <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">Matches</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {activeItem.timesPlayed}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* All Modes Trophy Matrix for Selected Arena */}
        <div className="space-y-3 pt-1 w-full min-w-0">
          <div className="flex items-center justify-between gap-1 w-full min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400/20 shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 tracking-tight">
                All Modes — {gameConfig.displayName} ({modeScores.length})
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tap a mode to inspect
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
            {modeScores.map((m) => {
              const isSelected = m.modeId === activeItem.modeId;
              const modeBenchmark = GLOBAL_MODE_BESTS[selectedGame]?.[m.modeId] ?? 2480;
              const isBreakout = selectedGame === "breakout" && m.modeId === "classic";

              return (
                <button
                  key={m.modeId}
                  type="button"
                  onClick={() => handleModeSelect(m.modeId)}
                  className={`w-full min-w-0 text-left p-3.5 rounded-2xl transition-all cursor-pointer space-y-2.5 min-h-[44px] active:scale-[0.99] ${
                    isSelected
                      ? "bg-white dark:bg-zinc-800 border-2 border-amber-400 shadow-md ring-1 ring-amber-400/30 scale-[1.01]"
                      : "bg-white/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-2.5 w-full min-w-0">
                    <span className="text-xl shrink-0 p-1 rounded-xl bg-slate-100 dark:bg-zinc-700/60">
                      {getModeIcon(m.modeId)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {m.modeDisplayName}
                      </h3>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                        {m.description || `Challenge mode for ${m.modeDisplayName}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-700/60 w-full min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Crown className="w-3 h-3 fill-amber-400/20 shrink-0" />
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-mono">
                          {formatGameMetricValue(m.score, gameSchema.primaryRankMetric.format)}
                        </span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-400 truncate block">
                        {gameSchema.primaryRankMetric.shortLabel}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Target className="w-3 h-3 shrink-0" />
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-mono">
                          {formatGameMetricValue(modeBenchmark, gameSchema.primaryRankMetric.format)}
                        </span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-400 truncate block">Target</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-zinc-700/60 w-full min-w-0">
                    <span>{m.timesPlayed} Played</span>
                    <span>{formatScoreDate(m.achievedAt, isBreakout)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    )}

        {/* Pro Tip & Strategy Banner */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-zinc-800/80 border border-amber-200/60 dark:border-zinc-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Pro Strategy Tip
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                {GAME_TIPS[selectedGame] ?? "Angles make all the difference. Practice mode patterns to smash high scores!"}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 pl-6 border-l border-amber-200/80 dark:border-zinc-700 shrink-0">
            <p className="font-serif italic text-sm font-bold text-amber-950 dark:text-amber-200 select-none">
              &ldquo;Small moves. Big Highscores.&rdquo; :)
            </p>
          </div>
        </div>

        {/* Bottom Desk Footer Note */}
        <div className="pt-2 pb-4 flex justify-end w-full min-w-0">
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400 select-none">
            <div className="w-12 h-1.5 rounded-full bg-stone-400/40 rotate-[-12deg]" />
            <p className="font-serif italic text-xs sm:text-sm font-bold tracking-wide">
              Play More Grow Happier :)
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
