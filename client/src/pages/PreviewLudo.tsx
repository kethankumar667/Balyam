import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LudoColor, Player } from "@shared/types";
import { buildPolygonGeometry } from "../games/ludo/polygon-board";
import PolygonBoardSVG from "../games/ludo/PolygonBoardSVG";
import { Token } from "../games/ludo/Token";
import { PLAYER_COLORS_ORDER } from "../games/ludo/board-layout";

/**
 * Standalone viewer page for the N-player polygon boards (5, 6, 7, 8).
 * Renders each board with placeholder players occupying every yard so you
 * can review the geometry without needing real opponents.
 */
export default function PreviewLudo() {
  const [selected, setSelected] = useState<number>(5);
  const counts: number[] = [5, 6, 7, 8];
  const labelOf = (n: number) => ({ 5: "Pentagon", 6: "Hexagon", 7: "Heptagon", 8: "Octagon" }[n]);

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "var(--surface-0)", color: "var(--text-hi)" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ludo board preview</h1>
          <p className="text-sm" style={{ color: "var(--text-lo)" }}>
            5-, 6-, 7- and 8-player layouts. Each yard is filled with mock tokens so you can see resting positions.
          </p>
        </div>
        <Link
          to="/"
          className="rounded px-3 py-1.5 text-sm"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--surface-3)",
          }}
        >
          ← Back to lobby
        </Link>
      </header>

      <div className="flex gap-2 flex-wrap">
        {counts.map((n) => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition border ${
              selected === n
                ? "bg-indigo-600 ring-2 ring-indigo-300 text-white border-indigo-500"
                : "hover:opacity-90"
            }`}
            style={
              selected === n
                ? undefined
                : {
                    background: "var(--surface-2)",
                    borderColor: "var(--surface-3)",
                    color: "var(--text-hi)",
                  }
            }
          >
            {n} players ({labelOf(n)})
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-6 flex justify-center"
        style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}
      >
        <BoardPreview N={selected} />
      </div>

      <details
        className="rounded-2xl p-6"
        style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}
      >
        <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-mid)" }}>
          Show all four side by side
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {counts.map((n) => (
            <div key={n} className="space-y-2">
              <div className="text-sm font-semibold">{n} players · {labelOf(n)}</div>
              <BoardPreview N={n} small />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function BoardPreview({ N, small = false }: { N: number; small?: boolean }) {
  const activeColors: LudoColor[] = useMemo(
    () => PLAYER_COLORS_ORDER.slice(0, N),
    [N]
  );
  const players: Player[] = useMemo(
    () =>
      activeColors.map((c, i) => ({
        id: `mock-${i}`,
        name: `${capitalize(c)} player`,
        isHost: i === 0,
        isReady: true,
        isConnected: true,
        chosenColor: c,
      })),
    [activeColors]
  );
  const playerOrder = players.map((p) => p.id);
  const playerColors: Record<string, LudoColor> = {};
  for (const p of players) if (p.chosenColor) playerColors[p.id] = p.chosenColor;
  const hasCaptured: Record<string, boolean> = Object.fromEntries(
    players.map((p) => [p.id, false])
  );

  const geo = useMemo(() => buildPolygonGeometry(N, activeColors), [N, activeColors]);

  const sizeClass = small
    ? "w-full max-w-[360px] aspect-square"
    : "w-full max-w-[640px] aspect-square";

  return (
    <div className={`relative ${sizeClass} mx-auto`}>
      <PolygonBoardSVG
        geo={geo}
        players={players}
        playerOrder={playerOrder}
        playerColors={playerColors}
        activeColors={activeColors}
        hasCaptured={hasCaptured}
        unlockBurst={{}}
      />
      <div className="absolute inset-0">
        {activeColors.flatMap((color) =>
          [0, 1, 2, 3].map((tokenIdx) => {
            const slot = geo.yardSlots[color]?.[tokenIdx];
            if (!slot) return null;
            const baseSize = geo.cellSize * 1.7;
            return (
              <Token
                key={`${color}-${tokenIdx}`}
                color={color}
                left={slot.x}
                top={slot.y}
                size={small ? baseSize * 0.85 : baseSize}
                movable={false}
                label={String(tokenIdx + 1)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
