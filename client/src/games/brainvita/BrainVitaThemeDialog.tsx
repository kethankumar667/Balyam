import { useRef } from "react";
import { Check, Lock, X } from "lucide-react";
import Modal from "../../components/Modal";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { SKINS, SKIN_IDS, type SkinId } from "./brainvitaSkins";

export interface BrainVitaThemeDialogProps {
  open: boolean;
  onClose: () => void;
  skin: SkinId;
  unlocked: readonly SkinId[];
  onSelectSkin: (skin: SkinId) => void;
  /** False where the screen has no motion to follow, or the player asked for less motion. */
  isTiltAvailable: boolean;
  isTiltOn: boolean;
  onToggleTilt: () => void;
  /** Why tilt could not be turned on, e.g. motion access was refused. */
  tiltNote: string | null;
}

/**
 * Where the board's look is chosen. The classic wood is always there; the holo table shows what it asks
 * for until it has been earned, and cannot be picked before then. The tilt switch lives here too, so the
 * header keeps its few buttons.
 */
export function BrainVitaThemeDialog({ open, onClose, skin, unlocked, onSelectSkin, isTiltAvailable, isTiltOn, onToggleTilt, tiltNote }: BrainVitaThemeDialogProps) {
  const current = useSkinTokens();
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      initialFocusRef={closeRef}
      ariaLabelledBy="brainvita-theme-title"
      panelClassName="w-full max-w-sm rounded-3xl p-5 text-amber-50 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="rounded-3xl" style={{ background: current.plankBackground, border: current.plankBorder }}>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="brainvita-theme-title" className="font-display text-2xl font-black tracking-wide" style={{ color: current.titleColor }}>
              Look and feel
            </h2>
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-amber-50/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E4B128]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Board theme" className="space-y-2">
            {SKIN_IDS.map((id) => {
              const tokens = SKINS[id];
              const isOwned = unlocked.includes(id);
              const isChosen = skin === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  aria-disabled={!isOwned}
                  onClick={() => {
                    if (isOwned) onSelectSkin(id);
                  }}
                  className="flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left aria-disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]"
                  style={{ background: "rgba(0,0,0,0.28)", border: isChosen ? `1.5px solid ${current.accent}` : "1px solid rgba(255,255,255,0.12)" }}
                >
                  <span aria-hidden className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: tokens.tableBackground, border: tokens.plankBorder, opacity: isOwned ? 1 : 0.55 }}>
                    <span className="h-5 w-5 rounded-full" style={{ background: tokens.marbleFill, boxShadow: tokens.marbleShadow }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{tokens.name}</span>
                    {!isOwned && tokens.unlockHint && <span className="block text-xs leading-snug text-amber-100/80">{tokens.unlockHint}</span>}
                    {isOwned && id !== "wood" && <span className="block text-xs text-amber-100/70">Earned by playing</span>}
                  </span>
                  {isChosen && <Check aria-hidden className="h-5 w-5 flex-shrink-0" style={{ color: current.accent }} />}
                  {!isOwned && <Lock aria-hidden className="h-4 w-4 flex-shrink-0 text-amber-100/70" />}
                </button>
              );
            })}
          </div>

          {isTiltAvailable && (
            <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <button
                type="button"
                role="switch"
                aria-checked={isTiltOn}
                onClick={onToggleTilt}
                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Tilt the board</span>
                  <span className="block text-xs leading-snug text-amber-100/80">The board leans with your phone, or your mouse on a computer.</span>
                </span>
                <span aria-hidden className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors" style={{ background: isTiltOn ? current.accent : "rgba(255,255,255,0.22)" }}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]" style={{ left: isTiltOn ? "calc(100% - 22px)" : "2px" }} />
                </span>
              </button>
              {tiltNote && <p className="mt-1 text-xs font-medium text-amber-200">{tiltNote}</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
