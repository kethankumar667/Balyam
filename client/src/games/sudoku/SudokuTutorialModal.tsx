import { memo, useState } from "react";
import { SUDOKU_THEMES, type SudokuThemeId, isLightTheme } from "./sudokuThemes";
import Modal from "../../components/Modal";
import {
  X,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Grid,
  Zap,
  Edit3,
  Search,
  Eye,
  RotateCcw,
} from "lucide-react";
import { HapticsManager } from "../../services/HapticsManager";
import { sudokuAudio } from "./sudokuAudio";

export interface SudokuTutorialModalProps {
  isOpen: boolean;
  themeId: SudokuThemeId;
  onClose: () => void;
}

const STORAGE_KEY = "bhalyam.sudoku.tutorial.seen.v1";

export function hasSeenSudokuTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSudokuTutorialSeen(): void {
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
  description: string;
  icon: typeof BookOpen;
}

const SLIDES: TutorialSlide[] = [
  {
    id: "rules",
    badge: "Step 1 of 5",
    title: "The 3 Golden Rules",
    description: "Every Sudoku grid has 9 rows, 9 columns, and nine 3x3 sector boxes.",
    icon: Grid,
  },
  {
    id: "elimination",
    badge: "Step 2 of 5",
    title: "Crosshatch Scanning",
    description: "Eliminate impossible cells by tracing intersecting rows and columns.",
    icon: Search,
  },
  {
    id: "notes",
    badge: "Step 3 of 5",
    title: "Pencil Notes & Pruning",
    description: "Keep track of multiple candidates and let the engine auto-clean conflicts.",
    icon: Edit3,
  },
  {
    id: "single",
    badge: "Step 4 of 5",
    title: "The Naked Single",
    description: "When 8 numbers in a group are accounted for, the 9th is locked in.",
    icon: Zap,
  },
  {
    id: "controls",
    badge: "Step 5 of 5",
    title: "Tactical Controls & Themes",
    description: "Switch between Cell-First, Digit-First, Zen Focus, and Classic Paper theme.",
    icon: Eye,
  },
];

