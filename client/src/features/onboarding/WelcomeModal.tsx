import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SURFACES } from "../../design-system/dls";
import { journeyTracker } from "./PlayerJourneyTracker";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartQuest?: () => void;
}

const ONBOARDING_STEPS = [
  {
    step: 1,
    badge: "Welcome to BHALYAM",
    title: "Your Ultimate Multiplayer Lounge",
    description:
      "Play 10+ legendary multiplayer classics including Ludo, Rummy, UNO, Hand Cricket, Chess, Carrom, and Retro Nokia 2D games instantly in your browser.",
    icon: "🎮",
    auraColor: "from-amber-500/20 to-yellow-500/5",
    accentColor: "text-amber-400",
  },
  {
    step: 2,
    badge: "Squads & Social Presence",
    title: "Gather Your Friends & Play in Sync",
    description:
      "Create custom 4-player parties, track friends' online presence in realtime, chat with voice rooms, and compete together across every game mode.",
    icon: "🤝",
    auraColor: "from-emerald-500/20 to-teal-500/5",
    accentColor: "text-emerald-400",
  },
  {
    step: 3,
    badge: "Seasons & Tournaments",
    title: "Climb Tiers & Win Championship Crowns",
    description:
      "Earn XP with every match, level up your profile, unlock radiant rank auras from Bronze to Radiant Vanguard, and claim glory in live knockout tournaments.",
    icon: "👑",
    auraColor: "from-purple-500/20 to-violet-500/5",
    accentColor: "text-purple-400",
  },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  open,
  onClose,
  onStartQuest,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!open) return null;

  const current = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      journeyTracker.markWelcomeComplete();
      onClose();
      onStartQuest?.();
    }
  };

  const handleSkip = () => {
    journeyTracker.markWelcomeComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`${SURFACES.cardElevated} w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-2xl relative overflow-hidden`}
      >
        {/* Background Aura */}
        <div
          className={`absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${current.auraColor} blur-3xl pointer-events-none transition-all duration-500`}
        />

        {/* Step Indicator Top Bar */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div
                key={s.step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-8 bg-amber-400"
                    : idx < currentStep
                    ? "w-3 bg-stone-600"
                    : "w-3 bg-stone-800"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs font-mono font-bold text-stone-400 hover:text-stone-200 transition px-2.5 py-1 rounded-lg hover:bg-stone-800"
          >
            Skip Intro
          </button>
        </div>

        {/* Content Slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.step}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 text-center sm:text-left relative z-10"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-stone-900 border border-stone-800/80 flex items-center justify-center text-4xl sm:text-5xl mx-auto sm:mx-0 shadow-inner">
              {current.icon}
            </div>

            <div className="space-y-1.5">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-widest ${current.accentColor}`}
              >
                {current.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-100 dark:text-zinc-100 tracking-tight">
                {current.title}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-400 font-mono leading-relaxed">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 pt-4 border-t border-stone-800/80 relative z-10">
          <span className="text-[11px] font-mono text-stone-500 order-2 sm:order-1">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 text-stone-300 font-mono font-bold text-xs transition"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg transition"
            >
              {currentStep === ONBOARDING_STEPS.length - 1
                ? "Start Playing 🚀"
                : "Next →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
