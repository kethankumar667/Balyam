import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import { RevealOnScroll, RevealItem } from "../components/RevealOnScroll";
import GsapSplitHeadline from "../components/GsapSplitHeadline";
import CountUp from "../components/CountUp";
import { useTheme } from "../lib/useTheme";
import { tileHover, ctaPress, bhalyamSpring } from "../lib/motion";
import {
  BHALYAM_GAMES,
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
};

export default function BhalyamHome() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="bhalyam-home bhalyam-font min-h-screen bhalyam-paper flex flex-col">
      <Header onOpenJoin={() => setJoinOpen(true)} />
      <main className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pb-10 flex-1">
        <Hero />
        <GamesSection onSelect={setSheetGame} />
        <StatsStrip />
        <MiddlePanels />
        <UtilityStrip />
        <Footer />
      </main>
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <DesktopThemeToggle />
    </div>
  );
}

/**
 * Desktop-only floating theme toggle. Mobile uses the inline header version
 * (`MobileThemeToggle`) so the two never overlap. Both share state via
 * `useTheme` from lib/useTheme.
 */
function DesktopThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="hidden md:inline-flex fixed right-4 top-4 z-[90] h-11 px-4 rounded-full border shadow-lg
                 items-center gap-2 font-semibold text-sm backdrop-blur"
      style={{
        backgroundColor: "var(--surface-1)",
        color: "var(--text-hi)",
        borderColor: "var(--surface-3)",
      }}
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

