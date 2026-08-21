import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireComicDustBurst, fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

export type RpsClashKind = "crush" | "cut" | "cover" | "draw" | "win" | "lose";

/**
 * Rock Paper Scissors — Clash & Recoil Animation.
 */
export function RpsClashOverlay({
  kind,
  message,
  onComplete,
}: {
  kind: RpsClashKind;
  message?: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    if (kind === "draw") {
      fireComicDustBurst({ left: "50%", top: "45%" }, { intensity: 0.7 });
    } else {
      fireStarSparkleBurst({ left: "50%", top: "45%" }, { intensity: 0.9 });
    }
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [kind, onComplete]);

  const text =
    kind === "crush"
      ? "CRUSH!"
      : kind === "cut"
      ? "CUT!"
      : kind === "cover"
      ? "COVER!"
      : kind === "draw"
      ? "DRAW!"
      : kind === "win"
      ? "WIN!"
      : "OUCH!";

  const accent =
    kind === "draw"
      ? "#374151"
      : kind === "lose"
      ? "#881337"
      : "#15803D";

  const fill =
    kind === "draw"
      ? "#E5E7EB"
      : kind === "lose"
      ? "#FECDD3"
      : "#BBF7D0";

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: kind === "draw" ? 0 : -12 }}
        animate={{
          scale: [0, 1.35, 1],
          rotate: kind === "draw" ? [0, 0, 0] : [-12, 6, 0],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="text-5xl">
          {kind === "crush" ? "🪨 💥" : kind === "cut" ? "✂️ ⚡" : kind === "cover" ? "📜 ✨" : kind === "draw" ? "🤝 🔄" : "🥊 🔥"}
        </div>
        <ComicBurstText text={text} accent={accent} fill={fill} seed={17} />
        {message && (
          <div
            className="px-3.5 py-1 rounded-full text-xs font-black text-white shadow-xl tracking-wider uppercase"
            style={{ background: accent }}
          >
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Rock Paper Scissors — L4 Match Winner Celebration.
 */
export function RpsWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.95 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation.
    let burstCount = 0;
    const maxBursts = 6;
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.75 });
      burstCount += 1;
      if (burstCount >= maxBursts) clearInterval(interval);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black"
      />

      <motion.div
        initial={{ scale: 0, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "backOut" }}
        className="relative flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 1.6, repeat: 5, ease: "easeInOut" }}
          className="text-8xl drop-shadow-2xl"
        >
          👑
        </motion.div>

        <ComicBurstText text="RPS CHAMPION!" accent="#1E293B" fill="#FDE047" seed={29} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(96,165,250,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-blue-200 font-bold">
            Match Winner
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight mt-0.5">
            {winnerName}
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.1, repeat: 7 }}
          className="text-2xl mt-1 flex gap-2"
        >
          <span>🪨</span>
          <span>📜</span>
          <span>🏆</span>
          <span>✂️</span>
          <span>✨</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
