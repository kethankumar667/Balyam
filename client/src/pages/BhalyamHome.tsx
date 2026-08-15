import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PencilIcon } from "../components/auth/authIcons";
import { findAvatar } from "../lib/avatars";
import { PRIVACY_CONTACT_EMAIL } from "../lib/privacy/contact";
import SelfAvatar from "../components/profile/SelfAvatar";
import { motion, AnimatePresence } from "framer-motion";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import { RevealOnScroll, RevealItem } from "../components/RevealOnScroll";
import GsapSplitHeadline from "../components/GsapSplitHeadline";
import CountUp from "../components/CountUp";
import { useTheme } from "../lib/useTheme";
import GlobalSettings from "../components/GlobalSettings";
import { tileHover, ctaPress, bhalyamSpring } from "../lib/motion";
import { getSocket } from "../lib/socket";
import CategoryFilter, {
  filterGames,
  type GameFilter,
} from "../components/bhalyam/CategoryFilter";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import {
  BHALYAM_GAMES,
  isLocked,
  getGameAccent,
  type BhalyamGameCard,
  type BhalyamGameSlug,
} from "../components/bhalyam/data";
import {
  Bell,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown,
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
  TeluguCinemaluGlyph,
  SamethaluGlyph,
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
  samethalu: SamethaluGlyph,
  telugucinemalu: TeluguCinemaluGlyph,
  stargame: StarGameGlyph,
  bingo: BingoGlyph,
  snake: StarGameGlyph,
  carrom: StarGameGlyph,
  bounce: StarGameGlyph,
  roadrash: StarGameGlyph,
  tetris: BlockBlastGlyph,
  breakout: StarGameGlyph,
  chess: StarGameGlyph,
  spacewar: StarGameGlyph,
  nokiacricket: HandCricketGlyph,
};

export default function BhalyamHome() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  // Warm the socket connection on landing so the first room create/join
  // doesn't pay the cold WebSocket handshake at click time
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <div className="bhalyam-home bhalyam-font min-h-screen bhalyam-paper flex flex-col overflow-x-hidden">
      <Header onOpenJoin={() => setJoinOpen(true)} />
      <main className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 pb-8 flex-1">
        <Hero
          onPlayFeatured={() => setSheetGame("uno")}
          onOpenJoin={() => setJoinOpen(true)}
        />
        <WelcomePlayerStrip onSelect={setSheetGame} />
        <GamesSection onSelect={setSheetGame} />
        <PlayerJourneyDashboard onSelect={setSheetGame} onOpenJoin={() => setJoinOpen(true)} />
        <LiveLoungePulse onSelect={setSheetGame} />
        <Footer />
      </main>
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

