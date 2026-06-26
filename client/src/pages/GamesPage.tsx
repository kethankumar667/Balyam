import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import {
  BHALYAM_GAMES,
  isLocked,
  type BhalyamGameSlug,
} from "../components/bhalyam/data";
import { GameTile } from "./BhalyamHome";
import { ArrowRightIcon } from "../components/bhalyam/icons";
import { getSocket } from "../lib/socket";

/**
 * Dedicated catalog of every game in the BHALYAM lineup.
 *
 * Mirrors the home grid styling but skips the home page's 6-tile cap —
 * everything in `BHALYAM_GAMES` shows here, with the playable games on
 * top and the "coming soon" tiles laid out underneath in their own
 * section so players can see what's on deck.
 *
 * Tile selection routes through the SAME GameRoomSheet the home page
 * uses, so the playable-vs-maintenance gate is enforced in exactly one
 * place (the tile's `maintenance` flag absorbs the click).
 */
export default function GamesPage() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  // Match BhalyamHome's title behaviour so the tab reads sensibly.
  useEffect(() => {
    const prev = document.title;
    document.title = "All Games · BHALYAM";
    return () => {
      document.title = prev;
    };
  }, []);

  // Warm the socket connection the moment the catalog loads, so creating or
  // quick-playing a room doesn't pay the cold WebSocket handshake at click
  // time (the emit was previously buffered until the first connect).
  useEffect(() => {
    getSocket();
  }, []);

  const playable = BHALYAM_GAMES.filter((g) => !isLocked(g));
  const comingSoon = BHALYAM_GAMES.filter((g) => isLocked(g));

  return (
    // `bhalyam-home` is overloaded as the dark-mode override anchor (see
    // index.css) — without it the dark theme leaves section titles in
    // their dark-blue light-mode color against a dark walnut background.
    // Sharing the hook keeps /games looking consistent with home.
    <div className="bhalyam-home bhalyam-paper min-h-screen pb-16">
      {/* Header — back link + logo. Lean intentionally; the full home
          header has more chrome than this page needs. */}
      <header className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <BhalyamLogo size={44} decorative />
            <span className="flex flex-col leading-none min-w-0">
              <span className="bhalyam-display text-[24px] sm:text-[28px] lg:text-[32px] tracking-tight text-[#2A221B] truncate">
                BHALYAM
              </span>
              <span className="text-[10px] sm:text-[11px] lg:text-[12px] uppercase tracking-[0.18em] font-bold text-[#E95D21] -mt-0.5">
                All Games
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2
                       bg-[#FCF8EF] border border-[#EEDCC2] text-[#2A221B] font-bold text-[13px]
                       hover:bg-[#F8EEDB] active:translate-y-px
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       shadow-sm transition-colors duration-200"
          >
            <ArrowRightIcon className="w-3.5 h-3.5 rotate-180" />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 mt-6 sm:mt-8 space-y-10">
        {/* Playable section */}
        <section>
          <h2
            className="bhalyam-display text-[#1D2C4A] leading-tight mb-3 sm:mb-4"
            style={{ fontSize: "clamp(24px, 6.5vw, 44px)" }}
          >
            <span className="bhalyam-underline">Ready to play</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {playable.map((game) => (
              <li key={game.slug}>
                <GameTile
                  game={game}
                  onSelect={() => setSheetGame(game.slug)}
                  compact
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Coming soon section — only shown when there's at least one
            maintenance game (the catalog might lose all of them over time). */}
        {comingSoon.length > 0 && (
          <section>
            <header className="mb-3 sm:mb-4 flex items-end justify-between gap-2 flex-wrap">
              <h2
                className="bhalyam-display text-[#1D2C4A] leading-tight"
                style={{ fontSize: "clamp(22px, 6vw, 40px)" }}
              >
                <span className="bhalyam-underline">Coming soon</span>
              </h2>
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm flex-shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" aria-hidden />
                Cooking it up
              </motion.span>
            </header>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {comingSoon.map((game) => (
                <li key={game.slug}>
                  <GameTile
                    game={game}
                    onSelect={() => setSheetGame(game.slug)}
                    compact
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Join Room secondary CTA — for someone who arrived here from a
            friend's link and just wants to enter a code. */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5
                       bg-[#FCF8EF] border border-[#EEDCC2] text-[#2A221B] font-extrabold text-[14px]
                       hover:bg-[#F8EEDB] active:translate-y-px
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       shadow-[0_4px_10px_-3px_rgba(74,44,22,0.35)]
                       transition-colors duration-200"
          >
            Join a room with a code
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      <GameRoomSheet
        game={sheetGame}
        onClose={() => setSheetGame(null)}
      />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
