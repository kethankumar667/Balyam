import type { HcCelebrationData } from "../useHcCelebrationEvents";
import { DD } from "./doordarshan-kit";

/**
 * Doordarshan's own reskin of the shared celebration events — an
 * "INSTANT REPLAY" tape-cut graphic instead of the emoji-burst look every
 * other theme uses. Built on `useHcCelebrationEvents`, which owns exactly
 * WHEN a celebration fires (ball diffing, milestone priority, hat-trick
 * detection, auto-dismiss timing) so this file only owns WHAT it looks like.
 *
 * Every event kind gets its OWN entrance motion (not just a colour/text
 * swap over one shared pop) — a four pans in like a camera whip-pan to the
 * fence, a six rises with hang-time, a wicket juddering-freeze-frames like a
 * damaged tape, a hat-trick strobes three hard cuts, sixes/fours streaks
 * compound their single-ball motion three times, and a century gets a
 * bigger overshoot + ring flare than a plain fifty.
 */

const DD_CELEBRATION_KEYFRAMES = `
@keyframes dd-tape-flash {
  0% { opacity: 0.9; }
  8% { opacity: 0; }
  16% { opacity: 0.6; }
  24% { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes dd-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes dd-ring-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* FOUR — whip-pans in from the side like a camera chasing the ball to the
   fence, with a tracking-jitter settle instead of a clean stop. */
@keyframes dd-cut-four {
  0%   { transform: translateX(-60vw) skewX(-6deg); opacity: 0; }
  55%  { transform: translateX(3vw) skewX(2deg); opacity: 1; }
  68%  { transform: translateX(-1.5vw) skewX(-1deg); }
  78%  { transform: translateX(1vw) skewX(0.5deg); }
  100% { transform: translateX(0) skewX(0); opacity: 1; }
}

/* SIX — rises with hang-time, taller and slower than a four's pan. */
@keyframes dd-cut-six {
  0%   { transform: translateY(50vh) scale(0.5); opacity: 0; filter: blur(3px); }
  55%  { transform: translateY(-5vh) scale(1.14); opacity: 1; filter: blur(0); }
  74%  { transform: translateY(2vh) scale(0.97); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* WICKET — a damaged-tape freeze-frame judder: quick small position snaps
   instead of a smooth entrance, like the deck is struggling to hold the
   frame. */
@keyframes dd-cut-wicket {
  0%   { transform: translate(0,0) scale(0.7); opacity: 0; }
  15%  { transform: translate(-6px, 2px) scale(1.05); opacity: 1; }
  28%  { transform: translate(5px, -3px) scale(0.98); }
  40%  { transform: translate(-4px, 3px) scale(1.02); }
  52%  { transform: translate(3px, -2px) scale(0.99); }
  64%  { transform: translate(-2px, 1px) scale(1.01); }
  100% { transform: translate(0,0) scale(1); opacity: 1; }
}

/* HAT-TRICK — three hard strobe cuts, each a full punch-in, harder and
   faster than a single wicket's judder. */
@keyframes dd-cut-hattrick {
  0%   { transform: scale(0.3); opacity: 0; }
  18%  { transform: scale(1.2); opacity: 1; }
  30%  { transform: scale(0.92); opacity: 0.4; }
  42%  { transform: scale(1.16); opacity: 1; }
  54%  { transform: scale(0.94); opacity: 0.4; }
  66%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* STREAK (sixes) — the six rise, compounded: two extra bounces on the way
   down before it settles, "another one, and another one". */
@keyframes dd-cut-streak-sixes {
  0%   { transform: translateY(55vh) scale(0.45); opacity: 0; }
  30%  { transform: translateY(-4vh) scale(1.16); opacity: 1; }
  42%  { transform: translateY(3vh) scale(1.0); }
  58%  { transform: translateY(-6vh) scale(1.08); }
  70%  { transform: translateY(1.5vh) scale(1.0); }
  84%  { transform: translateY(-2.5vh) scale(1.04); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* STREAK (fours) — the four whip-pan, compounded into a rapid triple slam
   from alternating sides — the "machine gun" of boundaries. */
@keyframes dd-cut-streak-fours {
  0%   { transform: translateX(-45vw) skewX(-5deg); opacity: 0; }
  22%  { transform: translateX(2.5vw) skewX(2deg); opacity: 1; }
  34%  { transform: translateX(-2vw) skewX(-1.5deg); }
  46%  { transform: translateX(2vw) skewX(1.5deg); }
  58%  { transform: translateX(-1.2vw) skewX(-1deg); }
  70%  { transform: translateX(1vw) skewX(0.5deg); }
  100% { transform: translateX(0) skewX(0); opacity: 1; }
}

/* MILESTONE (fifty) — a light, quick pop. Deliberately the smallest motion
   in the set — a fifty is good, not the innings' biggest moment. */
@keyframes dd-cut-fifty {
  0%   { transform: scale(0.6); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* MILESTONE (century) — a bigger, slower overshoot with a lingering
   settle — backed by a spinning ring flare behind the card. */
@keyframes dd-cut-century {
  0%   { transform: scale(0.2) rotate(-10deg); opacity: 0; }
  50%  { transform: scale(1.24) rotate(4deg); opacity: 1; }
  70%  { transform: scale(0.95) rotate(-2deg); }
  86%  { transform: scale(1.06) rotate(1deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* WINNER — the sign-off: slower, bigger, fading through from further back
   than any per-ball event. */
@keyframes dd-cut-winner {
  0%   { transform: scale(0.55); opacity: 0; filter: blur(4px); }
  60%  { transform: scale(1.08); opacity: 1; filter: blur(0); }
  80%  { transform: scale(0.98); }
  100% { transform: scale(1); opacity: 1; }
}
`;

