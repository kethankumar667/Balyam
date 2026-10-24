import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStreakStore } from "../../store/streakStore";
import { useViewport } from "../../lib/useViewport";
import { useStreakAutoOpen } from "../../hooks/useStreakAutoOpen";
import DailyStreakModalMobile from "./DailyStreakModalMobile";
import DailyStreakModalDesktop from "./DailyStreakModalDesktop";
import DailyStreakRewardScreen from "./DailyStreakRewardScreen";
import StreakClaimCelebration from "./StreakClaimCelebration";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export function DailyStreakModal() {
  // Wire auto-open and identity boundary orchestration
  useStreakAutoOpen();

  const {
    isOpen,
    state,
    isLoading,
    loadError,
    fetchStreak,
    viewMode,
    setViewMode,
    closeModal,
    showCelebration,
    latestClaimResult,
    clearCelebration,
  } = useStreakStore();

  const viewport = useViewport();
  const isMobile = viewport === "mobile";
  const reduce = useReducedMotion();

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

  const { containerRef } = useFocusTrap({
    open: isOpen && !showCelebration,
    onClose: handleClose,
  });

  const hasState = state !== null;
  useEffect(() => {
    const container = containerRef.current;
    if (isOpen && !showCelebration && container && !container.contains(document.activeElement)) {
      container.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [isOpen, showCelebration, hasState, containerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Main Modal Backdrop & Window */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div ref={containerRef} className="contents">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduce ? { duration: 0 } : undefined}
              onClick={handleClose}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {!state ? (
              <div role="dialog" aria-modal="true" aria-label="Rewards Expedition" className="streak-expedition relative z-50 w-[min(92vw,480px)] rounded-3xl border border-[var(--streak-border)] p-6 text-[var(--streak-ink)]">
                <h2 className="font-display text-xl">Rewards Expedition</h2>
                <p role={loadError ? "alert" : "status"} className="my-4 text-sm">{loadError ?? "Loading your expedition..."}</p>
                {loadError && <button type="button" disabled={isLoading} onClick={() => void fetchStreak()} className="streak-claim-button mr-3 min-h-11 rounded-xl px-4 font-bold">Try again</button>}
                <button type="button" onClick={handleClose} className="streak-icon-button min-h-11 rounded-xl px-4">Close</button>
              </div>
            ) : viewMode === "reward" ? (
              <DailyStreakRewardScreen
                onClose={handleClose}
                onOpenJourney={() => setViewMode("journey")}
              />
            ) : isMobile ? (
              <DailyStreakModalMobile
                onClose={handleClose}
              />
            ) : (
              <DailyStreakModalDesktop
                onClose={handleClose}
              />
            )}
            </div>
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
    </>,
    document.body
  );
}

export default DailyStreakModal;
