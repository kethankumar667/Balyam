import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useRoomStore } from "../store/roomStore";
import {
  BHALYAM_GAMES,
  isLocked,
  type BhalyamGameCard,
  type BhalyamGameSlug,
} from "../components/bhalyam/data";
import {
  ArrowRightIcon,
  HandCricketGlyph,
  LudoGlyph,
  RpsGlyph,
  RummyGlyph,
  SnakeLadderGlyph,
  UnoGlyph,
  WordBuildingGlyph,
  DotsBoxesGlyph,
  MemoryMatchGlyph,
  NamePlaceAnimalGlyph,
  TambolaGlyph,
  TeluguCinemaluGlyph,
  SamethaluGlyph,
  GamepadGlyph,
  StarGameGlyph,
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
  memorymatch: MemoryMatchGlyph,
  namesplaceanimal: NamePlaceAnimalGlyph,
  tambola: TambolaGlyph,
  samethalu: SamethaluGlyph,
  telugucinemalu: TeluguCinemaluGlyph,
  stargame: StarGameGlyph,
};

export default function BhalyamHome() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  // Warm the socket connection on landing so the first room create/join
  // doesn't pay the cold WebSocket handshake at click time (the emit was
  // previously buffered until the very first connect).
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <div className="bhalyam-home bhalyam-font min-h-screen bhalyam-paper flex flex-col overflow-x-hidden">
      <Header onOpenJoin={() => setJoinOpen(true)} />
      <main className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pb-10 flex-1">
        <Hero />
        <HeroJoinRoomRow onOpenJoin={() => setJoinOpen(true)} />
        <GamesSection onSelect={setSheetGame} />
        <StatsStrip />
        <MiddlePanels />
        <UtilityStrip />
        <Footer />
      </main>
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
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

function Header({ onOpenJoin }: { onOpenJoin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <BhalyamLogo size={44} decorative />
            <span className="flex flex-col leading-none min-w-0">
              <span className="bhalyam-display text-[24px] sm:text-[28px] lg:text-[32px] tracking-tight text-[#2A221B] truncate">
                BHALYAM
              </span>
              <span className="text-[10px] sm:text-[11px] lg:text-[12px] uppercase tracking-[0.18em] font-bold text-[#E95D21] -mt-0.5">
                Relive Childhood
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Joystick — quick jump to the full game catalog. Sits before
                the profile icon as requested; visible at every breakpoint
                (mobile is where it matters most but desktop benefits too). */}
            <IconCircleButton
              label="All games"
              onClick={() => navigate("/games")}
              icon={<GamepadGlyph className="w-[20px] h-[20px]" />}
            />
            <IconCircleButton
              label="Your profile"
              onClick={() => setProfileOpen(true)}
              icon={<UserGlyph className="w-[18px] h-[18px]" />}
            />
            <IconCircleButton
              label="Open menu"
              onClick={() => setMenuOpen(true)}
              icon={<HamburgerGlyph className="w-[20px] h-[20px]" />}
            />
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
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
      className="w-11 h-11 rounded-full inline-flex items-center justify-center cursor-pointer
                 bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm text-[#2A221B]
                 hover:bg-[#F8EEDB]
                 focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                 transition-colors duration-200"
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
            className="fixed top-0 right-0 bottom-0 z-[71] w-[86vw] max-w-[380px] sm:max-w-[420px]
                       bg-[#FBF2E3] border-l border-[#E8D8BE] shadow-[-12px_0_36px_-12px_rgba(0,0,0,0.55)]
                       flex flex-col"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 18px)" }}
          >
            <div className="flex items-center justify-between px-5 pb-4 border-b border-[#E8D8BE]">
              <div className="flex items-center gap-2 min-w-0">{titleLeft}</div>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.92 }}
                aria-label="Close"
                className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-white border border-[#E8D8BE] text-[#2A221B] flex-shrink-0"
              >
                <CloseGlyph className="w-4 h-4" />
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
 * feature. No navigation actions here; those live in MenuSheet. Showing
 * an empty placeholder is intentional so users know the real thing is
 * coming and to set expectations for the v1.1 release.
 */
function ProfileSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SheetShell
      open={open}
      onClose={onClose}
      ariaLabel="Your profile"
      titleLeft={
        <>
          <UserGlyph className="w-5 h-5 text-[#2A221B]" />
          <span className="bhalyam-display text-[20px] text-[#2A221B] tracking-tight">
            Profile
          </span>
        </>
      }
    >
      {/* Hero card — locked / coming soon state */}
      <div
        className="rounded-2xl p-5 border border-[#E0AE3B] bg-gradient-to-br from-[#FFF7E2] to-[#FBE7BD]
                   shadow-[0_4px_14px_-6px_rgba(228,177,40,0.55)] text-center"
      >
        <div className="mx-auto w-20 h-20 rounded-full bhalyam-gold-leaf flex items-center justify-center text-bhalyam-wood-dark mb-3 shadow-[0_8px_18px_-6px_rgba(228,177,40,0.55)]">
          <UserGlyph className="w-9 h-9" />
        </div>
        <div className="bhalyam-display text-[#2A221B] text-[22px] leading-tight">
          Your profile
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] bg-[#FFF4E4] text-[#E54D0D] border border-[#F2D5A9] mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E54D0D]" aria-hidden />
          Coming soon
        </span>
        <p className="bhalyam-script text-[#7B5024] text-[20px] leading-[1.15] mt-4">
          Sign in to make BHALYAM your own.
        </p>
      </div>

      {/* What's planned */}
      <div className="rounded-2xl p-4 border border-[#E8D8BE] bg-white">
        <div className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#7B5024] mb-3">
          What's coming
        </div>
        <ul className="space-y-3">
          <ProfilePerk
            icon={<TrophyGlyph className="w-5 h-5" />}
            title="Wins, streaks, and ranks"
            blurb="Track your hand-cricket centuries and Ludo championships."
          />
          <ProfilePerk
            icon={<FriendsGlyph className="w-5 h-5" />}
            title="Your school gang"
            blurb="Save friends so you can re-invite them in one tap."
          />
          <ProfilePerk
            icon={<UserGlyph className="w-5 h-5" />}
            title="One name, every room"
            blurb="No more typing your name into every join screen."
          />
          <ProfilePerk
            icon={<StarGlyph className="w-5 h-5" />}
            title="Custom avatars and badges"
            blurb="Earn the Slam-Book Champion badge by Week 4."
          />
        </ul>
      </div>

      {/* Notify-me CTA — disabled until the feature ships, but visible so
          users know it's intentional, not broken. */}
      <button
        type="button"
        disabled
        className="w-full h-12 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                   font-extrabold text-[14px] inline-flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
        aria-disabled="true"
      >
        <BellGlyph className="w-4 h-4" />
        Notify me when profile is live
      </button>
    </SheetShell>
  );
}

