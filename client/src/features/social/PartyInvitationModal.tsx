import React from "react";
import type { PartyInvitation } from "@shared/party/Party";
import { SwordsClashIcon } from "../../design-system/icons";
import { SURFACES } from "../../design-system/dls";

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
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partyInviteTitle"
    >
      <div
        className={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${SURFACES.modalHero} text-center space-y-6 relative overflow-hidden border border-amber-500/50 shadow-2xl`}
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
          <button
            onClick={() => onAccept(invitation.id)}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow"
          >
            Accept & Join
          </button>
          <button
            onClick={() => onDecline(invitation.id)}
            className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition border border-stone-700"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
