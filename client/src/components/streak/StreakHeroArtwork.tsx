import { motion } from "framer-motion";
import {
  Crown,
  Star,
} from "lucide-react";
import { type StreakMilestoneChest } from "@shared/streak-types";

export const CHEST_IMAGES: Record<StreakMilestoneChest | "legendary", string> = {
  bronze: "/bronze chest.png",
  silver: "/silver chest.png",
  gold: "/Gold chest.png",
  diamond: "/legendary chest.png",
  legendary: "/legendary chest.png",
};

export function getChestImageUrl(type: StreakMilestoneChest | "legendary" | string): string {
  if (type === "bronze") return CHEST_IMAGES.bronze;
  if (type === "silver") return CHEST_IMAGES.silver;
  if (type === "gold") return CHEST_IMAGES.gold;
  if (type === "diamond" || type === "legendary") return CHEST_IMAGES.diamond;
  return CHEST_IMAGES.bronze;
}

interface StreakHeroArtworkProps {
  type: "coins" | StreakMilestoneChest | "legendary";
  size?: number;
  showCrown?: boolean;
}

export function StreakHeroArtwork({ type, size = 110, showCrown = true }: StreakHeroArtworkProps) {
  if (type === "diamond" || type === "legendary") {
    return (
      <div
        className="relative flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        {/* Ambient Halo — the biggest, richest glow for the climax tier */}
        <div className="absolute inset-[-12px] rounded-full bg-gradient-to-tr from-cyan-500/40 via-violet-500/40 to-amber-400/35 blur-2xl animate-pulse" />

        {/* Rotating Sunburst Halo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-14px] pointer-events-none rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.25) 30deg, transparent 60deg, rgba(234,179,8,0.3) 90deg, transparent 120deg, rgba(168,85,247,0.25) 150deg, transparent 180deg, rgba(56,189,248,0.25) 210deg, transparent 240deg, rgba(234,179,8,0.3) 270deg, transparent 300deg, rgba(168,85,247,0.25) 330deg, transparent 360deg)",
          }}
        />

        {/* Floating Crown above Chest */}
        {showCrown && (
          <motion.div
            animate={{ y: [-4, -9, -4], rotate: [-2, 2, -2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-3.5 z-10"
          >
            <Crown className="w-8 h-8 text-amber-300 fill-amber-400/80 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
          </motion.div>
        )}

        {/* Floating Twinkle Accents */}
        <motion.div
          animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-2 text-cyan-300 pointer-events-none z-10"
        >
          <Star className="w-4 h-4 fill-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 0.75, 1], opacity: [0.8, 0.4, 0.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute -bottom-1 -left-2 text-amber-300 pointer-events-none z-10"
        >
          <Star className="w-3.5 h-3.5 fill-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
        </motion.div>

        {/* 3D Legendary Chest Image */}
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-0 flex items-center justify-center overflow-visible"
          style={{ width: size, height: size }}
        >
          <img
            src={CHEST_IMAGES.diamond}
            alt="Legendary Diamond Milestone Chest"
            className="w-full h-full object-contain filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.75)] drop-shadow-[0_0_22px_rgba(56,189,248,0.5)]"
            style={{ transform: "scale(1.38)" }}
            loading="eager"
            draggable={false}
          />
        </motion.div>
      </div>
    );
  }

  if (type === "gold" || type === "silver" || type === "bronze") {
    const isGold = type === "gold";
    const isSilver = type === "silver";

    const glowColor = isGold
      ? "rgba(250,204,21,0.55)"
      : isSilver
      ? "rgba(56,189,248,0.45)"
      : "rgba(205,127,50,0.5)";

    const starColor = isGold ? "#fde047" : isSilver ? "#38bdf8" : "#fb923c";

    return (
      <div
        className="relative flex items-center justify-center select-none overflow-visible"
        style={{ width: size, height: size }}
      >
        {/* Soft Radial Ambient Aura */}
        <div
          className={`absolute rounded-full blur-xl animate-pulse pointer-events-none ${
            isGold ? "inset-[-10px] opacity-90" : isSilver ? "inset-[-8px] opacity-80" : "inset-[-6px] opacity-70"
          }`}
          style={{ backgroundColor: glowColor }}
        />

        {/* Floating sparkle accents */}
        {(isSilver || isGold) && (
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1.5 -right-1 pointer-events-none z-10"
            style={{ color: starColor }}
          >
            <Star className="w-4 h-4 fill-current drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
          </motion.div>
        )}
        {isGold && (
          <motion.div
            animate={{ scale: [1, 0.7, 1], opacity: [0.8, 0.35, 0.8] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute bottom-0 -left-1.5 text-amber-300 pointer-events-none z-10"
          >
            <Star className="w-3.5 h-3.5 fill-current drop-shadow-[0_0_6px_rgba(253,224,71,0.8)]" />
          </motion.div>
        )}

        {/* 3D Chest Image */}
        <motion.div
          animate={{ y: [-2.5, 2.5, -2.5] }}
          transition={{ duration: isGold ? 2.6 : 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-0 flex items-center justify-center overflow-visible"
          style={{ width: size, height: size }}
        >
          <img
            src={getChestImageUrl(type)}
            alt={`${type.toUpperCase()} Milestone Chest`}
            className={`w-full h-full object-contain filter drop-shadow-[0_12px_22px_rgba(0,0,0,0.7)] ${
              isGold
                ? "drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]"
                : isSilver
                ? "drop-shadow-[0_0_16px_rgba(56,189,248,0.4)]"
                : "drop-shadow-[0_0_14px_rgba(205,127,50,0.4)]"
            }`}
            style={{ transform: "scale(1.35)" }}
            loading="eager"
            draggable={false}
          />
        </motion.div>
      </div>
    );
  }

  // DEFAULT: High-Energy Luscious Golden Coin Pile Artwork
  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Radiant Sunburst Glow */}
      <div className="absolute inset-[-10px] rounded-full bg-gradient-to-tr from-amber-500/35 via-yellow-400/30 to-orange-500/20 blur-xl animate-pulse" />

      {/* Floating Sparkle Stars */}
      <motion.div
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-2 -right-1 text-amber-300"
      >
        <Star className="w-5 h-5 fill-amber-300/60 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
      </motion.div>

      <motion.div
        animate={{ scale: [1, 0.7, 1], opacity: [0.8, 0.4, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-2 -left-2 text-yellow-300"
      >
        <Star className="w-4 h-4 fill-yellow-200/60 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
      </motion.div>

      {/* Golden Coin Stack SVG */}
      <motion.div
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="goldFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="coinSide" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Table Ground Shadow */}
          <ellipse cx="60" cy="106" rx="46" ry="10" fill="#000000" fillOpacity="0.45" />

          {/* === LEFT COIN STACK === */}
          {/* Bottom coin left */}
          <path d="M22 84 C22 79 46 79 46 84 L46 90 C46 95 22 95 22 90 Z" fill="url(#coinSide)" />
          <ellipse cx="34" cy="84" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* Middle coin left */}
          <path d="M22 76 C22 71 46 71 46 76 L46 82 C46 87 22 87 22 82 Z" fill="url(#coinSide)" />
          <ellipse cx="34" cy="76" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* Top coin left */}
          <path d="M22 68 C22 63 46 63 46 68 L46 74 C46 79 22 79 22 74 Z" fill="url(#coinSide)" />
          <ellipse cx="34" cy="68" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* === RIGHT COIN STACK === */}
          {/* Bottom coin right */}
          <path d="M74 84 C74 79 98 79 98 84 L98 90 C98 95 74 95 74 90 Z" fill="url(#coinSide)" />
          <ellipse cx="86" cy="84" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* Middle coin right */}
          <path d="M74 76 C74 71 98 71 98 76 L98 82 C98 87 74 87 74 82 Z" fill="url(#coinSide)" />
          <ellipse cx="86" cy="76" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* Top coin right */}
          <path d="M74 68 C74 63 98 63 98 68 L74 74 C74 79 98 79 98 74 Z" fill="url(#coinSide)" />
          <ellipse cx="86" cy="68" rx="12" ry="5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />

          {/* === TALL CENTER COIN STACK === */}
          {/* Layer 1 (Lowest) */}
          <path d="M38 90 C38 83 82 83 82 90 L82 96 C82 103 38 103 38 96 Z" fill="url(#coinSide)" />
          <ellipse cx="60" cy="90" rx="22" ry="8" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.5" />

          {/* Layer 2 */}
          <path d="M38 80 C38 73 82 73 82 80 L82 86 C82 93 38 93 38 86 Z" fill="url(#coinSide)" />
          <ellipse cx="60" cy="80" rx="22" ry="8" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.5" />

          {/* Layer 3 */}
          <path d="M38 70 C38 63 82 63 82 70 L82 76 C82 83 38 83 38 76 Z" fill="url(#coinSide)" />
          <ellipse cx="60" cy="70" rx="22" ry="8" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.5" />

          {/* Layer 4 */}
          <path d="M38 60 C38 53 82 53 82 60 L82 66 C82 73 38 73 38 66 Z" fill="url(#coinSide)" />
          <ellipse cx="60" cy="60" rx="22" ry="8" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.5" />

          {/* Layer 5 (Hero Center Top Coin) */}
          <path d="M38 50 C38 43 82 43 82 50 L82 56 C82 63 38 63 38 56 Z" fill="url(#coinSide)" />
          <ellipse cx="60" cy="50" rx="22" ry="8" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.8" filter="url(#coinShadow)" />

          {/* Embossed Star on Top Coin Face */}
          <path
            d="M60 45 L62 48 L65 48.5 L63 50.5 L63.5 53.5 L60 51.5 L56.5 53.5 L57 50.5 L55 48.5 L58 48 Z"
            fill="#ffffff"
            fillOpacity="0.8"
          />

          {/* Dynamic Light Specular Highlight */}
          <path
            d="M44 48 C48 45 68 45 74 48"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default StreakHeroArtwork;