import { useEffect, useId, useMemo, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";

/**
 * A single drawn gold coin: a lit disc, a milled rim and an embossed star. Authored SVG, so it
 * stays crisp from 18px in the rain to 140px as the hero of the claim dialog.
 */
export function GoldCoin({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Own gradient ids: when one coin unmounts, the others must not lose the fill it defined.
  const uid = useId().replace(/:/g, "");
  const face = `coin-face-${uid}`;
  const rim = `coin-rim-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={face} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF1A8" />
          <stop offset="45%" stopColor="#F4B72E" />
          <stop offset="100%" stopColor="#B96F0B" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE27A" />
          <stop offset="100%" stopColor="#9A5A06" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${rim})`} />
      <circle cx="32" cy="32" r="25.5" fill={`url(#${face})`} stroke="#8A5206" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="20.5" fill="none" stroke="#FFF1A8" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 2.4" />
      <path
        d="M32 17.5l4.2 8.6 9.5 1.35-6.9 6.7 1.65 9.45L32 38.9l-8.45 4.7 1.65-9.45-6.9-6.7 9.5-1.35z"
        fill="#B96F0B"
        fillOpacity="0.85"
        stroke="#FFF1A8"
        strokeOpacity="0.7"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** How long the rain lasts before it removes itself. */
export const COIN_RAIN_MS = 4_200;

const COIN_COUNT = 44;

/** A stable 0..1 value per (index, salt), so the rain looks scattered but never changes between renders. */
function spread(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Drop {
  left: number;
  size: number;
  delay: number;
  fall: number;
  drift: number;
  flip: number;
  spin: number;
}

function makeDrops(): Drop[] {
  return Array.from({ length: COIN_COUNT }, (_, i) => ({
    left: spread(i, 1) * 100,
    size: 20 + Math.round(spread(i, 2) * 24),
    delay: spread(i, 3) * 1.3,
    fall: 1.9 + spread(i, 4) * 1.5,
    drift: (spread(i, 5) - 0.5) * 90,
    flip: 0.55 + spread(i, 6) * 0.6,
    spin: (spread(i, 7) - 0.5) * 60,
  }));
}

/**
 * Coins pouring down the whole screen.
 *
 * Every coin is two transform-only animations (a fall with a sideways drift, and a flip that
 * squashes it edge-on like a spinning coin), so it stays on the compositor and is smooth on a
 * mid-range phone. It sits above every dialog, ignores pointer events so nothing underneath is
 * blocked, and removes itself after `COIN_RAIN_MS`. With reduced motion it renders nothing: the
 * dialog already says what happened in words.
 */
export function CoinRain({ onDone, zIndex = 80 }: { onDone?: () => void; /** Above the dialog it rains over; 80 clears the app's standard dialogs. */ zIndex?: number }) {
  const reduceMotion = useReducedMotion();
  const drops = useMemo(makeDrops, []);

  // The latest callback, without it being a dependency: the parent re-renders every second (the countdown),
  // and a timer that restarted on each render would never fire.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current?.(), COIN_RAIN_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (reduceMotion) return null;

  return createPortal(
    <div aria-hidden="true" data-testid="coin-rain" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex }}>
      <style>{`
        @keyframes coin-rain-fall {
          0% { transform: translate3d(0, -14vh, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--coin-drift), 112vh, 0) rotate(var(--coin-spin)); opacity: 0; }
        }
        @keyframes coin-rain-flip {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.12); }
        }
      `}</style>
      {drops.map((drop, i) => (
        <span
          key={i}
          className="absolute top-0 block will-change-transform"
          style={
            {
              left: `${drop.left}%`,
              "--coin-drift": `${drop.drift}px`,
              "--coin-spin": `${drop.spin}deg`,
              animation: `coin-rain-fall ${drop.fall}s cubic-bezier(0.4, 0, 0.9, 0.6) ${drop.delay}s both`,
            } as CSSProperties
          }
        >
          <span
            className="block will-change-transform"
            style={{ animation: `coin-rain-flip ${drop.flip}s ease-in-out ${drop.delay}s infinite` }}
          >
            <GoldCoin size={drop.size} />
          </span>
        </span>
      ))}
    </div>,
    document.body,
  );
}

export default CoinRain;
