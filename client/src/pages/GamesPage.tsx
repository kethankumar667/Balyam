import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import { ArrowRightIcon, UsersIcon, ClockIcon, GamepadGlyph } from "../components/bhalyam/icons";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import { useTheme } from "../lib/useTheme";
import SelfAvatar from "../components/profile/SelfAvatar";

/**
 * Game catalog categories with icons for quick scanning.
 */
const CATEGORIES: Array<{ id: CategorySelection; label: string; icon: string }> = [
  { id: "all", label: "All Games", icon: "🎮" },
  { id: "classroom", label: "Classroom Legends", icon: "🏫" },
  { id: "board", label: "Board & Cards", icon: "🎲" },
  { id: "multiplayer", label: "Multiplayer Adda", icon: "👥" },
  { id: "party", label: "Party & Quiz", icon: "🎉" },
  { id: "solo", label: "90s Solo Arcade", icon: "📱" },
];

type SortOption = "popular" | "trending" | "quick" | "competitive" | "classroom";

const SORT_OPTIONS: Array<{ id: SortOption; label: string; icon: string }> = [
  { id: "popular", label: "Most Popular", icon: "🔥" },
  { id: "trending", label: "Trending Now", icon: "⭐" },
  { id: "quick", label: "Quick Match (<10m)", icon: "⚡" },
  { id: "competitive", label: "Competitive", icon: "🏆" },
  { id: "classroom", label: "Classroom Classics", icon: "🎒" },
];

/** Live mock telemetry data for social proof & engagement */
const GAME_TELEMETRY: Record<string, { livePlayers: number; activeRooms: number; difficulty: "Casual" | "Medium" | "Expert"; rating: number; tag: string }> = {
  handcricket: { livePlayers: 342, activeRooms: 48, difficulty: "Casual", rating: 4.9, tag: "Backbench Legend" },
  rummy: { livePlayers: 284, activeRooms: 36, difficulty: "Medium", rating: 4.8, tag: "Festival Classic" },
  ludo: { livePlayers: 420, activeRooms: 54, difficulty: "Casual", rating: 4.9, tag: "Most Played" },
  uno: { livePlayers: 310, activeRooms: 41, difficulty: "Casual", rating: 4.9, tag: "Party Chaos" },
  dotsboxes: { livePlayers: 145, activeRooms: 22, difficulty: "Casual", rating: 4.7, tag: "Maths Period" },
  rps: { livePlayers: 198, activeRooms: 30, difficulty: "Casual", rating: 4.8, tag: "Quick Battle" },
  bingo: { livePlayers: 160, activeRooms: 20, difficulty: "Casual", rating: 4.7, tag: "Full House" },
  snl: { livePlayers: 215, activeRooms: 28, difficulty: "Casual", rating: 4.8, tag: "Snake 99" },
  wordbuilding: { livePlayers: 130, activeRooms: 18, difficulty: "Medium", rating: 4.6, tag: "English Class" },
  stargame: { livePlayers: 175, activeRooms: 24, difficulty: "Casual", rating: 4.8, tag: "Terrace Chit Slap" },
  chess: { livePlayers: 190, activeRooms: 25, difficulty: "Expert", rating: 4.9, tag: "Grandmaster" },
  namesplaceanimal: { livePlayers: 165, activeRooms: 21, difficulty: "Casual", rating: 4.7, tag: "Speed Recall" },
  tambola: { livePlayers: 140, activeRooms: 19, difficulty: "Casual", rating: 4.6, tag: "Wedding Sangeet" },
  samethalu: { livePlayers: 95, activeRooms: 12, difficulty: "Casual", rating: 4.8, tag: "Ammamma Lore" },
  telugucinemalu: { livePlayers: 185, activeRooms: 26, difficulty: "Casual", rating: 4.9, tag: "Tollywood Adda" },
  snake: { livePlayers: 210, activeRooms: 29, difficulty: "Casual", rating: 4.8, tag: "Nokia 3310" },
  blockblast: { livePlayers: 170, activeRooms: 23, difficulty: "Medium", rating: 4.7, tag: "Puzzle Match" },
  bounce: { livePlayers: 1250, activeRooms: 0, difficulty: "Medium", rating: 4.9, tag: "Red Ball Classic" },
  roadrash: { livePlayers: 980, activeRooms: 0, difficulty: "Casual", rating: 4.9, tag: "90s Racer" },
  carrom: { livePlayers: 195, activeRooms: 27, difficulty: "Medium", rating: 4.8, tag: "Striker King" },
  spacewar: { livePlayers: 110, activeRooms: 14, difficulty: "Casual", rating: 4.7, tag: "Laser Retro" },
};