const ANIMATION_BY_KIND: Record<HcCelebrationData["kind"], string> = {
  four: "dd-cut-four 520ms cubic-bezier(.2,.85,.3,1) 1",
  six: "dd-cut-six 640ms cubic-bezier(.16,.7,.28,1.1) 1",
  wicket: "dd-cut-wicket 560ms ease-out 1",
  hattrickWickets: "dd-cut-hattrick 760ms ease-out 1",
  streak: "dd-cut-streak-fours 620ms cubic-bezier(.2,.85,.3,1) 1", // overridden per variant below
  milestone: "dd-cut-fifty 380ms cubic-bezier(.34,1.4,.4,1) 1", // overridden by runs below
  winner: "dd-cut-winner 900ms cubic-bezier(.22,.85,.3,1) 1",
};

function animationFor(data: HcCelebrationData): string {
  if (data.kind === "streak") {
    return data.variant === "sixes"
      ? "dd-cut-streak-sixes 820ms cubic-bezier(.16,.7,.28,1.1) 1"
      : data.variant === "fours"
      ? "dd-cut-streak-fours 620ms cubic-bezier(.2,.85,.3,1) 1"
      : "dd-cut-hattrick 700ms ease-out 1"; // "mixed" streak — still a strobe, distinct from the ball-specific shapes
  }
  if (data.kind === "milestone") {
    return data.runs >= 100
      ? "dd-cut-century 780ms cubic-bezier(.34,1.4,.4,1) 1"
      : "dd-cut-fifty 380ms cubic-bezier(.34,1.4,.4,1) 1";
  }
  return ANIMATION_BY_KIND[data.kind];
}

function headlineFor(data: HcCelebrationData): string {
  switch (data.kind) {
    case "four": return "FOUR!";
    case "six": return "SIX!";
    case "wicket": return "OUT!";
    case "hattrickWickets": return "HAT-TRICK!";
    case "streak": return data.title;
    case "milestone": return data.runs === 50 ? "FIFTY!" : data.runs === 100 ? "CENTURY!" : `${data.runs}!`;
    case "winner": return data.isTie ? "MATCH TIED" : data.youWon ? "VICTORY" : "FULL TIME";
  }
}

