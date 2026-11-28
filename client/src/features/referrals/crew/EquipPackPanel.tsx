import { Check, Shirt } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { PACK_EQUIPPED_NOTE, usePackEquip } from "../usePackEquip";
import { GOLD_BUTTON, HEADING, MUTED, PANEL_PURPLE } from "./crewStyles";

/** A worn pack: the same shape as the gold button but quiet and unclickable, so it reads as a status, not an offer. */
const EQUIPPED_BUTTON = "inline-flex min-h-[44px] w-full cursor-default items-center justify-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-50 px-5 text-base font-black text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-400/10 dark:text-emerald-300";

/**
 * Wearing the Nostalgia Pack, on the Crew Quest page under the vault that shows it. It appears for a member whose pack
 * is unlocked and for anyone holding the Admin Pass, who may wear it without earning it; the panel says plainly that the
 * pass is access, not ownership. It renders nothing for everyone else, so a locked pack never offers an equip button.
 * Once every slot holds the pack the button becomes a disabled "Pack equipped" status (read from the saved loadout, so it
 * holds after a refresh) and comes back only if one of those slots is changed.
 */
export function EquipPackPanel({ pack }: { pack: ReferralOverview["pack"] }) {
  const { hasAdminPass, isVisible, isEquipped, equipping, feedback, equipPack } = usePackEquip(pack.granted);
  if (!isVisible) return null;
  const note = feedback ?? (isEquipped ? PACK_EQUIPPED_NOTE : null);

  return (
    <section id="nostalgia-pack-equip" aria-labelledby="crew-equip-title" className={PANEL_PURPLE}>
      <h2 id="crew-equip-title" className={HEADING}>
        <Shirt size={15} aria-hidden="true" className="text-violet-700 dark:text-purple-300" /> Wear your pack
      </h2>
      {hasAdminPass && (
        <p className={`m-0 mt-2 text-xs leading-relaxed ${MUTED}`}>
          Admin Pass gives access to all three items without completing referrals. This is not earned ownership.
        </p>
      )}
      {isEquipped ? (
        <button type="button" disabled aria-disabled="true" className={`${EQUIPPED_BUTTON} mt-3`}>
          <Check size={18} aria-hidden="true" /> Pack equipped
        </button>
      ) : (
        <button type="button" disabled={equipping} onClick={() => void equipPack()} className={`${GOLD_BUTTON} mt-3 disabled:opacity-60`}>
          {equipping ? "Equipping..." : hasAdminPass ? "Equip pack · Admin Pass" : "Equip earned pack"}
        </button>
      )}
      {note && <p role="status" className={`m-0 mt-3 text-xs leading-relaxed ${MUTED}`}>{note}</p>}
    </section>
  );
}
