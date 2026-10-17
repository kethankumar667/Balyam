import { useRef } from "react";
import { Check, Lock, X } from "lucide-react";
import Modal from "../../components/Modal";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { SKINS, requirementText, type EarnedSkinId, type SkinId } from "./brainvitaSkins";

export interface BrainVitaThemeDialogProps {
  open: boolean;
  onClose: () => void;
  skin: SkinId;
  unlocked: readonly SkinId[];
  /** This player's ladder: the earned themes in the order they are won, the first for the most marbles left. */
  order: readonly EarnedSkinId[];
  onSelectSkin: (skin: SkinId) => void;
}

/**
 * Where the board's look is chosen. Classic wood is always there. The five earned themes are listed in
 * the order this player will win them, each saying what it asks for until it has been earned, and none can
 * be picked before then.
 */
export function BrainVitaThemeDialog({ open, onClose, skin, unlocked, order, onSelectSkin }: BrainVitaThemeDialogProps) {
  const current = useSkinTokens();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rows: SkinId[] = ["wood", ...order];
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
              Board theme
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

          <div role="radiogroup" aria-label="Board theme" className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
            {rows.map((id) => {
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
                    {!isOwned && id !== "wood" && <span className="block text-xs leading-snug text-amber-100/80">{requirementText(order, id)}</span>}
                    {isOwned && id !== "wood" && <span className="block text-xs text-amber-100/70">Earned by playing</span>}
                  </span>
                  {isChosen && <Check aria-hidden className="h-5 w-5 flex-shrink-0" style={{ color: current.accent }} />}
                  {!isOwned && <Lock aria-hidden className="h-4 w-4 flex-shrink-0 text-amber-100/70" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
