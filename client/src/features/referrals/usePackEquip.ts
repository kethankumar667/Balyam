import { useEffect, useState } from "react";
import { isPackEquipped, packEquipTargets } from "@shared/referrals";
import { useAuthStore } from "../../store/authStore";
import { useCosmeticsStore } from "../../store/cosmeticsStore";

/** What wearing the pack does, shown after an equip and whenever the pack is found already worn. */
export const PACK_EQUIPPED_NOTE = "Pack equipped. School Slate appears in Rummy, Ludo, Goli Jump, Bingo, Star Game and Sudoku; a host-selected world takes priority at the table.";

/**
 * Wearing the Nostalgia Pack: one equip per slot in `packEquipTargets()` (the aura, the title and the School Slate for
 * each of its six games), stopping at the first refusal and never claiming the whole pack when one slot failed.
 *
 * This used to live inside the home page's Social Quest card. It moved here, to the Crew Quest page, so the home
 * overview stays a small summary; the rules are unchanged. Every step re-checks that the signed-in account is still the
 * one that asked, so switching accounts mid-way cannot dress the wrong account.
 *
 * `isEquipped` is read from the saved loadout, not remembered from a click, so it is still true after a refresh and
 * turns false again if someone swaps one of the pack's slots in the shop.
 */
export function usePackEquip(packGranted: boolean) {
  const userId = useAuthStore(s => s.userId);
  /** The Admin Pass: access to the whole pack without earning it. It is access, not ownership. */
  const hasAdminPass = useAuthStore(s => s.capabilities.unlockAllFeatures);
  const isVisible = hasAdminPass || packGranted;
  const isEquipped = useCosmeticsStore(s => isPackEquipped(s.equipped));
  const [equipping, setEquipping] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => { setFeedback(null); setEquipping(false); }, [userId]);
  // Read what is worn as soon as the panel is on screen, so a pack equipped earlier shows as equipped on arrival.
  useEffect(() => {
    if (isVisible && userId) void useCosmeticsStore.getState().fetchCosmetics();
  }, [isVisible, userId]);

  async function equipPack() {
    if (isEquipped) return;
    setEquipping(true);
    setFeedback(null);
    try {
      await useCosmeticsStore.getState().fetchCosmetics();
      for (const item of packEquipTargets()) {
        if (useAuthStore.getState().userId !== userId) return;
        const ok = await useCosmeticsStore.getState().equipItem(item.category, item.scope, item.id);
        if (useAuthStore.getState().userId !== userId) return;
        if (!ok) {
          setFeedback(useCosmeticsStore.getState().errorMessage ?? "One reward could not be equipped. Try again; already equipped rewards are kept.");
          return;
        }
      }
      if (useAuthStore.getState().userId === userId) setFeedback(PACK_EQUIPPED_NOTE);
    } catch (error) {
      if (useAuthStore.getState().userId === userId) setFeedback(error instanceof Error ? error.message : "The pack could not be equipped. Please try again.");
    } finally { if (useAuthStore.getState().userId === userId) setEquipping(false); }
  }

  return { hasAdminPass, isVisible, isEquipped, equipping, feedback, equipPack };
}
