import React from "react";
import type { Tournament } from "@shared/tournaments/Tournament";
import { GameCategoryIcon, ChampionCrownIcon, TournamentCupIcon, SwordsClashIcon } from "../../design-system/icons";
import { TournamentTrophyArtwork } from "./TournamentArtwork";

interface TournamentHeroBannerProps {
  tournament?: Tournament;
  onEnterArena?: (tournamentId: string) => void;
  onViewSchedule?: () => void;
}

export const TournamentHeroBanner: React.FC<TournamentHeroBannerProps> = ({
  tournament,
  onEnterArena,
  onViewSchedule,
}) => {
  if (!tournament) {
    return (
      <div
        className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-stone-900/60 to-zinc-950/90 border border-amber-500/30 relative overflow-hidden shadow-2xl backdrop-blur-md"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
              <SwordsClashIcon size={12} />
              BHALYAM ARENA
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[var(--auth-ink)] dark:text-stone-100 tracking-tight">
              Championship Tournaments & Knockout Brackets
            </h2>
            <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] dark:text-stone-300 font-sans leading-relaxed">
              Knockout tournaments with live bracket progression, double XP rewards, and exclusive championship trophies.
            </p>
          </div>
          {onViewSchedule && (
            <button
              onClick={onViewSchedule}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20 active:scale-98 shrink-0 min-h-[44px]"
            >
              Browse Tournaments
            </button>
          )}
        </div>
      </div>
    );
  }

  const firstPrizeXP = tournament.rewards?.find((r) => r.placement === 1)?.xp || 500;
  const registeredCount = tournament.participants.length;
  const maxPlayers = tournament.config.maxPlayers;
  const gameName = tournament.game.toUpperCase();

  return (
    <div
      className="rounded-3xl p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#2A170A] via-[#1A0E05] to-[#0A0502] dark:from-[#1E1106] dark:via-[#140B04] dark:to-[#080402] border border-amber-500/40 relative overflow-hidden shadow-2xl text-stone-100"
    >
      {/* Ambient background arena light flare */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        {/* Left text and stats column */}
        <div className="space-y-4 max-w-2xl">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black px-3 py-1 rounded-full font-mono uppercase tracking-wider shadow-xs">
              <SwordsClashIcon size={13} />
              Featured Arena Event
            </span>
            <span className="inline-flex items-center gap-1.5 bg-stone-900/90 border border-stone-700/80 text-[11px] font-mono font-bold text-stone-200 px-3 py-1 rounded-full uppercase">
              <GameCategoryIcon game={tournament.game} size={16} />
              {gameName}
            </span>
            {tournament.status === "REGISTRATION_OPEN" && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full">
                ● LIVE REGISTRATION
              </span>
            )}
          </div>

          {/* Tournament Title & Description */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              {tournament.title}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed line-clamp-2 sm:line-clamp-3">
              {tournament.description}
            </p>
          </div>

          {/* Arena Stats Matrix Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
            <div className="bg-stone-950/85 border border-stone-800/90 p-3 rounded-2xl shadow-inner">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">1st Place Prize</span>
              <span className="font-black text-amber-400 text-sm flex items-center gap-1.5 mt-0.5">
                <ChampionCrownIcon size={16} className="text-amber-400 shrink-0" />
                {firstPrizeXP} XP + Trophy
              </span>
            </div>

            <div className="bg-stone-950/85 border border-stone-800/90 p-3 rounded-2xl shadow-inner">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">Bracket Size</span>
              <span className="font-bold text-stone-100 text-sm block mt-0.5">
                {registeredCount} / {maxPlayers} Knockout
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-stone-950/85 border border-stone-800/90 p-3 rounded-2xl shadow-inner">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">Format</span>
              <span className="font-bold text-stone-200 text-sm block mt-0.5 truncate">
                Single Elimination
              </span>
            </div>
          </div>

          {/* Action CTA Button */}
          {onEnterArena && (
            <div className="pt-2">
              <button
                onClick={() => onEnterArena(tournament.id)}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-zinc-950 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2.5 min-h-[48px] cursor-pointer"
                aria-label={`Enter Tournament Arena for ${tournament.title}`}
              >
                <TournamentCupIcon size={18} className="text-zinc-950" />
                Enter Tournament Arena
              </button>
            </div>
          )}
        </div>

        {/* Right 3D Trophy & Arena Vector Artwork */}
        <div className="hidden sm:flex items-center justify-center shrink-0 lg:pr-4">
          <div className="relative">
            <TournamentTrophyArtwork size={190} />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-stone-950/90 border border-amber-500/40 px-3.5 py-1 rounded-full text-[10px] font-mono font-black text-amber-300 whitespace-nowrap shadow-lg flex items-center gap-1">
              <span>🏆 CHAMPIONSHIP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
