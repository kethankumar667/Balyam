import React from "react";
import type { PartyInvitation } from "@shared/party/Party";
import { SwordsClashIcon } from "../../design-system/icons";
import { SURFACES, RewardButton } from "../../design-system/dls";
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
          <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block">
            SQUAD INVITATION
          </span>
          <h3 id="partyInviteTitle" className="text-xl font-black text-stone-100">
            {invitation.inviterName} invited you!
          </h3>
          <p className="text-xs text-stone-400 font-mono">
            Join squad to enter multiplayer game rooms and tournaments together.
          </p>
        </div>

        <div className="flex gap-3">
          <RewardButton size="sm" className="flex-1" onClick={() => onAccept(invitation.id)}>
            Accept & Join
          </RewardButton>
          {/* Not migrated: this whole dialog is hardcoded dark (SURFACES.modalHero
              resolves dark in both branches, no `dark:` toggle anywhere else in
              this file), but DLS's `secondary` is genuinely theme-aware — it
              would flip pale in light mode and mismatch every other surface
              here. Left as the matching raw dark treatment. */}
          <button
            onClick={() => onDecline(invitation.id)}
            className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition border border-stone-700"
          >
            Decline
          </button>
        </div>
    </Modal>
  );
}
