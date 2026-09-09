import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStreakStore } from "../../store/streakStore";
import { useViewport } from "../../lib/useViewport";
import DailyStreakModalMobile from "./DailyStreakModalMobile";
import DailyStreakModalDesktop from "./DailyStreakModalDesktop";
import StreakClaimCelebration from "./StreakClaimCelebration";

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

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCelebration) {
          clearCelebration();
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showCelebration, clearCelebration, closeModal]);

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
              onClick={closeModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Responsive Layout Content */}
            {isMobile ? (
              <DailyStreakModalMobile onClose={closeModal} />
            ) : (
              <DailyStreakModalDesktop onClose={closeModal} />
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
