import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, type LucideIcon } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FancyLockIcon } from "../../design-system/icons";
import AppLayout from "../layout/AppLayout";
import { HapticsManager } from "../../services/HapticsManager";

interface ComingSoonGateProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  iconBgGradient?: string;
  accentColor?: string;
  features?: string[];
}

export default function ComingSoonGate({
  title,
  subtitle,
  description,
  icon: FeatureIcon,
  iconBgGradient = "from-amber-500 to-amber-600",
  accentColor = "text-amber-400",
  features = [],
}: ComingSoonGateProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-200, 200], [8, -8]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-200, 200], [-8, 8]), { stiffness: 220, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClickAction = () => {
    HapticsManager.getInstance().subtle();
  };

  return (
    <AppLayout>
      <div
        className="min-h-[85vh] py-8 sm:py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center select-none overflow-hidden"
        style={{ perspective: 1200 }}
      >
        {/* Ambient Backlight Aura */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.16) 0%, rgba(251, 191, 36, 0.05) 40%, transparent 75%)",
          }}
        />

        <div className="max-w-2xl w-full mx-auto">
          {/* Main 3D Tilt Chamber */}
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-amber-400/50 via-amber-200/20 to-amber-500/30 dark:from-amber-500/30 dark:via-slate-800/50 dark:to-amber-500/20 shadow-[0_25px_60px_-15px_rgba(217,119,6,0.3)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] border border-amber-300/80 dark:border-amber-400/30"
          >
            {/* Inner Frosted Glass Chamber Core */}
            <div
              className="rounded-[22px] bg-gradient-to-b from-white/95 via-amber-50/90 to-[#F9F4E8]/95 dark:from-[#151D2F]/95 dark:via-[#101726]/95 dark:to-[#0B101D]/98 p-6 sm:p-10 text-center space-y-6 border border-white/60 dark:border-slate-700/60 backdrop-blur-xl shadow-inner"
              style={{ transform: "translateZ(25px)" }}
            >
              {/* Floating 3D Holographic Vault Emblem */}
              <div className="flex justify-center" style={{ transform: "translateZ(60px)" }}>
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotateZ: [-2, 2, -2],
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative"
                >
                  {/* Dynamic Floor Shadow */}
                  <div className="absolute -bottom-3 inset-x-2 h-4 rounded-full bg-amber-950/25 dark:bg-black/60 blur-xs" />

                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr ${iconBgGradient} p-1 shadow-[0_12px_32px_rgba(245,158,11,0.4)] border border-amber-300/80 dark:border-amber-400/40 flex items-center justify-center`}
                  >
                    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-[20px] flex items-center justify-center relative shadow-inner">
                      <FeatureIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${accentColor}`} />
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center shadow-lg border-2 border-amber-400 p-1">
                        <FancyLockIcon size={14} glow />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Header & Typography */}
              <div className="space-y-2.5 max-w-lg mx-auto" style={{ transform: "translateZ(35px)" }}>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-[11px] font-black font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <FancyLockIcon size={13} glow />
                  <span>Vault Sealed • In Development</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-slate-900 dark:text-amber-100 tracking-tight">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {subtitle}
                </p>
                <p className="text-xs sm:text-sm text-[#6E5E4D] dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                  {description}
                </p>
              </div>

              {/* 3D Extruded Planned Features Grid */}
              {features.length > 0 && (
                <div
                  className="bg-amber-100/60 dark:bg-black/40 border border-amber-300/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-xs"
                  style={{ transform: "translateZ(40px)" }}
                >
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                    <span>Upcoming Vault Features:</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-[#182236]/90 border border-amber-200/70 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-bold shadow-xs transition hover:-translate-y-0.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3D Physical Extruded Action CTA */}
              <div className="pt-2 flex items-center justify-center" style={{ transform: "translateZ(50px)" }}>
                <Link
                  to="/games"
                  onClick={handleClickAction}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 border-t border-amber-300/60 border-b-[4px] border-[#9A3412] hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] text-white font-black px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all shadow-[0_6px_16px_rgba(217,119,6,0.35)] min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[3]" />
                  <span>Explore Active Lounge Games</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
