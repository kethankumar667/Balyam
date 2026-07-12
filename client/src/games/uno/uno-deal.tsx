import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { UnoCardBack } from "./uno-shared";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

/**
 * UNO's shuffle + deal opener — same trigger contract as Rummy's
 * (`bhalyam.<game>.justStarted.<roomCode>` sessionStorage flag, set by
 * Room.tsx on the lobby -> playing transition, see rummy/rotation-sync.tsx)
 * but without the landscape rotation gate: UNO renders at any orientation,
 * so there's no "wait for everyone to rotate" stage before the deck can
 * shuffle. Sequence is just idle -> shuffle -> deal -> idle.
 */
export type UnoDealStage = "idle" | "shuffle" | "deal";

/** Deck-riffle stage length before cards start flying out. */
const SHUFFLE_MS = 900;
/** Deal-fan stage length. Tuned so the slowest card's stagger delay
 *  (DEAL_WINDOW_MS below) plus its own fly duration (see uno-deal-fly in
 *  index.css, 380ms) finishes comfortably before this window — and the
 *  overlay — closes. */
const DEAL_MS = 1000;

/**
 * Plays the opener exactly once per fresh round for this mounted shell
 * (Mobile or Desktop both call this identically).
 */
export function useUnoDealGate(roomCode: string): UnoDealStage {
  const { play: playSound } = useAudio();

  // Peek (never remove) in the lazy initializer so the very first render
  // already starts on "shuffle" instead of flashing the real board for one
  // frame while a later effect catches up.
  const [triggered, setTriggered] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(`bhalyam.uno.justStarted.${roomCode}`) === "1";
  });
  const [stage, setStage] = useState<UnoDealStage>(triggered ? "shuffle" : "idle");

  // Consume the flag exactly once per mount. Safe under StrictMode's
  // dev-only mount -> cleanup -> mount: both invocations peek the same key,
  // and the removal on the second call is a harmless no-op.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `bhalyam.uno.justStarted.${roomCode}`;
    if (window.sessionStorage.getItem(key) !== "1") return;
    window.sessionStorage.removeItem(key);
    setTriggered(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!triggered) return;
    // The app-wide `prefers-reduced-motion` rule (index.css) already
    // collapses the CSS keyframes themselves to near-zero duration, but
    // that doesn't shrink these JS setTimeout stage lengths — without this
    // check a motion-sensitive player would still stare at a static overlay
    // for ~1.9s with nothing moving. Collapse the stage lengths to match.
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shuffleMs = reduceMotion ? 80 : SHUFFLE_MS;
    const dealMs = reduceMotion ? 80 : DEAL_MS;

    setStage("shuffle");
    playSound(AUDIO.UNO_SHUFFLE);
    const toDeal = window.setTimeout(() => {
      setStage("deal");
      playSound(AUDIO.UNO_DEAL);
    }, shuffleMs);
    const toIdle = window.setTimeout(() => setStage("idle"), shuffleMs + dealMs);
    return () => {
      window.clearTimeout(toDeal);
      window.clearTimeout(toIdle);
    };
  }, [triggered]);

  return stage;
}

/** Face-down card used for both the centre deck and the flying deal cards —
 *  just `UnoCardBack` (the same SVG the draw pile already uses) at a fixed
 *  overlay size, so the opener reads as unmistakably "UNO" rather than a
 *  generic card back. */
function UnoDealCard() {
  return (
    <div className="relative w-[52px] h-[72px] sm:w-[58px] sm:h-[80px] drop-shadow-md">
      <UnoCardBack className="w-full h-full" />
    </div>
  );
}

/** Window (ms) over which each seat's cards' stagger delays are spread. */
const DEAL_WINDOW_MS = 600;
/** UNO always deals 7 cards to each player. */
const HAND_SIZE = 7;

