import type { ReactionRecvPayload } from "@shared/types";
import { COLOR_HEX } from "./board-layout";
import type { LudoColor } from "@shared/types";

/**
 * Render a stack of reactions, each floating up and fading out above the
 * reacting player's anchor point (their player card or yard center).
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
        const anchor = anchorOf(r.fromPlayerId);
        if (!anchor) return null;
        const drift = ((i % 3) - 1) * 8; // small lateral spread when multiple stack
        const color = playerColors[r.fromPlayerId];
        return (
          <div
            key={r.id}
            className="absolute reaction-float"
            style={{
              left: `calc(${anchor.left}% + ${drift}px)`,
              top: `${anchor.top}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className="text-5xl select-none drop-shadow-lg"
              style={{
                filter: color
                  ? `drop-shadow(0 0 8px ${COLOR_HEX[color]})`
                  : "drop-shadow(0 0 8px #fff)",
              }}
            >
              {r.emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}
