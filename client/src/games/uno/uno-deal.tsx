import type { CSSProperties } from "react";
import { UnoCardBack } from "./uno-shared";

/**
 * UNO's shuffle + deal opener visuals — the stage machine that drives
 * WHEN these render now lives in `rotation-sync.tsx`'s
 * `useUnoRotationGate` (same synchronized-across-the-table contract
 * Rummy's `useRummyRotationGate` established: the deal no longer fires
 * independently per device — it holds until every connected, non-bot
 * player has rotated to landscape). This file keeps only the
 * presentational pieces (`UnoDealCard`, `UnoDealOverlay`), unchanged.
 */

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

  // Width-scaled spread — the >=640px branch already covers every
  // landscape phone (a typical landscape phone is 650-950px wide), which
  // is now guaranteed on Mobile once `rotation-sync.tsx`'s gate resolves;
  // the narrower fallback only matters for a genuinely tiny/unusual
  // viewport (or Desktop's own narrow-window edge case).
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