export default function GamesPage() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("bhalyam_wishlist");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

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

  const handleToggleWishlist = (slug: string, title: string) => {
    const next = { ...wishlist, [slug]: !wishlist[slug] };
    setWishlist(next);
    try {
      localStorage.setItem("bhalyam_wishlist", JSON.stringify(next));
    } catch {
      // ignore
    }
    if (next[slug]) {
      showToast(`🔔 You will be notified the instant ${title} is ready!`);
    } else {
      showToast(`Removed ${title} from your wishlist.`);
    }
  };

  // Base list of games
  const rawPlayable = useMemo(() => filterGames(filter, false), [filter]);
  const rawComingSoon = useMemo(() => filterGames(filter).filter(isLocked), [filter]);

  // Apply Search Query filter
  const searchedPlayable = useMemo(() => {
    if (!searchQuery.trim()) return rawPlayable;
    const q = searchQuery.toLowerCase().trim();
    return rawPlayable.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.nostalgiaQuote && g.nostalgiaQuote.toLowerCase().includes(q)) ||
        g.blurb.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        (g.theme && g.theme.toLowerCase().includes(q))
    );
  }, [rawPlayable, searchQuery]);

  // Apply Sorting
  const sortedPlayable = useMemo(() => {
    const list = [...searchedPlayable];
    if (sortBy === "popular") {
      return list.sort((a, b) => (GAME_TELEMETRY[b.slug]?.livePlayers ?? 0) - (GAME_TELEMETRY[a.slug]?.livePlayers ?? 0));
    }
    if (sortBy === "trending") {
      return list.sort((a, b) => (GAME_TELEMETRY[b.slug]?.activeRooms ?? 0) - (GAME_TELEMETRY[a.slug]?.activeRooms ?? 0));
    }
    if (sortBy === "quick") {
      return list.filter((g) => g.duration?.includes("5") || g.duration?.includes("2"));
    }
    if (sortBy === "classroom") {
      return list.filter((g) => g.tags.includes("classroom"));
    }
    if (sortBy === "competitive") {
      return list.filter((g) => g.tags.includes("board") || g.slug === "chess" || g.slug === "rummy");
    }
    return list;
  }, [searchedPlayable, sortBy]);

  // Spotlight Featured game (top played today)
  const spotlightGame = BHALYAM_GAMES.find((g) => g.slug === "handcricket") ?? BHALYAM_GAMES[0];

  return (
    <div className="bhalyam-home bhalyam-paper min-h-screen pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1D2C4A] text-white font-bold text-[13.5px] shadow-2xl border border-amber-400/40 flex items-center gap-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Header ── */}
      <header className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <BhalyamLogo size={44} decorative />
            <span className="flex flex-col leading-none min-w-0">
              <span className="bhalyam-display text-[24px] sm:text-[28px] lg:text-[32px] tracking-tight text-[#2A221B] truncate">
                BHALYAM
              </span>
              <span className="text-[10px] sm:text-[11px] lg:text-[12px] uppercase tracking-[0.18em] font-bold text-[#E95D21] -mt-0.5">
                All Games Hub
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF4E4] border border-[#F2D5A9] text-[#7B2F0E] text-[12px] font-extrabold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>1,284 Players Online</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 bg-[#FCF8EF] border border-[#EEDCC2] text-[#2A221B] font-bold text-[13px] hover:bg-[#F8EEDB] active:translate-y-px shadow-sm transition-colors"
            >
              <ArrowRightIcon className="w-3.5 h-3.5 rotate-180" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 mt-5 sm:mt-7 space-y-7 sm:space-y-9">
        
        {/* ── 1. Personalized Resume & Daily Quests Banner ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Continue Playing Hero Card */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#172033] via-[#101726] to-[#0A0F1A] text-white border border-amber-400/25 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                    CONTINUE PLAYING
                  </span>
                  <span className="text-zinc-300 text-[12px] font-bold">Welcome back, {displayName}!</span>
                </div>
                <h3 className="bhalyam-display text-[24px] sm:text-[28px] text-white mt-1.5 leading-tight">
                  Hand Cricket <span className="text-amber-400">· Level 8</span>
                </h3>
                <p className="text-[13px] text-zinc-300 font-medium mt-0.5">
                  🏆 45 Matches Won · 🔥 3x Win Streak · Next Milestone: <strong className="text-amber-300">Golden Bat in 2 wins</strong>
                </p>
              </div>

              <div className="hidden sm:block text-right flex-shrink-0">
                <div className="text-[11px] font-black text-amber-300">60% to Level 9</div>
                <div className="w-24 h-2 rounded-full bg-white/10 mt-1 overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 w-[60%]" />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3 relative z-10 flex-wrap">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-300">
                <span>⚡ 48 Active Rooms Waiting</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">+50 XP per win</span>
              </div>
              <button
                type="button"
                onClick={() => setSheetGame("handcricket")}
                className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-white font-black text-[13.5px] shadow-[0_4px_14px_rgba(245,158,11,0.4)] transition cursor-pointer flex items-center gap-2"
              >
                <span>▶ Resume Hand Cricket</span>
              </button>
            </div>
          </div>

          {/* Today's Daily Challenges Card */}
          <div className="p-5 rounded-3xl bg-[#FCF8EF] border border-[#E8D8BE] shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h4 className="bhalyam-display text-[17px] text-[#1D2C4A] flex items-center gap-1.5">
                <span>🎯 Today's Quests</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                Day 3
              </span>
            </div>

            <div className="space-y-2 my-2">
              <div className="p-2 rounded-xl bg-white/80 border border-[#E8D8BE] flex items-center justify-between text-[11.5px] font-bold text-[#3D2E24]">
                <span>🏏 Win 1 Hand Cricket Match</span>
                <span className="text-emerald-700 font-black">+100 XP</span>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#E8D8BE] flex items-center justify-between text-[11.5px] font-bold text-[#3D2E24]">
                <span>🎴 Play UNO with 2+ Friends</span>
                <span className="text-emerald-700 font-black">+150 XP</span>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#E8D8BE] flex items-center justify-between text-[11.5px] font-bold text-[#3D2E24]">
                <span>🎲 Roll a 6 in Ludo</span>
                <span className="text-amber-700 font-black">+50 XP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast("🎉 Quest claimed! +100 XP added to your profile.")}
              className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[12px] shadow-sm transition active:scale-95 cursor-pointer text-center"
            >
              Claim Daily +100 XP
            </button>
          </div>
        </section>

        {/* ── 2. Search & Filter / Sort Controls ── */}
        <section className="space-y-4">
          {/* Live Search Input */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 19 games by name, rules, or nostalgia (e.g. cricket, cards, 3310, snakes)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white/95 border border-[#E2D2B8] text-[#1D2C4A] placeholder-zinc-400 font-semibold text-[14px] sm:text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Interactive Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = filter.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilter({ category: cat.id })}
                  className={`px-4 py-2.5 rounded-full font-black text-[13px] whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_3px_12px_rgba(245,158,11,0.45)] scale-102 border border-amber-300/40"
                      : "bg-[#FCF8EF] text-[#4A3C31] hover:bg-[#F5EAD4] border border-[#E8D8BE] hover:text-[#1A120B]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Smart Sort Options Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-[#E8D8BE]/60">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <span className="text-[12px] font-extrabold text-[#7B6E62] mr-1 hidden sm:inline">Sort by:</span>
              {SORT_OPTIONS.map((sort) => {
                const isSelected = sortBy === sort.id;
                return (
                  <button
                    key={sort.id}
                    type="button"
                    onClick={() => setSortBy(sort.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[12px] transition flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-amber-400 text-amber-950 shadow-sm"
                        : "bg-white/60 text-[#5C4D40] hover:bg-white border border-[#E8D8BE]"
                    }`}
                  >
                    <span>{sort.icon}</span>
                    <span>{sort.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[12.5px] font-bold text-[#6E5E4D]" aria-live="polite">
              Showing {sortedPlayable.length} game{sortedPlayable.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        {/* ── 3. Playable Games Discovery Grid ── */}
        {sortedPlayable.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#FCF8EF] border border-[#E8D8BE]">
            <p className="text-[18px] font-black text-[#1D2C4A]">No games found matching "{searchQuery}"</p>
            <p className="text-[13.5px] text-[#6E5E4D] mt-1">Try another keyword or reset the category filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilter({ category: "all" });
              }}
              className="mt-4 px-5 py-2 rounded-full bg-amber-400 text-amber-950 font-black text-[13px] shadow-sm hover:bg-amber-300 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <section className="space-y-4">
            <h2 className="bhalyam-display text-[22px] sm:text-[28px] text-[#1D2C4A] leading-tight">
              <span className="bhalyam-underline">
                {filter.category === "all" ? "Ready To Play Lounge" : categoryById(filter.category)?.label ?? "Featured Games"}
              </span>
            </h2>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {sortedPlayable.map((game) => (
                <li key={game.slug}>
                  <GameDiscoveryCard
                    game={game}
                    onSelect={() => setSheetGame(game.slug)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 4. High-Anticipation Coming Soon & Wishlist Hub ── */}
        {rawComingSoon.length > 0 && (
          <section className="pt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="bhalyam-display text-[22px] sm:text-[28px] text-[#1D2C4A] leading-tight">
                  <span className="bhalyam-underline">Coming Soon · Wishlist</span>
                </h2>
                <p className="text-[13px] font-semibold text-[#6E5E4D] mt-0.5">
                  Over 1,420 players waiting. Tap notify to receive the launch alert.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                ✨ Next Release Batch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {rawComingSoon.map((game) => {
                const isWishlisted = !!wishlist[game.slug];
                const accent = getGameAccent(game);
                const btnFrom = game.btnGradient?.from ?? accent.from;
                const btnTo = game.btnGradient?.to ?? accent.to;

                return (
                  <div
                    key={game.slug}
                    className="p-5 rounded-[26px] text-left flex flex-col justify-between border shadow-xl relative overflow-hidden"
                    style={{
                      background: game.paperBg ?? `linear-gradient(155deg, ${btnFrom}2e 0%, ${btnTo}14 45%, #080B12 100%)`,
                      borderColor: game.paperBorder ?? `${btnFrom}55`,
                      boxShadow: `0 20px 42px -12px rgba(0,0,0,0.85), 0 0 28px -4px ${btnFrom}35`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-300 mb-2">
                        <span>🚀 Next Drop</span>
                        <span className="text-zinc-300">1,250+ Waiting</span>
                      </div>
                      <h3 className="font-display font-black text-[22px] text-white">
                        {game.title}
                      </h3>
                      <p className="font-script italic text-[14px] text-amber-200/90 mt-0.5 line-clamp-1">
                        {game.nostalgiaQuote ?? game.blurb}
                      </p>
                    </div>

                    <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <span className="text-[11.5px] font-bold text-zinc-300">
                        {game.playerRange ?? "Multiplayer"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleWishlist(game.slug, game.title)}
                        className={`py-2 px-4 rounded-xl text-[12.5px] font-black transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                          isWishlisted
                            ? "bg-emerald-500 text-white shadow-md"
                            : "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                        }`}
                      >
                        <span>{isWishlisted ? "✓ Wishlisted" : "🔔 Notify Me"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. School Gang Adda Leaderboard Preview ── */}
        <section className="p-5 sm:p-7 rounded-3xl bg-[#FCF8EF] border border-[#E8D8BE] shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="bhalyam-display text-[20px] sm:text-[24px] text-[#1D2C4A]">
                🏆 School Adda Leaderboard
              </h3>
              <p className="text-[13px] text-[#6E5E4D]">Top school gangs competing in weekly multiplayer tournaments</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-amber-950 w-fit">
              Gold League · Week 32
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8BE] shadow-sm">
              <div className="text-[11px] font-black text-amber-600">🥇 RANK 1</div>
              <div className="text-[14px] font-black text-[#1D2C4A] mt-0.5">KV Titans '08</div>
              <div className="text-[11.5px] text-[#7A6F62]">3,420 Matches Won</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8BE] shadow-sm">
              <div className="text-[11px] font-black text-slate-500">🥈 RANK 2</div>
              <div className="text-[14px] font-black text-[#1D2C4A] mt-0.5">SVKM Backbenchers</div>
              <div className="text-[11.5px] text-[#7A6F62]">2,980 Matches Won</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8BE] shadow-sm">
              <div className="text-[11px] font-black text-amber-800">🥉 RANK 3</div>
              <div className="text-[14px] font-black text-[#1D2C4A] mt-0.5">Loyola Sixers</div>
              <div className="text-[11.5px] text-[#7A6F62]">2,650 Matches Won</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8BE] shadow-sm">
              <div className="text-[11px] font-black text-emerald-600">🎖️ RANK 4</div>
              <div className="text-[14px] font-black text-[#1D2C4A] mt-0.5">DPS Adda Boys</div>
              <div className="text-[11.5px] text-[#7A6F62]">2,410 Matches Won</div>
            </div>
          </div>
        </section>

        {/* ── 6. Bottom Join Room Hero Action ── */}
        <div className="flex flex-col items-center justify-center pt-2">
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="w-full max-w-lg py-3.5 px-8 rounded-full flex items-center justify-center gap-2.5 text-[15px] sm:text-[16px] font-black text-[#3D2506] bg-[#F0BA28] hover:bg-[#E5A817] active:scale-98 transition shadow-[0_6px_18px_rgba(229,168,23,0.38)] border border-[#D99A10] cursor-pointer"
          >
            <span>🚪 Join Room with a code</span>
          </button>
          <p className="text-[12.5px] font-semibold text-[#7A6F62] mt-2">
            Have a 6-character room code from your friends? Tap above to jump in.
          </p>
        </div>

      </main>

      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

/**
 * Rich Game Card with Live Telemetry, Social Proof, and Color-Matched Glacier Tone
 */
function GameDiscoveryCard({
  game,
  onSelect,
}: {
  game: BhalyamGameCard;
  onSelect: () => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const accent = getGameAccent(game);
  const btnFrom = game.btnGradient?.from ?? accent.from;
  const btnTo = game.btnGradient?.to ?? accent.to;
  const btnShadow = game.btnGradient?.shadow ?? accent.to;
  const telemetry = GAME_TELEMETRY[game.slug] ?? { livePlayers: 120, activeRooms: 15, difficulty: "Casual", rating: 4.8, tag: "Classic" };

  const tileArtByGame: Record<BhalyamGameSlug, string> = {
    handcricket: "/HandCricketTile.png",
    snl: "/S&LTile.png",
    ludo: "/LudoTile.png",
    rummy: "/RummyTile.png",
    rps: "/RPSTile.png",
    uno: "/UNOTile.png",
    wordbuilding: "/words_building.png",
    dotsboxes: "/Dots&boxes.png",
    namesplaceanimal: "/Name-place-thing-animal.png",
    tambola: "/Tambola.png",
    samethalu: "/SamethaluTile.png",
    telugucinemalu: "/telugu cinemalu.png",
    stargame: "/StarTile.png",
    bingo: "/Bingo Tile.png",
    snake: "/Snake Game Tile.png",
    bounce: "/Bounce Game Tile.png",
    roadrash: "/Roadrash Game Tile.png",
    carrom: "/Carrom Game Tile.png",
    chess: "/Chess Game Tile.png",
    blockblast: "",
    spacewar: "/SpacewarTile.png",
  };

  const imageSrc = tileArtByGame[game.slug];
  const [imageFailed, setImageFailed] = useState(false);

  const bgStyle = isDark
    ? game.paperBg ?? `linear-gradient(155deg, ${btnFrom}2e 0%, ${btnTo}14 45%, #080B12 100%)`
    : `linear-gradient(155deg, #FFFFFF 0%, ${btnFrom}38 36%, ${btnTo}58 100%)`;

  const borderStyle = isDark
    ? game.paperBorder ?? `${btnFrom}55`
    : `${btnFrom}75`;

  const shadowStyle = isDark
    ? `0 20px 42px -12px rgba(0,0,0,0.85), 0 0 32px -4px ${btnFrom}40, inset 0 1.5px 1.5px rgba(255,255,255,0.22), inset 0 -1px 1px ${btnTo}44`
    : `0 18px 38px -8px ${btnShadow}45, 0 0 28px -4px ${btnFrom}35, inset 0 2px 2px rgba(255,255,255,0.95), inset 0 -2px 4px ${btnTo}35`;

  return (
    <div
      className="group relative w-full rounded-[26px] overflow-hidden text-left p-4 sm:p-5 flex flex-col justify-between border transition-all duration-300 hover:scale-101"
      style={{
        background: bgStyle,
        borderColor: borderStyle,
        boxShadow: shadowStyle,
      }}
    >
      {/* Live Social Proof Badge Row */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-black w-full mb-1">
        <span
          className="px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1"
          style={{
            backgroundColor: isDark ? `${btnFrom}25` : "#FFFFFF",
            color: isDark ? "#FFFFFF" : "#1D2C4A",
            borderColor: `${btnFrom}66`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{telemetry.livePlayers} Live</span>
        </span>
        <div className={`flex items-center gap-1.5 ${isDark ? "text-zinc-300" : "text-[#473B30]"}`}>
          <span className="text-amber-500 font-bold">★ {telemetry.rating}</span>
          <span>•</span>
          <span>{telemetry.difficulty}</span>
        </div>
      </div>

      {/* Hero Illustration Artwork with ambient core glow */}
      <div className="relative my-2 sm:my-3 h-28 sm:h-36 flex items-center justify-center">
        <div
          className={`absolute w-32 h-32 rounded-full blur-3xl pointer-events-none transition-transform duration-500 group-hover:scale-125 ${
            isDark ? "opacity-50" : "opacity-45"
          }`}
          style={{ background: btnFrom }}
          aria-hidden
        />
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={game.title}
            onError={() => setImageFailed(true)}
            className="relative z-10 max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-[24px] ${
            isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#1D2C4A]"
          }`}>
            🎮
          </div>
        )}
      </div>

      {/* Title & Nostalgic Quote */}
      <div className="relative flex flex-col items-center text-center px-1">
        <h3 className={`font-display font-black text-[22px] sm:text-[25px] leading-tight tracking-tight drop-shadow-sm ${
          isDark ? "text-white" : "text-[#0F172A]"
        }`}>
          {game.title}
        </h3>
        <p className={`font-script italic text-[14px] sm:text-[16px] mt-0.5 leading-snug line-clamp-1 ${
          isDark ? "text-amber-200/90" : "text-[#5A250B]"
        }`}>
          {game.nostalgiaQuote ?? game.blurb}
        </p>
      </div>

      {/* Telemetry Row (Player Count & Duration) */}
      <div className={`flex items-center justify-center gap-3 text-[12px] font-bold my-2.5 ${
        isDark ? "text-zinc-300" : "text-[#473B30]"
      }`}>
        <div className="flex items-center gap-1.5">
          <UsersIcon className={`w-3.5 h-3.5 ${isDark ? "text-zinc-400" : "text-[#6E5A4B]"}`} />
          <span>{game.playerRange ?? "2–8 Players"}</span>
        </div>
        <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>•</span>
        <div className="flex items-center gap-1.5">
          <ClockIcon className={`w-3.5 h-3.5 ${isDark ? "text-zinc-400" : "text-[#6E5A4B]"}`} />
          <span>{game.duration ?? "10–20 min"}</span>
        </div>
      </div>

      {/* 3D Glossy Action Button */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-[14px] font-black uppercase tracking-wider text-white hover:brightness-115 active:scale-98 transition-all duration-200 cursor-pointer shadow-md"
        style={{
          background: `linear-gradient(135deg, ${btnFrom}, ${btnTo})`,
          boxShadow: `0 6px 16px -3px ${btnShadow}90, 0 3px 0 0 ${btnShadow}`,
        }}
      >
        <span>Play Now</span>
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
