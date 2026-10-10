import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { GoldCoin, spread } from "./CoinRain";
import { isLowEndDevice, scaledCount } from "../../lib/deviceTier";
import { lighten, useFramePressure } from "../../hooks/useFramePressure";

/**
 * Three more celebrations in the coin family, each with its own motion so a player can tell by
 * the feel what happened before reading a word:
 *
 *   CoinFountain   the daily streak. Coins erupt from the bottom of the screen and arc up and over
 *                  like water, with ember sparks, so it reads as "your flame is burning".
 *   JoyBurst       a friend sent you coins. Coins and hearts burst outward from the middle and drift
 *                  down softly: warm, a little playful.
 *   RisingHearts   you sent a friend coins. Hearts float up and fade: a quiet thank-you, no coins,
 *                  because nothing arrived for you.
 *
 * All of them are transform and opacity only, sit above dialogs, ignore pointer events, remove
 * themselves when done, and render nothing under reduced motion (the words already say it).
 */

const DEFAULT_MS = 4_200;

/**
 * Calls `onDone` once after `ms` and reports when it is over, so a celebration removes itself even when
 * the caller passes no callback (the streak screen does not). The callback is read through a ref so the
 * timer is not restarted when the parent re-renders.
 */
function useDoneTimer(onDone: (() => void) | undefined, ms: number): boolean {
  const ref = useRef(onDone);
  ref.current = onDone;
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFinished(true);
      ref.current?.();
    }, ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return finished;
}

/** A drawn heart. Authored SVG, like the coin. */
export function Heart({ size = 20, color = "#E5566B", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 21.2s-7.6-4.7-9.7-9.3C.8 8.5 3 5 6.3 5c1.9 0 3.5 1 4.4 2.6C11.6 6 13.2 5 15 5c3.3 0 5.5 3.5 4 6.9-2.1 4.6-7 9.3-7 9.3z"
        fill={color}
      />
      <path d="M7 8.2c.8-.9 2-1.2 3-.7" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const HEART_COLORS = ["#E5566B", "#F29BB0", "#A8323C", "#F4B72E", "#FF8FA3"] as const;
const EMBER_COLORS = ["#FF8F00", "#FFD166", "#FF6B35", "#FFB347"] as const;

function Layer({ testId, zIndex, children }: { testId: string; zIndex: number; children: React.ReactNode }) {
  return createPortal(
    <div aria-hidden="true" data-testid={testId} className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex }}>
      {children}
    </div>,
    document.body,
  );
}

/* ═══════════════════════ The fountain (daily streak) ═══════════════════════ */

interface Spout {
  x: number;
  peak: number;
  delay: number;
  duration: number;
  size: number;
  flip: number;
}

const SPOUTS = 28;
const EMBERS = 24;

