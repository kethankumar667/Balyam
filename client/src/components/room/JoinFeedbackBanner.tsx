import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bot, UserCheck, X } from "lucide-react";
import type { JoinEvent } from "../../hooks/useJoinAnimationTracker";
import SeatAvatar from "../profile/SeatAvatar";

export interface JoinFeedbackBannerProps {
  joins: JoinEvent[];
  onDismiss: (id: string) => void;
  className?: string;
  /** True when a higher-priority connection/recovery banner is showing at
   *  the top of the viewport; shifts this banner down so it never renders
   *  underneath that banner's opaque bar. */
  hasCriticalBannerAbove?: boolean;
}

/**
 * Premium floating feedback banner for human player and bot join events.
 *
 * Sequence:
 * - Human: Avatar slide-in (spring curve) -> emerald-gold glow pulse -> "Player Joined" badge.
 * - Bot: Avatar scale-in -> cyber cyan-violet glow -> "AI Bot Added" badge.
 *
 * Announced via a single controlled `aria-live="polite"` region on the
 * container (not one per card) so a burst of joins produces one bounded
 * announcement instead of several overlapping ones.
 * Respects `prefers-reduced-motion`.
 */
export const JoinFeedbackBanner: React.FC<JoinFeedbackBannerProps> = ({
  joins,
  onDismiss,
  className = "",
  hasCriticalBannerAbove = false,
}) => {
  const reduceMotion = useReducedMotion();

  if (joins.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Table join notifications"
      className={`fixed right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-sm transition-[top] duration-200 ${
        hasCriticalBannerAbove ? "top-14" : "top-4"
      } ${className}`}
    >
      <AnimatePresence>
        {joins.map((evt) => {
          const isBot = evt.isBot;

          return (
            <motion.div
              key={evt.id}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : isBot
                  ? { opacity: 0, scale: 0.85, y: -8 }
                  : { opacity: 0, x: 40, scale: 0.95 }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : isBot
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 1, x: 0, scale: 1 }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: 24, scale: 0.9 }
              }
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
              }}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
                isBot
                  ? "bg-slate-900/90 dark:bg-slate-950/95 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] text-cyan-100"
                  : "bg-[#FFFDF8]/95 dark:bg-[#151D2C]/95 border-emerald-400/80 dark:border-emerald-500/70 shadow-[0_0_22px_rgba(16,185,129,0.25)] text-[#2B3550] dark:text-slate-100"
              }`}
            >
              {/* Left: Avatar + Details */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <SeatAvatar
                    avatar={evt.avatar}
                    name={evt.name}
                    className={`w-9 h-9 rounded-xl ${
                      isBot
                        ? "ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        : "ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    }`}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                      isBot ? "bg-cyan-400" : "bg-emerald-500"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold truncate">
                      {evt.name}
                    </span>
                    {isBot ? (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-0.5 shrink-0">
                        <Bot size={11} aria-hidden />
                        <span>AI</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-0.5 shrink-0">
                        <UserCheck size={11} aria-hidden />
                        <span>Player</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium opacity-80 mt-0.5">
                    {isBot ? "Joined as AI participant" : "Joined the table"}
                  </p>
                </div>
              </div>

              {/* Right: Dismiss button */}
              <button
                type="button"
                onClick={() => onDismiss(evt.id)}
                aria-label={`Dismiss notification for ${evt.name}`}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer shrink-0"
              >
                <X size={14} aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default JoinFeedbackBanner;
