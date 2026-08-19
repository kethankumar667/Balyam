import React from "react";
import type { Tournament } from "@shared/tournaments/Tournament";
import { GameCategoryIcon, ChampionCrownIcon, TournamentCupIcon } from "../../design-system/icons";
import { TournamentGameArtwork } from "./TournamentArtwork";

interface TournamentCardProps {
  tournament: Tournament;
  currentPlayerId?: string;
  onRegister?: (tournamentId: string) => Promise<void>;
  onCheckIn?: (tournamentId: string) => Promise<void>;
  onViewBracket: (tournamentId: string) => void;
}

export default function TournamentCard({
  tournament,
  currentPlayerId,
  onRegister,
  onCheckIn,
  onViewBracket,
}: TournamentCardProps) {
  const registeredCount = tournament.participants?.length || 0;
  const maxPlayers = tournament.config?.maxPlayers || 8;
  const isRegistered = Boolean(
    currentPlayerId && tournament.participants?.some((p) => p.playerId === currentPlayerId),
  );
  const participant = tournament.participants?.find((p) => p.playerId === currentPlayerId);
  const isCheckedIn = participant?.checkedIn;
  const isFull = registeredCount >= maxPlayers;
  const fillPercentage = Math.min(100, Math.round((registeredCount / maxPlayers) * 100));
  const firstPrizeXP = tournament.rewards?.find((r) => r.placement === 1)?.xp || 500;

  const getStatusBadge = () => {
    switch (tournament.status) {
      case "REGISTRATION_OPEN":
        return (
          <span className="bg-emerald-500/90 text-zinc-950 font-black text-[10px] px-2.5 py-1 rounded-full font-mono shadow-xs">
            REGISTRATION OPEN
          </span>
        );
      case "CHECK_IN_OPEN":
        return (
          <span className="bg-amber-400 text-zinc-950 font-black text-[10px] px-2.5 py-1 rounded-full font-mono animate-pulse shadow-xs">
            CHECK-IN OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="bg-sky-500 text-zinc-950 font-black text-[10px] px-2.5 py-1 rounded-full font-mono shadow-xs">
            ROUND {tournament.currentRound || 1} / {tournament.totalRounds || 3}
          </span>
        );
      case "FINISHED":
        return (
          <span className="bg-purple-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full font-mono shadow-xs">
            FINISHED
          </span>
        );
      default:
        return (
          <span className="bg-stone-700 text-stone-200 font-black text-[10px] px-2.5 py-1 rounded-full font-mono shadow-xs">
            {tournament.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--auth-card)] dark:bg-stone-900/90 border border-[var(--auth-card-edge)] dark:border-stone-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
      {/* 1. Game Illustrated Media Area */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-950">
        <TournamentGameArtwork game={tournament.game} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Game Category Badge */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-md text-stone-100 border border-stone-700/60 text-xs font-mono font-bold px-2.5 py-1 rounded-xl uppercase shadow-md">
            <GameCategoryIcon game={tournament.game} size={16} />
            <span>{tournament.game}</span>
          </div>

          {/* Status Badge */}
          <div>{getStatusBadge()}</div>
        </div>
      </div>

      {/* 2. Card Content & Body */}
      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-black text-[var(--auth-ink)] dark:text-stone-100 tracking-tight leading-snug group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
            {tournament.title}
          </h3>
          <p className="text-xs text-[var(--auth-ink-soft)] dark:text-stone-400 leading-relaxed font-sans line-clamp-2">
            {tournament.description}
          </p>
        </div>

        {/* 3. Metadata Grid with Capacity Progress */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            {/* Participants Field */}
            <div className="bg-stone-500/5 dark:bg-stone-950/60 p-2.5 rounded-2xl border border-[var(--auth-card-edge)] dark:border-stone-800/80">
              <div className="flex items-center justify-between text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 mb-1">
                <span>Participants</span>
                <span className="font-bold">{fillPercentage}%</span>
              </div>
              <span className="font-bold text-[var(--auth-ink)] dark:text-stone-200 text-xs block">
                {registeredCount} / {maxPlayers} Players
              </span>
              {/* Progress bar */}
              <div className="w-full bg-stone-300 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>

            {/* 1st Place Prize Field */}
            <div className="bg-stone-500/5 dark:bg-stone-950/60 p-2.5 rounded-2xl border border-[var(--auth-card-edge)] dark:border-stone-800/80 flex flex-col justify-between">
              <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 block">
                1st Place Prize
              </span>
              <span className="font-black text-amber-500 dark:text-amber-400 flex items-center gap-1 text-xs">
                <ChampionCrownIcon size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
                {firstPrizeXP} XP
              </span>
              <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 font-bold block truncate">
                + Champion Trophy
              </span>
            </div>
          </div>
        </div>

        {/* 4. Action Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--auth-card-edge)] dark:border-stone-800/80">
          <button
            onClick={() => onViewBracket(tournament.id)}
            className="flex-1 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold py-2.5 px-3 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
            aria-label={`View bracket for ${tournament.title}`}
          >
            <TournamentCupIcon size={15} className="text-stone-600 dark:text-stone-300" />
            View Bracket
          </button>

          {/* Registration State Actions */}
          {tournament.status === "REGISTRATION_OPEN" && !isRegistered && onRegister && (
            <button
              onClick={() => onRegister(tournament.id)}
              disabled={isFull}
              className={`flex-1 font-black py-2.5 px-3 rounded-2xl text-xs transition min-h-[44px] cursor-pointer shadow-sm ${
                isFull
                  ? "bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 shadow-amber-500/20 active:scale-98"
              }`}
              aria-label={isFull ? "Tournament is full" : `Register for ${tournament.title}`}
            >
              {isFull ? "Full (Bracket Max)" : "Register"}
            </button>
          )}

          {tournament.status === "CHECK_IN_OPEN" && isRegistered && !isCheckedIn && onCheckIn && (
            <button
              onClick={() => onCheckIn(tournament.id)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-2.5 px-3 rounded-2xl text-xs transition shadow-emerald-500/20 active:scale-98 animate-pulse min-h-[44px] cursor-pointer"
              aria-label={`Check in for ${tournament.title}`}
            >
              Check In Now
            </button>
          )}

          {isRegistered && (
            <div className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 rounded-2xl min-h-[44px]">
              <span>{isCheckedIn ? "✓ Checked In" : "✓ Registered"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