export function CoinFountain({ onDone, zIndex = 80 }: { onDone?: () => void; zIndex?: number }) {
  const reduceMotion = useReducedMotion();
  const finished = useDoneTimer(onDone, DEFAULT_MS);
  // A weak or struggling device skips the per-coin flip (the costliest effect) and keeps the arc.
  const pressured = useFramePressure();
  const lite = isLowEndDevice() || pressured;

  const spouts = useMemo<Spout[]>(
    () =>
      Array.from({ length: scaledCount(SPOUTS) }, (_, i) => {
        const side = spread(i, 11) < 0.5 ? -1 : 1;
        return {
          x: side * (6 + spread(i, 12) * 34), // vw to the left or right of centre
          peak: 38 + spread(i, 13) * 42, // vh it climbs before falling
          delay: (i % 6) * 0.16 + spread(i, 14) * 0.25, // arrives in pulses, like a fountain
          duration: 2.1 + spread(i, 15) * 1.0,
          size: 22 + Math.round(spread(i, 16) * 18),
          flip: 0.5 + spread(i, 17) * 0.5,
        };
      }),
    [],
  );
  const embers = useMemo(
    () =>
      Array.from({ length: scaledCount(EMBERS) }, (_, i) => ({
        x: (spread(i, 21) - 0.5) * 36, // vw
        rise: 45 + spread(i, 22) * 45, // vh
        delay: spread(i, 23) * 1.8,
        duration: 1.6 + spread(i, 24) * 1.4,
        size: 12 + Math.round(spread(i, 25) * 12),
        color: EMBER_COLORS[i % EMBER_COLORS.length],
      })),
    [],
  );

  if (reduceMotion || finished) return null;

  return (
    <Layer testId="coin-fountain" zIndex={zIndex}>
      <style>{`
        /* One element per coin along a precomputed arc: a parabola sampled at a few points (up and out fast, over the top,
           then gravity pulling it down), which costs one animated layer instead of the two a split x/y motion needs. */
        @keyframes fountain-arc {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          4% { opacity: 1; }
          10% { transform: translate3d(calc(var(--fx) * 0.10vw), calc(var(--fp) * -0.42vh), 0); }
          20% { transform: translate3d(calc(var(--fx) * 0.20vw), calc(var(--fp) * -0.726vh), 0); }
          30% { transform: translate3d(calc(var(--fx) * 0.30vw), calc(var(--fp) * -0.918vh), 0); }
          42% { transform: translate3d(calc(var(--fx) * 0.42vw), calc(var(--fp) * -1vh), 0); }
          55% { transform: translate3d(calc(var(--fx) * 0.55vw), calc(var(--fp) * -1vh + (var(--fp) + 14) * 0.0502vh), 0); }
          70% { transform: translate3d(calc(var(--fx) * 0.70vw), calc(var(--fp) * -1vh + (var(--fp) + 14) * 0.2333vh), 0); }
          85% { transform: translate3d(calc(var(--fx) * 0.85vw), calc(var(--fp) * -1vh + (var(--fp) + 14) * 0.549vh), 0); opacity: 1; }
          100% { transform: translate3d(calc(var(--fx) * 1vw), 14vh, 0); opacity: 0; }
        }
        @keyframes fountain-flip { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.14); } }
        @keyframes ember-rise {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 0.95; }
          100% { transform: translate3d(calc(var(--ex) * 1vw), calc(var(--er) * -1vh), 0) scale(0.25); opacity: 0; }
        }
        @keyframes fountain-glow { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>

      {/* The warmth at the base the coins come out of. */}
      <span
        className="absolute inset-x-0 bottom-0 block h-[38vh]"
        style={{
          background: "radial-gradient(ellipse 55% 100% at 50% 100%, rgba(255,143,0,0.5), rgba(255,143,0,0) 70%)",
          animation: "fountain-glow 3.2s ease-out both",
        }}
      />

      {lighten(embers, pressured).map((e, i) => (
        <span
          key={`e${i}`}
          className="absolute bottom-0 left-1/2 block rounded-full"
          style={
            {
              width: e.size,
              height: e.size,
              background: `radial-gradient(circle, ${e.color} 0%, ${e.color} 28%, transparent 68%)`,
              "--ex": e.x,
              "--er": e.rise,
              animation: `ember-rise ${e.duration}s ease-out ${e.delay}s both`,
            } as CSSProperties
          }
        />
      ))}

      {lighten(spouts, pressured).map((s, i) => (
        <span
          key={`c${i}`}
          className="absolute bottom-[-24px] left-1/2 block will-change-transform"
          style={{ "--fx": s.x, "--fp": s.peak, animation: `fountain-arc ${s.duration}s linear ${s.delay}s both` } as CSSProperties}
        >
          {lite ? (
            <GoldCoin size={s.size} />
          ) : (
            <span className="block" style={{ animation: `fountain-flip ${s.flip}s ease-in-out ${s.delay}s infinite` }}>
              <GoldCoin size={s.size} />
            </span>
          )}
        </span>
      ))}
    </Layer>
  );
}

/* ═══════════════════════ The joy burst (a friend sent coins) ═══════════════════════ */

interface Piece {
  kind: "coin" | "heart";
  dx: number;
  dy: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  sway: number;
}

const BURST_COINS = 10;
const BURST_HEARTS = 14;

function makePieces(): Piece[] {
  const coins = scaledCount(BURST_COINS);
  const total = coins + scaledCount(BURST_HEARTS);
  return Array.from({ length: total }, (_, i) => {
    const angle = (i / total) * Math.PI * 2 + spread(i, 31) * 0.5;
    const reach = 16 + spread(i, 32) * 26; // vmin the piece flies outward
    // Coins and hearts alternate around the circle, so neither clumps on one side.
    const isCoin = i % 2 === 0 && i / 2 < coins;
    return {
      kind: isCoin ? "coin" : "heart",
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach * 0.8 - 6,
      delay: spread(i, 33) * 0.35,
      duration: 2.6 + spread(i, 34) * 1.2,
      size: isCoin ? 20 + Math.round(spread(i, 35) * 14) : 18 + Math.round(spread(i, 36) * 18),
      color: HEART_COLORS[i % HEART_COLORS.length],
      sway: (spread(i, 37) - 0.5) * 14,
    };
  });
}

export function JoyBurst({ onDone, zIndex = 80 }: { onDone?: () => void; zIndex?: number }) {
  const reduceMotion = useReducedMotion();
  const finished = useDoneTimer(onDone, DEFAULT_MS);
  const pieces = useMemo(makePieces, []);
  const pressured = useFramePressure();
  const lite = isLowEndDevice() || pressured;

  if (reduceMotion || finished) return null;

  return (
    <Layer testId="joy-burst" zIndex={zIndex}>
      <style>{`
        @keyframes joy-fly {
          0% { transform: translate3d(0, 0, 0) scale(0.3) rotate(0deg); opacity: 0; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
          12% { opacity: 1; }
          38% { transform: translate3d(calc(var(--jx) * 1vmin), calc(var(--jy) * 1vmin), 0) scale(1) rotate(var(--jr)); animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
          85% { opacity: 1; }
          100% { transform: translate3d(calc(var(--jx) * 1.1vmin + var(--js) * 1vmin), calc(var(--jy) * 1vmin + 34vh), 0) scale(0.85) rotate(calc(var(--jr) * 1.6)); opacity: 0; }
        }
        @keyframes joy-flip { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.2); } }
      `}</style>
      {lighten(pieces, pressured).map((p, i) => (
        <span
          key={i}
          className="absolute block will-change-transform"
          style={
            {
              left: "50%",
              top: "34%",
              "--jx": p.dx,
              "--jy": p.dy,
              "--js": p.sway,
              "--jr": `${(spread(i, 38) - 0.5) * 80}deg`,
              animation: `joy-fly ${p.duration}s linear ${p.delay}s both`,
            } as CSSProperties
          }
        >
          {p.kind === "coin" ? (
            lite ? (
              <GoldCoin size={p.size} />
            ) : (
              <span className="block" style={{ animation: `joy-flip ${0.7 + spread(i, 39) * 0.5}s ease-in-out ${p.delay}s infinite` }}>
                <GoldCoin size={p.size} />
              </span>
            )
          ) : (
            <Heart size={p.size} color={p.color} />
          )}
        </span>
      ))}
    </Layer>
  );
}

/* ═══════════════════════ Rising hearts (you sent coins) ═══════════════════════ */

const HEARTS = 12;

export function RisingHearts({ onDone, zIndex = 80 }: { onDone?: () => void; zIndex?: number }) {
  const reduceMotion = useReducedMotion();
  const finished = useDoneTimer(onDone, DEFAULT_MS);
  const pressured = useFramePressure();
  const hearts = useMemo(
    () =>
      Array.from({ length: scaledCount(HEARTS) }, (_, i) => ({
        left: 8 + spread(i, 41) * 84,
        size: 18 + Math.round(spread(i, 42) * 22),
        delay: spread(i, 43) * 1.5,
        duration: 2.6 + spread(i, 44) * 1.4,
        sway: (spread(i, 45) - 0.5) * 12,
        color: HEART_COLORS[i % HEART_COLORS.length],
      })),
    [],
  );

  if (reduceMotion || finished) return null;

  return (
    <Layer testId="rising-hearts" zIndex={zIndex}>
      <style>{`
        @keyframes heart-rise {
          0% { transform: translate3d(0, 8vh, 0) scale(0.6); opacity: 0; }
          15% { opacity: 0.95; }
          100% { transform: translate3d(calc(var(--hs) * 1vw), -62vh, 0) scale(1.1); opacity: 0; }
        }
      `}</style>
      {lighten(hearts, pressured).map((h, i) => (
        <span
          key={i}
          className="absolute bottom-[8vh] block will-change-transform"
          style={{ left: `${h.left}%`, "--hs": h.sway, animation: `heart-rise ${h.duration}s ease-out ${h.delay}s both` } as CSSProperties}
        >
          <Heart size={h.size} color={h.color} />
        </span>
      ))}
    </Layer>
  );
}
