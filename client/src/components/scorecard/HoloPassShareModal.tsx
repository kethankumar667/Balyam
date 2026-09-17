import React, { useState, useRef } from "react";
import { Trophy, Zap, Share2, Copy, Check, X, QrCode } from "lucide-react";
import type { ModeScorecard, AllGameSlug } from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";

interface HoloPassShareModalProps {
  game: AllGameSlug;
  scorecard: ModeScorecard;
  playerName: string;
  avatar?: string;
  onClose: () => void;
}

export default function HoloPassShareModal({
  game,
  scorecard,
  playerName,
  avatar,
  onClose,
}: HoloPassShareModalProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const gameConfig = getGameModeConfig(game);
  const challengeUrl = `${window.location.origin}/games/${game}?challengeMode=${scorecard.modeId}&targetScore=${scorecard.bestScore}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `BHALYAM Record: ${playerName} at ${gameConfig.displayName}`,
          text: `I just crushed the personal record in ${gameConfig.displayName} (${scorecard.modeDisplayName}) with a score of ${scorecard.bestScore}! Can you beat my ghost?`,
          url: challengeUrl,
        });
      } catch {
        // Dismissed share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🔥 I set a new Personal Best of ${scorecard.bestScore} in ${gameConfig.displayName} (${scorecard.modeDisplayName}) on BHALYAM!\n\nCan you beat my record? Play here: ${challengeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="holo-pass-title"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-950 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] p-6 text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Holo-Pass Card Content */}
        <div
          ref={cardRef}
          className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border border-cyan-500/50 shadow-inner overflow-hidden mb-5 text-left"
        >
          {/* Futuristic Scanline lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.04)_51%)] bg-[length:100%_4px] pointer-events-none" />

          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                BHALYAM CHRONO-PASS
              </span>
            </div>
            <div className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
              VERIFIED RECORD
            </div>
          </div>

          {/* Player info */}
          <div className="flex items-center gap-3 mb-4">
            {avatar ? (
              <img
                src={`/Avatars/${avatar}`}
                alt={playerName}
                className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                {playerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-base font-extrabold text-white leading-tight">{playerName}</div>
              <div className="text-xs text-slate-400 font-mono">{gameConfig.displayName}</div>
            </div>
          </div>

          {/* Record Display */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800 mb-3">
            <div className="text-[10px] text-cyan-400 font-mono font-semibold uppercase tracking-wider mb-0.5">
              {scorecard.modeDisplayName}
            </div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-200 font-mono tracking-tight">
              {scorecard.bestScore}
            </div>
          </div>

          {/* Verification Hash & QR Placeholder */}
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-800">
            <span>HASH: {scorecard.bestScoreMatchId.slice(0, 14)}...</span>
            <span className="flex items-center gap-1 text-cyan-500/80">
              <QrCode className="w-3 h-3" /> SCAN TO CHALLENGE
            </span>
          </div>
        </div>

        <h3 id="holo-pass-title" className="text-lg font-bold text-white mb-1">
          Challenge Your Friends
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Share your holographic scorecard to let rivals race against your ghost record.
        </p>

        {/* Share actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Holo-Pass</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/40 transition-all min-h-[44px]"
            >
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all min-h-[44px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Link!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
