import React, { useState } from "react";
import { Zap, ShieldCheck, Orbit, RefreshCw, X } from "lucide-react";
import type { TicTacToeThemeConfig } from "./tictactoeThemes";
import Modal from "../../components/Modal";

interface TicTacToeTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: TicTacToeThemeConfig;
}

interface TutorialStep {
  title: string;
  badge: string;
  icon: React.ReactNode;
  content: string;
  tip: string;
}

export function TicTacToeTutorialModal({
  isOpen,
  onClose,
  theme,
}: TicTacToeTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const STEPS: TutorialStep[] = [
    {
      title: "Welcome to Quantum Nexus",
      badge: "THE REVOLUTION",
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      content:
        "Classic Tic Tac Toe always ends in boring ties. Cyber Tac Toe introduces Quantum Flux: a dynamic, non-stop tactical battle where draws are mathematically impossible!",
      tip: "Every move matters. Think two steps ahead.",
    },
    {
      title: "The 3-Piece Limit Rule",
      badge: "QUANTUM FLUX",
      icon: <Orbit className="w-6 h-6 text-amber-400" />,
      content:
        "Each player can only hold a maximum of 3 pieces on the grid at any time. When you place your 4th piece, your oldest (1st) piece instantly dissolves into quantum vapor!",
      tip: "Your piece queue is strictly First-In, First-Out (FIFO).",
    },
    {
      title: "Warning Aura & Alerts",
      badge: "TACTICAL HUD",
      icon: <RefreshCw className="w-6 h-6 text-pink-400" />,
      content:
        "When you have 3 active pieces on the board, your oldest piece begins pulsating with a glowing warning badge. That indicates exactly which piece will vanish on your next placement.",
      tip: "Watch your opponent's expiring piece to anticipate open lanes!",
    },
    {
      title: "Traps & Vanishing Wins",
      badge: "ADVANCED STRATEGY",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      content:
        "You can force your opponent into impossible dilemmas: if their block relies on a piece that will vanish next turn, your line will open up for a lethal laser strike!",
      tip: "Align 3 in a row before or after an evaporation to claim victory.",
    },
  ];

  const step = STEPS[currentStep];

  return (
    <Modal open onClose={onClose} ariaLabelledBy="tutorial-title" panelClassName="w-full flex justify-center">
      <div
        className={`relative w-full max-w-lg rounded-2xl border-2 ${theme.gridBorder} ${theme.boardBg} p-6 shadow-2xl text-white`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutorial"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider border ${theme.accentBadge}`}>
            {step.badge}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>

        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/60">
            {step.icon}
          </div>
          <h2 id="tutorial-title" className="text-xl font-black tracking-wide text-white">
            {step.title}
          </h2>
        </div>

        {/* Content */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4 min-h-[60px]">
          {step.content}
        </p>

        {/* Pro Tip Box */}
        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2 mb-6">
          <span className="font-black text-cyan-400">PRO TIP:</span>
          <span>{step.tip}</span>
        </div>

        {/* Stepper Dots & Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? "w-6 bg-cyan-400" : "w-2.5 bg-slate-700 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center justify-center"
              >
                Previous
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="min-h-[44px] px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Got It, Let's Play!
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
