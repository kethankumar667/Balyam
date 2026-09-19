import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Users, Tv, Crown, Orbit, CheckCircle2, Volume2 } from "lucide-react";
import { journeyTracker } from "./PlayerJourneyTracker";
import Modal from "../../components/Modal";
import { HapticsManager } from "../../services/HapticsManager";

interface HoloDeckOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onStartQuest?: () => void;
}

interface OnboardingStage {
  step: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  auraColor: string;
  accentHex: string;
  actionCTA: string;
}

/** Slide-in distance for the stage content; zero when the player prefers reduced motion. */
const STAGE_SLIDE_PX = 20;
const STAGE_TRANSITION_SECONDS = 0.2;

/**
 * Every claim here must describe something the product really does. In particular
 * nothing may promise a reward that is not granted: finishing the tour grants nothing.
 */
const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    step: 1,
    badge: "STAGE 01 // LOUNGE CORE",
    title: "The Ultimate Multiplayer Lounge",
    subtitle: "Two dozen classic and strategy games",
    description:
      "Play Ludo, Rummy, UNO, Hand Cricket, Chess, Carrom and retro handheld arcade classics instantly in your browser, with nothing to install.",
    features: [
      "The server checks every move, so every player sees the same game",
      "Dedicated mobile (touch-first) and desktop layouts",
      "Nothing to download: it runs in your browser",
    ],
    icon: <Orbit className="w-8 h-8 text-amber-400" />,
    auraColor: "from-amber-500/25 via-yellow-500/10 to-transparent",
    accentHex: "#F59E0B",
    actionCTA: "Explore Connection Modes →",
  },
  {
    step: 2,
    badge: "STAGE 02 // GATHERING TOPOLOGY",
    title: "Gather Your Friends Anywhere",
    subtitle: "Online Rooms, Solo Bots & Pass & Play",
    description:
      "Create a 6-character room code, send an invite link, or play locally on one couch with our Pass & Play privacy shields.",
    features: [
      "Instant 6-character codes with 1-click shareable links",
      "Pass & Play Phone Gate protects hidden hands (Rummy/UNO)",
      "AI bots can fill empty seats so a game never waits",
    ],
    icon: <Users className="w-8 h-8 text-emerald-400" />,
    auraColor: "from-emerald-500/25 via-teal-500/10 to-transparent",
    accentHex: "#10B981",
    actionCTA: "Discover Voice Chat →",
  },
  {
    step: 3,
    badge: "STAGE 03 // VOICE & BANTER",
    title: "Talk to Your Table",
    subtitle: "Peer-to-peer voice, right in the room",
    description:
      "Hop on voice with your friends inside the game room. No Discord, phone calls or extra apps required.",
    features: [
      "Peer-to-peer voice: players connect directly to each other",
      "Live indicators show who is speaking",
      "An in-game soundboard and animated reactions",
    ],
    icon: <Volume2 className="w-8 h-8 text-cyan-400" />,
    auraColor: "from-cyan-500/25 via-blue-500/10 to-transparent",
    accentHex: "#06B6D4",
    actionCTA: "Discover Big Screen TV Mode →",
  },
  {
    step: 4,
    badge: "STAGE 04 // LIVING ROOM TV",
    title: "Party Mode: Big Screen Experience",
    subtitle: "TV spectator screen + phones as controllers",
    description:
      "Turn your living room into an arcade! Open the room on a TV at /tv/:code while players hold their phones as gamepads.",
    features: [
      "A dedicated TV view at /tv/:code for any big screen with a browser",
      "Spectators can follow along without taking a seat",
      "Synchronized audio countdowns and a victory podium",
    ],
    icon: <Tv className="w-8 h-8 text-purple-400" />,
    auraColor: "from-purple-500/25 via-indigo-500/10 to-transparent",
    accentHex: "#8B5CF6",
    actionCTA: "See Ranks & Tournaments →",
  },
  {
    step: 5,
    badge: "STAGE 05 // RANKS & TOURNAMENTS",
    title: "Climb from Bronze to Grandmaster",
    subtitle: "Ranks, Tournaments & Cosmetics",
    description:
      "Your matches build a public profile and a rank. Join tournaments from the Tournaments page and personalise your avatar from the cosmetics store.",
    features: [
      "Rank tiers from Bronze up to Grandmaster",
      "Tournaments you can join from the Tournaments page",
      "Avatar cosmetics in the store",
    ],
    icon: <Crown className="w-8 h-8 text-amber-400" />,
    auraColor: "from-yellow-500/30 via-amber-500/15 to-transparent",
    accentHex: "#F59E0B",
    actionCTA: "Enter the Lounge →",
  },
];