export function messageFor(data: HcCelebrationData): string {
  switch (data.kind) {
    case "winner": return data.isTie ? "A thriller finishes level." : `${data.winnerName} wins ${data.margin}.`;
    default: return data.message;
  }
}

function isDramatic(data: HcCelebrationData): boolean {
  return data.kind === "wicket" || data.kind === "hattrickWickets";
}

/** Century and the match-winner both get the spinning ring flare — the
 *  theme's marker for "this is the biggest moment on screen right now". */
function hasRingFlare(data: HcCelebrationData): boolean {
  return data.kind === "winner" || (data.kind === "milestone" && data.runs >= 100);
}

export function DoordarshanCelebrationOverlay({ data }: { data: HcCelebrationData }) {
  const dramatic = isDramatic(data);
  const isWinner = data.kind === "winner";
  return (
    <div
      key={data.id}
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <style>{DD_CELEBRATION_KEYFRAMES}</style>
      {/* Tape-cut flash — the "we just cut to a replay tape" beat. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: DD.ink, animation: "dd-tape-flash 500ms ease-out 1" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, rgba(217,138,61,${isWinner ? 0.28 : dramatic ? 0.22 : 0.18}), rgba(10,7,5,0.75) 72%)` }}
      />

      <div className="relative text-center max-w-lg" style={{ animation: animationFor(data) }}>
        {hasRingFlare(data) && (
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10"
            style={{
              width: "min(110vw, 680px)",
              height: "min(110vw, 680px)",
              background:
                "conic-gradient(from 0deg, rgba(217,138,61,0) 0deg, rgba(217,138,61,0.4) 30deg, rgba(217,138,61,0) 60deg, rgba(217,138,61,0.4) 90deg, rgba(217,138,61,0) 120deg, rgba(217,138,61,0.4) 150deg, rgba(217,138,61,0) 180deg, rgba(217,138,61,0.4) 210deg, rgba(217,138,61,0) 240deg, rgba(217,138,61,0.4) 270deg, rgba(217,138,61,0) 300deg, rgba(217,138,61,0.4) 330deg, rgba(217,138,61,0) 360deg)",
              filter: "blur(10px)",
              opacity: 0.6,
              animation: "dd-ring-spin 7s linear infinite",
            }}
          />
        )}

        {!isWinner && (
          <div
            className="font-crt mb-1 inline-flex items-center gap-2 rounded-sm px-3 py-1 text-[16px] uppercase"
            style={{
              letterSpacing: "0.14em",
              background: "rgba(217,138,61,0.16)",
              border: `1px solid ${DD.amber}`,
              color: DD.amber,
            }}
          >
            <span style={{ animation: "dd-blink 1s step-start infinite" }}>▶</span> Instant Replay
          </div>
        )}

        <div
          className="font-crt leading-none"
          style={{
            fontSize: isWinner ? "clamp(56px, 15vw, 120px)" : "clamp(56px, 16vw, 130px)",
            color: dramatic ? "#E08277" : DD.amber,
            textShadow: `0 0 18px ${dramatic ? "rgba(224,130,119,0.55)" : "rgba(217,138,61,0.55)"}, 0 4px 0 rgba(0,0,0,0.6)`,
            letterSpacing: "0.02em",
          }}
        >
          {headlineFor(data)}
        </div>

        <div
          className="font-typewriter mt-2 text-[13px] sm:text-[15px]"
          style={{ color: DD.ink, textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
        >
          {messageFor(data)}
        </div>

        {/* Boxy scorebug-style footer rule — sells the "graphic package" feel. */}
        <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
          <span style={{ width: 28, height: 2, background: DD.amber, opacity: 0.6 }} />
          <span className="font-crt text-[13px] uppercase" style={{ color: DD.inkLo, letterSpacing: "0.2em" }}>
            DD Sports
          </span>
          <span style={{ width: 28, height: 2, background: DD.amber, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}
