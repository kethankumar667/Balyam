import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PlayWay } from "./playWay";

/**
 * One drawn die, used twice: in the middle of the "Play together" table, and on
 * the "Roll to decide" button. Drawn rather than pictured so it can tumble and
 * land on a real face, and so it costs no image bytes.
 *
 * Reduced motion drops the tumble and the shuffling faces: the roll settles at
 * once, so nobody is made to watch an animation to get a result.
 */

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

/** How long a roll takes, and how often the shuffling face changes while it does. */
export const ROLL_MS = 900;
const SHUFFLE_MS = 90;

/** The seven pip places on a 40-unit face. */
const CELL = {
  tl: [12, 12],
  tr: [28, 12],
  ml: [12, 20],
  mr: [28, 20],
  bl: [12, 28],
  br: [28, 28],
  c: [20, 20],
} as const;

const PIPS: Record<DieFace, ReadonlyArray<keyof typeof CELL>> = {
  1: ["c"],
  2: ["tl", "br"],
  3: ["tl", "c", "br"],
  4: ["tl", "tr", "bl", "br"],
  5: ["tl", "tr", "c", "bl", "br"],
  6: ["tl", "tr", "ml", "mr", "bl", "br"],
};

export function randomFace(): DieFace {
  return (1 + Math.floor(Math.random() * 6)) as DieFace;
}

/**
 * The rule printed under "Roll to decide": even plays together, odd plays alone.
 * Exactly even odds, and said out loud, so the die is a game and not a trick.
 */
export function wayForFace(face: number): PlayWay {
  return face % 2 === 0 ? "friends" : "solo";
}

export function Die({
  face,
  tumbling,
  className = "",
}: {
  face: DieFace;
  /** True while a roll is in progress. */
  tumbling: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.svg
      data-die=""
      viewBox="0 0 40 40"
      focusable="false"
      aria-hidden="true"
      className={className}
      style={{ originX: 0.5, originY: 0.5 }}
      animate={tumbling && !reduceMotion ? { rotate: [0, 360], y: [0, -10, 0] } : { rotate: 0, y: 0 }}
      transition={{ duration: ROLL_MS / 1000, ease: "easeOut" }}
    >
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#FFFDF7" stroke="#C9B48F" strokeWidth="1.6" />
      <rect x="4.5" y="4.5" width="31" height="31" rx="7" fill="none" stroke="#E8D8B4" strokeWidth="1" />
      {PIPS[face].map((cell) => (
        <circle
          key={cell}
          data-pip=""
          cx={CELL[cell][0]}
          cy={CELL[cell][1]}
          r="3.3"
          // The single pip is red, as on the dice in a Ludo box.
          fill={face === 1 ? "#D63A2F" : "#1D2C4A"}
        />
      ))}
    </motion.svg>
  );
}

/**
 * Rolls a die: shuffles faces for `ROLL_MS`, then settles on `rollFace()`. The
 * settled value is what the caller acts on; the shuffling faces are only for
 * show. A second roll while one is running is ignored (it resolves `null`), so a
 * double tap cannot choose twice.
 *
 * `rollFace` is injectable so tests can pick the outcome.
 */
export function useDieRoller(rollFace: () => DieFace = randomFace) {
  const reduceMotion = useReducedMotion();
  const [face, setFace] = useState<DieFace>(5);
  const [rolling, setRolling] = useState(false);
  /** Counts finished starts, so a scene can restart its own animation per roll. */
  const [rolls, setRolls] = useState(0);
  const busy = useRef(false);
  const timers = useRef<{ shuffle?: number; settle?: number }>({});

  const clear = useCallback(() => {
    window.clearInterval(timers.current.shuffle);
    window.clearTimeout(timers.current.settle);
  }, []);

  useEffect(() => clear, [clear]);

  const roll = useCallback(
    (): Promise<DieFace | null> =>
      new Promise((resolve) => {
        if (busy.current) {
          resolve(null);
          return;
        }
        busy.current = true;
        setRolling(true);
        setRolls((n) => n + 1);

        const settle = () => {
          clear();
          const final = rollFace();
          setFace(final);
          setRolling(false);
          busy.current = false;
          resolve(final);
        };

        if (reduceMotion) {
          settle();
          return;
        }
        timers.current.shuffle = window.setInterval(() => setFace(randomFace()), SHUFFLE_MS);
        timers.current.settle = window.setTimeout(settle, ROLL_MS);
      }),
    [clear, reduceMotion, rollFace],
  );

  return { face, rolling, rolls, roll } as const;
}
