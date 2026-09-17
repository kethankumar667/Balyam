import { memo } from "react";
import type { Game2048Mode } from "./useGame2048";
import { Trophy, Swords, Flag, Clock, Orbit, Crown, ArrowRight, ArrowLeft } from "lucide-react";

interface ModeCard {
  id: Game2048Mode;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  blurb: string;
  emotionalHook: string;
  tag: string;
  cardGradient: string;
  borderStyle: string;
  glowShadow: string;
  iconBg: string;
  badgeBg: string;
  btnGradient: string;
}

const MODES: ModeCard[] = [
  {
    id: "battle",
    emoji: "⚔️",
    icon: Swords,
    label: "Battle",
    subtitle: "The Crucible",
    blurb: "Garbage tiles escalate as you merge — survive as long as you can.",
    emotionalHook: "Can you hold the line when creeping shadow tiles threaten your kingdom?",
    tag: "SURVIVAL",
    cardGradient:
      "bg-gradient-to-br from-rose-100/95 via-white to-rose-50/80 dark:from-rose-950/50 dark:via-stone-900/90 dark:to-stone-950",
    borderStyle:
      "border-rose-300/80 dark:border-rose-600/40 hover:border-rose-500 dark:hover:border-rose-400",
    glowShadow: "0 8px 24px rgba(244, 63, 94, 0.16)",
    iconBg: "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-rose-500/30",
    badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30",
    btnGradient:
      "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/30",
  },
  {
    id: "race",
    emoji: "🏁",
    icon: Flag,
    label: "Race",
    subtitle: "Velocity Sprint",
    blurb: "Sprint to 2048 and beat your own best time.",
    emotionalHook: "Pure instinct and lightning decisions. Race the ghost of your swiftest run.",
    tag: "SPEEDRUN",
    cardGradient:
      "bg-gradient-to-br from-sky-100/95 via-white to-blue-50/80 dark:from-sky-950/50 dark:via-stone-900/90 dark:to-stone-950",
    borderStyle:
      "border-sky-300/80 dark:border-sky-600/40 hover:border-sky-500 dark:hover:border-sky-400",
    glowShadow: "0 8px 24px rgba(56, 189, 248, 0.16)",
    iconBg: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/30",
    badgeBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30",
    btnGradient:
      "bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 text-white shadow-sky-600/30",
  },
  {
    id: "timeattack",
    emoji: "⏱",
    icon: Clock,
    label: "Time Attack",
    subtitle: "The Tempest",
    blurb: "2 minutes on the clock — chase the highest score.",
    emotionalHook: "The sands of time slip fast. Strike fearlessly and ascend before the buzzer sounds.",
    tag: "ADRENALINE",
    cardGradient:
      "bg-gradient-to-br from-amber-100/95 via-white to-orange-50/80 dark:from-amber-950/50 dark:via-stone-900/90 dark:to-stone-950",
    borderStyle:
      "border-amber-300/80 dark:border-amber-600/40 hover:border-amber-500 dark:hover:border-amber-400",
    glowShadow: "0 8px 24px rgba(245, 158, 11, 0.18)",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30",
    badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/30",
    btnGradient:
      "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black shadow-amber-500/30",
  },
  {
    id: "zen",
    emoji: "🧘",
    icon: Orbit,
    label: "Zen",
    subtitle: "The Sanctuary",
    blurb: "No clock, no pressure — a few free undos and a calm slide.",
    emotionalHook: "Breathe deeply. Unwind your thoughts and weave numbers together in tranquil harmony.",
    tag: "TRANQUILITY",
    cardGradient:
      "bg-gradient-to-br from-emerald-100/95 via-white to-teal-50/80 dark:from-emerald-950/50 dark:via-stone-900/90 dark:to-stone-950",
    borderStyle:
      "border-emerald-300/80 dark:border-emerald-600/40 hover:border-emerald-500 dark:hover:border-emerald-400",
    glowShadow: "0 8px 24px rgba(16, 185, 129, 0.16)",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30",
    badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/30",
    btnGradient:
      "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30",
  },
];

export interface Game2048ModeMenuProps {
  bestScore: Record<"battle" | "timeattack" | "zen", number>;
  bestRaceTimeMs: number | null;
  onSelect: (mode: Game2048Mode) => void;
  onExit?: () => void;
}

