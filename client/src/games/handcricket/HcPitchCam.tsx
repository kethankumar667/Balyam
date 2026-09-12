import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HcBall, HcInnings } from "@shared/types";
import { useSkin } from "../skin";
import { HC_THEMES } from "./hc-theme-definitions";
import { PRO } from "../pro/pro-kit";

export interface HcPitchCamProps {
  innings: HcInnings;
  reveal: HcBall | null;
  meIsBatter: boolean;
  myPick: number | null;
  oppLockedIn: boolean;
  compact?: boolean;
}

export default function HcPitchCam({
  innings: _innings,
  reveal,
  meIsBatter,
  myPick,
  oppLockedIn,
  compact = false,
}: HcPitchCamProps) {
  const [skin] = useSkin();
  const theme = HC_THEMES[skin] ?? HC_THEMES.broadcast;

  const height = compact ? 52 : 64;

  const isBowlerReady = meIsBatter ? oppLockedIn : myPick != null;
  const isBatterReady = meIsBatter ? myPick != null : oppLockedIn;

  // Track delivery outcome
  const deliveryStatus = useMemo(() => {
    if (!reveal) return null;
    return {
      wicket: reveal.wicket,
      isSix: reveal.runs === 6,
      isFour: reveal.runs === 4,
      runs: reveal.runs,
    };
  }, [reveal]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-inner my-1"
      style={{
        height,
        background: theme.creaseBg,
        border: `1px solid ${theme.creaseBorder}`,
      }}
    >
      {/* 2D Isometric Pitch Turf Strip */}
      <div
        className="absolute inset-x-8 inset-y-2 rounded-lg opacity-85"
        style={{
          background:
            skin === "arcade"
              ? "#182010"
              : skin === "gully"
              ? "#27272A"
              : skin === "neon"
              ? "linear-gradient(90deg, #091530 0%, #060B18 100%)"
              : skin === "nostalgia"
              ? "#EFE1B3"
              : "linear-gradient(90deg, #132A13 0%, #1B3B1B 50%, #132A13 100%)",
          border: `1px dashed ${theme.creaseBorder}`,
        }}
      >
        {/* Pitch Crease Lines */}
        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-white/40" />
        <div className="absolute right-6 top-0 bottom-0 w-[2px] bg-white/40" />
      </div>

      {/* Bowler End (Left) */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
        <motion.div
          animate={isBowlerReady ? { x: [0, 4, 0] } : {}}
          transition={{ repeat: isBowlerReady ? Infinity : 0, duration: 0.8 }}
          className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold shadow"
          style={{
            background: isBowlerReady ? theme.headerAccent : "rgba(255,255,255,0.1)",
            color: isBowlerReady ? "#050B14" : "#94A3B8",
            border: `1px solid ${isBowlerReady ? theme.headerAccent : "rgba(255,255,255,0.2)"}`,
          }}
          title="Bowler Crease"
        >
          🏏
        </motion.div>
        {/* Bowler Stumps */}
        <div className="flex gap-[2px] opacity-75">
          <div className="h-4 w-[2px] bg-amber-200" />
          <div className="h-4 w-[2px] bg-amber-200" />
          <div className="h-4 w-[2px] bg-amber-200" />
        </div>
      </div>

      {/* Animated Ball Delivery Action */}
      <AnimatePresence>
        {deliveryStatus && (
          <motion.div
            key={reveal?.ballInOver ?? 0}
            initial={{ left: "14%", top: "50%", scale: 0.8, opacity: 1 }}
            animate={
              deliveryStatus.wicket
                ? { left: "86%", top: ["50%", "30%", "50%"], scale: 1.1 }
                : deliveryStatus.isSix
                ? { left: "98%", top: ["50%", "-10%", "-40%"], scale: [1, 1.4, 0.6] }
                : deliveryStatus.isFour
                ? { left: "98%", top: ["50%", "70%", "50%"], scale: 1 }
                : { left: "84%", top: "50%", scale: 0.9 }
            }
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
          >
            <div
              className="h-3 w-3 rounded-full shadow-lg"
              style={{
                background: deliveryStatus.wicket
                  ? "#EF4444"
                  : deliveryStatus.isSix
                  ? theme.headerAccent
                  : "#DC2626",
                boxShadow: deliveryStatus.isSix
                  ? `0 0 12px ${theme.headerAccent}`
                  : "0 0 8px rgba(220,38,38,0.7)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batter End (Right) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
        {/* Striker Stumps */}
        <div className="flex gap-[2px] opacity-75">
          <div className="h-4 w-[2px] bg-amber-200" />
          <div className="h-4 w-[2px] bg-amber-200" />
          <div className="h-4 w-[2px] bg-amber-200" />
        </div>
        <motion.div
          animate={isBatterReady ? { y: [-1, 2, -1] } : {}}
          transition={{ repeat: isBatterReady ? Infinity : 0, duration: 0.9 }}
          className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold shadow"
          style={{
            background: isBatterReady ? PRO.win : "rgba(255,255,255,0.1)",
            color: isBatterReady ? "#050B14" : "#94A3B8",
            border: `1px solid ${isBatterReady ? PRO.win : "rgba(255,255,255,0.2)"}`,
          }}
          title="Striker Crease"
        >
          🛡️
        </motion.div>
      </div>
    </div>
  );
}
