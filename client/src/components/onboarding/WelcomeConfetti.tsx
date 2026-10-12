import { useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { scaledCount } from "../../lib/deviceTier";
import { spread } from "../faucet/CoinRain";

/** Above the welcome dialog (70), below the coin rain (80). */
const CONFETTI_Z = 75;
const PIECE_COUNT = 48;

/** BHALYAM's own palette: gold, orange, maroon, mint, cream, and a rose for contrast. */
const COLORS = ["#F5B72E", "#FF8F00", "#E4B128", "#C2410C", "#34D399", "#F7E8C4", "#FB7185"] as const;

interface Piece {
  left: number;
  width: number;
  height: number;
  delay: number;
  fall: number;
  drift: number;
  spin: number;
  flutter: number;
  color: string;
  round: boolean;
}

function makePieces(): Piece[] {
  return Array.from({ length: scaledCount(PIECE_COUNT) }, (_, i) => ({
    left: spread(i, 11) * 100,
    width: 6 + Math.round(spread(i, 12) * 7),
    height: 10 + Math.round(spread(i, 13) * 10),
    delay: spread(i, 14) * 1.1,
    fall: 3.4 + spread(i, 15) * 2.2,
    drift: (spread(i, 16) - 0.5) * 180,
    spin: 360 + spread(i, 17) * 720,
    flutter: 0.45 + spread(i, 18) * 0.5,
    color: COLORS[i % COLORS.length],
    round: spread(i, 19) > 0.72,
  }));
}

/**
 * Paper confetti falling once across the whole screen when the welcome opens.
 *
 * Every piece is two transform-only animations — a fall with a sideways drift and a spin, and a
 * flutter that turns it edge-on like real paper — so it stays on the compositor and is smooth on a
 * mid-range phone. It ignores pointer events so nothing underneath is blocked, and with reduced
 * motion it renders nothing: the dialog says everything in words.
 */
export function WelcomeConfetti() {
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(makePieces, []);

  if (reduceMotion) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="welcome-confetti"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: CONFETTI_Z }}
    >
      <style>{`
        @keyframes welcome-confetti-fall {
          0% { transform: translate3d(0, -8vh, 0) rotate(0deg); opacity: 0; }
          6% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translate3d(var(--confetti-drift), 108vh, 0) rotate(var(--confetti-spin)); opacity: 0; }
        }
        @keyframes welcome-confetti-flutter {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.2); }
        }
      `}</style>
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute top-0 block will-change-transform"
          style={
            {
              left: `${piece.left}%`,
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-spin": `${piece.spin}deg`,
              animation: `welcome-confetti-fall ${piece.fall}s cubic-bezier(0.3, 0.1, 0.6, 1) ${piece.delay}s both`,
            } as CSSProperties
          }
        >
          <span
            className="block"
            style={{
              width: piece.width,
              height: piece.height,
              background: piece.color,
              borderRadius: piece.round ? "50%" : 2,
              animation: `welcome-confetti-flutter ${piece.flutter}s ease-in-out ${piece.delay}s infinite`,
            }}
          />
        </span>
      ))}
    </div>,
    document.body,
  );
}

export default WelcomeConfetti;
