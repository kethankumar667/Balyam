import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import GameCard from "../components/games/GameCard";
import { BHALYAM_GAMES } from "../components/bhalyam/data";

const GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 w-full min-w-0";

const noop = () => undefined;

/**
 * Compare the calm alternative with the shipped hybrid using the real catalogue.
 */
export default function TileDesignPreview() {
  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <header className="space-y-2">
            <Link
              to="/games"
              className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold text-ink-mid hover:text-ink-hi transition"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to games</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-hi tracking-tight">Game tile design</h1>
            <p className="text-sm text-ink-mid max-w-2xl">
              Calm uses one gold Play button across all games. The current hybrid uses category-coloured rails,
              softly tinted artwork stages and matching Play buttons. Switch themes to compare light and dark.
            </p>
          </header>

          <section aria-labelledby="calm-heading" className="space-y-4">
            <h2 id="calm-heading" className="text-lg font-black text-ink-hi">
              Calm alternative
            </h2>
            <ul role="list" className={GRID_CLASS}>
              {BHALYAM_GAMES.map((game) => (
                <li key={game.slug} className="w-full min-w-0 flex flex-col">
                  <GameCard game={game} tileStyle="calm" onSelect={noop} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="current-heading" className="space-y-4 pt-8 border-t border-black/10 dark:border-white/10">
            <h2 id="current-heading" className="text-lg font-black text-ink-hi">
              Current hybrid
            </h2>
            <ul role="list" className={GRID_CLASS}>
              {BHALYAM_GAMES.map((game) => (
                <li key={game.slug} className="w-full min-w-0 flex flex-col">
                  <GameCard game={game} onSelect={noop} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
