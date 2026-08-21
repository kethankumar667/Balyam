import React, { memo } from "react";
import {
  Heart,
  Users,
  Clock,
  Sparkles,
  Bot,
  Flame,
  ArrowRight,
  Lock,
  Play,
  RotateCcw,
} from "lucide-react";
import type { GameCatalogueItem } from "@shared/catalog";
import {
  HandCricketGlyph,
  SnakeLadderGlyph,
  LudoGlyph,
  RummyGlyph,
  RpsGlyph,
  UnoGlyph,
  WordBuildingGlyph,
  DotsBoxesGlyph,
  NamePlaceAnimalGlyph,
  TambolaGlyph,
  StarGameGlyph,
  BingoGlyph,
  BlockBlastGlyph,
  GamepadGlyph,
} from "./icons";

export type GameTileVariant = "standard" | "compact" | "featured";

export interface GameTileProps {
  game: GameCatalogueItem;
  variant?: GameTileVariant;
  isFavorite?: boolean;
  isPopular?: boolean;
  isRecentlyPlayed?: boolean;
  isNew?: boolean;
  onSelect?: (game: GameCatalogueItem) => void;
  onToggleFavorite?: (game: GameCatalogueItem, e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Render the dedicated iconic SVG glyph for any game slug.
 */
function GameGlyph({ id, className = "w-12 h-12" }: { id: string; className?: string }) {
  switch (id) {
    case "ludo":
      return <LudoGlyph className={className} />;
    case "rummy":
      return <RummyGlyph className={className} />;
    case "handcricket":
      return <HandCricketGlyph className={className} />;
    case "snl":
      return <SnakeLadderGlyph className={className} />;
    case "uno":
      return <UnoGlyph className={className} />;
    case "dotsboxes":
      return <DotsBoxesGlyph className={className} />;
    case "wordbuilding":
      return <WordBuildingGlyph className={className} />;
    case "namesplaceanimal":
      return <NamePlaceAnimalGlyph className={className} />;
    case "tambola":
      return <TambolaGlyph className={className} />;
    case "rps":
      return <RpsGlyph className={className} />;
    case "stargame":
      return <StarGameGlyph className={className} />;
    case "bingo":
      return <BingoGlyph className={className} />;
    case "blockblast":
    case "brickblocks":
    case "tetris":
    case "breakout":
      return <BlockBlastGlyph className={className} />;
    default:
      return <GamepadGlyph className={className} />;
  }
}

export const GameTile = memo(function GameTile({
  game,
  variant = "standard",
  isFavorite = false,
  isPopular,
  isRecentlyPlayed = false,
  isNew = false,
  onSelect,
  onToggleFavorite,
  className = "",
  disabled = false,
}: GameTileProps) {
  const isAvailable = game.availability === "playable" && !disabled;
  const isComingSoon = game.availability === "coming_soon" || (!isAvailable && !disabled);
  const showPopular = isPopular !== undefined ? isPopular : game.isPopular;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isAvailable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(game);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(game, e);
  };

  /* ──────────────────────── COMPACT VARIANT ──────────────────────── */
  if (variant === "compact") {
    return (
      <div
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        onClick={() => isAvailable && onSelect?.(game)}
        onKeyDown={handleKeyDown}
        aria-label={`${game.name}${isFavorite ? ", favorited" : ""}`}
        aria-disabled={!isAvailable}
        className={`group relative flex items-center justify-between p-3 rounded-2xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] transition-all duration-300 select-none ${
          isAvailable
            ? "hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98]"
            : "opacity-60 cursor-not-allowed"
        } ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Compact Mini Artwork */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${game.accent.from}, ${game.accent.to})`,
            }}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <GameGlyph id={game.id} className="w-6 h-6" />
            </div>
            {game.supportsBots && (
              <div className="absolute top-0.5 right-0.5 p-0.5 bg-black/40 rounded-full">
                <Bot className="w-2.5 h-2.5 text-amber-300" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-[var(--auth-ink)] truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {game.name}
              </h3>
              {game.teluguName && (
                <span className="text-[11px] text-[var(--auth-ink-soft)] font-medium font-sans truncate hidden sm:inline">
                  {game.teluguName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--auth-ink-soft)] mt-0.5">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {game.playTime.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
              className={`p-2 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
                isFavorite
                  ? "text-rose-500 bg-rose-500/10 hover:bg-rose-500/20"
                  : "text-[var(--auth-ink-soft)] hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-stone-950 flex items-center justify-center transition-colors">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────── FEATURED VARIANT ──────────────────────── */
  if (variant === "featured") {
    return (
      <div
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        onClick={() => isAvailable && onSelect?.(game)}
        onKeyDown={handleKeyDown}
        aria-label={`${game.name}, Featured game${isFavorite ? ", favorited" : ""}`}
        aria-disabled={!isAvailable}
        className={`group relative rounded-3xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] overflow-hidden transition-all duration-300 select-none flex flex-col justify-between ${
          isAvailable
            ? "hover:border-amber-500/70 hover:shadow-xl hover:-translate-y-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.99]"
            : "opacity-60 cursor-not-allowed"
        } ${className}`}
      >
        {/* Large Artwork Hero Header (~60% visual height) */}
        <div
          className="relative h-48 sm:h-56 w-full flex items-center justify-center text-white overflow-hidden p-6"
          style={{
            background: `linear-gradient(135deg, ${game.accent.from}, ${game.accent.to})`,
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-black/30 pointer-events-none" />

          {/* Top Floating Badges */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-amber-300 border border-white/10 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Featured Memory
              </span>
              {game.supportsBots && (
                <span className="text-[10px] font-mono font-bold bg-black/40 backdrop-blur-md px-2 py-1 rounded-full text-emerald-300 border border-white/10 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Bots
                </span>
              )}
            </div>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
                className={`p-2 rounded-full backdrop-blur-md transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer border ${
                  isFavorite
                    ? "bg-rose-500/25 border-rose-500/50 text-rose-400"
                    : "bg-black/30 border-white/10 text-white/80 hover:text-rose-400 hover:bg-black/50"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* Main Iconic Glyph */}
          <div className="relative transform group-hover:scale-110 transition-transform duration-500 z-10 flex flex-col items-center">
            <GameGlyph id={game.id} className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
          </div>

          {/* Bottom Nostalgia Quote Pill */}
          <div className="absolute bottom-3 inset-x-4 text-center z-10">
            <p className="text-[11px] text-white/90 font-medium italic truncate bg-black/35 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              {game.nostalgiaQuote}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-3 bg-[var(--auth-card)]">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-[var(--auth-ink)] tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {game.name}
                </h3>
                {game.teluguName && (
                  <span className="text-xs text-[var(--auth-ink-soft)] font-medium font-sans">
                    {game.teluguName}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--auth-ink-soft)] font-medium mt-0.5 line-clamp-1">
                {game.tagline}
              </p>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md group-hover:bg-amber-400 transition-transform group-hover:scale-105">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>

          {/* Quiet Metadata Rail */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--auth-field-edge)] text-xs font-mono text-[var(--auth-ink-soft)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>{game.minPlayers === game.maxPlayers ? `${game.minPlayers} Players` : `${game.minPlayers}–${game.maxPlayers} Players`}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>{game.playTime}</span>
              </span>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {game.genre}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────── STANDARD VARIANT (Default) ──────────────────────── */
  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      onClick={() => isAvailable && onSelect?.(game)}
      onKeyDown={handleKeyDown}
      aria-label={`${game.name}, ${game.tagline}${isFavorite ? ", favorited" : ""}`}
      aria-disabled={!isAvailable}
      className={`group relative rounded-3xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] overflow-hidden transition-all duration-300 select-none flex flex-col justify-between ${
        isAvailable
          ? "hover:border-amber-500/70 hover:shadow-lg hover:-translate-y-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98]"
          : "opacity-65 cursor-not-allowed"
      } ${className}`}
    >
      {/* 60% Visual Artwork Header */}
      <div
        className="relative h-40 sm:h-44 w-full flex items-center justify-center text-white overflow-hidden p-4"
        style={{
          background: `linear-gradient(135deg, ${game.accent.from}, ${game.accent.to})`,
        }}
      >
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute inset-0 bg-radial from-white/15 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges & Favorite Heart */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {showPopular && (
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full text-amber-300 border border-white/10 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Popular
              </span>
            )}
            {isRecentlyPlayed && (
              <span className="text-[10px] font-mono font-bold bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full text-sky-300 border border-white/10 flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" />
                Recent
              </span>
            )}
            {isNew && (
              <span className="text-[10px] font-mono font-black bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full text-emerald-300 border border-white/10">
                NEW
              </span>
            )}
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
              className={`p-2 rounded-full backdrop-blur-md transition min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer border ${
                isFavorite
                  ? "bg-rose-500/25 border-rose-500/50 text-rose-400"
                  : "bg-black/30 border-white/10 text-white/80 hover:text-rose-400 hover:bg-black/50"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        {/* Center Artwork Glyph */}
        <div className="relative transform group-hover:scale-110 transition-transform duration-300 z-10">
          <GameGlyph id={game.id} className="w-16 h-16 sm:w-18 sm:h-18 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
        </div>

        {/* Bot Capability Chip */}
        {game.supportsBots && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="text-[9px] font-mono font-bold bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-md text-emerald-300 border border-white/10 flex items-center gap-0.5">
              <Bot className="w-2.5 h-2.5" />
              Bots
            </span>
          </div>
        )}

        {/* Coming Soon / Disabled Overlay */}
        {isComingSoon && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-amber-500/40 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* Content Section (~40% height) */}
      <div className="p-4 sm:p-5 space-y-2.5 bg-[var(--auth-card)]">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base sm:text-lg font-black text-[var(--auth-ink)] tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
              {game.name}
            </h3>
            {game.teluguName && (
              <span className="text-[11px] text-[var(--auth-ink-soft)] font-medium font-sans truncate">
                {game.teluguName}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--auth-ink-soft)] font-medium line-clamp-1 mt-0.5">
            {game.tagline}
          </p>
        </div>

        {/* Quiet Bottom Metadata Rail */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[var(--auth-field-edge)] text-[11px] font-mono text-[var(--auth-ink-soft)]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-500" />
              <span>{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{game.playTime.split(" ")[0]}</span>
            </span>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
            {game.genre}
          </span>
        </div>
      </div>
    </div>
  );
});

export default GameTile;
