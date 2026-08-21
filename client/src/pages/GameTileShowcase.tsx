import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Heart, RotateCcw, Flame, LayoutGrid, CheckCircle2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import GameTile from "../components/bhalyam/GameTile";
import {
  BHALYAM_GAME_CATALOGUE,
  getGameById,
  getPopularGames,
  type GameCatalogueItem,
} from "../catalog/gameCatalog";

export default function GameTileShowcase() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    ludo: true,
    rummy: true,
  });

  const [selectedGame, setSelectedGame] = useState<GameCatalogueItem | null>(null);

  const handleToggleFavorite = (game: GameCatalogueItem, e: React.MouseEvent) => {
    setFavorites((prev) => ({
      ...prev,
      [game.id]: !prev[game.id],
    }));
  };

  const ludo = getGameById("ludo")!;
  const handcricket = getGameById("handcricket")!;
  const uno = getGameById("uno")!;
  const rummy = getGameById("rummy")!;
  const snl = getGameById("snl")!;
  const dotsboxes = getGameById("dotsboxes")!;
  const tambola = getGameById("tambola")!;
  const chess = getGameById("chess")!;

  // Simulated coming soon / maintenance game for state inspection
  const comingSoonGame: GameCatalogueItem = {
    ...ludo,
    id: "ludo",
    name: "Gilli Danda",
    teluguName: "గిల్లీ దండా",
    tagline: "The vintage street wooden striker",
    availability: "coming_soon",
    accent: { from: "#78350F", to: "#451A03" },
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--auth-card-edge)] pb-6">
            <div className="space-y-1">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Lounge</span>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--auth-ink)] tracking-tight">
                  GameTile Component Showcase
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] font-medium">
                Visual test harness for BHALYAM's reusable GameTile across Standard, Compact, and Featured variants.
              </p>
            </div>

            {selectedGame && (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 px-4 flex items-center gap-3 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Selected Tile</span>
                  <span className="font-bold text-[var(--auth-ink)]">{selectedGame.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 1: Standard Tiles (Main Lounge Grid) ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-lg font-black text-[var(--auth-ink)]">
                  1. Standard Tiles (Main Grid)
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--auth-ink-soft)]">
                Responsive 2-col (mobile) → 3/4-col (desktop)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Default State */}
              <GameTile
                game={ludo}
                isFavorite={favorites["ludo"]}
                isPopular={true}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Recent State */}
              <GameTile
                game={handcricket}
                isFavorite={favorites["handcricket"]}
                isRecentlyPlayed={true}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* New State */}
              <GameTile
                game={uno}
                isFavorite={favorites["uno"]}
                isNew={true}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Rummy State */}
              <GameTile
                game={rummy}
                isFavorite={favorites["rummy"]}
                isPopular={true}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Snakes & Ladders */}
              <GameTile
                game={snl}
                isFavorite={favorites["snl"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Dots & Boxes */}
              <GameTile
                game={dotsboxes}
                isFavorite={favorites["dotsboxes"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Tambola */}
              <GameTile
                game={tambola}
                isFavorite={favorites["tambola"]}
                isPopular={true}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Coming Soon / Disabled State */}
              <GameTile
                game={comingSoonGame}
                onSelect={(g) => setSelectedGame(g)}
              />
            </div>
          </section>

          {/* ── Section 2: Featured Memory World Tiles ── */}
          <section className="space-y-4 pt-4 border-t border-[var(--auth-card-edge)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <h2 className="text-lg font-black text-[var(--auth-ink)]">
                  2. Featured Memory World Tiles (Nostalgia Hub)
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--auth-ink-soft)]">
                Rich quotes & glowing hero artwork
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <GameTile
                game={ludo}
                variant="featured"
                isFavorite={favorites["ludo"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              <GameTile
                game={handcricket}
                variant="featured"
                isFavorite={favorites["handcricket"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </section>

          {/* ── Section 3: Compact Rail Tiles ── */}
          <section className="space-y-4 pt-4 border-t border-[var(--auth-card-edge)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-lg font-black text-[var(--auth-ink)]">
                  3. Compact Tiles (Recently Played & Favorites Rails)
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--auth-ink-soft)]">
                High-density layout
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <GameTile
                game={ludo}
                variant="compact"
                isFavorite={favorites["ludo"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              <GameTile
                game={rummy}
                variant="compact"
                isFavorite={favorites["rummy"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />

              <GameTile
                game={uno}
                variant="compact"
                isFavorite={favorites["uno"]}
                onSelect={(g) => setSelectedGame(g)}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
