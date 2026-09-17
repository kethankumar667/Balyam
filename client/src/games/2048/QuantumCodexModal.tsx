import { memo } from "react";
import { QUANTUM_TIERS, getTileVisual, type TableTheme } from "./tileStyles";
import { Crown, Lock, X, Orbit, Zap, ShieldCheck } from "lucide-react";

export interface QuantumCodexModalProps {
  isOpen?: boolean;
  highestEver: number;
  currentTheme?: TableTheme;
  onClose: () => void;
}

function QuantumCodexModal({ isOpen = true, highestEver, currentTheme = "cyberpunk", onClose }: QuantumCodexModalProps) {
  if (!isOpen) return null;

  const unlockedCount = QUANTUM_TIERS.filter((t) => highestEver >= t.value).length;
  const progressPercent = Math.round((unlockedCount / QUANTUM_TIERS.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90dvh] bg-[#0A0E18] text-stone-100 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <header className="p-4 sm:p-6 border-b border-stone-800/80 flex items-center justify-between gap-4 bg-gradient-to-r from-stone-900/90 via-[#0E1526]/90 to-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Orbit className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 id="codex-title" className="text-base sm:text-lg font-black tracking-wider uppercase font-mono text-cyan-200 flex items-center gap-2">
                <span>QUANTUM CODEX</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                  {unlockedCount} / {QUANTUM_TIERS.length} HARNESSED
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Lounge archives of all synthesized quantum energy designations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Codex"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition flex items-center justify-center border border-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Progress Bar */}
        <div className="w-full bg-stone-900 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Codex Tier Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {QUANTUM_TIERS.map((tier) => {
            const isUnlocked = highestEver >= tier.value;
            const visual = getTileVisual(tier.value, currentTheme);

            if (!isUnlocked) {
              return (
                <div
                  key={tier.value}
                  className="relative p-4 rounded-2xl bg-stone-950/60 border border-stone-800/60 flex flex-col justify-between opacity-60 filter grayscale"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-600">
                      TIER ???
                    </span>
                    <Lock className="w-4 h-4 text-stone-600" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-700 font-mono font-black text-sm my-2">
                    ?
                  </div>
                  <p className="text-xs font-mono text-stone-500 mt-2">
                    Synthesize {tier.value} to declassify quantum telemetry.
                  </p>
                </div>
              );
            }

            return (
              <div
                key={tier.value}
                className="relative p-4 rounded-2xl bg-stone-900/90 border border-stone-800 hover:border-cyan-500/50 shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {tier.code}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/90 flex items-center gap-1">
                    {tier.value >= 2048 ? <Crown className="w-3 h-3 text-amber-400" /> : <Zap className="w-3 h-3 text-cyan-400" />}
                    <span>{tier.tier}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow shrink-0 font-mono"
                    style={{
                      background: visual.bg,
                      color: visual.text,
                      border: `1.5px solid ${visual.border}`,
                    }}
                  >
                    {tier.value}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-stone-100 font-mono leading-snug">
                      {tier.title}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-mono leading-tight">
                      {tier.synthesis}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-300/90 leading-relaxed font-sans pt-1 border-t border-stone-800/80">
                  {tier.lore}
                </p>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <footer className="p-4 border-t border-stone-800/80 bg-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Highest Core: <strong className="text-amber-400">{highestEver || 2}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg transition"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

export default memo(QuantumCodexModal);
