import React, { useEffect } from "react";
import { Zap, Crown, Flame, ArrowRight, Share2, X } from "lucide-react";
import CountUp from "../CountUp";
import { HapticsManager } from "../../services/HapticsManager";
import type { RecordScoreResult } from "@shared/profile/Scorecard";

interface PersonalBestOverdriveModalProps {
  result: RecordScoreResult | null;
  /** The game's display name, shown beside the mode ("Rummy · Pool 101"). */
  gameName?: string;
  /** What the score is counted in ("runs", "s"), so the improvement reads in the game's own terms. */
  unit?: string;
  onClose: () => void;
  onShare?: () => void;
  onViewScorecards?: () => void;
}

export default function PersonalBestOverdriveModal({
  result,
  gameName,
  unit,
  onClose,
  onShare,
  onViewScorecards,
}: PersonalBestOverdriveModalProps) {
  useEffect(() => {
    if (result?.isNewPersonalBest) {
      HapticsManager.getInstance().win();
    }
  }, [result]);

  if (!result || !result.isNewPersonalBest) return null;

  const { scorecard, deltaFromPrevious, previousBest } = result;
  const amount = Math.abs(deltaFromPrevious);
  const deltaFormatted = `Improved by ${amount}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pb-title"
    >
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 [@media(max-height:480px)]:p-4 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center overflow-hidden">
        {/* Ambient Overdrive Background Flares */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Crown Badge */}
        <div className="mx-auto w-16 h-16 mb-4 [@media(max-height:480px)]:hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.5)] transform rotate-3 hover:rotate-0 transition-transform">
          <Crown className="w-9 h-9 text-slate-950 fill-slate-950" />
        </div>

        {/* Holographic Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-widest">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>You beat your own record!</span>
        </div>

        <h2 id="pb-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
          NEW PERSONAL RECORD
        </h2>
        <p className="text-sm font-medium text-slate-400 mb-6">
          {gameName ? `${gameName} · ` : ""}{scorecard.modeDisplayName}
        </p>

        {/* Score comparison card */}
        <div className="p-4 mb-6 [@media(max-height:480px)]:mb-3 rounded-xl bg-slate-900/80 border border-amber-500/30">
          <div className="flex items-center justify-center gap-4 sm:gap-6 font-mono">
            {typeof previousBest === "number" && previousBest > 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Your old record</span>
                <span className="text-xl font-bold text-slate-400 line-through">
                  {previousBest}
                </span>
              </div>
            )}

            {typeof previousBest === "number" && previousBest > 0 && (
              <ArrowRight className="w-5 h-5 text-amber-400/70" />
            )}

            <div className="text-center">
              <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider">New record</span>
              <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                <CountUp end={scorecard.bestScore} duration={1.5} />
              </span>
            </div>
          </div>

          {/* Delta Pill */}
          {deltaFromPrevious !== 0 && (
            <div className="mt-3 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-emerald-400" />
              <span>{deltaFormatted}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={onClose}
            autoFocus
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none min-h-[44px]"
          >
            <span>Awesome!</span>
          </button>
          {(onViewScorecards || onShare) && (
            <div className="grid grid-cols-2 gap-3">
              {onViewScorecards && (
                <button
                  onClick={() => {
                    onViewScorecards();
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none min-h-[44px] ${
                    !onShare ? "col-span-2" : ""
                  }`}
                >
                  <span>View My Records</span>
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none min-h-[44px] ${
                    !onViewScorecards ? "col-span-2" : ""
                  }`}
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Share</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
