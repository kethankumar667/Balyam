import React, { memo, useState } from "react";
import Modal from "../../components/Modal";
import type { Connect4ThemeConfig } from "./connect4Themes";
import {
  X,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Zap,
  Target,
  Shield,
  Layers,
  RotateCcw,
  Trophy,
  Flame,
  Keyboard,
  Palette,
} from "lucide-react";
import { HapticsManager } from "../../services/HapticsManager";
import { connect4Audio } from "./connect4Audio";

export interface Connect4TutorialModalProps {
  isOpen: boolean;
  theme: Connect4ThemeConfig;
  onClose: () => void;
}

const STORAGE_KEY = "bhalyam.connect4.tutorial.seen.v1";

export function hasSeenConnect4Tutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markConnect4TutorialSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Ignore storage errors
  }
}

interface TutorialSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
}

const SLIDES: TutorialSlide[] = [
  {
    id: "gravity",
    badge: "BASICS",
    title: "Gravity & The 7x6 Grid",
    subtitle: "Pieces drop from the top and stack at the lowest free slot.",
    icon: Layers,
  },
  {
    id: "interactive",
    badge: "PRACTICE",
    title: "Interactive Practice Drop",
    subtitle: "Tap any column below to experience the gravitational physics and audio clack.",
    icon: Zap,
  },
  {
    id: "fork_trap",
    badge: "TACTICS",
    title: "The Unstoppable Double-Threat",
    subtitle: "Create open-ended 3-in-a-rows that force an inevitable checkmate.",
    icon: Target,
  },
  {
    id: "diagonals",
    badge: "STRATEGY",
    title: "Diagonal Blindspots",
    subtitle: "Over 60% of championship matches are won through diagonal vectors.",
    icon: Flame,
  },
  {
    id: "controls",
    badge: "PRO HUD",
    title: "Pro Controls & Cyber Themes",
    subtitle: "Master keyboard hotkeys 1-7, arrow keys, and audio haptics.",
    icon: Trophy,
  },
];

