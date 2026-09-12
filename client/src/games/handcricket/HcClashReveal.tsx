import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HcBall } from "@shared/types";
import { PRO, ProLabel } from "../pro/pro-kit";
import { useSkin } from "../skin";
import { HC_THEMES } from "./hc-theme-definitions";
import { HapticsManager } from "../../services/HapticsManager";

export interface HcClashRevealProps {
  reveal: HcBall | null;
  meIsBatter: boolean;
  myPick: number | null;
  oppLockedIn: boolean;
  compact?: boolean;
}

export default function HcClashReveal({
  reveal,
  meIsBatter,
  myPick,
  oppLockedIn,
  compact = false,
}: HcClashRevealProps) {
  const [skin] = useSkin();
  const theme = HC_THEMES[skin] ?? HC_THEMES.broadcast;
  const plate = compact ? 52 : 68;

  // Track animation triggers on new reveal
  const [clashKey, setClashKey] = useState<number>(0);

  useEffect(() => {
    if (reveal) {
      setClashKey((k) => k + 1);
      if (reveal.wicket) {
        try {
          HapticsManager.getInstance().win();
        } catch {
          // ignore
        }
      } else if (reveal.isBoundary) {
        try {
          HapticsManager.getInstance().subtle();
        } catch {
          // ignore
        }
      }
    }
  }, [reveal?.overNumber, reveal?.ballInOver, reveal?.wicket, reveal?.runs]);

  if (reveal) {
    const mine = meIsBatter ? reveal.batterPick : reveal.bowlerPick;
    const theirs = meIsBatter ? reveal.bowlerPick : reveal.batterPick;
    const out = reveal.wicket;
    const isSix = reveal.runs === 6;
    const isFour = reveal.runs === 4;

    const myRoleLabel = meIsBatter ? "Bat (You)" : "Bowl (You)";
    const oppRoleLabel = meIsBatter ? "Bowler" : "Batter";

    const resultHeadline = out
      ? meIsBatter ? "OUT! WICKET" : "WICKET! BOWLED"
      : isSix
      ? "MAXIMUM 6!"
      : isFour
      ? "FOUR RUNS!"
      : reveal.runs === 0
      ? "DOT BALL"
      : `${reveal.runs} RUN${reveal.runs === 1 ? "" : "S"}`;

    const resultTone = out
      ? (meIsBatter ? PRO.loss : PRO.win)
      : reveal.isBoundary
      ? theme.headerAccent
      : PRO.ink;

    return (
      <div className={`relative flex flex-col items-center justify-center overflow-hidden ${compact ? "py-1" : "py-2"}`}>
        {/* Screen Shake Container for Wickets */}
        <motion.div
          key={clashKey}
          initial={{ x: out ? [0, -8, 8, -6, 6, -3, 3, 0] : 0, scale: 0.94 }}
          animate={{ x: 0, scale: 1 }}
          transition={{ duration: out ? 0.45 : 0.3, ease: "easeOut" }}
          className="relative flex flex-col items-center"
        >
          {/* Central Duel Collision Shockwave */}
          <AnimatePresence>
            <motion.div
              key={`shock-${clashKey}`}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: plate * 1.6,
                height: plate * 1.6,
                background: out
                  ? "radial-gradient(circle, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0) 70%)"
                  : isSix
                  ? `radial-gradient(circle, ${theme.headerAccent}99 0%, transparent 70%)`
                  : "radial-gradient(circle, rgba(90,169,240,0.5) 0%, transparent 70%)",
              }}
            />
          </AnimatePresence>

          {/* Duel Number Tiles */}
          <div className="relative flex items-center justify-center gap-3 sm:gap-6 z-10">
            {/* Batter / My Tile (Slides from left) */}
            <motion.div
              initial={{ x: -48, opacity: 0, scale: 0.7, rotate: -12 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="relative grid place-items-center rounded-2xl font-black tabular-nums shadow-lg"
                style={{
                  width: plate,
                  height: plate,
                  fontSize: Math.round(plate * 0.48),
                  fontFamily: theme.fontDigits,
                  background: `linear-gradient(145deg, ${PRO.info}33, ${PRO.info}12)`,
                  border: `2px solid ${PRO.info}`,
                  color: "#FFFFFF",
                  boxShadow: `0 0 20px ${PRO.info}44`,
                }}
              >
                {mine}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {myRoleLabel}
              </span>
            </motion.div>

            {/* VS Shock Impact Emblem */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.3, 1], rotate: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-black shadow-md z-20"
              style={{
                background: out ? "#EF4444" : theme.headerAccent,
                color: "#050B14",
                border: "2px solid rgba(255,255,255,0.85)",
              }}
            >
              {out ? "⚡" : "VS"}
            </motion.div>

            {/* Bowler / Opponent Tile (Slides from right) */}
            <motion.div
              initial={{ x: 48, opacity: 0, scale: 0.7, rotate: 12 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="relative grid place-items-center rounded-2xl font-black tabular-nums shadow-lg"
                style={{
                  width: plate,
                  height: plate,
                  fontSize: Math.round(plate * 0.48),
                  fontFamily: theme.fontDigits,
                  background: `linear-gradient(145deg, ${PRO.loss}33, ${PRO.loss}12)`,
                  border: `2px solid ${PRO.loss}`,
                  color: "#FFFFFF",
                  boxShadow: `0 0 20px ${PRO.loss}44`,
                }}
              >
                {theirs}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {oppRoleLabel}
              </span>
            </motion.div>
          </div>

          {/* Animated Wicket Stumps or Boundary Headline */}
          <div className="mt-2 flex flex-col items-center">
            {out ? (
              <motion.div
                initial={{ scale: 0.7, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 350 }}
                className="flex items-center gap-2"
              >
                {/* Broken Stumps SVG Graphic */}
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none" className="shrink-0">
                  <motion.rect
                    x="8" y="10" width="3.5" height="22" rx="1.5"
                    fill="#EF4444"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: -26, x: -3 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.rect
                    x="16" y="10" width="3.5" height="22" rx="1.5"
                    fill="#EF4444"
                    initial={{ y: 0 }}
                    animate={{ y: -4, rotate: 6 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.rect
                    x="24" y="10" width="3.5" height="22" rx="1.5"
                    fill="#EF4444"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 28, x: 3 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.rect
                    x="6" y="7" width="12" height="2.5" rx="1"
                    fill="#FDE047"
                    initial={{ y: 0, rotate: 0 }}
                    animate={{ y: -12, rotate: -45, x: -6 }}
                    transition={{ duration: 0.45 }}
                  />
                  <motion.rect
                    x="18" y="7" width="12" height="2.5" rx="1"
                    fill="#FDE047"
                    initial={{ y: 0, rotate: 0 }}
                    animate={{ y: -14, rotate: 55, x: 8 }}
                    transition={{ duration: 0.45 }}
                  />
                </svg>

                <span
                  className="font-black uppercase tracking-wider text-sm sm:text-base"
                  style={{
                    color: resultTone,
                    fontFamily: theme.fontHeading,
                    textShadow: "0 0 16px rgba(239,68,68,0.6)",
                  }}
                >
                  {resultHeadline}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, y: 6, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], y: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex items-center gap-1.5"
              >
                {isSix && <span className="text-amber-300 text-lg animate-bounce">🔥</span>}
                {isFour && <span className="text-orange-400 text-base">⚡</span>}
                <span
                  className="font-black uppercase tracking-wider text-sm sm:text-base"
                  style={{
                    color: resultTone,
                    fontFamily: theme.fontHeading,
                    textShadow: (isSix || isFour) ? `0 0 16px ${theme.headerAccent}88` : "none",
                  }}
                >
                  {resultHeadline}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Pre-reveal suspense / waiting state
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? "py-1" : "py-3"}`}>
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        {/* Your pick state */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="grid place-items-center rounded-2xl font-black tabular-nums shadow transition-all duration-200"
            style={{
              width: plate,
              height: plate,
              fontSize: Math.round(plate * 0.48),
              fontFamily: theme.fontDigits,
              background: myPick != null ? `${PRO.info}25` : "rgba(255,255,255,0.03)",
              border: myPick != null ? `2px solid ${PRO.info}` : "1px solid rgba(255,255,255,0.1)",
              color: myPick != null ? "#FFFFFF" : "rgba(255,255,255,0.3)",
              boxShadow: myPick != null ? `0 0 16px ${PRO.info}33` : "none",
            }}
          >
            {myPick != null ? myPick : "?"}
          </div>
          <ProLabel color={myPick != null ? PRO.info : PRO.inkLo}>
            {myPick != null ? "Locked In" : "Your Turn"}
          </ProLabel>
        </div>

        <span className="text-xs font-black text-slate-500">VS</span>

        {/* Opponent pick state */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="grid place-items-center rounded-2xl font-black tabular-nums shadow transition-all duration-200"
            style={{
              width: plate,
              height: plate,
              fontSize: Math.round(plate * 0.48),
              fontFamily: theme.fontDigits,
              background: oppLockedIn ? `${PRO.loss}25` : "rgba(255,255,255,0.03)",
              border: oppLockedIn ? `2px solid ${PRO.loss}` : "1px solid rgba(255,255,255,0.1)",
              color: oppLockedIn ? PRO.loss : "rgba(255,255,255,0.3)",
              boxShadow: oppLockedIn ? `0 0 16px ${PRO.loss}33` : "none",
            }}
          >
            {oppLockedIn ? "✓" : "•"}
          </div>
          <ProLabel color={oppLockedIn ? PRO.loss : PRO.inkLo}>
            {oppLockedIn ? "Ready" : "Thinking…"}
          </ProLabel>
        </div>
      </div>

      <div
        className="mt-2.5 text-[11px] font-extrabold uppercase tracking-widest"
        style={{ color: myPick == null ? theme.headerAccent : oppLockedIn ? PRO.win : PRO.inkLo }}
      >
        {myPick == null ? "⚡ Choose your delivery / shot" : oppLockedIn ? "🔥 Clashing delivery…" : "⏳ Waiting for opponent…"}
      </div>
    </div>
  );
}
