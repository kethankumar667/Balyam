import { Shirt } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { usePackEquip } from "../usePackEquip";
import { GOLD_BUTTON, HEADING, MUTED, PANEL_PURPLE } from "./crewStyles";

/**
 * Wearing the Nostalgia Pack, on the Crew Quest page under the vault that shows it. It appears for a member whose pack
 * is unlocked and for anyone holding the Admin Pass, who may wear it without earning it; the panel says plainly that the
 * pass is access, not ownership. It renders nothing for everyone else, so a locked pack never offers an equip button.
 */
export function EquipPackPanel({ pack }: { pack: ReferralOverview["pack"] }) {
  const { hasAdminPass, equipping, feedback, equipPack } = usePackEquip();
  if (!hasAdminPass && !pack.granted) return null;

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
      <button type="button" disabled={equipping} onClick={() => void equipPack()} className={`${GOLD_BUTTON} mt-3 disabled:opacity-60`}>
        {equipping ? "Equipping..." : hasAdminPass ? "Equip pack · Admin Pass" : "Equip earned pack"}
      </button>
      {feedback && <p role="status" className={`m-0 mt-3 text-xs leading-relaxed ${MUTED}`}>{feedback}</p>}
    </section>
  );
}
