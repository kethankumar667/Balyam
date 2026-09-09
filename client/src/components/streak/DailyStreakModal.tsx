import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStreakStore } from "../../store/streakStore";
import { useViewport } from "../../lib/useViewport";
import { useStreakAutoOpen } from "../../hooks/useStreakAutoOpen";
import DailyStreakModalMobile from "./DailyStreakModalMobile";
import DailyStreakModalDesktop from "./DailyStreakModalDesktop";
import DailyStreakRewardScreen from "./DailyStreakRewardScreen";
import StreakClaimCelebration from "./StreakClaimCelebration";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";

export function DailyStreakModal() {
  // Wire auto-open and identity boundary orchestration
  useStreakAutoOpen();

  const {
    state,
    isOpen,
    viewMode,
    setViewMode,
    closeModal,
    showCelebration,
    latestClaimResult,
    clearCelebration,
  } = useStreakStore();

  const viewport = useViewport();
  const isMobile = viewport === "mobile";

  // Play popup open audio only on open transition without forcing viewMode
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      AudioManager.play(AUDIO.UI_POPUP_OPEN);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleClose = () => {
    AudioManager.play(AUDIO.UI_POPUP_CLOSE);
    closeModal();
  };

  // Handle Escape key with hierarchical dismissal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCelebration) {
          clearCelebration();
        } else if (viewMode === "journey" && state?.isClaimableToday) {
          setViewMode("reward");
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showCelebration, clearCelebration, viewMode, state?.isClaimableToday]);

  return (
    <>
      {/* Main Modal Backdrop & Window */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* SCREEN 1: Focused Reward Moment (Default) */}
            {viewMode === "reward" ? (
              <DailyStreakRewardScreen
                onClose={handleClose}
                onOpenJourney={() => setViewMode("journey")}
              />
            ) : (
              /* SCREEN 2: Full 30-Day Journey / Calendar (On Demand) */
              isMobile ? (
                <DailyStreakModalMobile
                  onClose={handleClose}
                  onBack={() => setViewMode("reward")}
                />
              ) : (
                <DailyStreakModalDesktop
                  onClose={handleClose}
                  onBack={() => setViewMode("reward")}
                />
              )
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Celebratory Reward Animation Overlay */}
      <AnimatePresence>
        {showCelebration && latestClaimResult && (
          <StreakClaimCelebration
            result={latestClaimResult}
            onClose={clearCelebration}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyStreakModal;