function SudokuTutorialModal({ isOpen, themeId, onClose }: SudokuTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [interactiveBoxValue, setInteractiveBoxValue] = useState<number | null>(null);
  const [interactiveBoxError, setInteractiveBoxError] = useState<boolean>(false);
  const [interactiveBoxSolved, setInteractiveBoxSolved] = useState<boolean>(false);

  // Crosshatch mini puzzle state
  const [crosshatchTargetChosen, setCrosshatchTargetChosen] = useState<boolean>(false);

  const theme = SUDOKU_THEMES[themeId] || SUDOKU_THEMES.chronicle;
  const isLight = isLightTheme(themeId);

  if (!isOpen) return null;

  const handleNext = () => {
    HapticsManager.trigger("subtle");
    sudokuAudio.playPencilTick();
    if (currentStep < SLIDES.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      markSudokuTutorialSeen();
      onClose();
    }
  };

  const handlePrev = () => {
    HapticsManager.trigger("subtle");
    sudokuAudio.playPencilTick();
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    markSudokuTutorialSeen();
    onClose();
  };

  // Interactive Box practice click
  const handleSelectBoxDigit = (digit: number) => {
    if (digit === 5) {
      setInteractiveBoxValue(5);
      setInteractiveBoxError(false);
      setInteractiveBoxSolved(true);
      HapticsManager.trigger("win");
      sudokuAudio.playDigitChime(5);
      sudokuAudio.playCircuitSweep();
    } else {
      setInteractiveBoxValue(digit);
      setInteractiveBoxError(true);
      setInteractiveBoxSolved(false);
      HapticsManager.trigger("turn");
      sudokuAudio.playMistakeGlitch();
    }
  };

  const currentSlide = SLIDES[currentStep]!;
  const Icon = currentSlide.icon;

  return (
    <Modal open onClose={onClose} ariaLabelledBy="tutorial-modal-title" panelClassName="w-full flex justify-center">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto ${
          isLight
            ? "bg-white border border-slate-200 text-slate-800 shadow-slate-300/60"
            : "bg-[#0b1021] border border-cyan-500/30 text-white shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isLight
                  ? "bg-sky-100 border-sky-300 text-sky-700"
                  : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isLight ? "text-blue-600" : "text-cyan-400"}`}>
                {currentSlide.badge}
              </span>
              <h2
                id="tutorial-modal-title"
                className={`text-base sm:text-lg font-black tracking-wide ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {currentSlide.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close tutorial"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition active:scale-95 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                : "bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Content Area */}
        <div className="flex flex-col gap-3.5 my-1">
          <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-stone-300"}`}>
            {currentSlide.description}
          </p>

          {/* SLIDE 1: The 3 Rules with Interactive 3x3 Box */}
          {currentStep === 0 && (
            <div className="flex flex-col gap-3">
              <div
                className={`grid grid-cols-3 gap-2 p-3 rounded-2xl border text-xs ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="flex flex-col items-center text-center p-2">
                  <span className="font-mono font-black text-cyan-500 text-base">1. Rows</span>
                  <span className="text-[11px] mt-0.5 opacity-80">Numbers 1–9 no repeats</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 border-x border-dashed border-slate-300/40">
                  <span className="font-mono font-black text-fuchsia-500 text-base">2. Columns</span>
                  <span className="text-[11px] mt-0.5 opacity-80">Numbers 1–9 no repeats</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <span className="font-mono font-black text-emerald-500 text-base">3. 3x3 Boxes</span>
                  <span className="text-[11px] mt-0.5 opacity-80">Numbers 1–9 no repeats</span>
                </div>
              </div>

              {/* Interactive Mini-Box Challenge */}
              <div
                className={`p-4 rounded-2xl border flex flex-col items-center gap-3 ${
                  isLight ? "bg-sky-50/70 border-sky-200" : "bg-cyan-950/20 border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Interactive Test: Which number completes this box?
                  </span>
                  {interactiveBoxSolved && (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Correct!
                    </span>
                  )}
                </div>

                {/* 3x3 Mini Grid */}
                <div className="w-36 h-36 grid grid-cols-3 grid-rows-3 border-2 border-slate-800 rounded-xl overflow-hidden bg-white shadow-md">
                  {[1, 2, 3, 4, null, 6, 7, 8, 9].map((num, idx) => {
                    if (num !== null) {
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-center border border-slate-300 text-slate-800 font-black text-base select-none bg-slate-50"
                        >
                          {num}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-center border border-slate-300 font-black text-lg select-none transition-all ${
                          interactiveBoxSolved
                            ? "bg-emerald-100 text-emerald-700 animate-pulse font-extrabold"
                            : interactiveBoxError
                              ? "bg-rose-100 text-rose-600"
                              : "bg-sky-100 text-sky-600 ring-2 ring-sky-400"
                        }`}
                      >
                        {interactiveBoxValue || "?"}
                      </div>
                    );
                  })}
                </div>

                {/* Keypad Choices */}
                {!interactiveBoxSolved ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-70">Tap choice:</span>
                    {[3, 5, 7, 9].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectBoxDigit(val)}
                        className={`w-9 h-9 rounded-xl border font-black text-sm flex items-center justify-center transition active:scale-95 ${
                          isLight
                            ? "bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-500 font-semibold">
                    Spot on! Every 3x3 sector box must contain numbers 1 through 9.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 2: Crosshatching Scanning */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-3">
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500">
                  How Crosshatching Works
                </h3>
                <p className="text-xs leading-relaxed opacity-90">
                  Look at where identical digits already exist on the board. When you trace their laser paths across rows and columns, they block entire lines.
                </p>

                {/* Visual Demonstration Graphic */}
                <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-col items-center gap-2 border border-cyan-500/40">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Row 1 already has a <strong>7</strong> (blocks Top row)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                    <span>Column 2 already has a <strong>7</strong> (blocks Middle column)</span>
                  </div>
                  <div className="mt-1 text-center text-xs font-bold text-emerald-400">
                    ➔ Only 1 cell in the box remains unblocked for digit 7!
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
                  💡 Tip: Scan the board for digits that appear frequently (e.g. 5s or 7s). They have the most laser lines blocking other rows and columns!
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Pencil Notes & Auto Pruning */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-3">
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Pencil Notes Mode (Key: N)
                    </h3>
                    <p className="text-[11px] opacity-70">Jot down potential numbers in mini-cells</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed opacity-90">
                  When a cell could be one of two candidates (e.g., 2 or 8), tap the <strong>Pencil button</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-xs">N</kbd>) to toggle Notes mode.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="p-3 rounded-xl border border-white/10 bg-black/20 flex flex-col gap-1">
                    <span className="text-[11px] font-black text-cyan-400 uppercase">Auto-Notes</span>
                    <span className="text-[10px] opacity-80 leading-normal">
                      One tap fills all mathematically valid pencil notes across empty squares.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-black/20 flex flex-col gap-1">
                    <span className="text-[11px] font-black text-emerald-400 uppercase">Auto-Prune</span>
                    <span className="text-[10px] opacity-80 leading-normal">
                      Whenever you confirm a digit, conflicting notes in its row, column, and box vanish automatically!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: The Naked Single */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-3">
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      The "Naked Single" Strategy
                    </h3>
                    <p className="text-[11px] opacity-70">The most powerful basic deduction</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed opacity-90">
                  When you inspect an empty cell and look at its intersecting row, column, and box: if 8 of the 9 numbers already appear anywhere in those groups, only <strong>ONE</strong> number is left.
                </p>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs flex flex-col gap-1.5 text-white">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-stone-400">Row contains:</span>
                    <span className="text-cyan-300">1, 2, 4, 7</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-stone-400">Column contains:</span>
                    <span className="text-fuchsia-300">3, 6, 9</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-stone-400">Box contains:</span>
                    <span className="text-amber-300">8</span>
                  </div>
                  <div className="border-t border-slate-700 pt-1.5 flex items-center justify-between text-xs font-black text-emerald-400">
                    <span>Missing single digit:</span>
                    <span>5</span>
                  </div>
                </div>

                <p className="text-xs text-stone-400">
                  You don't need guess-work. If all other 8 digits are blocked, place that single digit with total confidence!
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 5: Controls & Themes */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-3">
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-white/10 bg-black/10 flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-cyan-400">Digit-First Mode</span>
                    <span className="text-[10px] opacity-80">
                      Tap a number on keypad first to lock it, then tap multiple cells to fill rapidly.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-white/10 bg-black/10 flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-purple-400">Zen Focus (Z)</span>
                    <span className="text-[10px] opacity-80">
                      Hides all distracting HUD chrome for a completely clean, focused board.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-white/10 bg-black/10 flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-amber-400">Neural Hint (H)</span>
                    <span className="text-[10px] opacity-80">
                      Stuck? Laser scanner fills the next logical cell without spoiling the whole board.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-white/10 bg-black/10 flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-emerald-400">Classic Paper</span>
                    <span className="text-[10px] opacity-80">
                      Clean white morning paper print theme with slate borders and ink-blue inputs.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-center font-bold text-cyan-400">
                  You're all set! Start with Easy Board 1 and unlock infinite procedural levels.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-300/40">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx
                    ? "w-6 bg-cyan-500"
                    : "w-2 bg-stone-500/40 hover:bg-stone-500/80"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold uppercase transition active:scale-95 flex items-center gap-1.5 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-white/5 hover:bg-white/10 border-white/15 text-stone-300"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[40px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase text-xs tracking-wider shadow-md hover:brightness-110 active:scale-95 transition flex items-center gap-2"
            >
              <span>{currentStep === SLIDES.length - 1 ? "Start Solving" : "Next Step"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default memo(SudokuTutorialModal);
