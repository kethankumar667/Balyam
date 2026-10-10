import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Modal from "../Modal";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import { spread } from "../faucet/CoinRain";
import { describeLevelUp } from "../../lib/levelUp";
import { scaledCount } from "../../lib/deviceTier";
import { lighten, useFramePressure } from "../../hooks/useFramePressure";
import { useLevelUpStore } from "../../store/levelUpStore";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

const MODAL_Z = 95;
/** When the old level hands over to the new one, once the badge has landed. */
const HANDOVER_MS = 750;
const STARS = 18;

/**
 * "Ascension": the screen after a real level-up.
 *
 * ── The idea ──────────────────────────────────────────────────────────
 * A level is a climb, so everything here goes UP. The badge lands in a burst of rings, stars rise off it,
 * the level number slides up like an odometer from the old level to the new one, and the progress bar
 * fills to full and then drops to the new level's real progress, so the player SEES the next climb begin.
 *
 * ── Motivation without pressure ───────────────────────────────────────
 * What moves a player to play on is a true, specific next step, so the card names the real XP still to
 * go, what a win and a played match are worth, and the next real reward and how far away it is. There is
 * no countdown, no streak to lose, and no number that is not the player's own. "Play a game" is an
 * offer and "Later" is as easy to press.
 *
 * Transform and opacity only, contained inside its own panel, and skipped under reduced motion (the
 * final level and progress are shown at once).
 */
