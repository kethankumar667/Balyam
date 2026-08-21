import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PencilIcon } from "../components/auth/authIcons";
import { findAvatar } from "../lib/avatars";
import { PRIVACY_CONTACT_EMAIL } from "../lib/privacy/contact";
import SelfAvatar from "../components/profile/SelfAvatar";
import SeatAvatar from "../components/profile/SeatAvatar";
import { motion, AnimatePresence } from "framer-motion";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import { RevealOnScroll, RevealItem } from "../components/RevealOnScroll";
import GsapSplitHeadline from "../components/GsapSplitHeadline";
import { useTheme } from "../lib/useTheme";
import GlobalSettings from "../components/GlobalSettings";
import { tileHover, ctaPress, bhalyamSpring } from "../lib/motion";
import { getSocket } from "../lib/socket";
import { formatTimeAgo } from "../lib/formatTimeAgo";
import { usePlayerSnapshot, type PlayerSnapshot } from "../hooks/usePlayerSnapshot";
import CategoryFilter, {
  filterGames,
  type GameFilter,
} from "../components/bhalyam/CategoryFilter";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { WelcomeModal, GettingStartedCard, journeyTracker } from "../features/onboarding";
import AvatarPicker from "../components/profile/AvatarPicker";
import Modal from "../components/Modal";
import {
  BHALYAM_GAMES,
  isLocked,
  getGameAccent,
  type BhalyamGameCard,
  type BhalyamGameSlug,
} from "../components/bhalyam/data";
import {
  Bell,
  BellRing,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home as HomeIcon,
  LayoutGrid,
  Users as UsersLucideIcon,
  Shield,
  Sparkles,
  GraduationCap,
  Flame,
  Zap,
  Play,
  Check,
  X,
  Mail,
  Trophy,
  Gift,
  DoorOpen,
  HelpCircle,
  Moon,
  Sun,
  Sliders,
  Info,
  TrendingUp,
  Clock,
  Heart,
  Pencil,
  ArrowRight,
  Lock,
  Gamepad2,
  LogOut,
} from "lucide-react";
import {
  HandCricketGlyph,
  LudoGlyph,
  RpsGlyph,
  RummyGlyph,
  SnakeLadderGlyph,
  UnoGlyph,
  WordBuildingGlyph,
  DotsBoxesGlyph,
  NamePlaceAnimalGlyph,
  TambolaGlyph,
  GamepadGlyph,
  StarGameGlyph,
  BingoGlyph,
  BlockBlastGlyph,
} from "../components/bhalyam/icons";

/**
 * BHALYAM home — the app's landing surface.
 *
 * Intentionally spartan. Only contains UI that wires to a working backend
 * flow: header, BALU greeting, the game tiles, and a footer. Tapping
 * a tile opens the GameRoomSheet which carries the full Lobby-equivalent
 * flow (name input + per-game options + Create Room + Join by Code).
 *
 * Future sections (daily rewards, badges, friends online, recently played,
 * tournaments) are deliberately NOT here yet — they were mocked previously
 * and removed during the cleanup pass. Add them back as each backing
 * feature ships.
 *
 * Single responsive page rather than mobile/desktop split; with this much
 * content the split was overhead with no payoff.
 */

import AppLayout from "../components/layout/AppLayout";
import WhatAreWePlayingSection from "../components/bhalyam/WhatAreWePlayingSection";

const GAME_GLYPHS: Record<BhalyamGameSlug, React.ComponentType<{ className?: string }>> = {
  handcricket: HandCricketGlyph,
  snl: SnakeLadderGlyph,
  ludo: LudoGlyph,
  rummy: RummyGlyph,
  rps: RpsGlyph,
  uno: UnoGlyph,
  wordbuilding: WordBuildingGlyph,
  dotsboxes: DotsBoxesGlyph,
  namesplaceanimal: NamePlaceAnimalGlyph,
  tambola: TambolaGlyph,
  stargame: StarGameGlyph,
  bingo: BingoGlyph,
  snake: StarGameGlyph,
  carrom: StarGameGlyph,
  roadrash: StarGameGlyph,
  brickblocks: BlockBlastGlyph,
  tetris: BlockBlastGlyph,
  breakout: StarGameGlyph,
  chess: StarGameGlyph,
  spacewar: StarGameGlyph,
  nokiacricket: HandCricketGlyph,
};

export default function BhalyamHome() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    return !journeyTracker.getState().hasCompletedWelcome;
  });
  const [showGettingStarted, setShowGettingStarted] = useState(true);
  const isMember = useAuthStore((s) => s.isMember);
  // Guests get the honest "Guest Mode" branch in WelcomePlayerStrip and never
  // reach PlayerJourneyDashboard's member content, so there is nothing for
  // this fetch to back for them — `enabled: false` until the caller is a
  // member, one fetch shared by both surfaces instead of two.
  const playerSnapshot = usePlayerSnapshot(isMember);

  // Warm the socket connection on landing so the first room create/join
  // doesn't pay the cold WebSocket handshake at click time
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <AppLayout onSelectGame={setSheetGame}>
      <div className="bhalyam-home bhalyam-font min-h-full bhalyam-paper flex flex-col">
        <div className="mx-auto w-full max-w-[1100px] px-3 sm:px-6 py-4 pb-12 flex-1">
          <Hero
            onPlayFeatured={() => setSheetGame("uno")}
            onOpenJoin={() => setJoinOpen(true)}
          />
          <PlayYourWaySection
            onPlayFriends={() => setJoinOpen(true)}
            onPlayBots={() => {
              const gamesElem = document.getElementById("games-section");
              if (gamesElem) gamesElem.scrollIntoView({ behavior: "smooth" });
            }}
          />
          {showGettingStarted && (
            <GettingStartedCard
              className="mb-6"
              onDismiss={() => setShowGettingStarted(false)}
            />
          )}
          <div id="games-section">
            <GamesSection onSelect={setSheetGame} />
          </div>
          <WhatAreWePlayingSection
            onSelectGame={setSheetGame}
            onOpenCreateRoom={() => setJoinOpen(true)}
          />
          <PlayerJourneyDashboard onSelect={setSheetGame} snapshot={playerSnapshot} />
          <Footer />
        </div>
        <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
        <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
        <WelcomeModal
          open={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
          onStartQuest={() => setSheetGame("uno")}
        />
      </div>
    </AppLayout>
  );
}

