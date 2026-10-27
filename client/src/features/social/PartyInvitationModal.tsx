import React from "react";
import type { PartyInvitation } from "@shared/party/Party";
import { SwordsClashIcon } from "../../design-system/icons";
import { SURFACES, RewardButton, SecondaryButton, TYPOGRAPHY } from "../../design-system/dls";
import Modal from "../../components/Modal";

interface PartyInvitationModalProps {
  invitation: PartyInvitation | null;
  isOpen: boolean;
  onAccept: (invitationId: string) => Promise<void>;
  onDecline: (invitationId: string) => Promise<void>;
}

export default function PartyInvitationModal({
  invitation,
  isOpen,
  onAccept,
  onDecline,
}: PartyInvitationModalProps) {
  if (!isOpen || !invitation) return null;

  return (
    // No onClose: this dialog has never had a way to dismiss itself without
    // Accept or Decline (no such prop exists on this component) — a pending
    // invitation closed by Escape or a backdrop click with neither call made
    // would leave the inviter's request silently unanswered. Matches
    // ConsentModal's precedent for "must be answered, not dismissed".
    <Modal
      open
      ariaLabelledBy="partyInviteTitle"
      className="animate-in fade-in duration-200"
      panelClassName={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${SURFACES.modalHero} text-center space-y-6 relative overflow-hidden border border-amber-500/50 shadow-2xl`}
    >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <SwordsClashIcon size={32} className="text-amber-400" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-[var(--chrome-accent)] uppercase tracking-widest block">
            SQUAD INVITATION
          </span>
          <h3 id="partyInviteTitle" className={TYPOGRAPHY.sectionHeader}>
            {invitation.inviterName} invited you!
          </h3>
          <p className={TYPOGRAPHY.body}>
            Join squad to enter multiplayer game rooms and tournaments together.
          </p>
        </div>

        <div className="flex gap-3">
          <RewardButton size="sm" className="flex-1" onClick={() => onAccept(invitation.id)}>
            Accept & Join
          </RewardButton>
          <SecondaryButton
            onClick={() => onDecline(invitation.id)}
            size="sm"
            className="flex-1"
          >
            Decline
          </SecondaryButton>
        </div>
    </Modal>
  );
}
