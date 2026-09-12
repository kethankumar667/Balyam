import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HcInnings, HcState } from "@shared/types";
import { useSkin } from "../skin";
import { HC_THEMES } from "./hc-theme-definitions";

export interface HcTensionHudProps {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  compact?: boolean;
}

export type TensionLevel = "calm" | "moderate" | "high" | "extreme";

export default function HcTensionHud({
  state: _state,
  innings,
  target,
  compact = false,
}: HcTensionHudProps) {
  const [skin] = useSkin();
  const theme = HC_THEMES[skin] ?? HC_THEMES.broadcast;

  const totalBalls = innings.overs * 6;
  const ballsLeft = Math.max(0, totalBalls - innings.balls);
  const runsNeeded = target != null ? Math.max(0, target - innings.runs) : null;
  const wicketsLeft = 10 - innings.wickets;

  // Detect tension metrics
  const tensionInfo = useMemo(() => {
    const is2ndInnings = innings.number === 2;
    const isLastOver = ballsLeft > 0 && ballsLeft <= 6;
    const isPenultimateOver = ballsLeft > 6 && ballsLeft <= 12;

    // Check for hat-trick chance (last 2 balls in history are wickets)
    const history = innings.history;
    const isHatTrickBall =
      history.length >= 2 &&
      history[history.length - 1].wicket &&
      history[history.length - 2].wicket;

    // Match point: 1 or 2 runs needed, or 1 wicket left for bowling team
    const isMatchPoint =
      is2ndInnings && runsNeeded != null && (runsNeeded <= 2 || wicketsLeft === 1);

    let level: TensionLevel = "calm";
    let bannerText: string | null = null;
    let pulseColor: string = theme.headerAccent;

    if (isHatTrickBall) {
      level = "extreme";
      bannerText = "⚡ HAT-TRICK DELIVERY!";
      pulseColor = "#EF4444";
    } else if (isMatchPoint) {
      level = "extreme";
      bannerText = runsNeeded != null && runsNeeded <= 2
        ? `🔥 MATCH POINT • ${runsNeeded} RUN${runsNeeded === 1 ? "" : "S"} TO WIN`
        : "🔥 FINAL WICKET • MATCH ON THE LINE!";
      pulseColor = "#EF4444";
    } else if (isLastOver) {
      level = is2ndInnings ? "extreme" : "high";
      bannerText = is2ndInnings && runsNeeded != null
        ? `⚡ FINAL OVER • ${runsNeeded} RUNS OFF ${ballsLeft} BALLS`
        : `⚡ FINAL OVER • ${ballsLeft} BALLS REMAINING`;
      pulseColor = theme.headerAccent;
    } else if (isPenultimateOver && is2ndInnings && runsNeeded != null && runsNeeded <= 24) {
      level = "high";
      bannerText = `🔥 TIGHT CHASE • ${runsNeeded} NEEDED OFF ${ballsLeft} BALLS`;
      pulseColor = theme.headerAccent;
    } else if (is2ndInnings && runsNeeded != null && runsNeeded <= 12 && ballsLeft <= 18) {
      level = "high";
      bannerText = `⚡ PRESSURE ON • ${runsNeeded} RUNS TO WIN`;
      pulseColor = theme.headerAccent;
    } else if (wicketsLeft <= 2 && ballsLeft > 6) {
      level = "moderate";
      bannerText = `⚠️ ONLY ${wicketsLeft} WICKETS REMAINING`;
      pulseColor = "#F59E0B";
    }

    return {
      level,
      bannerText,
      pulseColor,
      isLastOver,
      isMatchPoint,
      isHatTrickBall,
    };
  }, [innings.number, innings.history, ballsLeft, runsNeeded, wicketsLeft, theme.headerAccent]);

  if (tensionInfo.level === "calm" && !tensionInfo.bannerText) {
    return null;
  }

  const isExtreme = tensionInfo.level === "extreme";

  return (
    <div className="relative w-full my-1.5">
      {/* Ambient Pulsing Edge Glow for High & Extreme Tension */}
      {(tensionInfo.level === "high" || tensionInfo.level === "extreme") && (
        <motion.div
          animate={{
            opacity: isExtreme ? [0.35, 0.85, 0.35] : [0.2, 0.55, 0.2],
            scale: isExtreme ? [0.99, 1.01, 0.99] : [1, 1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: isExtreme ? 0.9 : 1.4,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -inset-1 rounded-xl -z-10"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${tensionInfo.pulseColor}33, transparent 75%)`,
            filter: "blur(6px)",
          }}
        />
      )}

      {/* Tension Banner Strip */}
      <AnimatePresence>
        {tensionInfo.bannerText && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 ${
              compact ? "text-[11px]" : "text-xs"
            } font-black uppercase tracking-wider shadow-lg overflow-hidden`}
            style={{
              background: isExtreme
                ? "linear-gradient(90deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.40) 50%, rgba(239,68,68,0.25) 100%)"
                : `linear-gradient(90deg, ${theme.headerAccent}22 0%, ${theme.headerAccent}44 50%, ${theme.headerAccent}22 100%)`,
              border: isExtreme ? "1.5px solid #EF4444" : `1.5px solid ${theme.headerAccent}`,
              color: isExtreme ? "#FCA5A5" : "#FEF08A",
              fontFamily: theme.fontHeading,
              boxShadow: isExtreme
                ? "0 0 20px rgba(239,68,68,0.45)"
                : `0 0 16px ${theme.headerAccent}33`,
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: isExtreme ? 0.6 : 1.1 }}
                className="shrink-0"
              >
                {isExtreme ? "🔥" : "⚡"}
              </motion.span>
              <span className="truncate">{tensionInfo.bannerText}</span>
            </div>

            {/* Tension Meter Indicator Badge */}
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black"
              style={{
                background: isExtreme ? "#EF4444" : theme.headerAccent,
              }}
            >
              {isExtreme ? "CRITICAL" : "PRESSURE"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
