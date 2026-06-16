import type { LudoColor, Player } from "@shared/types";
import { COLOR_HEX } from "./board-layout";

export interface RemoteCursor {
  playerId: string;
  x: number; // 0..1 normalized relative to board element
  y: number;
  lastSeenTs: number;
}

/**
 * Render small labeled arrows for each other player's live cursor inside the
 * board. Absolutely positioned within the board container.
 */
export default function CursorLayer({
  cursors,
  players,
  playerColors,
}: {
  cursors: RemoteCursor[];
  players: Player[];
  playerColors: Record<string, LudoColor>;
}) {
  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {cursors.map((c) => {
        const color = playerColors[c.playerId];
        const hex = color ? COLOR_HEX[color] : "#f59e0b";
        return (
          <div
            key={c.playerId}
            className="absolute transition-all duration-100 ease-linear"
            style={{
              left: `${c.x * 100}%`,
              top: `${c.y * 100}%`,
              transform: "translate(-2px, -2px)",
            }}
          >
            {/* Arrow */}
            <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow">
              <path
                d="M 0 0 L 0 14 L 4 11 L 7 17 L 9 16 L 6 10 L 12 10 Z"
                fill={hex}
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            {/* Name label */}
            <div
              className="absolute left-4 top-3 text-[10px] font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ background: hex, textShadow: "0 1px 2px rgba(0,0,0,.4)" }}
            >
              {nameOf(c.playerId)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
