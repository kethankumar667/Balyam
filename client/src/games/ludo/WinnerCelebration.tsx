import type { LudoColor, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";

/**
 * Centerpiece ceremony shown for ~3 seconds when a player wins.
 * Big animated crown above the winner's name, with rays radiating outwards
 * in their color. Sits over the dimmed board.
 */
export default function WinnerCelebration({
  winner,
  color,
}: {
  winner: Player;
  color: LudoColor;
}) {
  const hex = COLOR_HEX[color];
  const dark = COLOR_HEX_DARK[color];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {/* Dim backdrop pulse */}
      <div className="absolute inset-0 bg-black/40 winner-fade-in" />

      {/* Radiating rays */}
      <svg
        viewBox="-100 -100 200 200"
        className="absolute w-[120vmin] h-[120vmin] winner-rays-spin"
        style={{ filter: `drop-shadow(0 0 24px ${hex})` }}
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i / 18) * 360;
          return (
            <polygon
              key={i}
              points="-3,-80 3,-80 0,-30"
              fill={hex}
              opacity="0.85"
              transform={`rotate(${angle})`}
            />
          );
        })}
      </svg>

      {/* Center stack */}
      <div className="relative flex flex-col items-center gap-4 winner-pop">
        <div className="text-8xl drop-shadow-2xl winner-crown-bob">👑</div>
        <div
          className="rounded-2xl px-8 py-4 text-center shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${dark}, ${hex})`,
            outline: "3px solid rgba(255,255,255,0.55)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.3em] text-white/80 font-bold">
            Winner
          </div>
          <div className="text-4xl font-black text-white drop-shadow-lg leading-tight">
            {winner.name}
          </div>
        </div>
        <div className="text-2xl">🏆 ✨ 🎊</div>
      </div>
    </div>
  );
}
