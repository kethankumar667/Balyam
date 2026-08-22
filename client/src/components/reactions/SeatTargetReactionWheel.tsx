import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GAME_REACTIONS, THROW_REACTIONS } from "@shared/reactions";
import { getSocket } from "../../lib/socket";

export interface SeatTargetReactionWheelProps {
  game: string;
  targetPlayerId: string;
  targetPlayerName?: string;
  onClose: () => void;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * Universal Drop-in Opponent Reaction Wheel.
 * Displays when a player taps any opponent avatar/card across Rummy, Ludo,
 * Hand Cricket, Snakes & Ladders, Bingo, Dots & Boxes, Chess, RPS, etc.
 * 
 * Shows the game's specific themed emojis (e.g. Rummy gets 🃏💰🍅, Chess gets ♟️👑🧠,
 * Hand Cricket gets 🏏🎯🔥, SNL gets 🐍🪜🎲) and lobs the reaction directly at that seat.
 */
export default function SeatTargetReactionWheel({
  game,
  targetPlayerId,
  targetPlayerName,
  onClose,
  position = "top",
  className = "",
}: SeatTargetReactionWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const emojis = GAME_REACTIONS[game] ?? THROW_REACTIONS;

  // Auto-close on click outside
  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    // Auto-dismiss after 4.5 seconds if untouched
    const autoDismiss = window.setTimeout(onClose, 4500);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(autoDismiss);
    };
  }, [onClose]);

  function handleSend(emoji: string) {
    getSocket().emit("room:reaction", {
      emoji,
      targetPlayerId,
    });
    // Haptic buzz if supported
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate?.(25);
      } catch {}
    }
    onClose();
  }

  // Positioning style based on placement
  const positionClasses = {
    top: "-top-14 left-1/2 -translate-x-1/2",
    bottom: "-bottom-14 left-1/2 -translate-x-1/2",
    left: "-left-48 top-1/2 -translate-y-1/2",
    right: "-right-48 top-1/2 -translate-y-1/2",
  }[position];

  return (
    <AnimatePresence>
      <motion.div
        ref={wheelRef}
        initial={{ opacity: 0, scale: 0.4, y: position === "top" ? 8 : -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.4 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className={`absolute z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-2xl ${positionClasses} ${className}`}
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "2px solid rgba(251, 191, 36, 0.85)",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(251, 191, 36, 0.3)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {emojis.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.35, y: -2 }}
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              handleSend(emoji);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 text-lg sm:text-xl flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors cursor-pointer select-none"
            title={targetPlayerName ? `Throw ${emoji} at ${targetPlayerName}` : `Throw ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
