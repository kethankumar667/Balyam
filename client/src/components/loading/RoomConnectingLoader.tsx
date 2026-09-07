import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import { HapticsManager } from "../../services/HapticsManager";

export interface RoomConnectingLoaderProps {
  /** 6-character room code, e.g. "QQXSZA" */
  code?: string;
  /** Callback to trigger connection retry */
  onRetry?: () => void;
  /** Optional custom return-home handler */
  onReturnHome?: () => void;
  className?: string;
}

const NARRATIVE_STEPS = [
  "Opening VIP Lounge Table…",
  "Verifying cryptographic seat token…",
  "Shuffling deck & calibrating dice…",
  "Establishing WebRTC mesh audio…",
  "Synchronizing room state with server…",
];

/**
 * 4-Point Celestial Diamond Glint for Atmospheric Depth
 */
function CelestialGlint({
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
      aria-hidden="true"
    >
      <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z" />
      {hasCrossFlare && (
        <path
          d="M12 4L13.5 10.5L20 12L13.5 13.5L12 20L10.5 13.5L4 12L10.5 10.5L12 4Z"
          opacity="0.5"
          transform="rotate(45 12 12)"
        />
      )}
    </svg>
  );
}

// Background stars configured across depth tiers
const AMBIENT_STARS = [
  { top: "12%", left: "14%", size: 14, opacity: 0.7, delay: 0.2, duration: 3.6, hasGlow: true },
  { top: "18%", left: "86%", size: 16, opacity: 0.85, delay: 0.8, duration: 3.2, hasGlow: true, hasCrossFlare: true },
  { top: "78%", left: "12%", size: 15, opacity: 0.75, delay: 1.2, duration: 3.8, hasGlow: true },
  { top: "82%", left: "88%", size: 18, opacity: 0.9, delay: 0.4, duration: 3.4, hasGlow: true, hasCrossFlare: true },
  { top: "32%", left: "8%", size: 10, opacity: 0.45, delay: 1.5, duration: 4.8 },
  { top: "28%", left: "92%", size: 11, opacity: 0.5, delay: 2.1, duration: 4.4 },
  { top: "68%", left: "6%", size: 10, opacity: 0.4, delay: 0.9, duration: 5.0 },
  { top: "64%", left: "94%", size: 12, opacity: 0.55, delay: 1.7, duration: 4.2 },
];