function formatMs(ms: number): string {
  const totalSeconds = ms / 1000;
  return `${totalSeconds.toFixed(1)}s`;
}

function Game2048ModeMenu({ bestScore, bestRaceTimeMs, onSelect, onExit }: Game2048ModeMenuProps) {
  return (
    <div className="relative min-h-dvh-safe h-full w-full flex flex-col justify-between p-3 sm:p-5 bg-[#FAF7F2] dark:bg-[#070B14] overflow-y-auto overflow-x-hidden select-none">
      {/* Contained Ambient Aurora Lights - Strictly overflow-hidden so blurs never cause page scroll */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-400/20 dark:bg-rose-600/15 blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-sky-400/20 dark:bg-sky-600/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-emerald-400/20 dark:bg-emerald-600/15 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl" />
      </div>

      {/* Top Header Bar with Exit Button */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pb-2 shrink-0">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-3.5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow hover:bg-white dark:hover:bg-stone-800 active:scale-95 transition flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-bold text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-xs backdrop-blur-md">
          <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />
          <span>BHALYAM LOUNGE</span>
          <span className="opacity-40">•</span>
          <span>THE ART OF FUSION</span>
        </div>
      </header>

      {/* Hero Showcase with Compact Tile Evolution Story */}
      <section className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-2.5 my-auto py-1 shrink-0">
        {/* Visual Mini Evolution Track */}
        <div className="inline-flex items-center justify-center gap-2 p-1.5 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800/80 shadow-sm backdrop-blur-md">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#EEE4DA] text-[#6B5D52] font-black text-[10px] sm:text-xs flex items-center justify-center shadow-2xs">
            2
          </div>
          <ArrowRight className="w-2.5 h-2.5 text-amber-500/70" />
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#F59563] text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-2xs">
            16
          </div>
          <ArrowRight className="w-2.5 h-2.5 text-amber-500/70" />
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#EDCF72] text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-2xs">
            128
          </div>
          <ArrowRight className="w-2.5 h-2.5 text-amber-500/70" />
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-stone-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-xs ring-2 ring-amber-400/60">
            👑
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 dark:text-stone-100 tracking-tight drop-shadow-sm leading-none">
            2048
          </h1>
          <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
            Pick a mode to start
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-tight">
            Every masterwork begins with two humble sparks. Where will you make your stand today?
          </p>
        </div>

        {/* 4 Colorful Mode Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1.5 max-w-4xl mx-auto w-full">
          {MODES.map((m) => {
            const best = m.id === "race" ? bestRaceTimeMs : bestScore[m.id];
            const hasRecord = best != null && best > 0;
            const IconComponent = m.icon;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={`group relative p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between min-h-[125px] sm:min-h-[140px] shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-md ${m.cardGradient} ${m.borderStyle}`}
                style={{
                  boxShadow: m.glowShadow,
                }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm ${m.iconBg} transform group-hover:scale-105 transition-transform shrink-0`}
                      >
                        <IconComponent className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                            {m.label}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 dark:text-stone-400">
                          {m.subtitle}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs shrink-0 ${m.badgeBg}`}
                    >
                      {m.tag}
                    </span>
                  </div>

                  {/* Core Blurb (required by tests) */}
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 leading-snug">
                    {m.blurb}
                  </p>

                  {/* Emotional Narrative Hook */}
                  <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 italic mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">
                    "{m.emotionalHook}"
                  </p>
                </div>

                {/* Card Footer: Record & Play Button */}
                <div className="mt-2.5 pt-2 border-t border-stone-200/70 dark:border-stone-800/80 flex items-center justify-between">
                  {hasRecord ? (
                    <div className="flex items-center gap-1 font-black text-xs text-amber-600 dark:text-amber-400">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>
                        Best: {m.id === "race" ? formatMs(best) : best.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 dark:text-stone-500">
                      No run yet
                    </span>
                  )}

                  <div
                    className={`min-h-[32px] sm:min-h-[36px] px-3 sm:px-3.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all group-hover:scale-105 ${m.btnGradient}`}
                  >
                    <span>Play</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom Emotional Quote Banner */}
      <footer className="relative z-10 w-full max-w-md mx-auto text-center pt-2 pb-1 shrink-0">
        <div className="px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-amber-500/20 shadow-xs backdrop-blur-md inline-block">
          <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium italic">
            “One more merge and I'll stop.” — Every 2048 addict, every time.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default memo(Game2048ModeMenu);
