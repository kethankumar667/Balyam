import { useMemo } from "react";
import { Flame, Zap, Trophy, ShieldAlert } from "lucide-react";
import type { GameKind, Player, LudoColor, LudoToken } from "@shared/types";
import { COLOR_HEX } from "../../games/ludo/board-layout";

interface TvMomentumBarProps {
  game: GameKind;
  gameState: Record<string, unknown> | null;
  players: Player[];
}

export function TvMomentumBar({ game, gameState, players }: TvMomentumBarProps) {
  if (!gameState) return null;

  // Hand Cricket Momentum
  if (game === "handcricket") {
    const innings = Number(gameState.currentInning ?? gameState.innings ?? 1);
    const runs = Number(gameState.runs ?? gameState.teamRuns ?? 0);
    const wickets = Number(gameState.wickets ?? gameState.teamWickets ?? 0);
    const target = Number(gameState.target ?? 0);
    const ballsRemaining = Number(gameState.ballsRemaining ?? 0);

    if (innings === 2 && target > 0) {
      const runsNeeded = Math.max(0, target - runs);
      const rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(1) : "0.0";
      const leadPercentage = Math.min(100, Math.max(0, (runs / target) * 100));

      const isPressure = Number(rrr) > 9.0;
      const isComfortable = Number(rrr) <= 6.0;

      return (
        <div className="w-full max-w-4xl mx-auto px-4 py-2 rounded-2xl bg-black/70 border border-amber-500/30 backdrop-blur-md flex flex-col gap-1.5 shadow-xl select-none">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 uppercase tracking-wider">CHASE MOMENTUM</span>
              <span className="text-stone-300">
                Need <strong className="text-amber-200 text-sm font-black">{runsNeeded}</strong> off{" "}
                <strong className="text-amber-200 text-sm font-black">{ballsRemaining}</strong> balls
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">RRR:</span>
              <span
                className={`px-2 py-0.5 rounded-md font-black text-xs ${
                  isPressure
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : isComfortable
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {rrr} RPO
              </span>
            </div>
          </div>

          {/* Tug of war bar */}
          <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden border border-amber-900/40 relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-500"
              style={{ width: `${leadPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-stone-950 uppercase tracking-widest pointer-events-none">
              {leadPercentage.toFixed(0)}% OF TARGET REACHED
            </div>
          </div>
        </div>
      );
    }
  }

  // Dots & Boxes Territory Dominance
  if (game === "dotsboxes") {
    const totalBoxes = Number(gameState.totalBoxes ?? 16);
    const boxScores = (gameState.scores as Record<string, number> | undefined) ?? {};
    const claimedCount = Object.values(boxScores).reduce((sum, count) => sum + count, 0);

    if (totalBoxes > 0) {
      return (
        <div className="w-full max-w-3xl mx-auto px-4 py-2 rounded-2xl bg-black/60 border border-amber-500/30 backdrop-blur-md flex flex-col gap-1.5 shadow-lg select-none">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>TERRITORY DOMINANCE</span>
            </div>
            <span>
              {claimedCount} / {totalBoxes} Boxes Claimed
            </span>
          </div>

          {/* Multi-player territory bar */}
          <div className="w-full h-3.5 bg-stone-900 rounded-full overflow-hidden flex border border-amber-900/40">
            {players.map((p, idx) => {
              const score = boxScores[p.id] ?? 0;
              const pct = (score / totalBoxes) * 100;
              const colors = ["bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500"];
              const barColor = colors[idx % colors.length];

              if (pct <= 0) return null;
              return (
                <div
                  key={p.id}
                  className={`h-full ${barColor} transition-all duration-500 relative group`}
                  style={{ width: `${pct}%` }}
                  title={`${p.name}: ${score} boxes`}
                />
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Ludo Home Stretch Lead Tracker
  if (game === "ludo") {
    const tokens = gameState.tokens as Record<string, LudoToken[]> | undefined;
    const playerColors = (gameState.playerColors as Record<string, LudoColor> | undefined) ?? {};

    if (tokens && Object.keys(tokens).length > 0) {
      return (
        <div className="w-full max-w-3xl mx-auto px-4 py-1.5 rounded-2xl bg-black/60 border border-amber-500/25 backdrop-blur-md flex items-center justify-between gap-4 shadow-md select-none text-xs font-mono">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Trophy className="w-3.5 h-3.5" />
            <span>HOME RACE:</span>
          </div>

          <div className="flex items-center gap-4">
            {players.map((p) => {
              const pTokens = tokens[p.id] ?? [];
              const homeCount = pTokens.filter((t) => t.state === "home" || (t.stretchPos !== undefined && t.stretchPos >= 5)).length;
              const color = playerColors[p.id] ?? "yellow";
              const hex = COLOR_HEX[color] || "#F59E0B";

              return (
                <div key={p.id} className="flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hex }} />
                  <span className="text-stone-300">{p.name.slice(0, 8)}:</span>
                  <span className="text-white font-black">{homeCount}/4</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  return null;
}
