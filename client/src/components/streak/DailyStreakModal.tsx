import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStreakStore } from "../../store/streakStore";
import { useViewport } from "../../lib/useViewport";
import DailyStreakModalMobile from "./DailyStreakModalMobile";
import DailyStreakModalDesktop from "./DailyStreakModalDesktop";
import StreakClaimCelebration from "./StreakClaimCelebration";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";

export function DailyStreakModal() {
  const {
    isOpen,
    closeModal,
    showCelebration,
    latestClaimResult,
    clearCelebration,
  } = useStreakStore();

  const viewport = useViewport();
  const isMobile = viewport === "mobile";

  // Audio on open/close
  useEffect(() => {
    if (isOpen) {
      AudioManager.play(AUDIO.UI_POPUP_OPEN);
    }
  }, [isOpen]);

  const handleClose = () => {
    AudioManager.play(AUDIO.UI_POPUP_CLOSE);
    closeModal();
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCelebration) {
          clearCelebration();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showCelebration, clearCelebration]);

  return (
    <>
      {/* Main Modal Backdrop & Window */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Responsive Layout Content */}
            {isMobile ? (
              <DailyStreakModalMobile onClose={handleClose} />
            ) : (
              <DailyStreakModalDesktop onClose={handleClose} />
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
