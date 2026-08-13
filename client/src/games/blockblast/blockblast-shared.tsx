import { useEffect, useRef, useState } from "react";
import type { BlockBlastPieceView, BlockBlastPublicState } from "@shared/types";
import { BLOCK_GRID, blockStreakMultiplier } from "@shared/types";

/**
 * The look.
 *
 * Block Blast is candy on lilac. Copying that would put us in a straight
 * fight over polish with a studio that has already won it, on their ground.
 * This board is the hub's own register instead: a dark lacquered well with
 * jewel-cut blocks sitting in it — closer to a carrom board or a box of
 * glass bangles than to a mobile-ad puzzle.
 *
 * Every block is three layers: a lit top face, the body colour, and a shadow
 * seated under it. That is what makes a flat div read as an object you could
 * pick up, and picking things up is the whole verb of this game.
 */

/** Palette index → base colour. Index 0 is empty and never appears here. */
export const BLOCK_COLORS: Record<number, string> = {
  1: "#38bdf8", // sky
  2: "#2dd4bf", // teal
  3: "#4ade80", // green
  4: "#a3e635", // lime
  5: "#fbbf24", // amber
  6: "#fb923c", // orange
  7: "#f472b6", // pink
  8: "#a78bfa", // violet
};

export function blockFace(color: number): React.CSSProperties {
  const base = BLOCK_COLORS[color] ?? "#94a3b8";
  return {
    background: `linear-gradient(160deg, ${base} 0%, ${base} 42%, ${shade(base, -0.22)} 100%)`,
    // Top-left catch light, bottom-right seat, and a hairline of the base
    // colour bleeding out as glow. Reads as a cut stone rather than a square.
    boxShadow: `inset 0 2px 0 ${tint(base, 0.55)}, inset 0 -2px 0 ${shade(base, -0.4)}, 0 0 6px ${base}33`,
    borderRadius: "22%",
  };
}

/** Mixes a hex colour toward white. */
function tint(hex: string, amount: number): string {
  return mix(hex, 255, amount);
}
/** Mixes a hex colour toward black. `amount` is negative for darker. */
function shade(hex: string, amount: number): string {
  return mix(hex, 0, Math.abs(amount));
}
function mix(hex: string, toward: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) + (toward - ((n >> 16) & 255)) * amount);
  const g = Math.round(((n >> 8) & 255) + (toward - ((n >> 8) & 255)) * amount);
  const b = Math.round((n & 255) + (toward - (n & 255)) * amount);
  return `rgb(${r},${g},${b})`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Pieces
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * A tray piece drawn at an explicit cell size.
 *
 * Geometry comes from the wire (`piece.cells`), never from a table on this
 * side. A duplicated piece table would eventually disagree with the server's,
 * and the bug would present as "it won't let me put it there" with a board
 * that plainly has room.
 */
export function PieceGlyph({
  piece,
  cell,
  dimmed = false,
  className = "",
}: {
  piece: BlockBlastPieceView;
  cell: number;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: piece.w * cell,
        height: piece.h * cell,
        opacity: dimmed ? 0.28 : 1,
        filter: dimmed ? "saturate(0.35)" : undefined,
        transition: "opacity 140ms ease, filter 140ms ease",
      }}
      aria-hidden
    >
      {piece.cells.map((c) => (
        <div
          key={`${c.r}-${c.c}`}
          className="absolute"
          style={{
            left: c.c * cell,
            top: c.r * cell,
            width: cell,
            height: cell,
            padding: Math.max(1, cell * 0.06),
          }}
        >
          <div className="h-full w-full" style={blockFace(piece.color)} />
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * The board
 * ──────────────────────────────────────────────────────────────────────── */

export interface GridPreview {
  /** Cell indices the held piece would fill. */
  cells: number[];
  /** Cell indices in lines that placement would take down. */
  clearing: number[];
  /** false when the piece is over the board but cannot go there. */
  valid: boolean;
  color: number;
}

/**
 * The 8x8 well.
 *
 * `touch-none` is not optional. Without it a drag across the board is also a
 * page scroll, so the player fights the browser for control of their own
 * finger — the exact failure the D-pad in Snake shipped with once already.
 */
export function BlockGrid({
  grid,
  preview,
  gridRef,
  justCleared,
  dimmed = false,
}: {
  grid: number[];
  preview: GridPreview | null;
  gridRef?: React.Ref<HTMLDivElement>;
  /** Cells cleared by the last placement — flashed white on the way out. */
  justCleared?: Set<number>;
  dimmed?: boolean;
}) {
  const previewCells = new Set(preview?.cells ?? []);
  const clearingCells = new Set(preview?.clearing ?? []);

  return (
    <div
      ref={gridRef}
      className="relative grid aspect-square w-full touch-none select-none rounded-2xl p-[3px]"
      style={{
        gridTemplateColumns: `repeat(${BLOCK_GRID}, minmax(0, 1fr))`,
        background: "linear-gradient(160deg,#131a2b 0%,#0b1120 100%)",
        boxShadow:
          "inset 0 2px 10px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(148,163,184,0.10), 0 12px 30px rgba(0,0,0,0.45)",
        opacity: dimmed ? 0.5 : 1,
        transition: "opacity 220ms ease",
      }}
    >
      {grid.map((value, i) => {
        const isPreview = previewCells.has(i);
        const isClearing = clearingCells.has(i) && !isPreview;
        const flashing = justCleared?.has(i) ?? false;
        return (
          <div key={i} className="relative" style={{ padding: "5.5%" }}>
            <div
              className="h-full w-full"
              style={
                value !== 0
                  ? blockFace(value)
                  : {
                      borderRadius: "22%",
                      background: "rgba(255,255,255,0.035)",
                      boxShadow: "inset 0 1px 1px rgba(0,0,0,0.5)",
                    }
              }
            />

            {/* Ghost of the held piece. Filled and bright when it fits; an
                empty rose outline when it does not, so "no" is legible at a
                glance without the player having to read anything. */}
            {isPreview && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ padding: "5.5%" }}
              >
                <div
                  className="h-full w-full"
                  style={
                    preview!.valid
                      ? {
                          ...blockFace(preview!.color),
                          opacity: 0.62,
                          transform: "scale(0.92)",
                        }
                      : {
                          borderRadius: "22%",
                          border: "2px solid #fb7185",
                          background: "rgba(244,63,94,0.16)",
                        }
                  }
                />
              </div>
            )}

            {/* The line this placement would take down, lit end to end.
                This is the game teaching itself: nobody has to be told what
                a clear is after seeing a row light up under their thumb. */}
            {isClearing && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ padding: "5.5%" }}
              >
                <div
                  className="h-full w-full animate-pulse"
                  style={{
                    borderRadius: "22%",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,236,179,0.6))",
                    boxShadow: "0 0 12px rgba(255,236,179,0.85)",
                  }}
                />
              </div>
            )}

            {flashing && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ padding: "5.5%" }}
              >
                <div className="bb-flash h-full w-full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A rival's board at thumbnail size.
 *
 * The single thing this game has that a solo block puzzle cannot: watching
 * somebody else's grid choke while yours is still open.
 */
