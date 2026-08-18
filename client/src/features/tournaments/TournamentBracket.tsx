import type { TournamentBracket as TournamentBracketType, BracketMatch } from "@shared/tournaments/Bracket";
import type { Tournament } from "@shared/tournaments/Tournament";

interface TournamentBracketProps {
  tournament: Tournament;
  bracket: TournamentBracketType;
  onSelectMatch?: (match: BracketMatch) => void;
}

export default function TournamentBracket({
  tournament,
  bracket,
  onSelectMatch,
}: TournamentBracketProps) {
  const championParticipant = tournament.championId
    ? tournament.participants.find((p) => p.playerId === tournament.championId)
    : null;

  return (
    <div className="space-y-6">
      {/* Champion Podium Banner */}
      {tournament.status === "FINISHED" && championParticipant && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/40 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="text-4xl sm:text-5xl mb-2">👑</div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 block mb-1">
            Tournament Champion
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-100 dark:text-zinc-100 tracking-tight">
            {championParticipant.displayName}
          </h2>
          <span className="text-xs font-mono text-stone-400 mt-1 block">
            Prize: +{tournament.rewards[0]?.xp || 500} XP • Badge: {tournament.rewards[0]?.badge || "👑"}
          </span>
        </div>
      )}

      {/* Bracket Rounds Tree */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[700px] items-stretch">
          {bracket.rounds.map((round) => (
            <div key={round.roundNumber} className="flex-1 flex flex-col space-y-4">
              {/* Round Header */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl py-2 px-3 text-center">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  {round.name}
                </span>
              </div>

              {/* Matchups in this round */}
              <div className="flex-1 flex flex-col justify-around gap-4">
                {round.matches.map((match) => {
                  const isCompleted = match.status === "COMPLETED" || match.status === "BYE";
                  const p1Winner = match.winnerId && match.player1?.playerId === match.winnerId;
                  const p2Winner = match.winnerId && match.player2?.playerId === match.winnerId;

                  return (
                    <div
                      key={match.matchId}
                      onClick={() => onSelectMatch?.(match)}
                      className={`bg-stone-900/90 dark:bg-zinc-900/90 border rounded-xl p-3 space-y-2 shadow transition relative ${
                        isCompleted
                          ? "border-stone-800/80 opacity-90"
                          : match.status === "READY"
                          ? "border-amber-500/50 shadow-amber-500/10 cursor-pointer hover:border-amber-400"
                          : "border-stone-800/60 opacity-60"
                      }`}
                    >
                      {/* Match Meta */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                        <span>Match #{match.matchNumber}</span>
                        {match.status === "BYE" ? (
                          <span className="text-sky-400">BYE</span>
                        ) : (
                          <span>{match.status}</span>
                        )}
                      </div>

                      {/* Player 1 Slot */}
                      <div
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-mono transition ${
                          p1Winner
                            ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                            : match.player1
                            ? "bg-stone-950 text-stone-300"
                            : "bg-stone-950/40 text-stone-600 italic"
                        }`}
                      >
                        <span className="truncate max-w-[120px]">
                          {match.player1?.displayName || (match.status === "BYE" ? "BYE" : "TBD")}
                        </span>
                        {match.status === "COMPLETED" && (
                          <span className="font-bold">{match.score1}</span>
                        )}
                      </div>

                      {/* Player 2 Slot */}
                      <div
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-mono transition ${
                          p2Winner
                            ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                            : match.player2
                            ? "bg-stone-950 text-stone-300"
                            : "bg-stone-950/40 text-stone-600 italic"
                        }`}
                      >
                        <span className="truncate max-w-[120px]">
                          {match.player2?.displayName || (match.status === "BYE" ? "BYE" : "TBD")}
                        </span>
                        {match.status === "COMPLETED" && (
                          <span className="font-bold">{match.score2}</span>
                        )}
                      </div>

                      {/* Spectator Foundation badge */}
                      {match.spectatorsAllowed && match.status === "IN_PROGRESS" && (
                        <div className="text-[10px] font-mono text-center text-sky-400 bg-sky-500/10 rounded py-0.5 border border-sky-500/20">
                          👁️ Spectate Live
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
