import type { ReactionRecvPayload } from "@shared/types";
import { COLOR_HEX } from "./board-layout";
import type { LudoColor } from "@shared/types";

/**
 * Reactions, in two flavours.
 *
 * TARGETED — the emotional one. Someone sent your token home, and you lob a
 * chappal back at them. The emoji launches from the SENDER's seat card, arcs
 * across the table and lands on the TARGET's card with a splash ring. It only
 * reads as "aimed at you" if you can see it travel: a reaction that merely
 * appears above a card is a notification, one that flies at someone is a joke
 * shared between two people.
 *
 * UNTARGETED — a plain cheer, floating up over the sender's own card.
 *
 * Both need `anchorOf` to resolve a seat card to a viewport position. If
 * either end is unknown (a card not mounted yet) the throw degrades to the
 * float rather than vanishing.
 */
export default function FloatingReactionsLayer({
  reactions,
  anchorOf,
  playerColors,
}: {
  reactions: ReactionRecvPayload[];
  /** Returns { left, top } in viewport percent for a given playerId, or null if unknown. */
  anchorOf: (playerId: string) => { left: number; top: number } | null;
  playerColors: Record<string, LudoColor>;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {reactions.map((r, i) => {
        const to = anchorOf(r.targetPlayerId ?? r.fromPlayerId);
        if (!to) return null;
        const from = r.targetPlayerId ? anchorOf(r.fromPlayerId) : null;
        const hue = playerColors[r.fromPlayerId];
        const glow = hue ? COLOR_HEX[hue] : "#ffffff";

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
  const spin = dx >= 0 ? 540 : -540;
  return (
    <>
      <div
        className="ludo-fling absolute"
        style={{
          left: `${from.left}%`,
          top: `${from.top}%`,
          ["--fling-dx" as string]: `${dx}vw`,
          ["--fling-dy" as string]: `${dy}vh`,
        }}
      >
        <div
          className="ludo-fling-arc"
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
        className="ludo-fling-impact absolute rounded-full"
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
