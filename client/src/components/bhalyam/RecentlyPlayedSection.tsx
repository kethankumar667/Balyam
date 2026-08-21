import { useMemo } from "react";
import { Link } from "react-router-dom";
import { History, Play, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRecentlyPlayed } from "../../hooks/useRecentlyPlayed";
import { BHALYAM_GAMES, type BhalyamGameSlug } from "./data";
import { useTheme } from "../../lib/useTheme";

interface RecentlyPlayedSectionProps {
  onSelectGame: (slug: BhalyamGameSlug) => void;
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RecentlyPlayedSection({
  onSelectGame,
  className = "",
}: RecentlyPlayedSectionProps) {
  const { recentItems } = useRecentlyPlayed();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const resolvedGames = useMemo(() => {
    return recentItems
      .map((item) => {
        const game = BHALYAM_GAMES.find((g) => g.slug === item.slug);
        return game ? { ...game, lastPlayedAt: item.lastPlayedAt, playCount: item.playCount } : null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [recentItems]);

  if (resolvedGames.length === 0) return null;

  return (
    <section className={`mb-8 ${className}`} aria-label="Recently Played Games">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-ink-hi tracking-tight">
              Recently Played
            </h2>
            <p className="text-xs text-ink-mute font-medium">
              Jump back into your recent gaming sessions
            </p>
          </div>
        </div>

        <Link
          to="/recently-played"
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors select-none group"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-700 snap-x">
        {resolvedGames.map((game) => (
          <motion.div
            key={game.slug}
            whileHover={{ y: -2 }}
            className={`flex-shrink-0 w-44 sm:w-52 rounded-2xl p-3 border transition-all flex flex-col justify-between cursor-pointer snap-start ${
              isDark
                ? "bg-slate-900/80 border-stone-800 hover:border-amber-500/40 shadow-lg"
                : "bg-white/90 border-stone-200 hover:border-amber-500/50 shadow-md"
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
            aria-label={`Play ${game.title}, last played ${formatRelativeTime(game.lastPlayedAt)}`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-mute mb-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {formatRelativeTime(game.lastPlayedAt)}
              </span>
              <span>{game.playCount > 1 ? `${game.playCount} plays` : "1 play"}</span>
            </div>

            <div className="my-2 flex items-center justify-center h-16">
              <img
                src={game.tileImage || `/UNOTile.png`}
                alt=""
                className="h-14 w-auto object-contain drop-shadow-sm"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            <div>
              <h3 className="font-display font-black text-sm text-ink-hi truncate text-center">
                {game.title}
              </h3>
              <button
                type="button"
                className="mt-2.5 w-full min-h-[36px] py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame(game.slug);
                }}
                aria-label={`Resume ${game.title}`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
