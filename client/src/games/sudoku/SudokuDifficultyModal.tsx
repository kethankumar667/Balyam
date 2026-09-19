import { memo, useState } from "react";
import { type SudokuDifficulty, type SudokuLevelProgress } from "./useSudoku";
import { SUDOKU_THEMES, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import { X, Trophy, Flame, Orbit, ShieldCheck, Zap, ArrowRight, Play } from "lucide-react";
import { useScorecardStore } from "../../store/scorecardStore";
import Modal from "../../components/Modal";

export interface SudokuDifficultyModalProps {
  isOpen: boolean;
  currentDifficulty: SudokuDifficulty;
  progress: SudokuLevelProgress;
  themeId: SudokuThemeId;
  onClose: () => void;
  onSelectDifficulty: (diff: SudokuDifficulty) => void;
}

const DIFFICULTIES: Array<{
  id: SudokuDifficulty;
  title: string;
  subtitle: string;
  badge: string;
  icon: typeof Zap;
  colorClass: string;
  lightClass: string;
}> = [
  {
    id: "easy",
    title: "Neural Initiate",
    subtitle: "Casual relaxing solve with generous clues",
    badge: "Easy",
    icon: ShieldCheck,
    colorClass: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300",
    lightClass: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70",
  },
  {
    id: "medium",
    title: "Data Runner",
    subtitle: "Balanced logical deduction & pattern scanning",
    badge: "Medium",
    icon: Orbit,
    colorClass: "from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300",
    lightClass: "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100/70",
  },
  {
    id: "hard",
    title: "Cyber Architect",
    subtitle: "Advanced deduction, hidden pairs & candidate pruning",
    badge: "Hard",
    icon: Flame,
    colorClass: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300",
    lightClass: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70",
  },
  {
    id: "expert",
    title: "Quantum Singularity",
    subtitle: "Extreme logical depth for master puzzle decoders",
    badge: "Expert",
    icon: Zap,
    colorClass: "from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/40 text-fuchsia-300",
    lightClass: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100/70",
  },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SudokuDifficultyModal({
  isOpen,
  currentDifficulty,
  progress,
  themeId,
  onClose,
  onSelectDifficulty,
}: SudokuDifficultyModalProps) {
  const archive = useScorecardStore((s) => s.archive);
  const theme = SUDOKU_THEMES[themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(themeId);

  // Determine active completed records
  const completedLevels = (["easy", "medium", "hard", "expert"] as SudokuDifficulty[]).filter(
    (d) => (progress[d] || 0) > 0
  );

  const hasRecords = completedLevels.length > 0;
  const [showAllLevels, setShowAllLevels] = useState<boolean>(!hasRecords);

  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} ariaLabelledBy="difficulty-modal-title" panelClassName="w-full flex justify-center">
      <div
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto ${
          isLight
            ? "bg-white border border-slate-200 text-slate-800 shadow-slate-300/50"
            : "bg-[#0a0f1d] border border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                isLight
                  ? "bg-sky-100 border-sky-300 text-sky-700"
                  : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="difficulty-modal-title"
                className={`text-base sm:text-lg font-black uppercase tracking-wider ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                Sudoku Protocol
              </h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-stone-400"}`}>
                Infinite procedural puzzle matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition active:scale-95 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                : "bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Continuation Journey Mode */}
        {hasRecords && !showAllLevels && (
          <div className="flex flex-col gap-3">
            {completedLevels.length === 1 ? (
              // Single level completed scenario
              (() => {
                const lvl = completedLevels[0]!;
                const count = progress[lvl] || 0;
                const nextBoard = count + 1;
                return (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                      isLight ? "bg-sky-50/70 border-sky-200" : "bg-cyan-950/30 border-cyan-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                          Board-{count} Completed!
                        </h3>
                        <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-stone-300"}`}>
                          You completed <span className="font-bold">Board-{count}</span> in{" "}
                          <span className="font-bold uppercase text-cyan-500">{lvl}</span> level.
                          Do you want to go for <span className="font-bold">Board-{nextBoard}</span> in {lvl}, or select another difficulty?
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectDifficulty(lvl);
                        onClose();
                      }}
                      className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
                    >
                      <span>Continue {lvl} · Board {nextBoard}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()
            ) : (
              // Multiple records scenario
              <div className="flex flex-col gap-2.5">
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-stone-300"
                }`}>
                  You have records under multiple levels. Which difficulty do you want to continue?
                </div>

                <div className="flex flex-col gap-2">
                  {DIFFICULTIES.map((d) => {
                    const count = progress[d.id] || 0;
                    const nextBoard = count + 1;
                    const Icon = d.icon;
                    const isCurrent = currentDifficulty === d.id;

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          onSelectDifficulty(d.id);
                          onClose();
                        }}
                        className={`w-full min-h-[52px] p-3 rounded-2xl border text-left flex items-center justify-between transition active:scale-[0.98] ${
                          isLight
                            ? isCurrent
                              ? "bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-sm"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                            : isCurrent
                              ? "bg-white/10 border-cyan-400 ring-1 ring-cyan-400/50"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-white/5 border-white/10 text-stone-300"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-black uppercase tracking-wider ${
                                isLight ? "text-slate-900" : "text-white"
                              }`}>
                                {d.badge}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                count > 0 ? "text-emerald-500 font-bold" : "text-stone-400"
                              }`}>
                                {count > 0 ? `Board-${count} cleared` : "New level"}
                              </span>
                            </div>
                            <span className={`text-[11px] font-semibold ${
                              isLight ? "text-blue-600" : "text-cyan-400"
                            }`}>
                              Next: Board-{nextBoard}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl ${
                            isLight ? "bg-sky-100 text-sky-800" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          }`}>
                            Play Board {nextBoard}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider and Change Level Button */}
            <div className="border-t border-dashed border-slate-300/40 my-1 pt-2">
              <button
                type="button"
                onClick={() => setShowAllLevels(true)}
                className={`w-full min-h-[44px] py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-1.5 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                    : "bg-white/5 hover:bg-white/10 border-white/15 text-stone-300 hover:text-white"
                }`}
              >
                <span>Change Level / View All Levels</span>
              </button>
            </div>
          </div>
        )}

        {/* Standard All Difficulties Grid */}
        {(!hasRecords || showAllLevels) && (
          <div className="flex flex-col gap-2.5">
            {hasRecords && (
              <button
                type="button"
                onClick={() => setShowAllLevels(false)}
                className={`text-[11px] font-bold text-left underline pb-1 ${
                  isLight ? "text-sky-600" : "text-cyan-400"
                }`}
              >
                ← Back to Journey Records
              </button>
            )}

            {DIFFICULTIES.map((d) => {
              const Icon = d.icon;
              const isSelected = currentDifficulty === d.id;
              const count = progress[d.id] || 0;
              const nextBoard = count + 1;
              const pbScore = archive?.games?.sudoku?.modes?.[d.id]?.bestScore;

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onSelectDifficulty(d.id);
                    onClose();
                  }}
                  className={`w-full min-h-[56px] text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isLight
                      ? isSelected
                        ? `${d.lightClass} ring-2 ring-sky-500 shadow-sm font-semibold`
                        : "bg-white border-slate-200 hover:bg-slate-50"
                      : isSelected
                        ? `bg-gradient-to-r ${d.colorClass} ring-1 ring-white/20`
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                  }`}
                  // Runtime colour => inline style; a Tailwind class built from it is never emitted.
                  style={!isLight && isSelected ? { boxShadow: `0 0 20px ${theme.accentGlow}` } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        isSelected
                          ? isLight
                            ? "bg-sky-200/50 border-sky-300 text-sky-800"
                            : "bg-white/10 border-white/20 text-white"
                          : isLight
                            ? "bg-slate-100 border-slate-200 text-slate-600"
                            : "bg-white/5 border-white/10 text-stone-400 group-hover:text-stone-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black tracking-wide ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}>
                          {d.title}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isLight ? "bg-slate-200/80 text-slate-800" : "bg-white/10 text-stone-300"
                        }`}>
                          {d.badge} · Board {nextBoard}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-1 ${
                        isLight ? "text-slate-500" : "text-stone-400"
                      }`}>
                        {d.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Personal Best indicator */}
                  <div className="flex flex-col items-end">
                    {typeof pbScore === "number" && pbScore > 0 ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {formatTime(pbScore)}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-stone-500"}`}>
                        Board {nextBoard}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default memo(SudokuDifficultyModal);