function Header({ onOpenJoin }: { onOpenJoin: () => void }) {
  return (
    <header
      className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pt-4 sm:pt-5
                 flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
      <a href="/" className="flex items-center gap-2.5">
        <BhalyamLogo size={44} decorative />
        <span className="flex flex-col leading-none">
          <span className="text-[30px] font-black tracking-tight">BHALYAM</span>
          <span className="text-[12px] uppercase tracking-wider font-bold text-[#E95D21] -mt-0.5">
            Relive Childhood
          </span>
        </span>
      </a>

      <div className="hidden md:flex items-center gap-3">
        <div className="h-11 px-4 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm inline-flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#2BB44A]" aria-hidden />
          <span className="text-[14px] font-semibold text-[#365A37]">132 Players Online</span>
          <span className="inline-flex -space-x-2">
            {[
              { name: "R", tone: "#F37A65" },
              { name: "S", tone: "#77B7FF" },
              { name: "V", tone: "#FFCF52" },
            ].map((avatar) => (
              <span
                key={avatar.name}
                className="w-7 h-7 rounded-full border-2 border-[#FCF8EF] text-white text-[11px] font-bold inline-flex items-center justify-center"
                style={{ backgroundColor: avatar.tone }}
              >
                {avatar.name}
              </span>
            ))}
          </span>
          <span className="px-2 py-1 rounded-full bg-white text-[11px] font-bold text-bhalyam-wood-dark/70">
            +129
          </span>
        </div>
        <JoinRoomButton onClick={onOpenJoin} />
        <button
          type="button"
          className="h-11 px-5 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm
                     text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer
                     text-[#2A221B]
                     hover:bg-[#F8EEDB] active:translate-y-px
                     focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                     transition-colors duration-200"
          aria-label="How to Play"
        >
          <span className="w-5 h-5 rounded-full border border-[#2A221B]/35 text-[#2A221B] text-[12px] leading-none inline-flex items-center justify-center">?</span>
          How to Play
        </button>
      </div>

      <div className="md:hidden flex flex-wrap justify-end items-center gap-2 w-full">
        <JoinRoomButton onClick={onOpenJoin} compact />
        <MobileThemeToggle />
      </div>
    </header>
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
function JoinRoomButton({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
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
      aria-label="Join a room with a code"
      className={`${compact ? "h-10 px-3.5 text-[13px]" : "h-11 px-5 text-[14px]"}
                  rounded-full inline-flex items-center gap-2 cursor-pointer
                  bhalyam-gold-leaf bhalyam-cta-shine text-bhalyam-wood-dark font-bold
                  border border-bhalyam-gold-dark
                  hover:brightness-[1.04]
                  focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70 focus:ring-offset-2 focus:ring-offset-bhalyam-cream-soft
                  shadow-[0_4px_10px_-3px_rgba(228,177,40,0.55)]
                  transition-[filter,box-shadow] duration-200`}
    >
      <DoorPlusIcon className={compact ? "w-4 h-4" : "w-[18px] h-[18px]"} />
      <span>Join Room</span>
    </motion.button>
  );
}

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
 * Inline theme toggle for the mobile header — replaces the desktop-only
 * floating ThemeToggle on small screens. Both share `useTheme` so they stay
 * in sync if the user rotates from portrait to landscape mid-session.
 */
function MobileThemeToggle() {
  const [theme, toggle] = useTheme();
  const nextLabel = theme === "light" ? "Dark Mode" : "Light Mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="h-10 px-4 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm
                 text-[13px] font-semibold inline-flex items-center gap-2 text-[#2A221B]"
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
      {nextLabel}
    </button>
  );
}

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
        className="relative overflow-hidden rounded-[30px] border border-[#E2D3BA]
                   shadow-[0_14px_26px_-18px_rgba(74,44,22,0.4)] min-h-[200px] sm:min-h-auto"
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

        <div className="relative z-10 min-h-[360px] sm:min-h-[430px] lg:min-h-[470px] px-5 sm:px-7 lg:px-8 py-5 sm:py-6 hidden sm:flex items-start">
          <div className="max-w-[340px] sm:max-w-[390px] md:max-w-[420px]">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
              className="text-[12px] sm:text-[13px] uppercase tracking-[0.22em] font-extrabold text-[#7B2F0E]"
            >
              ✦ Welcome to the adda ✦
            </motion.div>

            {/* GSAP character-by-character headline reveal — uses the
                Righteous display font for that entertainment-poster feel,
                tri-tone colors echoing the brand orange/red/green. */}
            <GsapSplitHeadline
              className="mt-2 bhalyam-display tracking-tight text-[36px] sm:text-[52px] md:text-[60px] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]"
              lineClassName="leading-[0.95]"
              charStagger={0.022}
              lineDelay={0.16}
              lines={[
                { text: "Ready to",  className: "text-[#0E2D66]" },
                { text: "relive",    className: "bhalyam-gradient-text" },
                { text: "your",      className: "text-[#0E2D66]" },
                { text: "childhood?", className: "text-[#2E8E4C]" },
              ]}
            />

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.85, ease: [0.2, 0.7, 0.3, 1] }}
              className="mt-4 max-w-[360px] text-[14px] sm:text-[17px] leading-[1.4] text-[#2E231B] font-medium"
            >
              Pick a game, send the room code to your school WhatsApp group,
              and play instantly.
            </motion.p>

            {/* Handwritten Caveat accent — the "school slate" feel asked for
                by the ui-ux-pro-max Handwritten Charm pairing. */}
            <motion.p
              initial={{ opacity: 0, rotate: -2 }}
              animate={{ opacity: 1, rotate: -1.5 }}
              transition={{ duration: 0.6, delay: 1.05, ease: [0.34, 1.56, 0.64, 1] }}
              className="bhalyam-script text-[#7B2F0E] text-[22px] sm:text-[28px] mt-2"
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
              className="mt-5 sm:mt-6 min-h-[52px] sm:min-h-[56px] pl-5 pr-3 rounded-full border border-[#E7D9C1] bg-[#FFF8EE]
                         shadow-[0_8px_16px_-12px_rgba(0,0,0,0.35)] cursor-pointer
                         inline-flex items-center justify-between gap-4 max-w-[340px] sm:max-w-[380px] w-full
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/70"
            >
              <span className="text-left text-[13px] sm:text-[19px] leading-[1.05] font-extrabold text-[#2A221B]">
                Share on WhatsApp
                <span className="block text-[#5C4A38] font-semibold text-[11px] sm:text-[13px] mt-0.5">
                  Send the code in seconds
                </span>
              </span>
              <span className="w-10 h-10 rounded-full bg-[#25D366] border-2 border-white/65 inline-flex items-center justify-center" aria-hidden>
                <WhatsappGlyph className="w-5 h-5 text-white" />
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
        className="mb-3 sm:mb-4 flex items-end justify-between gap-3"
      >
        <div>
          <h2 className="bhalyam-display text-[#1D2C4A] text-[28px] sm:text-[44px] leading-tight">
            <span className="bhalyam-underline">Pick a game</span>
          </h2>
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ ...bhalyamSpring, delay: 0.15 }}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-bold bg-[#FFF4E4] text-[#EA5A1F] border border-[#F2D5A9] shadow-[0_4px_10px_-3px_rgba(234,90,31,0.45)]"
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
        {BHALYAM_GAMES.map((game) => (
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
    </section>
  );
}

function GameTile({
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

  const livePlayersByGame: Record<BhalyamGameSlug, string> = {
    handcricket: "4.8K playing",
    snl: "3.2K playing",
    ludo: "5.6K playing",
    rummy: "2.1K playing",
    rps: "1.6K playing",
    uno: "3.9K playing",
  };

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
  };

  const underMaintenance = game.maintenance === true;

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
      className={`group relative w-full ${compact ? "min-h-[220px]" : "min-h-[170px]"}
                 rounded-[22px] overflow-hidden text-left p-4 sm:p-5
                 flex flex-col gap-3
                 border border-[#F4D6B7]
                 cursor-pointer
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bhalyam-cream-soft
                 ${underMaintenance ? "cursor-not-allowed opacity-90" : "hover:shadow-[0_18px_32px_-14px_var(--tile-glow),_0_8px_18px_-8px_rgba(0,0,0,0.45)]"}
                 shadow-[0_13px_24px_-14px_rgba(74,44,22,0.45)]
                 transition-shadow duration-200
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
        className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[11px] font-bold ${
          underMaintenance
            ? "bg-amber-300 text-zinc-900"
            : "bg-white/20 text-white"
        }`}
      >
        {underMaintenance ? "Maintenance" : "Trending"}
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
        {game.teluguTitle && (
          <span className="text-[11px] tracking-widest uppercase font-bold opacity-90 leading-tight">
            {game.teluguTitle}
          </span>
        )}

        <span className="text-[13px] font-semibold opacity-95">
          {underMaintenance ? "Cooking it up" : livePlayersByGame[game.slug]}
        </span>

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

  if (imageFailed) {
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
            <button
              type="button"
              className="rounded-full px-4 py-2 bg-[#32B34F] text-white text-[14px] font-bold inline-flex items-center gap-1.5"
            >
              Continue <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-extrabold text-[22px] sm:text-[27px] leading-tight text-[#2A354D]">Top Achievements</h3>
          <button type="button" className="rounded-full px-3 py-1.5 bg-[#FAF2E6] border border-[#E8D8BE] text-[12px] sm:text-[13px] font-bold">
            View All
          </button>
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
        <AssetImg
          src="/gangoffriends.png"
          alt="Group of school friends"
          className="mt-3 w-full aspect-[16/9] rounded-xl border border-[#E6D4B8] bg-[#F7EFE0]"
          imgClassName="h-full w-full rounded-xl object-contain object-center p-1.5"
          placeholderClassName="w-full aspect-[16/9] rounded-xl"
        />
        <button
          type="button"
          className="mt-3 w-full rounded-full px-4 py-3 bg-[#25D366] text-white font-bold text-[16px] inline-flex items-center justify-center gap-2"
        >
          <span className="inline-flex h-7 w-7 rounded-full bg-white/20 items-center justify-center text-[14px]" aria-hidden>🟢</span>
          Invite on WhatsApp
        </button>
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
                 px-4 sm:px-6 py-3 sm:py-4
                 shadow-[0_10px_18px_-16px_rgba(63,38,19,0.35)]"
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {entries.map((entry, index) => (
          <li
            key={entry.title}
            className={`flex items-center gap-3 ${
              index > 0 ? "lg:border-l lg:border-[#E8D8BE] lg:pl-5" : ""
            }`}
          >
            <AssetImg
              src={entry.src}
              alt={entry.title}
              className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] flex-shrink-0"
              imgClassName={entry.imgClassName}
            />
            <span className="min-w-0">
              <p className="font-bold text-[#3F2F24] text-[16px] sm:text-[17px] leading-tight">
                {entry.title}
              </p>
              <p className="text-[#5B534A] text-[13px] sm:text-[14px] mt-1 leading-snug">
                {entry.blurb}
              </p>
            </span>
          </li>
        ))}
      </ul>
    </RevealOnScroll>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function Footer() {
  return (
    <footer className="mt-4 pb-8 pt-5">
      <div
        className="relative rounded-[28px] border border-[#E8D8BE] bg-[#FBF2E3]
                   px-4 sm:px-7 py-6 sm:py-7 overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-end min-h-[260px]">
          {/* LEFT — oversized hopscotch sketch with heart accent */}
          <div className="relative flex items-end justify-start gap-3 sm:gap-4">
            <AssetImg
              src="/hopscotch.png"
              alt="Childhood hopscotch sketch"
              className="w-[260px] h-[230px] sm:w-[320px] sm:h-[280px] flex-shrink-0 opacity-90"
              imgClassName="w-full h-full object-contain object-bottom"
            />
            <AssetImg
              src="/heart-beat.png"
              alt=""
              className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 mb-6"
              imgClassName="w-full h-full object-contain"
            />
          </div>

          {/* CENTER — BHALYAM + tagline + social icons */}
          <div className="text-center self-center">
            <h4 className="font-black text-[30px] sm:text-[38px] text-[#3C2A1E] leading-tight">
              BHALYAM
              <span className="text-[#6B4A34] mx-2">•</span>
              <span className="font-semibold">Relive Childhood</span>
            </h4>
            <p className="text-[15px] sm:text-[17px] text-[#5D4B3F] mt-2">
              Crafted for 90s kids
            </p>
            <div className="mt-5 flex justify-center items-center gap-5">
              <SocialIcon src="/whatsapp.png" alt="WhatsApp" href="#whatsapp" />
              <SocialIcon src="/instagram.png" alt="Instagram" href="#instagram" />
            </div>
          </div>

          {/* RIGHT — paperplane trail + booksbottle + schoolbag */}
          <div className="relative flex items-end justify-end gap-3 sm:gap-4 min-h-[260px]">
            <AssetImg
              src="/paperplane.png"
              alt=""
              className="absolute -top-2 right-4 w-[170px] sm:w-[210px] h-[90px] sm:h-[110px] opacity-95"
              imgClassName="w-full h-full object-contain"
            />
            <AssetImg
              src="/booksbottle.png"
              alt="Books and water bottle"
              className="w-[150px] h-[200px] sm:w-[190px] sm:h-[250px] flex-shrink-0"
              imgClassName="w-full h-full object-contain object-bottom"
            />
            <AssetImg
              src="/school%20bag.png"
              alt="School bag"
              className="w-[170px] h-[220px] sm:w-[220px] sm:h-[270px] flex-shrink-0"
              imgClassName="w-full h-full object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </footer>
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