export function RivalGrid({ grid, size = 64 }: { grid: number[]; size?: number }) {
  const cell = size / BLOCK_GRID;
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-lg"
      style={{
        width: size,
        height: size,
        background: "#0b1120",
        boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.14)",
      }}
      aria-hidden
    >
      {grid.map((value, i) =>
        value === 0 ? null : (
          <div
            key={i}
            className="absolute"
            style={{
              left: (i % BLOCK_GRID) * cell,
              top: Math.floor(i / BLOCK_GRID) * cell,
              width: cell,
              height: cell,
              padding: cell * 0.08,
            }}
          >
            <div
              className="h-full w-full rounded-[2px]"
              style={{ background: BLOCK_COLORS[value] ?? "#94a3b8" }}
            />
          </div>
        ),
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * The clock
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Milliseconds left in the race, corrected for clock skew.
 *
 * The deadline is a SERVER timestamp. Subtracting the phone's own
 * `Date.now()` from it shows the wrong number on any handset whose clock has
 * drifted — and in a race, "how long have I got" being wrong by a minute is
 * the difference between pacing yourself and being cut off mid-thought. The
 * server sends its own clock alongside, so the offset is measurable.
 */
export function useRaceCountdown(state: BlockBlastPublicState): number | null {
  const offsetRef = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    offsetRef.current = state.serverNow - Date.now();
  }, [state.serverNow]);

  const deadline = state.deadline;
  useEffect(() => {
    if (deadline == null) {
      setRemaining(null);
      return;
    }
    const read = () => setRemaining(Math.max(0, deadline - (Date.now() + offsetRef.current)));
    read();
    const id = window.setInterval(read, 200);
    return () => window.clearInterval(id);
  }, [deadline]);

  return remaining;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Chrome
 * ──────────────────────────────────────────────────────────────────────── */

export function ScoreReadout({
  score,
  streak,
  gain,
}: {
  score: number;
  streak: number;
  gain: { value: number; key: number } | null;
}) {
  return (
    <div className="relative flex flex-col items-end leading-none">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
        Score
      </span>
      <span className="font-display text-2xl font-black tabular-nums text-white">
        {score.toLocaleString()}
      </span>
      {/* The streak only appears once it is worth something. A multiplier
          pinned at x1 all game is chrome nobody reads. */}
      {streak > 1 && (
        <span className="mt-0.5 rounded-full bg-amber-400/20 px-1.5 py-px text-[10px] font-black text-amber-300">
          {/* From shared, not recomputed here. A local copy of this formula
              disagrees with the server the first time anyone tunes the cap,
              and then the multiplier shown is not the one being paid. */}
          x{blockStreakMultiplier(streak).toFixed(1)} streak
        </span>
      )}
      {gain && (
        <span
          key={gain.key}
          className="bb-gain pointer-events-none absolute right-0 top-3 text-base font-black text-emerald-300"
        >
          +{gain.value}
        </span>
      )}
    </div>
  );
}

export function Standings({
  state,
  selfId,
}: {
  state: BlockBlastPublicState;
  selfId: string;
}) {
  const rows =
    state.result ??
    [...state.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        playerId: p.id,
        name: p.name,
        score: p.score,
        linesCleared: p.linesCleared,
        bestClear: p.bestClear,
        rank: i + 1,
      }));

  return (
    <ol className="space-y-1.5">
      {rows.map((row) => {
        const mine = row.playerId === selfId;
        return (
          <li
            key={row.playerId}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${
              mine ? "bg-amber-400/15 ring-1 ring-amber-400/40" : "bg-white/5"
            }`}
          >
            <span
              className={`w-5 text-center text-xs font-black ${
                row.rank === 1 ? "text-amber-300" : "text-slate-400"
              }`}
            >
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {mine ? "You" : row.name}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {row.linesCleared} lines
            </span>
            <span className="font-display text-base font-black tabular-nums text-white">
              {row.score.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * What the game is, in one line, for someone who has never opened it.
 *
 * Race needs exactly one sentence of explanation and it is not the rules —
 * it is that everybody is playing the identical deal. Without that, a race
 * looks like luck and winning it means nothing.
 */
export function ModeBanner({ state }: { state: BlockBlastPublicState }) {
  if (state.mode === "solo") {
    return (
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        Endless
      </span>
    );
  }
  return (
    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
      Same pieces for everyone
    </span>
  );
}