function PlayYourWaySection({
  onPlayFriends,
  onPlayBots,
}: {
  onPlayFriends: () => void;
  onPlayBots: () => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="mb-5 sm:mb-6">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#7B2F0E] dark:text-amber-400">
          ✦ PLAY YOUR WAY ✦
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Play with Friends */}
        <button
          type="button"
          onClick={onPlayFriends}
          className={`p-4 rounded-2xl sm:rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition active:scale-[0.99] cursor-pointer group ${
            isDark
              ? "bg-[#0E1526] border-white/10 hover:border-amber-500/40"
              : "bg-[#FCF8EF] border-[#E8D8BE] hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <UsersLucideIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-[15px] font-black tracking-tight ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                Play with Friends
              </h3>
              <p className="text-xs font-medium text-[#6B5E52] dark:text-zinc-400 mt-0.5 truncate">
                Join or host a multiplayer lounge table
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0 font-mono">
            Join Room →
          </span>
        </button>

        {/* 2. Play with Bots */}
        <button
          type="button"
          onClick={onPlayBots}
          className={`p-4 rounded-2xl sm:rounded-3xl border text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition active:scale-[0.99] cursor-pointer group ${
            isDark
              ? "bg-[#0E1526] border-white/10 hover:border-emerald-500/40"
              : "bg-[#FCF8EF] border-[#E8D8BE] hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-[15px] font-black tracking-tight ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                Play with Bots
              </h3>
              <p className="text-xs font-medium text-[#6B5E52] dark:text-zinc-400 mt-0.5 truncate">
                Solo instant play against smart AI
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
            Choose Game →
          </span>
        </button>
      </div>
    </section>
  );
}



function TrophyProgressionStrip() {
  const trophies = [
    { title: "Backbench Champion", desc: "10 Hand Cricket Matches", unlocked: true },
    { title: "Uno Wildcard King", desc: "Declared UNO 5 Times", unlocked: true },
    { title: "Sixer Legend", desc: "Rolled 6 in Ludo Under Pressure", unlocked: true },
    { title: "Box Master", desc: "Claimed 25 Dots & Boxes Squares", unlocked: false },
  ];

  return (
    <section className="my-8 p-4 sm:p-6 rounded-3xl bg-[#101726] text-white border border-white/15 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="bhalyam-display text-[18px] sm:text-[22px] text-amber-300 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Nostalgia Trophy Cabinet
          </h3>
          <p className="text-[13px] text-zinc-300">Unlock childhood badges as you play with friends</p>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit">
          Level 12 • Gold Tier
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {trophies.map((t) => (
          <div
            key={t.title}
            className={`p-3 rounded-2xl border ${
              t.unlocked
                ? "bg-[#18233A] border-amber-400/40 shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                : "bg-white/5 border-white/10 opacity-60"
            }`}
          >
            <div className="text-[13px] font-black text-amber-200 truncate">{t.title}</div>
            <div className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1">{t.desc}</div>
            <div className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
              {t.unlocked ? "✓ Unlocked (+50 XP)" : "🔒 In Progress"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero({
  onPlayFeatured,
  onOpenJoin,
}: {
  onPlayFeatured?: () => void;
  onOpenJoin: () => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [theme]);

  const heroImage = isDark
    ? (failed ? "/bhalyam-hero.png" : "/bhalyam-dark-hero.png")
    : (failed ? "/bhalyam-hero.png" : "/bhalyam-hero-clean.png");

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      "Hey! Let's play nostalgic 90's Indian multiplayer games together on BHALYAM (UNO, Ludo, Hand Cricket & more)! Join me here: " + window.location.origin
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <RevealOnScroll as="section" amount={0.05} className="pt-2 pb-6 sm:pt-4 sm:pb-8">
      {/* ── Clip layer: owns border-radius + overflow-hidden, NO transforms ── */}
      <div className={`rounded-[26px] sm:rounded-[36px] overflow-hidden border ${
        isDark
          ? "border-slate-800 shadow-[0_14px_30px_-15px_rgba(0,0,0,0.7)]"
          : "border-[#E2D3BA] shadow-[0_14px_30px_-15px_rgba(74,44,22,0.35)]"
      }`}>
        {/* ── Main Hero Card ── */}
        <div
          className="relative"
          style={{ background: isDark ? "#0A0F1D" : "#FAF2DF" }}
        >
          <img
            key={heroImage}
            src={heroImage}
            alt="Childhood games lounge"
            className="bhalyam-hero-drift absolute inset-0 w-full h-full object-cover object-right opacity-95"
            loading="eager"
            onError={() => setFailed(true)}
          />
          {/* Soft linear fade on left half to keep text readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? "linear-gradient(90deg, rgba(10,15,29,0.98) 0%, rgba(10,15,29,0.92) 42%, rgba(10,15,29,0.55) 65%, rgba(10,15,29,0.05) 95%)"
                : "linear-gradient(90deg, rgba(254,249,235,0.98) 0%, rgba(254,249,235,0.94) 42%, rgba(254,249,235,0.55) 65%, rgba(254,249,235,0.05) 95%)",
            }}
          />

          <div className="relative z-10 px-5 sm:px-10 py-7 sm:py-9 max-w-xl">
            {/* Top Label */}
            <span
              className={`text-xs sm:text-[13px] font-black uppercase tracking-[0.22em] block mb-2 sm:mb-2.5 ${
                isDark ? "text-amber-400" : "text-[#7B2F0E]"
              }`}
            >
              ✦ WELCOME TO BHALYAM ✦
            </span>

            {/* Headline with 4 lines & color coding */}
            <h1
              className={`bhalyam-display text-[32px] sm:text-[46px] lg:text-[54px] leading-[1.04] tracking-tight flex flex-col ${
                isDark ? "text-white" : "text-[#15294E]"
              }`}
            >
              <span>Ready to</span>
              <span className="text-[#A855F7] w-fit">
                relive
              </span>
              <span>your</span>
              <span className={isDark ? "text-[#10B981]" : "text-[#15803D]"}>childhood?</span>
            </h1>

            {/* Description (Hidden on mobile screens only) */}
            <p
              className={`hidden sm:block text-[14px] sm:text-base font-semibold max-w-sm sm:max-w-md mt-3 leading-snug ${
                isDark ? "text-slate-300" : "text-[#3B332A]"
              }`}
            >
              Pick a game, send the room code to your school WhatsApp group, and play instantly.
            </p>
            <p
              className={`hidden sm:block font-script italic text-[17px] sm:text-[20px] mt-1 ${
                isDark ? "text-amber-300" : "text-[#7B2F0E]"
              }`}
            >
              Bring your school gang back together!
            </p>

            {/* Primary Action Button inside Hero Card */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                type="button"
                onClick={onOpenJoin}
                className="w-full sm:w-auto py-3.5 px-6 sm:px-8 rounded-full flex items-center justify-center gap-2.5 font-black text-[15px] sm:text-[16px] bg-[#F59E0B] hover:bg-[#D97706] text-stone-950 shadow-lg active:scale-95 transition cursor-pointer flex-shrink-0 min-h-[48px]"
              >
                <DoorOpen className="w-5 h-5 text-stone-950" />
                <span>Join Room with a code</span>
              </button>
              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-[#6E5D4E]"}`}>
                Have a 6-letter code or invite link? Tap to enter.
              </span>
            </div>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );

}

/** Tiles the home grid shows before deferring to /games. */
const HOME_TILE_CAP = 6;

function GamesSection({ onSelect }: { onSelect: (slug: BhalyamGameSlug) => void }) {
  const [filter, setFilter] = useState<GameFilter>({ category: "all" });
  const matches = filterGames(filter, false);
  const shown = matches.slice(0, HOME_TILE_CAP);
  const filtered = filter.category !== "all";

  return (
    <section className="pb-12 sm:pb-14">
      <RevealOnScroll
        as="header"
        className="mb-3 sm:mb-4 flex items-end justify-between gap-2 sm:gap-3 flex-wrap"
      >
        <div className="min-w-0">
          <h2 className="bhalyam-display text-[#1D2C4A] leading-tight"
              style={{ fontSize: "clamp(24px, 6.5vw, 44px)" }}>
            <span className="bhalyam-underline">Pick a game</span>
          </h2>
        </div>
        {!filtered && (
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...bhalyamSpring, delay: 0.15 }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-bold bg-[#FFF4E4] text-[#C04A19] border border-[#F2D5A9] shadow-[0_4px_10px_-3px_rgba(234,90,31,0.45)] flex-shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA5A1F] animate-pulse" aria-hidden />
            Most Played Today
          </motion.span>
        )}
      </RevealOnScroll>

      <CategoryFilter
        value={filter}
        onChange={setFilter}
        className="mb-3 sm:mb-4"
      />

      <p
        className="mb-3 sm:mb-4 text-[13px] font-semibold text-[#5D4B3F]"
        aria-live="polite"
      >
        {matches.length === 0
          ? "Nothing here yet. Try another filter."
          : shown.length < matches.length
          ? `Showing ${shown.length} of ${matches.length} games.`
          : `${matches.length} game${matches.length === 1 ? "" : "s"}.`}
      </p>

      <RevealOnScroll
        key={filter.category}
        as="ul"
        staggerChildren
        amount={0.08}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none"
      >
        {/* `as="li"` rather than an inner `<li>`: the wrapper carries the
            stagger variants, so it must BE the list item — an inner `<li>`
            produced ul > div > li and orphaned every tile. */}
        {shown.map((game) => (
          <RevealItem as="li" key={game.slug}>
            <GameTile
              game={game}
              onSelect={() => onSelect(game.slug)}
              compact
            />
          </RevealItem>
        ))}
      </RevealOnScroll>

      {/* "View all games" overflow link */}
      <div className="mt-4 sm:mt-5 flex justify-center">
        <Link
          to={filtered ? `/games?c=${filter.category}` : "/games"}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5
                     bg-[#FCF8EF] border border-[#EEDCC2] text-[#2A221B] font-extrabold text-[14px]
                     hover:bg-[#F8EEDB] active:translate-y-px
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     shadow-[0_4px_10px_-3px_rgba(74,44,22,0.35)]
                     transition-colors duration-200"
        >
          {filtered ? "View all in this filter" : "View all games"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* The old floating DesktopThemeToggle was removed — theme switching now
 * lives inside MenuSheet as a single source of truth across all
 * breakpoints, so the chrome stays calm everywhere. `useTheme` itself is
 * still imported by MenuSheet, so the system survives intact. */

/* ───────────────────────────── Header ─────────────────────────────
 *
 * Unified layout across mobile, tablet, and desktop:
 *
 *   Row 1 — Logo + "BHALYAM / Relive Childhood" on the LEFT,
 *           Profile icon + Hamburger icon on the RIGHT.
 *   Row 2 — Join Room CTA. Mobile: full-width pill. Tablet/Desktop:
 *           a centred medium-width pill with a "How to play" link beside it.
 *
 * Both Profile and Menu open as right-side slide-in sheets at every
 * breakpoint — desktop users get the same focused-dialog experience as
 * phone users instead of the old crowded top bar with five separate
 * widgets. Online stats / How to Play / theme toggle / About all live in
 * the MenuSheet so the chrome stays calm at every screen size. */

export interface NotificationItem {
  id: string;
  type: "invite" | "reward" | "gang" | "trophy";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  gameSlug?: BhalyamGameSlug;
  roomCode?: string;
}

/**
 * Sample notifications, one of each `NotificationItem["type"]`, seeded at
 * explicit request for design/dev reference while the profile-sheet
 * notifications view is being built out — there is still no backend that
 * produces real ones. This reverses an earlier deliberate decision to ship
 * this list empty (a fabricated invite/reward/friend-score used to render
 * here for every player, "real news" that was never real); that concern
 * still applies the moment this ships to actual users, so swap this back to
 * an empty array — or a real feed — before release. `ProfileSheet`'s
 * notifications view already renders an honest empty state
 * ("You're all caught up!") for that case.
 */
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "sample-invite-1",
    type: "invite",
    title: "Priya invited you to a Rummy table",
    desc: "Room ANNA42 · 3 of 4 seats filled",
    time: "2m ago",
    unread: true,
    gameSlug: "rummy",
    roomCode: "ANNA42",
  },
  {
    id: "sample-reward-1",
    type: "reward",
    title: "Daily streak bonus unlocked",
    desc: "3-day streak — claim your bonus XP",
    time: "1h ago",
    unread: true,
  },
  {
    id: "sample-gang-1",
    type: "gang",
    title: "Arjun joined your gang",
    desc: "Your friend circle now has 5 members",
    time: "5h ago",
    unread: false,
  },
  {
    id: "sample-trophy-1",
    type: "trophy",
    title: "New personal best in Hand Cricket",
    desc: "You scored 86 runs against the bot",
    time: "Yesterday",
    unread: false,
    gameSlug: "handcricket",
  },
];

function Header({ onOpenJoin }: { onOpenJoin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialView, setProfileInitialView] = useState<"profile" | "notifications">("profile");
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const navigate = useNavigate();
  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "monica";
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className={`w-full border-b transition-colors ${
        isDark
          ? "bg-[#070B14] border-white/10"
          : "bg-[#FAF3E0] border-[#ECD9BA]/70"
      }`}>
        <div className="mx-auto w-full max-w-[1100px] px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group flex-shrink-0">
            <BhalyamLogo size={36} decorative />
            <span className="flex flex-col leading-none min-w-0">
              <span className={`bhalyam-display text-[19px] sm:text-[24px] lg:text-[26px] tracking-tight truncate ${isDark ? "text-white" : "text-[#2A221B]"}`}>
                BHALYAM
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] font-extrabold text-[#FF8F00] -mt-0.5">
                Relive Childhood
              </span>
            </span>
          </Link>

          {/* Right Action Stack */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Profile Button (Avatar + Name on desktop / Avatar on mobile + Caret) -> Opens Profile functionality.
                Notifications live inside that sheet now instead of a standalone bell,
                so the unread count surfaces here as a small badge on the avatar. */}
            <button
              type="button"
              onClick={() => {
                setProfileInitialView("profile");
                setProfileOpen(true);
              }}
              className={`relative h-9 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 rounded-full border transition hover:scale-102 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0D1426] border-[#1E2945] text-white hover:bg-[#141E38]"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:bg-[#F2E4CB]"
              }`}
            >
              <div className="relative w-6 h-6 min-w-[24px] min-h-[24px] rounded-full overflow-hidden border border-amber-400 flex items-center justify-center flex-shrink-0">
                <SelfAvatar
                  className="w-full h-full"
                  fallback={<UserIcon className="w-4 h-4 text-amber-500" />}
                />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="hidden sm:inline text-[13px] font-bold tracking-tight max-w-[90px] truncate">
                {displayName}!
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* 3. Settings / Menu Button -> right after player name, opens MenuSheet */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open settings"
              title="Settings"
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border flex items-center justify-center transition hover:scale-105 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0D1426] border-[#1E2945] text-zinc-200 hover:text-amber-400 hover:bg-[#141E38]"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:text-amber-700 hover:bg-[#F2E4CB]"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenJoin={() => {
          setMenuOpen(false);
          onOpenJoin();
        }}
      />

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        notifications={notifications}
        onUpdateNotifications={setNotifications}
        initialView={profileInitialView}
        onOpenJoin={() => {
          setProfileOpen(false);
          onOpenJoin();
        }}
      />
    </>
  );
}

/* ── Join Room row — sits BELOW the hero image so the hero stays a
 *    pure visual anchor and the page's main CTA reads as the entry
 *    point to the games. Centred at every breakpoint with width caps.
 */

function HeroJoinRoomRow({ onOpenJoin }: { onOpenJoin: () => void }) {
  return (
    <RevealOnScroll
      as="div"
      amount={0.2}
      className="-mt-2 mb-6 sm:mb-8 flex justify-center"
    >
      <div className="w-full sm:max-w-[480px] lg:max-w-[560px]">
        <FullWidthJoinRoomButton onClick={onOpenJoin} />
      </div>
    </RevealOnScroll>
  );
}

function FullWidthJoinRoomButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={ctaPress}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      transition={bhalyamSpring}
      aria-label="Join a room with a code"
      className="w-full h-14 px-6 rounded-full inline-flex items-center justify-center gap-2.5 cursor-pointer
                 bhalyam-gold-leaf bhalyam-cta-shine text-bhalyam-wood-dark font-extrabold text-[16px]
                 border border-bhalyam-gold-dark
                 hover:brightness-[1.04]
                 focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70 focus:ring-offset-2 focus:ring-offset-bhalyam-cream-soft
                 shadow-[0_8px_18px_-4px_rgba(228,177,40,0.65)]
                 transition-[filter,box-shadow] duration-200"
    >
      <DoorPlusIcon className="w-5 h-5" />
      <span>Join Room with a code</span>
    </motion.button>
  );
}

/* ── Small round icon button — used for Profile + Hamburger ── */

function IconCircleButton({
  icon,
  label,
  onClick,
  /** Let the icon fill the circle edge to edge — used for avatar images. */
  fill = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  fill?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={ctaPress}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      transition={bhalyamSpring}
      aria-label={label}
      title={label}
      className={`w-11 h-11 rounded-full inline-flex items-center justify-center cursor-pointer
                 bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm text-[#2A221B]
                 ${fill ? "overflow-hidden p-0" : ""}
                 hover:bg-[#F8EEDB]
                 focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                 transition-colors duration-200`}
    >
      {icon}
    </motion.button>
  );
}

function HamburgerGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </svg>
  );
}

function UserGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" />
    </svg>
  );
}

/* ─────────────────── Sheet primitives + two dialogs ───────────────────
 *
 * `SheetShell` factors out the common chrome (scrim, slide-in spring, ESC
 * close, body-scroll lock, header bar with logo+close, scrollable body).
 * `ProfileSheet` and `MenuSheet` each compose it with their own content —
 * different dialogs, same animation language. */

function SheetShell({
  open,
  onClose,
  ariaLabel,
  children,
  titleLeft,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  titleLeft: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            /* `auth-shell` brings the token set that flips panel AND ink
               together. Without it the dark tuning forced this panel light
               while the inherited ink stayed light too — cream on cream,
               measured at 1.04:1. */
            className="auth-shell fixed top-0 right-0 bottom-0 z-[71] w-[86vw] max-w-[380px] sm:max-w-[420px]
                       bg-[var(--auth-card)] border-l border-[var(--auth-card-edge)]
                       text-[var(--auth-ink)] shadow-[-12px_0_36px_-12px_rgba(0,0,0,0.55)]
                       flex flex-col"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 18px)" }}
          >
            <div className="flex items-center justify-between px-5 pb-4 border-b border-[var(--auth-card-edge)]">
              <div className="flex items-center gap-2 min-w-0">{titleLeft}</div>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.92 }}
                aria-label="Close"
                className="w-10 h-10 rounded-full inline-flex items-center justify-center
                           bg-[var(--auth-field)] border border-[var(--auth-card-edge)]
                           text-[var(--auth-ink)] flex-shrink-0 cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {children}
            </div>
            <div className="px-5 py-4 border-t border-[#E8D8BE] text-[11px] text-[#7B5024] flex items-center justify-between">
              <span className="font-semibold">© {new Date().getFullYear()} BHALYAM</span>
              <span className="font-semibold">v1.0</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * GuestProfileModal — Unified Edit Profile modal matching the JoinRoomModal design.
 * Collects name and avatar in a single, polished dialog.
 */
