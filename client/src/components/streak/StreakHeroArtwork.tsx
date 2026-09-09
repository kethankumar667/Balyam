import { motion } from "framer-motion";
import { Sparkles, Crown } from "lucide-react";
import { type StreakMilestoneChest } from "@shared/streak-types";

interface StreakHeroArtworkProps {
  type: "coins" | StreakMilestoneChest;
  size?: number;
}

export function StreakHeroArtwork({ type, size = 110 }: StreakHeroArtworkProps) {
  if (type === "diamond") {
    return (
      <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
        {/* Ambient Halo — the biggest, richest glow of any tier; this is
            the destination reward, it should out-shine every milestone
            leading up to it, not just match them. */}
        <div className="absolute inset-[-10px] rounded-full bg-gradient-to-tr from-cyan-500/40 via-violet-500/40 to-amber-400/40 blur-2xl animate-pulse" />

        {/* Rotating Sunburst Halo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-14px] pointer-events-none rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.2) 30deg, transparent 60deg, rgba(234,179,8,0.25) 90deg, transparent 120deg, rgba(168,85,247,0.2) 150deg, transparent 180deg, rgba(56,189,248,0.2) 210deg, transparent 240deg, rgba(234,179,8,0.25) 270deg, transparent 300deg, rgba(168,85,247,0.2) 330deg, transparent 360deg)",
          }}
        />

        {/* Floating Crown above Chest */}
        <motion.div
          animate={{ y: [-4, -9, -4], rotate: [-2, 2, -2] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 z-10"
        >
          <Crown className="w-8 h-8 text-amber-300 fill-amber-400/70 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
        </motion.div>

        {/* Diamond Chest SVG */}
        <motion.div
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="diaBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="diaLid" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Chest Shadow */}
            <ellipse cx="60" cy="104" rx="44" ry="10" fill="black" fillOpacity="0.4" />

            {/* Chest Body */}
            <rect x="24" y="58" width="72" height="42" rx="8" fill="url(#diaBody)" stroke="url(#goldTrim)" strokeWidth="3" />

            {/* Chest Lid Curved */}
            <path
              d="M20 58 C20 40, 100 40, 100 58 Z"
              fill="url(#diaLid)"
              stroke="url(#goldTrim)"
              strokeWidth="3"
            />

            {/* Gold Corner Straps */}
            <path d="M24 58 L24 96 M96 58 L96 96" stroke="url(#goldTrim)" strokeWidth="4" strokeLinecap="round" />
            <path d="M42 58 L42 100 M78 58 L78 100" stroke="url(#goldTrim)" strokeWidth="3" />

            {/* Glowing Diamond Center Keyhole */}
            <polygon
              points="60,62 69,72 60,82 51,72"
              fill="#ffffff"
              stroke="#38bdf8"
              strokeWidth="2"
              filter="url(#glow)"
            />
            <circle cx="60" cy="72" r="2.5" fill="#0284c7" />

            {/* Sparkle Glints */}
            <circle cx="34" cy="46" r="2" fill="#ffffff" />
            <circle cx="86" cy="48" r="1.5" fill="#ffffff" />
          </svg>
        </motion.div>
      </div>
    );
  }

  if (type === "gold" || type === "silver" || type === "bronze") {
    const isGold = type === "gold";
    const isSilver = type === "silver";

    // Authentic Rarity Palettes: Bronze #CD7F32, Silver #C0C0C0, Gold #FFD700
    const bodyGradient = isGold
      ? ["#fde047", "#eab308", "#92400e"]
      : isSilver
      ? ["#f8fafc", "#cbd5e1", "#475569"]
      : ["#f97316", "#cd7f32", "#7c2d12"];

    const trimGradient = isGold
      ? ["#fef9c3", "#facc15", "#854d0e"]
      : isSilver
      ? ["#ffffff", "#e2e8f0", "#64748b"]
      : ["#ffedd5", "#ea580c", "#831843"];

    const glowColor = isGold
      ? "rgba(250,204,21,0.6)"
      : isSilver
      ? "rgba(203,213,225,0.5)"
      : "rgba(205,127,50,0.5)";

    // Each rarity should read as a step up, not a recolor of the same box:
    // Bronze stays a plain travel chest (no extra hardware). Silver adds
    // riveted corner studs. Gold adds both the rivets AND a glowing center
    // gem on the lid, plus a richer ambient aura — genuinely more going on
    // visually the higher the tier, mirroring the actual reward jump
    // (1,000 -> 2,500 -> 5,000 coins).
    const hasRivets = isSilver || isGold;
    const hasLidGem = isGold;

    return (
      <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
        {/* Soft Radial Ambient Aura — richer for higher tiers */}
        <div
          className={`absolute rounded-full blur-xl animate-pulse pointer-events-none ${
            isGold ? "inset-[-10px] opacity-90" : isSilver ? "inset-[-8px] opacity-80" : "inset-[-6px] opacity-65"
          }`}
          style={{ backgroundColor: glowColor }}
        />

        {/* Floating sparkle accents — absent on Bronze (the "starter" tier),
            one on Silver, two on Gold, matching the escalating ceremony. */}
        {(isSilver || isGold) && (
          <motion.div
            animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1.5 -right-0.5 pointer-events-none"
            style={{ color: isGold ? "#fde047" : "#e2e8f0" }}
          >
            <Sparkles className="w-4 h-4 fill-current drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
          </motion.div>
        )}
        {isGold && (
          <motion.div
            animate={{ scale: [1, 0.7, 1], opacity: [0.8, 0.35, 0.8] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute bottom-1 -left-1 text-amber-200 pointer-events-none"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]" />
          </motion.div>
        )}

        <motion.div
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`chestBody_${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={bodyGradient[0]} />
                <stop offset="50%" stopColor={bodyGradient[1]} />
                <stop offset="100%" stopColor={bodyGradient[2]} />
              </linearGradient>
              <linearGradient id={`chestTrim_${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={trimGradient[0]} />
                <stop offset="50%" stopColor={trimGradient[1]} />
                <stop offset="100%" stopColor={trimGradient[2]} />
              </linearGradient>
              {hasLidGem && (
                <radialGradient id="lidGem" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="55%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>
              )}
            </defs>

            {/* Shadow */}
            <ellipse cx="60" cy="102" rx="42" ry="9" fill="black" fillOpacity="0.4" />

            {/* Base */}
            <rect
              x="26"
              y="58"
              width="68"
              height="40"
              rx="8"
              fill={`url(#chestBody_${type})`}
              stroke={`url(#chestTrim_${type})`}
              strokeWidth="3"
            />

            {/* Lid */}
            <path
              d="M22 58 C22 42, 98 42, 98 58 Z"
              fill={`url(#chestBody_${type})`}
              stroke={`url(#chestTrim_${type})`}
              strokeWidth="3"
            />

            {/* Metal Bands */}
            <path d="M42 58 L42 98 M78 58 L78 98" stroke={`url(#chestTrim_${type})`} strokeWidth="4" />

            {/* Riveted corner studs — Silver and Gold only, the plainer
                Bronze chest has none, so the step up in hardware is visible
                at a glance. */}
            {hasRivets && (
              <>
                <circle cx="30" cy="66" r="2.2" fill={`url(#chestTrim_${type})`} stroke="#1e293b" strokeWidth="0.6" />
                <circle cx="90" cy="66" r="2.2" fill={`url(#chestTrim_${type})`} stroke="#1e293b" strokeWidth="0.6" />
                <circle cx="30" cy="90" r="2.2" fill={`url(#chestTrim_${type})`} stroke="#1e293b" strokeWidth="0.6" />
                <circle cx="90" cy="90" r="2.2" fill={`url(#chestTrim_${type})`} stroke="#1e293b" strokeWidth="0.6" />
              </>
            )}

            {/* Center Lock / Keyplate */}
            <rect
              x="54"
              y="62"
              width="12"
              height="14"
              rx="3"
              fill={`url(#chestTrim_${type})`}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <circle cx="60" cy="67" r="2" fill="#1e293b" />
            <path d="M60 69 L60 73" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Glowing lid gem — Gold only, the one visual flourish neither
                Bronze nor Silver has. */}
            {hasLidGem && (
              <>
                <circle cx="60" cy="49" r="6" fill="url(#lidGem)" stroke="#fef3c7" strokeWidth="1" />
                <circle cx="58" cy="47" r="1.6" fill="#ffffff" fillOpacity="0.85" />
              </>
            )}
          </svg>
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
        <Sparkles className="w-5 h-5 fill-amber-300/60 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
      </motion.div>

      <motion.div
        animate={{ scale: [1, 0.7, 1], opacity: [0.8, 0.4, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-2 -left-2 text-yellow-300"
      >
        <Sparkles className="w-4 h-4 fill-yellow-200/60 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
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