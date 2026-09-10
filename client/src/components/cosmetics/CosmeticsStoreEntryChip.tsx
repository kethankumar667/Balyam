/**
 * BHALYAM — Cosmetics Boutique Entry Chip
 *
 * Header action chip matching the styling of DailyStreakEntryChip and WalletBalanceChip.
 * Provides accessible >=44x44px touch target with hover feedback, tooltip,
 * and direct invocation of the Cosmetics Boutique modal.
 */

import React from "react";
import { motion } from "framer-motion";
import { Store } from "lucide-react";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { Tooltip } from "../../design-system/dls/Tooltip";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

export function CosmeticsStoreEntryChip() {
  const openStore = useCosmeticsStore((s) => s.openStore);

  const handleClick = () => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    openStore();
  };

  const tooltipText = "Cosmetics Boutique — Customize table felt, dice, pawns, card backs & auras";

  return (
    <Tooltip content={tooltipText} side="bottom">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={bhalyamSpring}
        onClick={handleClick}
        aria-label={tooltipText}
        title={tooltipText}
        className="group relative min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-full border flex items-center gap-2 select-none
                   transition-all duration-300 cursor-pointer flex-shrink-0 focus-visible:outline-hidden focus-visible:ring-2
                   focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]
                   bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                   hover:border-amber-500/50 hover:bg-[var(--chrome-control-hi)] shadow-xs"
      >
        {/* Store Icon */}
        <div className="relative flex items-center justify-center">
          <Store className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Label */}
        <span className="hidden sm:inline text-[13px] font-bold tracking-tight">
          Shop
        </span>
      </motion.button>
    </Tooltip>
  );
}