export default function RoomConnectingLoader({
  code,
  onRetry,
  onReturnHome,
  className = "",
}: RoomConnectingLoaderProps) {
  const navigate = useNavigate();
  const [takingLong, setTakingLong] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pingMs] = useState(() => Math.floor(16 + Math.random() * 12));

  // Cycle status narrative lines
  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % NARRATIVE_STEPS.length);
    }, 2400);
    return () => window.clearInterval(interval);
  }, []);

  // 10s grace period for cold-starts
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTakingLong(true);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    try {
      HapticsManager.getInstance().subtle();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.toUpperCase());
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Gracefully handle clipboard denial
    }
  }, [code]);

  const handleRetry = () => {
    HapticsManager.getInstance().subtle();
    setTakingLong(false);
    if (onRetry) {
      onRetry();
    }
  };

  const handleReturn = () => {
    HapticsManager.getInstance().subtle();
    if (onReturnHome) {
      onReturnHome();
    } else {
      navigate("/");
    }
  };

  const codeChars = (code || "••••••").toUpperCase().slice(0, 6).split("");

  return (
    <div
      className={`relative w-full flex-1 min-h-[580px] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none overflow-hidden transition-colors duration-500 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Connecting to BHALYAM game room"
    >
      {/* ── Layer 1: Ambient Calibrated Radial Glow ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(245, 158, 11, 0.16) 0%, rgba(251, 191, 36, 0.06) 38%, transparent 72%)",
        }}
      />

      {/* ── Layer 2: Floating Celestial Diamond Glints ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {AMBIENT_STARS.map((s, idx) => (
          <motion.div
            key={idx}
            className={`absolute flex items-center justify-center text-amber-500/80 dark:text-amber-300/90 ${
              s.hasGlow ? "drop-shadow-[0_0_10px_rgba(245,158,11,0.65)]" : ""
            }`}
            style={{
              top: s.top,
              left: s.left,
              opacity: s.opacity,
            }}
            animate={{
              y: [-6, 6, -6],
              x: [-3, 3, -3],
              opacity: [s.opacity * 0.4, s.opacity, s.opacity * 0.4],
              scale: [0.88, 1.15, 0.88],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <CelestialGlint size={s.size} hasCrossFlare={s.hasCrossFlare} />
          </motion.div>
        ))}
      </div>

      {/* ── Layer 3: Main Glass Lounge Chamber ── */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        {/* ── Top Telemetry HUD Pill ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 sm:mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 dark:border-amber-400/25 backdrop-blur-md shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wide text-amber-900 dark:text-amber-200">
            CONNECTING • {pingMs}ms LATENCY
          </span>
          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60 hidden xs:inline font-mono">
            • TLS/HMAC
          </span>
        </motion.div>

        {/* ── Tri-Orbit Conic Energy System + Levitating Hero Emblem ── */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-6 sm:mb-7">
          {/* Orbit 1: Outer Continuous Rotating Conic Energy Ring */}
          <div
            className="absolute inset-0 rounded-full border-[2.5px] border-transparent animate-spin"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(245, 158, 11, 0.85) 40%, rgba(254, 240, 138, 1) 68%, rgba(251, 191, 36, 0.95) 85%, transparent 100%) border-box",
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animationDuration: "3.2s",
            }}
          />

          {/* Orbit 2: Middle Counter-Rotating Dotted Constellation Ring */}
          <div
            className="absolute inset-3.5 sm:inset-4 rounded-full border-2 border-dotted border-amber-500/40 dark:border-amber-400/40 animate-spin"
            style={{
              animationDirection: "reverse",
              animationDuration: "7.2s",
            }}
          />

          {/* Orbit 3: Innermost Breathing Resonant Glow Ring */}
          <motion.div
            className="absolute inset-7 sm:inset-8 rounded-full border border-amber-400/50 dark:border-yellow-300/45 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
            animate={{
              scale: [0.94, 1.05, 0.94],
              opacity: [0.35, 0.75, 0.35],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Ambient Golden Floor Reflection Halo */}
          <div className="absolute w-28 h-28 rounded-full bg-amber-500/20 dark:bg-amber-400/15 blur-xl pointer-events-none" />

          {/* Levitating Centerpiece Hero Emblem */}
          <motion.div
            className="relative z-20 flex items-center justify-center"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="p-3.5 sm:p-4 rounded-[26px] sm:rounded-[30px] bg-gradient-to-b from-white/95 via-amber-50/80 to-amber-100/90 dark:from-[#18233C] dark:via-[#10182A] dark:to-[#0A0F1D] border border-amber-400/50 dark:border-amber-500/40 shadow-[0_16px_36px_-6px_rgba(217,119,6,0.3)] dark:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85)] backdrop-blur-md">
              <BhalyamLogo size={76} decorative shadow />
            </div>
          </motion.div>
        </div>

        {/* ── Dynamic Cycling Lounge Status Line ── */}
        <div className="h-8 mb-4 flex items-center justify-center px-4 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={NARRATIVE_STEPS[stepIndex]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold text-[#5C4530] dark:text-amber-200"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>{NARRATIVE_STEPS[stepIndex]}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Shimmering Gold Progress Track ── */}
        <div className="w-64 sm:w-80 max-w-[82vw] mb-6 sm:mb-7">
          <div className="h-2 sm:h-2.5 w-full bg-amber-500/15 dark:bg-black/40 rounded-full overflow-hidden border border-amber-500/30 p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] relative">
            <div
              className="h-full w-2/5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 rounded-full relative overflow-hidden shadow-xs"
              style={{
                animation: "indeterminate-slide 1.6s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite",
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{
                  animation: "shimmerSweep 1.4s infinite linear",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── VIP Private Table Pass (3D Neomorphic Key Tiles) ── */}
        {code && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full max-w-sm px-2 flex flex-col items-center"
          >
            {/* VIP Pass Header Pill */}
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-amber-400/60" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400/90">
                ✦ PRIVATE TABLE PASS ✦
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-amber-400/60" />
            </div>

            {/* 6 Tactile Golden Beveled Key Tiles */}
            <div
              onClick={handleCopyCode}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopyCode();
                }
              }}
              title="Click to copy room code"
              className="group cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-amber-50/60 dark:bg-[#0D1424]/80 border border-amber-300/70 dark:border-amber-500/30 shadow-[0_4px_16px_rgba(217,119,6,0.1)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {codeChars.map((ch, i) => (
                <div
                  key={i}
                  className="w-9 h-12 sm:w-11 sm:h-14 flex items-center justify-center rounded-xl bg-gradient-to-b from-white via-amber-50/90 to-amber-100/80 dark:from-[#1E293B] dark:via-[#131B2A] dark:to-[#0B101D] border border-amber-300/80 dark:border-amber-400/35 shadow-[0_3px_8px_rgba(217,119,6,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(251,191,36,0.2)] transition-transform group-hover:-translate-y-0.5"
                >
                  <span className="font-mono text-xl sm:text-2xl font-black text-[#2A231C] dark:text-amber-100 tracking-tight">
                    {ch}
                  </span>
                </div>
              ))}
            </div>

            {/* Tap to Copy Prompt & Quick Feedback Badge */}
            <div className="mt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[32px] cursor-pointer"
              >
                {copied ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold animate-fade-in">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied to Clipboard!</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Click code to copy</span>
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Layer 4: Taking Long Cold-Start Recovery Card (Grace Period > 10s) ── */}
        <AnimatePresence>
          {takingLong && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-6 sm:mt-7 w-full max-w-sm mx-auto space-y-3 bg-gradient-to-b from-amber-100/90 to-amber-50/90 dark:from-[#1E2738]/95 dark:to-[#131B2A]/95 border border-amber-300/80 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(217,119,6,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md"
            >
              <div className="flex items-start gap-2.5 text-left">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-xs text-[#6A533E] dark:text-slate-300 font-medium leading-relaxed">
                  Connecting is taking longer than usual — the game server may be waking up from cold sleep or your network is slow.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-white shadow-[0_4px_14px_rgba(217,119,6,0.35)] transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Retry Connection</span>
                </button>
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800/90 text-[#6C5A48] dark:text-slate-200 border border-amber-300/80 dark:border-slate-700 hover:bg-amber-50/50 dark:hover:bg-slate-700/80 active:scale-95 transition cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Return to Lounge
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global CSS keyframes for indeterminate slide & shimmer sweep */}
      <style>{`
        @keyframes indeterminate-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(250%); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