export function LevelUpAscension() {
  const moment = useLevelUpStore((s) => s.moment);
  const clear = useLevelUpStore((s) => s.clear);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const playRef = useRef<HTMLButtonElement>(null);
  const [handedOver, setHandedOver] = useState(false);
  const pressured = useFramePressure();

  const view = useMemo(() => (moment ? describeLevelUp(moment.fromLevel, moment.toLevel, moment.totalXp) : null), [moment]);
  const stars = useMemo(
    () =>
      Array.from({ length: scaledCount(STARS) }, (_, i) => ({
        left: 8 + spread(i, 51) * 84,
        rise: 150 + spread(i, 52) * 130,
        size: 12 + Math.round(spread(i, 53) * 14),
        delay: 0.5 + spread(i, 54) * 2.2,
        duration: 2.4 + spread(i, 55) * 1.4,
        drift: (spread(i, 56) - 0.5) * 60,
      })),
    [],
  );

  useEffect(() => {
    if (!moment) return undefined;
    setHandedOver(!!reduceMotion);
    HapticsManager.trigger("win");
    AudioManager.play(AUDIO.REWARD_LEVEL_UP);
    if (reduceMotion) return undefined;
    const id = window.setTimeout(() => setHandedOver(true), HANDOVER_MS);
    return () => window.clearTimeout(id);
  }, [moment?.key, reduceMotion]);

  if (!moment || !view) return null;

  const shown = handedOver ? view.toLevel : view.fromLevel;
  const { tier } = view;
  const levelsLabel = view.toLevel - view.fromLevel > 1 ? `${view.toLevel - view.fromLevel} levels at once` : null;

  const play = () => {
    clear();
    navigate("/");
  };

  return (
    <Modal open onClose={clear} ariaLabelledBy="ascension-title" initialFocusRef={playRef} zIndex={MODAL_Z} panelClassName="w-full max-w-md">
      <style>{`
        @keyframes asc-ring { 0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.95; } 100% { transform: translate(-50%, -50%) scale(3); opacity: 0; } }
        @keyframes asc-rays { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes asc-star {
          0% { transform: translate3d(0, 0, 0) scale(0.4) rotate(0deg); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translate3d(var(--ad), calc(var(--ar) * -1px), 0) scale(1) rotate(160deg); opacity: 0; }
        }
      `}</style>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        style={{ background: `radial-gradient(ellipse 90% 60% at 50% 22%, ${tier.glowColor}55, #0B1020 70%)` }}
      >
        {/* The stage: light, rings and rising stars behind the badge. Contained, so nothing escapes the panel. */}
        <div className="relative h-60 overflow-hidden" aria-hidden="true">
          {!reduceMotion && (
            <>
              <span
                className="absolute left-1/2 top-[46%] block h-64 w-64 rounded-full"
                style={{ transform: "translate(-50%, -50%)", background: `radial-gradient(circle, ${tier.themeColor}66 0%, ${tier.themeColor}22 45%, transparent 70%)` }}
              />
              <span
                className="absolute left-1/2 top-[46%] block h-[150%] w-[150%] will-change-transform"
                style={{
                  transform: "translate(-50%, -50%)",
                  background: `repeating-conic-gradient(from 0deg, ${tier.themeColor}AA 0deg 5deg, transparent 5deg 22deg)`,
                  WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
                  maskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
                  animation: "asc-rays 36s linear infinite",
                }}
              />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-[46%] block h-44 w-44 rounded-full border-[3px] will-change-transform"
                  style={{ borderColor: tier.themeColor, animation: `asc-ring 1.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.28}s both` }}
                />
              ))}
              {lighten(stars, pressured).map((s, i) => (
                <span
                  key={i}
                  className="absolute bottom-6 block will-change-transform"
                  style={
                    {
                      left: `${s.left}%`,
                      "--ar": s.rise,
                      "--ad": `${s.drift}px`,
                      animation: `asc-star ${s.duration}s ease-out ${s.delay}s 4 both`,
                    } as CSSProperties
                  }
                >
                  <svg width={s.size} height={s.size} viewBox="0 0 10 10">
                    <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill={i % 3 === 0 ? "#FFF1A8" : tier.themeColor} />
                  </svg>
                </span>
              ))}
            </>
          )}

          <div className="absolute left-1/2 top-[46%]" style={{ transform: "translate(-50%, -50%) scale(1.5)" }}>
            <motion.div
              key={shown}
              initial={reduceMotion ? false : { scale: shown === view.fromLevel ? 0.2 : 0.8, rotate: shown === view.fromLevel ? -18 : 0, opacity: 0.6 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: shown === view.fromLevel ? 14 : 11 }}
            >
              <MiniclipLevelBadge level={shown} size="xl" showTooltip={false} />
            </motion.div>
          </div>
        </div>

        <div className="px-6 pb-2 text-center">
          <h2 id="ascension-title" className="m-0 flex items-center justify-center gap-2 text-white">
            <span className="text-lg font-bold text-white/80">Level</span>
            <span className="relative inline-block h-14 min-w-[3.5rem] overflow-hidden text-5xl font-black leading-[3.5rem] tabular-nums" style={{ color: tier.themeColor }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={shown}
                  className="absolute inset-x-0 top-0 block"
                  initial={reduceMotion ? false : { y: 44, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -44, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                >
                  {shown}
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>
          <p className="m-0 mt-1 text-base font-semibold text-white/85">{view.title}</p>
          {view.isNewTier && (
            <p className="m-0 mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${tier.themeColor}26`, color: tier.themeColor }}>
              Welcome to the {tier.name} tier
            </p>
          )}
          {levelsLabel && <p className="m-0 mt-2 text-xs font-semibold text-white/60">{levelsLabel}</p>}
        </div>

        {/* The climb begins again: the bar is full for the level just earned, then drops to real progress. */}
        <div className="px-6 pt-3">
          <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={view.xpPerLevel} aria-valuenow={view.xpIntoLevel} aria-label={`Progress to level ${view.toLevel + 1}`}>
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ background: `linear-gradient(90deg, ${tier.secondaryColor}, ${tier.themeColor})` }}
              initial={reduceMotion ? { width: `${view.progressPercent}%` } : { width: "100%" }}
              animate={{ width: `${view.progressPercent}%` }}
              transition={reduceMotion ? { duration: 0 } : { delay: 1.1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="m-0 mt-1.5 text-xs font-semibold text-white/70 tabular-nums">
            {view.xpIntoLevel} of {view.xpPerLevel} XP toward Level {view.toLevel + 1}
          </p>
        </div>

        <div className="mx-6 mt-4 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-sm leading-snug text-white/85">
          {view.unlockedCoins > 0 && (
            <p className="m-0">
              <strong className="text-amber-300">{view.unlockedCoins.toLocaleString()} coins</strong> of level rewards are ready. Claim them in your Level Roadmap.
            </p>
          )}
          <p className="m-0">
            {view.xpToNext} XP to your next level. A win earns {view.winXp} XP and every match you play earns {view.playXp}.
          </p>
          {view.next && (
            <p className="m-0">
              Next reward: <strong className="text-amber-300">{view.next.coins.toLocaleString()} coins</strong>
              {view.next.title ? ` and the title ${view.next.title}` : ""} at Level {view.next.level}, {view.next.levelsAway} {view.next.levelsAway === 1 ? "level" : "levels"} away.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <button
            ref={playRef}
            type="button"
            onClick={play}
            className="min-h-[52px] w-full cursor-pointer rounded-2xl px-6 text-base font-black text-[#1a0f00] shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020]"
            style={{ background: `linear-gradient(135deg, #FFE08A, ${tier.themeColor})` }}
          >
            Play a game
          </button>
          <button
            type="button"
            onClick={clear}
            className="min-h-[44px] w-full cursor-pointer rounded-2xl px-6 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Later
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LevelUpAscension;
