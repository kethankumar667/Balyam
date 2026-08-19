import React from "react";
import { SocialTipsArtwork } from "./SocialArtwork";

export default function SocialTipsCard() {
  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-sm relative overflow-hidden">
      {/* Top subtle glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        <SocialTipsArtwork className="w-9 h-9 flex-shrink-0" />
        <div>
          <h4 className="font-extrabold text-sm text-[var(--auth-ink)] leading-tight">
            Squad Gaming Tips
          </h4>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-500">
            PRO ADVICE
          </span>
        </div>
      </div>

      <div className="space-y-2.5 text-xs text-[var(--auth-ink-soft)] leading-relaxed relative z-10">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 font-bold font-mono">01</span>
          <p>
            <strong>Squad Up for Tournaments:</strong> Assemble a 4-player party to queue together in weekly championship brackets with double XP bonuses.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-purple-500 font-bold font-mono">02</span>
          <p>
            <strong>Seamless WebRTC Voice:</strong> Use high-fidelity mesh voice chat inside private squad lobbies to strategize in real time.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-emerald-500 font-bold font-mono">03</span>
          <p>
            <strong>Shared Match Records:</strong> Click <em>History</em> on any friend card to review your head-to-head records and co-op victory counts.
          </p>
        </div>
      </div>
    </div>
  );
}
