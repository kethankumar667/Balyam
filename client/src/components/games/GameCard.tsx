import { useState, useEffect, ReactNode } from "react";
import { Users as UsersIcon, Clock, ArrowRight, User, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../lib/useTheme";
import { useFavourites } from "../../hooks/useFavourites";
import { useToast } from "../../hooks/useToast";
import { HapticsManager } from "../../services/HapticsManager";
import { Tooltip } from "../../design-system/dls";
import { tileHover, ctaPress, bhalyamSpring } from "../../lib/motion";
import {
  type BhalyamGameCard,
  type BhalyamGameSlug,
  getGameAccent,
  isLocked,
} from "../bhalyam/data";
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
} from "../bhalyam/icons";

export interface GameCardProps {
  game: BhalyamGameCard;
  onSelect: () => void;
  className?: string;
  compact?: boolean;
}

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
  roadrash: StarGameGlyph,
  brickblocks: StarGameGlyph,
  tetris: StarGameGlyph,
  breakout: StarGameGlyph,
  carrom: StarGameGlyph,
  chess: StarGameGlyph,
  spacewar: StarGameGlyph,
  nokiacricket: HandCricketGlyph,
};

const TILE_ART: Record<BhalyamGameSlug, string> = {
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

export default function GameCard({
  game,
  onSelect,
  className = "",
}: GameCardProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { isFavourite, toggleFavourite } = useFavourites();
  const { showToast } = useToast();
  const isFav = isFavourite(game.slug);
  const underMaintenance = isLocked(game);
  const accent = getGameAccent(game);
  const Glyph = GAME_GLYPHS[game.slug] || StarGameGlyph;

  const isSolo = ["snake", "roadrash", "brickblocks", "tetris", "breakout", "spacewar", "nokiacricket"].includes(game.slug);

  /**
   * The category chip must not repeat the mode badge.
   *
   * The badge on the left already says "Multiplayer" or "Single Player", and
   * the chip on the right rendered `tags[0]` — which is literally
   * `"multiplayer"` on 14 of the 20 catalogue entries. Taking the first tag the badge does NOT already convey gives the
   * chip something to say ("Board", "Classroom", "Party", "Retro") and leaves
   * it empty rather than redundant when there is nothing left.
   */
  const categoryTag = game.tags?.find((t) => t !== "multiplayer" && t !== "solo");

  const btnFrom = game.btnGradient?.from ?? accent.from;
  const btnTo = game.btnGradient?.to ?? accent.to;
  const btnShadow = game.btnGradient?.shadow ?? accent.to;

  const bgStyle = isDark
    ? `linear-gradient(155deg, ${btnFrom}2e 0%, ${btnTo}14 45%, #0B101C 100%)`
    : `linear-gradient(155deg, var(--surface-1) 0%, ${btnFrom}28 40%, ${btnTo}48 100%)`;

  return (
    <motion.article
      variants={tileHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      transition={bhalyamSpring}
      className={`group relative w-full min-w-0 max-w-full rounded-[26px] overflow-hidden text-left p-4 sm:p-5 flex flex-col justify-between border shadow-md touch-pan-y ${
        isDark ? "border-white/10" : "border-black/10"
      } ${className}`}
      style={{
        background: bgStyle,
      }}
    >
      {/* Top row: Mode badge, Category & Favourite Toggle */}
      <div className="flex items-center justify-between gap-2 z-10 w-full min-w-0">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
            isSolo
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          }`}
        >
          {isSolo ? <User className="w-3 h-3 shrink-0" /> : <UsersIcon className="w-3 h-3 shrink-0" />}
          <span className="truncate">{isSolo ? "Single Player" : "Multiplayer"}</span>
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {categoryTag && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute truncate max-w-[90px] sm:max-w-[120px]">
              {categoryTag}
            </span>
          )}

          <Tooltip
            content={isFav ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`}
            side="top"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.85, rotate: -8 }}
              transition={bhalyamSpring}
              onClick={(e) => {
                e.stopPropagation();
                HapticsManager.getInstance().subtle();
                const nowFav = toggleFavourite(game.slug);
                showToast(nowFav ? `${game.title} added to favourites` : `${game.title} removed from favourites`);
              }}
              aria-label={isFav ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`}
              className={`p-1.5 rounded-full transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center ${
                isFav
                  ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                  : "bg-black/5 dark:bg-white/10 text-ink-mute hover:text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
            </motion.button>
          </Tooltip>
        </div>
      </div>

      {/* Hero illustration */}
      <div className="relative my-3 h-28 sm:h-32 flex items-center justify-center w-full min-w-0">
        <div
          className="absolute w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:scale-115 transition-transform duration-300"
          style={{ background: btnFrom }}
          aria-hidden="true"
        />
        <GameArtwork src={TILE_ART[game.slug]} title={game.title}>
          <span className="relative inline-flex w-16 h-16 rounded-2xl items-center justify-center bg-surface-1 text-ink-hi shadow-inner">
            <Glyph className="w-9 h-9" />
          </span>
        </GameArtwork>
      </div>

      {/* Game info */}
      <div className="text-center px-1 space-y-1 w-full min-w-0">
        <h3 className="font-display font-black text-xl sm:text-2xl text-ink-hi leading-tight tracking-tight truncate">
          {game.title}
        </h3>
        <p className="font-script italic text-sm text-ink-mid line-clamp-1 truncate">
          {game.nostalgiaQuote ?? game.blurb}
        </p>
      </div>

      {/* Metadata indicators */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-xs font-semibold text-ink-mid my-2.5 w-full min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <UsersIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{game.playerRange ?? "2–8 Players"}</span>
        </div>
        <span className="text-ink-mute opacity-60">•</span>
        <div className="flex items-center gap-1 shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{game.duration ?? "10–20 min"}</span>
        </div>
      </div>

      {/* Action button (min 44x44 touch target) */}
      <motion.button
        type="button"
        variants={ctaPress}
        initial="rest"
        whileHover={underMaintenance ? undefined : "hover"}
        whileTap={underMaintenance ? undefined : "tap"}
        transition={bhalyamSpring}
        onClick={underMaintenance ? undefined : onSelect}
        disabled={underMaintenance}
        aria-label={`Play ${game.title}`}
        className={`w-full min-w-0 min-h-[44px] py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-white transition-[filter,box-shadow] duration-200 cursor-pointer shadow-md ${
          underMaintenance
            ? "bg-zinc-600 opacity-60 cursor-not-allowed"
            : "hover:brightness-110 hover:shadow-lg"
        }`}
        style={{
          background: `linear-gradient(135deg, ${btnFrom}, ${btnTo})`,
          boxShadow: `0 6px 16px -3px ${btnShadow}90, 0 2px 0 0 ${btnShadow}`,
        }}
      >
        <span>{underMaintenance ? "Coming Soon" : "Play Now"}</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </motion.button>
    </motion.article>
  );
}

function GameArtwork({
  src,
  title,
  children,
}: {
  src?: string;
  title: string;
  children: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <>{children}</>;
  }

  return (
    <img
      src={src}
      alt={`${title} artwork`}
      className="relative h-24 sm:h-28 w-auto max-w-[85%] object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
