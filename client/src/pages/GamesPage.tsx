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
  Menu as MenuIcon,
  ChevronDown,
} from "lucide-react";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
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
  telugucinemalu: { livePlayers: 185, activeRooms: 26, difficulty: "Casual", rating: 4.9, tag: "Tollywood Adda" },
  blockblast: { livePlayers: 170, activeRooms: 23, difficulty: "Medium", rating: 4.7, tag: "Puzzle Match" },
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
  samethalu: { livePlayers: 95, activeRooms: 12, difficulty: "Casual", rating: 4.8, tag: "Ammamma Lore" },
  bounce: { livePlayers: 1250, activeRooms: 0, difficulty: "Medium", rating: 4.9, tag: "Red Ball Classic" },
  roadrash: { livePlayers: 980, activeRooms: 0, difficulty: "Casual", rating: 4.9, tag: "90s Racer" },
};

export default function GamesPage() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>("popular");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [theme] = useTheme();
  const isLight = theme === "light";

  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "Champion";

  const unreadCount = notifications.filter((n) => n.unread).length;

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
    let list = filterGames(filter, false);

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
    <div
      className={`min-h-screen flex flex-col lg:flex-row select-none transition-colors duration-300 ${
        isLight
          ? "bg-[#FFFDF7] text-[#3D2005] selection:bg-amber-300 selection:text-amber-900"
          : "bg-[#070B14] text-white selection:bg-amber-500/30 selection:text-amber-200"
      }`}
    >
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

      {/* ── LEFT SIDEBAR NAVIGATION (DESKTOP ONLY) ── */}
      <aside
        className={`hidden lg:flex lg:w-64 lg:min-h-screen p-4 flex-col justify-between shrink-0 shadow-lg transition-colors ${
          isLight
            ? "bg-[#FAF2E1] border-r border-[#ECD9BA]"
            : "bg-[#0A0F1D] border-r border-[#1B2338]"
        }`}
      >
        <div className="space-y-6">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-2.5 px-2 py-1 group">
            <BhalyamLogo size={42} decorative />
            <div className="flex flex-col leading-tight">
              <span className={`bhalyam-display text-[22px] tracking-wide transition-colors ${isLight ? "text-[#3D2005] group-hover:text-amber-600" : "text-white group-hover:text-amber-400"}`}>
                BHALYAM
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-[#FF8F00] -mt-0.5">
                All Games Hub
              </span>
            </div>
          </Link>

          {/* Main Navigation Categories */}
          <nav className="space-y-1">
            {SIDEBAR_CATEGORIES.map((cat, idx) => {
              const active = filter.category === cat.id && idx === SIDEBAR_CATEGORIES.findIndex(c => c.label === cat.label);
              return (
                <button
                  key={`${cat.id}-${idx}`}
                  type="button"
                  onClick={() => setFilter({ category: cat.id })}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${
                    active
                      ? isLight
                        ? "bg-[#FFF5DC] text-[#B45309] border-l-4 border-[#F59E0B] shadow-xs font-black"
                        : "bg-[#182035] text-[#FFB800] border-l-4 border-[#FFB800] shadow-sm font-black"
                      : isLight
                      ? "text-[#7A5B3E] hover:text-[#3D2005] hover:bg-black/5"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Filters */}
          <div className={`space-y-1.5 pt-2 border-t ${isLight ? "border-zinc-200" : "border-white/5"}`}>
            <div className={`px-3 text-[10.5px] font-extrabold uppercase tracking-wider ${isLight ? "text-[#9C7E63]" : "text-zinc-500"}`}>
              QUICK FILTERS
            </div>
            {QUICK_FILTERS.map((qf) => {
              const isSelected = activeQuickFilter === qf.id;
              return (
                <button
                  key={qf.id}
                  type="button"
                  onClick={() => setActiveQuickFilter(qf.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl font-bold text-[12.5px] transition-all cursor-pointer ${
                    isSelected
                      ? isLight
                        ? "text-[#B45309] bg-[#F59E0B]/15 font-black"
                        : "text-[#FF8F00] bg-[#FF8F00]/10 font-black"
                      : isLight
                      ? "text-[#7A5B3E] hover:text-[#3D2005] hover:bg-black/5"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{qf.icon}</span>
                  <span>{qf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Sidebar Card: Create Table */}
        <div
          className={`mt-6 p-4 rounded-2xl text-center shadow-md relative overflow-hidden transition-colors ${
            isLight
              ? "bg-[#FFF5DC] border border-[#ECD9BA] text-[#3D2005]"
              : "bg-gradient-to-b from-[#13192B] to-[#0D1220] border border-[#232D48] text-white"
          }`}
        >
          <h4 className="font-extrabold text-[13px]">Create your own table</h4>
          <p className={`text-[11px] mt-1 leading-snug ${isLight ? "text-[#7A5B3E]" : "text-zinc-400"}`}>
            Invite friends and start playing together!
          </p>

          <div className="my-3 flex items-center justify-center">
            <UsersIcon className="w-8 h-8 text-amber-500" />
          </div>

          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-[#FF8F00] to-[#E95D21] hover:brightness-110 active:scale-98 text-white font-extrabold text-[12px] shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Create Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header
          className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 border-b backdrop-blur-md transition-colors ${
            isLight
              ? "bg-[#FFFDF7]/95 border-[#ECD9BA]"
              : "bg-[#0A0F1D]/50 border-[#1B2338]/60"
          }`}
        >
          {/* Mobile-only brand logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 group">
            <BhalyamLogo size={34} decorative />
            <span className={`bhalyam-display text-[18px] tracking-tight font-black ${isLight ? "text-[#3D2005]" : "text-white"}`}>
              BHALYAM
            </span>
          </Link>

          <div className="hidden lg:block" />

          {/* Right Action Stack */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online count */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-extrabold shadow-xs ${
                isLight
                  ? "bg-[#FAF2E1] border-[#ECD9BA] text-emerald-800"
                  : "bg-[#141B2D] border-[#232D48] text-amber-400"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>1,284 Online</span>
            </div>

            {/* Home Button */}
            <Link
              to="/"
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border font-bold text-[12px] transition shadow-xs ${
                isLight
                  ? "bg-[#FAF2E1] border-[#ECD9BA] text-[#7A5B3E] hover:text-[#3D2005] hover:bg-[#F3E5CD]"
                  : "bg-[#141B2D] border-[#232D48] text-zinc-300 hover:text-white hover:bg-[#1A233A]"
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </Link>

            {/* Notification Icon -> opens Notifications slide-in drawer */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              title="Notifications"
              className={`relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border flex items-center justify-center text-sm transition hover:scale-105 cursor-pointer flex-shrink-0 ${
                isLight
                  ? "bg-[#FAF2DF] border-[#ECD9BA] text-[#5C3B1E] hover:bg-[#F2E4CB]"
                  : "bg-[#0D1426] border-[#1E2945] text-zinc-300 hover:bg-[#141E38]"
              }`}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Button -> opens Profile slide-in drawer */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="Your Profile"
              className={`h-9 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 rounded-full border transition hover:scale-102 cursor-pointer flex-shrink-0 ${
                isLight
                  ? "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:bg-[#F2E4CB]"
                  : "bg-[#0D1426] border-[#1E2945] text-white hover:bg-[#141E38]"
              }`}
            >
              <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full overflow-hidden border border-amber-400 flex items-center justify-center flex-shrink-0">
                <SelfAvatar
                  className="w-full h-full"
                  fallback={<UserIcon className="w-4 h-4 text-amber-500" />}
                />
              </div>
              <span className="hidden sm:inline text-[13px] font-bold tracking-tight max-w-[90px] truncate">
                {displayName}!
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Menu Button -> opens Menu slide-in drawer */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              title="Open menu"
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border flex items-center justify-center transition hover:scale-105 cursor-pointer flex-shrink-0 ${
                isLight
                  ? "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:text-amber-700 hover:bg-[#F2E4CB]"
                  : "bg-[#0D1426] border-[#1E2945] text-zinc-200 hover:text-amber-400 hover:bg-[#141E38]"
              }`}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="p-4 sm:p-6 lg:p-7 space-y-6 sm:space-y-7 flex-1">
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

          {/* ── 2. Mobile-Only Compact Category Scroll Strip ── */}
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SIDEBAR_CATEGORIES.map((cat) => {
              const active = filter.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilter({ category: cat.id as CategorySelection })}
                  className={`px-3.5 py-1.5 rounded-full font-extrabold text-[12px] whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
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

          {/* ── 3. 4-Column Games Grid (Matching Home Page Tiles) ── */}
          <section>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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
        </main>
      </div>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <NotificationsSheet
        open={notificationsOpen}
        notifications={notifications}
        onUpdateNotifications={setNotifications}
        onClose={() => setNotificationsOpen(false)}
        onOpenJoin={() => {
          setNotificationsOpen(false);
          setJoinOpen(true);
        }}
      />
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenJoin={() => {
          setMenuOpen(false);
          setJoinOpen(true);
        }}
      />
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
