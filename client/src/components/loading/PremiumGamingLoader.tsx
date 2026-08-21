import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BhalyamLogo from "../bhalyam/BhalyamLogo";

interface PremiumGamingLoaderProps {
  title?: string;
  subtitle?: string;
  progress?: number; // 0 to 100
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Preparing your table…",
  "Shuffling the deck…",
  "Loading achievements…",
  "Syncing game data…",
  "Gathering players…",
  "Rolling lucky sixes…",
  "Almost ready to play…",
];

/**
 * 4-Point Celestial Gaming Star / Diamond Glint
 */
function CelestialStar({
  size,
  className = "",
  hasCrossFlare = false,
}: {
  size: number;
  className?: string;
  hasCrossFlare?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
    >
      {/* 4-point Diamond Star */}
      <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z" />
      {/* Secondary diagonal micro-glint for Hero stars */}
      {hasCrossFlare && (
        <path
          d="M12 4L13.5 10.5L20 12L13.5 13.5L12 20L10.5 13.5L4 12L10.5 10.5L12 4Z"
          opacity="0.6"
          transform="rotate(45 12 12)"
        />
      )}
    </svg>
  );
}

// Precomputed 20 Celestial Stars across 3 depth tiers (Deep Space, Midground, Hero Stars)
const CELESTIAL_STARS = [
  // ── Hero Stars (Foreground, Sharp, Cross Glint, Rich Gold Glow) ──
  { top: "14%", left: "82%", size: 22, opacity: 0.95, delay: 0, duration: 3.4, hasGlow: true, hasCrossFlare: true },
  { top: "76%", left: "16%", size: 20, opacity: 0.9, delay: 0.8, duration: 3.8, hasGlow: true, hasCrossFlare: true },
  { top: "35%", left: "8%", size: 24, opacity: 0.95, delay: 0.4, duration: 3.2, hasGlow: true, hasCrossFlare: true },
  { top: "84%", left: "84%", size: 22, opacity: 0.9, delay: 1.2, duration: 3.6, hasGlow: true, hasCrossFlare: true },

  // ── Midground Stars (Medium 4-Point Diamonds) ──
  { top: "18%", left: "18%", size: 14, opacity: 0.65, delay: 0.5, duration: 4.2, hasGlow: false },
  { top: "26%", left: "72%", size: 16, opacity: 0.7, delay: 1.1, duration: 4.0, hasGlow: false },
  { top: "64%", left: "10%", size: 14, opacity: 0.6, delay: 0.7, duration: 4.5, hasGlow: false },
  { top: "70%", left: "88%", size: 15, opacity: 0.7, delay: 1.6, duration: 4.1, hasGlow: false },
  { top: "42%", left: "92%", size: 16, opacity: 0.65, delay: 2.0, duration: 4.4, hasGlow: false },
  { top: "88%", left: "35%", size: 14, opacity: 0.6, delay: 0.9, duration: 4.7, hasGlow: false },
  { top: "12%", left: "42%", size: 15, opacity: 0.7, delay: 1.4, duration: 4.3, hasGlow: false },

  // ── Deep Space Stars (Tiny Twinkling Stars, Atmospheric Atmosphere) ──
  { top: "10%", left: "28%", size: 9, opacity: 0.35, delay: 0.3, duration: 5.5, hasGlow: false },
  { top: "30%", left: "62%", size: 10, opacity: 0.4, delay: 1.5, duration: 5.8, hasGlow: false },
  { top: "52%", left: "15%", size: 8, opacity: 0.3, delay: 2.2, duration: 5.2, hasGlow: false },
  { top: "80%", left: "65%", size: 10, opacity: 0.45, delay: 0.6, duration: 5.6, hasGlow: false },
  { top: "22%", left: "48%", size: 8, opacity: 0.3, delay: 2.5, duration: 6.0, hasGlow: false },
  { top: "72%", left: "45%", size: 9, opacity: 0.35, delay: 1.8, duration: 5.4, hasGlow: false },
  { top: "40%", left: "26%", size: 8, opacity: 0.25, delay: 2.8, duration: 6.2, hasGlow: false },
  { top: "60%", left: "80%", size: 10, opacity: 0.4, delay: 1.3, duration: 5.0, hasGlow: false },
  { top: "90%", left: "18%", size: 8, opacity: 0.3, delay: 0.7, duration: 5.9, hasGlow: false },
];