export function GuestProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { playerName, avatarId, setPlayerName, setAvatarId } = useRoomStore();
  const [draftName, setDraftName] = useState(playerName);
  const [draftAvatarId, setDraftAvatarId] = useState<string | null>(avatarId);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftName(playerName);
      setDraftAvatarId(avatarId);
      setNameError(null);
    }
  }, [open, playerName, avatarId]);

  if (!open) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draftName.trim().slice(0, 20);
    setPlayerName(clean);
    setAvatarId(draftAvatarId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobileSheet
      ariaLabelledBy="guest-profile-modal-title"
      className="animate-fade-in"
      panelClassName="bhalyam-font relative w-full md:max-w-sm
                 max-h-[92dvh] overflow-hidden flex flex-col
                 bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                 border-2 border-bhalyam-cream-edge/70 dark:border-slate-800
                 rounded-t-3xl md:rounded-3xl
                 shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                 md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
      panelStyle={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Pull handle (mobile bottom-sheet only) */}
      <div className="md:hidden flex justify-center pt-2">
        <span aria-hidden className="w-8 h-1 rounded-full bg-bhalyam-wood/30 dark:bg-slate-700" />
      </div>

      {/* Header — compact, always visible */}
      <header className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b border-bhalyam-cream-edge/50 dark:border-slate-800">
        <span
          className="inline-flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #EA5A1F, #B53917)",
            boxShadow: "0 4px 10px -3px #B5391766",
          }}
          aria-hidden
        >
          <UserIcon className="w-4.5 h-4.5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="guest-profile-modal-title"
            className="font-bold text-bhalyam-wood-dark dark:text-slate-100 text-base leading-tight truncate"
          >
            Player Profile
          </h2>
          <div className="text-[9px] uppercase tracking-widest font-bold text-bhalyam-wood/70 dark:text-slate-500">
            Nickname &amp; avatar
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full inline-flex items-center justify-center
                     bg-bhalyam-cream-warm dark:bg-[#1E2738] text-bhalyam-wood-dark dark:text-slate-200 cursor-pointer
                     hover:bg-bhalyam-cream-edge dark:hover:bg-[#2A374F] active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                     transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Body Form — only this area scrolls if content overflows */}
      <form
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Name input field */}
        <div className="space-y-1">
          <label
            htmlFor="guest-profile-name"
            className="block text-[10px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400"
          >
            Your Name
          </label>
          <input
            id="guest-profile-name"
            type="text"
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. Sri Krishna"
            maxLength={20}
            autoComplete="given-name"
            className="w-full h-10 px-3 rounded-xl
                       bg-bhalyam-cream-soft dark:bg-[var(--surface-0)] border-2
                       border-bhalyam-cream-edge/80 dark:border-slate-700/80
                       text-bhalyam-wood-dark dark:text-slate-100 placeholder:text-bhalyam-wood-dark/40 dark:placeholder:text-slate-500
                       font-bold text-sm
                       focus:outline-none focus:ring-2 focus:border-bhalyam-gold-dark dark:focus:border-amber-400 focus:ring-bhalyam-gold/40
                       transition-all duration-200 shadow-xs"
          />
        </div>

        {/* Avatar Picker section */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400">
            Choose Avatar
          </label>
          <AvatarPicker
            value={draftAvatarId}
            onChange={(id) => setDraftAvatarId(id)}
            hideSummary={true}
            isGuest={true}
          />
        </div>

        {/* Save CTA */}
        <div className="pt-1">
          <button
            type="submit"
            className="w-full h-11 rounded-2xl
                       bhalyam-gold-leaf bhalyam-cta-shine
                       border border-bhalyam-gold-dark text-bhalyam-wood-dark
                       font-black text-sm inline-flex items-center justify-center gap-2
                       hover:brightness-[1.04] shadow-[0_6px_14px_-4px_rgba(228,177,40,0.55)]
                       active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark
                       transition-[filter,box-shadow,transform] duration-200 cursor-pointer"
          >
            <span>Save Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Profile sheet — the one right-side panel for everything about "you":
 * the profile card itself, and (migrated in from the old standalone
 * bell-triggered sheet) notifications. `view` toggles between the two
 * bodies inside the same SheetShell so it reads as one panel with a
 * drill-in, not two different dialogs. `initialView` lets a caller (the
 * header bell) open straight into the notifications pane while the
 * profile avatar chip opens to the profile card as before.
 */
export function ProfileSheet({
  open,
  onClose,
  notifications,
  onUpdateNotifications,
  onOpenJoin,
  initialView = "profile",
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onOpenJoin: () => void;
  initialView?: "profile" | "notifications";
}) {
  const { playerName, avatarId } = useRoomStore();
  const avatar = findAvatar(avatarId);
  const named = playerName.trim().length > 0;
  const signedIn = useAuthStore((s) => s.isMember);
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [showEditModal, setShowEditModal] = useState(false);
  const [view, setView] = useState<"profile" | "notifications">(initialView);

  // Land on whichever view opened the sheet, every time it opens — the
  // bell wants straight to notifications, the avatar chip wants the
  // profile card. Both are the same panel now, just a different page of it.
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (view === "notifications") {
    return (
      <SheetShell
        open={open}
        onClose={onClose}
        ariaLabel="Notifications"
        titleLeft={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setView("profile")}
              aria-label="Back to profile"
              title="Back to profile"
              className="w-8 h-8 -ml-1.5 rounded-full inline-flex items-center justify-center cursor-pointer
                         text-[var(--auth-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Bell className="w-5 h-5 text-amber-500" />
            <span className="bhalyam-display text-[20px] text-[var(--auth-ink)] tracking-tight">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-500 text-white shadow-xs">
                {unreadCount} New
              </span>
            )}
          </div>
        }
      >
        <NotificationsPanelBody
          notifications={notifications}
          onUpdateNotifications={onUpdateNotifications}
          onClose={onClose}
          onOpenJoin={onOpenJoin}
          isDark={isDark}
        />
      </SheetShell>
    );
  }

  return (
    <>
      <SheetShell
        open={open}
        onClose={onClose}
        ariaLabel="Your profile"
        titleLeft={
          <>
            <UserIcon className="w-5 h-5 text-[var(--auth-ink)]" />
            <span className="bhalyam-display text-[20px] text-[var(--auth-ink)] tracking-tight">
              Profile
            </span>
          </>
        }
      >
        {/* Single unified interactive profile card */}
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="w-full group relative rounded-2xl p-5 border-2 border-[#E0AE3B] bg-gradient-to-br from-[#FFF7E2] to-[#FBE7BD]
                     shadow-[0_4px_14px_-6px_rgba(228,177,40,0.55)] text-center cursor-pointer hover:border-[#D49E24]
                     hover:shadow-[0_8px_20px_-6px_rgba(228,177,40,0.7)] active:scale-[0.99] transition-all duration-200"
        >
          {/* Avatar with edit pencil badge */}
          <div className="relative mx-auto w-20 h-20 mb-3">
            <div
              className="w-20 h-20 rounded-full overflow-hidden
                         ring-4 ring-[#FBE7BD] border-2 border-[#D49E24]
                         shadow-[0_6px_20px_rgba(212,158,36,0.45),inset_0_2px_4px_rgba(0,0,0,0.15)]
                         flex items-center justify-center text-bhalyam-wood-dark bg-[#FFF8E7]
                         group-hover:scale-105 transition-transform duration-150"
            >
              <SeatAvatar
                avatar={avatarId ?? undefined}
                name={playerName.trim() || (signedIn ? "Member" : "Guest")}
                className="w-full h-full"
                textClassName="text-2xl font-black"
              />
            </div>
            <span
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full inline-flex items-center
                         justify-center bg-[#FFFDF8] text-[#5C3717]
                         ring-2 ring-[#FFF7E2] border-2 border-[#D49E24]
                         shadow-[0_3px_8px_rgba(92,55,23,0.35)]
                         group-hover:bg-[#FFF4DE] group-hover:scale-105 transition-all duration-150"
            >
              <Pencil className="w-4 h-4 text-[#5C3717]" />
            </span>
          </div>

          {/* Name Display */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="bhalyam-display text-[var(--auth-ink)] text-[22px] leading-tight break-words group-hover:text-[#8C531B] transition-colors">
              {named ? playerName : "Add your name"}
            </span>
          </div>

          <p className="mt-1 text-[13px] font-semibold text-[var(--auth-accent)]">
            {signedIn ? "Signed in" : "Playing as a guest"}
          </p>

          <p className="bhalyam-script text-[var(--auth-accent)] text-[17px] leading-[1.15] mt-2.5">
            Tap to customize your name &amp; avatar
          </p>
        </button>

        {/* Edit Profile Modal (matches JoinRoomModal design) */}
        <GuestProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
        />

        {/* Notifications — migrated in from the old standalone bell sheet.
            Lives as a drill-in row here instead of its own dialog; the
            badge is the same "number/dot" unread signal the header bell
            used to carry alone. */}
        <motion.button
          type="button"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={bhalyamSpring}
          onClick={() => setView("notifications")}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left cursor-pointer
                     bg-white border border-[#E8D8BE] hover:bg-[#FFF8EE]
                     focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60"
        >
          <span className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFF8EE] text-[#2A221B] border border-[#E8D8BE]">
            {unreadCount > 0 ? (
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -12, 10, -6, 0] }}
                transition={{ duration: 0.6, ease: "easeInOut", delay: 0.15 }}
              >
                <BellRing className="w-5 h-5 text-amber-500" />
              </motion.span>
            ) : (
              <Bell className="w-5 h-5 text-[#7B5024]" />
            )}
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="profile-notif-badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={bhalyamSpring}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs ring-2 ring-white"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-[15px] leading-tight text-[#2A221B]">
              Notifications
            </span>
            <span className="block text-[11px] mt-0.5 font-semibold text-[#7B5024]">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#7B5024] flex-shrink-0" />
        </motion.button>

      {signedIn ? (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 border border-[#E8D8BE] bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#7B5024]">
                Your Membership
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black">
                Active Member
              </span>
            </div>
            <Link
              to="/profile"
              onClick={onClose}
              className="w-full h-11 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                         font-extrabold text-sm inline-flex items-center justify-center gap-2
                         hover:bg-[#F8EEDB] active:scale-[0.99]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                         transition-[background-color,transform] duration-200"
            >
              <UserIcon className="w-4 h-4" />
              Account &amp; settings
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              useAuthStore.getState().signOut();
            }}
            className="w-full h-11 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700
                       font-extrabold text-sm inline-flex items-center justify-center gap-2
                       active:scale-[0.99] transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Sign out / Log out</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Link
            to="/signup?from=profile"
            onClick={onClose}
            className="w-full h-12 rounded-full bhalyam-gold-leaf bhalyam-cta-shine
                       border border-bhalyam-gold-dark text-bhalyam-wood-dark
                       font-extrabold text-[14px] inline-flex items-center justify-center gap-2
                       hover:brightness-[1.04] shadow-[0_8px_18px_-6px_rgba(228,177,40,0.6)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[filter,box-shadow] duration-200"
          >
            <UserIcon className="w-4 h-4" />
            Create a free account
          </Link>
          <Link
            to="/login"
            onClick={onClose}
            className="w-full h-12 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                       font-extrabold text-[14px] inline-flex items-center justify-center gap-2
                       hover:bg-[#F8EEDB] active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[background-color,transform] duration-200"
          >
            Sign in
          </Link>
          <p className="text-center text-xs leading-relaxed text-[var(--auth-ink-soft)]">
            Guests play every game against bots and join any room they&apos;re invited to.
            An account is for opening your own.
          </p>
        </div>
      )}
    </SheetShell>
    </>
  );
}

/**
 * Menu sheet — navigation only. Join Room, How to Play, theme toggle,
 * About, Sign out.
 */
export function MenuSheet({
  open,
  onClose,
  onOpenJoin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenJoin: () => void;
}) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const isMember = useAuthStore((s) => s.isMember);
  const email = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      ariaLabel="BHALYAM menu"
      titleLeft={
        <>
          <BhalyamLogo size={32} decorative />
          <span className="bhalyam-display text-[20px] text-[#2A221B] tracking-tight">
            Menu
          </span>
        </>
      }
    >
      {/*
        A "132 players online right now / Most are on Hand Cricket and
        Snakes & Ladders" presence card used to sit here — a static literal
        with a pulsing green dot, same fabricated-telemetry pattern as the
        removed LiveLoungePulse section (TRUST-REMEDIATION-REPORT.md row 12).
        `/health` exposes a real `socketCount`, but it is an ops uptime
        endpoint, not a product API, and using it here would be the exact
        inconsistency this pass exists to remove: treating one "players
        online" claim as fabrication and its twin as fine because it happens
        to resolve to a real-looking number. Removed rather than wired, for
        the same reason its sibling was.
      */}

      <nav className="flex flex-col gap-2" aria-label="Menu actions">
        <SheetAction
          label="Join a room"
          hint="Have a 6-letter code? Tap here."
          onClick={onOpenJoin}
          icon={<DoorOpen className="w-5 h-5" />}
          primary
        />
        <SheetAction
          label="Recently played"
          hint="Jump back into your recent games"
          onClick={() => {
            onClose();
            navigate("/recently-played");
          }}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <SheetAction
          label="Favorite games"
          hint="Quick access to your starred titles"
          onClick={() => {
            onClose();
            navigate("/favorites");
          }}
          icon={<Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />}
        />
        <SheetAction
          label="How to play"
          hint="Quick rules for every game"
          onClick={onClose}
          icon={<HelpCircle className="w-5 h-5" />}
        />
        <SheetAction
          label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          hint={theme === "light" ? "Easier on the eyes at night" : "Bright like a verandah"}
          onClick={toggleTheme}
          icon={theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        />
        <SheetAction
          label={showSettings ? "Hide settings" : "Sound & vibration"}
          hint="Mute / theme / vibration toggle"
          onClick={() => setShowSettings((v) => !v)}
          icon={<Sliders className="w-5 h-5" />}
        />
        {showSettings && <GlobalSettings />}
        <SheetAction
          label="About BHALYAM"
          hint="Crafted for 90s Telugu kids"
          onClick={onClose}
          icon={<Info className="w-5 h-5" />}
        />

        {isMember ? (
          <SheetAction
            label="Sign out / Log out"
            hint={email ? `Signed in as ${email}` : "Log out from this device"}
            onClick={() => {
              signOut();
              onClose();
            }}
            icon={<LogOut className="w-5 h-5 text-red-500" />}
          />
        ) : (
          <SheetAction
            label="Sign in"
            hint="Access your host privileges"
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            icon={<UserIcon className="w-5 h-5 text-amber-600" />}
          />
        )}
      </nav>
    </SheetShell>
  );
}


/**
 * Notifications body — the filter tabs + list that used to be the whole
 * `NotificationsSheet` dialog. Now rendered inline inside `ProfileSheet`'s
 * "notifications" view, so it owns no SheetShell/title of its own; the
 * parent sheet supplies chrome, back button, and the unread-count title
 * badge.
 */
function NotificationsPanelBody({
  notifications,
  onUpdateNotifications,
  onClose,
  onOpenJoin,
  isDark,
}: {
  notifications: NotificationItem[];
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onClose: () => void;
  onOpenJoin: () => void;
  isDark: boolean;
}) {
  const [filterTab, setFilterTab] = useState<"all" | "invites" | "rewards">("all");
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    onUpdateNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filterTab === "invites") return n.type === "invite" || n.type === "gang";
    if (filterTab === "rewards") return n.type === "reward" || n.type === "trophy";
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["all", "invites", "rewards"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`relative px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                filterTab === tab
                  ? "text-black font-black"
                  : isDark
                  ? "text-zinc-400 hover:text-white"
                  : "text-[#6E5A4B] hover:text-[#2A221B]"
              }`}
            >
              {filterTab === tab && (
                <motion.span
                  layoutId="notif-filter-pill"
                  transition={bhalyamSpring}
                  className="absolute inset-0 rounded-full bg-amber-500 shadow-xs -z-10"
                />
              )}
              {tab}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-bold text-amber-500 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5 my-2">
        {filteredNotifs.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="w-9 h-9 text-amber-400 mx-auto mb-2" />
            <p className={`text-[13px] font-bold ${isDark ? "text-zinc-300" : "text-[#5C3B1E]"}`}>
              You're all caught up!
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">No notifications in this filter.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
          {filteredNotifs.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.04, ...bhalyamSpring } }}
              exit={{ opacity: 0, x: -24, scale: 0.96, transition: { duration: 0.18 } }}
              onClick={() => {
                if (item.unread) {
                  onUpdateNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                  );
                }
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer ${
                isDark
                  ? item.unread
                    ? "bg-[#141E34] border-amber-400/40 shadow-xs"
                    : "bg-[#0E1526] border-white/10"
                  : item.unread
                  ? "bg-[#FFF9EE] border-[#E8D1A7] shadow-xs"
                  : "bg-white/80 border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.type === "invite"
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      : item.type === "reward"
                      ? "bg-purple-500/15 text-purple-500 border border-purple-500/30"
                      : item.type === "gang"
                      ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  }`}>
                    {item.type === "invite" ? (
                      <Mail className="w-4.5 h-4.5" />
                    ) : item.type === "reward" ? (
                      <Sparkles className="w-4.5 h-4.5" />
                    ) : item.type === "gang" ? (
                      <UsersLucideIcon className="w-4.5 h-4.5" />
                    ) : (
                      <Trophy className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-bold leading-tight ${isDark ? "text-white" : "text-[#2A221B]"}`}>
                      {item.title}
                    </h4>
                    <p className={`text-xs mt-0.5 leading-snug ${isDark ? "text-zinc-300" : "text-[#6E5A4B]"}`}>
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-1 block font-semibold">
                      {item.time}
                    </span>
                  </div>
                </div>
                {item.unread && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0 mt-1" />
                )}
              </div>

              {item.type === "invite" && (
                <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (item.roomCode) {
                        navigate(`/room/${item.roomCode}`);
                      } else {
                        onOpenJoin();
                      }
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[12px] shadow-xs active:scale-95 transition cursor-pointer text-center"
                  >
                    Join Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateNotifications((prev) => prev.filter((n) => n.id !== item.id));
                    }}
                    className={`py-1.5 px-3 rounded-xl text-[12px] font-bold transition cursor-pointer ${
                      isDark ? "bg-white/10 text-zinc-300 hover:text-white" : "bg-black/5 text-[#5C3B1E] hover:bg-black/10"
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}

function GearGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.05.24.31.51 1.6 1.05a2 2 0 1 1 0 4c-1.29.54-1.55.81-1.6 1.05z" />
    </svg>
  );
}

function TrophyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a3 3 0 0 0 3 5" />
      <path d="M17 5h3a3 3 0 0 1-3 5" />
    </svg>
  );
}

function FriendsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15 20c0-2.4 1.6-4.5 4-5.4" />
    </svg>
  );
}

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.9 6.6 7.1.7-5.4 5 1.6 7-6.2-3.6L5.8 21.3 7.4 14.3 2 9.3l7.1-.7L12 2z" />
    </svg>
  );
}

function SheetAction({
  icon,
  label,
  hint,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ x: 2 }}
      transition={bhalyamSpring}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-left
                  focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                  ${primary
                    ? "bhalyam-gold-leaf text-bhalyam-wood-dark border border-bhalyam-gold-dark shadow-[0_6px_14px_-4px_rgba(228,177,40,0.55)]"
                    : "bg-white border border-[#E8D8BE] text-[#2A221B] hover:bg-[#FFF8EE]"}`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${primary ? "bg-[#FFF6DC] text-bhalyam-wood-dark" : "bg-[#FFF8EE] text-[#2A221B] border border-[#E8D8BE]"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-[15px] leading-tight">{label}</span>
        {hint && (
          <span
            className={`block text-[11px] mt-0.5 font-semibold ${
              primary ? "text-[#7B5024]" : "text-[#7B5024]"
            }`}
          >
            {hint}
          </span>
        )}
      </span>
      <ArrowRight className="w-4 h-4 text-current opacity-60 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SunGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function InfoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/**
 * Primary "Join Room" CTA in the home header.
 *
 * Uses the BHALYAM gold-leaf treatment to read as the primary action without
 * fighting the page's wood/cream palette. `compact` switches to a smaller pill
 * for the mobile row where space is at a premium.
 *
 * Accessibility: ≥44px touch target, visible focus ring, descriptive aria-label,
 * SVG door glyph (no emoji), 200ms color transition for hover feedback.
 */
/* `JoinRoomButton` was removed — the unified header uses
 * `FullWidthJoinRoomButton` at every breakpoint (width-capped on tablet /
 * desktop) so there's only one Join Room component to maintain. */

function WhatsappGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.14 1.6 5.95L2 22l4.27-1.12a9.91 9.91 0 004.77 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.51 2 12.04 2zm0 18.13c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-2.53.66.68-2.47-.2-.32a7.99 7.99 0 01-1.23-4.26c0-4.41 3.59-8 8-8 4.41 0 8 3.59 8 8s-3.59 8-8 8zm4.39-5.99c-.24-.12-1.41-.7-1.63-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.1-.1.24-.27.36-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.41-.58 1.61-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
    </svg>
  );
}

function DoorPlusIcon({ className }: { className?: string }) {
  // Door-with-plus glyph — signals "enter an existing space" without leaning
  // on emoji. Matches the icon used inside the modal header for continuity.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 21h12" />
      <path d="M6 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M13 13h.01" />
      <path d="M20 8v6M17 11h6" />
    </svg>
  );
}

/**
 * Module-scope, not per-render: this used to be redeclared inside `GameTile`
 * on every render. Hoisted here (behaviour-identical) so `PlayerJourneyDashboard`
 * can reuse the same 21 tile paths for a real "last played" card instead of
 * a 22nd copy of this table.
 */
const TILE_ART_BY_GAME: Record<BhalyamGameSlug, string> = {
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
  stargame: "/StarTile.png",
  bingo: "/Bingo Tile.png",
  snake: "/Snake Game Tile.png",
  roadrash: "/BrickRacer Game Tile.png",
  brickblocks: "/BlockBlast Game Tile.png",
  tetris: "/BlockBlast Game Tile.png",
  breakout: "/BrickBreakout Game Tile.png",
  carrom: "/Carrom Game Tile.png",
  chess: "/Chess Game Tile.png",
  spacewar: "/SpacewarTile.png",
  nokiacricket: "/RetroCricket Game Tile.png",
};

// Exported so the dedicated /games page can render the same tile design.
export function GameTile({
  game,
  onSelect,
  className,
  compact = true,
}: {
  game: BhalyamGameCard;
  onSelect: () => void;
  className?: string;
  compact?: boolean;
}) {
  const Glyph = GAME_GLYPHS[game.slug];
  const tileArtByGame = TILE_ART_BY_GAME;

  const [theme] = useTheme();
  const isDark = theme === "dark";
  const underMaintenance = isLocked(game);
  const accent = getGameAccent(game);
  const btnFrom = game.btnGradient?.from ?? accent.from;
  const btnTo = game.btnGradient?.to ?? accent.to;
  const btnShadow = game.btnGradient?.shadow ?? accent.to;

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
    <motion.div
      variants={underMaintenance ? undefined : tileHover}
      initial="rest"
      whileHover={underMaintenance ? undefined : "hover"}
      transition={bhalyamSpring}
      className={`group relative w-full rounded-[26px] overflow-hidden text-left p-4 sm:p-5 flex flex-col justify-between border transition-all duration-300 ${
        className ?? ""
      }`}
      style={{
        background: bgStyle,
        borderColor: borderStyle,
        boxShadow: shadowStyle,
      }}
    >
      {/* Hero Illustration / Art Area with ambient flare */}
      <div className="relative my-2 sm:my-3 h-28 sm:h-36 flex items-center justify-center">
        <div
          className={`absolute w-32 h-32 rounded-full blur-3xl pointer-events-none transition-transform duration-500 group-hover:scale-125 ${
            isDark ? "opacity-50" : "opacity-45"
          }`}
          style={{ background: btnFrom }}
          aria-hidden
        />
        <GameTileArt src={tileArtByGame[game.slug]} title={game.title} compact={compact}>
          <span className={`relative inline-flex w-16 h-16 rounded-2xl items-center justify-center flex-shrink-0 ${
            isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#1D2C4A]"
          } backdrop-blur-md`}>
            <Glyph className="w-10 h-10" />
          </span>
        </GameTileArt>
      </div>

      {/* Title & Nostalgia Classroom Quote */}
      <div className="relative flex flex-col items-center text-center px-1">
        <h3 className={`font-display font-black text-[22px] sm:text-[26px] leading-tight tracking-tight drop-shadow-sm ${
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

      {/* Metadata Telemetry Row */}
      <div className={`flex items-center justify-center gap-3 text-[12px] font-bold my-2.5 ${
        isDark ? "text-zinc-300" : "text-[#473B30]"
      }`}>
        <div className="flex items-center gap-1.5">
          <UsersLucideIcon className={`w-3.5 h-3.5 ${isDark ? "text-zinc-400" : "text-[#6E5A4B]"}`} />
          <span>{game.playerRange ?? "2–8 Players"}</span>
        </div>
        <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>•</span>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${isDark ? "text-zinc-400" : "text-[#6E5A4B]"}`} />
          <span>{game.duration ?? "10–20 min"}</span>
        </div>
      </div>

      {/* Glossy 3D Play Now Action Button */}
      <button
        type="button"
        onClick={underMaintenance ? undefined : onSelect}
        disabled={underMaintenance}
        className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-[14px] font-black uppercase tracking-wider text-white active:scale-98 transition-all duration-200 cursor-pointer shadow-md ${
          underMaintenance
            ? "bg-zinc-600 opacity-60 cursor-not-allowed"
            : "hover:brightness-115 hover:shadow-lg"
        }`}
        style={{
          background: `linear-gradient(135deg, ${btnFrom}, ${btnTo})`,
          boxShadow: `0 6px 16px -3px ${btnShadow}90, 0 3px 0 0 ${btnShadow}`,
        }}
      >
        <span>{underMaintenance ? "Coming Soon" : "Play Now"}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function GameTileArt({
  src,
  title,
  compact,
  children,
}: {
  src: string;
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setImageFailed(false);
    setRetryNonce(0);
  }, [src]);

  useEffect(() => {
    if (!imageFailed || retryNonce > 0) return;
    const timer = window.setTimeout(() => {
      setImageFailed(false);
      setRetryNonce(1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [imageFailed, retryNonce]);

  if (!src || imageFailed) {
    return <>{children}</>;
  }

  const resolvedSrc = retryNonce === 0 ? src : `${src}?retry=${retryNonce}`;

  return (
    <img
      src={resolvedSrc}
      alt={`${title} icon`}
      className="relative h-24 sm:h-28 w-auto max-w-[85%] object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
    />
  );
}

/* ───────────────────────────── Player Journey & Daily Quests Dashboard ───────────────────────────── */

function PlayerJourneyDashboard({
  onSelect,
  snapshot,
}: {
  onSelect: (slug: BhalyamGameSlug) => void;
  snapshot: PlayerSnapshot;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const handleShareWhatsAppReferral = () => {
    const text = encodeURIComponent(
      "🎮 Hey gang! Come join my room on BHALYAM to unlock our nostalgic 90s childhood games together: " + window.location.origin
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Real numbers, computed once and shared by Card 1 and Card 2 below.
  // `matches` is limit=1 from usePlayerSnapshot, so [0] IS "last played".
  const lastMatch = snapshot.matches[0];
  const lastGameCard = lastMatch ? BHALYAM_GAMES.find((g) => g.slug === lastMatch.game) : undefined;
  const lastGameStats = lastMatch ? snapshot.stats?.perGame[lastMatch.game] : undefined;
  const overallStreak = snapshot.stats?.currentWinStreak ?? 0;

  const xp = snapshot.profile?.experiencePoints ?? 0;
  const level = snapshot.profile?.level ?? 1;
  const xpIntoLevel = xp % 100;
  // Closest to completion first — the most motivating "next" target, and the
  // one most likely to already be in progress.
  const nextAchievement = [...snapshot.achievements]
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];

  return (
    <RevealOnScroll as="section" amount={0.1} className="mt-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className={`bhalyam-display text-[22px] sm:text-[28px] leading-tight ${
            isDark ? "text-white" : "text-[#1D2C4A]"
          }`}>
            Continue Your Journey
          </h2>
          <p className={`text-[13px] sm:text-[14px] font-medium ${
            isDark ? "text-slate-400" : "text-[#6D5C4D]"
          }`}>
            Pick up where you left off and track real progress toward your next achievement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">

        {/* Card 1: Jump back into the real last-played game, or an honest
            first-game prompt when there is no match history yet. */}
        <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#0E1526] border-white/10" : "bg-[#FCF8EF] border-[#E8D9C1]"
        }`}>
          {lastMatch && lastGameCard ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                    isDark
                      ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}>
                    ▶ Jump Back In
                  </span>
                  <span className={`text-[12px] font-semibold ${
                    isDark ? "text-slate-400" : "text-sand-600"
                  }`}>
                    Last played {formatTimeAgo(lastMatch.finishedAt)}
                  </span>
                </div>

                <div className={`flex items-center gap-3.5 my-3 p-3 rounded-2xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-[#F5ECE0] border-[#E6D4B8]"
                }`}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-200 border-2 border-amber-400 p-1 flex-shrink-0 flex items-center justify-center shadow-inner">
                    <img
                      src={TILE_ART_BY_GAME[lastGameCard.slug]}
                      alt={lastGameCard.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-display font-black text-[20px] leading-tight truncate ${
                      isDark ? "text-white" : "text-[#1D2C4A]"
                    }`}>
                      {lastGameCard.title}
                    </h4>
                    <div className={`flex items-center gap-2 text-[12px] font-bold mt-0.5 ${
                      isDark ? "text-slate-300" : "text-[#6D5C4D]"
                    }`}>
                      {lastGameStats && (
                        <>
                          <span className={isDark ? "text-emerald-400 font-bold" : "text-emerald-700 font-bold"}>
                            🏆 {lastGameStats.wins} Win{lastGameStats.wins === 1 ? "" : "s"}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>Lvl {level}</span>
                      {overallStreak > 0 && (
                        <>
                          <span>•</span>
                          <span className={isDark ? "text-chest-300 font-extrabold" : "text-chest-700 font-extrabold"}>
                            🔥 {overallStreak}x Streak
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelect(lastGameCard.slug)}
                className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-[14px] uppercase tracking-wider shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Resume {lastGameCard.title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-3 flex-1">
              <span className="text-3xl" aria-hidden>🎮</span>
              <p className={`text-[14px] font-bold ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                Play your first game to start your history
              </p>
              <p className={`text-[12px] font-medium ${isDark ? "text-slate-400" : "text-[#6D5C4D]"}`}>
                Your last-played game will appear here so you can jump straight back in.
              </p>
              <Link
                to="/games"
                className="mt-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-[13px] uppercase tracking-wider shadow-md transition inline-flex items-center gap-2"
              >
                <span>Browse Games</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </article>

        {/* Card 2: Real level progress and the real closest-to-unlocking
            achievement. No daily quests — there is no daily-quest system to
            back them. */}
        <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#0E1526] border-white/10" : "bg-[#FCF8EF] border-[#E8D9C1]"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`font-display font-black text-[18px] ${
                isDark ? "text-white" : "text-[#1D2C4A]"
              }`}>
                🏆 Level {level} Progress
              </span>
              <span className={`text-[12px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}>
                {xpIntoLevel}% Complete
              </span>
            </div>

            {/* XP Bar */}
            <div className={`w-full h-2.5 rounded-full overflow-hidden mb-3 ${
              isDark ? "bg-slate-800" : "bg-[#EADCC8]"
            }`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${xpIntoLevel}%` }}
              />
            </div>

            {/* Next real achievement, closest to completion */}
            {nextAchievement ? (
              <div className={`p-2.5 rounded-xl border ${
                isDark ? "bg-white/5 border-white/10" : "bg-[#FFF8EE] border-[#EEDCC2]"
              }`}>
                <div className={`text-xs font-black uppercase tracking-wider ${
                  isDark ? "text-chest-300" : "text-chest-700"
                }`}>
                  🎯 Next Achievement
                </div>
                <div className={`text-[13px] font-bold mt-0.5 ${
                  isDark ? "text-white" : "text-[#1D2C4A]"
                }`}>
                  {nextAchievement.title}
                </div>
                <div className={`text-[11px] font-semibold ${
                  isDark ? "text-slate-300" : "text-[#7A6B5C]"
                }`}>
                  {nextAchievement.currentProgress} / {nextAchievement.targetValue} — {nextAchievement.description}
                </div>
              </div>
            ) : (
              <p className={`text-[12px] font-semibold ${isDark ? "text-slate-400" : "text-[#6D5C4D]"}`}>
                {snapshot.ready
                  ? "Every achievement unlocked so far. Play a match to find the next one."
                  : "Play matches to start unlocking achievements."}
              </p>
            )}
          </div>
        </article>

        {/* Card 3: Invite Friends — real WhatsApp share action. No fabricated
            "2/3 Friends Joined" counter: there is no referral-tracking system
            behind it, so it can never move for a real user. */}
        <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors ${
          isDark
            ? "bg-[#0E1526] border-amber-500/30"
            : "bg-gradient-to-br from-[#FFFDF7] to-[#FDF4E3] border-amber-300/80"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👥</span>
              <h4 className={`font-display font-black text-[18px] ${
                isDark ? "text-white" : "text-[#1D2C4A]"
              }`}>
                Invite Friends, Unlock Perks
              </h4>
            </div>
            <p className={`text-[13px] font-medium mb-3 ${
              isDark ? "text-slate-300" : "text-[#6D5C4D]"
            }`}>
              Bring 3 friends to BHALYAM and instantly unlock exclusive nostalgia rewards:
            </p>

            <ul className={`space-y-2 mb-4 text-[13px] font-bold ${
              isDark ? "text-slate-200" : "text-[#2A221B]"
            }`}>
              <li className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                  isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                }`}>
                  ✓
                </span>
                <span>Exclusive Gold Avatar Frame</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                  isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                }`}>
                  ✓
                </span>
                <span>Nostalgia "Gang Leader" Chat Badge</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                  isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                }`}>
                  ✓
                </span>
                <span>Retro 90s School Slate Board Theme</span>
              </li>
            </ul>
          </div>

          {/*
            Dark ink on the WhatsApp green, not white.

            White on #25D366 measures 1.98:1 in the browser — the worst
            contrast in the lounge, on a 14px uppercase label. The fill has to
            stay: this button is recognised by its colour before it is read.
            So the label darkens instead, to 7.4:1 on the rest state and 5.9:1
            on hover, and the glyph follows it.
          */}
          <button
            type="button"
            onClick={handleShareWhatsAppReferral}
            className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-[#0B2E20] font-black text-[14px] uppercase tracking-wider shadow-[0_4px_14px_rgba(37,211,102,0.35)] active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <WhatsappGlyph className="w-4 h-4 text-[#0B2E20]" />
            <span>Invite on WhatsApp</span>
          </button>
        </article>

      </div>
    </RevealOnScroll>
  );
}

/*
 * `LiveLoungePulse` (four platform-wide activity tiles, a rotating
 * "community feed" ticker, and a "Weekly Leaderboard" that named the real
 * signed-in user at a fixed fake rank) was removed rather than wired.
 *
 * Unlike the cards above, nothing here had a real source to wire to: there is
 * no online-presence counter, no cross-player activity feed, and no weekly
 * XP leaderboard service anywhere in `server/src`. Every number — "548
 * Players Online", "68 Active Live Rooms", "23 School Gangs Active", "145
 * Matches Won Today" — was a hardcoded literal animated with `<CountUp>` to
 * read as live telemetry it was not. See TRUST-REMEDIATION-REPORT.md.
 */

/* ───────────────────────────── Footer ───────────────────────────── */

function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-8 pb-10 pt-4 max-w-[1240px] mx-auto space-y-5 text-[#5C3717]">
      <RevealOnScroll as="div" className="space-y-5">
        
        {/* Section 2: Middle Notebook Creator Card ("MADE BY") */}
        <div
          className="bhalyam-footer-card relative rounded-[32px] border border-[#E6D4B5]
                     overflow-hidden px-6 sm:px-12 py-8 sm:py-10 text-center shadow-md"
          style={{
            background: "linear-gradient(180deg, #FFFDF6 0%, #FAF2DF 100%)",
          }}
        >
          {/* Notebook Lined Paper Effect: Binder Margin Line & Hole Punches */}
          <div className="hidden sm:block absolute left-8 top-0 bottom-0 border-l border-[#F0A8A8]/60" />
          <div className="hidden sm:flex flex-col justify-around absolute left-2.5 top-8 bottom-8 pointer-events-none">
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
          </div>

          {/* Paper Plane Doodle at top right */}
          <PaperPlaneDoodleSVG className="hidden sm:block absolute right-6 top-4 w-20 h-16 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 sm:pl-8">
            
            {/* Left: Taped Photo Frame */}
            <div className="flex-shrink-0 relative group">
              <div className="relative rotate-[-2deg] bg-[#FFF8E7] p-2.5 border border-[#D4A574] rounded-xl shadow-md max-w-[210px] sm:max-w-[230px] transition-transform duration-300 hover:rotate-0">
                
                {/* Corner Tapes */}
                <span className="absolute -top-3 -left-3 w-10 h-4 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[-25deg] shadow-2xs pointer-events-none" />
                <span className="absolute -bottom-3 -right-3 w-10 h-4 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[20deg] shadow-2xs pointer-events-none" />

                <img
                  src="/Founder.png"
                  alt="Kethan Kumar Gontla"
                  className="w-full h-auto rounded-lg border border-[#E8D8BE] object-cover shadow-2xs"
                />
              </div>
            </div>

            {/* Middle: Signature & Quote */}
            <div className="flex-1 max-w-[500px]">
              <div className="text-[12px] font-extrabold tracking-widest text-[#9C7E63] uppercase flex items-center justify-center gap-1.5">
                <span>=</span> <span>MADE BY</span> <span>=</span>
              </div>

              <h3 className="bhalyam-script text-[36px] sm:text-[44px] font-extrabold text-[#4A2508] leading-none mt-1">
                Kethan Kumar Gontla
              </h3>

              <div className="text-[12px] font-bold text-[#E85D04] uppercase tracking-wider mt-1">
                Founder &amp; Creator of BHALYAM
              </div>

              <blockquote className="bhalyam-script text-[20px] sm:text-[23px] font-bold text-[#6D4323] leading-snug mt-3 px-2">
                “I wanted to build the place I wished existed when our school gang grew up.”
              </blockquote>

              {/* Social Buttons Row */}
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <InstagramGlyph className="w-4 h-4 text-[#E11D48]" />
                  <span>Instagram</span>
                </a>

                <a
                  href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <WhatsappGlyph className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:hello@bhalyam.app"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <MailGlyph className="w-4 h-4 text-[#2563EB]" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Right: Pencil Jar, Dice & Pawns Asset */}
            <div className="hidden lg:flex flex-col items-center justify-center flex-shrink-0">
              <img
                src="/Foundersectionasset.png"
                alt="BHALYAM Pencil Jar, Dice &amp; Pawns"
                className="w-40 sm:w-48 h-auto object-contain drop-shadow-xs"
              />
            </div>

          </div>
        </div>

        {/* Section 3: Bottom Navigation Columns */}
        <div
          className="bhalyam-footer-card relative rounded-[32px] border border-[#E6D4B5]
                     overflow-hidden px-6 sm:px-10 py-8 sm:py-10 shadow-sm"
          style={{
            background: "linear-gradient(180deg, #FFF8E7 0%, #FAF0D9 100%)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-6 text-left">
            
            {/* Brand Logo Column */}
            <div className="md:col-span-3">
              <img
                src="/FooterBhalyamlogo.png"
                alt="BHALYAM - Play Together. Remember Forever."
                className="w-48 sm:w-56 h-auto object-contain mb-1"
              />
            </div>

            {/* Links Columns: EXPLORE, SUPPORT, COMPANY, LEGAL */}
            <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* EXPLORE */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  EXPLORE
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/games" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">All Games</Link></li>
                  <li><a href="#rooms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Rooms</a></li>
                  <li><a href="#how-it-works" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">How It Works</a></li>
                  <li><a href="#leaderboard" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Leaderboard</a></li>
                </ul>
              </div>

              {/* SUPPORT */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  SUPPORT
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Help Center</Link></li>
                  <li><a href="#safety" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Safety Guide</a></li>
                  <li><a href="#rules" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Community Rules</a></li>
                  <li><a href="#report" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Report an Issue</a></li>
                </ul>
              </div>

              {/* COMPANY */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  COMPANY
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">About BHALYAM</Link></li>
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Our Story</Link></li>
                  <li><a href="#careers" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Careers</a></li>
                  <li><a href="#press" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Press Kit</a></li>
                </ul>
              </div>

              {/* LEGAL */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  LEGAL
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/privacy" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Privacy Notice</Link></li>
                  <li><a href="#terms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Terms of Service</a></li>
                  <li><Link to="/profile" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Your Data &amp; Choices</Link></li>
                </ul>
              </div>

            </div>

            {/* STAY IN THE LOOP */}
            <div className="md:col-span-3">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-1.5">
                STAY IN THE LOOP
              </h4>
              <p className="text-[12px] leading-snug text-[#7A5B3E] mb-3">
                Get updates about new games, events and awesome 90s vibes.
              </p>

              <form onSubmit={handleSubscribe} className="relative mb-3">
                <div className="flex items-center bg-[#F7EBD3] rounded-xl p-1 border border-[#E4D1AC]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-transparent text-xs text-[#4A2508] placeholder-[#9C7E63] px-2.5 focus:outline-none flex-1 min-w-0 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-chest-600 hover:bg-chest-700 text-white text-xs font-bold rounded-lg px-3.5 py-1.5 transition-all shadow-xs active:scale-95 flex-shrink-0"
                  >
                    Subscribe
                  </button>
                </div>
                {subscribed && (
                  <span className="text-[11px] text-[#25D366] font-bold mt-1 block">
                    ✓ Thanks for subscribing!
                  </span>
                )}
              </form>

              {/* Social Icon Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <InstagramGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <WhatsappGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <MailGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://x.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X / Twitter"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#games"
                  aria-label="Games"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Terms Links */}
          <div className="pt-4 border-t border-[#E8D9C0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-semibold text-[#8C7053]">
            <div className="flex items-center gap-1.5">
              <span>© {new Date().getFullYear()} BHALYAM. Made with</span>
              <Heart className="w-3 h-3 text-[#E85D04] inline fill-current" />
              <span>for 90s Kids.</span>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link to="/privacy" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Privacy Notice</Link>
              <span>•</span>
              <a href="#terms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Terms of Service</a>
              <span>•</span>
              <Link to="/profile" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Your Data Choices</Link>
              <span>•</span>
              <a href="#cookies" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Cookie Settings</a>
            </div>
          </div>

        </div>

      </RevealOnScroll>
    </footer>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function MailGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function HeartGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 21s-7-4.35-7-10.5C5 7.42 7.42 5 10.5 5c1.74 0 3.41 1.01 4.5 2.61C16.09 6.01 17.76 5 19.5 5 22.58 5 25 7.42 25 10.5 25 16.65 18 21 18 21h-6z" transform="scale(0.85) translate(2, 0)"/>
    </svg>
  );
}

function PaperPlaneDoodleSVG({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" fill="none" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 65 Q 25 75 35 60 T 45 45" strokeDasharray="3 3" opacity="0.6" />
      <path d="M45 45 L90 15 L60 70 L48 52 L78 28 L45 45 Z" fill="#FFFDF5" />
      <path d="M48 52 L48 64 L56 57" fill="#5C3717" opacity="0.2" />
    </svg>
  );
}

function SparkleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
      <circle cx="19" cy="18" r="1.2" />
      <circle cx="5" cy="18" r="1" />
    </svg>
  );
}
