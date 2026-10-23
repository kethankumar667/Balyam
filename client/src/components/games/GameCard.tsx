import { useEffect, useState, type ReactNode } from "react";
import { Users, Clock, ArrowRight, Heart, Star, Gamepad2 } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { useAuthStore } from "../../store/authStore";
import { useFavourites } from "../../hooks/useFavourites";
import { useToast } from "../../hooks/useToast";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { type BhalyamGameCard, getGameAccent, isLocked } from "../bhalyam/data";
import { calmTileSurface, gameCardCategory, HYBRID_CATEGORIES, hybridTileSurface, lightTileSurface } from "../bhalyam/tileColors";
import { TILE_ART_BY_GAME } from "../../pages/home/gameArt";
import {
  HandCricketGlyph, LudoGlyph, RpsGlyph, RummyGlyph, SnakeLadderGlyph, UnoGlyph,
  WordBuildingGlyph, DotsBoxesGlyph, NamePlaceAnimalGlyph, TambolaGlyph,
  StarGameGlyph, BingoGlyph, BlockBlastGlyph, TicTacToeGlyph, Connect4Glyph,
  VamanaGuntaluGlyph, BrainVitaGlyph,
} from "../bhalyam/icons";
import type { BhalyamGameSlug } from "../bhalyam/data";

export interface GameCardProps {
  game: BhalyamGameCard;
  onSelect: () => void;
  className?: string;
  compact?: boolean;
  featured?: boolean;
  /** Previous treatments remain available in the design comparison page. */
  tileStyle?: "hybrid" | "classic" | "calm";
}

const GAME_GLYPHS: Record<BhalyamGameSlug, React.ComponentType<{ className?: string }>> = {
  handcricket: HandCricketGlyph, snl: SnakeLadderGlyph, ludo: LudoGlyph,
  rummy: RummyGlyph, rps: RpsGlyph, uno: UnoGlyph, wordbuilding: WordBuildingGlyph,
  dotsboxes: DotsBoxesGlyph, namesplaceanimal: NamePlaceAnimalGlyph, tambola: TambolaGlyph,
  stargame: StarGameGlyph, bingo: BingoGlyph, snake: StarGameGlyph,
  roadrash: StarGameGlyph, brickblocks: BlockBlastGlyph, tetris: BlockBlastGlyph,
  breakout: BlockBlastGlyph, chess: StarGameGlyph, spacewar: StarGameGlyph,
  nokiacricket: HandCricketGlyph, "2048": StarGameGlyph, sudoku: StarGameGlyph,
  tictactoe: TicTacToeGlyph, connect4: Connect4Glyph,
  vamanaguntalu: VamanaGuntaluGlyph, brainvita: BrainVitaGlyph,
};

