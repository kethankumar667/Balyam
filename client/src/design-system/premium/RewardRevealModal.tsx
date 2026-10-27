import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";
import { ChampionCrownIcon, LevelSparkleIcon } from "../icons";
import Modal from "../../components/Modal";
import { PrimaryButton, TYPOGRAPHY } from "../dls";

interface RewardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  earnedXP?: number;
  rewardName?: string;
}

export const RewardRevealModal: React.FC<RewardRevealModalProps> = ({
  isOpen,
  onClose,
  title = "Reward Unlocked!",
  subtitle = "Congratulations on your competitive achievement",
  badge = "👑",
  earnedXP,
  rewardName,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="rewardModalTitle"
      panelClassName={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.modal} shadow-2xl text-center space-y-6 relative overflow-hidden border border-amber-500/40`}
    >
        {/* Radiating Sunburst Aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Badge Showcase */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/30 to-amber-500/10 border-2 border-amber-400/80 flex items-center justify-center shadow-[0_0_36px_rgba(245,158,11,0.4)]">
          <span aria-hidden="true" className="text-5xl sm:text-6xl select-none">{badge}</span>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--chrome-accent)] flex items-center justify-center gap-1">
            <LevelSparkleIcon size={14} className="text-amber-400" />
            {title}
          </span>
            <h2 id="rewardModalTitle" className={TYPOGRAPHY.pageTitle}>
              {rewardName ?? title}
            </h2>
          <p className={TYPOGRAPHY.body}>
            {subtitle}
          </p>
        </div>

        {earnedXP !== undefined && earnedXP > 0 && (
          <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-2xl">
            <ChampionCrownIcon size={18} className="text-amber-400" />
            <span className="text-sm font-black font-mono text-[var(--chrome-accent)]">
              +{earnedXP} Season & Lifetime XP
            </span>
          </div>
        )}

        <PrimaryButton
          onClick={onClose}
          className="w-full"
        >
          Claim & Continue
        </PrimaryButton>
    </Modal>
  );
};
