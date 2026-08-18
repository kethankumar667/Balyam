import React from "react";
import type { Tournament } from "@shared/tournaments/Tournament";
import { GameCategoryIcon, ChampionCrownIcon, TournamentCupIcon, SwordsClashIcon } from "../../design-system/icons";
import { GLASSMORPHISM } from "../../design-system/premium";

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
        className={`rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.elevatedCard} border border-amber-500/30 relative overflow-hidden shadow-2xl`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
              BHALYAM ARENA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100">
              Championship Tournaments & Brackets
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              Knockout tournaments with live brackets, double XP, and exclusive championship badges.
            </p>
          </div>
          {onViewSchedule && (
            <button
              onClick={onViewSchedule}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-2xl transition shadow"
            >
              Browse Tournaments
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.elevatedCard} border border-amber-500/40 relative overflow-hidden shadow-2xl backdrop-blur-xl`}
    >
      {/* Background Arena Flame Aura */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
              <SwordsClashIcon size={12} />
              Featured Arena Event
            </span>
            <span className="inline-flex items-center gap-1 bg-stone-900 border border-stone-800 text-[10px] font-mono text-stone-300 px-2 py-0.5 rounded-full uppercase">
              <GameCategoryIcon game={tournament.game} size={14} />
              {tournament.game}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-stone-100 dark:text-zinc-100 tracking-tight leading-tight">
            {tournament.title}
          </h2>
          <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-2">
            {tournament.description}
          </p>

          {/* Arena Stats Matrix */}
          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
            <div className="bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-xl">
              <span className="text-stone-500 text-[10px] block">Prize Pool</span>
              <span className="font-black text-amber-400 flex items-center gap-1">
                <ChampionCrownIcon size={14} className="text-amber-400" />
                {tournament.rewards[0]?.xp || 500} XP + Trophy
              </span>
            </div>
            <div className="bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-xl">
              <span className="text-stone-500 text-[10px] block">Field Size</span>
              <span className="font-bold text-stone-200">
                {tournament.participants.length} / {tournament.config.maxPlayers} Knockout Bracket
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onEnterArena && (
          <div className="shrink-0">
            <button
              onClick={() => onEnterArena(tournament.id)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-xl shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2"
            >
              <TournamentCupIcon size={16} />
              Enter Tournament Arena
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
