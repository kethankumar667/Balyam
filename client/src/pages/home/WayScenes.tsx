import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Die, ROLL_MS, useDieRoller } from "./Die";
import { Pawn } from "./Pawn";

/**
 * The two drawn scenes on the way cards, built to feel like somebody is waiting
 * for you, not like a diagram of a game.
 *
 * ── Play together: a table with a seat saved for you ──────────────────
 * Four smiling people sit round a game table (the app's own avatar characters,
 * so players meet familiar faces) and one seat is left empty, dashed, for you.
 * Choose the box and your gold pawn takes that seat; the others cheer, with hearts
 * rising from each. Between visits the table keeps taking turns: the die rolls
 * and each friend bounces and sends up a heart in order.
 *
 * ── Play alone: a quiet corner ────────────────────────────────────────
 * A glass of chai, steaming, beside the handheld (see `WayArt`).
 *
 * Both scenes follow one rule: they move when it matters (hovered or chosen, and
 * once as they scroll into view) and rest otherwise. Nothing loops forever on its
 * own. Reduced motion shows them still and draws no hearts.
 */

/** A seat the player's pawn can stand in. Dashed while empty, so an empty seat still reads as saved for someone. */
export function SeatRing({
  occupied,
  ringColor,
  fillClass = "",
  className = "",
}: {
  occupied: boolean;
  ringColor: string;
  fillClass?: string;
  className?: string;
}) {
  return (
    <span data-seat="" className={`relative block ${className}`}>
      <span
        className={`absolute inset-0 rounded-full border-2 border-dashed transition-opacity duration-200 ${fillClass} ${
          occupied ? "opacity-0" : "opacity-100"
        }`}
        style={{ borderColor: ringColor }}
      />
      {occupied && (
        <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2">
          <Pawn />
        </span>
      )}
    </span>
  );
}

/** One drawn heart that rises and fades. Drawn, not an emoji, so it matches the rest of the picture. */
function Heart({ delay, rise, big }: { delay: number; rise: number; big?: boolean }) {
  return (
    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2">
      <motion.svg
        viewBox="0 0 24 24"
        focusable="false"
        aria-hidden="true"
        initial={{ opacity: 0, y: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], y: [0, -rise], scale: [0.5, 1.05, 0.9] }}
        transition={{ duration: big ? 1.1 : 0.9, delay, ease: "easeOut" }}
        className={big ? "h-4 w-4 xl:h-6 xl:w-6" : "h-3 w-3 xl:h-4 xl:w-4"}
      >
        <path
          d="M12 21.2c-.4 0-.8-.2-1.1-.5C6.2 17 3 14 3 10.4 3 7.7 5 5.8 7.4 5.8c1.7 0 3.2.9 4.6 2.7 1.4-1.8 2.9-2.7 4.6-2.7C19 5.8 21 7.7 21 10.4c0 3.6-3.2 6.6-7.9 10.3-.3.3-.7.5-1.1.5z"
          fill="#E5484D"
        />
      </motion.svg>
    </span>
  );
}

/**
 * Round the table, you at the bottom: five seats on a ring, four taken. Positions
 * are percentages of the scene (a pentagon of radius 38 round the centre), so the
 * scene scales as one piece. Ring colours are Ludo's.
 */
const FRIENDS = [
  { src: "/way-faces/face-1.webp", left: 13.9, top: 61.7, ring: "#E04A3F" },
  { src: "/way-faces/face-2.webp", left: 27.7, top: 19.3, ring: "#2E9E5B" },
  { src: "/way-faces/face-3.webp", left: 72.3, top: 19.3, ring: "#F2C230" },
  { src: "/way-faces/face-4.webp", left: 86.1, top: 61.7, ring: "#3567C7" },
] as const;
const YOUR_SEAT = { left: 50, top: 88 } as const;

/** One full turn: the die rolls, each friend answers in order, then a breath. */
const TABLE_TURN_MS = 4000;
/** Gap between one friend's answer and the next, in seconds. */
const TURN_STAGGER = 0.45;