/** A dot is 8px tall to look right, but its button keeps a 44px touch target. */
function stageDotClass(index: number, currentStep: number): string {
  if (index === currentStep) return "w-8";
  if (index < currentStep) return "w-3 bg-stone-600";
  return "w-2.5 bg-stone-800";
}

export const HoloDeckOnboardingModal: React.FC<HoloDeckOnboardingModalProps> = ({
  open,
  onClose,
  onStartQuest,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Modal's focus trap re-runs (restoring then re-taking focus) whenever its onClose identity
  // changes. Callers pass a fresh closure each render, so the Modal gets one stable function
  // that reads the latest onClose from a ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const handleSkip = useCallback(() => {
    HapticsManager.getInstance().subtle();
    journeyTracker.markWelcomeComplete();
    onCloseRef.current();
  }, []);

  if (!open) return null;

  const current = ONBOARDING_STAGES[currentStep];
  const isLastStage = currentStep === ONBOARDING_STAGES.length - 1;
  const slidePx = reduceMotion ? 0 : STAGE_SLIDE_PX;

  const handleNext = () => {
    HapticsManager.getInstance().subtle();
    if (!isLastStage) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    journeyTracker.markWelcomeComplete();
    onClose();
    onStartQuest?.();
  };

  const handlePrev = () => {
    HapticsManager.getInstance().subtle();
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <Modal
      open={open}
      onClose={handleSkip}
      closeOnBackdropClick={false}
      initialFocusRef={nextBtnRef}
      ariaLabelledBy="holo-deck-title"
      panelClassName="w-full max-w-2xl max-h-[92dvh] flex flex-col"
    >
      <div className="relative w-full min-h-0 rounded-3xl bg-slate-950/95 border border-stone-800 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col text-stone-100 backdrop-blur-2xl">
        {/* Dynamic Holographic Background Glow */}
        <div
          className={`absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br ${current.auraColor} blur-3xl pointer-events-none transition-all duration-700`}
        />

        {/* Top Bar: Step indicators & Skip */}
        <div className="flex flex-wrap items-center justify-between mb-2 relative z-10 shrink-0">
          <div className="flex items-center" role="group" aria-label="Tour stages">
            {ONBOARDING_STAGES.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Jump to stage ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
                className="group flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${stageDotClass(idx, currentStep)}`}
                  style={idx === currentStep ? { background: current.accentHex } : undefined}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-mono font-bold text-stone-400 hover:text-stone-200 transition px-3 min-h-[44px] rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            Skip Tour
          </button>
        </div>

        {/* Stage content scrolls on short screens so the footer buttons stay reachable */}
        <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.step}
              initial={{ opacity: 0, x: slidePx }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slidePx }}
              transition={{ duration: reduceMotion ? 0 : STAGE_TRANSITION_SECONDS }}
              className="space-y-4 text-left my-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center shadow-inner flex-shrink-0">
                  {current.icon}
                </div>
                <div>
                  <span
                    className="text-[10px] font-mono font-black uppercase tracking-widest block"
                    style={{ color: current.accentHex }}
                  >
                    {current.badge}
                  </span>
                  <h2
                    id="holo-deck-title"
                    className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight"
                  >
                    {current.title}
                  </h2>
                  <span className="text-xs font-mono text-stone-400 font-semibold block">
                    {current.subtitle}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-mono text-stone-300 leading-relaxed">
                {current.description}
              </p>

              {/* Feature Bullets */}
              <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-2">
                {current.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5 text-xs font-mono text-stone-300">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: current.accentHex }}
                      aria-hidden="true"
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-stone-800/80 relative z-10 shrink-0">
          <span className="text-[11px] font-mono text-stone-400 order-2 sm:order-1" aria-live="polite">
            Stage {currentStep + 1} of {ONBOARDING_STAGES.length}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 sm:flex-none px-4 min-h-[44px] rounded-xl border border-stone-800 hover:bg-stone-800 text-stone-300 font-mono font-bold text-xs transition cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              ref={nextBtnRef}
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-none font-black font-mono text-xs uppercase tracking-wider px-6 min-h-[44px] rounded-xl shadow-lg transition text-slate-950 active:scale-95 cursor-pointer"
              style={{ background: current.accentHex }}
            >
              {current.actionCTA}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
