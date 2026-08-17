import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home as HomeIcon,
  LayoutGrid,
  User as UserIcon,
  Users as UsersIcon,
  Shield,
  Sparkles,
  GraduationCap,
  Flame,
  TrendingUp,
  Clock,
  Trophy,
  BookOpen,
  Bell,
  Zap,
  Target,
  Play,
  CheckCircle2,
  ArrowRight,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import AppLayout from "../components/layout/AppLayout";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import {
  BHALYAM_GAMES,
  categoryById,
  isLocked,
  getGameAccent,
  type BhalyamGameCard,
  type BhalyamGameSlug,
  type GameTag,
} from "../components/bhalyam/data";
import {
  filterGames,
  type CategorySelection,
  type GameFilter,
} from "../components/bhalyam/CategoryFilter";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import { useTheme } from "../lib/useTheme";
import SelfAvatar from "../components/profile/SelfAvatar";
import {
  GameTile,
  ProfileSheet,
  MenuSheet,
  NotificationsSheet,
  type NotificationItem,
  INITIAL_NOTIFICATIONS,
} from "./BhalyamHome";

/**
 * Game catalog sidebar categories matching the design.
 */
const SIDEBAR_CATEGORIES: Array<{ id: CategorySelection; label: string; icon: React.ReactNode }> = [
  { id: "all", label: "All Games", icon: <LayoutGrid className="w-4.5 h-4.5" /> },
  { id: "retro", label: "Retro Games", icon: <Sparkles className="w-4.5 h-4.5 text-emerald-500" /> },
  { id: "solo", label: "Solo Play", icon: <UserIcon className="w-4.5 h-4.5" /> },
  { id: "multiplayer", label: "Multiplayer", icon: <UsersIcon className="w-4.5 h-4.5" /> },
  { id: "board", label: "Board & Cards", icon: <Shield className="w-4.5 h-4.5" /> },
  { id: "party", label: "Party & Quiz", icon: <Sparkles className="w-4.5 h-4.5" /> },
  { id: "classroom", label: "Classroom", icon: <GraduationCap className="w-4.5 h-4.5" /> },
];

