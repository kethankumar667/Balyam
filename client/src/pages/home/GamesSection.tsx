import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Users as UsersLucideIcon, Clock } from "lucide-react";
import { RevealOnScroll, RevealItem } from "../../components/RevealOnScroll";
import { bhalyamSpring, tileHover } from "../../lib/motion";
import { useTheme } from "../../lib/useTheme";
import { useAuthStore } from "../../store/authStore";
import CategoryFilter, {
  filterGames,
  type GameFilter,
} from "../../components/bhalyam/CategoryFilter";
import {
  isLocked,
  getGameAccent,
  type BhalyamGameCard,
  type BhalyamGameSlug,
} from "../../components/bhalyam/data";
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
  StarGameGlyph,
  BingoGlyph,
  BlockBlastGlyph,
} from "../../components/bhalyam/icons";
import { TILE_ART_BY_GAME } from "./gameArt";

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

/** Tiles the home grid shows before deferring to /games. */
const HOME_TILE_CAP = 6;

export function GamesSection({ onSelect }: { onSelect: (slug: BhalyamGameSlug) => void }) {
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
        className="mb-3 sm:mb-4 text-[13px] font-semibold text-[#5D4B3F] dark:text-slate-400"
        aria-live="polite"
      >
        {matches.length === 0
          ? "No games found in this category."
          : shown.length < matches.length
          ? `Showing ${shown.length} of ${matches.length} games.`
          : `${matches.length} game${matches.length === 1 ? "" : "s"}.`}
      </p>

      {matches.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl">
            🎲
          </div>
          <h3 className="text-base font-extrabold text-ink-hi dark:text-text-hi">No Games in this Filter</h3>
          <p className="text-xs text-ink-lo dark:text-text-lo max-w-sm mx-auto">
            Try switching to another category or explore all childhood classics.
          </p>
          <button
            type="button"
            onClick={() => setFilter({ category: "all" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Show All Games
          </button>
        </div>
      ) : (
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
      )}

      {/* "View all games" overflow link */}
      <div className="mt-4 sm:mt-5 flex justify-center">
        <Link
          to={filtered ? `/games?c=${filter.category}` : "/games"}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 min-h-[44px]
                     bg-[#FFFDF7] dark:bg-[#1E2739] border border-[#ECD9BA] dark:border-[#66799A] text-[var(--chrome-ink)] font-extrabold text-[14px]
                     hover:bg-[#FAF2DF] dark:hover:bg-[#27324A] active:translate-y-px
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0A0F1D]
                     shadow-[0_4px_10px_-3px_rgba(74,44,22,0.35)]
                     transition-all duration-200"
        >
          {filtered ? "View all in this filter" : "View all games"}
          <ArrowRight className="w-4 h-4" />
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
  const tileArtByGame = TILE_ART_BY_GAME;

  const [theme] = useTheme();
  const isDark = theme === "dark";
  const capabilities = useAuthStore((s) => s.capabilities);
  const underMaintenance = isLocked(game, capabilities);
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
