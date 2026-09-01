import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Play, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useFavourites } from "../../hooks/useFavourites";
import { BHALYAM_GAMES, type BhalyamGameSlug } from "./data";
import { useTheme } from "../../lib/useTheme";

interface FavouritesSectionProps {
  onSelectGame: (slug: BhalyamGameSlug) => void;
  className?: string;
  showWhenEmpty?: boolean;
}

export default function FavouritesSection({
  onSelectGame,
  className = "",
  showWhenEmpty = false,
}: FavouritesSectionProps) {
  const { favourites, toggleFavourite } = useFavourites();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const resolvedGames = useMemo(() => {
    return favourites
      .map((slug) => BHALYAM_GAMES.find((g) => g.slug === slug))
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [favourites]);

  if (resolvedGames.length === 0 && !showWhenEmpty) return null;

  return (
    <section className={`mb-8 ${className}`} aria-label="Favourite Games">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/20">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-ink-hi tracking-tight">
              Favourite Games
            </h2>
            <p className="text-xs text-ink-mute font-medium">
              Your quick-access personal favourites
            </p>
          </div>
        </div>

        {resolvedGames.length > 0 && (
          <Link
            to="/favorites"
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 transition-colors select-none group"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {resolvedGames.length === 0 ? (
        <div
          className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center ${
            isDark ? "bg-slate-900/40 border-stone-800" : "bg-stone-50 border-stone-200"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
            <Heart className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm text-ink-hi mb-1">No favourite games yet</p>
          <p className="text-xs text-ink-mute max-w-sm">
            Tap the heart icon on any game card in the lounge to save it here for instant access.
          </p>
        </div>
      ) : (
        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-700 snap-x">
          {resolvedGames.map((game) => (
            <motion.div
              key={game.slug}
              whileHover={{ y: -2 }}
              className={`flex-shrink-0 w-44 sm:w-52 rounded-2xl p-3 border transition-all flex flex-col justify-between cursor-pointer snap-start relative group ${
                isDark
                  ? "bg-slate-900/80 border-stone-800 hover:border-rose-500/40 shadow-lg"
                  : "bg-white/90 border-stone-200 hover:border-rose-500/50 shadow-md"
              }`}
              onClick={() => onSelectGame(game.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectGame(game.slug);
                }
              }}
              aria-label={`Play favourite ${game.title}`}
            >
              <button
                type="button"
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 transition-colors z-10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavourite(game.slug);
                }}
                aria-label={`Remove ${game.title} from favourites`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
              </button>

              <div className="text-[11px] font-bold text-ink-mute mb-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  Favourite
                </span>
              </div>

              <div className="my-2 flex items-center justify-center h-16">
                <picture>
                  <source type="image/avif" srcSet={(game.tileImage || `/UNOTile.png`).replace(/\.(png|jpg|jpeg)$/i, '.avif')} />
                  <source type="image/webp" srcSet={(game.tileImage || `/UNOTile.png`).replace(/\.(png|jpg|jpeg)$/i, '.webp')} />
                  <img
                    src={game.tileImage || `/UNOTile.png`}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-auto object-contain drop-shadow-sm"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </picture>
              </div>

              <div>
                <h3 className="font-display font-black text-sm text-ink-hi truncate text-center">
                  {game.title}
                </h3>
                <button
                  type="button"
                  className="mt-2.5 w-full min-h-[36px] py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGame(game.slug);
                  }}
                  aria-label={`Play ${game.title}`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