type QuickFilter = "popular" | "trending" | "quick" | "competitive" | "classroom";

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string; icon: React.ReactNode }> = [
  { id: "popular", label: "Most Popular", icon: <Flame className="w-4 h-4 text-amber-500" /> },
  { id: "trending", label: "Trending Now", icon: <TrendingUp className="w-4 h-4 text-orange-500" /> },
  { id: "quick", label: "Quick Match (<10m)", icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { id: "competitive", label: "Competitive", icon: <Trophy className="w-4 h-4 text-amber-400" /> },
  { id: "classroom", label: "Classroom Classics", icon: <BookOpen className="w-4 h-4 text-emerald-500" /> },
];

/** Live mock telemetry data for social proof & engagement */
const GAME_TELEMETRY: Record<string, { livePlayers: number; activeRooms: number; difficulty: "Casual" | "Medium" | "Expert"; rating: number; tag: string }> = {
  ludo: { livePlayers: 420, activeRooms: 54, difficulty: "Casual", rating: 4.9, tag: "Most Played" },
  handcricket: { livePlayers: 342, activeRooms: 48, difficulty: "Casual", rating: 4.9, tag: "Backbench Legend" },
  uno: { livePlayers: 310, activeRooms: 41, difficulty: "Casual", rating: 4.9, tag: "Party Chaos" },
  rummy: { livePlayers: 284, activeRooms: 36, difficulty: "Medium", rating: 4.8, tag: "Festival Classic" },
  snl: { livePlayers: 215, activeRooms: 28, difficulty: "Casual", rating: 4.8, tag: "Snake 99" },
  snake: { livePlayers: 210, activeRooms: 29, difficulty: "Casual", rating: 4.8, tag: "Nokia 3310" },
  carrom: { livePlayers: 195, activeRooms: 27, difficulty: "Medium", rating: 4.8, tag: "Striker King" },
  chess: { livePlayers: 190, activeRooms: 25, difficulty: "Expert", rating: 4.9, tag: "Grandmaster" },
  dotsboxes: { livePlayers: 145, activeRooms: 22, difficulty: "Casual", rating: 4.7, tag: "Maths Period" },
  spacewar: { livePlayers: 110, activeRooms: 14, difficulty: "Casual", rating: 4.7, tag: "Laser Retro" },
  stargame: { livePlayers: 175, activeRooms: 24, difficulty: "Casual", rating: 4.8, tag: "Terrace Chit Slap" },
  bingo: { livePlayers: 160, activeRooms: 20, difficulty: "Casual", rating: 4.7, tag: "Full House" },
  rps: { livePlayers: 198, activeRooms: 30, difficulty: "Casual", rating: 4.8, tag: "Quick Battle" },
  wordbuilding: { livePlayers: 130, activeRooms: 18, difficulty: "Medium", rating: 4.6, tag: "English Class" },
  namesplaceanimal: { livePlayers: 165, activeRooms: 21, difficulty: "Casual", rating: 4.7, tag: "Speed Recall" },
  tambola: { livePlayers: 140, activeRooms: 19, difficulty: "Casual", rating: 4.6, tag: "Wedding Sangeet" },
  roadrash: { livePlayers: 980, activeRooms: 0, difficulty: "Casual", rating: 4.9, tag: "90s Racer" },
  tetris: { livePlayers: 1120, activeRooms: 0, difficulty: "Medium", rating: 4.9, tag: "Classic & Pentix" },
  breakout: { livePlayers: 1350, activeRooms: 0, difficulty: "Medium", rating: 4.9, tag: "Brick Breaker" },
  spacealien: { livePlayers: 1420, activeRooms: 0, difficulty: "Medium", rating: 4.9, tag: "Space Invaders" },
};

export default function GamesPage() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>("popular");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [theme] = useTheme();
  const isLight = theme === "light";

  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "Champion";

  const [params, setParams] = useSearchParams();
  const filter: GameFilter = useMemo(() => {
    const raw = params.get("c");
    const valid = raw && BHALYAM_GAMES.some((g) => g.tags.includes(raw as GameTag));
    return { category: (valid ? (raw as GameTag) : "all") as CategorySelection };
  }, [params]);

  function setFilter(next: GameFilter) {
    const p = new URLSearchParams();
    if (next.category !== "all") p.set("c", next.category);
    setParams(p, { replace: true });
  }

  useEffect(() => {
    document.title = "All Games · BHALYAM";
    getSocket();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Base list of games filtered by active category / quick filter
  const displayedGames = useMemo(() => {
    let list = filterGames(filter, true);

    // Apply quick filters if active
    if (activeQuickFilter === "popular") {
      list = [...list].sort((a, b) => (GAME_TELEMETRY[b.slug]?.livePlayers ?? 0) - (GAME_TELEMETRY[a.slug]?.livePlayers ?? 0));
    } else if (activeQuickFilter === "trending") {
      list = [...list].sort((a, b) => (GAME_TELEMETRY[b.slug]?.activeRooms ?? 0) - (GAME_TELEMETRY[a.slug]?.activeRooms ?? 0));
    } else if (activeQuickFilter === "quick") {
      list = list.filter((g) => g.duration?.includes("5") || g.duration?.includes("2") || g.duration?.includes("3"));
    } else if (activeQuickFilter === "classroom") {
      list = list.filter((g) => g.tags.includes("classroom"));
    } else if (activeQuickFilter === "competitive") {
      list = list.filter((g) => g.tags.includes("board") || g.slug === "chess" || g.slug === "rummy");
    }

    return list;
  }, [filter, activeQuickFilter]);

  return (
    <AppLayout onSelectGame={setSheetGame}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-bold text-[13.5px] shadow-2xl border flex items-center gap-2 ${
              isLight
                ? "bg-[#FFF5DC] border-[#E8D1A7] text-[#854D0E] shadow-amber-900/10"
                : "bg-[#1D2C4A] text-white border-amber-400/40"
            }`}
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-6 lg:p-7 space-y-6 sm:space-y-7 max-w-[1400px] mx-auto pb-16">
        <h1 className="sr-only">All Games Hub</h1>

        {/* ── 1. Hero Cards (Resume Playing + Daily Quests) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Continue Playing Hero Card */}
          <div
            className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between transition-colors ${
              isLight
                ? "bg-[#FFF5DC] border-2 border-[#ECD9BA] text-[#3D2005]"
                : "bg-[#0D1322] border border-[#1F2B48] text-white shadow-xl"
            }`}
          >
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                    CONTINUE PLAYING
                  </span>
                  <span className={`text-[12px] font-bold ${isLight ? "text-[#7A5B3E]" : "text-zinc-300"}`}>
                    Welcome back, {displayName}!
                  </span>
                </div>
                <h3 className={`bhalyam-display text-[24px] sm:text-[28px] mt-1.5 leading-tight ${isLight ? "text-[#3D2005]" : "text-white"}`}>
                  Hand Cricket <span className="text-amber-500">• Level 8</span>
                </h3>
                <p className={`text-[12.5px] font-medium mt-0.5 ${isLight ? "text-[#7A5B3E]" : "text-zinc-300"}`}>
                  45 Matches Won · 3x Win Streak · Next Milestone: <strong className={isLight ? "text-amber-800" : "text-amber-300"}>Golden Bat in 2 wins</strong>
                </p>
              </div>

              <div className="hidden sm:block text-right flex-shrink-0">
                <div className={`text-[11px] font-black ${isLight ? "text-amber-700" : "text-amber-300"}`}>60% to Level 9</div>
                <div className={`w-24 h-2 rounded-full mt-1 overflow-hidden border ${isLight ? "bg-[#E6D4B5] border-[#D4C3A3]" : "bg-white/10 border-white/10"}`}>
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 w-[60%]" />
                </div>
              </div>
            </div>

            <div className={`mt-5 pt-3 border-t flex items-center justify-between gap-3 relative z-10 flex-wrap ${isLight ? "border-zinc-300" : "border-white/10"}`}>
              <div className={`flex items-center gap-2 text-[12px] font-semibold ${isLight ? "text-[#7A5B3E]" : "text-zinc-300"}`}>
                <span className="inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> 48 Active Rooms Waiting</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">+50 XP per win</span>
              </div>
              <button
                type="button"
                onClick={() => setSheetGame("handcricket")}
                className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-white font-black text-[13.5px] shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Hand Cricket</span>
              </button>
            </div>
          </div>

          {/* Today's Daily Challenges Card */}
          <div
            className={`p-5 rounded-3xl shadow-md flex flex-col justify-between transition-colors ${
              isLight
                ? "bg-[#FAF2E1] border-2 border-[#ECD9BA] text-[#3D2005]"
                : "bg-[#0D1322] border border-[#1F2B48] text-white shadow-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={`bhalyam-display text-[17px] flex items-center gap-1.5 ${isLight ? "text-[#3D2005]" : "text-white"}`}>
                <Target className="w-4.5 h-4.5 text-amber-500" />
                <span>Today's Quests</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/40">
                Day 3
              </span>
            </div>

            <div className="space-y-2 my-2">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11.5px] font-bold ${isLight ? "bg-white/80 border-[#ECD9BA] text-[#3D2005]" : "bg-white/5 border border-white/10 text-zinc-200"}`}>
                <span>Win 1 Hand Cricket Match</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">+100 XP</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11.5px] font-bold ${isLight ? "bg-white/80 border-[#ECD9BA] text-[#3D2005]" : "bg-white/5 border border-white/10 text-zinc-200"}`}>
                <span>Play UNO with 2+ Friends</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">+150 XP</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11.5px] font-bold ${isLight ? "bg-white/80 border-[#ECD9BA] text-[#3D2005]" : "bg-white/5 border border-white/10 text-zinc-200"}`}>
                <span>Roll a 6 in Ludo</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">+50 XP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast("Quest claimed! +100 XP added to your profile.")}
              className="w-full py-2.5 rounded-xl bg-[#FFB800] hover:bg-amber-300 text-amber-950 font-black text-[12px] shadow-sm transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Claim Daily +100 XP</span>
            </button>
          </div>
        </section>

        {/* ── 2. Category & Quick Filter Chips ── */}
        <div className="space-y-3">
          {/* Main Categories Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SIDEBAR_CATEGORIES.map((cat) => {
              const active = filter.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilter({ category: cat.id as CategorySelection })}
                  className={`px-4 py-2 rounded-2xl font-extrabold text-[12.5px] whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-[#FF8F00] text-black shadow-md font-black"
                      : isLight
                      ? "bg-[#FAF2E1] text-[#7A5B3E] border border-[#ECD9BA] hover:text-[#3D2005]"
                      : "bg-[#141B2D] text-zinc-300 border border-[#232D48] hover:text-white"
                  }`}
                >
                  <span className="flex-shrink-0">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Filters Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className={`text-[11px] font-black uppercase tracking-wider mr-1 ${isLight ? "text-[#8A6D4B]" : "text-zinc-400"}`}>
              Filters:
            </span>
            {QUICK_FILTERS.map((qf) => {
              const isSelected = activeQuickFilter === qf.id;
              return (
                <button
                  key={qf.id}
                  type="button"
                  onClick={() => setActiveQuickFilter(qf.id)}
                  className={`px-3 py-1 rounded-full font-bold text-[11.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? isLight
                        ? "bg-amber-500 text-white font-black shadow-xs"
                        : "bg-amber-400 text-black font-black shadow-xs"
                      : isLight
                      ? "bg-white/80 text-[#7A5B3E] border border-[#ECD9BA] hover:bg-[#FAF2E1]"
                      : "bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span>{qf.icon}</span>
                  <span>{qf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Games Grid ── */}
        <section>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {displayedGames.map((game) => (
              <li key={game.slug}>
                <GameTile
                  game={game}
                  onSelect={() => setSheetGame(game.slug)}
                  compact
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </AppLayout>
  );
}
