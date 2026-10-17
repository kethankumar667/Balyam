import { useRef } from "react";
import { Check, Lock, X } from "lucide-react";
import Modal from "../../components/Modal";
import { MarbleBody } from "./BrainVitaMarble";
import { BrainVitaSkinContext, useSkinTokens } from "./BrainVitaSkinContext";
import { SKINS, requirementText, type EarnedSkinId, type SkinId, type SkinTokens } from "./brainvitaSkins";

export interface BrainVitaThemeDialogProps {
  open: boolean;
  onClose: () => void;
  skin: SkinId;
  unlocked: readonly SkinId[];
  /** This player's ladder: the earned themes in the order they are won, the first for the most marbles left. */
  order: readonly EarnedSkinId[];
  onSelectSkin: (skin: SkinId) => void;
}

/** One line on what each world is, so a locked one says what it would be like to play in. */
export const WORLD_BLURBS: Readonly<Record<SkinId, string>> = {
  wood: "A walnut workshop table, a honey-wood board and glass marbles.",
  holo: "Glowing glass over a neon grid, with marbles of light.",
  zen: "Raked sand, a slab of slate and smooth river pebbles.",
  reef: "A pearly shell on the sea floor, and pearls to play with.",
  toy: "A playroom tray with blocks, a duck and cartoon balls.",
  palace: "Ivory marble inlaid with gold, cut emeralds and brass lamps.",
};

/** A small picture of a world: its table, the shape of its board in its board colour, and one of its marbles. */
function WorldSwatch({ tokens, isDimmed }: { tokens: SkinTokens; isDimmed: boolean }) {
  return (
    <span
      aria-hidden
      className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{ background: tokens.tableBackground, border: tokens.plankBorder, opacity: isDimmed ? 0.6 : 1 }}
    >
      <span className="absolute h-[64%] w-[34%] rounded-[4px]" style={{ background: tokens.swatchBoard, boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }} />
      <span className="absolute h-[34%] w-[64%] rounded-[4px]" style={{ background: tokens.swatchBoard, boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }} />
      <BrainVitaSkinContext.Provider value={tokens}>
        <span className="relative h-[30%] w-[30%]">
          <MarbleBody />
        </span>
      </BrainVitaSkinContext.Provider>
    </span>
  );
}

/**
 * Where the world is chosen. Classic wood is always there. The five earned worlds are listed in
 * the order this player will win them, each saying what it is, and what it asks for until it has been earned.
 * None can be picked before then.
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
              Choose a world
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

          <div role="radiogroup" aria-label="World" className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
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
                  <WorldSwatch tokens={tokens} isDimmed={!isOwned} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{tokens.name}</span>
                    <span className="block text-xs leading-snug text-amber-100/80">{WORLD_BLURBS[id]}</span>
                    {!isOwned && id !== "wood" && <span className="mt-0.5 block text-xs font-semibold leading-snug text-amber-200">{requirementText(order, id)}</span>}
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
