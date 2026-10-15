import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowRight, Check, X, ChevronRight, Gift } from "lucide-react";
import type { ChestTier, LootItem, ChestOpeningStage } from "./types";
import { ArcadeChest3D, CHEST_TIER_CONFIGS } from "./ArcadeChest3D";
import { LootRevealCard } from "./LootRevealCard";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";
import { bhalyamSpring } from "../../lib/motion";

export interface ArcadeChestOpeningModalProps {
  isOpen: boolean;
  tier: ChestTier;
  chestTitle: string;
  subtitle?: string;
  items: LootItem[];
  /** Closing line of the summary. Callers say whether the coins landed or are still vesting. */
  footnote?: string;
  onClose: () => void;
}

const RUMBLE_MS = 450;
const BURST_MS = 700;

export const ArcadeChestOpeningModal: React.FC<ArcadeChestOpeningModalProps> = ({
  isOpen,
  tier,
  chestTitle,
  subtitle,
  items,
  footnote = "Added to your BHALYAM balance & inventory",
  onClose,
}) => {
  const [stage, setStage] = useState<ChestOpeningStage>("idle");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  /** Pending rumble → burst → reveal steps, so Skip and close can cancel them. */
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const config = CHEST_TIER_CONFIGS[tier] ?? CHEST_TIER_CONFIGS.gold;

  // Safe fallback if items is empty
  const activeItems = useMemo(() => {
    return items.length > 0
      ? items
      : [
          {
            id: "fallback-coins",
            type: "coins" as const,
            title: "Bonus Coins",
            amount: 500,
            rarity: "common" as const,
          },
        ];
  }, [items]);

  // Reset state on open; cancel any in-flight sequence on close or unmount
  useEffect(() => {
    if (!isOpen) return;
    setStage("idle");
    setCurrentCardIndex(0);
    try {
      AudioManager.play(AUDIO.UI_POPUP_OPEN);
    } catch {
      // AudioManager optional
    }
    return clearTimers;
  }, [isOpen, clearTimers]);

  // Trigger high-energy canvas confetti explosion
  const triggerConfetti = useCallback((tierType: ChestTier) => {
    const isDiamond = tierType === "diamond" || tierType === "legendary";
    const colors = isDiamond
      ? ["#22d3ee", "#c084fc", "#fde047", "#ffffff", "#38bdf8"]
      : tierType === "gold"
      ? ["#f59e0b", "#fbbf24", "#fef08a", "#ffffff", "#d97706"]
      : tierType === "silver"
      ? ["#38bdf8", "#93c5fd", "#e2e8f0", "#ffffff"]
      : ["#f97316", "#fed7aa", "#ea580c", "#ffffff"];

    confetti({
      particleCount: isDiamond ? 90 : 65,
      spread: 80,
      origin: { y: 0.55 },
      colors,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  }, []);

  // Handle unlocking click
  const handleUnlockChest = useCallback(() => {
    if (stage !== "idle") return;

    setStage("rumble");
    try {
      HapticsManager.trigger("subtle");
      AudioManager.play(AUDIO.REWARD_UNLOCK);
    } catch {
      // Optional audio/haptics
    }

    // Phase 2: Burst open
    timersRef.current.push(
      setTimeout(() => {
        setStage("burst");
        triggerConfetti(tier);
        try {
          HapticsManager.trigger("reward");
          AudioManager.play(AUDIO.REWARD_ACHIEVEMENT);
        } catch {
          // Optional
        }

        // Phase 3: Start revealing cards
        timersRef.current.push(
          setTimeout(() => {
            setStage("revealing");
            setCurrentCardIndex(0);
          }, BURST_MS),
        );
      }, RUMBLE_MS),
    );
  }, [stage, tier, triggerConfetti]);

  // Handle advancing through revealed cards
  const handleNextCard = useCallback(() => {
    if (stage !== "revealing") return;

    try {
      HapticsManager.trigger("subtle");
      AudioManager.play(AUDIO.REWARD_COIN);
    } catch {
      // Optional
    }

    if (currentCardIndex < activeItems.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // All cards revealed -> enter summary pedestal
      setStage("pedestal");
      triggerConfetti(tier);
      try {
        AudioManager.play(AUDIO.SYS_SUCCESS);
        HapticsManager.trigger("win");
      } catch {
        // Optional
      }
    }
  }, [stage, currentCardIndex, activeItems.length, tier, triggerConfetti]);

  // Skip straight to summary pedestal
  const handleSkipToSummary = useCallback(() => {
    // Without this a skip during the rumble is overruled 450 ms later by the pending burst/reveal.
    clearTimers();
    setStage("pedestal");
    try {
      HapticsManager.trigger("subtle");
    } catch {
      // Optional
    }
  }, [clearTimers]);

  // Keyboard navigation. Capture phase + stopPropagation: this dialog can open on top of
  // another one (the level roadmap) whose focus trap also closes on Escape — one press
  // must act on the top dialog only. Held keys are ignored so a held Space cannot race
  // through every card and close the summary.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isAction = e.key === " " || e.key === "Enter";
      if (e.key !== "Escape" && !isAction) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;

      if (e.key === "Escape") {
        if (stage === "pedestal") onClose();
        else handleSkipToSummary();
      } else if (stage === "idle") {
        handleUnlockChest();
      } else if (stage === "revealing") {
        handleNextCard();
      } else if (stage === "pedestal") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, stage, handleUnlockChest, handleNextCard, handleSkipToSummary, onClose]);

  if (!isOpen) return null;

  const currentItem = activeItems[currentCardIndex];
  const remainingCount = activeItems.length - currentCardIndex - 1;

  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {/* z-[120]: this opens on top of the level roadmap (z-[90]) and its CoinRain (z-[100]). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={chestTitle}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none overflow-hidden"
      >
        {/* Top Controls: Title, Remaining Counter & Skip */}
        <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 flex items-center justify-between z-40 pointer-events-none">
          {/* Title Header */}
          <div className="pointer-events-auto">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase drop-shadow-md flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              {chestTitle}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-stone-300 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {/* Skip Button (Active before pedestal) */}
          {stage !== "pedestal" && (
            <button
              type="button"
              onClick={handleSkipToSummary}
              className="pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold text-stone-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>

        {/* Central Stage Flow */}
        <div className="relative w-full max-w-4xl min-h-[460px] flex flex-col items-center justify-center my-auto">
          {/* STAGE 1 & 2: IDLE CHEST / UNLOCKING / BURSTING */}
          {(stage === "idle" || stage === "rumble" || stage === "burst") && (
            <div className="flex flex-col items-center justify-center text-center">
              <ArcadeChest3D
                tier={tier}
                stage={stage}
                size={230}
                onClick={handleUnlockChest}
              />

              {/* Tap to Unlock Button Prompt */}
              {stage === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <button
                    type="button"
                    autoFocus
                    onClick={handleUnlockChest}
                    className="group relative px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase text-stone-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 border-2 border-white/60 shadow-[0_0_28px_rgba(251,191,36,0.55)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Tap To Unlock</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[3]" />
                  </button>
                  <p className="text-xs text-stone-400 mt-2 font-medium">
                    Or press Space / Enter
                  </p>
                </motion.div>
              )}

              {stage === "rumble" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-base font-black text-amber-300 tracking-widest uppercase animate-pulse"
                >
                  Unsealing Vault...
                </motion.p>
              )}
            </div>
          )}

          {/* STAGE 3: CARD-BY-CARD TAP TO REVEAL */}
          {stage === "revealing" && currentItem && (
            <div
              onClick={handleNextCard}
              className="w-full flex flex-col items-center justify-center cursor-pointer"
            >
              {/* Scaled-down background chest anchor */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25 scale-75 pointer-events-none -z-10">
                <ArcadeChest3D tier={tier} stage="revealing" size={170} />
              </div>

              {/* Remaining Items Pill Badge */}
              <div className="mb-5 flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-white/20 shadow-lg">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Remaining Items:
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black font-mono bg-amber-400 text-stone-950">
                  {remainingCount + 1}
                </span>
              </div>

              {/* The Active Revealed Card */}
              <LootRevealCard
                key={currentItem.id}
                item={currentItem}
                index={currentCardIndex}
                total={activeItems.length}
              />

              {/* Tap anywhere instruction pill */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-6 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-300 bg-white/10 px-5 py-2 rounded-full border border-white/15 backdrop-blur-sm"
              >
                <span>Tap anywhere for next reward</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </motion.div>
            </div>
          )}

          {/* STAGE 4: GRAND SUMMARY PEDESTAL */}
          {stage === "pedestal" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={bhalyamSpring}
              className="w-full flex flex-col items-center justify-center"
            >
              {/* Header Banner */}
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase drop-shadow-md">
                  All Rewards Unlocked!
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 mt-1 font-medium">
                  {footnote}
                </p>
              </div>

              {/* Showcase Grid / Pedestal */}
              <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-2 max-h-[60vh] overflow-y-auto py-2">
                {activeItems.map((item) => (
                  <LootRevealCard
                    key={item.id}
                    item={item}
                    isCompact={activeItems.length > 2}
                    compactOnMobile
                  />
                ))}
              </div>

              {/* Collect All Primary CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 sm:mt-8 w-full max-w-xs"
              >
                <button
                  type="button"
                  autoFocus
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase text-stone-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 border-2 border-white/60 shadow-[0_0_32px_rgba(251,191,36,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Collect All</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </AnimatePresence>
    </MotionConfig>
  );
};

export default ArcadeChestOpeningModal;
