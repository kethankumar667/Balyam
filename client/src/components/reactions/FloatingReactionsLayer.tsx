import type { ReactionRecvPayload } from "@shared/types";

/**
 * Reactions, in two flavours. Game-agnostic — any board can mount this once
 * it can answer "where on screen is this player's seat right now".
 *
 * TARGETED — the emotional one. Someone just did something to you, and you
 * lob a reaction back at them. The emoji launches from the SENDER's seat,
 * arcs across the table and lands on the TARGET's seat with a splash ring.
 * It only reads as "aimed at you" if you can see it travel: a reaction that
 * merely appears above a seat is a notification, one that flies at someone
 * is a joke shared between two people.
 *
 * UNTARGETED — a plain cheer, floating up over the sender's own seat.
 *
 * Both need `anchorOf` to resolve a seat to a viewport position. If either
 * end is unknown (a seat not mounted yet, or not visible on this layout) the
 * throw degrades to the float rather than vanishing.
 *
 * Originally built for Ludo (`ludo-fling-*` CSS, since generalized to
 * `reaction-fling-*` in index.css) — lifted out so every game gets the same
 * arc instead of hand-rolling its own (see UNO's separate, duplicated
 * inline framer-motion version this is meant to eventually replace).
 */
export default function FloatingReactionsLayer({
  reactions,
  anchorOf,
  glowOf,
}: {
  reactions: ReactionRecvPayload[];
  /** Returns { left, top } in viewport percent for a given playerId, or null if unknown. */
  anchorOf: (playerId: string) => { left: number; top: number } | null;
  /** Optional per-sender glow colour (e.g. a Ludo seat's board colour). Defaults to white. */
  glowOf?: (playerId: string) => string | undefined;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {reactions.map((r, i) => {
        const to = anchorOf(r.targetPlayerId ?? r.fromPlayerId);
        if (!to) return null;
        const from = r.targetPlayerId ? anchorOf(r.fromPlayerId) : null;
        const glow = glowOf?.(r.fromPlayerId) ?? "#ffffff";

        if (from && r.targetPlayerId && r.targetPlayerId !== r.fromPlayerId) {
          return <FlungReaction key={r.id} from={from} to={to} emoji={r.emoji} glow={glow} />;
        }
        // Small lateral spread so simultaneous cheers don't stack exactly.
        const drift = ((i % 3) - 1) * 8;
        return (
          <div
            key={r.id}
            className="absolute reaction-float"
            style={{
              left: `calc(${to.left}% + ${drift}px)`,
              top: `${to.top}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className="text-5xl select-none drop-shadow-lg"
              style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
            >
              {r.emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One thrown reaction. Two nested elements make the arc: the OUTER travels
 * sender → target in a straight line at constant speed, while the INNER lifts
 * and drops. Composing them yields a parabola with no SVG path and no
 * per-frame JS — both are plain transforms, so it stays on the compositor.
 */
function FlungReaction({
  from,
  to,
  emoji,
  glow,
}: {
  from: { left: number; top: number };
  to: { left: number; top: number };
  emoji: string;
  glow: string;
}) {
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  // Longer throws hang higher, so a lob across the table arcs while a shot at
  // your neighbour stays flat.
  const lift = Math.min(22, 6 + Math.abs(dx) * 0.28);
  // Spin follows travel direction, so it reads as thrown rather than spun.
  //
  // MUST be a whole number of turns. This was +/-540deg, and 540 mod 360 is
  // 180 — so every thrown reaction came to REST upside-down on the target's
  // seat and stayed that way for the rest of its life. Two full turns keeps
  // the same lively tumble over the 720ms flight and lands it upright.
  const spin = dx >= 0 ? 720 : -720;
  return (
    <>
      <div
        className="reaction-fling absolute"
        style={{
          left: `${from.left}%`,
          top: `${from.top}%`,
          ["--fling-dx" as string]: `${dx}vw`,
          ["--fling-dy" as string]: `${dy}vh`,
        }}
      >
        <div
          className="reaction-fling-arc"
          style={{
            ["--fling-lift" as string]: `${lift}vh`,
            ["--fling-spin" as string]: `${spin}deg`,
          }}
        >
          <div
            className="text-4xl sm:text-5xl select-none"
            style={{ filter: `drop-shadow(0 0 10px ${glow})` }}
          >
            {emoji}
          </div>
        </div>
      </div>
      {/* Landing splash, delayed to arrive with the emoji. */}
      <div
        className="reaction-fling-impact absolute rounded-full"
        style={{
          left: `${to.left}%`,
          top: `${to.top}%`,
          border: `3px solid ${glow}`,
          boxShadow: `0 0 18px ${glow}`,
        }}
      />
    </>
  );
}
