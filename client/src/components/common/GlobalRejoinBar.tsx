import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, ArrowRight, X, Sparkles } from "lucide-react";
import { useRoomStore } from "../../store/roomStore";
import { getActiveSession } from "../../core/recovery/recoveryStorage";
import { BHALYAM_GAMES } from "../bhalyam/data";
import { bhalyamSpring } from "../../lib/motion";

export default function GlobalRejoinBar() {
  const location = useLocation();
  const roomState = useRoomStore((s) => s.roomState);
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);

  // Check if we have an in-memory active room or a saved recovery session
  const saved = getActiveSession();
  const activeRoomCode = roomState?.code || saved?.roomId || null;
  const activeGameKind = roomState?.game || null;

  const isInRoomPage = location.pathname.startsWith("/room/");
  const isDismissed = dismissedCode === activeRoomCode;

  // Find game display title
  const gameCard = activeGameKind
    ? BHALYAM_GAMES.find((g) => g.slug === activeGameKind)
    : null;
  const gameTitle = gameCard?.title || activeGameKind?.toUpperCase() || "Multiplayer Game";

  if (!activeRoomCode || isInRoomPage || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={bhalyamSpring}
        role="status"
        aria-live="polite"
        className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-xl w-full rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-amber-500/40 bg-gradient-to-r from-stone-900/95 via-amber-950/90 to-stone-900/95 text-white backdrop-blur-md flex items-center justify-between gap-3">
          {/* Left: Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
              <Gamepad2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-200 truncate">
                <span>Active Match in Progress</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </div>
              <div className="text-[11px] sm:text-xs text-stone-300 font-medium truncate">
                {gameTitle} · Room <span className="font-mono font-bold text-amber-300">#{activeRoomCode}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/room/${activeRoomCode}`}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-xs sm:text-sm hover:from-amber-400 hover:to-amber-500 active:scale-95 transition shadow-md cursor-pointer"
            >
              <span>Rejoin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setDismissedCode(activeRoomCode)}
              aria-label="Dismiss active match alert"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