function ProfilePerk({
  icon,
  title,
  blurb,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-full bg-[#FFF8EE] border border-[#E8D8BE] inline-flex items-center justify-center text-[#7B5024] flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-extrabold text-[#2A221B] text-[13px] leading-tight">
          {title}
        </span>
        <span className="block text-[#5C4A38] text-[12px] mt-0.5 leading-snug">
          {blurb}
        </span>
      </span>
    </li>
  );
}

/**
 * Menu sheet — navigation only. Join Room, How to Play, theme toggle,
 * About. No profile content (that's the ProfileSheet's job).
 */
function MenuSheet({
  open,
  onClose,
  onOpenJoin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenJoin: () => void;
}) {
  const [theme, toggleTheme] = useTheme();
  const [showSettings, setShowSettings] = useState(false);
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
      {/* Live status */}
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
          icon={<DoorPlusIcon className="w-5 h-5" />}
          primary
        />
        <SheetAction
          label="How to play"
          hint="Quick rules for every game"
          onClick={onClose}
          icon={
            <span className="w-5 h-5 rounded-full border border-current text-current text-[11px] leading-none inline-flex items-center justify-center">?</span>
          }
        />
        <SheetAction
          label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          hint={theme === "light" ? "Easier on the eyes at night" : "Bright like a verandah"}
          onClick={toggleTheme}
          icon={theme === "light" ? <MoonGlyph className="w-5 h-5" /> : <SunGlyph className="w-5 h-5" />}
        />
        <SheetAction
          label={showSettings ? "Hide settings" : "Sound & vibration"}
          hint="Mute / theme / vibration toggle"
          onClick={() => setShowSettings((v) => !v)}
          icon={<GearGlyph className="w-5 h-5" />}
        />
        {showSettings && <GlobalSettings />}
        <SheetAction
          label="About BHALYAM"
          hint="Crafted for 90s Telugu kids"
          onClick={onClose}
          icon={<InfoGlyph className="w-5 h-5" />}
        />
      </nav>
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

function BellGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
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
      <ArrowRightIcon className="w-4 h-4 text-current opacity-60 group-hover:opacity-100 transition-opacity" />
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

/* MobileThemeToggle was removed — the mobile theme switch now lives
   inside MobileMenuSheet as a SheetAction so the header stays clean. */

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  const [heroImage, setHeroImage] = useState("/bhalyam-hero-clean.png");

  return (
    <RevealOnScroll
      as="section"
      amount={0.05}
      className="pt-2 pb-6 sm:pt-3 sm:pb-8"
    >
      <div
        className="relative overflow-hidden rounded-[24px] sm:rounded-[30px] border border-[#E2D3BA]
                   shadow-[0_14px_26px_-18px_rgba(74,44,22,0.4)]"
      >
        <img
          src={heroImage}
          alt="A wooden desk full of 90s Indian childhood memorabilia"
          className="bhalyam-hero-drift absolute inset-0 w-full h-full object-cover object-right"
          loading="eager"
          decoding="async"
          onError={() => {
            if (heroImage !== "/bhalyam-hero.png") {
              setHeroImage("/bhalyam-hero.png");
            }
          }}
        />

        {/* Left-anchored cream-to-transparent gradient so the headline +
            paragraph stay readable on top of the busy 90s-memorabilia
            artwork without dimming the artwork itself. Stronger on mobile
            (narrower viewport) than on desktop. */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "linear-gradient(100deg, rgba(255,248,224,0.92) 0%, rgba(255,248,224,0.78) 28%, rgba(255,248,224,0.42) 52%, rgba(255,248,224,0) 78%)",
          }}
        />

        {/* Text overlay — shown at EVERY breakpoint. Mobile font sizes are
            tuned proportionally so the same hierarchy reads cleanly on a
            320 px viewport. `min-w-0` on the inner container is critical:
            without it, flex children refuse to shrink and the headline
            spills past the rounded edge. */}
        <div
          className="relative z-10 px-4 sm:px-7 lg:px-8 py-4 sm:py-6 flex items-start"
          style={{ minHeight: "clamp(280px, 56vw, 470px)" }}
        >
          <div className="min-w-0 w-full sm:max-w-[390px] md:max-w-[420px]">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
              className="text-[10px] sm:text-[13px] uppercase tracking-[0.22em] font-extrabold text-[#7B2F0E]"
            >
              ✦ Welcome to the adda ✦
            </motion.div>

            {/* GSAP character-by-character headline reveal — Righteous
                display font, tri-tone brand colors. Headline scales with
                viewport via clamp so it never overruns the container even
                on 320 px phones (lowest expected width). */}
            <GsapSplitHeadline
              className="mt-1.5 sm:mt-2 bhalyam-display tracking-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]"
              lineClassName="leading-[0.95]"
              charStagger={0.022}
              lineDelay={0.16}
              style={{ fontSize: "clamp(22px, 7.5vw, 60px)" }}
              lines={[
                { text: "Ready to",  className: "text-[#0E2D66]" },
                { text: "relive",    className: "bhalyam-gradient-text" },
                { text: "your",      className: "text-[#0E2D66]" },
                { text: "childhood?", className: "text-[#2E8E4C]" },
              ]}
            />

            {/* Paragraph is desktop/tablet-only — mobile keeps the eyebrow,
                headline, handwritten accent, and CTA so the hero stays
                readable without scrolling. */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.85, ease: [0.2, 0.7, 0.3, 1] }}
              className="hidden sm:block mt-4 max-w-[340px] text-[17px] leading-[1.4] text-[#2E231B] font-medium"
            >
              Pick a game, send the room code to your school WhatsApp group,
              and play instantly.
            </motion.p>

            {/* Handwritten Caveat accent — the "school slate" feel asked for
                by the ui-ux-pro-max Handwritten Charm pairing. Sized via
                clamp so it never spills past the gradient on narrow
                phones, but still feels big on tablet/desktop. */}
            <motion.p
              initial={{ opacity: 0, rotate: -2 }}
              animate={{ opacity: 1, rotate: -1.5 }}
              transition={{ duration: 0.6, delay: 1.05, ease: [0.34, 1.56, 0.64, 1] }}
              className="bhalyam-script text-[#7B2F0E] mt-1.5 sm:mt-2 break-words"
              style={{ fontSize: "clamp(16px, 4.6vw, 28px)" }}
            >
              ~ Bring your school gang back together!
            </motion.p>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 1.15, ease: [0.2, 0.7, 0.3, 1] }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="mt-3 sm:mt-6 min-h-[44px] sm:min-h-[56px] pl-3 sm:pl-5 pr-2 sm:pr-3 rounded-full border border-[#E7D9C1] bg-[#FFF8EE]
                         shadow-[0_8px_16px_-12px_rgba(0,0,0,0.35)] cursor-pointer
                         inline-flex items-center justify-between gap-2.5 sm:gap-4 w-full sm:max-w-[380px]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/70
                         bhalyam-cta-shine min-w-0"
            >
              <span className="text-left leading-[1.1] font-extrabold text-[#2A221B] min-w-0 flex-1"
                    style={{ fontSize: "clamp(11px, 3.4vw, 19px)" }}>
                <span className="block truncate">Share on WhatsApp</span>
                <span className="block text-[#5C4A38] font-semibold mt-0.5 truncate"
                      style={{ fontSize: "clamp(9px, 2.8vw, 13px)" }}>
                  Send the code in seconds
                </span>
              </span>
              <span
                className="rounded-full bg-[#25D366] border-2 border-white/65 inline-flex items-center justify-center flex-shrink-0"
                style={{ width: "clamp(28px, 8.6vw, 40px)", height: "clamp(28px, 8.6vw, 40px)" }}
                aria-hidden
              >
                <WhatsappGlyph className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}