export const Connect4TutorialModal = memo(function Connect4TutorialModal({
  isOpen,
  theme,
  onClose,
}: Connect4TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Mini interactive practice grid state: 4 rows x 4 columns
  const [practiceGrid, setPracticeGrid] = useState<("R" | "Y" | null)[][]>([
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ]);
  const [practiceTurn, setPracticeTurn] = useState<"R" | "Y">("R");
  const [practiceDropRow, setPracticeDropRow] = useState<{ row: number; col: number } | null>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    HapticsManager.trigger("subtle");
    connect4Audio.playHoverTick();
    if (currentStep < SLIDES.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      markConnect4TutorialSeen();
      onClose();
    }
  };

  const handlePrev = () => {
    HapticsManager.trigger("subtle");
    connect4Audio.playHoverTick();
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    markConnect4TutorialSeen();
    onClose();
  };

  const handlePracticeDrop = (col: number) => {
    // Find lowest free row in 4x4 practice grid
    let targetRow = -1;
    for (let r = 3; r >= 0; r--) {
      if (practiceGrid[r][col] === null) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) {
      HapticsManager.trigger("subtle");
      return;
    }

    const nextGrid = practiceGrid.map((row) => [...row]);
    nextGrid[targetRow][col] = practiceTurn;
    setPracticeGrid(nextGrid);
    setPracticeDropRow({ row: targetRow, col });

    connect4Audio.playDiscDrop(targetRow);
    HapticsManager.trigger("turn");

    // Toggle turn
    setPracticeTurn((prev) => (prev === "R" ? "Y" : "R"));
  };

  const handleResetPractice = () => {
    setPracticeGrid([
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    setPracticeTurn("R");
    setPracticeDropRow(null);
    HapticsManager.trigger("subtle");
    connect4Audio.playHoverTick();
  };

  const currentSlide = SLIDES[currentStep]!;
  const Icon = currentSlide.icon;

  return (
    <Modal
      open
      onClose={handleClose}
      ariaLabelledBy="connect4-tutorial-title"
      panelClassName="w-full max-w-xl p-0 overflow-hidden"
    >
      <div
        className={`relative w-full rounded-2xl border-2 ${theme.gridBorder} ${theme.boardBg} p-5 sm:p-7 shadow-2xl text-slate-100 flex flex-col`}
      >
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${theme.accentBadge}`}
            >
              {currentSlide.badge}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Step {currentStep + 1} of {SLIDES.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close tutorial"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/60 shadow-lg text-cyan-400 shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2
              id="connect4-tutorial-title"
              className="text-xl sm:text-2xl font-black text-white tracking-tight"
            >
              {currentSlide.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {currentSlide.subtitle}
            </p>
          </div>
        </div>

        {/* Slide Body */}
        <div className="min-h-[220px] flex flex-col justify-center py-2">
          {/* SLIDE 1: The Objective & Gravity */}
          {currentSlide.id === "gravity" && (
            <div className="space-y-3.5 text-sm text-slate-200">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>The Fundamental Law of Connect 4</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Unlike Tic Tac Toe, you cannot place a disc into any arbitrary empty slot. Discs always drop straight down their chosen column and settle onto the bottom floor or on top of existing discs.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-center">
                  <div className="text-lg font-black text-cyan-300">7 Columns</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Tactical choices</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-center">
                  <div className="text-lg font-black text-amber-300">6 Rows</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Gravity stack depth</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-center">
                  <div className="text-lg font-black text-emerald-300">4 in a Row</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Instant win trigger</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Interactive Practice Grid */}
          {currentSlide.id === "interactive" && (
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center justify-between w-full max-w-[280px] text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  Active Drop:{" "}
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded-full ${
                      practiceTurn === "R" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                    }`}
                  />
                  <strong className={practiceTurn === "R" ? "text-red-400" : "text-amber-400"}>
                    {practiceTurn === "R" ? "Red Disc" : "Yellow Disc"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleResetPractice}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              {/* 4x4 Mini Board */}
              <div className="w-full max-w-[280px] p-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/40 shadow-inner">
                {/* Column Drop Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {[0, 1, 2, 3].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handlePracticeDrop(c)}
                      aria-label={`Practice drop in column ${c + 1}`}
                      className="h-8 rounded-lg bg-cyan-950/60 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-center border border-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                    >
                      ↓ {c + 1}
                    </button>
                  ))}
                </div>

                {/* Grid slots */}
                <div className="grid grid-cols-4 gap-1.5">
                  {practiceGrid.map((rowArr, rIdx) =>
                    rowArr.map((cell, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handlePracticeDrop(cIdx)}
                        className="aspect-square rounded-full bg-slate-900 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-pointer"
                      >
                        {cell && (
                          <div
                            className={`w-[85%] h-[85%] rounded-full flex items-center justify-center text-xs font-black shadow-md transition-transform duration-200 ${
                              cell === "R"
                                ? "bg-red-500 text-red-950 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                                : "bg-amber-400 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                            }`}
                          >
                            {cell === "R" ? "●" : "▲"}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Notice how discs fall down to the lowest open row with acoustic physics.
              </p>
            </div>
          )}

          {/* SLIDE 3: The Double Threat Fork */}
          {currentSlide.id === "fork_trap" && (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  <span>The "Open-Ended" 3-in-a-Row</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  If you align 3 discs horizontally with both the left and right adjacent slots empty, your opponent cannot block both. Whichever side they block on their turn, you complete your 4th piece on the other side!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs shrink-0">
                  PRO TIP
                </div>
                <div className="text-xs text-slate-300">
                  Never place a piece directly below a winning slot your opponent needs, as this hands them the base floor they need to drop their winning piece!
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: Diagonal Blindspots */}
          {currentSlide.id === "diagonals" && (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-2">
                <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  <span>Mastering the Diagonal Vector</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Most beginners only scan horizontally and vertically. Grandmasters look for rising and falling diagonal ladders by anticipating the future stack heights across adjacent columns.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="font-bold text-amber-300 mb-1">Rising Diagonal ↗</div>
                  <div className="text-slate-400">Cols [1,2,3,4] with stacked heights [1,2,3,4].</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="font-bold text-cyan-300 mb-1">Falling Diagonal ↘</div>
                  <div className="text-slate-400">Cols [4,3,2,1] with stacked heights [1,2,3,4].</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: Controls & Settings */}
          {currentSlide.id === "controls" && (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/60">
                  <div className="font-bold text-cyan-300 text-xs mb-1 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
                    Keyboard Shortcuts
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li><strong className="text-white">1 – 7</strong> : Quick drop directly in column</li>
                    <li><strong className="text-white">← / →</strong> : Select column to target</li>
                    <li><strong className="text-white">Space / Enter</strong> : Confirm drop</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/60">
                  <div className="font-bold text-amber-300 text-xs mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                    Master Themes & Audio
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>Toggle between <span className="text-amber-400 font-semibold">Royal Parlour</span>, <span className="text-cyan-300 font-semibold">Cyber-Arcade</span>, and <span className="text-yellow-300 font-semibold">Championship Lounge</span>.</li>
                    <li>Toggle acoustic audio & device haptic rumble.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 text-center font-medium">
                You're ready to dominate the arena! Connect 4 discs to claim victory.
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition ${
              currentStep === 0
                ? "opacity-30 cursor-not-allowed text-slate-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  HapticsManager.trigger("subtle");
                  connect4Audio.playHoverTick();
                  setCurrentStep(idx);
                }}
                aria-label={`Go to tutorial slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? "w-6 bg-cyan-400"
                    : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition cursor-pointer"
          >
            {currentStep === SLIDES.length - 1 ? (
              <>
                Let's Play
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
});
export default Connect4TutorialModal;
