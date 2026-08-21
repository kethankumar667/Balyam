import { useState, useEffect } from "react";
import { User as UserIcon, X, ArrowRight } from "lucide-react";
import { useRoomStore } from "../../../store/roomStore";
import { useAuthStore } from "../../../store/authStore";
import AvatarPicker from "../../../components/profile/AvatarPicker";
import Modal from "../../../components/Modal";

/**
 * GuestProfileModal — Unified Edit Profile modal matching the JoinRoomModal design.
 * Collects name and avatar in a single, polished dialog.
 */
export function GuestProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { playerName, avatarId, setPlayerName, setAvatarId } = useRoomStore();
  const isMember = useAuthStore((s) => s.isMember);
  const [draftName, setDraftName] = useState(playerName);
  const [draftAvatarId, setDraftAvatarId] = useState<string | null>(avatarId);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftName(playerName);
      setDraftAvatarId(avatarId);
      setNameError(null);
    }
  }, [open, playerName, avatarId]);

  if (!open) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draftName.trim().slice(0, 20);
    setPlayerName(clean);
    setAvatarId(draftAvatarId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobileSheet
      ariaLabelledBy="guest-profile-modal-title"
      className="animate-fade-in"
      panelClassName="bhalyam-font relative w-full md:max-w-sm
                 max-h-[92dvh] overflow-hidden flex flex-col
                 bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                 border-2 border-bhalyam-cream-edge/70 dark:border-slate-800
                 rounded-t-3xl md:rounded-3xl
                 shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                 md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
      panelStyle={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Pull handle (mobile bottom-sheet only) */}
      <div className="md:hidden flex justify-center pt-2">
        <span aria-hidden className="w-8 h-1 rounded-full bg-bhalyam-wood/30 dark:bg-slate-700" />
      </div>

      {/* Header — compact, always visible */}
      <header className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b border-bhalyam-cream-edge/50 dark:border-slate-800">
        <span
          className="inline-flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #EA5A1F, #B53917)",
            boxShadow: "0 4px 10px -3px #B5391766",
          }}
          aria-hidden
        >
          <UserIcon className="w-4.5 h-4.5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="guest-profile-modal-title"
            className="font-bold text-bhalyam-wood-dark dark:text-slate-100 text-base leading-tight truncate"
          >
            Player Profile
          </h2>
          <div className="text-[9px] uppercase tracking-widest font-bold text-bhalyam-wood/70 dark:text-slate-500">
            Nickname &amp; avatar
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full inline-flex items-center justify-center
                     bg-bhalyam-cream-warm dark:bg-[#1E2738] text-bhalyam-wood-dark dark:text-slate-200 cursor-pointer
                     hover:bg-bhalyam-cream-edge dark:hover:bg-[#2A374F] active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                     transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Body Form — only this area scrolls if content overflows */}
      <form
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Name input field */}
        <div className="space-y-1">
          <label
            htmlFor="guest-profile-name"
            className="block text-[10px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400"
          >
            Your Name
          </label>
          <input
            id="guest-profile-name"
            type="text"
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. Sri Krishna"
            maxLength={20}
            autoComplete="given-name"
            className="w-full h-10 px-3 rounded-xl
                       bg-bhalyam-cream-soft dark:bg-[var(--surface-0)] border-2
                       border-bhalyam-cream-edge/80 dark:border-slate-700/80
                       text-bhalyam-wood-dark dark:text-slate-100 placeholder:text-bhalyam-wood-dark/40 dark:placeholder:text-slate-500
                       font-bold text-sm
                       focus:outline-none focus:ring-2 focus:border-bhalyam-gold-dark dark:focus:border-amber-400 focus:ring-bhalyam-gold/40
                       transition-all duration-200 shadow-xs"
          />
        </div>

        {/* Avatar Picker section */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400">
            Choose Avatar
          </label>
          <AvatarPicker
            value={draftAvatarId}
            onChange={(id) => setDraftAvatarId(id)}
            hideSummary={true}
            isGuest={!isMember}
          />
        </div>

        {/* Save CTA */}
        <div className="pt-1">
          <button
            type="submit"
            className="w-full h-11 rounded-2xl
                       bhalyam-gold-leaf bhalyam-cta-shine
                       border border-bhalyam-gold-dark text-bhalyam-wood-dark
                       font-black text-sm inline-flex items-center justify-center gap-2
                       hover:brightness-[1.04] shadow-[0_6px_14px_-4px_rgba(228,177,40,0.55)]
                       active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark
                       transition-[filter,box-shadow,transform] duration-200 cursor-pointer"
          >
            <span>Save Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