function WelcomePlayerStrip({ onSelect }: { onSelect: (slug: BhalyamGameSlug) => void }) {
  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "Champion";
  const [theme] = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`mb-5 p-3 sm:p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
      isDark ? "bg-[#0E1526] border-white/10" : "bg-[#FCF8EF] border-[#E8D8BE]"
    }`}>
      {/* Left: Player Profile & Greeting */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-inner flex-shrink-0">
          <SelfAvatar className="w-full h-full" fallback={<UserIcon className="w-5 h-5 text-amber-900" />} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[14px] font-black ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
              Welcome back, {displayName}!
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
              Lvl 12
            </span>
          </div>
          <p className="text-[11.5px] font-semibold text-[#6B5E52] dark:text-zinc-400 flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 3-Day Streak</span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 1,450 / 2,000 XP
            </span>
          </p>
        </div>
      </div>

      {/* Right: Quick Continue Playing & Daily Reward */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onSelect("uno")}
          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-black text-[12px] shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Continue UNO</span>
        </button>
        <span className="px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[11px] font-black whitespace-nowrap inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Day 3 Bonus (+100 XP)</span>
        </span>
      </div>
    </div>
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
          <p className="text-[12.5px] text-zinc-300">Unlock childhood badges as you play with friends</p>
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
            <div className="text-[12.5px] font-black text-amber-200 truncate">{t.title}</div>
            <div className="text-[10.5px] text-zinc-300 mt-0.5 line-clamp-1">{t.desc}</div>
            <div className="mt-2 text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-400">
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
      {/* ── Main Hero Card ── */}
      <div
        className={`relative overflow-hidden rounded-[26px] sm:rounded-[36px] border ${
          isDark
            ? "border-slate-800 shadow-[0_14px_30px_-15px_rgba(0,0,0,0.7)]"
            : "border-[#E2D3BA] shadow-[0_14px_30px_-15px_rgba(74,44,22,0.35)]"
        }`}
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
            className={`text-[11.5px] sm:text-[13px] font-black uppercase tracking-[0.22em] block mb-2 sm:mb-2.5 ${
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

          {/* Description */}
          <p
            className={`text-[14px] sm:text-[15.5px] font-semibold max-w-sm sm:max-w-md mt-3 leading-snug ${
              isDark ? "text-slate-300" : "text-[#3B332A]"
            }`}
          >
            Pick a game, send the room code to your school WhatsApp group, and play instantly.
          </p>
          <p
            className={`font-script italic text-[17px] sm:text-[20px] mt-1 ${
              isDark ? "text-amber-300" : "text-[#7B2F0E]"
            }`}
          >
            Bring your school gang back together!
          </p>

          {/* Side-by-side Action Buttons inside Hero Card */}
          <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
            {/* 1. Join Room Button */}
            <button
              type="button"
              onClick={onOpenJoin}
              className="py-3 px-6 rounded-full flex items-center justify-center gap-2 font-black text-[14px] sm:text-[15px] bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-lg active:scale-95 transition cursor-pointer flex-shrink-0"
            >
              <DoorOpen className="w-5 h-5 text-black" />
              <span>Join Room with a code</span>
            </button>

            {/* 2. WhatsApp Share Card */}
            <div
              onClick={handleShareWhatsApp}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleShareWhatsApp();
              }}
              className={`rounded-full py-1.5 px-4 border flex items-center gap-3 cursor-pointer active:scale-95 transition shadow-sm ${
                isDark
                  ? "bg-[#0B101E]/90 border-slate-700/80 hover:border-emerald-500/60 text-white"
                  : "bg-white/95 border-[#E5D5BC] hover:border-emerald-500/60 text-[#15294E]"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <WhatsappGlyph className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span
                  className={`text-[13px] font-black leading-tight ${
                    isDark ? "text-white" : "text-[#15294E]"
                  }`}
                >
                  Share on WhatsApp
                </span>
                <span
                  className={`text-[10.5px] font-medium leading-tight mt-0.5 ${
                    isDark ? "text-slate-400" : "text-[#7A6F62]"
                  }`}
                >
                  Send the code in seconds!
                </span>
              </div>
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
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-bold bg-[#FFF4E4] text-[#EA5A1F] border border-[#F2D5A9] shadow-[0_4px_10px_-3px_rgba(234,90,31,0.45)] flex-shrink-0"
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        {shown.map((game) => (
          <RevealItem key={game.slug}>
            <li>
              <GameTile
                game={game}
                onSelect={() => onSelect(game.slug)}
                compact
              />
            </li>
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

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "invite",
    title: "Ravi invited you to UNO Adda!",
    desc: "Room: 6-letter Code #UN984X · 3 friends waiting",
    time: "2m ago",
    unread: true,
    gameSlug: "uno",
    roomCode: "UN984X",
  },
  {
    id: "notif-2",
    type: "reward",
    title: "Day 3 Login Bonus Claimed!",
    desc: "+100 XP added to your Veteran progression",
    time: "1h ago",
    unread: true,
  },
  {
    id: "notif-3",
    type: "gang",
    title: "Suresh scored 184 runs in Hand Cricket!",
    desc: "Can you beat his 90s classroom record?",
    time: "3h ago",
    unread: true,
    gameSlug: "handcricket",
  },
  {
    id: "notif-4",
    type: "trophy",
    title: "New Trophy Unlocked: Sixer Legend! 🎲",
    desc: "You rolled three 6s in Ludo under pressure",
    time: "Yesterday",
    unread: false,
    gameSlug: "ludo",
  },
];

function Header({ onOpenJoin }: { onOpenJoin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "monica";
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const unreadCount = notifications.filter((n) => n.unread).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-bold text-[13.5px] shadow-2xl border flex items-center gap-2 ${
              isDark
                ? "bg-[#1D2C4A] text-white border-amber-400/40"
                : "bg-[#FFF5DC] border-[#E8D1A7] text-[#854D0E] shadow-amber-900/10"
            }`}
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={`sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors shadow-xs ${
        isDark
          ? "bg-[#070B14]/90 border-white/10"
          : "bg-[#FAF3E0]/90 border-[#ECD9BA]/70"
      }`}>
        <div className="mx-auto w-full max-w-[1100px] px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group flex-shrink-0">
            <BhalyamLogo size={36} decorative />
            <span className="flex flex-col leading-none min-w-0">
              <span className={`bhalyam-display text-[19px] sm:text-[24px] lg:text-[26px] tracking-tight truncate ${isDark ? "text-white" : "text-[#2A221B]"}`}>
                BHALYAM
              </span>
              <span className="text-[8.5px] sm:text-[10px] uppercase tracking-[0.16em] font-extrabold text-[#FF8F00] -mt-0.5">
                Relive Childhood
              </span>
            </span>
          </Link>

          {/* Right Action Stack */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* 1. Notification Bell Icon with dynamic unread badge -> opens Notifications side modal */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              title="Notifications"
              className={`relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border flex items-center justify-center text-sm transition hover:scale-105 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0D1426] border-[#1E2945] text-zinc-300 hover:bg-[#141E38]"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#5C3B1E] hover:bg-[#F2E4CB]"
              }`}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 2. Profile Button (Avatar + Name on desktop / Avatar on mobile + Caret) -> Opens Profile functionality */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={`h-9 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 rounded-full border transition hover:scale-102 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0D1426] border-[#1E2945] text-white hover:bg-[#141E38]"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:bg-[#F2E4CB]"
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
      />

      <NotificationsSheet
        open={notificationsOpen}
        notifications={notifications}
        onUpdateNotifications={setNotifications}
        onClose={() => setNotificationsOpen(false)}
        onOpenJoin={() => {
          setNotificationsOpen(false);
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
 * Profile sheet — entirely dedicated to the upcoming personal-profile
 * feature. No navigation actions here; those live in MenuSheet.
 */
export function ProfileSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { playerName, avatarId } = useRoomStore();
  const avatar = findAvatar(avatarId);
  const named = playerName.trim().length > 0;
  const signedIn = useAuthStore((s) => s.isMember);

  return (
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
      <div
        className="rounded-2xl p-5 border border-[#E0AE3B] bg-gradient-to-br from-[#FFF7E2] to-[#FBE7BD]
                   shadow-[0_4px_14px_-6px_rgba(228,177,40,0.55)] text-center"
      >
        <div className="relative mx-auto w-20 h-20 mb-3">
          <span
            className="block w-20 h-20 rounded-full overflow-hidden
                       ring-4 ring-[#FBE7BD] border-2 border-[#D49E24]
                       shadow-[0_6px_20px_rgba(212,158,36,0.45),inset_0_2px_4px_rgba(0,0,0,0.15)]
                       flex items-center justify-center text-bhalyam-wood-dark bg-[#FFF8E7]"
          >
            {avatar ? (
              <img
                src={avatar.src}
                alt=""
                className="w-full h-full object-cover scale-[1.25] origin-center"
                style={{ objectPosition: "50% 22%" }}
              />
            ) : (
              <UserIcon className="w-9 h-9" />
            )}
          </span>
          <Link
            to="/profile"
            onClick={onClose}
            aria-label={avatar ? "Change your avatar and name" : "Choose an avatar and set your name"}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full inline-flex items-center
                       justify-center bg-[#FFFDF8] text-[#5C3717]
                       ring-2 ring-[#FFF7E2] border-2 border-[#D49E24]
                       shadow-[0_3px_8px_rgba(92,55,23,0.35)]
                       hover:bg-[#FFF4DE] hover:scale-105 active:scale-95
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark
                       transition-[background-color,transform,box-shadow] duration-150"
          >
            <Pencil className="w-4 h-4 text-[#5C3717]" />
          </Link>
        </div>

        <div className="bhalyam-display text-[var(--auth-ink)] text-[22px] leading-tight break-words">
          {named ? playerName : "Add your name"}
        </div>

        <p className="mt-1 text-[12.5px] font-semibold text-[var(--auth-accent)]">
          {signedIn ? "Signed in" : "Playing as a guest"}
        </p>

        {!named ? (
          <p className="bhalyam-script text-[var(--auth-accent)] text-[19px] leading-[1.15] mt-3">
            Tap the pencil so the table knows who you are.
          </p>
        ) : null}
      </div>

      {signedIn ? (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 border border-[#E8D8BE] bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#7B5024]">
                Your Membership
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10.5px] font-black">
                Active Member
              </span>
            </div>
            <Link
              to="/profile"
              onClick={onClose}
              className="w-full h-11 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                         font-extrabold text-[13.5px] inline-flex items-center justify-center gap-2
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
                       font-extrabold text-[13.5px] inline-flex items-center justify-center gap-2
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
          <p className="text-center text-[11.5px] leading-relaxed text-[var(--auth-ink-soft)]">
            Guests play every game against bots and join any room they&apos;re invited to.
            An account is for opening your own.
          </p>
        </div>
      )}
    </SheetShell>
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
      <div className="rounded-2xl p-4 border border-[#E8D8BE] bg-white">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2BB44A] animate-pulse" aria-hidden />
          <span className="text-[13px] font-semibold text-[#365A37]">
            132 players online right now
          </span>
        </div>
        <div className="text-[11px] text-[#7B5024] mt-1">
          Most are on Hand Cricket and Snakes &amp; Ladders.
        </div>
      </div>

      <nav className="flex flex-col gap-2" aria-label="Menu actions">
        <SheetAction
          label="Join a room"
          hint="Have a 6-letter code? Tap here."
          onClick={onOpenJoin}
          icon={<DoorOpen className="w-5 h-5" />}
          primary
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


export function NotificationsSheet({
  open,
  notifications,
  onUpdateNotifications,
  onClose,
  onOpenJoin,
}: {
  open: boolean;
  notifications: NotificationItem[];
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onClose: () => void;
  onOpenJoin: () => void;
}) {
  const [filterTab, setFilterTab] = useState<"all" | "invites" | "rewards">("all");
  const [theme] = useTheme();
  const isDark = theme === "dark";
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
    <SheetShell
      open={open}
      onClose={onClose}
      ariaLabel="Notifications"
      titleLeft={
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <span className={`bhalyam-display text-[20px] tracking-tight ${isDark ? "text-white" : "text-[#2A221B]"}`}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-red-500 text-white shadow-xs">
              {unreadCount} New
            </span>
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["all", "invites", "rewards"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1 rounded-full text-[11.5px] font-bold capitalize transition cursor-pointer ${
                filterTab === tab
                  ? "bg-amber-500 text-black font-black shadow-xs"
                  : isDark
                  ? "bg-white/5 text-zinc-400 hover:text-white"
                  : "bg-black/5 text-[#6E5A4B] hover:text-[#2A221B]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11.5px] font-bold text-amber-500 hover:underline cursor-pointer inline-flex items-center gap-1"
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
          filteredNotifs.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.unread) {
                  onUpdateNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                  );
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
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
                    <p className={`text-[11.5px] mt-0.5 leading-snug ${isDark ? "text-zinc-300" : "text-[#6E5A4B]"}`}>
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
            </div>
          ))
        )}
      </div>
    </SheetShell>
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
    roadrash: "/BrickRacer Game Tile.png",
    tetris: "/BlockBlast Game Tile.png",
    breakout: "/BrickBreakout Game Tile.png",
    carrom: "/Carrom Game Tile.png",
    chess: "/Chess Game Tile.png",
    spacewar: "/SpacewarTile.png",
    nokiacricket: "/RetroCricket Game Tile.png",
  };

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
  onOpenJoin,
}: {
  onSelect: (slug: BhalyamGameSlug) => void;
  onOpenJoin: () => void;
}) {
  const handleShareWhatsAppReferral = () => {
    const text = encodeURIComponent(
      "🎮 Hey gang! Come join my room on BHALYAM to unlock our nostalgic 90s childhood games together: " + window.location.origin
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <RevealOnScroll as="section" amount={0.1} className="mt-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="bhalyam-display text-[22px] sm:text-[28px] text-[#1D2C4A] leading-tight">
            Continue Your Journey &amp; Daily Quests
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6D5C4D] font-medium">
            Earn XP, unlock nostalgic avatars, and climb the school leaderboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
        
        {/* Card 1: Continue Your Journey */}
        <article className="rounded-3xl border border-[#E8D9C1] bg-[#FCF8EF] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                ▶ Jump Back In
              </span>
              <span className="text-[12px] font-semibold text-[#8C7A6B]">
                Last played 2 hours ago
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-3 p-3 rounded-2xl bg-[#F5ECE0] border border-[#E6D4B8]">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-200 border-2 border-amber-400 p-1 flex-shrink-0 flex items-center justify-center">
                <img
                  src="/HandCricketTile.png"
                  alt="Hand Cricket"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-display font-black text-[20px] text-[#1D2C4A] leading-tight truncate">
                  Hand Cricket
                </h4>
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#6D5C4D] mt-0.5">
                  <span className="text-emerald-700">🏆 45 Wins</span>
                  <span>•</span>
                  <span>Lvl 8</span>
                  <span>•</span>
                  <span className="text-orange-600 font-extrabold">🔥 3x Streak</span>
                </div>
              </div>
            </div>

            <div className="my-3 p-2.5 rounded-xl bg-[#FFF8EE] border border-amber-200/80 text-[12px] text-[#6D4323] font-semibold flex items-center gap-2">
              <span className="text-base">🎁</span>
              <span><strong>Next Milestone:</strong> Golden Willow Bat Avatar in 2 wins</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect("handcricket")}
            className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-[14px] uppercase tracking-wider shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Resume Hand Cricket</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </article>

        {/* Card 2: Achievement Progress & Daily Quests */}
        <article className="rounded-3xl border border-[#E8D9C1] bg-[#FCF8EF] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-display font-black text-[18px] text-[#1D2C4A]">
                🏆 Level 12 Progress
              </span>
              <span className="text-[12px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                60% Complete
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#EADCC8] overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: "60%" }}
              />
            </div>

            {/* Next Targeted Milestone */}
            <div className="p-2.5 rounded-xl bg-[#FFF8EE] border border-[#EEDCC2] mb-3">
              <div className="text-[11.5px] font-black uppercase tracking-wider text-[#EA5A1F]">
                🎯 Next Achievement
              </div>
              <div className="text-[13px] font-bold text-[#1D2C4A] mt-0.5">
                Win 1 More Rummy Match
              </div>
              <div className="text-[11px] text-[#7A6B5C] font-semibold">
                Reward: <strong>+100 XP</strong> &amp; Exclusive "Rummy Master" Badge
              </div>
            </div>

            {/* Daily Quests List */}
            <div className="space-y-1.5">
              <div className="text-[11.5px] font-black uppercase tracking-wider text-[#6D5C4D]">
                Daily Quests (Refreshes in 4h)
              </div>
              <div className="p-2 rounded-lg bg-[#F5ECE0] flex items-center justify-between text-[12px] font-bold text-[#2A221B]">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span>✅</span> Play 1 UNO Match
                </span>
                <span className="text-emerald-700 font-extrabold">+50 XP</span>
              </div>
              <div className="p-2 rounded-lg bg-[#F5ECE0] flex items-center justify-between text-[12px] font-bold text-[#2A221B]">
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-400">⬜</span> Win 1 Hand Cricket Match
                </span>
                <span className="text-amber-800 font-extrabold">+75 XP</span>
              </div>
              <div className="p-2 rounded-lg bg-[#F5ECE0] flex items-center justify-between text-[12px] font-bold text-[#2A221B]">
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-400">⬜</span> Invite 1 Friend to Room
                </span>
                <span className="text-purple-800 font-extrabold">+100 XP</span>
              </div>
            </div>
          </div>
        </article>

        {/* Card 3: Incentivized Friend Referral */}
        <article className="rounded-3xl border border-amber-300/80 bg-gradient-to-br from-[#FFFDF7] to-[#FDF4E3] p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👥</span>
              <h4 className="font-display font-black text-[18px] text-[#1D2C4A]">
                Invite Friends, Unlock Perks
              </h4>
            </div>
            <p className="text-[12.5px] text-[#6D5C4D] font-medium mb-3">
              Bring 3 friends to BHALYAM and instantly unlock exclusive nostalgia rewards:
            </p>

            <ul className="space-y-2 mb-4 text-[12.5px] font-bold text-[#2A221B]">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>Exclusive Gold Avatar Frame</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>Nostalgia "Gang Leader" Chat Badge</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  ✓
                </span>
                <span>Retro 90s School Slate Board Theme</span>
              </li>
            </ul>

            {/* Step count */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-3 text-[12px] font-bold text-amber-900">
              <span>Referral Progress:</span>
              <span className="font-black text-amber-800">2 / 3 Friends Joined</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareWhatsAppReferral}
            className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-[14px] uppercase tracking-wider shadow-[0_4px_14px_rgba(37,211,102,0.35)] active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <WhatsappGlyph className="w-4 h-4 text-white" />
            <span>Invite on WhatsApp (+100 XP)</span>
          </button>
        </article>

      </div>
    </RevealOnScroll>
  );
}

/* ───────────────────────────── Live Lounge Pulse & Community Feed ───────────────────────────── */

function LiveLoungePulse({ onSelect }: { onSelect: (slug: BhalyamGameSlug) => void }) {
  const liveStats = [
    { label: "Players Online", value: 548, icon: "🟢", tone: "text-emerald-700" },
    { label: "Active Live Rooms", value: 68, icon: "🔥", tone: "text-orange-700" },
    { label: "School Gangs Active", value: 23, icon: "👥", tone: "text-blue-700" },
    { label: "Matches Won Today", value: 145, icon: "🎉", tone: "text-purple-700" },
  ];

  const communityTicker = [
    "🟢 Ravi won a 4-Player UNO match with a +4 counter!",
    "🔥 Ajay achieved a 5-match win streak in Hand Cricket!",
    "🎉 Pooja unlocked the 'Wildcard Queen' trophy in UNO",
    "⚡ 16 new rooms were created across Bangalore, Hyderabad, & Chennai",
    "👑 Suman invited 3 friends and unlocked the Retro Slate Theme!",
  ];
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % communityTicker.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [communityTicker.length]);

  return (
    <RevealOnScroll as="section" amount={0.1} className="my-6">
      {/* 4 Live Metric Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {liveStats.map((st) => (
          <div
            key={st.label}
            className="p-3.5 sm:p-4 rounded-2xl bg-[#FCF8EF] border border-[#E8D8BE] shadow-xs flex items-center gap-3"
          >
            <span className="text-2xl" aria-hidden>{st.icon}</span>
            <div>
              <div className={`text-[20px] sm:text-[24px] font-black ${st.tone} leading-tight`}>
                <CountUp to={st.value} />
              </div>
              <div className="text-[11.5px] sm:text-[12px] font-bold text-[#6D5C4D]">
                {st.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Community Feed & Leaderboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left 2 cols: Live Adda Feed */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-3xl bg-[#111927] text-white border border-white/15 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white animate-pulse">
                LIVE FEED
              </span>
              <h4 className="bhalyam-display text-[17px] text-amber-300">
                School Adda Activity
              </h4>
            </div>
            <span className="text-[11.5px] font-semibold text-zinc-400">
              Live updates • Zero lag
            </span>
          </div>

          <div className="my-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[13px] font-bold text-amber-100 min-h-[46px] flex items-center">
            {communityTicker[tickerIndex]}
          </div>

          <div className="flex items-center justify-between text-[11.5px] text-zinc-400 font-semibold mt-2 pt-2 border-t border-white/10">
            <span>🌟 Join a room to appear in the live feed</span>
            <button
              type="button"
              onClick={() => onSelect("uno")}
              className="text-amber-300 hover:text-amber-200 font-bold hover:underline cursor-pointer"
            >
              Play UNO Now →
            </button>
          </div>
        </div>

        {/* Right col: Weekly School Gang Leaderboard */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#FCF8EF] border border-[#E8D8BE] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-black text-[16px] text-[#1D2C4A]">
              Weekly Leaderboard 🏆
            </h4>
            <span className="text-[10.5px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              Gold League
            </span>
          </div>

          <div className="space-y-1.5 text-[12px] font-bold">
            <div className="p-2 rounded-xl bg-amber-100/70 border border-amber-300 flex items-center justify-between text-amber-950">
              <span>🥇 1. Ajay Kumar</span>
              <span className="font-black">2,450 XP</span>
            </div>
            <div className="p-2 rounded-xl bg-[#F5ECE0] flex items-center justify-between text-[#2A221B]">
              <span>🥈 2. Ravi Teja</span>
              <span className="font-black">2,100 XP</span>
            </div>
            <div className="p-2 rounded-xl bg-[#F5ECE0] flex items-center justify-between text-[#2A221B]">
              <span>🥉 3. Pooja Reddy</span>
              <span className="font-black">1,890 XP</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-between text-emerald-950">
              <span>🏅 4. You (Champion)</span>
              <span className="font-black">1,450 XP</span>
            </div>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}

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
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <InstagramGlyph className="w-4 h-4 text-[#E11D48]" />
                  <span>Instagram</span>
                </a>

                <a
                  href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <WhatsappGlyph className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:hello@bhalyam.app"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
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
                <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                  <li><Link to="/games" className="hover:text-[#E85D04] transition-colors">All Games</Link></li>
                  <li><a href="#rooms" className="hover:text-[#E85D04] transition-colors">Rooms</a></li>
                  <li><a href="#how-it-works" className="hover:text-[#E85D04] transition-colors">How It Works</a></li>
                  <li><a href="#leaderboard" className="hover:text-[#E85D04] transition-colors">Leaderboard</a></li>
                </ul>
              </div>

              {/* SUPPORT */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  SUPPORT
                </h4>
                <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                  <li><a href="#help" className="hover:text-[#E85D04] transition-colors">Help Center</a></li>
                  <li><a href="#safety" className="hover:text-[#E85D04] transition-colors">Safety Guide</a></li>
                  <li><a href="#rules" className="hover:text-[#E85D04] transition-colors">Community Rules</a></li>
                  <li><a href="#report" className="hover:text-[#E85D04] transition-colors">Report an Issue</a></li>
                </ul>
              </div>

              {/* COMPANY */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  COMPANY
                </h4>
                <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                  <li><a href="#about" className="hover:text-[#E85D04] transition-colors">About BHALYAM</a></li>
                  <li><a href="#story" className="hover:text-[#E85D04] transition-colors">Our Story</a></li>
                  <li><a href="#careers" className="hover:text-[#E85D04] transition-colors">Careers</a></li>
                  <li><a href="#press" className="hover:text-[#E85D04] transition-colors">Press Kit</a></li>
                </ul>
              </div>

              {/* LEGAL */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  LEGAL
                </h4>
                <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                  <li><Link to="/privacy" className="hover:text-[#E85D04] transition-colors">Privacy Notice</Link></li>
                  <li><a href="#terms" className="hover:text-[#E85D04] transition-colors">Terms of Service</a></li>
                  <li><Link to="/profile" className="hover:text-[#E85D04] transition-colors">Your Data &amp; Choices</Link></li>
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
                    className="bg-transparent text-[11.5px] text-[#4A2508] placeholder-[#9C7E63] px-2.5 focus:outline-none flex-1 min-w-0 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-[#E85D04] hover:bg-[#D45000] text-white text-[11.5px] font-bold rounded-lg px-3.5 py-1.5 transition-all shadow-xs active:scale-95 flex-shrink-0"
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
              <Link to="/privacy" className="hover:text-[#E85D04] transition-colors">Privacy Notice</Link>
              <span>•</span>
              <a href="#terms" className="hover:text-[#E85D04] transition-colors">Terms of Service</a>
              <span>•</span>
              <Link to="/profile" className="hover:text-[#E85D04] transition-colors">Your Data Choices</Link>
              <span>•</span>
              <a href="#cookies" className="hover:text-[#E85D04] transition-colors">Cookie Settings</a>
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
