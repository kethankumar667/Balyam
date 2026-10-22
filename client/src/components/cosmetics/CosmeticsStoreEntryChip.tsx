/**
 * BHALYAM — Cosmetics Boutique Entry Chip
 *
 * Header action chip matching the styling of DailyStreakEntryChip and WalletBalanceChip.
 * Provides accessible >=44x44px touch target with hover feedback, tooltip,
 * and takes the player to the Cosmetics Boutique page (/shop).
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store } from "lucide-react";
import { Tooltip } from "../../design-system/dls/Tooltip";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

export function CosmeticsStoreEntryChip() {
  const navigate = useNavigate();

  const handleClick = () => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    navigate("/shop");
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
        className="group relative min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-full border flex items-center justify-center gap-1.5 sm:gap-2 select-none
                   transition-all duration-300 cursor-pointer flex-shrink-0 focus-visible:outline-hidden focus-visible:ring-2
                   focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]
                   bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                   hover:border-amber-400/70 hover:bg-amber-500/10 hover:shadow-[0_4px_16px_-4px_rgba(245,158,11,0.35)] shadow-xs"
      >
        {/* Store Icon */}
        <div className="relative flex items-center justify-center">
          <Store className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 group-hover:text-amber-300 transition-all duration-300" />
        </div>

        {/* Label */}
        <span className="hidden sm:inline text-[13px] font-extrabold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
          Shop
        </span>
      </motion.button>
    </Tooltip>
  );
}
