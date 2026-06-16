import { useMemo } from "react";
import type { LudoColor, LudoToken } from "@shared/types";

// Bundle any board-*.svg / board-*.json that exist in ./boards/. Missing files
// just fall through to the placeholder — we never crash on a missing template.
const svgSources = import.meta.glob("./boards/board-*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const positionFiles = import.meta.glob("./boards/board-*.json", {
  import: "default",
  eager: true,
}) as Record<string, BoardPositions>;

export interface BoardPoint { x: number; y: number }
export type BoardPositions = Record<string, BoardPoint>;

const COLOR_FILL: Record<LudoColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
  brown: "#92400e",
};

interface Props {
  wedgeCount: number;
  tokens: LudoToken[];
  movableIds?: Set<string>;
  onTokenClick?: (tokenId: string) => void;
}

export default function StaticPolygonBoard({
  wedgeCount,
  tokens,
  movableIds,
  onTokenClick,
}: Props) {
  const svg = svgSources[`./boards/board-${wedgeCount}.svg`];
  const positions = positionFiles[`./boards/board-${wedgeCount}.json`];

  const layoutReady = !!svg && !!positions;

  const placed = useMemo(() => {
    if (!positions) return [];
    return tokens
      .map((t) => ({ token: t, point: lookup(positions, t) }))
      .filter((x): x is { token: LudoToken; point: BoardPoint } => x.point != null);
  }, [tokens, positions]);

  if (!layoutReady) {
    return (
      <div className="aspect-square w-full max-w-[720px] mx-auto bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <div className="text-5xl">🛠️</div>
          <div className="font-semibold text-slate-200">
            No board template for {wedgeCount}-player Ludo yet
          </div>
          <div className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Drop a hand-authored <code className="text-slate-300">board-{wedgeCount}.svg</code> into{" "}
            <code className="text-slate-300">client/src/games/ludo/boards/</code>, then run{" "}
            <code className="text-slate-300">node scripts/extractBoardPositions.mjs</code>.
            See the README in that folder for the ID schema.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-[720px] mx-auto">
      <div
        className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      >
        {placed.map(({ token, point }) => {
          const movable = movableIds?.has(token.id) ?? false;
          return (
            <g
              key={token.id}
              transform={`translate(${point.x} ${point.y})`}
              style={{ pointerEvents: movable ? "auto" : "none", cursor: movable ? "pointer" : "default" }}
              onClick={() => movable && onTokenClick?.(token.id)}
            >
              {movable && (
                <circle
                  r={3.1}
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth={0.5}
                  opacity={0.9}
                />
              )}
              <circle
                r={2.4}
                fill={COLOR_FILL[token.color]}
                stroke="#0f172a"
                strokeWidth={0.45}
              />
              <circle r={0.9} fill="#fff" opacity={0.65} cx={-0.7} cy={-0.9} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function lookup(positions: BoardPositions, token: LudoToken): BoardPoint | null {
  if (token.state === "yard") {
    const slot = parseSlot(token.id);
    return positions[`yard-${token.color}-${slot}`] ?? null;
  }
  if (token.state === "track" && token.trackPos != null) {
    return positions[`track-${token.trackPos}`] ?? null;
  }
  if (token.state === "stretch" && token.stretchPos != null) {
    return positions[`stretch-${token.color}-${token.stretchPos}`] ?? null;
  }
  if (token.state === "home") {
    const slot = parseSlot(token.id);
    return (
      positions[`home-${token.color}-${slot}`] ??
      positions[`stretch-${token.color}-5`] ??
      null
    );
  }
  return null;
}

function parseSlot(tokenId: string): number {
  const tail = tokenId.split("-").pop();
  const n = Number(tail);
  return Number.isFinite(n) ? n : 0;
}