export function Table({ active, pawnHere }: { active: boolean; pawnHere: boolean }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const { face, rolling, rolls, roll } = useDieRoller();
  /** Counts the times your pawn has sat down, so each arrival gets its own cheer. */
  const [cheers, setCheers] = useState(0);
  const wasSeated = useRef(false);

  useEffect(() => {
    if (reduceMotion) return undefined;
    if (active) {
      void roll();
      const id = window.setInterval(() => void roll(), TABLE_TURN_MS);
      return () => window.clearInterval(id);
    }
    if (seen) void roll();
    return undefined;
  }, [active, seen, reduceMotion, roll]);

  useEffect(() => {
    if (pawnHere && !wasSeated.current) setCheers((n) => n + 1);
    wasSeated.current = pawnHere;
  }, [pawnHere]);

  const moving = !reduceMotion;

  return (
    <div
      ref={ref}
      data-table-scene=""
      aria-hidden="true"
      className={`relative h-full w-full transition-[filter] duration-500 ${
        active ? "drop-shadow-[0_0_12px_rgba(242,194,48,0.55)]" : "drop-shadow-[0_8px_8px_rgba(74,44,22,0.3)]"
      }`}
    >
      <svg viewBox="0 0 100 100" focusable="false" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="way-tb-wood" cx="0.4" cy="0.35" r="0.9">
            <stop offset="0" stopColor="#D79A55" />
            <stop offset="1" stopColor="#8A5A2B" />
          </radialGradient>
          <radialGradient id="way-tb-felt" cx="0.5" cy="0.4" r="0.8">
            <stop offset="0" stopColor="#3E9A62" />
            <stop offset="1" stopColor="#1F6B40" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="url(#way-tb-wood)" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#5B3A1E" strokeOpacity="0.5" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="29" fill="url(#way-tb-felt)" />
        <circle cx="50" cy="50" r="29" fill="none" stroke="#F2C230" strokeOpacity="0.55" strokeWidth="0.9" strokeDasharray="2 2.6" />
      </svg>

      {FRIENDS.map((friend, i) => {
        const answerAt = ROLL_MS / 1000 + i * TURN_STAGGER;
        return (
          <span
            key={friend.src}
            data-table-face=""
            className="absolute h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${friend.left}%`, top: `${friend.top}%` }}
          >
            {/* Keyed on the roll count, so every roll starts each friend's answer again. */}
            <motion.span
              key={`turn-${rolls}`}
              initial={{ y: 0, scale: 1 }}
              animate={moving && rolls > 0 ? { y: [0, -6, 0], scale: [1, 1.1, 1] } : { y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: answerAt, ease: "easeOut" }}
              className="block h-full w-full"
            >
              <img
                src={friend.src}
                alt=""
                width={128}
                height={128}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full rounded-full border-2 border-white object-cover"
                style={{ boxShadow: `0 0 0 2px ${friend.ring}, 0 4px 8px rgba(74,44,22,0.35)` }}
              />
            </motion.span>
            {moving && rolls > 0 && <Heart key={`heart-${i}-${rolls}`} delay={answerAt + 0.1} rise={26} />}
            {moving && cheers > 0 && <Heart key={`cheer-${i}-${cheers}`} delay={i * 0.1} rise={34} big />}
          </span>
        );
      })}

      {/* Your seat: saved, dashed, until your pawn sits in it. */}
      <span
        data-table-seat=""
        className="absolute h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${YOUR_SEAT.left}%`, top: `${YOUR_SEAT.top}%` }}
      >
        <SeatRing occupied={pawnHere} ringColor="#B7791F" fillClass="bg-white/25" className="h-full w-full" />
      </span>

      {/* The die sits in a plain wrapper: framer owns `transform` on the die itself. */}
      <span className="absolute left-1/2 top-1/2 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2">
        <Die face={face} tumbling={rolling} className="h-full w-full drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)]" />
      </span>
    </div>
  );
}

/** Three wisps of steam, each a little later than the last. */
const STEAM = [
  { d: "M13 14c-2-3 2-4 0-8", delay: 0 },
  { d: "M18 13c-2-3 2-4 0-9", delay: 0.45 },
  { d: "M23 14c-2-3 2-4 0-8", delay: 0.9 },
] as const;

/**
 * A glass of chai on its saucer, beside the handheld: the "alone" box is a quiet
 * corner, and in this corner somebody has made you tea. The steam rises while the
 * box is hovered or chosen; at rest the wisps are faint and still.
 */
export function Chai({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const moving = active && !reduceMotion;

  return (
    <svg
      data-chai=""
      viewBox="0 0 36 48"
      focusable="false"
      aria-hidden="true"
      className="h-full w-full overflow-visible drop-shadow-[0_5px_5px_rgba(74,44,22,0.3)]"
    >
      <defs>
        <linearGradient id="way-chai-tea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0953A" />
          <stop offset="1" stopColor="#8F4B14" />
        </linearGradient>
      </defs>

      {STEAM.map((wisp) => (
        <motion.path
          key={wisp.d}
          d={wisp.d}
          fill="none"
          stroke="#B9A58A"
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={{ opacity: 0.35, y: 0 }}
          animate={moving ? { opacity: [0, 0.8, 0], y: [2, -5] } : { opacity: 0.35, y: 0 }}
          transition={{ duration: 2.2, delay: wisp.delay, ease: "easeOut", repeat: moving ? Infinity : 0 }}
        />
      ))}

      <ellipse cx="18" cy="44.5" rx="14" ry="2.8" fill="#E8D8B4" stroke="#C9B48F" strokeWidth="1" />
      <path
        d="M8 18 L28 18 L25.5 41 Q25.3 42.5 23.8 42.5 L12.2 42.5 Q10.7 42.5 10.5 41 Z"
        fill="#ffffff"
        fillOpacity="0.4"
        stroke="#C9B48F"
        strokeWidth="1.2"
      />
      <path
        d="M9.3 25 L26.7 25 L25.3 40.8 Q25.2 41.5 24.5 41.5 L11.5 41.5 Q10.8 41.5 10.7 40.8 Z"
        fill="url(#way-chai-tea)"
      />
      <ellipse cx="18" cy="25" rx="8.7" ry="1.8" fill="#F3D9A4" />
      <ellipse cx="18" cy="18" rx="10" ry="2" fill="#FFFDF7" fillOpacity="0.6" stroke="#C9B48F" strokeWidth="0.8" />
      <path d="M11.5 22 L12.8 38" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
