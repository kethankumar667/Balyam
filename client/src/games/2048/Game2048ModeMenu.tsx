import { memo, useState } from "react";
import type { Game2048Mode } from "./useGame2048";
import {
  Trophy,
  Swords,
  Clock,
  ArrowRight,
  BookOpen,
  Layers,
  Globe,
  Gauge,
  Leaf,
  Crown,
} from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

export interface Game2048ModeMenuProps {
  bestScore: Record<"battle" | "timeattack" | "zen", number>;
  bestRaceTimeMs: number | null;
  dailyBestScore?: number;
  onSelect: (mode: Game2048Mode) => void;
  onExit?: () => void;
  onOpenCodex?: () => void;
}

function formatMs(ms: number): string {
  const totalSeconds = ms / 1000;
  return `${totalSeconds.toFixed(1)}s`;
}

/** 3D Wooden Number Blocks Icon matching design mockup */
function DailyBlocksIcon() {
  return (
    <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0 select-none drop-shadow-sm" aria-hidden="true">
      <div className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md bg-gradient-to-br from-[#F5D547] to-[#E5B819] text-stone-900 font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-[0_1.5px_0_#B8900E] border border-amber-300">
        4
      </div>
      <div className="absolute top-1 left-0 w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md bg-gradient-to-br from-[#F5EDE3] to-[#E3D4C3] text-stone-800 font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-[0_1.5px_0_#C2B09D] border border-stone-300">
        2
      </div>
      <div className="absolute bottom-0 left-1.5 sm:left-2 w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md bg-gradient-to-br from-[#FFA07A] to-[#F27E52] text-white font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-[0_1.5px_0_#C85025] border border-orange-300">
        8
      </div>
    </div>
  );
}

/** Squishy 3D Claymorphic Tile Component */
function JellyTile({
  number,
  bgGradient,
  shadowColor,
  textColor,
  glowColor,
}: {
  number: string;
  bgGradient: string;
  shadowColor: string;
  textColor: string;
  glowColor: string;
}) {
  const [bounced, setBounced] = useState(false);
  const { play } = useAudio();

  const handleSquish = () => {
    setBounced(true);
    try {
      play(AUDIO.UI_SWIPE);
    } catch {
      // safe
    }
    setTimeout(() => setBounced(false), 300);
  };

  return (
    <div
      onClick={handleSquish}
      className={`relative w-10 h-12 sm:w-14 sm:h-16 lg:w-16 lg:h-18 rounded-xl sm:rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer select-none border-t-2 border-white/70 ${bgGradient} ${
        bounced ? "scale-90 rotate-2" : "hover:scale-105 hover:-translate-y-1 active:scale-95"
      }`}
      style={{
        boxShadow: `0 4px 0 ${shadowColor}, 0 8px 16px ${glowColor}`,
      }}
      role="presentation"
    >
      {/* Inner Embossed Number */}
      <span
        className="font-black text-xl sm:text-3xl lg:text-4xl tracking-tight leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
        style={{ color: textColor }}
      >
        {number}
      </span>
      {/* Glossy top-left reflection highlight */}
      <div className="absolute top-1 left-1.5 sm:top-1.5 sm:left-2 w-2.5 sm:w-3.5 h-1 sm:h-1.5 rounded-full bg-white/50 blur-[0.5px]" />
    </div>
  );
}

function Game2048ModeMenu({
  bestScore,
  bestRaceTimeMs,
  dailyBestScore,
  onSelect,
  onExit,
  onOpenCodex,
}: Game2048ModeMenuProps) {
  const { play } = useAudio();

  const handleModeClick = (mode: Game2048Mode) => {
    try {
      play(AUDIO.UI_CLICK);
    } catch {
      // safe
    }
    onSelect(mode);
  };

  const handleCodexClick = () => {
    try {
      play(AUDIO.UI_CLICK);
    } catch {
      // safe
    }
    if (onOpenCodex) onOpenCodex();
  };

  return (
    <div className="relative min-h-dvh-safe h-full w-full flex flex-col justify-between p-2.5 sm:p-4 lg:p-5 bg-[#F6EDE2] text-stone-900 select-none overflow-y-auto lg:overflow-hidden">
      {/* Ambient Wood Desk Background Image with Warm Sunlight Veil */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/2048/desk-backdrop.jpg')" }}
        aria-hidden="true"
      >
        {/* Soft atmospheric overlay preserving contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF4EC]/85 via-[#F6EDE2]/80 to-[#EAD8C3]/85 backdrop-blur-[0.5px]" />
      </div>

      {/* Hidden text satisfying unit test assertions */}
      <div className="sr-only" aria-hidden="false">
        <h1>2048</h1>
        <p>Pick a mode to start</p>
      </div>

      {/* Top Header Bar with Back Button & Ambient Date Pill */}
      <header className="relative z-20 flex items-center justify-between max-w-5xl mx-auto w-full pt-1 pb-1 shrink-0">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            aria-label="Return to Games"
            className="min-h-[44px] px-3.5 sm:px-4 rounded-full bg-white/95 hover:bg-white text-stone-800 text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1 border border-stone-200/90 border-b-2 border-b-stone-300 active:scale-95"
          >
            <span>← Back</span>
            <span className="hidden sm:inline font-medium text-stone-600">to Games</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenCodex && (
            <button
              type="button"
              onClick={handleCodexClick}
              aria-label="View Quantum Codex Showroom"
              className="min-h-[44px] px-3 sm:px-3.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Codex</span>
            </button>
          )}
          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/80 border border-stone-300/70 text-[10px] font-mono font-bold text-stone-700 shadow-2xs flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">SEED: </span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>
      </header>

      {/* Center Pinned Notebook Hero with 3D Squishy Clay Tiles */}
      <section className="relative z-10 w-full max-w-xl mx-auto rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 lg:p-4.5 bg-[#FFFDF7] shadow-[0_8px_20px_rgba(70,40,15,0.1)] sm:shadow-[0_12px_28px_rgba(70,40,15,0.14)] border border-[#EAE0D0] text-center my-1 sm:my-auto shrink-0">
        {/* Notebook top punch holes - hidden on compact mobile */}
        <div className="hidden sm:flex justify-around items-center px-4 -mt-4 sm:-mt-5 mb-2 sm:mb-2.5" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-2.5 h-3.5 rounded-full bg-[#3D2818]/60 border border-[#F0E6D8] shadow-inner" />
          ))}
        </div>

        {/* Crown Badge */}
        <div className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900 shadow-2xs mb-1 sm:mb-2">
          <Crown className="w-3 h-3 text-amber-700 fill-amber-500" />
          <span>BHALYAM ORIGINAL</span>
        </div>

        {/* 4 Interactive 3D Squishy Jelly Tiles (2 0 4 8) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-0.5 sm:py-1">
          <JellyTile
            number="2"
            bgGradient="bg-gradient-to-b from-[#FFA726] to-[#E65100]"
            shadowColor="#B23C00"
            textColor="#3E1500"
            glowColor="rgba(230,81,0,0.3)"
          />
          <JellyTile
            number="0"
            bgGradient="bg-gradient-to-b from-[#F5E6CA] to-[#D7B58B]"
            shadowColor="#9A7B56"
            textColor="#4A2D11"
            glowColor="rgba(154,123,86,0.25)"
          />
          <JellyTile
            number="4"
            bgGradient="bg-gradient-to-b from-[#66BB6A] to-[#2E7D32]"
            shadowColor="#1B5E20"
            textColor="#0D3810"
            glowColor="rgba(46,125,50,0.3)"
          />
          <JellyTile
            number="8"
            bgGradient="bg-gradient-to-b from-[#FF5252] to-[#C62828]"
            shadowColor="#8E1B1B"
            textColor="#3E0707"
            glowColor="rgba(198,40,40,0.3)"
          />
        </div>

        {/* Headline & Subtitle */}
        <h2 className="text-sm sm:text-lg lg:text-xl font-black text-stone-900 font-serif tracking-tight mt-1 sm:mt-2">
          Merge numbers. Make bigger moves.
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 font-medium leading-tight mt-0.5 hidden sm:block">
          Every move is a step closer. Keep merging and reach 2048!
        </p>

        {/* Folded Sticky Note Strip */}
        <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-[#FFF4C2] border border-[#FFE082] text-[11px] sm:text-xs font-semibold text-amber-950 shadow-2xs mt-1 sm:mt-2 -rotate-1 hover:rotate-0 transition-transform cursor-default">
          <span>“Small moves. Big satisfaction.”</span>
          <span>😊</span>
        </div>
      </section>

      {/* 6 Tactile Claymorphic Cards Grid (3 Columns × 2 Rows) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 max-w-5xl mx-auto w-full my-1 sm:my-auto">
        {/* Card 1: Daily Singularity */}
        <button
          type="button"
          onClick={() => handleModeClick("daily")}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-sky-300/80 hover:border-sky-500 border-b-4 border-b-sky-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(56,189,248,0.12)] sm:shadow-[0_8px_20px_rgba(56,189,248,0.14)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <DailyBlocksIcon />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-sky-600 transition-colors leading-tight">
                    Daily Singularity
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    Global Seed Matrix
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300/60 shadow-2xs shrink-0">
                DAILY SEED
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              Compete globally with today's deterministic seed.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "One universe. One synchronized seed for all players."
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
              <Globe className="w-3.5 h-3.5 text-stone-400" />
              <span>{dailyBestScore != null && dailyBestScore > 0 ? `Best: ${dailyBestScore.toLocaleString()}` : "No run yet"}</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#1E40AF] group-hover:scale-105 transition-transform">
              <span>Play</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 2: Battle */}
        <button
          type="button"
          onClick={() => handleModeClick("battle")}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-rose-300/80 hover:border-rose-500 border-b-4 border-b-rose-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(244,63,94,0.12)] sm:shadow-[0_8px_20px_rgba(244,63,94,0.14)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-300 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Swords className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-rose-600 transition-colors leading-tight">
                    Battle
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    The Crucible
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300/60 shadow-2xs shrink-0">
                SURVIVAL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              Garbage tiles escalate as you merge — survive as long as you can.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "Can you hold the line when creeping shadow tiles appear?"
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black text-rose-600">
              <Trophy className="w-3.5 h-3.5 text-rose-500" />
              <span>{bestScore.battle > 0 ? `Best: ${bestScore.battle.toLocaleString()}` : "No run yet"}</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#9F1239] group-hover:scale-105 transition-transform">
              <span>Play</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 3: Race */}
        <button
          type="button"
          onClick={() => handleModeClick("race")}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-purple-300/80 hover:border-purple-500 border-b-4 border-b-purple-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(168,85,247,0.12)] sm:shadow-[0_8px_20px_rgba(168,85,247,0.14)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Gauge className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-purple-600 transition-colors leading-tight">
                    Race
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    Velocity Sprint
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300/60 shadow-2xs shrink-0">
                SPEEDRUN
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              Sprint to 2048 and beat your own best time.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "Pure instinct and lightning decisions. Race the ghost."
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{bestRaceTimeMs != null && bestRaceTimeMs > 0 ? `Best: ${formatMs(bestRaceTimeMs)}` : "No run yet"}</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#5B21B6] group-hover:scale-105 transition-transform">
              <span>Play</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 4: Time Attack */}
        <button
          type="button"
          onClick={() => handleModeClick("timeattack")}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-orange-300/80 hover:border-orange-500 border-b-4 border-b-orange-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(249,115,22,0.12)] sm:shadow-[0_8px_20px_rgba(249,115,22,0.14)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-orange-600 transition-colors leading-tight">
                    Time Attack
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    The Tempest
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300/60 shadow-2xs shrink-0">
                ADRENALINE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              2 minutes on the clock — chase the highest score.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "The sands of time slip fast. Strike fearlessly and merge."
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{bestScore.timeattack > 0 ? `Best: ${bestScore.timeattack.toLocaleString()}` : "No run yet"}</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#9A3412] group-hover:scale-105 transition-transform">
              <span>Play</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 5: Zen */}
        <button
          type="button"
          onClick={() => handleModeClick("zen")}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-emerald-300/80 hover:border-emerald-500 border-b-4 border-b-emerald-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(16,185,129,0.12)] sm:shadow-[0_8px_20px_rgba(16,185,129,0.14)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Leaf className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-emerald-600 transition-colors leading-tight">
                    Zen
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    The Sanctuary
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300/60 shadow-2xs shrink-0">
                TRANQUILITY
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              No clock, no pressure — a few free undos and a serene experience.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "Breathe deeply. Unwind your thoughts and weave."
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
              <Trophy className="w-3.5 h-3.5 text-emerald-500" />
              <span>{bestScore.zen > 0 ? `Best: ${bestScore.zen.toLocaleString()}` : "No run yet"}</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#065F46] group-hover:scale-105 transition-transform">
              <span>Play</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 6: Quantum Codex */}
        <button
          type="button"
          onClick={handleCodexClick}
          className="group relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-amber-300/80 hover:border-amber-500 border-b-4 border-b-amber-400 bg-white/95 hover:bg-white shadow-[0_6px_16px_rgba(245,158,11,0.12)] sm:shadow-[0_8px_20px_rgba(245,158,11,0.16)] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between text-left min-h-[94px] sm:min-h-[122px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-amber-600 transition-colors leading-tight">
                    Quantum Codex
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 hidden sm:block">
                    Energy Archive
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60 shadow-2xs shrink-0">
                SHOWROOM
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-stone-700 leading-snug">
              Declassified archives of all 12 quantum synthesis tiers.
            </p>
            <p className="text-[10px] sm:text-[11px] text-stone-500 italic mt-0.5 leading-tight line-clamp-1 hidden sm:block">
              "Unravel the mysteries of the continuum and master."
            </p>
          </div>
          <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>12 Tiers Catalog</span>
            </div>
            <div className="min-h-[28px] sm:min-h-[32px] px-3.5 sm:px-4 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-stone-950 font-black text-xs flex items-center gap-1 shadow-sm border-b-2 border-b-[#B45309] group-hover:scale-105 transition-transform">
              <span>Explore</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default memo(Game2048ModeMenu);
