import React from "react";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import { SURFACES, SecondaryButton, TYPOGRAPHY } from "../../design-system/dls";
import Modal from "../../components/Modal";
import { TournamentCupIcon, StreakFlameIcon } from "../../design-system/icons";
import SeatAvatar from "../../components/profile/SeatAvatar";

interface SharedHistoryModalProps {
  friend: Friend | null;
  history: SharedHistory | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SharedHistoryModal({
  friend,
  history,
  isOpen,
  onClose,
}: SharedHistoryModalProps) {
  if (!isOpen || !friend) return null;

  const winRate =
    history && history.matchesPlayedTogether > 0
      ? Math.round((history.winsTogether / history.matchesPlayedTogether) * 100)
      : 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="sharedHistoryTitle"
      panelClassName={`max-w-md w-full p-6 sm:p-8 ${SURFACES.modalHero} text-center space-y-6 relative overflow-hidden`}
    >
        <div className="flex justify-center">
          <SeatAvatar
            avatar={friend.avatar}
            playerId={friend.friendPlayerId}
            name={friend.displayName}
            className="w-16 h-16 rounded-2xl border border-stone-800 shadow"
            textClassName="text-2xl"
          />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-[var(--chrome-accent)] uppercase tracking-widest block">
            SHARED COMBAT HISTORY
          </span>
          <h3 id="sharedHistoryTitle" className={TYPOGRAPHY.sectionHeader}>
            Battles with {friend.displayName}
          </h3>
          <p className={`${TYPOGRAPHY.caption} break-all`}>
            ID: {friend.friendPlayerId}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`${SURFACES.panelSubtle} p-3 space-y-1`}>
            <span className="text-xs text-[var(--chrome-ink-soft)] block">
              Matches
            </span>
            <span className="text-lg font-black font-mono">
              {history?.matchesPlayedTogether || 0}
            </span>
          </div>
          <div className={`${SURFACES.panelSubtle} p-3 space-y-1`}>
            <span className="text-xs text-[var(--chrome-ink-soft)] block">
              Wins
            </span>
            <span className="text-lg font-black font-mono text-[var(--chrome-accent)]">
              {history?.winsTogether || 0}
            </span>
          </div>
          <div className={`${SURFACES.panelSubtle} p-3 space-y-1`}>
            <span className="text-xs text-[var(--chrome-ink-soft)] block">
              Win Rate
            </span>
            <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
              {winRate}%
            </span>
          </div>
        </div>

        {/* Tournaments played */}
        <div className={`${SURFACES.panelSubtle} p-3.5 flex items-center justify-between text-xs`}>
          <span className="text-[var(--chrome-ink-soft)] flex items-center gap-1.5">
            <TournamentCupIcon size={14} className="text-amber-400" />
            Tournaments Together
          </span>
          <span className="font-bold">
            {history?.tournamentsTogether || 0}
          </span>
        </div>

        <SecondaryButton
          onClick={onClose}
          className="w-full"
        >
          Close
        </SecondaryButton>
    </Modal>
  );
}