/* ───────────────────────────── Games grid ───────────────────────────── */

function GamesSection({ onSelect }: { onSelect: (slug: BhalyamGameSlug) => void }) {
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
      </RevealOnScroll>

      <RevealOnScroll
        as="ul"
        staggerChildren
        amount={0.08}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        {/* Home only shows the first 6 — order in BHALYAM_GAMES keeps the
            playable games on top. Everything else lives at /games. */}
        {BHALYAM_GAMES.slice(0, 6).map((game) => (
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

      {/* "View all games" overflow link — sends curious players to the
          dedicated /games page where every tile (including coming-soon
          maintenance ones) is laid out without the 6-tile cap.

          Text color note: text-[#1D2C4A] gets force-mapped to cream by
          the dark-mode override (so "Pick a game" titles stay readable
          on dark parchment) — but THIS element has a cream background
          even in dark mode, which made the label cream-on-cream and
          invisible. text-[#2A221B] is only remapped when paired with
          .bhalyam-display, so it stays warm-near-black here in both
          themes — readable on cream in either mode. */}
      <div className="mt-4 sm:mt-5 flex justify-center">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5
                     bg-[#FCF8EF] border border-[#EEDCC2] text-[#2A221B] font-extrabold text-[14px]
                     hover:bg-[#F8EEDB] active:translate-y-px
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     shadow-[0_4px_10px_-3px_rgba(74,44,22,0.35)]
                     transition-colors duration-200"
        >
          View all games
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
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

  // const livePlayersByGame: Record<BhalyamGameSlug, string> = {
  //   handcricket: "4.8K playing",
  //   snl: "3.2K playing",
  //   ludo: "5.6K playing",
  //   rummy: "2.1K playing",
  //   rps: "1.6K playing",
  //   uno: "3.9K playing",
  // };

  const titleClassName = game.title.length > 12
    ? "font-black text-[22px] sm:text-[30px] leading-[0.95] tracking-tight break-words"
    : "font-black text-[28px] sm:text-[34px] leading-[0.9] tracking-tight break-words";

  const tileArtByGame: Record<BhalyamGameSlug, string> = {
    handcricket: "/HandCricketTile.png",
    snl: "/S&LTile.png",
    ludo: "/LudoTile.png",
    rummy: "/RummyTile.png",
    rps: "/RPSTile.png",
    uno: "/UNOTile.png",
    wordbuilding: "/words_building.png",
    dotsboxes: "/Dots&boxes.png",
    memorymatch: "/Memory match cards.png",
    namesplaceanimal: "/Name-place-thing-animal.png",
    tambola: "/Tambola.png",
    // No bespoke art shipped yet for Samethalu — falls through to the
    // gradient + glyph layer (palm-leaf manuscript icon).
    samethalu: "/SamethaluTile.png",
    telugucinemalu: "/telugu cinemalu.png",
    // No bespoke art shipped yet — falls through to the gradient + star glyph.
    stargame: "/StarTile.png",
  };

  const underMaintenance = isLocked(game);
  const showMaintenance = game.maintenance === true;

  // Accent-tinted glow color for the hover shadow — pulled from the tile's
  // gradient end-stop so each tile glows in its own brand color.
  const tileGlowVar = { ["--tile-glow" as string]: `${game.accent.to}aa` } as React.CSSProperties;

  return (
    <motion.button
      type="button"
      onClick={underMaintenance ? undefined : onSelect}
      disabled={underMaintenance}
      variants={underMaintenance ? undefined : tileHover}
      initial="rest"
      whileHover={underMaintenance ? undefined : "hover"}
      whileTap={underMaintenance ? undefined : "tap"}
      transition={bhalyamSpring}
      className={`group relative w-full ${compact ? "h-[210px] sm:h-[228px]" : "min-h-[165px]"}
                 rounded-[22px] overflow-hidden text-left p-4 sm:p-5
             flex flex-col gap-2.5
                 border border-[#F4D6B7]
                 cursor-pointer
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bhalyam-cream-soft
                 ${underMaintenance ? "cursor-not-allowed opacity-90" : "hover:shadow-[0_18px_32px_-14px_var(--tile-glow),_0_8px_18px_-8px_rgba(0,0,0,0.45)]"}
                 shadow-[0_13px_24px_-14px_rgba(74,44,22,0.45)]
                 transition-shadow duration-200
                 bhalyam-cta-shine
                 ${className ?? ""}`}
      style={{
        background: underMaintenance
          ? `linear-gradient(145deg, ${game.accent.from}99, ${game.accent.to}99)`
          : `linear-gradient(145deg, ${game.accent.from}, ${game.accent.to})`,
        color: "#FFF7E7",
        ...tileGlowVar,
      }}
      aria-label={underMaintenance ? `${game.title} — under maintenance` : `Play ${game.title}`}
      aria-disabled={underMaintenance || undefined}
    >
      <span
        className={`absolute right-3 top-3 rounded-full px-2.5 py-[3px] text-[10.5px] font-bold tracking-tight shadow-[0_2px_6px_-2px_rgba(0,0,0,0.4)] ${
          showMaintenance
            ? "bg-amber-200/95 text-amber-900 border border-amber-400/60"
            : " text-white border border-white/15"
        }`}
      >
        {showMaintenance ? "Maintenance" : "Trending"}
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full
                   bg-bhalyam-cream-soft/15 blur-3xl"
      />

      <GameTileArt src={tileArtByGame[game.slug]} title={game.title} compact={compact}>
        <span
          className="relative inline-flex w-14 h-14 rounded-2xl items-center justify-center
                     bg-bhalyam-cream-soft/22 backdrop-blur-sm flex-shrink-0 mt-3"
        >
          <Glyph className="w-8 h-8" />
        </span>
      </GameTileArt>

      <div className="relative mt-auto flex flex-col gap-1.5 min-w-0">
        <span className={titleClassName}>
          {game.title}
        </span>
        {/* Nostalgic edition label — italicised + small caps so it reads as
            a book inscription, not a tagline. Phase 2 board treatments
            derive their aesthetic from this label. */}
        {game.theme && (
          <span
            className="text-[10.5px] tracking-[0.18em] uppercase font-bold leading-tight italic"
            style={{ color: "rgba(255,247,231,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
          >
            {game.theme}
          </span>
        )}
        {game.teluguTitle && (
          <span className="text-[11px] tracking-widest uppercase font-bold opacity-90 leading-tight">
            {game.teluguTitle}
          </span>
        )}

        {/* <span className="text-[13px] font-semibold opacity-95">
          {underMaintenance ? "Cooking it up" : livePlayersByGame[game.slug]}
        </span> */}

        {underMaintenance ? (
          <span
            className="inline-flex items-center gap-1 w-fit
                       rounded-full bg-amber-200/95 text-zinc-900
                       px-4 py-1.5 text-[13px] font-bold
                       shadow-[0_3px_6px_-1px_rgba(0,0,0,0.25)]"
          >
            Coming Soon
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 w-fit
                       rounded-full bg-bhalyam-cream-soft text-bhalyam-wood-dark
                       px-4 py-1.5 text-[13px] font-bold
                       shadow-[0_3px_6px_-1px_rgba(0,0,0,0.25)]
                       group-active:translate-y-px transition-transform duration-150"
          >
            Quick Play <ArrowRightIcon className="w-3 h-3" />
          </span>
        )}
      </div>
    </motion.button>
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

  // No bespoke tile art (e.g. Word Building) — fall through to the glyph
  // layer directly instead of rendering a broken <img>.
  if (!src || imageFailed) {
    return <>{children}</>;
  }

  const imageClass = compact
    ? "mt-1 h-[86px] sm:h-[92px] w-auto max-w-[62%]"
    : "mt-0.5 h-[88px] sm:h-[96px] w-auto max-w-[52%]";

  return (
    <img
      src={src}
      alt={`${title} icon`}
      className={`relative ${imageClass} object-contain object-left-top`}
      style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" }}
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
    />
  );
}

function StatsStrip() {
  const items: {
    icon: string;
    metric: string;
    label: string;
    tone: string;
    countTo?: number;
    suffix?: string;
  }[] = [
    { icon: "O",  metric: "12543",        label: "Kids Reliving Childhood Today", tone: "#F6A23A", countTo: 12543 },
    { icon: "T",  metric: "98765",        label: "Games Played This Week",        tone: "#F2C14E", countTo: 98765 },
    { icon: "*",  metric: "250",          label: "School Groups Connected",       tone: "#9277E8", countTo: 250, suffix: "+" },
    { icon: "<3", metric: "Made with love", label: "for 90s kids",                tone: "#F27373" },
  ];

  return (
    <RevealOnScroll
      as="section"
      amount={0.2}
      className="mt-4 rounded-3xl border border-[#E8D8BE] bg-[#F8EEDB] px-3 sm:px-5 py-3 sm:py-4"
    >
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, index) => (
          <motion.li
            key={item.metric}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.2, 0.7, 0.3, 1] }}
            className={`flex items-center gap-2 sm:gap-2.5 ${index > 0 ? "lg:border-l lg:border-[#EBDDC7] lg:pl-4" : ""}`}
          >
            <motion.span
              whileHover={{ scale: 1.12, rotate: -6 }}
              transition={bhalyamSpring}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full inline-flex items-center justify-center text-white font-bold text-[11px] sm:text-[12px] cursor-default"
              style={{
                backgroundColor: item.tone,
                boxShadow: `0 4px 12px -3px ${item.tone}99`,
              }}
              aria-hidden
            >
              {item.icon}
            </motion.span>
            <span className="leading-tight">
              <span className="block text-[#2FA25A] font-black text-[18px] sm:text-[30px] tabular-nums">
                {item.countTo != null ? (
                  <CountUp to={item.countTo} suffix={item.suffix ?? ""} />
                ) : (
                  item.metric
                )}
              </span>
              <span className="block text-[#677080] text-[10px] sm:text-[14px]">{item.label}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </RevealOnScroll>
  );
}

function MiddlePanels() {
  const lastGangs = useRoomStore((s) => s.lastGangs);

  // "Last gang" memory (docs/rummy/roadmap.md A.5) — re-invite a
  // previously-named Rummy table straight to WhatsApp. No room exists yet
  // at this point (home screen, pre-creation), so the message invites the
  // gang back to start a fresh one rather than carrying a stale code.
  function shareGang(roomName: string): void {
    const text = `🎴 "${roomName}" — same gang, one more round? Let's play on BHALYAM!\n${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function shareGeneric(): void {
    const text = `🎮 Come play with me on BHALYAM — pick a game and I'll send you the room code!\n${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <RevealOnScroll
      as="section"
      staggerChildren
      amount={0.1}
      className="middle-panels mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch"
    >
      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8C4A3] bg-[#FBF4E8] text-[15px]" aria-hidden>
            🎮
          </span>
          <h3 className="font-extrabold text-[22px] sm:text-[27px] text-[#2A354D] leading-tight">Continue Playing</h3>
        </div>
        <div className="mt-3 rounded-xl bg-[#EFE2CF] border border-[#E6D4B8] p-3">
          <AssetImg
            src="/HandCricketTile.png"
            alt="Hand Cricket"
            className="h-36 w-full rounded-lg border border-[#E3D2B5] bg-[#F7EFE0]"
            imgClassName="h-full w-full rounded-lg object-contain object-center p-1.5"
            placeholderClassName="h-36 w-full rounded-lg"
          />
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="font-extrabold text-[25px] text-[#273248]">Hand Cricket</p>
              <p className="text-[15px] text-[#6D7584]">Last played 2 days ago</p>
            </div>
            <motion.button
              type="button"
              variants={ctaPress}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              transition={bhalyamSpring}
              className="rounded-full px-4 py-2 bg-[#32B34F] text-white text-[14px] font-bold inline-flex items-center gap-1.5 bhalyam-cta-shine"
            >
              <span className="inline-flex items-center gap-1.5">
                Continue <ArrowRightIcon className="w-3.5 h-3.5" />
              </span>
            </motion.button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-extrabold text-[22px] sm:text-[27px] leading-tight text-[#2A354D]">Top Achievements</h3>
          <motion.button
            type="button"
            variants={ctaPress}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            transition={bhalyamSpring}
            className="rounded-full px-3 py-1.5 bg-[#FAF2E6] border border-[#E8D8BE] text-[12px] sm:text-[13px] font-bold bhalyam-cta-shine"
          >
            View All
          </motion.button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {[
            ["Gully Cricket Champion", "Play 100 Cricket Matches"],
            ["Ludo King", "Win 50 Ludo Games"],
            ["Paramapada Pandit", "Climb 100 Ladders"],
            ["Rummy Master", "Win 25 Rummy Games"],
          ].map(([title, desc]) => (
            <li key={title} className="rounded-lg bg-[#EFE2CF] border border-[#E6D4B8] px-3 py-2.5 flex items-center justify-between gap-3">
              <span>
                <span className="block font-bold text-[#2E3C57] text-[13px] sm:text-[14px] leading-tight">{title}</span>
                <span className="block text-[#6E7482] text-[10px] sm:text-[11px] leading-tight mt-0.5">{desc}</span>
              </span>
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#F0C15F] flex-shrink-0" aria-hidden />
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5 relative overflow-hidden">
        <h3 className="font-extrabold text-[22px] sm:text-[27px] text-[#2A354D] inline-flex items-center gap-2.5 leading-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8C4A3] bg-[#FBF4E8] text-[15px]" aria-hidden>
            👥
          </span>
          Invite Your Friends
        </h3>
        <p className="mt-1 text-[14px] sm:text-[16px] text-[#5F6A79]">Relive old memories with your school gang</p>
        {lastGangs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lastGangs.map((g) => (
              <button
                key={g.roomName}
                type="button"
                onClick={() => shareGang(g.roomName)}
                title={`Re-invite ${g.roomName} (last played with ${g.playerNames.join(", ")})`}
                className="rounded-full px-3 py-1.5 bg-[#FAF2E6] border border-[#E8D8BE] text-[12px] sm:text-[13px]
                           font-bold text-[#2A354D] hover:bg-[#F0E6D2] active:translate-y-px transition-colors
                           inline-flex items-center gap-1.5"
              >
                <span aria-hidden>🔁</span>
                Re-invite {g.roomName}
              </button>
            ))}
          </div>
        )}
        <AssetImg
          src="/gangoffriends.png"
          alt="Group of school friends"
          className="mt-3 w-full aspect-[16/9] rounded-xl border border-[#E6D4B8] bg-[#F7EFE0]"
          imgClassName="h-full w-full rounded-xl object-contain object-center p-1.5"
          placeholderClassName="w-full aspect-[16/9] rounded-xl"
        />
        <motion.button
          type="button"
          onClick={shareGeneric}
          variants={ctaPress}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          transition={bhalyamSpring}
          className="mt-3 w-full rounded-full px-4 py-3 bg-[#25D366] text-white font-bold text-[16px] inline-flex items-center justify-center gap-2 bhalyam-cta-shine"
        >
          <span className="inline-flex h-7 w-7 rounded-full bg-white/20 items-center justify-center" aria-hidden>
            <WhatsappGlyph className="w-4 h-4 text-white" />
          </span>
          <span>Invite on WhatsApp</span>
        </motion.button>
      </article>
    </RevealOnScroll>
  );
}

/**
 * Drop-in <img> that falls back to a labelled dashed-box placeholder when
 * the file isn't in /public yet. That way a missing asset shows a visible
 * "this is what's missing: foo.png" marker instead of a broken image, and
 * the rest of the layout doesn't collapse around it.
 *
 * `src` is URL-encoded automatically (browsers do this, but we set the
 * key from the encoded form so React sees a stable URL).
 */
function AssetImg({
  src,
  alt,
  className,
  imgClassName,
  placeholderClassName,
  placeholderLabel,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  placeholderLabel?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const resolvedSrc =
    retryNonce === 0
      ? src
      : `${src}${src.includes("?") ? "&" : "?"}retry=${retryNonce}`;

  // Clear stale "failed" state when src changes during hot reload/live edits.
  useEffect(() => {
    setFailed(false);
    setRetryNonce(0);
  }, [src]);

  // Retry once after a brief delay so temporary dev-server / cache hiccups
  // do not leave the UI permanently stuck on fallback placeholders.
  useEffect(() => {
    if (!failed || retryNonce > 0) return;
    const timer = window.setTimeout(() => {
      setFailed(false);
      setRetryNonce(1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [failed, retryNonce]);

  // Filename portion of the URL — what to show the developer in the
  // placeholder so they know which asset to drop in.
  const label =
    placeholderLabel ??
    decodeURIComponent(src.split("/").filter(Boolean).pop() ?? "missing.png");

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-flex items-center justify-center
                    border-2 border-dashed border-[#C5A576]
                    bg-[#FBF1DC] text-[#7A5B36]
                    text-[10px] font-mono text-center px-1.5 py-1 leading-tight
                    ${placeholderClassName ?? ""}
                    ${className ?? ""}`}
      >
        {label}
      </span>
    );
  }

  // `className` sizes the slot (e.g. w-[96px] h-[96px]); `imgClassName`
  // styles the artwork inside that slot (object-contain, scale, etc.).
  // We must NOT slap both on the <img> element or the inner `w-full`
  // collides with the outer `w-[96px]` on small screens — Tailwind has
  // no ordering guarantee for two width utilities on the same element,
  // and on mobile `w-full` was winning, blowing the icon out to the row
  // width and squeezing neighbouring text. Wrap so each className lands
  // on its own element.
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className ?? ""}`}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setFailed(false)}
        onError={() => setFailed(true)}
        className={imgClassName ?? "w-full h-full object-contain"}
      />
    </span>
  );
}

/* ───────────────────────────── Utility strip ───────────────────────────── */

function UtilityStrip() {
  const entries = [
    {
      src: "/retroradio.png",
      title: "Retro Sounds",
      blurb: "Relive the 90s with classic game sounds 🎵",
      imgClassName: "w-full h-full object-contain scale-[1.35]",
    },
    {
      // The file in /public has an ampersand; URL-encode it so it's
      // unambiguously requested.
      src: "/dark&Light.png",
      title: "Day / Night Theme",
      blurb: "Play in your favorite 90s vibes",
      imgClassName: "w-full h-full object-contain scale-[1.5]",
    },
    {
      // Space in the filename → URL-encode.
      src: "/safety%20shield.png",
      title: "Safe & Ad-free",
      blurb: "100% safe for nostalgic fun",
      imgClassName: "w-full h-full object-contain scale-[1.4]",
    },
    {
      src: "/mobile.png",
      title: "Works on Mobile",
      blurb: "Play with friends anytime, anywhere",
      imgClassName: "w-full h-full object-contain scale-[1.45]",
    },
  ];

  return (
    <UtilityStripBody entries={entries} />
  );
}

function UtilityStripBody({
  entries,
}: {
  entries: {
    src: string;
    title: string;
    blurb: string;
    imgClassName: string;
  }[];
}) {
  return (
    <RevealOnScroll
      as="section"
      staggerChildren
      amount={0.15}
      className="mt-4 rounded-3xl border border-[#E6D4B7] bg-[#F8EFDE]
                 px-4 sm:px-6 py-5 sm:py-6
                 shadow-[0_10px_18px_-16px_rgba(63,38,19,0.35)]"
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {entries.map((entry, index) => (
          <RevealItem key={entry.title}>
            <li
              className={`flex flex-col items-center text-center gap-4`}
            >
              <AssetImg
                src={entry.src}
                alt={entry.title}
                className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] flex-shrink-0"
                imgClassName={entry.imgClassName}
              />
              <span className="min-w-0">
                <p className="font-bold text-[#3F2F24] text-[18px] sm:text-[19px] lg:text-[20px] leading-tight">
                  {entry.title}
                </p>
                <p className="text-[#5B534A] text-[14px] sm:text-[15px] lg:text-[16px] mt-2 leading-snug">
                  {entry.blurb}
                </p>
              </span>
            </li>
          </RevealItem>
        ))}
      </ul>
    </RevealOnScroll>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

/**
 * Footer — designed as a single-flow "closing chapter" rather than a
 * cluttered three-column gallery. Centred composition reads as a polished
 * publication colophon: wordmark → handwritten quote → social row → fine
 * print, with subtle SVG decorations in the corners replacing the
 * placeholder-showing PNGs.
 *
 * Animations:
 *   - Whole block scroll-reveals (RevealOnScroll)
 *   - Quote rotates in slightly tilted via Caveat
 *   - Social pills get spring hover via Framer Motion
 */
function Footer() {
  return (
    <footer className="mt-6 pb-10 pt-6">
      <RevealOnScroll
        as="div"
        className="relative rounded-[32px] border border-[#E8D8BE]
                   overflow-hidden px-5 sm:px-10 py-10 sm:py-14"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #FFF6E2 0%, #FBF2E3 55%, #F2DFA8 100%)",
          boxShadow: "0 18px 36px -22px rgba(74,44,22,0.45)",
        }}
      >
        {/* Decorative corner sprigs — pure SVG so nothing depends on a
            missing asset file. Hidden on small screens to keep the centre
            readable. */}
        <CornerSprig className="hidden sm:block absolute -top-4 -left-4 w-32 text-[#D4A574]/55 rotate-[-12deg]" />
        <CornerSprig className="hidden sm:block absolute -bottom-6 -right-6 w-36 text-[#D4A574]/55 rotate-[160deg]" />

        <div className="relative max-w-[680px] mx-auto text-center">
          {/* Wordmark — Righteous display + animated gradient on the
              "Relive Childhood" tagline. */}
          <motion.h4
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
            className="bhalyam-display text-[32px] sm:text-[44px] text-[#3C2A1E] leading-[1.05]"
          >
            <span>BHALYAM</span>
            <span className="bhalyam-gradient-text px-3">-</span>
            <span className="bhalyam-gradient-text">Relive Childhood</span>
          </motion.h4>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.2, 0.7, 0.3, 1] }}
            className="text-[13px] sm:text-[15px] uppercase tracking-[0.22em] font-bold text-[#7B2F0E] mt-3"
          >
            Crafted for 90's kids
          </motion.p>

          {/* Handwritten Caveat quote, slightly tilted */}
          <motion.blockquote
            initial={{ opacity: 0, rotate: -2.5, y: 12 }}
            whileInView={{ opacity: 1, rotate: -1.5, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="bhalyam-script text-[#5D3819] text-[26px] sm:text-[34px] leading-[1.18] mt-7 max-w-[560px] mx-auto px-4"
          >
            “You don't stop playing because you grow old.
            <span className="block">
              You grow old because you stop playing.”
            </span>
          </motion.blockquote>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-[#7B5024] text-[12px] sm:text-[13px] uppercase tracking-widest font-bold mt-3"
          >
            — dedicated to every 90s kid, every weekend
          </motion.div>

          {/* Decorative gold divider with center dot */}
          <div className="mt-8 flex items-center justify-center gap-3" aria-hidden>
            <span className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#C9A04C]" />
            <span className="w-2 h-2 rounded-full bg-[#E0AE3B] shadow-[0_0_8px_rgba(228,177,40,0.7)]" />
            <span className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#C9A04C]" />
          </div>

          {/* Game owner — the single human behind every pixel. Visually
              treated as the colophon's centrepiece: gold-lettered "Built
              by" overline, a script-styled name that swings in on scroll,
              a small attribution line. Lifted off the rest of the
              footer's flow so the eye lands here and lingers. */}
          <GameOwnerSignature />

          {/* Slim decorative pair to close the signature block before the
              social row picks up below. */}
          <div className="mt-7 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#C9A04C]/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#E0AE3B]/85" />
            <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#C9A04C]/70" />
          </div>

          {/* Social pill row — three premium chips with spring hover. */}
          <div className="mt-6 flex justify-center items-center gap-3 sm:gap-4 flex-wrap">
            <SocialPill
              href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
              label="WhatsApp"
              tone="#25D366"
              icon={<WhatsappGlyph className="w-5 h-5 text-white" />}
            />
            <SocialPill
              href="https://www.instagram.com/"
              label="Instagram"
              tone="linear-gradient(135deg, #E11D48 0%, #F97316 50%, #7C3AED 100%)"
              icon={<InstagramGlyph className="w-5 h-5 text-white" />}
            />
            <SocialPill
              href="mailto:hello@bhalyam.app"
              label="Email us"
              tone="#1E40AF"
              icon={<MailGlyph className="w-5 h-5 text-white" />}
            />
          </div>

          {/* Fine print */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#7B5024]">
            <div className="font-semibold">
              © {new Date().getFullYear()} BHALYAM · A Kethan Kumar Gontla project
            </div>
            <div className="inline-flex items-center gap-1.5 font-semibold sm:text-[12px] text-[#7B5024]">
              Built solo with
              <HeartGlyph className="w-3.5 h-3.5 text-[#E11D48]" />
              for every school-gang reunion
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </footer>
  );
}

/**
 * Signature block for the builder. Sized to feel like a personally
 * signed colophon — the "Built by" overline reads like a credit, the
 * name itself lands in the same handwritten Caveat script the quote
 * uses (so the human voice continues from the quote into the name),
 * and the line underneath frames it as a labour of love rather than
 * a corporate signoff.
 *
 *   • Whole block scroll-reveals.
 *   • Name pops in with a small bounce + underline draw.
 *   • The small sparkle row underneath connects the eye downward
 *     into the social pills.
 */
function GameOwnerSignature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }}
      className="mt-7 relative"
    >
      <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-bold text-[#A5743A]">
        — Built &nbsp;·&nbsp; Designed &nbsp;·&nbsp; Loved by —
      </div>

      <motion.div
        initial={{ opacity: 0, rotate: -2, scale: 0.94 }}
        whileInView={{ opacity: 1, rotate: -1.5, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative inline-block mt-3"
      >
        <span
          className="bhalyam-script block text-[40px] sm:text-[56px] leading-[1.05]"
          style={{
            background:
              "linear-gradient(120deg, #B45309 0%, #E0AE3B 40%, #B45309 60%, #7B2F0E 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 2px 0 rgba(255,246,226,0.4)",
            filter: "drop-shadow(0 4px 6px rgba(122,77,28,0.25))",
          }}
        >
          Kethan Kumar Gontla
        </span>
        {/* Hand-drawn underline */}
        <motion.svg
          aria-hidden
          viewBox="0 0 320 14"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-[14px]"
        >
          <motion.path
            d="M4 8 C 60 1, 120 12, 180 5 S 290 11, 316 6"
            stroke="#E0AE3B"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.95 }}
        className="mt-5 flex flex-col items-center gap-1.5"
      >
        <div className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-bold text-[#5D3819]">
          <SparkleGlyph className="w-3.5 h-3.5 text-[#E0AE3B]" />
          <span>Game Owner · Architect · Solo Maker</span>
          <SparkleGlyph className="w-3.5 h-3.5 text-[#E0AE3B]" />
        </div>
        <div
          className="bhalyam-script text-[#7B5024] text-[18px] sm:text-[20px] leading-tight max-w-[480px] text-center px-3"
          style={{ transform: "rotate(-1deg)" }}
        >
          “Every tile, every sound, every late-night fix —
          <span className="block">handcrafted so a 90s kid could play again.”</span>
        </div>
        <div className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.28em] font-bold text-[#A5743A] mt-1">
          SPSR.Nellore · India
        </div>
      </motion.div>
    </motion.div>
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

function CornerSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden>
      <path
        d="M10 60 Q30 30 60 30 Q90 30 110 60"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="22" cy="48" r="2.2" fill="currentColor" />
      <circle cx="36" cy="38" r="2.5" fill="currentColor" />
      <circle cx="60" cy="32" r="2.8" fill="currentColor" />
      <circle cx="84" cy="38" r="2.5" fill="currentColor" />
      <circle cx="98" cy="48" r="2.2" fill="currentColor" />
      <path
        d="M60 32 L60 52"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M52 78 Q60 70 68 78"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SocialPill({
  href,
  label,
  tone,
  icon,
}: {
  href: string;
  label: string;
  tone: string;
  icon: React.ReactNode;
}) {
  const usesGradient = tone.startsWith("linear-gradient");
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ y: -3, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 bg-white border border-[#E7D9C1] text-[#3C2A1E] font-bold text-[13px] sm:text-[14px] shadow-[0_4px_10px_-3px_rgba(74,44,22,0.35)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E0AE3B]/70"
    >
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full"
        style={usesGradient ? { backgroundImage: tone } : { backgroundColor: tone }}
        aria-hidden
      >
        {icon}
      </span>
      <span>{label}</span>
    </motion.a>
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

function SocialIcon({
  src,
  alt,
  href,
}: {
  src: string;
  alt: string;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-label={alt}
      className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden
                 shadow-[0_5px_10px_-6px_rgba(0,0,0,0.45)]
                 hover:scale-105 active:scale-95 transition-transform duration-150"
    >
      <AssetImg
        src={src}
        alt={alt}
        className="w-full h-full"
        imgClassName="w-full h-full object-cover"
      />
    </a>
  );
}
