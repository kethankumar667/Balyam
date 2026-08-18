import type { Tournament } from "@shared/tournaments/Tournament";

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
  const registeredCount = tournament.participants.length;
  const maxPlayers = tournament.config.maxPlayers;
  const isRegistered = tournament.participants.some((p) => p.playerId === currentPlayerId);
  const participant = tournament.participants.find((p) => p.playerId === currentPlayerId);
  const isCheckedIn = participant?.checkedIn;

  const getStatusBadge = () => {
    switch (tournament.status) {
      case "REGISTRATION_OPEN":
        return (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
            REGISTRATION OPEN
          </span>
        );
      case "CHECK_IN_OPEN":
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono animate-pulse">
            CHECK-IN OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
            ROUND {tournament.currentRound} / {tournament.totalRounds}
          </span>
        );
      case "FINISHED":
        return (
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
            FINISHED
          </span>
        );
      default:
        return (
          <span className="bg-stone-500/20 text-stone-400 border border-stone-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
            {tournament.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-800 dark:border-zinc-800 hover:border-stone-700 dark:hover:border-zinc-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4 transition">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20 font-bold">
            {tournament.game}
          </span>
          {getStatusBadge()}
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-100 dark:text-zinc-100 tracking-tight">
            {tournament.title}
          </h3>
          <p className="text-xs text-stone-400 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
            {tournament.description}
          </p>
        </div>

        {/* Tournament Meta */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/80 font-mono text-xs">
          <div className="bg-stone-950/60 p-2 rounded-lg border border-stone-800/80">
            <span className="text-[10px] text-stone-500 block">Participants</span>
            <span className="font-bold text-stone-200">
              {registeredCount} / {maxPlayers} Players
            </span>
          </div>
          <div className="bg-stone-950/60 p-2 rounded-lg border border-stone-800/80">
            <span className="text-[10px] text-stone-500 block">1st Place Prize</span>
            <span className="font-bold text-amber-400">
              👑 {tournament.rewards[0]?.xp || 500} XP
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => onViewBracket(tournament.id)}
          className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 rounded-xl text-xs transition"
        >
          View Bracket
        </button>

        {tournament.status === "REGISTRATION_OPEN" && !isRegistered && onRegister && (
          <button
            onClick={() => onRegister(tournament.id)}
            disabled={registeredCount >= maxPlayers}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black py-2 rounded-xl text-xs transition shadow"
          >
            {registeredCount >= maxPlayers ? "Full" : "Register"}
          </button>
        )}

        {tournament.status === "CHECK_IN_OPEN" && isRegistered && !isCheckedIn && onCheckIn && (
          <button
            onClick={() => onCheckIn(tournament.id)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-2 rounded-xl text-xs transition shadow animate-pulse"
          >
            Check In Now
          </button>
        )}

        {isRegistered && (
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
            {isCheckedIn ? "✓ Checked In" : "✓ Registered"}
          </span>
        )}
      </div>
    </div>
  );
}