export function UnoDealOverlay({
  stage,
  playerCount,
}: {
  stage: "shuffle" | "deal";
  playerCount: number;
}) {
  // Clamp 2..8 — matches Uno's room max player count.
  const N = Math.max(2, Math.min(8, playerCount));

  // Narrower spread on phones (portrait or landscape) so seats don't fly
  // off-screen; Rummy can use a fixed radius because it locks landscape,
  // Uno can't assume that.
  const RADIUS = typeof window !== "undefined" && window.innerWidth >= 640 ? 210 : 115;

  const seats = Array.from({ length: N }, (_, i) => {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / N;
    return { dx: Math.cos(angle) * RADIUS, dy: Math.sin(angle) * RADIUS };
  });

  const TOTAL_CARDS = HAND_SIZE * N;
  const fanCards = Array.from({ length: TOTAL_CARDS }, (_, i) => {
    const seatIdx = i % N;
    const round = Math.floor(i / N);
    const seat = seats[seatIdx];
    // Tiny jitter so each seat's pile reads as cards, not one rectangle.
    const jitterX = ((round * 17 + seatIdx * 11) % 16) - 8;
    const jitterY = ((round * 13 + seatIdx * 7) % 12) - 6;
    const rot = ((round * 23 + seatIdx * 19) % 70) - 35;
    return {
      dx: `${(seat.dx + jitterX).toFixed(0)}px`,
      dy: `${(seat.dy + jitterY).toFixed(0)}px`,
      rot: `${rot}deg`,
      delay: `${Math.round((i / TOTAL_CARDS) * DEAL_WINDOW_MS)}ms`,
    };
  });

  const banner =
    stage === "shuffle" ? "Shuffling deck…" : `Dealing 7 cards to ${N} player${N === 1 ? "" : "s"}…`;

  return (
    <div
      // `fixed` (not `absolute`) — Uno's board shells are stacked panel
      // columns with no viewport-sized positioned ancestor the way Rummy's
      // felt table is, so this covers the whole screen regardless of shell.
      className={`fixed inset-0 z-[55] ${stage === "deal" ? "uno-deal-fade-late" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Shuffling and dealing — please wait"
      onClick={(e) => e.preventDefault()}
      style={{
        background: "linear-gradient(160deg, #2a0d0d 0%, #17181d 55%, #0d0e12 100%)",
      }}
    >
      <div
        className="uno-deal-banner absolute top-1/2 left-1/2 z-10 px-5 py-2 rounded-full font-black uppercase tracking-[0.22em] text-[11px] sm:text-[13px]"
        style={{
          color: "#FFF9F0",
          background: "linear-gradient(135deg, #E23E2E, #B91C1C)",
          border: "2px solid #17181d",
          boxShadow: "0 8px 20px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.25)",
          marginTop: -110,
        }}
      >
        {banner}
      </div>

      {/* Centre deck — visible during both stages. During "shuffle" the two
          stacked backs riffle opposite directions; during "deal" they sit
          still as the source of the flying cards. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-[52px] h-[72px] sm:w-[58px] sm:h-[80px]">
          <div className={`absolute inset-0 ${stage === "shuffle" ? "uno-deck-shuffle" : ""}`}>
            <UnoDealCard />
          </div>
          <div className={`absolute inset-0 ${stage === "shuffle" ? "uno-deck-shuffle-alt" : ""}`}>
            <UnoDealCard />
          </div>
        </div>
      </div>

      {/* Deal flight — only renders during the deal stage so cards start
          animating exactly when the riffle stops. */}
      {stage === "deal" && (
        <div className="absolute top-1/2 left-1/2">
          {fanCards.map((c, i) => (
            <div
              key={i}
              className="uno-deal-fly absolute -translate-x-1/2 -translate-y-1/2"
              style={
                {
                  "--dx": c.dx,
                  "--dy": c.dy,
                  "--rot": c.rot,
                  animationDelay: c.delay,
                  animationFillMode: "forwards",
                } as CSSProperties
              }
            >
              <UnoDealCard />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