export default function GameCard({
  game, onSelect, className = "", compact = true, featured = false, tileStyle = "hybrid",
}: GameCardProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { play } = useAudio();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { showToast } = useToast();
  const isFav = isFavourite(game.slug);
  const capabilities = useAuthStore((s) => s.capabilities);
  const locked = isLocked(game, capabilities);
  const category = gameCardCategory(game.tags);
  const accent = getGameAccent(game);
  const hybrid = hybridTileSurface(HYBRID_CATEGORIES[category], isDark, featured);
  const calm = calmTileSurface(accent.from, isDark);
  const light = lightTileSurface(accent.from, "var(--surface-1)");
  const surface = tileStyle === "calm" ? calm : hybrid;
  const classic = tileStyle === "classic";
  const floatingArt = tileStyle === "hybrid";
  const Glyph = GAME_GLYPHS[game.slug];
  const from = game.btnGradient?.from ?? accent.from;
  const to = game.btnGradient?.to ?? accent.to;

  return (
    <article
      data-game={game.slug}
      data-tile-style={tileStyle}
      data-category={category}
      data-featured={featured}
      className={`group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[28px] border p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 sm:p-6 ${className}`}
      style={{
        background: classic ? (isDark ? game.paperBg : light.background) : surface.card.background,
        borderColor: classic ? (isDark ? game.paperBorder : light.border) : surface.card.border,
        boxShadow: classic ? light.shadow : surface.card.shadow,
      }}
    >
      {!floatingArt && (
        <span data-color-rail aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: classic ? accent.from : surface.rail }} />
      )}
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span
          className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide sm:text-[11px] ${
            featured ? "bg-amber-200 text-amber-950" : "bg-black/5 text-ink-hi dark:bg-white/10"
          }`}
        >
          {featured ? <Star className="h-3 w-3 shrink-0 fill-current" aria-hidden="true" /> : null}
          <span className="truncate">{featured ? "Featured" : HYBRID_CATEGORIES[category].label}</span>
        </span>
        <button
          type="button"
          aria-label={`${isFav ? "Remove" : "Add"} ${game.title} ${isFav ? "from" : "to"} favourites`}
          aria-pressed={isFav}
          onClick={() => {
            HapticsManager.getInstance().subtle();
            play(AUDIO.UI_CLICK);
            const saved = toggleFavourite(game.slug);
            showToast(`${game.title} ${saved ? "added to" : "removed from"} favourites`);
          }}
          className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 sm:h-14 sm:w-14 ${
            isFav ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-white/60 text-ink-mid hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <div
        data-art-stage
        className={`relative mb-3 flex w-full items-center justify-center ${floatingArt ? "" : "overflow-hidden rounded-xl border"} ${featured ? "h-32 sm:h-56" : "h-28 sm:h-52"}`}
        style={floatingArt ? undefined : { background: surface.stage.background, borderColor: surface.stage.border }}
      >
        <GameArtwork src={TILE_ART_BY_GAME[game.slug]} title={game.title} compact={compact && !featured}>
          <Glyph className="h-16 w-16 text-ink-hi" />
        </GameArtwork>
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className={`font-display font-bold leading-snug tracking-tight text-ink-hi ${featured ? "text-base sm:text-2xl" : "text-sm sm:text-2xl"}`}>
          {game.title}
        </h3>
        <p className="mt-2 line-clamp-2 font-script text-[14px] italic leading-snug text-ink-mid sm:text-xl">
          {game.nostalgiaQuote ?? game.blurb}
        </p>
        <div className="mb-3 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold leading-relaxed text-ink-mid sm:text-sm">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
            {game.playerRange ?? "2–8 Players"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {game.duration ?? "10–20 min"}
          </span>
        </div>
        <button
          type="button"
          disabled={locked}
          aria-label={`Play ${game.title}`}
          onClick={() => {
            play(AUDIO.UI_CLICK);
            onSelect();
          }}
          className="mt-auto flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-2 py-2.5 text-[11px] font-extrabold uppercase tracking-wide transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 enabled:hover:shadow-lg motion-safe:enabled:active:translate-y-px disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mid sm:min-h-[60px] sm:text-lg"
          style={locked ? undefined : classic
            ? { background: `linear-gradient(135deg, ${from}, ${to})`, color: "#FFFFFF" }
            : { background: surface.button.background, color: surface.button.color, boxShadow: surface.button.shadow }}
        >
          {locked ? "Coming soon" : "Play now"}
          {!locked && <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}

/** One bounded retry keeps optimized source URLs and the fallback image in sync. */
export function GameArtwork({
  src, title, compact = true, children = <Gamepad2 className="h-16 w-16 text-ink-hi" />,
}: { src: string; title: string; compact?: boolean; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setFailed(false); setRetry(0); }, [src]);
  useEffect(() => {
    if (!failed || retry > 0) return;
    const timer = window.setTimeout(() => { setFailed(false); setRetry(1); }, 900);
    return () => window.clearTimeout(timer);
  }, [failed, retry]);
  if (!src || failed) return <>{children}</>;
  const resolved = (retry === 0 ? src : `${src}?retry=${retry}`).replace(/\s/g, encodeURIComponent);
  return (
    <picture className="flex h-full w-full items-center justify-center">
      <source type="image/avif" srcSet={resolved.replace(/\.(png|jpg|jpeg)(\?.*)?$/i, ".avif$2")} />
      <source type="image/webp" srcSet={resolved.replace(/\.(png|jpg|jpeg)(\?.*)?$/i, ".webp$2")} />
      <img
        src={resolved}
        alt={`${title} artwork`}
        width={320}
        height={320}
        className={`max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-200 motion-safe:group-hover:scale-105 ${compact ? "h-28 sm:h-52" : "h-32 sm:h-56"}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </picture>
  );
}