export default function PremiumGamingLoader({
  title = "BHALYAM",
  subtitle,
  progress,
  className = "",
}: PremiumGamingLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (subtitle) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [subtitle]);

  const activeMessage = subtitle || DEFAULT_MESSAGES[msgIndex];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden bg-[#060A14] text-white ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 42%, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.05) 30%, #060A14 75%)",
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading BHALYAM game experience"
    >
      {/* ── Layer 1: Soft Calibrated Ambient Halo ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[320px] h-[320px] rounded-full bg-amber-500/10 blur-[75px] pointer-events-none" />
      </div>

      {/* ── Layer 2: Twinkling Celestial Golden Stars (3-Tier Parallax Depth) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CELESTIAL_STARS.map((s, idx) => (
          <motion.div
            key={idx}
            className={`absolute flex items-center justify-center text-amber-300 ${
              s.hasGlow ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] text-yellow-200" : ""
            }`}
            style={{
              top: s.top,
              left: s.left,
              opacity: s.opacity,
            }}
            animate={{
              y: [-8, 8, -8],
              x: [-4, 4, -4],
              opacity: [s.opacity * 0.35, s.opacity, s.opacity * 0.35],
              scale: [0.85, 1.2, 0.85],
              rotate: [0, 15, 0],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <CelestialStar
              size={s.size}
              hasCrossFlare={s.hasCrossFlare}
            />
          </motion.div>
        ))}
      </div>

      {/* ── Layer 3: Triple-Ring System + 128px Floating Hero Emblem ── */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
        {/* Ring 1: Outer Continuous Rotating Conic Energy Ring */}
        <div
          className="absolute inset-0 rounded-full border-[2.5px] border-transparent animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(245, 158, 11, 0.85) 45%, rgba(254, 240, 138, 1) 70%, rgba(251, 191, 36, 0.9) 85%, transparent 100%) border-box",
            WebkitMask:
              "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            animationDuration: "3.2s",
          }}
        />

        {/* Ring 2: Middle Counter-Rotating Dotted Orbit Ring */}
        <div
          className="absolute inset-4 sm:inset-5 rounded-full border-2 border-dotted border-amber-400/40 animate-spin"
          style={{
            animationDirection: "reverse",
            animationDuration: "7.0s",
          }}
        />

        {/* Ring 3: Innermost Subtle Breathing Pulse Ring */}
        <motion.div
          className="absolute inset-8 sm:inset-10 rounded-full border border-yellow-300/40 shadow-[0_0_15px_rgba(251,191,36,0.35)]"
          animate={{
            scale: [0.96, 1.04, 0.96],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* ── Centerpiece: 128px Hero Logo with Silky Smooth Float ── */}
        <motion.div
          className="relative z-20 flex items-center justify-center"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="p-4 sm:p-5 rounded-[36px] bg-gradient-to-b from-[#18233C] via-[#10182A] to-[#0A0F1D] border border-amber-500/40 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <BhalyamLogo size={128} decorative />
          </div>
        </motion.div>
      </div>

      {/* ── Typography Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-1 z-10"
      >
        <h2 className="bhalyam-display text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
          {title}
        </h2>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-amber-400/90 block">
          ✦ NOSTALGIC MULTIPLAYER LOUNGE ✦
        </span>
      </motion.div>

      {/* ── Dynamic Cycling Status Message (Smooth Cross-Fade) ── */}
      <div className="h-7 mt-4 mb-2 flex items-center justify-center z-10 max-w-md px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>{activeMessage}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── Shimmering Gold Progress Bar with Continuous Light Sweep ── */}
      <div className="w-72 sm:w-96 max-w-[85vw] mt-2 space-y-2 z-10">
        <div className="h-2.5 sm:h-3 bg-black/40 rounded-full overflow-hidden border border-amber-500/30 p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative">
          {progress !== undefined ? (
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 rounded-full relative overflow-hidden shadow-xs"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.25 }}
            >
              {/* Continuous diagonal light sheen sweep */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{
                  animation: "shimmerSweep 1.5s infinite linear",
                }}
              />
            </motion.div>
          ) : (
            <div
              className="h-full w-1/3 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-500 rounded-full relative overflow-hidden"
              style={{
                animation: "indeterminate-slide 1.5s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
          )}
        </div>

        {/* Status + Live Percentage indicator */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono font-bold text-zinc-400 px-1">
          <span>Loading assets…</span>
          <span className="text-amber-400 font-black">
            {progress !== undefined ? `${Math.round(progress)}%` : "Synchronizing…"}
          </span>
        </div>
      </div>
    </div>
  );
}
